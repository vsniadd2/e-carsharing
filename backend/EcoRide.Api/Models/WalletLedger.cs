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

    public DateTime CreatedAt { get; set; }
}
