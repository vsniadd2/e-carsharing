using System.ComponentModel.DataAnnotations.Schema;

namespace EcoRide.Api.Models;

[Table("refresh_tokens")]
public class RefreshToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    /// <summary>SHA256 в Base64 от исходной строки refresh-токена.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
