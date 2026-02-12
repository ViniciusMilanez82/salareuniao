#!/bin/bash
# ============================================
# Upload do projeto para a VPS
# ============================================
# Uso: bash upload-to-vps.sh usuario@ip-da-vps
#
# Exemplo: bash upload-to-vps.sh root@123.45.67.89
# ============================================

set -e

if [ -z "$1" ]; then
    echo "❌ Uso: bash upload-to-vps.sh usuario@ip-da-vps"
    echo "   Exemplo: bash upload-to-vps.sh root@123.45.67.89"
    exit 1
fi

VPS=$1
REMOTE_DIR="/opt/salareuniao"

echo ""
echo "============================================"
echo "  Enviando projeto para $VPS"
echo "============================================"
echo ""

# Criar diretório remoto
echo "[1/4] Criando diretório remoto..."
ssh $VPS "mkdir -p $REMOTE_DIR"

# Sincronizar arquivos (excluindo node_modules, dist, .git)
echo "[2/4] Sincronizando arquivos..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude 'nginx/logs' \
    --exclude 'nginx/ssl/*.pem' \
    --exclude '.env' \
    ./ $VPS:$REMOTE_DIR/

# Enviar .env.production como .env
echo "[3/4] Configurando .env..."
scp .env.production $VPS:$REMOTE_DIR/.env

# Executar deploy na VPS
echo "[4/4] Executando deploy na VPS..."
ssh $VPS "cd $REMOTE_DIR && bash deploy.sh setup"

echo ""
echo "✅ Deploy concluído!"
echo "   Acesse: http://$(echo $VPS | cut -d@ -f2)"
echo ""
