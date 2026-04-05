using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EcoRide.Api.Data;
using EcoRide.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace EcoRide.Api.Services;

public class TokenService(IConfiguration configuration, AppDbContext db) : ITokenService
{
    private bool IsAdminUser(AppUser user)
    {
        var idStr = configuration["Admin:UserId"];
        return Guid.TryParse(idStr, out var aid) && user.Id == aid;
    }

    private static string HashRefreshToken(string plain) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(plain)));

    private static string GenerateRefreshPlain()
    {
        var bytes = RandomNumberGenerator.GetBytes(48);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public string CreateAccessToken(AppUser user)
    {
        var key = configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var issuer = configuration["Jwt:Issuer"] ?? "EcoRide";
        var audience = configuration["Jwt:Audience"] ?? "EcoRide";
        var minutes = int.TryParse(configuration["Jwt:AccessTokenMinutes"], out var m) ? m : 15;

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var idStr = user.Id.ToString();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, idStr),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("id", idStr),
            new("token_type", "access"),
        };

        if (IsAdminUser(user))
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(minutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<(string AccessToken, string RefreshToken)> IssueTokenPairAsync(AppUser user, CancellationToken ct = default)
    {
        var access = CreateAccessToken(user);
        var plain = GenerateRefreshPlain();
        var days = int.TryParse(configuration["Jwt:RefreshTokenDays"], out var d) ? d : 7;

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashRefreshToken(plain),
            ExpiresAt = DateTime.UtcNow.AddDays(days),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return (access, plain);
    }

    public async Task<(string AccessToken, string RefreshToken, AppUser User)?> RotateRefreshAsync(string refreshTokenPlain, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenPlain))
            return null;

        var hash = HashRefreshToken(refreshTokenPlain.Trim());
        var existing = await db.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == hash, ct);

        if (existing is null || existing.ExpiresAt < DateTime.UtcNow)
            return null;

        var user = existing.User;
        db.RefreshTokens.Remove(existing);
        await db.SaveChangesAsync(ct);

        var (access, refresh) = await IssueTokenPairAsync(user, ct);
        return (access, refresh, user);
    }

    public async Task<bool> RevokeRefreshAsync(string refreshTokenPlain, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenPlain))
            return false;

        var hash = HashRefreshToken(refreshTokenPlain.Trim());
        var existing = await db.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == hash, ct);
        if (existing is null)
            return false;

        db.RefreshTokens.Remove(existing);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
