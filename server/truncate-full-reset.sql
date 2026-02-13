-- Reset COMPLETO: zera tudo (incluindo agentes e contatos), recria admin + ws-default.
-- O seed-agents.sql em seguida insere os 15 agentes.
-- Uso: cat truncate-full-reset.sql | docker compose exec -T postgres psql -U USER -d DB -f -

BEGIN;

-- 1. Desvincular memórias de reuniões (FK para meetings)
UPDATE agent_memories SET source_session_id = NULL WHERE source_session_id IS NOT NULL;

-- 2. Remover tabelas que referenciam ai_agents e meetings (ordem de FK)
TRUNCATE meeting_agents RESTART IDENTITY CASCADE;
TRUNCATE meetings RESTART IDENTITY CASCADE;
TRUNCATE deals RESTART IDENTITY CASCADE;
TRUNCATE contacts RESTART IDENTITY CASCADE;
TRUNCATE tasks RESTART IDENTITY CASCADE;
TRUNCATE notes RESTART IDENTITY CASCADE;
TRUNCATE templates RESTART IDENTITY CASCADE;
TRUNCATE invitations RESTART IDENTITY CASCADE;
TRUNCATE webhooks RESTART IDENTITY CASCADE;
TRUNCATE api_keys RESTART IDENTITY CASCADE;
TRUNCATE audit_logs RESTART IDENTITY CASCADE;
TRUNCATE notifications RESTART IDENTITY CASCADE;
TRUNCATE reports RESTART IDENTITY CASCADE;
TRUNCATE invoices RESTART IDENTITY CASCADE;
TRUNCATE usage_tracking RESTART IDENTITY CASCADE;
TRUNCATE workspace_subscriptions RESTART IDENTITY CASCADE;
TRUNCATE integration_settings RESTART IDENTITY CASCADE;
TRUNCATE workspace_members RESTART IDENTITY CASCADE;
TRUNCATE profile_settings RESTART IDENTITY CASCADE;
TRUNCATE profiles RESTART IDENTITY CASCADE;

-- 3. Agentes e dependências
TRUNCATE agent_versions RESTART IDENTITY CASCADE;
TRUNCATE agent_knowledge RESTART IDENTITY CASCADE;
TRUNCATE agent_memories RESTART IDENTITY CASCADE;
TRUNCATE ai_agents RESTART IDENTITY CASCADE;

-- 4. Workspaces e users (workspaces.owner_id -> users)
TRUNCATE workspaces RESTART IDENTITY CASCADE;
TRUNCATE users RESTART IDENTITY CASCADE;

-- 5. subscription_plans (sem FK de users/workspaces)
TRUNCATE subscription_plans RESTART IDENTITY CASCADE;
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits) VALUES
('Free', 'free', 'Para experimentar a plataforma', 0.00, 0.00, '{"highlights": ["3 agentes", "5 sessões/mês", "2 membros", "Sessões de até 30min"]}', '{"max_agents": 3, "max_sessions_per_month": 5, "max_members": 2, "max_session_duration_minutes": 30, "max_knowledge_base_mb": 50, "max_storage_gb": 1, "api_access": false, "sso": false, "custom_branding": false, "priority_support": false}'),
('Starter', 'starter', 'Para profissionais individuais', 49.90, 478.80, '{"highlights": ["10 agentes", "30 sessões/mês", "5 membros", "Sessões de até 60min", "Relatórios básicos"]}', '{"max_agents": 10, "max_sessions_per_month": 30, "max_members": 5, "max_session_duration_minutes": 60, "max_knowledge_base_mb": 250, "max_storage_gb": 10, "api_access": false, "sso": false, "custom_branding": false, "priority_support": false}'),
('Professional', 'professional', 'Para equipes e empresas', 149.90, 1438.80, '{"highlights": ["50 agentes", "Sessões ilimitadas", "25 membros", "Sessões de até 120min", "Analytics avançado", "API access"]}', '{"max_agents": 50, "max_sessions_per_month": 999, "max_members": 25, "max_session_duration_minutes": 120, "max_knowledge_base_mb": 1000, "max_storage_gb": 50, "api_access": true, "sso": false, "custom_branding": true, "priority_support": true}'),
('Enterprise', 'enterprise', 'Para grandes organizações', 499.90, 4798.80, '{"highlights": ["Agentes ilimitados", "Sessões ilimitadas", "Membros ilimitados", "Sem limite de duração", "SSO", "Suporte dedicado", "SLA"]}', '{"max_agents": 9999, "max_sessions_per_month": 9999, "max_members": 9999, "max_session_duration_minutes": 480, "max_knowledge_base_mb": 10000, "max_storage_gb": 500, "api_access": true, "sso": true, "custom_branding": true, "priority_support": true}');

-- 6. Admin + workspace padrão (senha: password)
INSERT INTO users (email, encrypted_password, name, is_super_admin, email_verified_at)
VALUES ('admin@salareuniao.local', '$2b$12$f4mOaVY4PhfqkIokVkc7heIfUSFIpHweHHGBPScKp31H8javkiT0C', 'Admin', true, NOW());

INSERT INTO workspaces (name, slug, owner_id, description, plan)
SELECT 'Workspace Padrao', 'ws-default', id, 'Workspace para agentes', 'free' FROM users WHERE email = 'admin@salareuniao.local' LIMIT 1;

INSERT INTO workspace_members (workspace_id, user_id, role, permissions)
SELECT w.id, u.id, 'workspace_admin', '{"can_create_sessions": true, "can_create_agents": true, "can_manage_users": true, "can_view_analytics": true, "can_export_data": true, "can_manage_billing": true, "can_manage_integrations": true}'::jsonb
FROM workspaces w, users u WHERE w.slug = 'ws-default' AND u.email = 'admin@salareuniao.local';

COMMIT;
