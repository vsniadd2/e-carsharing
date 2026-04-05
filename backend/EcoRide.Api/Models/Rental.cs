using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EcoRide.Api.Models;

[Table("rentals")]
public class Rental
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    [MaxLength(32)]
    public string VehicleId { get; set; } = string.Empty;

    public Vehicle Vehicle { get; set; } = null!;

    public RentalStatus Status { get; set; }

    public DateTime ReservedAt { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    /// <summary>Начало текущего активного сегмента (не на паузе). Null если на паузе или ещё не стартовали.</summary>
    public DateTime? ActiveSegmentStartUtc { get; set; }

    /// <summary>Накопленные секунды активной езды, уже «закрытые» (при паузе добавляем сюда).</summary>
    public long TotalBillableSecondsCommitted { get; set; }

    /// <summary>Секунды активной езды, по которым уже выставлен поминутный счёт.</summary>
    public long LastBilledBillableSeconds { get; set; }

    public decimal DistanceKm { get; set; }

    public decimal ChargedAmount { get; set; }

    public decimal PriceStartSnapshot { get; set; }

    public decimal PricePerMinuteSnapshot { get; set; }

    public bool LowBatteryNotified { get; set; }

    public DateTime? LastSyncUtc { get; set; }
}
