using System.Text.Json.Serialization;

namespace EcoRide.Api.Contracts;

public class VehicleDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("position")]
    public double[] Position { get; set; } = [];

    [JsonPropertyName("battery")]
    public decimal? Battery { get; set; }

    [JsonPropertyName("rangeKm")]
    public int? RangeKm { get; set; }

    [JsonPropertyName("seats")]
    public int? Seats { get; set; }

    [JsonPropertyName("priceStart")]
    public decimal PriceStart { get; set; }

    [JsonPropertyName("pricePerMinute")]
    public decimal PricePerMinute { get; set; }

    /// <summary>Класс авто для тарифных потолков: economy, comfort, premium.</summary>
    [JsonPropertyName("vehicleClass")]
    public string? VehicleClass { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("lowBattery")]
    public bool LowBattery { get; set; }

    [JsonPropertyName("photoUrl")]
    public string? PhotoUrl { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public class ReserveRequest
{
    [JsonPropertyName("vehicleId")]
    public string? VehicleId { get; set; }
}

public class AdminCreateVehicleRequest
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lng")]
    public double Lng { get; set; }

    [JsonPropertyName("batteryPercent")]
    public decimal BatteryPercent { get; set; } = 100;

    [JsonPropertyName("priceStart")]
    public decimal PriceStart { get; set; }

    [JsonPropertyName("pricePerMinute")]
    public decimal PricePerMinute { get; set; }

    [JsonPropertyName("seats")]
    public int? Seats { get; set; }

    [JsonPropertyName("rangeKm")]
    public int? RangeKm { get; set; }

    [JsonPropertyName("lowBatteryFlag")]
    public bool LowBatteryFlag { get; set; }

    [JsonPropertyName("photoUrl")]
    public string? PhotoUrl { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>economy | comfort | premium — для type car.</summary>
    [JsonPropertyName("vehicleClass")]
    public string? VehicleClass { get; set; }
}

public class RentalActiveDto
{
    [JsonPropertyName("rentalId")]
    public string RentalId { get; set; } = string.Empty;

    [JsonPropertyName("vehicleId")]
    public string VehicleId { get; set; } = string.Empty;

    [JsonPropertyName("vehicleName")]
    public string VehicleName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("reservedAt")]
    public DateTime ReservedAt { get; set; }

    [JsonPropertyName("startedAt")]
    public DateTime? StartedAt { get; set; }

    /// <summary>UTC: до этого момента действует бронь (только при status reserved).</summary>
    [JsonPropertyName("reservationExpiresAt")]
    public DateTime? ReservationExpiresAt { get; set; }

    [JsonPropertyName("batteryPercent")]
    public decimal BatteryPercent { get; set; }

    [JsonPropertyName("distanceKm")]
    public decimal DistanceKm { get; set; }

    [JsonPropertyName("chargedAmount")]
    public decimal ChargedAmount { get; set; }

    [JsonPropertyName("billableMinutes")]
    public decimal BillableMinutes { get; set; }

    [JsonPropertyName("lowBatteryMode")]
    public bool LowBatteryMode { get; set; }

    [JsonPropertyName("speedLimitKmh")]
    public int? SpeedLimitKmh { get; set; }

    [JsonPropertyName("balance")]
    public decimal Balance { get; set; }
}

public class TripReceiptDto
{
    [JsonPropertyName("rentalId")]
    public string RentalId { get; set; } = string.Empty;

    [JsonPropertyName("vehicleName")]
    public string VehicleName { get; set; } = string.Empty;

    [JsonPropertyName("reservedAt")]
    public DateTime ReservedAt { get; set; }

    [JsonPropertyName("startedAt")]
    public DateTime? StartedAt { get; set; }

    [JsonPropertyName("endedAt")]
    public DateTime EndedAt { get; set; }

    [JsonPropertyName("totalBillableMinutes")]
    public decimal TotalBillableMinutes { get; set; }

    [JsonPropertyName("distanceKm")]
    public decimal DistanceKm { get; set; }

    [JsonPropertyName("priceStart")]
    public decimal PriceStart { get; set; }

    [JsonPropertyName("pricePerMinute")]
    public decimal PricePerMinute { get; set; }

    [JsonPropertyName("perMinuteTotal")]
    public decimal PerMinuteTotal { get; set; }

    [JsonPropertyName("total")]
    public decimal Total { get; set; }

    [JsonPropertyName("balanceAfter")]
    public decimal BalanceAfter { get; set; }

    [JsonPropertyName("carsikiEarned")]
    public long CarsikiEarned { get; set; }

    [JsonPropertyName("carsikiSpent")]
    public long CarsikiSpent { get; set; }

    [JsonPropertyName("bynCreditedFromCarsiki")]
    public decimal BynCreditedFromCarsiki { get; set; }

    [JsonPropertyName("carsikiBalanceAfter")]
    public long CarsikiBalanceAfter { get; set; }
}

public class CompleteTripRequest
{
    [JsonPropertyName("useCarsiki")]
    public bool UseCarsiki { get; set; }
}

public class DepositRequest
{
    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    /// <summary>Последние 4 цифры карты (опционально, для отображения в истории).</summary>
    [JsonPropertyName("cardLast4")]
    public string? CardLast4 { get; set; }
}

public class WalletLedgerItemDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("balanceAfter")]
    public decimal BalanceAfter { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("rentalId")]
    public string? RentalId { get; set; }

    [JsonPropertyName("paymentCardLast4")]
    public string? PaymentCardLast4 { get; set; }
}

public class AdminStatsDto
{
    [JsonPropertyName("usersCount")]
    public int UsersCount { get; set; }

    [JsonPropertyName("activeRentalsCount")]
    public int ActiveRentalsCount { get; set; }

    [JsonPropertyName("fleetOnlineCount")]
    public int FleetOnlineCount { get; set; }
}

public class PushSubscribeRequest
{
    [JsonPropertyName("endpoint")]
    public string? Endpoint { get; set; }

    [JsonPropertyName("p256dh")]
    public string? P256dh { get; set; }

    [JsonPropertyName("auth")]
    public string? Auth { get; set; }
}

public class VapidPublicDto
{
    [JsonPropertyName("publicKey")]
    public string PublicKey { get; set; } = string.Empty;
}

public class RentalHistoryItemDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("vehicleName")]
    public string VehicleName { get; set; } = string.Empty;

    [JsonPropertyName("endedAt")]
    public DateTime EndedAt { get; set; }

    [JsonPropertyName("total")]
    public decimal Total { get; set; }

    [JsonPropertyName("distanceKm")]
    public decimal DistanceKm { get; set; }

    [JsonPropertyName("billableMinutes")]
    public decimal BillableMinutes { get; set; }
}

public class NotificationDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("read")]
    public bool Read { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}
