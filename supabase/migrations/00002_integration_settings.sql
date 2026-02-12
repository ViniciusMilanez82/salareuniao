-- Integrações (API Keys) para LLM, TTS, Web Search
-- workspace_id NULL = configuração global da plataforma

CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'elevenlabs', 'serper')),
  api_key_encrypted TEXT,
  api_key_prefix VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);

CREATE INDEX idx_integration_settings_workspace ON integration_settings(workspace_id);
CREATE INDEX idx_integration_settings_provider ON integration_settings(provider);
