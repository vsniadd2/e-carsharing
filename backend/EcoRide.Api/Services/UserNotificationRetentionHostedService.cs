using EcoRide.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Services;

/// <summary>
/// Удаляет уведомления пользователей старше 7 дней (единая политика хранения).
/// </summary>
public sealed class UserNotificationRetentionHostedService(
    IServiceScopeFactory scopeFactory,
    ILogger<UserNotificationRetentionHostedService> log) : BackgroundService
{
    public const int RetentionDays = 7;

    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var cutoff = DateTime.UtcNow.AddDays(-RetentionDays);
                var deleted = await db.UserNotifications
                    .Where(n => n.CreatedAt < cutoff)
                    .ExecuteDeleteAsync(stoppingToken);
                if (deleted > 0)
                    log.LogInformation("Удалено устаревших уведомлений: {Count} (старше {Days} сут.)", deleted, RetentionDays);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Очистка уведомлений по сроку хранения");
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
