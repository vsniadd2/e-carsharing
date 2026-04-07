using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EcoRide.Api.Models;

[Table("support_tickets")]
public class SupportTicket
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    [MaxLength(320)]
    public string UserEmail { get; set; } = string.Empty;

    [MaxLength(200)]
    public string UserName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string Message { get; set; } = string.Empty;

    public SupportTicketStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }
}
