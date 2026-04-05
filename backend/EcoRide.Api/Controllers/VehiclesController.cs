using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/vehicles")]
public class VehiclesController(AppDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VehicleDto>>> List(CancellationToken ct)
    {
        var list = await db.Vehicles.AsNoTracking().OrderBy(v => v.Type).ThenBy(v => v.Id).ToListAsync(ct);
        return Ok(list.Select(Map).ToList());
    }

    private static VehicleDto Map(EcoRide.Api.Models.Vehicle v) =>
        new()
        {
            Id = v.Id,
            Type = v.Type,
            Name = v.Name,
            Position = [v.Lat, v.Lng],
            Battery = v.BatteryPercent,
            RangeKm = v.RangeKm,
            Seats = v.Seats,
            PriceStart = v.PriceStart,
            PricePerMinute = v.PricePerMinute,
            Status = v.Status.ToString().ToLowerInvariant(),
            LowBattery = v.LowBatteryFlag || v.BatteryPercent < 10,
        };
}
