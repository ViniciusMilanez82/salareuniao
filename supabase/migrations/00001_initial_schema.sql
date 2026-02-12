-- ============================================================
-- SALA DE REUNIÃO - Schema Completo do Banco de Dados
-- Plataforma de Simulação Cognitiva e Colaboração Aumentada
-- ============================================================
-- Migração: 00001_initial_schema.sql
-- Criado em: 2026-02-12
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- 1. WORKSPACES
-- ============================================================
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    owner_id UUID, -- será referenciado após users ser criada
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
    max_agents INTEGER DEFAULT 5,
    max_sessions_per_month INTEGER DEFAULT 20,
    max_members INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{
        "allow_sso": false,
        "default_language": "pt-BR",
        "theme": "system",
        "branding": {"primary_color": "#2563EB", "logo_url": null},
        "security": {"require_2fa": false, "session_timeout_minutes": 480},
        "ai": {"default_model": "gpt-4", "max_tokens": 4000, "available_voices": ["neural-male", "neural-female"]}
    }',
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_password TEXT,
    name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    company VARCHAR(200),
    job_title VARCHAR(150),
    phone VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    locale VARCHAR(10) DEFAULT 'pt-BR',
    is_super_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;

-- Adicionar FK do workspace owner
ALTER TABLE workspaces ADD CONSTRAINT fk_workspaces_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 3. WORKSPACE_MEMBERS (Relaciona usuários a workspaces com roles)
-- ============================================================
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'observer' CHECK (role IN (
        'workspace_admin',
        'moderator',
        'agent_creator',
        'observer',
        'analyst',
        'integrator'
    )),
    permissions JSONB DEFAULT '{
        "can_create_sessions": false,
        "can_create_agents": false,
        "can_manage_users": false,
        "can_view_analytics": false,
        "can_export_data": false,
        "can_manage_billing": false,
        "can_manage_integrations": false
    }',
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role);

-- ============================================================
-- 4. PROFILES (Perfis estendidos dos usuários)
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bio TEXT,
    expertise TEXT[],
    preferred_languages VARCHAR(10)[] DEFAULT '{pt-BR}',
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "push": true,
        "slack": false,
        "session_reminders": true,
        "weekly_digest": true
    }',
    ai_assistant_preferences JSONB DEFAULT '{
        "voice": "neural-female",
        "speed": 1.0,
        "interruptions": true,
        "auto_transcribe": true
    }',
    ui_preferences JSONB DEFAULT '{
        "theme": "system",
        "sidebar_collapsed": false,
        "dashboard_widgets": [],
        "compact_mode": false
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- ============================================================
-- 5. PROFILE_SETTINGS (Configurações chave-valor do perfil)
-- ============================================================
CREATE TABLE profile_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, setting_key)
);

CREATE INDEX idx_profile_settings_profile ON profile_settings(profile_id);

-- ============================================================
-- 6. AI_AGENTS (Agentes de IA personalizados)
-- ============================================================
CREATE TABLE ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100),
    description TEXT,
    avatar_url TEXT,
    role VARCHAR(100) NOT NULL,
    expertise TEXT[],
    personality_traits JSONB NOT NULL DEFAULT '{
        "professionalism": 8,
        "creativity": 6,
        "detail_orientation": 7,
        "assertiveness": 5,
        "empathy": 6,
        "humor": 3
    }',
    system_prompt TEXT NOT NULL DEFAULT '',
    knowledge_base_summary JSONB DEFAULT '{"domains": [], "expertise": [], "biases": []}',
    voice_settings JSONB DEFAULT '{
        "provider": "elevenlabs",
        "voice_id": null,
        "type": "neural",
        "accent": "neutral",
        "speed": 1.0,
        "pitch": 1.0
    }',
    visual_avatar JSONB DEFAULT '{
        "style": "realistic",
        "expressions": true,
        "background_color": "#1E293B"
    }',
    behavior_settings JSONB DEFAULT '{
        "allow_interruptions": true,
        "ask_questions": true,
        "provide_suggestions": true,
        "debate_style": "balanced",
        "verbosity": "moderate",
        "response_length": "medium"
    }',
    model_settings JSONB DEFAULT '{
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 4000,
        "top_p": 1.0,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
    }',
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    tags TEXT[],
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_agents_workspace ON ai_agents(workspace_id);
CREATE INDEX idx_ai_agents_created_by ON ai_agents(created_by);
CREATE INDEX idx_ai_agents_active ON ai_agents(is_active);
CREATE INDEX idx_ai_agents_template ON ai_agents(is_template) WHERE is_template = true;
CREATE INDEX idx_ai_agents_tags ON ai_agents USING GIN(tags);

-- ============================================================
-- 7. AGENT_VERSIONS (Versionamento dos agentes)
-- ============================================================
CREATE TABLE agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changelog TEXT,
    system_prompt TEXT NOT NULL,
    personality_traits JSONB NOT NULL,
    behavior_settings JSONB NOT NULL,
    model_settings JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    snapshot JSONB NOT NULL, -- snapshot completo do agente nesta versão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, version_number)
);

CREATE INDEX idx_agent_versions_agent ON agent_versions(agent_id);

-- ============================================================
-- 8. AGENT_KNOWLEDGE (Base de conhecimento dos agentes)
-- ============================================================
CREATE TABLE agent_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    source_type VARCHAR(50) CHECK (source_type IN ('upload', 'manual', 'api', 'web_scrape', 'session_learning')),
    source_url TEXT,
    file_path TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    embedding VECTOR(1536),
    token_count INTEGER,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agent_knowledge_agent ON agent_knowledge(agent_id);
CREATE INDEX idx_agent_knowledge_category ON agent_knowledge(category);
CREATE INDEX idx_agent_knowledge_tags ON agent_knowledge USING GIN(tags);
CREATE INDEX idx_agent_knowledge_embedding ON agent_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 9. AGENT_MEMORIES (Memória evolutiva dos agentes)
-- ============================================================
CREATE TABLE agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN ('session', 'long_term', 'episodic', 'semantic')),
    content TEXT NOT NULL,
    context TEXT,
    importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score BETWEEN 0 AND 1),
    embedding VECTOR(1536),
    source_session_id UUID, -- referenciado após meetings ser criada
    related_agent_ids UUID[],
    tags TEXT[],
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agent_memories_agent ON agent_memories(agent_id);
CREATE INDEX idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX idx_agent_memories_importance ON agent_memories(importance_score DESC);
CREATE INDEX idx_agent_memories_embedding ON agent_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 10. CONTACTS (Contatos/participantes humanos)
-- ============================================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    name VARCHAR(150) NOT NULL,
    company VARCHAR(200),
    job_title VARCHAR(150),
    phone VARCHAR(50),
    avatar_url TEXT,
    relationship_level INTEGER DEFAULT 1 CHECK (relationship_level BETWEEN 1 AND 10),
    tags TEXT[],
    notes TEXT,
    is_favorite BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contacts_workspace ON contacts(workspace_id);
CREATE INDEX idx_contacts_created_by ON contacts(created_by);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);

-- ============================================================
-- 11. MEETINGS / SESSIONS (Reuniões/Sessões)
-- ============================================================
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    topic TEXT,
    objectives JSONB DEFAULT '[]',
    meeting_type VARCHAR(50) DEFAULT 'debate' CHECK (meeting_type IN (
        'debate', 'brainstorm', 'analysis', 'strategy', 'review', 'negotiation', 'custom'
    )),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'scheduled', 'lobby', 'in_progress', 'paused', 'completed', 'cancelled', 'archived'
    )),
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    room_id VARCHAR(100) UNIQUE,
    recording_url TEXT,
    agenda JSONB DEFAULT '[]',
    parameters JSONB DEFAULT '{
        "formality": 7,
        "pace": 5,
        "depth": 7,
        "creativity": 5,
        "max_rounds": 10,
        "speaking_time_limit_seconds": 120,
        "allow_interruptions": true,
        "auto_moderate": false
    }',
    settings JSONB DEFAULT '{
        "record_audio": true,
        "record_transcript": true,
        "allow_observers": true,
        "auto_generate_summary": true,
        "auto_detect_action_items": true,
        "sentiment_analysis": true,
        "language": "pt-BR"
    }',
    summary TEXT,
    key_decisions JSONB DEFAULT '[]',
    tags TEXT[],
    template_id UUID,
    parent_session_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meetings_workspace ON meetings(workspace_id);
CREATE INDEX idx_meetings_created_by ON meetings(created_by);
CREATE INDEX idx_meetings_moderator ON meetings(moderator_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_start);
CREATE INDEX idx_meetings_room ON meetings(room_id);
CREATE INDEX idx_meetings_type ON meetings(meeting_type);
CREATE INDEX idx_meetings_tags ON meetings USING GIN(tags);

-- Adicionar FK da agent_memories
ALTER TABLE agent_memories ADD CONSTRAINT fk_agent_memories_session FOREIGN KEY (source_session_id) REFERENCES meetings(id) ON DELETE SET NULL;

-- ============================================================
-- 12. MEETING_PARTICIPANTS (Participantes humanos nas reuniões)
-- ============================================================
CREATE TABLE meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'observer' CHECK (role IN ('moderator', 'observer', 'guest')),
    status VARCHAR(50) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'attended', 'no_show')),
    invite_token VARCHAR(255) UNIQUE,
    invite_expires_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_participant_ref CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE INDEX idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_user ON meeting_participants(user_id);
CREATE INDEX idx_meeting_participants_contact ON meeting_participants(contact_id);
CREATE INDEX idx_meeting_participants_token ON meeting_participants(invite_token) WHERE invite_token IS NOT NULL;

-- ============================================================
-- 13. MEETING_AGENTS (Agentes de IA nas reuniões)
-- ============================================================
CREATE TABLE meeting_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    role_in_meeting VARCHAR(100) NOT NULL DEFAULT 'participant',
    speaking_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_muted BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{
        "allow_interruptions": true,
        "ask_questions": true,
        "provide_suggestions": true,
        "max_speaking_time_seconds": 120,
        "custom_instructions": null
    }',
    stats JSONB DEFAULT '{
        "total_interventions": 0,
        "total_speaking_time_seconds": 0,
        "questions_asked": 0,
        "agreements": 0,
        "disagreements": 0
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meeting_id, agent_id)
);

CREATE INDEX idx_meeting_agents_meeting ON meeting_agents(meeting_id);
CREATE INDEX idx_meeting_agents_agent ON meeting_agents(agent_id);

-- ============================================================
-- 14. TRANSCRIPTS (Transcrições das reuniões)
-- ============================================================
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    speaker_type VARCHAR(20) NOT NULL CHECK (speaker_type IN ('human', 'ai_agent', 'moderator', 'system')),
    speaker_id UUID,
    speaker_name VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'speech' CHECK (content_type IN ('speech', 'question', 'intervention', 'system_message', 'action')),
    audio_url TEXT,
    audio_duration_seconds DECIMAL(10,2),
    timestamp_start TIMESTAMP WITH TIME ZONE NOT NULL,
    timestamp_end TIMESTAMP WITH TIME ZONE,
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score BETWEEN -1 AND 1),
    sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
    topics TEXT[],
    entities JSONB DEFAULT '[]',
    references_transcript_ids UUID[],
    is_edited BOOLEAN DEFAULT false,
    original_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transcripts_meeting ON transcripts(meeting_id);
CREATE INDEX idx_transcripts_sequence ON transcripts(meeting_id, sequence_number);
CREATE INDEX idx_transcripts_speaker ON transcripts(speaker_type, speaker_id);
CREATE INDEX idx_transcripts_timestamp ON transcripts(timestamp_start);
CREATE INDEX idx_transcripts_topics ON transcripts USING GIN(topics);
CREATE INDEX idx_transcripts_sentiment ON transcripts(sentiment_label);

-- ============================================================
-- 15. ACTION_ITEMS (Itens de ação gerados nas reuniões)
-- ============================================================
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    assigned_to_user UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_contact UUID REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_to_agent UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(150),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    category VARCHAR(100),
    tags TEXT[],
    source_transcript_id UUID REFERENCES transcripts(id) ON DELETE SET NULL,
    auto_detected BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_action_items_meeting ON action_items(meeting_id);
CREATE INDEX idx_action_items_workspace ON action_items(workspace_id);
CREATE INDEX idx_action_items_assigned_user ON action_items(assigned_to_user);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_due_date ON action_items(due_date);

-- ============================================================
-- 16. SESSION_DOCUMENTS (Documentos da sessão)
-- ============================================================
CREATE TABLE session_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_url TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    category VARCHAR(50) DEFAULT 'context' CHECK (category IN ('context', 'reference', 'output', 'recording', 'transcript_export')),
    is_shared_with_agents BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_session_documents_meeting ON session_documents(meeting_id);

-- ============================================================
-- 17. DEALS (Negócios/Oportunidades)
-- ============================================================
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'BRL',
    probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    status VARCHAR(50) DEFAULT 'prospecting' CHECK (status IN (
        'prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    tags TEXT[],
    related_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deals_workspace ON deals(workspace_id);
CREATE INDEX idx_deals_created_by ON deals(created_by);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_close_date ON deals(expected_close_date);

-- ============================================================
-- 18. DEAL_STAGES (Histórico de estágios do negócio)
-- ============================================================
CREATE TABLE deal_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exited_at TIMESTAMP WITH TIME ZONE,
    duration_hours DECIMAL(10,2),
    notes TEXT,
    changed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_deal_stages_deal ON deal_stages(deal_id);

-- ============================================================
-- 19. DEAL_CONTACTS (Relação deals-contacts)
-- ============================================================
CREATE TABLE deal_contacts (
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'stakeholder',
    influence_level INTEGER DEFAULT 5 CHECK (influence_level BETWEEN 1 AND 10),
    is_decision_maker BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (deal_id, contact_id)
);

CREATE INDEX idx_deal_contacts_contact ON deal_contacts(contact_id);

-- ============================================================
-- 20. NOTES (Anotações)
-- ============================================================
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content TEXT NOT NULL,
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT false,
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notes_workspace ON notes(workspace_id);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_meeting ON notes(meeting_id);

-- ============================================================
-- 21. TASKS (Tarefas)
-- ============================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    action_item_id UUID REFERENCES action_items(id) ON DELETE SET NULL,
    tags TEXT[],
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- ============================================================
-- 22. TASK_ASSIGNEES (Atribuição de tarefas)
-- ============================================================
CREATE TABLE task_assignees (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);

CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

-- ============================================================
-- 23. TEMPLATES (Templates de agentes e sessões)
-- ============================================================
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL = template global
    created_by UUID NOT NULL REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('agent', 'session', 'prompt')),
    category VARCHAR(100),
    icon VARCHAR(50),
    config JSONB NOT NULL DEFAULT '{}',
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    is_official BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_templates_workspace ON templates(workspace_id);
CREATE INDEX idx_templates_type ON templates(template_type);
CREATE INDEX idx_templates_public ON templates(is_public) WHERE is_public = true;
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);

-- Adicionar FK do meetings.template_id
ALTER TABLE meetings ADD CONSTRAINT fk_meetings_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;

-- ============================================================
-- 24. INVITATIONS (Convites)
-- ============================================================
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'observer',
    token VARCHAR(255) UNIQUE NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE, -- convite para sessão específica
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invitations_workspace ON invitations(workspace_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- ============================================================
-- 25. API_KEYS (Chaves de API)
-- ============================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- primeiros caracteres para identificação
    key_hash TEXT NOT NULL, -- hash da chave completa
    scopes JSONB DEFAULT '["read"]',
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    rate_limit_per_minute INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- ============================================================
-- 26. WEBHOOKS (Configuração de webhooks)
-- ============================================================
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] NOT NULL DEFAULT '{session.completed}',
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_response_code INTEGER,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_workspace ON webhooks(workspace_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- ============================================================
-- 27. WEBHOOK_DELIVERIES (Log de entregas de webhooks)
-- ============================================================
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);

-- ============================================================
-- 28. AUDIT_LOGS (Logs de auditoria)
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(200),
    changes JSONB, -- {field: {old: value, new: value}}
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- ============================================================
-- 29. NOTIFICATIONS (Notificações)
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'session_invite', 'session_starting', 'session_completed',
        'agent_shared', 'mention', 'action_item_assigned',
        'report_ready', 'system_alert', 'workspace_invite'
    )),
    title VARCHAR(200) NOT NULL,
    message TEXT,
    icon VARCHAR(50),
    link VARCHAR(500),
    entity_type VARCHAR(50),
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- 30. REPORTS (Relatórios gerados)
-- ============================================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'session_summary', 'session_transcript', 'analytics_dashboard',
        'agent_performance', 'workspace_usage', 'custom'
    )),
    format VARCHAR(20) DEFAULT 'pdf' CHECK (format IN ('pdf', 'docx', 'json', 'csv', 'html')),
    file_url TEXT,
    file_size_bytes BIGINT,
    config JSONB DEFAULT '{}', -- configurações usadas para gerar
    status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed', 'expired')),
    generated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_workspace ON reports(workspace_id);
CREATE INDEX idx_reports_meeting ON reports(meeting_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ============================================================
-- 31. SUBSCRIPTION_PLANS (Planos de assinatura)
-- ============================================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'BRL',
    features JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{
        "max_agents": 5,
        "max_sessions_per_month": 20,
        "max_members": 10,
        "max_session_duration_minutes": 60,
        "max_knowledge_base_mb": 100,
        "max_storage_gb": 5,
        "api_access": false,
        "sso": false,
        "custom_branding": false,
        "priority_support": false
    }',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 32. WORKSPACE_SUBSCRIPTIONS (Assinaturas ativas)
-- ============================================================
CREATE TABLE workspace_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'paused')),
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    external_subscription_id VARCHAR(255), -- Stripe subscription ID
    external_customer_id VARCHAR(255), -- Stripe customer ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workspace_subs_workspace ON workspace_subscriptions(workspace_id);
CREATE INDEX idx_workspace_subs_status ON workspace_subscriptions(status);

-- ============================================================
-- 33. INVOICES (Faturas)
-- ============================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES workspace_subscriptions(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    description TEXT,
    line_items JSONB DEFAULT '[]',
    payment_method JSONB,
    external_invoice_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================
-- 34. USAGE_TRACKING (Rastreamento de uso)
-- ============================================================
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN (
        'session_minutes', 'ai_tokens', 'tts_characters', 'stt_minutes',
        'storage_bytes', 'api_calls', 'agent_count', 'member_count'
    )),
    quantity DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    user_id UUID REFERENCES users(id),
    meeting_id UUID REFERENCES meetings(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_usage_workspace ON usage_tracking(workspace_id);
CREATE INDEX idx_usage_period ON usage_tracking(period_start, period_end);
CREATE INDEX idx_usage_type ON usage_tracking(resource_type);

-- ============================================================
-- FUNCTIONS E TRIGGERS
-- ============================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t);
    END LOOP;
END;
$$;

-- Função para gerar room_id único
CREATE OR REPLACE FUNCTION generate_room_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.room_id IS NULL THEN
        NEW.room_id = 'room_' || encode(gen_random_bytes(8), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_room_id
BEFORE INSERT ON meetings
FOR EACH ROW
EXECUTE FUNCTION generate_room_id();

-- Função para criar perfil automático após criar usuário
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_profile
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_user();

-- Função para registrar mudança de estágio do deal
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Fechar estágio anterior
        UPDATE deal_stages
        SET exited_at = NOW(),
            duration_hours = EXTRACT(EPOCH FROM (NOW() - entered_at)) / 3600.0
        WHERE deal_id = NEW.id AND exited_at IS NULL;

        -- Abrir novo estágio
        INSERT INTO deal_stages (deal_id, stage)
        VALUES (NEW.id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_deal_stages
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION log_deal_stage_change();

-- Função para calcular duração da sessão
CREATE OR REPLACE FUNCTION calculate_meeting_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.actual_end IS NOT NULL AND NEW.actual_start IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.actual_end - NEW.actual_start)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_meeting_duration
BEFORE UPDATE ON meetings
FOR EACH ROW
EXECUTE FUNCTION calculate_meeting_duration();

-- Função para incrementar usage_count do agente
CREATE OR REPLACE FUNCTION increment_agent_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_agents
    SET usage_count = usage_count + 1
    WHERE id = NEW.agent_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_agent_usage
AFTER INSERT ON meeting_agents
FOR EACH ROW
EXECUTE FUNCTION increment_agent_usage();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- POLICIES: Users
-- --------------------------------------------------------
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_select_same_workspace" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm1
            JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = auth.uid() AND wm2.user_id = users.id
        )
    );

CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "super_admin_all" ON users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_super_admin = true)
    );

-- --------------------------------------------------------
-- POLICIES: Workspace Members
-- --------------------------------------------------------
CREATE POLICY "members_select_own_workspace" ON workspace_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "members_manage_as_admin" ON workspace_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'workspace_admin'
        )
    );

-- --------------------------------------------------------
-- POLICIES: Profiles
-- --------------------------------------------------------
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles_manage_own" ON profiles
    FOR ALL USING (user_id = auth.uid());

-- --------------------------------------------------------
-- POLICIES: Workspaces - acesso via membership
-- --------------------------------------------------------
CREATE POLICY "workspaces_select_member" ON workspaces
    FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspaces.id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "workspaces_manage_owner" ON workspaces
    FOR ALL USING (owner_id = auth.uid());

-- --------------------------------------------------------
-- POLICIES: AI Agents - acesso via workspace
-- --------------------------------------------------------
CREATE POLICY "agents_select_workspace" ON ai_agents
    FOR SELECT USING (
        created_by = auth.uid() OR
        is_public = true OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = ai_agents.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "agents_manage_creator" ON ai_agents
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = ai_agents.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('workspace_admin', 'agent_creator')
        )
    );

-- --------------------------------------------------------
-- POLICIES: Agent Knowledge
-- --------------------------------------------------------
CREATE POLICY "knowledge_via_agent" ON agent_knowledge
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_agents a
            WHERE a.id = agent_knowledge.agent_id
            AND (
                a.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = a.workspace_id
                    AND wm.user_id = auth.uid()
                )
            )
        )
    );

-- --------------------------------------------------------
-- POLICIES: Meetings
-- --------------------------------------------------------
CREATE POLICY "meetings_select_workspace" ON meetings
    FOR SELECT USING (
        created_by = auth.uid() OR
        moderator_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = meetings.workspace_id
            AND wm.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM meeting_participants mp
            WHERE mp.meeting_id = meetings.id
            AND mp.user_id = auth.uid()
        )
    );

CREATE POLICY "meetings_manage" ON meetings
    FOR ALL USING (
        created_by = auth.uid() OR
        moderator_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = meetings.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('workspace_admin', 'moderator')
        )
    );

-- --------------------------------------------------------
-- POLICIES: Transcripts
-- --------------------------------------------------------
CREATE POLICY "transcripts_via_meeting" ON transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM meetings m
            WHERE m.id = transcripts.meeting_id
            AND (
                m.created_by = auth.uid() OR
                m.moderator_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = m.workspace_id
                    AND wm.user_id = auth.uid()
                )
            )
        )
    );

-- --------------------------------------------------------
-- POLICIES: Notifications
-- --------------------------------------------------------
CREATE POLICY "notifications_own" ON notifications
    FOR ALL USING (user_id = auth.uid());

-- --------------------------------------------------------
-- POLICIES: Contacts
-- --------------------------------------------------------
CREATE POLICY "contacts_workspace" ON contacts
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = contacts.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------
-- POLICIES: Deals
-- --------------------------------------------------------
CREATE POLICY "deals_workspace" ON deals
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = deals.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------
-- POLICIES: Notes
-- --------------------------------------------------------
CREATE POLICY "notes_own" ON notes
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "notes_shared" ON notes
    FOR SELECT USING (
        is_private = false AND
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = notes.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------
-- POLICIES: Tasks
-- --------------------------------------------------------
CREATE POLICY "tasks_workspace" ON tasks
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM task_assignees ta
            WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = tasks.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'workspace_admin'
        )
    );

-- --------------------------------------------------------
-- POLICIES: Templates
-- --------------------------------------------------------
CREATE POLICY "templates_select" ON templates
    FOR SELECT USING (
        is_public = true OR
        created_by = auth.uid() OR
        (workspace_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = templates.workspace_id
            AND wm.user_id = auth.uid()
        ))
    );

-- --------------------------------------------------------
-- POLICIES: Audit Logs (apenas admins)
-- --------------------------------------------------------
CREATE POLICY "audit_logs_admin" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_super_admin = true
        ) OR
        (workspace_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = audit_logs.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'workspace_admin'
        ))
    );

-- --------------------------------------------------------
-- POLICIES: API Keys
-- --------------------------------------------------------
CREATE POLICY "api_keys_workspace_admin" ON api_keys
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = api_keys.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('workspace_admin', 'integrator')
        )
    );

-- --------------------------------------------------------
-- POLICIES: Webhooks
-- --------------------------------------------------------
CREATE POLICY "webhooks_workspace_admin" ON webhooks
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = webhooks.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('workspace_admin', 'integrator')
        )
    );

-- --------------------------------------------------------
-- POLICIES: Reports
-- --------------------------------------------------------
CREATE POLICY "reports_workspace" ON reports
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = reports.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- --------------------------------------------------------
-- POLICIES: Invitations
-- --------------------------------------------------------
CREATE POLICY "invitations_manage" ON invitations
    FOR ALL USING (
        invited_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = invitations.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'workspace_admin'
        )
    );

-- Policies remaining tables (broad access via workspace)
CREATE POLICY "meeting_participants_via_meeting" ON meeting_participants
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM meetings m
            WHERE m.id = meeting_participants.meeting_id
            AND (m.created_by = auth.uid() OR m.moderator_id = auth.uid())
        )
    );

CREATE POLICY "meeting_agents_via_meeting" ON meeting_agents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM meetings m
            WHERE m.id = meeting_agents.meeting_id
            AND (
                m.created_by = auth.uid() OR
                m.moderator_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = m.workspace_id
                    AND wm.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "action_items_workspace" ON action_items
    FOR ALL USING (
        assigned_to_user = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = action_items.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "session_docs_via_meeting" ON session_documents
    FOR ALL USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM meetings m
            WHERE m.id = session_documents.meeting_id
            AND EXISTS (
                SELECT 1 FROM workspace_members wm
                WHERE wm.workspace_id = m.workspace_id
                AND wm.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "agent_versions_via_agent" ON agent_versions
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM ai_agents a
            WHERE a.id = agent_versions.agent_id
            AND EXISTS (
                SELECT 1 FROM workspace_members wm
                WHERE wm.workspace_id = a.workspace_id
                AND wm.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "agent_memories_via_agent" ON agent_memories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_agents a
            WHERE a.id = agent_memories.agent_id
            AND (
                a.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = a.workspace_id
                    AND wm.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "deal_stages_via_deal" ON deal_stages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM deals d
            WHERE d.id = deal_stages.deal_id
            AND (
                d.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = d.workspace_id
                    AND wm.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "deal_contacts_via_deal" ON deal_contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM deals d
            WHERE d.id = deal_contacts.deal_id
            AND (
                d.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = d.workspace_id
                    AND wm.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "task_assignees_via_task" ON task_assignees
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = task_assignees.task_id
            AND t.created_by = auth.uid()
        )
    );

CREATE POLICY "profile_settings_own" ON profile_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = profile_settings.profile_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "webhook_deliveries_via_webhook" ON webhook_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM webhooks w
            WHERE w.id = webhook_deliveries.webhook_id
            AND (
                w.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = w.workspace_id
                    AND wm.user_id = auth.uid()
                    AND wm.role IN ('workspace_admin', 'integrator')
                )
            )
        )
    );

CREATE POLICY "invoices_workspace" ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = invoices.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'workspace_admin'
        ) OR
        EXISTS (
            SELECT 1 FROM workspaces ws
            WHERE ws.id = invoices.workspace_id
            AND ws.owner_id = auth.uid()
        )
    );

CREATE POLICY "workspace_subs_manage" ON workspace_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspaces ws
            WHERE ws.id = workspace_subscriptions.workspace_id
            AND ws.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_subscriptions.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'workspace_admin'
        )
    );

CREATE POLICY "usage_tracking_admin" ON usage_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = usage_tracking.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role = 'workspace_admin'
        ) OR
        EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_super_admin = true
        )
    );

-- ============================================================
-- SEED DATA: Planos de assinatura padrão
-- ============================================================
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits) VALUES
(
    'Free',
    'free',
    'Para experimentar a plataforma',
    0.00,
    0.00,
    '{"highlights": ["3 agentes", "5 sessões/mês", "2 membros", "Sessões de até 30min"]}',
    '{"max_agents": 3, "max_sessions_per_month": 5, "max_members": 2, "max_session_duration_minutes": 30, "max_knowledge_base_mb": 50, "max_storage_gb": 1, "api_access": false, "sso": false, "custom_branding": false, "priority_support": false}'
),
(
    'Starter',
    'starter',
    'Para profissionais individuais',
    49.90,
    478.80,
    '{"highlights": ["10 agentes", "30 sessões/mês", "5 membros", "Sessões de até 60min", "Relatórios básicos"]}',
    '{"max_agents": 10, "max_sessions_per_month": 30, "max_members": 5, "max_session_duration_minutes": 60, "max_knowledge_base_mb": 250, "max_storage_gb": 10, "api_access": false, "sso": false, "custom_branding": false, "priority_support": false}'
),
(
    'Professional',
    'professional',
    'Para equipes e empresas',
    149.90,
    1438.80,
    '{"highlights": ["50 agentes", "Sessões ilimitadas", "25 membros", "Sessões de até 120min", "Analytics avançado", "API access"]}',
    '{"max_agents": 50, "max_sessions_per_month": 999, "max_members": 25, "max_session_duration_minutes": 120, "max_knowledge_base_mb": 1000, "max_storage_gb": 50, "api_access": true, "sso": false, "custom_branding": true, "priority_support": true}'
),
(
    'Enterprise',
    'enterprise',
    'Para grandes organizações',
    499.90,
    4798.80,
    '{"highlights": ["Agentes ilimitados", "Sessões ilimitadas", "Membros ilimitados", "Sem limite de duração", "SSO", "Suporte dedicado", "SLA"]}',
    '{"max_agents": 9999, "max_sessions_per_month": 9999, "max_members": 9999, "max_session_duration_minutes": 480, "max_knowledge_base_mb": 10000, "max_storage_gb": 500, "api_access": true, "sso": true, "custom_branding": true, "priority_support": true}'
);

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View: Resumo do workspace
CREATE OR REPLACE VIEW workspace_summary AS
SELECT
    w.id AS workspace_id,
    w.name,
    w.plan,
    COUNT(DISTINCT wm.user_id) AS total_members,
    COUNT(DISTINCT a.id) AS total_agents,
    COUNT(DISTINCT m.id) AS total_meetings,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') AS completed_meetings,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'in_progress') AS active_meetings,
    AVG(m.duration_minutes) FILTER (WHERE m.duration_minutes IS NOT NULL) AS avg_meeting_duration
FROM workspaces w
LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.is_active = true
LEFT JOIN ai_agents a ON a.workspace_id = w.id AND a.is_active = true
LEFT JOIN meetings m ON m.workspace_id = w.id
GROUP BY w.id, w.name, w.plan;

-- View: Agentes mais usados
CREATE OR REPLACE VIEW agent_usage_ranking AS
SELECT
    a.id AS agent_id,
    a.name,
    a.role,
    a.workspace_id,
    a.usage_count,
    a.average_rating,
    COUNT(DISTINCT ma.meeting_id) AS meetings_participated,
    MAX(ma.created_at) AS last_used_at
FROM ai_agents a
LEFT JOIN meeting_agents ma ON ma.agent_id = a.id
WHERE a.is_active = true
GROUP BY a.id, a.name, a.role, a.workspace_id, a.usage_count, a.average_rating
ORDER BY a.usage_count DESC;

-- View: Sessões com contagens
CREATE OR REPLACE VIEW meeting_details AS
SELECT
    m.*,
    COUNT(DISTINCT ma.agent_id) AS agent_count,
    COUNT(DISTINCT mp.id) AS participant_count,
    COUNT(DISTINCT t.id) AS transcript_count,
    COUNT(DISTINCT ai.id) AS action_item_count,
    u.name AS creator_name,
    u.avatar_url AS creator_avatar
FROM meetings m
LEFT JOIN meeting_agents ma ON ma.meeting_id = m.id
LEFT JOIN meeting_participants mp ON mp.meeting_id = m.id
LEFT JOIN transcripts t ON t.meeting_id = m.id
LEFT JOIN action_items ai ON ai.meeting_id = m.id
LEFT JOIN users u ON u.id = m.created_by
GROUP BY m.id, u.name, u.avatar_url;

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
