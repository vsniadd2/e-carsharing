using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EcoRide.Api.Models;

[Table("user_push_subscriptions")]
public class UserPushSubscription
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    [MaxLength(2000)]
    public string Endpoint { get; set; } = string.Empty;

    [MaxLength(500)]
    public string P256dh { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Auth { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
