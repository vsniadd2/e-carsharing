using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcoRide.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleClass : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VehicleClass",
                table: "vehicles",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VehicleClass",
                table: "vehicles");
        }
    }
}
