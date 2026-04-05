using EcoRide.Api.Auth;
using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using EcoRide.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/wallet")]
[Authorize]
public class WalletController(AppDbContext db) : ControllerBase
{
    [HttpPost("deposit")]
    public async Task<ActionResult<UserDto>> Deposit([FromBody] DepositRequest body, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        if (body.Amount <= 0 || body.Amount > 10_000m)
            return BadRequest(new ErrorBody { Error = "Сумма должна быть от 0.01 до 10000 BYN" });

        var user = await db.Users.FirstAsync(u => u.Id == userId.Value, ct);
        var now = DateTime.UtcNow;
        user.Balance += body.Amount;
        db.WalletLedgers.Add(new WalletLedger
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Amount = body.Amount,
            BalanceAfter = user.Balance,
            Type = WalletLedgerType.Deposit,
            CreatedAt = now,
        });
        await db.SaveChangesAsync(ct);

        return Ok(new UserDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            Name = user.Name,
            Balance = user.Balance,
        });
    }

    [HttpGet("ledger")]
    public async Task<ActionResult<IReadOnlyList<WalletLedgerItemDto>>> Ledger([FromQuery] int take = 40, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        take = Math.Clamp(take, 1, 100);

        var items = await db.WalletLedgers.AsNoTracking()
            .Where(x => x.UserId == userId.Value)
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new WalletLedgerItemDto
            {
                Id = x.Id.ToString(),
                Amount = x.Amount,
                BalanceAfter = x.BalanceAfter,
                Type = x.Type.ToString(),
                CreatedAt = x.CreatedAt,
                RentalId = x.RentalId != null ? x.RentalId.Value.ToString() : null,
            })
            .ToListAsync(ct);

        return Ok(items);
    }
}
