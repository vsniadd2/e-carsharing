using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using EcoRide.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/vehicles")]
public class VehiclesController(AppDbContext db, IRentalService rentals, IVehicleEffectivePricing tariff) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VehicleDto>>> List(CancellationToken ct)
    {
        await rentals.ReleaseExpiredReservationsAsync(ct);
        var list = await db.Vehicles.AsNoTracking().OrderBy(v => v.Type).ThenBy(v => v.Id).ToListAsync(ct);
        return Ok(list.Select(Map).ToList());
    }

    private VehicleDto Map(EcoRide.Api.Models.Vehicle v)
    {
        var charging = string.Equals(v.Type, "charging", StringComparison.OrdinalIgnoreCase);
        var (priceStart, pricePerMinute) = tariff.GetEffectiveTariff(v);
        return new VehicleDto
        {
            Id = v.Id,
            Type = v.Type,
            Name = v.Name,
            Position = [v.Lat, v.Lng],
            Battery = charging ? null : v.BatteryPercent,
            RangeKm = charging ? null : v.RangeKm,
            Seats = charging ? null : v.Seats,
            PriceStart = priceStart,
            PricePerMinute = pricePerMinute,
            VehicleClass = string.Equals(v.Type, "car", StringComparison.OrdinalIgnoreCase) ? v.VehicleClass : null,
            Status = v.Status.ToString().ToLowerInvariant(),
            LowBattery = !charging && (v.LowBatteryFlag || v.BatteryPercent < 10),
            PhotoUrl = v.PhotoUrl,
            Description = v.Description,
        };
    }
}
