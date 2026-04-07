using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using EcoRide.Api.Models;
using EcoRide.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(
    AppDbContext db,
    ITokenService tokenService,
    IConfiguration configuration,
    IRealtimeRentalPublisher realtime) : ControllerBase
{
    private static UserDto ToDto(AppUser u) =>
        new() { Id = u.Id.ToString(), Email = u.Email, Name = u.Name, Balance = u.Balance, Carsiki = u.Carsiki };

    [Authorize(Roles = "Admin")]
    [HttpGet("tickets")]
    public async Task<ActionResult<IReadOnlyList<AdminTicketItemDto>>> Tickets([FromQuery] int take = 50, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);
        var rows = await db.SupportTickets.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .ToListAsync(ct);
        var list = rows.ConvertAll(x => new AdminTicketItemDto
        {
            Id = x.Id.ToString(),
            UserEmail = x.UserEmail,
            UserName = x.UserName,
            Subject = x.Subject,
            MessagePreview = x.Message.Length <= 160 ? x.Message : x.Message.Substring(0, 157) + "...",
            Status = x.Status.ToString().ToLowerInvariant(),
            CreatedAt = x.CreatedAt,
        });
        return Ok(list);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("vehicles")]
    public async Task<IActionResult> CreateVehicle([FromBody] AdminCreateVehicleRequest body, CancellationToken ct)
    {
        var id = body.Id?.Trim() ?? "";
        if (string.IsNullOrEmpty(id) || id.Length > 32)
            return BadRequest(new ErrorBody { Error = "Укажите Id ТС (до 32 символов)" });

        if (await db.Vehicles.AsNoTracking().AnyAsync(v => v.Id == id, ct))
            return Conflict(new ErrorBody { Error = "Транспорт с таким Id уже есть" });

        var type = body.Type?.Trim().ToLowerInvariant() ?? "";
        if (type is not ("car" or "bike" or "scooter" or "charging"))
            return BadRequest(new ErrorBody { Error = "Тип: car, bike, scooter или charging" });

        var name = body.Name?.Trim() ?? "";
        if (string.IsNullOrEmpty(name) || name.Length > 200)
            return BadRequest(new ErrorBody { Error = "Укажите название" });

        string? vehicleClass = null;
        if (type == "car")
        {
            var vc = body.VehicleClass?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(vc)) vc = "comfort";
            if (vc is not ("economy" or "comfort" or "premium"))
                return BadRequest(new ErrorBody { Error = "Класс авто: economy, comfort или premium" });
            vehicleClass = vc;
        }

        var charging = type == "charging";
        var seats = charging ? null : body.Seats;
        var rangeKm = charging ? null : body.RangeKm;
        var battery = charging ? 0m : Math.Clamp(body.BatteryPercent, 0m, 100m);

        var vehicle = new Vehicle
        {
            Id = id,
            Type = type,
            Name = name,
            Lat = body.Lat,
            Lng = body.Lng,
            BatteryPercent = battery,
            PriceStart = Math.Max(0, body.PriceStart),
            PricePerMinute = Math.Max(0, body.PricePerMinute),
            Status = VehicleStatus.Available,
            Seats = seats,
            RangeKm = rangeKm,
            LowBatteryFlag = !charging && body.LowBatteryFlag,
            PhotoUrl = string.IsNullOrWhiteSpace(body.PhotoUrl) ? null : body.PhotoUrl.Trim(),
            Description = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim(),
            VehicleClass = vehicleClass,
        };

        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync(ct);
        await realtime.BroadcastFleetUpdatedAsync(ct);
        return Ok(new { id = vehicle.Id });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> Stats(CancellationToken ct)
    {
        var usersCount = await db.Users.CountAsync(ct);
        var activeRentalsCount = await db.Rentals.CountAsync(
            r => r.Status == RentalStatus.Active || r.Status == RentalStatus.Paused, ct);
        var fleetOnlineCount = await db.Vehicles.CountAsync(ct);
        return Ok(new AdminStatsDto
        {
            UsersCount = usersCount,
            ActiveRentalsCount = activeRentalsCount,
            FleetOnlineCount = fleetOnlineCount,
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] AdminLoginRequest body, CancellationToken ct)
    {
        var expectedLogin = configuration["Admin:Login"] ?? "admin";
        if (!string.Equals(body.Login?.Trim(), expectedLogin, StringComparison.Ordinal))
            return Unauthorized(new ErrorBody { Error = "Неверный логин или пароль" });

        var adminIdStr = configuration["Admin:UserId"] ?? "11111111-1111-1111-1111-111111111111";
        if (!Guid.TryParse(adminIdStr, out var adminId))
            return StatusCode(500, new ErrorBody { Error = "Конфигурация администратора некорректна" });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == adminId, ct);
        if (user is null)
            return StatusCode(500, new ErrorBody { Error = "Учётная запись администратора не найдена. Перезапустите API после миграций." });

        var password = body.Password ?? string.Empty;
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return Unauthorized(new ErrorBody { Error = "Неверный логин или пароль" });

        var (access, refresh) = await tokenService.IssueTokenPairAsync(user, ct);
        return Ok(new AuthResponse
        {
            AccessToken = access,
            RefreshToken = refresh,
            User = ToDto(user),
        });
    }
}
