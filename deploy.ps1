# Deploy Sala de Reunião -> VPS Hostinger (187.77.32.67)
# Execute na pasta do projeto: .\deploy.ps1

$ErrorActionPreference = "Stop"
$VPS = "root@187.77.32.67"
$REMOTE_DIR = "/opt/salareuniao"

Write-Host "=== Deploy Sala de Reuniao -> VPS ===" -ForegroundColor Cyan

# 1. Criar pasta remota
Write-Host "`n[1/4] Criando pasta na VPS..." -ForegroundColor Yellow
ssh $VPS "mkdir -p $REMOTE_DIR"
if (-not $?) { throw "SSH falhou. Verifique chave/senha e conectividade." }

# 2. Enviar arquivos
Write-Host "`n[2/4] Enviando arquivos (SCP)..." -ForegroundColor Yellow
$files = @(
    "package.json", "package-lock.json", "tsconfig.json", "vite.config.ts",
    "index.html", "tailwind.config.js", "postcss.config.js",
    "docker-compose.yml", "Dockerfile", ".env.production", "deploy.sh"
)
foreach ($f in $files) {
    if (Test-Path $f) {
        scp $f "${VPS}:${REMOTE_DIR}/"
    }
}
scp -r src server supabase nginx "${VPS}:${REMOTE_DIR}/"
scp .env.vps "${VPS}:${REMOTE_DIR}/.env"

# 3. Na VPS: Docker + Node + Migrate
Write-Host "`n[3/4] Na VPS: subindo containers e rodando migração..." -ForegroundColor Yellow
$remoteCmd = "cd $REMOTE_DIR && docker compose down 2>/dev/null; docker compose up -d --build && (command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs)) && npm install && (npm run migrate || true)"
ssh $VPS $remoteCmd
if (-not $?) { throw "Comandos na VPS falharam." }

# 4. Health check (aguarda app subir)
Write-Host "`n[4/4] Aguardando app (10s) e verificando health..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
$health = ssh $VPS "curl -s http://localhost/api/health"
Write-Host $health
if ($health -match "ok|connected") {
    Write-Host "`nDeploy concluido. Acesse: http://187.77.32.67" -ForegroundColor Green
} else {
    Write-Host "`nAtencao: health nao retornou ok. Verifique: ssh $VPS 'cd $REMOTE_DIR && docker compose logs -f app'" -ForegroundColor Yellow
}
