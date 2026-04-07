using EcoRide.Api.Contracts;

namespace EcoRide.Api.Services;

public interface IRealtimeRentalPublisher
{
    Task NotifyUserRentalAsync(Guid userId, RentalActiveDto? dto, CancellationToken ct = default);

    Task BroadcastFleetUpdatedAsync(CancellationToken ct = default);
}
