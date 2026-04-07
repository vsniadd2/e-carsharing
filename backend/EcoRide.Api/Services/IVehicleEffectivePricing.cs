using EcoRide.Api.Models;

namespace EcoRide.Api.Services;

/// <summary>Потолки посадки и поминутки по классу ТС (абсолютный максимум посадки 3 BYN, поминутки 1 BYN).</summary>
public interface IVehicleEffectivePricing
{
    (decimal PriceStart, decimal PricePerMinute) GetEffectiveTariff(Vehicle vehicle);
}
