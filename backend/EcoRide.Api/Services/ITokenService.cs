using EcoRide.Api.Models;

namespace EcoRide.Api.Services;

public interface ITokenService
{
    string CreateAccessToken(AppUser user);

    Task<(string AccessToken, string RefreshToken)> IssueTokenPairAsync(AppUser user, CancellationToken ct = default);

    Task<(string AccessToken, string RefreshToken, AppUser User)?> RotateRefreshAsync(string refreshTokenPlain, CancellationToken ct = default);

    Task<bool> RevokeRefreshAsync(string refreshTokenPlain, CancellationToken ct = default);
}
