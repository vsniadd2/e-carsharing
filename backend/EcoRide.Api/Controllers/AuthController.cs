using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using EcoRide.Api.Models;
using EcoRide.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, ITokenService tokenService, ILogger<AuthController> log, IConfiguration configuration)
    : ControllerBase
{
    private const int BcryptWorkFactor = 10;

    private static UserDto ToDto(AppUser u) =>
        new() { Id = u.Id.ToString(), Email = u.Email, Name = u.Name, Balance = u.Balance, Carsiki = u.Carsiki };

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest body, CancellationToken ct)
    {
        var email = body.Email?.Trim();
        var password = body.Password;
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            return BadRequest(new ErrorBody { Error = "Укажите email и пароль" });

        var normalized = email.ToLowerInvariant();
        var adminEmail = (configuration["Admin:Email"] ?? "admin@ecoride.system").Trim().ToLowerInvariant();
        if (normalized == adminEmail)
            return Conflict(new ErrorBody { Error = "Этот email зарезервирован" });

        var exists = await db.Users.AnyAsync(u => u.Email == normalized, ct);
        if (exists)
            return Conflict(new ErrorBody { Error = "Пользователь с таким email уже зарегистрирован" });

        var name = string.IsNullOrWhiteSpace(body.Name) ? email.Split('@')[0] : body.Name.Trim();
        var bonus = decimal.TryParse(configuration["Wallet:RegistrationBonus"], out var wb) ? wb : 0m;
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = normalized,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, BcryptWorkFactor),
            Name = name,
            Balance = bonus,
        };

        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Register failed");
            return StatusCode(500, new ErrorBody { Error = "Ошибка регистрации" });
        }

        var (access, refresh) = await tokenService.IssueTokenPairAsync(user, ct);
        return StatusCode(StatusCodes.Status201Created, new AuthResponse
        {
            AccessToken = access,
            RefreshToken = refresh,
            User = ToDto(user),
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest body, CancellationToken ct)
    {
        var email = body.Email?.Trim();
        var password = body.Password;
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            return BadRequest(new ErrorBody { Error = "Укажите email и пароль" });

        var normalized = email.ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalized, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return Unauthorized(new ErrorBody { Error = "Неверный email или пароль" });

        var (access, refresh) = await tokenService.IssueTokenPairAsync(user, ct);
        return Ok(new AuthResponse
        {
            AccessToken = access,
            RefreshToken = refresh,
            User = ToDto(user),
        });
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest body, CancellationToken ct)
    {
        var plain = body.RefreshToken?.Trim();
        if (string.IsNullOrEmpty(plain))
            return BadRequest(new ErrorBody { Error = "Укажите refreshToken" });

        var triple = await tokenService.RotateRefreshAsync(plain, ct);
        if (triple is null)
            return Unauthorized(new ErrorBody { Error = "Недействительный или истёкший refresh-токен" });

        var (access, refresh, user) = triple.Value;
        return Ok(new AuthResponse
        {
            AccessToken = access,
            RefreshToken = refresh,
            User = ToDto(user),
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest body, CancellationToken ct)
    {
        var plain = body.RefreshToken?.Trim();
        if (string.IsNullOrEmpty(plain))
            return BadRequest(new ErrorBody { Error = "Укажите refreshToken" });

        await tokenService.RevokeRefreshAsync(plain, ct);
        return NoContent();
    }
}
