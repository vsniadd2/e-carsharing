using System.Globalization;
using EcoRide.Api.Models;
using Microsoft.Extensions.Configuration;

namespace EcoRide.Api.Services;

public sealed class VehicleEffectivePricing(IConfiguration configuration) : IVehicleEffectivePricing
{
    private const decimal AbsoluteMaxPriceStart = 3m;
    private const decimal AbsoluteMaxPricePerMinute = 1m;

    private static readonly Dictionary<string, (decimal Start, decimal PerMin)> DefaultCaps = new(
        StringComparer.OrdinalIgnoreCase)
    {
        ["economy"] = (1.4m, 0.4m),
        ["comfort"] = (2.2m, 0.7m),
        ["premium"] = (3m, 1m),
    };

    public (decimal PriceStart, decimal PricePerMinute) GetEffectiveTariff(Vehicle vehicle)
    {
        if (string.Equals(vehicle.Type, "charging", StringComparison.OrdinalIgnoreCase))
            return (Round2(vehicle.PriceStart), Round2(vehicle.PricePerMinute));

        var tier = ResolveTier(vehicle);
        var (capStart, capPerMin) = GetCapsForTier(tier);

        var start = Math.Min(vehicle.PriceStart, capStart);
        var perMin = Math.Min(vehicle.PricePerMinute, capPerMin);
        start = Math.Clamp(start, 0, AbsoluteMaxPriceStart);
        perMin = Math.Clamp(perMin, 0, AbsoluteMaxPricePerMinute);
        return (Round2(start), Round2(perMin));
    }

    private static string ResolveTier(Vehicle v)
    {
        if (string.Equals(v.Type, "car", StringComparison.OrdinalIgnoreCase))
        {
            var c = v.VehicleClass?.Trim();
            if (!string.IsNullOrEmpty(c)) return c.ToLowerInvariant();
            return "comfort";
        }

        if (string.Equals(v.Type, "bike", StringComparison.OrdinalIgnoreCase))
            return "comfort";
        if (string.Equals(v.Type, "scooter", StringComparison.OrdinalIgnoreCase))
            return "economy";
        return "economy";
    }

    private (decimal CapStart, decimal CapPerMin) GetCapsForTier(string tier)
    {
        if (!DefaultCaps.TryGetValue(tier, out var defaults))
            defaults = DefaultCaps["comfort"];

        var startPath = $"Rental:TariffCaps:{tier}:maxPriceStart";
        var minPath = $"Rental:TariffCaps:{tier}:maxPricePerMinute";

        var capStart = ParseCap(startPath, defaults.Start);
        var capPerMin = ParseCap(minPath, defaults.PerMin);

        capStart = Math.Min(capStart, AbsoluteMaxPriceStart);
        capPerMin = Math.Min(capPerMin, AbsoluteMaxPricePerMinute);
        return (capStart, capPerMin);
    }

    private decimal ParseCap(string path, decimal fallback)
    {
        var s = configuration[path];
        if (string.IsNullOrWhiteSpace(s)) return fallback;
        return decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : fallback;
    }

    private static decimal Round2(decimal v) =>
        Math.Round(v, 2, MidpointRounding.AwayFromZero);
}
