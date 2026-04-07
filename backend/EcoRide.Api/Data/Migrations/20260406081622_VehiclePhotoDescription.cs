using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcoRide.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class VehiclePhotoDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "vehicles",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoUrl",
                table: "vehicles",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "PhotoUrl",
                table: "vehicles");
        }
    }
}
