namespace EcoRide.Api.Services;

/// <summary>Периодически снимает просроченные брони, если к API давно не обращались.</summary>
public sealed class ReservationExpiryHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<ReservationExpiryHostedService> log) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var rentals = scope.ServiceProvider.GetRequiredService<IRentalService>();
                await rentals.ReleaseExpiredReservationsAsync(stoppingToken);
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Фоновая очистка просроченных броней");
            }
        }
    }
}
