using EcoRide.Api.Auth;
using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> List([FromQuery] int take = 30, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        take = Math.Clamp(take, 1, 100);

        var list = await db.UserNotifications.AsNoTracking()
            .Where(n => n.UserId == userId.Value)
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .Select(n => new NotificationDto
            {
                Id = n.Id.ToString(),
                Title = n.Title,
                Body = n.Body,
                Type = n.Type,
                Read = n.ReadAt != null,
                CreatedAt = n.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var n = await db.UserNotifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, ct);
        if (n is null) return NotFound();

        n.ReadAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
