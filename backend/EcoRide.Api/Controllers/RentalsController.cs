using EcoRide.Api.Auth;
using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using EcoRide.Api.Models;
using EcoRide.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/rentals")]
[Authorize]
public class RentalsController(AppDbContext db, IRentalService rentals) : ControllerBase
{
    private async Task<ActionResult?> EnsureRegisteredUserAsync(Guid userId, CancellationToken ct)
    {
        if (await db.Users.AsNoTracking().AnyAsync(u => u.Id == userId, ct)) return null;
        return Unauthorized(new ErrorBody { Error = "Профиль не найден. Войдите снова." });
    }

    [HttpGet("history")]
    public async Task<ActionResult<IReadOnlyList<RentalHistoryItemDto>>> History([FromQuery] int take = 20, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var guard = await EnsureRegisteredUserAsync(userId.Value, ct);
        if (guard != null) return guard;
        take = Math.Clamp(take, 1, 50);

        var list = await db.Rentals.AsNoTracking()
            .Include(r => r.Vehicle)
            .Where(r => r.UserId == userId.Value && r.Status == RentalStatus.Completed && r.EndedAt != null)
            .OrderByDescending(r => r.EndedAt)
            .Take(take)
            .Select(r => new RentalHistoryItemDto
            {
                Id = r.Id.ToString(),
                VehicleName = r.Vehicle.Name,
                EndedAt = r.EndedAt!.Value,
                Total = r.ChargedAmount,
                DistanceKm = r.DistanceKm,
                BillableMinutes = Math.Round(r.TotalBillableSecondsCommitted / 60m, 2),
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpGet("active")]
    public async Task<ActionResult<RentalActiveDto>> GetActive(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var guard = await EnsureRegisteredUserAsync(userId.Value, ct);
        if (guard != null) return guard;

        var dto = await rentals.GetActiveAsync(userId.Value, ct);
        if (dto is null) return NoContent();
        return Ok(dto);
    }

    [HttpPost("reserve")]
    public async Task<IActionResult> Reserve([FromBody] ReserveRequest body, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var guard = await EnsureRegisteredUserAsync(userId.Value, ct);
        if (guard != null) return guard;

        var (ok, err, code) = await rentals.ReserveAsync(userId.Value, body.VehicleId ?? "", ct);
        if (!ok && code == "AlreadyRental") return Conflict(new ErrorBody { Error = err ?? "" });
        if (!ok && code == "InsufficientBalance")
            return Conflict(new ErrorCodeBody { Error = err ?? "", Code = "InsufficientBalance" });
        if (!ok && code == "SessionInvalid") return Unauthorized(new ErrorBody { Error = err ?? "" });
        if (!ok) return BadRequest(new ErrorBody { Error = err ?? "Ошибка" });

        return NoContent();
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var guard = await EnsureRegisteredUserAsync(userId.Value, ct);
        if (guard != null) return guard;

        var (ok, err, code) = await rentals.StartAsync(userId.Value, ct);
        if (!ok && code == "InsufficientBalance")
            return Conflict(new ErrorCodeBody { Error = err ?? "", Code = "InsufficientBalance" });
        if (!ok) return BadRequest(new ErrorBody { Error = err ?? "Ошибка" });

        return NoContent();
    }

    [HttpPost("pause")]
    public async Task<IActionResult> Pause(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var guard = await EnsureRegisteredUserAsync(userId.Value, ct);
        if (guard != null) return guard;

        var (ok, err) = await rentals.PauseAsync(userId.Value, ct);
        if (!ok) return BadRequest(new ErrorBody { Error = err ?? "Ошибка" });
        return NoContent();
    }

    [HttpPost("resume")]
    public async Task<IActionResult> Resume(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var guard = await EnsureRegisteredUserAsync(userId.Value, ct);
        if (guard != null) return guard;

        var (ok, err) = await rentals.ResumeAsync(userId.Value, ct);
        if (!ok) return BadRequest(new ErrorBody { Error = err ?? "Ошибка" });
        return NoContent();
    }

    [HttpPost("complete")]
    public async Task<ActionResult<TripReceiptDto>> Complete([FromBody] CompleteTripRequest? body, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var guard = await EnsureRegisteredUserAsync(userId.Value, ct);
        if (guard != null) return guard;

        var (ok, err, receipt) = await rentals.CompleteAsync(userId.Value, body?.UseCarsiki ?? false, ct);
        if (!ok) return BadRequest(new ErrorBody { Error = err ?? "Ошибка" });
        return Ok(receipt);
    }

    [HttpPost("cancel-reservation")]
    public async Task<IActionResult> CancelReservation(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var guard = await EnsureRegisteredUserAsync(userId.Value, ct);
        if (guard != null) return guard;

        var (ok, err) = await rentals.CancelReservationAsync(userId.Value, ct);
        if (!ok) return BadRequest(new ErrorBody { Error = err ?? "Ошибка" });
        return NoContent();
    }
}
