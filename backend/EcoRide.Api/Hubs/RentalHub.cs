using EcoRide.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace EcoRide.Api.Hubs;

/// <summary>Уведомления об аренде и обновлении флота для авторизованных пользователей.</summary>
[Authorize]
public class RentalHub : Hub
{
    public const string UserGroupPrefix = "rental-user-";

    public static string UserGroup(Guid userId) => $"{UserGroupPrefix}{userId}";

    public override async Task OnConnectedAsync()
    {
        var uid = Context.User?.GetUserId();
        if (uid != null)
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(uid.Value));
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var uid = Context.User?.GetUserId();
        if (uid != null)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, UserGroup(uid.Value));
        await base.OnDisconnectedAsync(exception);
    }
}
