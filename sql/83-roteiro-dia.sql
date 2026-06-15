-- =========================================================================
-- IDEMAQ — Roteiro do Dia (agenda diária por funcionário)
-- Data: 15/06/2026
-- Status: VERSIONADO — copiar INTEIRO no Supabase SQL Editor e rodar.
--
-- O QUE É:
--   Evolução da "Notas do Dia" (que era 1 nota de texto compartilhada em
--   `configuracoes`). Agora cada item é uma linha estruturada, com DONO
--   (responsavel_id), ordem, check (feito), prioridade e vínculo opcional a
--   uma OS real. O dono (Toni) monta a agenda de cada funcionário; o
--   funcionário abre o "Meu Dia" e vai marcando os checks.
--
-- DEPENDÊNCIAS (já existem no schema base):
--   - tabela `usuarios` (id uuid PK) e `os` (id uuid PK)
--   - function `tg_set_audit()`  — preenche criado/atualizado_em/por
--   - function `is_dono()`        — RLS
--   Se faltar alguma, comentar a seção de RLS e recriar depois.
--
-- Idempotente: pode rodar de novo (IF NOT EXISTS + DROP POLICY antes).
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. TABELA `roteiro_item`
-- =========================================================================
-- 1 linha = 1 tarefa do dia de UM funcionário. `dia` é a data local
-- (America/Cuiaba) gravada pelo front como 'YYYY-MM-DD'.

CREATE TABLE IF NOT EXISTS roteiro_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  dia date NOT NULL,
  responsavel_id uuid NOT NULL REFERENCES usuarios(id),

  ordem integer NOT NULL DEFAULT 0,     -- ordem manual dentro da coluna do dia
  texto text NOT NULL DEFAULT '',

  os_id uuid REFERENCES os(id),         -- vínculo opcional com uma OS real
  urgente boolean NOT NULL DEFAULT false,

  feito boolean NOT NULL DEFAULT false,
  feito_em timestamptz,                 -- quando o funcionário marcou

  -- Auditoria padrão Idemaq (trigger preenche)
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_roteiro_dia_responsavel
  ON roteiro_item(dia, responsavel_id, ordem) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_roteiro_os
  ON roteiro_item(os_id) WHERE deleted_at IS NULL;

-- =========================================================================
-- 2. TRIGGER de auditoria (padrão Idemaq)
-- =========================================================================

DROP TRIGGER IF EXISTS tg_roteiro_item_audit ON roteiro_item;
CREATE TRIGGER tg_roteiro_item_audit
  BEFORE INSERT OR UPDATE ON roteiro_item
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 3. RLS — funcionário vê/edita o PRÓPRIO roteiro · dono vê/edita tudo
-- =========================================================================

ALTER TABLE roteiro_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roteiro_select ON roteiro_item;
CREATE POLICY roteiro_select ON roteiro_item
  FOR SELECT USING (
    deleted_at IS NULL AND (is_dono() OR responsavel_id = auth.uid())
  );

-- Insert: dono pra qualquer um; funcionário só pra si mesmo.
DROP POLICY IF EXISTS roteiro_insert ON roteiro_item;
CREATE POLICY roteiro_insert ON roteiro_item
  FOR INSERT WITH CHECK (
    is_dono() OR responsavel_id = auth.uid()
  );

-- Update: dono tudo; funcionário só o próprio (pra marcar/desmarcar check).
DROP POLICY IF EXISTS roteiro_update ON roteiro_item;
CREATE POLICY roteiro_update ON roteiro_item
  FOR UPDATE USING (
    is_dono() OR responsavel_id = auth.uid()
  ) WITH CHECK (
    is_dono() OR responsavel_id = auth.uid()
  );

-- Delete físico: só dono (funcionário usa soft-delete via update, se algum dia).
DROP POLICY IF EXISTS roteiro_delete ON roteiro_item;
CREATE POLICY roteiro_delete ON roteiro_item
  FOR DELETE USING (is_dono());

-- =========================================================================
-- 4. REALTIME — habilita a tabela na publication (pro "ao vivo" funcionar)
-- =========================================================================
-- Sem isso o canal supabase.channel(...).on('postgres_changes', ...) não
-- recebe eventos desta tabela. Guarda contra erro se já estiver na publication.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE roteiro_item;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- =========================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO:
--   SELECT * FROM roteiro_item LIMIT 1;                     -- tabela existe
--   SELECT tablename FROM pg_publication_tables
--     WHERE pubname='supabase_realtime' AND tablename='roteiro_item';  -- realtime ON
-- =========================================================================
