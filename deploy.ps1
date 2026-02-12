# Deploy Sala de Reunião -> VPS Hostinger (187.77.32.67)
# Execute na pasta do projeto: .\deploy.ps1

$ErrorActionPreference = "Stop"
$VPS = "root@187.77.32.67"
$REMOTE_DIR = "/opt/salareuniao"

Write-Host "=== Deploy Sala de Reuniao -> VPS ===" -ForegroundColor Cyan

# 1. Criar pasta remota
Write-Host "`n[1/6] Criando pasta na VPS..." -ForegroundColor Yellow
ssh $VPS "mkdir -p $REMOTE_DIR"
if (-not $?) { throw "SSH falhou. Verifique chave/senha e conectividade." }

# 2. Enviar arquivos
Write-Host "`n[2/6] Enviando arquivos (SCP)..." -ForegroundColor Yellow
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

# 3. Na VPS: Docker
Write-Host "`n[3/6] Na VPS: subindo containers..." -ForegroundColor Yellow
ssh $VPS "cd $REMOTE_DIR && docker compose down 2>/dev/null; docker compose up -d --build"
if (-not $?) { throw "Docker compose falhou." }

Write-Host "`n[4/6] Zerando dados de producao (mantendo apenas agentes)..." -ForegroundColor Yellow
ssh $VPS "cd $REMOTE_DIR && sleep 5 && cat server/truncate-keep-agents.sql | docker compose exec -T postgres psql -U A39bokKZClHrBqXC -d MHL6sIvZvAqZsACp -f - 2>/dev/null || true"
if (-not $?) { Write-Host "Aviso: truncate pode ter falhado (verifique se postgres esta pronto)" -ForegroundColor Yellow }

Write-Host "`n[5/6] Node + Migrate..." -ForegroundColor Yellow
ssh $VPS "cd $REMOTE_DIR && (command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs)) && npm install && (npm run migrate || true)"
if (-not $?) { throw "Comandos na VPS falharam." }

# 6. Health check (aguarda app subir)
Write-Host "`n[6/6] Aguardando app (10s) e verificando health..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
$health = ssh $VPS "curl -s http://localhost/api/health"
Write-Host $health
if ($health -match "ok|connected") {
    Write-Host "`nDeploy concluido. Acesse: http://187.77.32.67" -ForegroundColor Green
} else {
    Write-Host "`nAtencao: health nao retornou ok. Verifique: ssh $VPS 'cd $REMOTE_DIR && docker compose logs -f app'" -ForegroundColor Yellow
}
