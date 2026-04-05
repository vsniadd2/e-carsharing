using EcoRide.Api.Models;

namespace EcoRide.Api.Data;

public static class FleetSeed
{
    public static IReadOnlyList<Vehicle> DefaultVehicles { get; } =
    [
        new Vehicle
        {
            Id = "S4-8829",
            Type = "scooter",
            Name = "Swift Scooter S4",
            Lat = 53.9045,
            Lng = 27.5615,
            BatteryPercent = 84,
            PriceStart = 3.20m,
            PricePerMinute = 0.80m,
            Status = VehicleStatus.Available,
            RangeKm = 19,
            LowBatteryFlag = false,
        },
        new Vehicle
        {
            Id = "S2-1102",
            Type = "scooter",
            Name = "Swift Scooter S2",
            Lat = 53.908,
            Lng = 27.558,
            BatteryPercent = 45,
            PriceStart = 2.56m,
            PricePerMinute = 0.70m,
            Status = VehicleStatus.Available,
            RangeKm = 10,
            LowBatteryFlag = true,
        },
        new Vehicle
        {
            Id = "S4-5511",
            Type = "scooter",
            Name = "Swift Scooter S4",
            Lat = 53.901,
            Lng = 27.565,
            BatteryPercent = 92,
            PriceStart = 3.20m,
            PricePerMinute = 0.80m,
            Status = VehicleStatus.Available,
            RangeKm = 22,
            LowBatteryFlag = false,
        },
        new Vehicle
        {
            Id = "XB-3301",
            Type = "bike",
            Name = "E-Bike X4",
            Lat = 53.9065,
            Lng = 27.555,
            BatteryPercent = 78,
            PriceStart = 3.84m,
            PricePerMinute = 0.96m,
            Status = VehicleStatus.Available,
            RangeKm = 45,
            LowBatteryFlag = false,
        },
        new Vehicle
        {
            Id = "XB-2207",
            Type = "bike",
            Name = "E-Bike X4",
            Lat = 53.899,
            Lng = 27.562,
            BatteryPercent = 100,
            PriceStart = 3.84m,
            PricePerMinute = 0.96m,
            Status = VehicleStatus.Available,
            RangeKm = 55,
            LowBatteryFlag = false,
        },
        new Vehicle
        {
            Id = "EC-1001",
            Type = "car",
            Name = "EV Sedan M5",
            Lat = 53.907,
            Lng = 27.563,
            BatteryPercent = 88,
            PriceStart = 15.00m,
            PricePerMinute = 2.50m,
            Status = VehicleStatus.Available,
            RangeKm = 320,
            Seats = 5,
            LowBatteryFlag = false,
        },
        new Vehicle
        {
            Id = "EC-1002",
            Type = "car",
            Name = "E-Car C1",
            Lat = 53.898,
            Lng = 27.552,
            BatteryPercent = 72,
            PriceStart = 12.00m,
            PricePerMinute = 2.00m,
            Status = VehicleStatus.Available,
            RangeKm = 280,
            Seats = 5,
            LowBatteryFlag = false,
        },
    ];

    public static void EnsureSeeded(AppDbContext db)
    {
        foreach (var v in DefaultVehicles)
        {
            if (db.Vehicles.Any(x => x.Id == v.Id)) continue;
            db.Vehicles.Add(new Vehicle
            {
                Id = v.Id,
                Type = v.Type,
                Name = v.Name,
                Lat = v.Lat,
                Lng = v.Lng,
                BatteryPercent = v.BatteryPercent,
                PriceStart = v.PriceStart,
                PricePerMinute = v.PricePerMinute,
                Status = VehicleStatus.Available,
                Seats = v.Seats,
                RangeKm = v.RangeKm,
                LowBatteryFlag = v.LowBatteryFlag,
            });
        }

        db.SaveChanges();
    }
}
