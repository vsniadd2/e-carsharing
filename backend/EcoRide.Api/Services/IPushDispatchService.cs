namespace EcoRide.Api.Services;

public interface IPushDispatchService
{
    Task SendJsonToUserAsync(Guid userId, string jsonPayload, CancellationToken ct = default);
}
