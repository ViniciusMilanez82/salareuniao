-- Zera banco de producao mantendo SOMENTE ai_agents (e tabelas relacionadas)
-- Cria usuario admin e workspace padrao para os agentes
-- Uso: cat truncate-keep-agents.sql | docker compose exec -T postgres psql -U USER -d DB -f -

BEGIN;

-- 1. Remover FK de agent_memories para meetings (evita erro ao truncar meetings)
UPDATE agent_memories SET source_session_id = NULL WHERE source_session_id IS NOT NULL;

-- 2. TRUNCATE em cascata - meetings cascata para participantes, transcripts, action_items, etc.
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
TRUNCATE workspace_members RESTART IDENTITY CASCADE;
TRUNCATE profile_settings RESTART IDENTITY CASCADE;
TRUNCATE profiles RESTART IDENTITY CASCADE;

-- 3. Guardar workspace_ids usados pelos agentes
CREATE TEMP TABLE _agent_workspace_ids AS SELECT DISTINCT workspace_id FROM ai_agents;

-- 4. Deletar workspaces que NAO tem agentes
DELETE FROM workspaces WHERE id NOT IN (SELECT workspace_id FROM _agent_workspace_ids);

-- 5. Deletar usuarios que nao sao owners dos workspaces restantes
DELETE FROM users WHERE id NOT IN (SELECT owner_id FROM workspaces WHERE owner_id IS NOT NULL);

-- 6. Se ficou sem usuarios ou sem workspace_members: criar admin e vincular
-- Senha padrao: password (altere apos login)
DO $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_perm JSONB := '{"can_create_sessions": true, "can_create_agents": true, "can_manage_users": true, "can_view_analytics": true, "can_export_data": true, "can_manage_billing": true, "can_manage_integrations": true}'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users) THEN
    INSERT INTO users (email, encrypted_password, name, is_super_admin, email_verified_at)
    VALUES ('admin@salareuniao.local', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', true, NOW())
    RETURNING id INTO v_user_id;
    INSERT INTO workspaces (name, slug, owner_id, description, plan)
    VALUES ('Workspace Padrao', 'ws-default', v_user_id, 'Workspace para agentes', 'free')
    RETURNING id INTO v_workspace_id;
    INSERT INTO workspace_members (workspace_id, user_id, role, permissions)
    VALUES (v_workspace_id, v_user_id, 'workspace_admin', v_perm);
    UPDATE ai_agents SET workspace_id = v_workspace_id WHERE workspace_id NOT IN (SELECT id FROM workspaces);
  ELSIF NOT EXISTS (SELECT 1 FROM workspace_members) THEN
    INSERT INTO workspace_members (workspace_id, user_id, role, permissions)
    SELECT w.id, COALESCE(w.owner_id, (SELECT id FROM users LIMIT 1)), 'workspace_admin', v_perm
    FROM workspaces w;
  END IF;
END $$;

-- 7. Re-seed subscription_plans
TRUNCATE subscription_plans RESTART IDENTITY CASCADE;
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits) VALUES
('Free', 'free', 'Para experimentar a plataforma', 0.00, 0.00, '{"highlights": ["3 agentes", "5 sessões/mês", "2 membros", "Sessões de até 30min"]}', '{"max_agents": 3, "max_sessions_per_month": 5, "max_members": 2, "max_session_duration_minutes": 30, "max_knowledge_base_mb": 50, "max_storage_gb": 1, "api_access": false, "sso": false, "custom_branding": false, "priority_support": false}'),
('Starter', 'starter', 'Para profissionais individuais', 49.90, 478.80, '{"highlights": ["10 agentes", "30 sessões/mês", "5 membros", "Sessões de até 60min", "Relatórios básicos"]}', '{"max_agents": 10, "max_sessions_per_month": 30, "max_members": 5, "max_session_duration_minutes": 60, "max_knowledge_base_mb": 250, "max_storage_gb": 10, "api_access": false, "sso": false, "custom_branding": false, "priority_support": false}'),
('Professional', 'professional', 'Para equipes e empresas', 149.90, 1438.80, '{"highlights": ["50 agentes", "Sessões ilimitadas", "25 membros", "Sessões de até 120min", "Analytics avançado", "API access"]}', '{"max_agents": 50, "max_sessions_per_month": 999, "max_members": 25, "max_session_duration_minutes": 120, "max_knowledge_base_mb": 1000, "max_storage_gb": 50, "api_access": true, "sso": false, "custom_branding": true, "priority_support": true}'),
('Enterprise', 'enterprise', 'Para grandes organizações', 499.90, 4798.80, '{"highlights": ["Agentes ilimitados", "Sessões ilimitadas", "Membros ilimitados", "Sem limite de duração", "SSO", "Suporte dedicado", "SLA"]}', '{"max_agents": 9999, "max_sessions_per_month": 9999, "max_members": 9999, "max_session_duration_minutes": 480, "max_knowledge_base_mb": 10000, "max_storage_gb": 500, "api_access": true, "sso": true, "custom_branding": true, "priority_support": true}');

DROP TABLE IF EXISTS _agent_workspace_ids;

COMMIT;
