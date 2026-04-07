using EcoRide.Api.Contracts;
using EcoRide.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace EcoRide.Api.Services;

public sealed class RealtimeRentalPublisher(
    IHubContext<RentalHub> hub,
    ILogger<RealtimeRentalPublisher> log) : IRealtimeRentalPublisher
{
    public async Task NotifyUserRentalAsync(Guid userId, RentalActiveDto? dto, CancellationToken ct = default)
    {
        try
        {
            await hub.Clients.Group(RentalHub.UserGroup(userId)).SendAsync("RentalUpdated", dto, ct);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "SignalR RentalUpdated для {UserId}", userId);
        }
    }

    public async Task BroadcastFleetUpdatedAsync(CancellationToken ct = default)
    {
        try
        {
            await hub.Clients.All.SendAsync("FleetUpdated", cancellationToken: ct);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "SignalR FleetUpdated");
        }
    }
}
