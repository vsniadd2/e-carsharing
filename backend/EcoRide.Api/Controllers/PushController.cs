using EcoRide.Api.Auth;
using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using EcoRide.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/push")]
public class PushController(AppDbContext db, IConfiguration configuration) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("vapid-public")]
    public ActionResult<VapidPublicDto> VapidPublic()
    {
        var pub = configuration["Vapid:PublicKey"];
        if (string.IsNullOrEmpty(pub))
            return Ok(new VapidPublicDto { PublicKey = "" });
        return Ok(new VapidPublicDto { PublicKey = pub });
    }

    [Authorize]
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscribeRequest body, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var endpoint = body.Endpoint?.Trim();
        var p256 = body.P256dh?.Trim();
        var auth = body.Auth?.Trim();
        if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(p256) || string.IsNullOrEmpty(auth))
            return BadRequest(new ErrorBody { Error = "Нужны endpoint, p256dh и auth" });

        var existing = await db.UserPushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == endpoint, ct);
        if (existing is not null)
        {
            existing.UserId = userId.Value;
            existing.P256dh = p256;
            existing.Auth = auth;
            existing.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            db.UserPushSubscriptions.Add(new UserPushSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                Endpoint = endpoint,
                P256dh = p256,
                Auth = auth,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] PushSubscribeRequest body, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var endpoint = body.Endpoint?.Trim();
        if (string.IsNullOrEmpty(endpoint)) return BadRequest();

        await db.UserPushSubscriptions
            .Where(s => s.UserId == userId.Value && s.Endpoint == endpoint)
            .ExecuteDeleteAsync(ct);

        return NoContent();
    }
}
