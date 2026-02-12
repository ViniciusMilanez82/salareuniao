# Deploy na VPS Hostinger

**VPS:** `srv1353769.hstgr.cloud`  
**IP:** `187.77.32.67`

---

## 1. Na Hostinger: instalar Docker (se ainda não tiver)

No hPanel, clique em **Terminal** (canto superior da página de Configurações do VPS) e rode:

```bash
# Atualizar e instalar Docker
apt update && apt install -y docker.io docker-compose-v2 git

# Habilitar e iniciar
systemctl enable docker && systemctl start docker
```

---

## 2. No seu PC: enviar o projeto para a VPS

No **PowerShell** ou **Git Bash**, na pasta do projeto:

```powershell
# Definir IP da VPS
$VPS = "root@187.77.32.67"

# Criar pasta remota
ssh $VPS "mkdir -p /opt/salareuniao"

# Enviar arquivos (excluindo node_modules, .git, etc.)
scp -r package.json package-lock.json tsconfig.json vite.config.ts index.html tailwind.config.js postcss.config.js src server supabase nginx docker-compose.yml Dockerfile .env.production deploy.sh $VPS:/opt/salareuniao/

# Enviar .env da VPS
scp .env.vps $VPS:/opt/salareuniao/.env
```

Se pedir senha, use a **senha do root** que você definiu em **Configurações principais** (Alterar senha do root).  
Se estiver usando **chave SSH**, não pedirá senha.

---

## 3. Na VPS: subir Docker e rodar migração

Conecte na VPS (use a chave SSH que está no hPanel em **Chaves SSH**):

```bash
ssh root@187.77.32.67
```

Na VPS, rode:

```bash
cd /opt/salareuniao

# 1. Subir PostgreSQL + App + Nginx (primeiro sobe o banco)
docker compose up -d

# 2. Instalar Node na VPS para rodar a migração
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 3. Instalar deps e criar tabelas no banco
npm install
npm run migrate

# 4. Ver se está tudo ok
docker compose ps
curl -s http://localhost:3001/api/health
```

---

## Deploy a partir do seu PC (resumo)

1. **Enviar o projeto** (PowerShell na pasta do projeto):

```powershell
$VPS = "root@187.77.32.67"
ssh $VPS "mkdir -p /opt/salareuniao"
scp -r package.json package-lock.json tsconfig.json vite.config.ts index.html tailwind.config.js postcss.config.js src server supabase nginx docker-compose.yml Dockerfile .env.production deploy.sh $VPS:/opt/salareuniao/
scp .env.vps $VPS:/opt/salareuniao/.env
```

2. **Conectar e subir na VPS**:

```bash
ssh root@187.77.32.67
cd /opt/salareuniao
docker compose up -d
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
npm install && npm run migrate
docker compose ps && curl -s http://localhost:3001/api/health
```

Depois acesse: **http://187.77.32.67**

---

## 4. Acessar o sistema

- **Pelo IP:** http://187.77.32.67  
- **Pela API:** http://187.77.32.67/api/health  

O Nginx escuta na porta 80 e encaminha para o app.

---

## Comandos úteis na VPS

```bash
cd /opt/salareuniao

# Logs da aplicação
docker compose logs -f app

# Reiniciar só o app
docker compose restart app

# Parar tudo
docker compose down

# Atualizar após mudanças no código (do seu PC, enviar de novo e na VPS):
docker compose build --no-cache app && docker compose up -d app
```

---

## Referência SSH

- [Como gerar chaves SSH e adicioná-las ao hPanel](https://www.hostinger.com/support/5634532-how-to-generate-ssh-keys-and-add-them-to-hostinger-hpanel/)
- Você já tem chaves em "Chaves SSH" (ex.: **multigest-deploy**); use a mesma chave no seu PC para `ssh root@187.77.32.67` sem senha.
