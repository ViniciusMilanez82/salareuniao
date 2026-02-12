-- Zera apenas os dados (mantém tabelas e estrutura)
-- Re-insere planos de assinatura

TRUNCATE TABLE
  action_items, agent_knowledge, agent_memories, agent_versions, ai_agents,
  api_keys, audit_logs, contacts, deal_contacts, deal_stages, deals,
  invitations, invoices, meeting_agents, meeting_participants, meetings,
  notes, notifications, profile_settings, profiles, reports, session_documents,
  subscription_plans, task_assignees, tasks, templates, transcripts,
  usage_tracking, webhook_deliveries, webhooks, workspace_members,
  workspace_subscriptions, workspaces, users
RESTART IDENTITY CASCADE;

INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits) VALUES
('Free', 'free', 'Para experimentar a plataforma', 0.00, 0.00,
 '{"highlights": ["3 agentes", "5 sessões/mês", "2 membros", "Sessões de até 30min"]}',
 '{"max_agents": 3, "max_sessions_per_month": 5, "max_members": 2, "max_session_duration_minutes": 30, "max_knowledge_base_mb": 50, "max_storage_gb": 1, "api_access": false, "sso": false, "custom_branding": false, "priority_support": false}'),
('Starter', 'starter', 'Para profissionais individuais', 49.90, 478.80,
 '{"highlights": ["10 agentes", "30 sessões/mês", "5 membros", "Sessões de até 60min", "Relatórios básicos"]}',
 '{"max_agents": 10, "max_sessions_per_month": 30, "max_members": 5, "max_session_duration_minutes": 60, "max_knowledge_base_mb": 250, "max_storage_gb": 10, "api_access": false, "sso": false, "custom_branding": false, "priority_support": false}'),
('Professional', 'professional', 'Para equipes e empresas', 149.90, 1438.80,
 '{"highlights": ["50 agentes", "Sessões ilimitadas", "25 membros", "Sessões de até 120min", "Analytics avançado", "API access"]}',
 '{"max_agents": 50, "max_sessions_per_month": 999, "max_members": 25, "max_session_duration_minutes": 120, "max_knowledge_base_mb": 1000, "max_storage_gb": 50, "api_access": true, "sso": false, "custom_branding": true, "priority_support": true}'),
('Enterprise', 'enterprise', 'Para grandes organizações', 499.90, 4798.80,
 '{"highlights": ["Agentes ilimitados", "Sessões ilimitadas", "Membros ilimitados", "Sem limite de duração", "SSO", "Suporte dedicado", "SLA"]}',
 '{"max_agents": 9999, "max_sessions_per_month": 9999, "max_members": 9999, "max_session_duration_minutes": 480, "max_knowledge_base_mb": 10000, "max_storage_gb": 500, "api_access": true, "sso": true, "custom_branding": true, "priority_support": true}');
