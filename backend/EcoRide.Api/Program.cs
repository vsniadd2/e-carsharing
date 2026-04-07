using System.Text;
using EcoRide.Api.Data;
using EcoRide.Api.Hubs;
using EcoRide.Api.Services;
using EcoRide.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddSingleton<IVehicleEffectivePricing, VehicleEffectivePricing>();
builder.Services.AddSingleton<IRealtimeRentalPublisher, RealtimeRentalPublisher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IRentalService, RentalService>();
builder.Services.AddScoped<IPushDispatchService, PushDispatchService>();
builder.Services.AddHostedService<ReservationExpiryHostedService>();
builder.Services.AddHostedService<ActiveRentalLiveTickHostedService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "EcoRide";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "EcoRide";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddSignalR();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            },
            Array.Empty<string>()
        },
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

// Хабы до контроллеров — чтобы /hubs/* не перехватывались чужими эндпоинтами.
app.MapHub<RentalHub>("/hubs/rental");
app.MapHub<AdminTicketsHub>("/hubs/admin-tickets");
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    db.Database.Migrate();

    var adminIdStr = configuration["Admin:UserId"] ?? "11111111-1111-1111-1111-111111111111";
    var adminEmail = (configuration["Admin:Email"] ?? "admin@ecoride.system").Trim().ToLowerInvariant();
    var adminPassword = configuration["Admin:Password"] ?? "admin";
    if (!Guid.TryParse(adminIdStr, out var adminId))
        adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    if (!db.Users.Any(u => u.Id == adminId))
    {
        db.Users.Add(new AppUser
        {
            Id = adminId,
            Email = adminEmail,
            Name = "Administrator",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword, workFactor: 10),
            Balance = 0,
        });
        db.SaveChanges();
    }

}

app.Run();
