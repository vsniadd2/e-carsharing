using EcoRide.Api.Hubs;

namespace EcoRide.Api.Services;

/// <summary>
/// Периодически обновляет симуляцию активных поездок и шлёт клиентам <see cref="RentalHub"/> событие RentalUpdated.
/// </summary>
public sealed class ActiveRentalLiveTickHostedService(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<ActiveRentalLiveTickHostedService> log) : BackgroundService
{
    private TimeSpan Interval =>
        TimeSpan.FromSeconds(
            int.TryParse(configuration["Rental:LiveUpdateIntervalSeconds"], out var s) ? Math.Clamp(s, 1, 10) : 1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var rentals = scope.ServiceProvider.GetRequiredService<IRentalService>();
                await rentals.TickActiveRentalsAndNotifyAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Тик активных поездок (SignalR)");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
