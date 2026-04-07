using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EcoRide.Api.Models;

[Table("wallet_ledger")]
public class WalletLedger
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public decimal Amount { get; set; }

    public decimal BalanceAfter { get; set; }

    public WalletLedgerType Type { get; set; }

    public Guid? RentalId { get; set; }

    public Rental? Rental { get; set; }

    /// <summary>Последние 4 цифры карты при пополнении (демо).</summary>
    [MaxLength(4)]
    public string? PaymentCardLast4 { get; set; }

    public DateTime CreatedAt { get; set; }
}
