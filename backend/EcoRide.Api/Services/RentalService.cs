using System.Text.Json;
using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using EcoRide.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcoRide.Api.Services;

public class RentalService(
    AppDbContext db,
    IConfiguration configuration,
    IPushDispatchService pushDispatch,
    IVehicleEffectivePricing tariff,
    IRealtimeRentalPublisher realtime,
    ILogger<RentalService> log)
    : IRentalService
{
    private int ReservationTimeoutMinutes =>
        int.TryParse(configuration["Rental:ReservationTimeoutMinutes"], out var tm) ? tm : 20;

    private decimal MinBalanceMinutes =>
        decimal.TryParse(configuration["Rental:MinBalanceMinutes"], out var m) ? m : 2m;

    private decimal SimulatedSpeedKmh =>
        decimal.TryParse(configuration["Rental:SimulatedSpeedKmh"], out var s) ? s : 35m;

    private decimal SimulatedSpeedLowBatteryKmh =>
        decimal.TryParse(configuration["Rental:SimulatedSpeedLowBatteryKmh"], out var s) ? s : 25m;

    private decimal BatteryDrainPercentPerHour =>
        decimal.TryParse(configuration["Rental:BatteryDrainPercentPerHour"], out var b) ? b : 12m;

    private decimal CarsikiCashbackFraction =>
        decimal.TryParse(configuration["Rewards:CarsikiCashbackFraction"], out var c) ? Math.Clamp(c, 0m, 1m) : 0.08m;

    private const decimal LowBatteryThreshold = 10m;

    public async Task ReleaseExpiredReservationsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var threshold = now.AddMinutes(-ReservationTimeoutMinutes);
        var stale = await db.Rentals
            .Include(r => r.Vehicle)
            .Where(r => r.Status == RentalStatus.Reserved && r.ReservedAt < threshold)
            .ToListAsync(ct);
        if (stale.Count == 0) return;

        foreach (var r in stale)
        {
            r.Status = RentalStatus.Cancelled;
            r.EndedAt = now;
            r.Vehicle.Status = VehicleStatus.Available;
        }

        await db.SaveChangesAsync(ct);
        await realtime.BroadcastFleetUpdatedAsync(ct);
        foreach (var r in stale)
            await realtime.NotifyUserRentalAsync(r.UserId, null, ct);
    }

    public async Task TickActiveRentalsAndNotifyAsync(CancellationToken ct = default)
    {
        await ReleaseExpiredReservationsAsync(ct);

        var activeList = await db.Rentals
            .Include(r => r.Vehicle)
            .Where(r => r.Status == RentalStatus.Active || r.Status == RentalStatus.Paused)
            .ToListAsync(ct);

        if (activeList.Count == 0) return;

        var userIds = activeList.Select(r => r.UserId).Distinct().ToList();
        var users = await db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, ct);

        var now = DateTime.UtcNow;
        var pushByUser = new Dictionary<Guid, string>();

        foreach (var rental in activeList)
        {
            if (!users.TryGetValue(rental.UserId, out var user)) continue;
            var pushPayload = SyncRental(rental, user, now);
            if (!string.IsNullOrEmpty(pushPayload)) pushByUser[rental.UserId] = pushPayload;
        }

        await db.SaveChangesAsync(ct);

        foreach (var kv in pushByUser)
        {
            try
            {
                await pushDispatch.SendJsonToUserAsync(kv.Key, kv.Value, ct);
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Web Push при тике поездки для {UserId}", kv.Key);
            }
        }

        foreach (var rental in activeList)
        {
            if (!users.TryGetValue(rental.UserId, out var user)) continue;
            var dto = MapToDto(rental, user.Balance);
            await realtime.NotifyUserRentalAsync(rental.UserId, dto, ct);
        }
    }

    public async Task<RentalActiveDto?> GetActiveAsync(Guid userId, CancellationToken ct = default)
    {
        await ReleaseExpiredReservationsAsync(ct);
        var rental = await FindOpenRentalAsync(userId, ct);
        if (rental is null)
        {
            await realtime.NotifyUserRentalAsync(userId, null, ct);
            return null;
        }

        var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
        var dto = MapToDto(rental, user.Balance);
        await realtime.NotifyUserRentalAsync(userId, dto, ct);
        return dto;
    }

    public async Task<(bool Ok, string? Error, string? Code)> ReserveAsync(Guid userId, string vehicleId, CancellationToken ct = default)
    {
        await ReleaseExpiredReservationsAsync(ct);

        vehicleId = vehicleId.Trim();
        if (string.IsNullOrEmpty(vehicleId))
            return (false, "Укажите vehicleId", null);

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            if (await HasOpenRentalAsync(userId, ct))
                return (false, "У вас уже есть активная бронь или поездка", "AlreadyRental");

            var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId, ct);
            if (vehicle is null) return (false, "Транспорт не найден", null);
            if (string.Equals(vehicle.Type, "charging", StringComparison.OrdinalIgnoreCase))
                return (false, "Зарядные станции не бронируются", null);
            if (vehicle.Status != VehicleStatus.Available)
                return (false, "Транспорт недоступен", "VehicleUnavailable");

            var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
            var (effStart, effPerMin) = tariff.GetEffectiveTariff(vehicle);
            var minNeeded = effStart + effPerMin * MinBalanceMinutes;
            if (user.Balance < minNeeded)
                return (false, $"Недостаточно средств. Нужно не меньше {minNeeded:F2} BYN для брони.", "InsufficientBalance");

            var rental = new Rental
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                VehicleId = vehicle.Id,
                Status = RentalStatus.Reserved,
                ReservedAt = DateTime.UtcNow,
                PriceStartSnapshot = effStart,
                PricePerMinuteSnapshot = effPerMin,
            };
            db.Rentals.Add(rental);
            vehicle.Status = VehicleStatus.Reserved;

            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await GetActiveAsync(userId, ct);
            await realtime.BroadcastFleetUpdatedAsync(ct);
            return (true, null, null);
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync(ct);
            if (ex.InnerException is PostgresException pg
                && pg.SqlState == PostgresErrorCodes.ForeignKeyViolation
                && pg.ConstraintName?.Contains("UserId", StringComparison.OrdinalIgnoreCase) == true)
            {
                log.LogWarning(ex, "Бронь: нет пользователя в БД (часто после сброса БД со старым JWT)");
                return (false, "Профиль не найден. Войдите снова.", "SessionInvalid");
            }
            log.LogError(ex, "Reserve failed");
            return (false, "Ошибка бронирования", null);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            log.LogError(ex, "Reserve failed");
            return (false, "Ошибка бронирования", null);
        }
    }

    public async Task<(bool Ok, string? Error, string? Code)> StartAsync(Guid userId, CancellationToken ct = default)
    {
        await ReleaseExpiredReservationsAsync(ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var rental = await FindOpenRentalAsync(userId, ct);
            if (rental is null) return (false, "Нет брони для старта", null);
            if (rental.Status != RentalStatus.Reserved)
                return (false, "Поездка уже начата", null);

            var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
            var vehicle = await db.Vehicles.FirstAsync(v => v.Id == rental.VehicleId, ct);

            var minNeeded = rental.PriceStartSnapshot + rental.PricePerMinuteSnapshot * MinBalanceMinutes;
            if (user.Balance < minNeeded)
                return (false, $"Недостаточно средств. Нужно не меньше {minNeeded:F2} BYN для старта.", "InsufficientBalance");

            var now = DateTime.UtcNow;
            user.Balance -= rental.PriceStartSnapshot;
            rental.ChargedAmount += rental.PriceStartSnapshot;
            db.WalletLedgers.Add(new WalletLedger
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = -rental.PriceStartSnapshot,
                BalanceAfter = user.Balance,
                Type = WalletLedgerType.TripStartFee,
                RentalId = rental.Id,
                CreatedAt = now,
            });

            rental.Status = RentalStatus.Active;
            rental.StartedAt = now;
            rental.ActiveSegmentStartUtc = now;
            rental.LastSyncUtc = now;
            rental.LastBilledBillableSeconds = 0;
            vehicle.Status = VehicleStatus.InUse;

            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            await GetActiveAsync(userId, ct);
            await realtime.BroadcastFleetUpdatedAsync(ct);
            return (true, null, null);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            log.LogError(ex, "Start failed");
            return (false, "Ошибка старта", null);
        }
    }

    public async Task<(bool Ok, string? Error)> PauseAsync(Guid userId, CancellationToken ct = default)
    {
        await ReleaseExpiredReservationsAsync(ct);
        var rental = await FindOpenRentalAsync(userId, ct);
        if (rental is null) return (false, "Нет активной поездки");
        if (rental.Status != RentalStatus.Active) return (false, "Пауза доступна только во время поездки");

        var now = DateTime.UtcNow;
        var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
        var pushPayload = SyncRental(rental, user, now);

        if (rental.ActiveSegmentStartUtc.HasValue)
        {
            rental.TotalBillableSecondsCommitted += (long)(now - rental.ActiveSegmentStartUtc.Value).TotalSeconds;
            rental.ActiveSegmentStartUtc = null;
        }

        rental.Status = RentalStatus.Paused;
        rental.LastSyncUtc = now;
        await db.SaveChangesAsync(ct);
        if (!string.IsNullOrEmpty(pushPayload))
            await pushDispatch.SendJsonToUserAsync(userId, pushPayload, ct);
        await GetActiveAsync(userId, ct);
        return (true, null);
    }

    public async Task<(bool Ok, string? Error)> ResumeAsync(Guid userId, CancellationToken ct = default)
    {
        await ReleaseExpiredReservationsAsync(ct);
        var rental = await FindOpenRentalAsync(userId, ct);
        if (rental is null) return (false, "Нет поездки");
        if (rental.Status != RentalStatus.Paused) return (false, "Поездка не на паузе");

        var now = DateTime.UtcNow;
        rental.Status = RentalStatus.Active;
        rental.ActiveSegmentStartUtc = now;
        rental.LastSyncUtc = now;
        await db.SaveChangesAsync(ct);
        await GetActiveAsync(userId, ct);
        return (true, null);
    }

    public async Task<(bool Ok, string? Error, TripReceiptDto? Receipt)> CompleteAsync(Guid userId, bool useCarsiki, CancellationToken ct = default)
    {
        await ReleaseExpiredReservationsAsync(ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var rental = await FindOpenRentalAsync(userId, ct);
            if (rental is null) return (false, "Нет активной поездки или брони", null);

            var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
            var vehicle = await db.Vehicles.FirstAsync(v => v.Id == rental.VehicleId, ct);
            var now = DateTime.UtcNow;

            if (rental.Status == RentalStatus.Reserved)
            {
                rental.Status = RentalStatus.Cancelled;
                rental.EndedAt = now;
                vehicle.Status = VehicleStatus.Available;
                var cancelReceipt = new TripReceiptDto
                {
                    RentalId = rental.Id.ToString(),
                    VehicleName = vehicle.Name,
                    ReservedAt = rental.ReservedAt,
                    StartedAt = null,
                    EndedAt = now,
                    TotalBillableMinutes = 0,
                    DistanceKm = 0,
                    PriceStart = rental.PriceStartSnapshot,
                    PricePerMinute = rental.PricePerMinuteSnapshot,
                    PerMinuteTotal = 0,
                    Total = 0,
                    BalanceAfter = user.Balance,
                    CarsikiEarned = 0,
                    CarsikiSpent = 0,
                    BynCreditedFromCarsiki = 0,
                    CarsikiBalanceAfter = user.Carsiki,
                };
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                await GetActiveAsync(userId, ct);
                await realtime.BroadcastFleetUpdatedAsync(ct);
                return (true, null, cancelReceipt);
            }

            if (rental.Status is not (RentalStatus.Active or RentalStatus.Paused))
                return (false, "Некорректное состояние", null);

            var pushPayload = SyncRental(rental, user, now);

            if (rental.Status == RentalStatus.Active && rental.ActiveSegmentStartUtc.HasValue)
            {
                rental.TotalBillableSecondsCommitted += (long)(now - rental.ActiveSegmentStartUtc.Value).TotalSeconds;
                rental.ActiveSegmentStartUtc = null;
            }

            rental.Status = RentalStatus.Completed;
            rental.EndedAt = now;
            vehicle.Status = VehicleStatus.Available;

            var totalBillableSeconds = rental.TotalBillableSecondsCommitted;
            var perMinuteTotal = rental.ChargedAmount - rental.PriceStartSnapshot;
            if (perMinuteTotal < 0) perMinuteTotal = 0;

            var tripTotal = Math.Round(rental.ChargedAmount, 2, MidpointRounding.AwayFromZero);
            long carsikiSpent = 0;
            decimal bynCreditedFromCarsiki = 0;
            if (useCarsiki && tripTotal > 0 && user.Carsiki > 0)
            {
                var maxBynCover = user.Carsiki / 100m;
                var coverByn = Math.Min(maxBynCover, tripTotal);
                carsikiSpent = (long)Math.Floor(coverByn * 100m);
                bynCreditedFromCarsiki = carsikiSpent / 100m;
                user.Carsiki -= carsikiSpent;
                user.Balance += bynCreditedFromCarsiki;
                db.WalletLedgers.Add(new WalletLedger
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Amount = bynCreditedFromCarsiki,
                    BalanceAfter = user.Balance,
                    Type = WalletLedgerType.TripPaidByCarsiki,
                    RentalId = rental.Id,
                    CreatedAt = now,
                });
            }

            // Кэшбек только с поминутной части (без посадки / PriceStart).
            var perMinuteForCashback = Math.Round(perMinuteTotal, 2, MidpointRounding.AwayFromZero);
            var carsikiEarned = (long)Math.Floor(perMinuteForCashback * CarsikiCashbackFraction * 100m);
            if (carsikiEarned > 0)
            {
                user.Carsiki += carsikiEarned;
                db.UserNotifications.Add(new UserNotification
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Title = "Начислены CARSIKI",
                    Body = $"+{carsikiEarned} CARSIKI: кэшбек {CarsikiCashbackFraction * 100m:F0}% от поминутной суммы {perMinuteForCashback:F2} BYN (без посадки). 100 CARSIKI = 1 BYN.",
                    Type = "carsiki_earned",
                    CreatedAt = now,
                });
            }

            var receipt = new TripReceiptDto
            {
                RentalId = rental.Id.ToString(),
                VehicleName = vehicle.Name,
                ReservedAt = rental.ReservedAt,
                StartedAt = rental.StartedAt,
                EndedAt = now,
                TotalBillableMinutes = Math.Round(totalBillableSeconds / 60m, 2),
                DistanceKm = Math.Round(rental.DistanceKm, 3),
                PriceStart = rental.PriceStartSnapshot,
                PricePerMinute = rental.PricePerMinuteSnapshot,
                PerMinuteTotal = Math.Round(perMinuteTotal, 2),
                Total = tripTotal,
                BalanceAfter = user.Balance,
                CarsikiEarned = carsikiEarned,
                CarsikiSpent = carsikiSpent,
                BynCreditedFromCarsiki = Math.Round(bynCreditedFromCarsiki, 2, MidpointRounding.AwayFromZero),
                CarsikiBalanceAfter = user.Carsiki,
            };

            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            if (!string.IsNullOrEmpty(pushPayload))
                await pushDispatch.SendJsonToUserAsync(userId, pushPayload, ct);
            await GetActiveAsync(userId, ct);
            await realtime.BroadcastFleetUpdatedAsync(ct);
            return (true, null, receipt);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            log.LogError(ex, "Complete failed");
            return (false, "Ошибка завершения", null);
        }
    }

    public async Task<(bool Ok, string? Error)> CancelReservationAsync(Guid userId, CancellationToken ct = default)
    {
        await ReleaseExpiredReservationsAsync(ct);
        var rental = await FindOpenRentalAsync(userId, ct);
        if (rental is null) return (false, "Нет брони");
        if (rental.Status != RentalStatus.Reserved) return (false, "Можно отменить только бронь до старта");

        var vehicle = await db.Vehicles.FirstAsync(v => v.Id == rental.VehicleId, ct);
        rental.Status = RentalStatus.Cancelled;
        rental.EndedAt = DateTime.UtcNow;
        vehicle.Status = VehicleStatus.Available;
        await db.SaveChangesAsync(ct);
        await realtime.BroadcastFleetUpdatedAsync(ct);
        await GetActiveAsync(userId, ct);
        return (true, null);
    }

    private async Task<Rental?> FindOpenRentalAsync(Guid userId, CancellationToken ct) =>
        await db.Rentals
            .Include(r => r.Vehicle)
            .Where(r => r.UserId == userId &&
                        (r.Status == RentalStatus.Reserved || r.Status == RentalStatus.Active ||
                         r.Status == RentalStatus.Paused))
            .OrderByDescending(r => r.ReservedAt)
            .FirstOrDefaultAsync(ct);

    private async Task<bool> HasOpenRentalAsync(Guid userId, CancellationToken ct) =>
        await db.Rentals.AnyAsync(
            r => r.UserId == userId &&
                 (r.Status == RentalStatus.Reserved || r.Status == RentalStatus.Active ||
                  r.Status == RentalStatus.Paused), ct);

    /// <returns>JSON для Web Push при низком заряде, иначе null.</returns>
    private string? SyncRental(Rental rental, AppUser user, DateTime now)
    {
        if (rental.Status is not (RentalStatus.Active or RentalStatus.Paused)) return null;

        var vehicle = rental.Vehicle;
        var currentBillable = GetCurrentBillableSeconds(rental, now);
        var deltaBillable = currentBillable - rental.LastBilledBillableSeconds;
        if (deltaBillable > 0 && rental.PricePerMinuteSnapshot > 0)
        {
            var minutes = deltaBillable / 60m;
            var charge = Math.Round(minutes * rental.PricePerMinuteSnapshot, 2, MidpointRounding.AwayFromZero);
            if (charge > 0)
            {
                user.Balance -= charge;
                rental.ChargedAmount += charge;
                rental.LastBilledBillableSeconds = currentBillable;
                db.WalletLedgers.Add(new WalletLedger
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Amount = -charge,
                    BalanceAfter = user.Balance,
                    Type = WalletLedgerType.TripCharge,
                    RentalId = rental.Id,
                    CreatedAt = now,
                });
            }
        }

        if (rental.Status == RentalStatus.Active && rental.ActiveSegmentStartUtc.HasValue && rental.LastSyncUtc.HasValue)
        {
            var dtHours = (decimal)(now - rental.LastSyncUtc.Value).TotalHours;
            if (dtHours > 0)
            {
                var speed = vehicle.BatteryPercent < LowBatteryThreshold
                    ? SimulatedSpeedLowBatteryKmh
                    : SimulatedSpeedKmh;
                rental.DistanceKm += Math.Round(speed * dtHours, 4, MidpointRounding.AwayFromZero);

                var drain = BatteryDrainPercentPerHour * dtHours;
                vehicle.BatteryPercent = Math.Max(0, Math.Round(vehicle.BatteryPercent - drain, 2, MidpointRounding.AwayFromZero));
            }
        }

        rental.LastSyncUtc = now;

        if (!rental.LowBatteryNotified && vehicle.BatteryPercent < LowBatteryThreshold)
        {
            rental.LowBatteryNotified = true;
            var title = "Низкий заряд";
            var body = $"У «{vehicle.Name}» осталось меньше 10% заряда. Ограничение скорости 90 км/ч.";

            db.UserNotifications.Add(new UserNotification
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Title = title,
                Body = body,
                Type = "low_battery",
                CreatedAt = now,
            });

            return JsonSerializer.Serialize(new
            {
                type = "low_battery",
                title,
                body,
                vehicleId = vehicle.Id,
            });
        }

        return null;
    }

    private static long GetCurrentBillableSeconds(Rental rental, DateTime now)
    {
        if (rental.Status == RentalStatus.Paused)
            return rental.TotalBillableSecondsCommitted;
        if (rental.Status == RentalStatus.Active && rental.ActiveSegmentStartUtc.HasValue)
            return rental.TotalBillableSecondsCommitted +
                   (long)(now - rental.ActiveSegmentStartUtc.Value).TotalSeconds;
        return rental.TotalBillableSecondsCommitted;
    }

    private RentalActiveDto MapToDto(Rental rental, decimal balance)
    {
        var v = rental.Vehicle;
        var now = DateTime.UtcNow;
        var billableSec = GetCurrentBillableSeconds(rental, now);
        var lowMode = v.BatteryPercent < LowBatteryThreshold;
        DateTime? reservationExpiresAt = rental.Status == RentalStatus.Reserved
            ? rental.ReservedAt.AddMinutes(ReservationTimeoutMinutes)
            : null;

        return new RentalActiveDto
        {
            RentalId = rental.Id.ToString(),
            VehicleId = v.Id,
            VehicleName = v.Name,
            Status = rental.Status.ToString().ToLowerInvariant(),
            ReservedAt = rental.ReservedAt,
            StartedAt = rental.StartedAt,
            ReservationExpiresAt = reservationExpiresAt,
            BatteryPercent = v.BatteryPercent,
            DistanceKm = rental.DistanceKm,
            ChargedAmount = rental.ChargedAmount,
            BillableMinutes = Math.Round(billableSec / 60m, 2),
            LowBatteryMode = lowMode,
            SpeedLimitKmh = lowMode ? 90 : null,
            Balance = balance,
        };
    }
}
