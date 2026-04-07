using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcoRide.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UserCarsiki : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "Carsiki",
                table: "users",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Carsiki",
                table: "users");
        }
    }
}
