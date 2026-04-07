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
    public string Type { get; set; } = string.Empty; // scooter, bike, car, charging

    /// <summary>Класс тарифа для авто: economy, comfort, premium. Для самоката/велосипеда не задаётся — потолки берутся по типу ТС.</summary>
    [MaxLength(32)]
    public string? VehicleClass { get; set; }

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

    /// <summary>URL изображения для карточки ТС (HTTPS).</summary>
    [MaxLength(2000)]
    public string? PhotoUrl { get; set; }

    /// <summary>Краткое описание для карточки на карте.</summary>
    [MaxLength(2000)]
    public string? Description { get; set; }
}
