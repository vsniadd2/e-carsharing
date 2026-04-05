FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY EcoRide.Api/EcoRide.Api.csproj EcoRide.Api/
RUN dotnet restore EcoRide.Api/EcoRide.Api.csproj
COPY EcoRide.Api/ EcoRide.Api/
WORKDIR /src/EcoRide.Api
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "EcoRide.Api.dll"]
