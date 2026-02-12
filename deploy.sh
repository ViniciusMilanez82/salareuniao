#!/bin/bash
# ============================================
# SALA DE REUNIÃO - Script de Deploy
# ============================================
# Uso: bash deploy.sh [comando]
#
# Comandos:
#   setup    - Primeiro deploy (instala tudo)
#   update   - Atualiza a aplicação
#   migrate  - Roda migração do banco
#   logs     - Mostra logs
#   status   - Status dos containers
#   stop     - Para tudo
#   restart  - Reinicia tudo
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

# ============================================
# SETUP - Primeiro deploy
# ============================================
setup() {
    echo ""
    echo "============================================"
    echo "  SALA DE REUNIÃO - Setup Inicial"
    echo "============================================"
    echo ""

    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        error "Docker não encontrado. Instalando..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        log "Docker instalado. Faça logout/login e rode novamente."
        exit 1
    fi
    log "Docker encontrado"

    # Verificar Docker Compose
    if ! docker compose version &> /dev/null; then
        error "Docker Compose não encontrado."
        exit 1
    fi
    log "Docker Compose encontrado"

    # Criar pasta de logs do Nginx
    mkdir -p nginx/logs nginx/ssl

    # Copiar .env de produção se não existir
    if [ ! -f .env ]; then
        cp .env.production .env
        warn "Arquivo .env criado a partir de .env.production"
        warn "EDITE O .env E MUDE O JWT_SECRET!"
    fi

    # Build e start
    info "Construindo imagens Docker..."
    docker compose build --no-cache

    info "Iniciando containers..."
    docker compose up -d

    # Aguardar PostgreSQL ficar pronto
    info "Aguardando PostgreSQL..."
    sleep 10

    # Rodar migração
    migrate

    echo ""
    log "============================================"
    log "  Deploy concluído!"
    log "============================================"
    log ""
    log "  App: http://$(hostname -I | awk '{print $1}')"
    log "  API: http://$(hostname -I | awk '{print $1}')/api/health"
    log ""
    log "  Comandos úteis:"
    log "    bash deploy.sh logs     - Ver logs"
    log "    bash deploy.sh status   - Status"
    log "    bash deploy.sh update   - Atualizar"
    log ""
}

# ============================================
# MIGRATE - Roda migração
# ============================================
migrate() {
    info "Rodando migração do banco de dados..."
    docker compose exec app npx tsx server/migrate-clean.ts
    log "Migração concluída!"
}

# ============================================
# UPDATE - Atualiza a aplicação
# ============================================
update() {
    info "Atualizando aplicação..."
    docker compose build --no-cache app
    docker compose up -d app
    log "Atualização concluída!"
}

# ============================================
# LOGS
# ============================================
logs() {
    docker compose logs -f --tail=100 ${2:-}
}

# ============================================
# STATUS
# ============================================
status() {
    echo ""
    echo "============================================"
    echo "  Status dos Containers"
    echo "============================================"
    echo ""
    docker compose ps
    echo ""

    # Health check
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:3001/api/health)
        log "API: OK - $HEALTH"
    else
        error "API: Indisponível"
    fi
    echo ""
}

# ============================================
# STOP
# ============================================
stop() {
    info "Parando containers..."
    docker compose down
    log "Containers parados"
}

# ============================================
# RESTART
# ============================================
restart() {
    info "Reiniciando containers..."
    docker compose restart
    log "Containers reiniciados"
}

# ============================================
# SSL com Certbot (Let's Encrypt)
# ============================================
ssl() {
    DOMAIN=${2:-}
    if [ -z "$DOMAIN" ]; then
        error "Uso: bash deploy.sh ssl seu-dominio.com"
        exit 1
    fi

    info "Configurando SSL para $DOMAIN..."

    # Parar nginx temporariamente
    docker compose stop nginx

    # Instalar certbot se necessário
    if ! command -v certbot &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y certbot
    fi

    # Gerar certificado
    sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

    # Copiar certificados
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/

    warn "Edite nginx/nginx.conf para habilitar HTTPS e desabilitar HTTP"
    warn "Substitua 'seu-dominio.com' por '$DOMAIN'"
    warn "Descomente os blocos HTTPS e o redirect HTTP→HTTPS"

    # Reiniciar nginx
    docker compose up -d nginx

    log "Certificado SSL gerado para $DOMAIN"
}

# ============================================
# BACKUP do banco
# ============================================
backup() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backup_${TIMESTAMP}.sql"

    info "Criando backup: $BACKUP_FILE..."
    docker compose exec -T postgres pg_dump \
        -U ${POSTGRES_USER:-A39bokKZClHrBqXC} \
        ${POSTGRES_DB:-MHL6sIvZvAqZsACp} > $BACKUP_FILE

    log "Backup criado: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"
}

# ============================================
# MAIN
# ============================================
case "${1:-setup}" in
    setup)    setup ;;
    update)   update ;;
    migrate)  migrate ;;
    logs)     logs "$@" ;;
    status)   status ;;
    stop)     stop ;;
    restart)  restart ;;
    ssl)      ssl "$@" ;;
    backup)   backup ;;
    *)
        echo "Uso: bash deploy.sh [setup|update|migrate|logs|status|stop|restart|ssl|backup]"
        exit 1
        ;;
esac
