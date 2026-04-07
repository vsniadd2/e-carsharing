using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcoRide.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class WalletLedgerPaymentCardLast4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentCardLast4",
                table: "wallet_ledger",
                type: "character varying(4)",
                maxLength: 4,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentCardLast4",
                table: "wallet_ledger");
        }
    }
}
