using System.Text.Json.Serialization;

namespace EcoRide.Api.Contracts;

public class RegisterRequest
{
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("password")]
    public string? Password { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class LoginRequest
{
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("password")]
    public string? Password { get; set; }
}

public class AdminLoginRequest
{
    [JsonPropertyName("login")]
    public string? Login { get; set; }

    [JsonPropertyName("password")]
    public string? Password { get; set; }
}

public class UserDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("balance")]
    public decimal Balance { get; set; }
}

public class AuthResponse
{
    [JsonPropertyName("accessToken")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;

    [JsonPropertyName("user")]
    public UserDto User { get; set; } = null!;
}

public class RefreshRequest
{
    [JsonPropertyName("refreshToken")]
    public string? RefreshToken { get; set; }
}

public class LogoutRequest
{
    [JsonPropertyName("refreshToken")]
    public string? RefreshToken { get; set; }
}

public class ErrorBody
{
    [JsonPropertyName("error")]
    public string Error { get; set; } = string.Empty;
}

public class ErrorCodeBody : ErrorBody
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;
}
