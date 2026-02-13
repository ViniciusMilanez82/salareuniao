# Como usar o sistema — Sala de Reunião

Sistema de **sessões de debate** com agentes de IA: você cria reuniões, escolhe agentes e um tema; os agentes conversam (debate, brainstorm, análise etc.) e você acompanha em tempo real.

---

## 1. Rodar o sistema

### Pré-requisitos
- Node.js 18+
- PostgreSQL (ou use Docker)

### Desenvolvimento local
1. Copie `.env.example` para `.env` e preencha:
   - `VITE_API_URL=http://localhost:3001/api`
   - `PORT=3001`
   - `JWT_SECRET=` uma string longa e segura (mín. 20 caracteres)
   - `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
2. Crie o banco e rode as migrações (se houver script de migrate).
3. Em um terminal: `npm run dev:server` (backend na porta 3001).
4. Em outro: `npm run dev` (frontend, geralmente porta 5173).
5. Acesse no navegador a URL do Vite (ex.: `http://localhost:5173`).

### Com Docker
- `npm run docker:up` sobe app + Postgres.
- Configure `.env`/variáveis conforme o `docker-compose.yml`.

---

## 2. Primeiro acesso

1. **Registro** — Crie uma conta em **Registrar** (e-mail e senha).
2. **Login** — Faça login com as credenciais.
3. Você entra no **Dashboard** do workspace.

---

## 3. Fluxo principal: criar e acompanhar uma sessão

### 3.1 Criar uma sessão (reunião)
- No menu: **Reuniões** → **Nova reunião** (ou botão equivalente no dashboard).
- **Passo 1 — Informações**
  - Título e tema/tópico da reunião.
  - Tipo: Debate, Brainstorm, Análise, Estratégia, Revisão, Negociação ou Custom.
- **Passo 2 — Agentes**
  - Selecione até o limite de agentes permitido (ex.: 2–6).
  - Se não houver agentes, crie em **Agentes** → **Novo agente**.
- **Passo 3 — Parâmetros**
  - Ajuste tom (formalidade), ritmo, profundidade e criatividade.
- **Passo 4 — Revisão**
  - Confira e clique em **Iniciar** para criar e abrir a sala.

### 3.2 Na sala de reunião
- **Transcrição** — Mensagens dos agentes aparecem em tempo real (WebSocket ou polling).
- **Turno** — Clique em **Próximo turno** (ou similar) para o sistema escolher o próximo agente e gerar a fala.
- **Auto-debate** — Ative o modo automático: define intervalo entre turnos (ex.: 3 s) e limite de turnos (ex.: 20). Os agentes continuam falando sozinhos até o limite ou até você pausar.
- **Encerrar** — Botão para finalizar a sessão (status → concluída).
- **Exportar** — Exportar transcrição (sala ou arquivo de sessões).

---

## 4. Outras telas

| Onde | O que faz |
|------|------------|
| **Dashboard** | Resumo: sessões ativas, agentes, tempo médio, total de sessões; atalhos para nova reunião e agentes. |
| **Agentes** | Listar, criar e editar agentes (nome, papel, descrição, conhecimento, aparência, teste de voz). |
| **Contatos** | CRUD de contatos (formulários no front). |
| **Negócios (Deals)** | CRUD de negócios. |
| **Configurações** | Perfil (nome, empresa, cargo), alterar senha, tema (claro/escuro), notificações. |
| **Admin** | Apenas **workspace_admin**: usuários e integrações. |
| **Sessões / Arquivo** | Ver sessões passadas e transcrições. |
| **Analytics** | Métricas e gráficos do workspace. |

---

## 5. Busca e atalhos

- **Busca global** — Use **Ctrl+K** (ou o ícone de lupa no header) para buscar em sessões, agentes, contatos e negócios.
- **Notificações** — Ícone de sino no header (dropdown de notificações).

---

## 6. Deploy (VPS)

- Use o `deploy.ps1` com `.env.vps` configurado (Postgres, `JWT_SECRET`, `CORS_ORIGIN`).
- Após o deploy, acesse pela URL da VPS (ex.: `http://187.77.32.67`).
- Credenciais de teste (se configuradas no seed): ex. `admin@salareuniao.local` / `password` — **troque em produção**.

---

## Resumo rápido

1. **Registrar/Login** → Dashboard  
2. **Agentes** → Criar agentes (se ainda não tiver)  
3. **Nova reunião** → Tema, tipo, agentes, parâmetros → **Iniciar**  
4. **Sala** → Ver transcrição, **Próximo turno** ou **Auto-debate** → **Encerrar** quando quiser  
5. **Configurações** → Perfil e senha; **Admin** só para admin do workspace  

Para detalhes da API e do modelo de dados, veja [API_CONTRACTS.md](API_CONTRACTS.md) e [ERD_AND_DATA_MODEL.md](ERD_AND_DATA_MODEL.md).
