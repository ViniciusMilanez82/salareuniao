# ============================================
# SALA DE REUNIÃO - Dockerfile
# Multi-stage: Build frontend + Run server
# ============================================

# Stage 1: Build frontend
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build frontend (Vite)
RUN npm run build

# Build server (TypeScript -> JavaScript)
RUN npx tsc -p server/tsconfig.build.json

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar server compilado e supabase
COPY --from=builder /app/server/dist ./server/dist
COPY supabase/ ./supabase/

# Copiar frontend buildado do stage 1
COPY --from=builder /app/dist ./dist

# Criar usuário não-root e dar ownership dos arquivos
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check (usa 127.0.0.1 para evitar IPv6 no Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "server/dist/index.js"]
