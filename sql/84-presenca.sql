-- =========================================================================
-- IDEMAQ — Presença (online/offline ao vivo dos usuários)
-- Data: 19/06/2026
-- Status: VERSIONADO — copiar INTEIRO no Supabase SQL Editor e rodar.
--
-- O QUE É:
--   "Está ativo no sistema agora?" — diferente do Ponto (hora de trabalho).
--   Cada usuário logado bate um heartbeat (last_seen) a cada ~30s enquanto usa
--   o app. Online = last_seen recente (< ~75s). `online_desde` marca o início
--   da sessão online atual (pra mostrar "online há X"). Quando fica offline,
--   o `last_seen` (que para de atualizar) dá o "offline há X".
--
-- DEPENDÊNCIAS: tabela `usuarios` (id uuid PK = auth.uid()).
-- Idempotente. Realtime habilitado no fim.
-- =========================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS presenca (
  funcionario_id uuid PRIMARY KEY REFERENCES usuarios(id),
  online_desde   timestamptz NOT NULL DEFAULT now(),  -- início da sessão online
  last_seen      timestamptz NOT NULL DEFAULT now(),  -- último heartbeat
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- RLS — todo mundo logado LÊ (pra ver quem está online); cada um só escreve a
-- própria linha.
-- =========================================================================
ALTER TABLE presenca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presenca_read_all ON presenca;
CREATE POLICY presenca_read_all ON presenca
  FOR SELECT USING (true);

DROP POLICY IF EXISTS presenca_insert_self ON presenca;
CREATE POLICY presenca_insert_self ON presenca
  FOR INSERT WITH CHECK (funcionario_id = auth.uid());

DROP POLICY IF EXISTS presenca_update_self ON presenca;
CREATE POLICY presenca_update_self ON presenca
  FOR UPDATE USING (funcionario_id = auth.uid()) WITH CHECK (funcionario_id = auth.uid());

-- =========================================================================
-- REALTIME — pro Roteiro ver o online/offline mudar ao vivo.
-- =========================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE presenca;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- VERIFICAÇÃO:
--   SELECT funcionario_id, last_seen, online_desde FROM presenca;
