using EcoRide.Api.Data;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace EcoRide.Api.Services;

public class PushDispatchService(IConfiguration configuration, AppDbContext db, ILogger<PushDispatchService> log)
    : IPushDispatchService
{
    public async Task SendJsonToUserAsync(Guid userId, string jsonPayload, CancellationToken ct = default)
    {
        try
        {
            var pub = configuration["Vapid:PublicKey"];
            var prv = configuration["Vapid:PrivateKey"];
            var subj = configuration["Vapid:Subject"] ?? "mailto:admin@ecoride.system";
            if (string.IsNullOrEmpty(pub) || string.IsNullOrEmpty(prv))
            {
                log.LogDebug("VAPID keys missing; skip Web Push");
                return;
            }

            var subscriptions = await db.UserPushSubscriptions
                .Where(s => s.UserId == userId)
                .ToListAsync(ct);

            if (subscriptions.Count == 0) return;

            var client = new WebPushClient();
            VapidDetails vapid;
            try
            {
                vapid = new VapidDetails(subj, pub, prv);
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Некорректные VAPID-ключи; push пропущен");
                return;
            }

            foreach (var s in subscriptions)
            {
                var pushSub = new PushSubscription(s.Endpoint, s.P256dh, s.Auth);
                try
                {
                    await client.SendNotificationAsync(pushSub, jsonPayload, vapid);
                }
                catch (WebPushException ex)
                {
                    log.LogWarning(ex, "Web Push failed for subscription {Endpoint}", s.Endpoint);
                    if (ex.StatusCode is System.Net.HttpStatusCode.Gone or System.Net.HttpStatusCode.NotFound)
                    {
                        db.UserPushSubscriptions.Remove(s);
                        await db.SaveChangesAsync(ct);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "SendJsonToUserAsync: не удалось отправить push");
        }
    }
}
