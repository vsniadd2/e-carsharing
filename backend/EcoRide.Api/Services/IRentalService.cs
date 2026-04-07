using EcoRide.Api.Contracts;

namespace EcoRide.Api.Services;

public interface IRentalService
{
    /// <summary>Отменяет просроченные брони и освобождает ТС в БД.</summary>
    Task ReleaseExpiredReservationsAsync(CancellationToken ct = default);

    /// <summary>Продвигает симуляцию активных/пауз поездок и рассылает RentalUpdated по SignalR.</summary>
    Task TickActiveRentalsAndNotifyAsync(CancellationToken ct = default);

    Task<RentalActiveDto?> GetActiveAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error, string? Code)> ReserveAsync(Guid userId, string vehicleId, CancellationToken ct = default);

    Task<(bool Ok, string? Error, string? Code)> StartAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error)> PauseAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error)> ResumeAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error, TripReceiptDto? Receipt)> CompleteAsync(Guid userId, bool useCarsiki, CancellationToken ct = default);

    Task<(bool Ok, string? Error)> CancelReservationAsync(Guid userId, CancellationToken ct = default);
}
