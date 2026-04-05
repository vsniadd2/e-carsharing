using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EcoRide.Api.Models;

[Table("vehicles")]
public class Vehicle
{
    [Key]
    [MaxLength(32)]
    public string Id { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Type { get; set; } = string.Empty; // scooter, bike, car

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public double Lat { get; set; }

    public double Lng { get; set; }

    public decimal BatteryPercent { get; set; }

    public decimal PriceStart { get; set; }

    public decimal PricePerMinute { get; set; }

    public VehicleStatus Status { get; set; }

    public int? Seats { get; set; }

    public int? RangeKm { get; set; }

    public bool LowBatteryFlag { get; set; }
}
