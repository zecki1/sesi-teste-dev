# publicar-producao.ps1
# Sobe o AVA SESI no modo "tudo em um", igual a produção:
#   - frontend compilado (build) servido pela própria API, na mesma origem
#   - API em ASPNETCORE_ENVIRONMENT=Production na porta 5077
#   - túnel Cloudflare público (HTTPS) apontando para a API
#   - Ollama continua privado, só acessível pela máquina local
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\publicar-producao.ps1
#   powershell -ExecutionPolicy Bypass -File .\publicar-producao.ps1 -Parar
#
# Variáveis opcionais:
#   $env:SESI_DEMO_AUTH = "1"   -> libera /gestao sem login (só para demonstração)
#   $env:SESI_SEM_TUNEL = "1"   -> sobe só local, sem abrir o túnel

param(
    [switch]$Parar
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $raiz "frontend"
$apiDir = Join-Path $raiz "backend\Sesi.Catalogo.Api"
$apiProj = Join-Path $apiDir "Sesi.Catalogo.Api.csproj"
$wwwroot = Join-Path $apiDir "wwwroot"
$marca = Get-Date -Format "HHmmss"
$tunnelLog = Join-Path $env:TEMP "sesi-tunel-producao-$marca.log"

function Parar-Processos {
    Get-CimInstance Win32_Process | Where-Object {
        ($_.CommandLine -like "*_teste-sesi*" -or $_.CommandLine -like "*$raiz*") -and
        ($_.Name -in @("dotnet.exe", "node.exe", "cloudflared.exe"))
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

if ($Parar) {
    Write-Host "Encerrando processos do SESI..." -ForegroundColor Yellow
    Parar-Processos
    Write-Host "OK." -ForegroundColor Green
    exit 0
}

Write-Host "=== AVA SESI - modo producao ===" -ForegroundColor Cyan

# 1. Limpa processos antigos
Write-Host "[1/6] Encerrando processos anteriores..." -ForegroundColor Yellow
Parar-Processos

# 2. Compila o frontend
Write-Host "[2/6] Compilando frontend (npm run build)..." -ForegroundColor Yellow
Push-Location $frontend
try {
    if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
        Write-Host "  node_modules ausente; rodando npm install..." -ForegroundColor DarkGray
        npm install --no-audit --no-fund | Out-Host
    }
    npm run build | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Falha no build do frontend." }
} finally {
    Pop-Location
}

# 3. Publica o build dentro da API (wwwroot)
Write-Host "[3/6] Publicando build em backend\Sesi.Catalogo.Api\wwwroot..." -ForegroundColor Yellow
if (Test-Path $wwwroot) { Remove-Item $wwwroot -Recurse -Force }
New-Item -ItemType Directory -Path $wwwroot | Out-Null
Copy-Item -Path (Join-Path $frontend "dist\*") -Destination $wwwroot -Recurse -Force
Write-Host "  $(($(Get-ChildItem $wwwroot -Recurse -File) | Measure-Object).Count) arquivos publicados." -ForegroundColor Green

# 4. Abre o túnel (antes da API, para conhecer a URL e liberar no CORS)
$urlPublica = $null
if ($env:SESI_SEM_TUNEL -eq "1") {
    Write-Host "[4/6] Túnel desativado (SESI_SEM_TUNEL=1)." -ForegroundColor DarkGray
} else {
    Write-Host "[4/6] Abrindo túnel Cloudflare..." -ForegroundColor Yellow
    if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }
    Start-Process -FilePath "cloudflared" `
        -ArgumentList "tunnel", "--url", "http://localhost:5077", "--no-autoupdate" `
        -RedirectStandardError $tunnelLog -WindowStyle Hidden | Out-Null

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $tunnelLog) {
            $conteudo = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
            if ($conteudo -match "https://[a-z0-9-]+\.trycloudflare\.com") {
                $urlPublica = $Matches[0]
                break
            }
        }
    }
    if (-not $urlPublica) {
        Write-Host "  AVISO: não consegui obter a URL do túnel. Veja $tunnelLog" -ForegroundColor Red
    } else {
        Write-Host "  Túnel: $urlPublica" -ForegroundColor Green
    }
}

# 5. Sobe a API em Production
Write-Host "[5/6] Iniciando API em Production (porta 5077)..." -ForegroundColor Yellow
$env:ASPNETCORE_ENVIRONMENT = "Production"
$env:ASPNETCORE_URLS = "http://localhost:5077"
$env:Database__Provider = "Sqlite"
$env:Cors__AllowedOrigins__0 = "http://localhost:5077"
$env:Cors__AllowedOrigins__1 = "http://localhost:5173"
$env:Cors__AllowedOrigins__2 = "http://127.0.0.1:5173"
if ($urlPublica) { $env:Cors__AllowedOrigins__3 = $urlPublica }
if ($env:SESI_DEMO_AUTH -ne "0") { $env:Gestao__AutorizacaoAdmin__Exigir = "false" }

if ($env:SESI_DEMO_AUTH -ne "0") {
    Write-Host "  Modo demonstracao: /gestao sem login (SESI_DEMO_AUTH=0 desliga)." -ForegroundColor Yellow
}
$apiLog = Join-Path $env:TEMP "sesi-api-producao-$marca.log"
if (Test-Path $apiLog) { Remove-Item $apiLog -Force -ErrorAction SilentlyContinue }
Start-Process -FilePath "dotnet" `
    -ArgumentList "run", "--project", $apiProj, "-c", "Debug", "--no-launch-profile" `
    -WorkingDirectory $apiDir -RedirectStandardOutput $apiLog -RedirectStandardError "$apiLog.err" `
    -WindowStyle Hidden | Out-Null

$saudavel = $false
for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5077/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $saudavel = $true; break }
    } catch { }
}
if (-not $saudavel) {
    Write-Host "  ERRO: a API não respondeu. Log: $apiLog" -ForegroundColor Red
    exit 1
}

# 6. Resumo
Write-Host "[6/6] Pronto." -ForegroundColor Green
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Local : http://localhost:5077" -ForegroundColor Green
Write-Host "  Swagger: http://localhost:5077/swagger" -ForegroundColor Green
if ($urlPublica) {
    Write-Host "  Publico: $urlPublica" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Compartilhe a URL publica na entrevista." -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Logs: $apiLog" -ForegroundColor DarkGray
Write-Host "  Parar: powershell -ExecutionPolicy Bypass -File .\publicar-producao.ps1 -Parar" -ForegroundColor DarkGray
Write-Host ""
