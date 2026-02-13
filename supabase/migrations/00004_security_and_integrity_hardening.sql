-- Fortalecimento de schema: restrições CHECK e integridade
-- FKs para agent_memories e transcripts já existem em 00001.
-- RLS: já habilitado em 00001; app usa JWT no Express (não Supabase auth).

-- Senha deve ser hash bcrypt quando presente (permite NULL para OAuth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_password_is_hash'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT check_password_is_hash
      CHECK (encrypted_password IS NULL OR encrypted_password ~ '^\$2[aby]\$');
  END IF;
EXCEPTION
  WHEN check_violation THEN NULL; -- ignora se dados existentes violarem
END $$;

-- Assertividade em personality_traits (JSON) entre 0 e 10 quando presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_assertiveness_range'
  ) THEN
    ALTER TABLE ai_agents ADD CONSTRAINT check_assertiveness_range
      CHECK (
        (personality_traits->>'assertiveness') IS NULL
        OR ((personality_traits->>'assertiveness')::numeric BETWEEN 0 AND 10)
      );
  END IF;
EXCEPTION
  WHEN check_violation THEN NULL;
END $$;
