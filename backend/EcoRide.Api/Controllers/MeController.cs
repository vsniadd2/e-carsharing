using EcoRide.Api.Auth;
using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<UserDto>> Get(CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return NotFound();

        return Ok(new UserDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            Name = user.Name,
            Balance = user.Balance,
        });
    }
}
