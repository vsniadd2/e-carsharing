using EcoRide.Api.Auth;
using EcoRide.Api.Contracts;
using EcoRide.Api.Data;
using EcoRide.Api.Hubs;
using EcoRide.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace EcoRide.Api.Controllers;

[ApiController]
[Route("api/support")]
[Authorize]
public class SupportController(
    AppDbContext db,
    IHubContext<AdminTicketsHub> hubContext,
    ILogger<SupportController> log) : ControllerBase
{
    [HttpPost("tickets")]
    public async Task<ActionResult<SupportTicketCreatedDto>> CreateTicket([FromBody] CreateSupportTicketRequest body, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var subject = body.Subject?.Trim() ?? "";
        var message = body.Message?.Trim() ?? "";
        if (subject.Length < 3) return BadRequest(new ErrorBody { Error = "Тема не короче 3 символов" });
        if (subject.Length > 200) return BadRequest(new ErrorBody { Error = "Тема слишком длинная" });
        if (message.Length < 10) return BadRequest(new ErrorBody { Error = "Описание не короче 10 символов" });
        if (message.Length > 4000) return BadRequest(new ErrorBody { Error = "Описание слишком длинное" });

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return Unauthorized(new ErrorBody { Error = "Профиль не найден" });

        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            UserEmail = user.Email,
            UserName = user.Name,
            Subject = subject,
            Message = message,
            Status = SupportTicketStatus.Open,
            CreatedAt = DateTime.UtcNow,
        };
        db.SupportTickets.Add(ticket);
        await db.SaveChangesAsync(ct);

        var preview = message.Length <= 160 ? message : message[..157] + "...";
        var evt = new SupportTicketCreatedEventDto
        {
            Id = ticket.Id.ToString(),
            UserEmail = ticket.UserEmail,
            UserName = ticket.UserName,
            Subject = ticket.Subject,
            MessagePreview = preview,
            CreatedAt = ticket.CreatedAt,
        };

        try
        {
            await hubContext.Clients.Group("admins").SendAsync("TicketCreated", evt, ct);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "SignalR TicketCreated broadcast failed");
        }

        return StatusCode(StatusCodes.Status201Created, new SupportTicketCreatedDto
        {
            Id = ticket.Id.ToString(),
            CreatedAt = ticket.CreatedAt,
        });
    }
}
