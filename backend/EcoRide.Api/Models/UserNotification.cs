using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EcoRide.Api.Models;

[Table("user_notifications")]
public class UserNotification
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Type { get; set; } = string.Empty;

    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
