using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace EcoRide.Api.Auth;

public static class UserIdExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal? user)
    {
        if (user?.Identity?.IsAuthenticated != true) return null;
        var sub = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
