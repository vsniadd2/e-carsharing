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
    IConfiguration configuration) : ControllerBase
{
    private static UserDto ToDto(AppUser u) =>
        new() { Id = u.Id.ToString(), Email = u.Email, Name = u.Name, Balance = u.Balance };

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
