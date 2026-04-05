using EcoRide.Api.Contracts;

namespace EcoRide.Api.Services;

public interface IRentalService
{
    Task<RentalActiveDto?> GetActiveAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error, string? Code)> ReserveAsync(Guid userId, string vehicleId, CancellationToken ct = default);

    Task<(bool Ok, string? Error, string? Code)> StartAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error)> PauseAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error)> ResumeAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error, TripReceiptDto? Receipt)> CompleteAsync(Guid userId, CancellationToken ct = default);

    Task<(bool Ok, string? Error)> CancelReservationAsync(Guid userId, CancellationToken ct = default);
}
