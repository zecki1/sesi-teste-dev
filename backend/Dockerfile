# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar apenas arquivos .csproj para aproveitar cache
COPY ["Sesi.Catalogo.slnx", "./"]
COPY ["Sesi.Catalogo.Domain/Sesi.Catalogo.Domain.csproj", "Sesi.Catalogo.Domain/"]
COPY ["Sesi.Catalogo.Infrastructure/Sesi.Catalogo.Infrastructure.csproj", "Sesi.Catalogo.Infrastructure/"]
COPY ["Sesi.Catalogo.Api/Sesi.Catalogo.Api.csproj", "Sesi.Catalogo.Api/"]
COPY ["Sesi.Catalogo.Tests/Sesi.Catalogo.Tests.csproj", "Sesi.Catalogo.Tests/"]

# Restaurar dependências
RUN dotnet restore "Sesi.Catalogo.slnx"

# Copiar restante do código
COPY . .

# Publicar apenas o projeto da API
FROM build AS publish
WORKDIR /src
RUN dotnet publish "Sesi.Catalogo.Api/Sesi.Catalogo.Api.csproj" \
    -c Release \
    --no-restore \
    -o /app/publish \
    /p:UseAppHost=false \
    /p:DebugType=None \
    /p:DebugSymbols=false

# Imagem final enxuta
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Variáveis padrão para Railway
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# Copiar artefatos publicados
COPY --from=publish /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Sesi.Catalogo.Api.dll"]
