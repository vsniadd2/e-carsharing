namespace EcoRide.Api.Models;

public enum WalletLedgerType
{
    Deposit = 0,
    TripCharge = 1,
    TripStartFee = 2,
    Adjustment = 3,
    /// <summary>Возврат BYN за счёт списания CARSIKI при завершении поездки.</summary>
    TripPaidByCarsiki = 4,
}
