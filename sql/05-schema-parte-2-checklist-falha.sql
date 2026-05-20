-- =========================================================================
-- IDEMAQ — Schema Parte 2 — Tabelas `checklist_etapa` e `falha_teste`
-- Data: 19/05/2026
-- Aplicar via Supabase SQL Editor
--
-- ESCOPO:
--   1. checklist_etapa  — checklist dinâmico por etapa da OS (limpeza,
--                         manutenção, desmontagem, teste final, etc).
--                         Substitui/complementa os jsonb hoje em `os.*`
--                         (`os.oficina_execucao`, `os.limpeza`, `os.manutencao`).
--   2. falha_teste      — falhas registradas no Teste Final (sujeira/defeito).
--                         Hoje vivem em `os.teste_falhas` (jsonb solto). Esta
--                         tabela dá histórico, resolução individual e relatório.
--
-- NÃO INCLUÍDO AQUI (já existe em outro arquivo):
--   - lancamento_financeiro  → ver `sql/01-lancamento-financeiro.sql`
--     (já contempla tipo/categoria/status como ENUMs, conta_bancaria e
--      categoria_financeira como tabelas separadas, parcelamento e recorrência.
--      Schema mais rico que a especificação resumida.)
--
-- DEPENDÊNCIAS (devem existir antes de rodar):
--   - tabela `os` (com coluna `id uuid PK`)
--   - tabela `usuarios` (com coluna `id uuid PK`)
--   - enum  `os_etapa`
--   - function `tg_set_audit()`   — preenche criado_em/por + atualizado_em/por
--   - function `is_dono()`        — retorna true se auth.uid() é o dono
--   - function `papel_atual()`    — retorna 'dono'|'logistica'|'oficina'
--
-- Se alguma dependência faltar, comentar a seção correspondente e recriar
-- depois (RLS é a única parte que depende das helper functions).
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. ENUM `falha_teste_tipo`
-- =========================================================================

DO $$ BEGIN
  CREATE TYPE falha_teste_tipo AS ENUM ('sujeira', 'defeito', 'ambos');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- 2. TABELA `checklist_etapa`
-- =========================================================================
-- Armazena o checklist preenchido em cada etapa da OS.
-- `itens` é um array jsonb no formato:
--   [
--     { "id": "tampa",      "label": "Tampa",       "checked": true  },
--     { "id": "tambor",     "label": "Tambor",      "checked": false },
--     { "id": "motor",      "label": "Motor",       "checked": true  }
--   ]
-- O front decide quais itens existem por etapa (ex: AcaoOficina monta a
-- lista a partir do diagnóstico). O banco só guarda o resultado.
--
-- UNIQUE(os_id, etapa) → uma OS tem no máximo UM checklist por etapa.
-- (Para "oficina" que tem dual flow limpeza/manutenção, agrupar os itens
--  do dois lados no mesmo array com prefixo no id: "lim_*" / "man_*".)
-- =========================================================================

CREATE TABLE IF NOT EXISTS checklist_etapa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  os_id uuid NOT NULL REFERENCES os(id) ON DELETE CASCADE,
  etapa os_etapa NOT NULL,

  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,

  -- Auditoria padrão Idemaq (preenchida via tg_set_audit)
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

-- Um checklist por etapa por OS (entre os registros ativos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_etapa_os_etapa_uniq
  ON checklist_etapa(os_id, etapa)
  WHERE deleted_at IS NULL;

-- Buscas frequentes: por OS (carregar todos os checklists no detalhe)
CREATE INDEX IF NOT EXISTS idx_checklist_etapa_os
  ON checklist_etapa(os_id)
  WHERE deleted_at IS NULL;

-- Buscas frequentes: por etapa (relatórios "quantas OS na limpeza com X aberto")
CREATE INDEX IF NOT EXISTS idx_checklist_etapa_etapa
  ON checklist_etapa(etapa)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE checklist_etapa IS
  'Checklist preenchido em cada etapa da OS (limpeza, manutenção, teste, etc). itens=jsonb array de {id,label,checked}.';

-- =========================================================================
-- 3. TABELA `falha_teste`
-- =========================================================================
-- Falhas detectadas no Teste Final (4 testes × OK/Defeito/Barulho).
-- Quando o técnico marca um teste como "Defeito" ou "Barulho", uma linha
-- é criada aqui. Depois que a falha é corrigida na oficina (ou ignorada),
-- marca `resolvida = true` em vez de deletar (histórico para relatório).
-- =========================================================================

CREATE TABLE IF NOT EXISTS falha_teste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  os_id uuid NOT NULL REFERENCES os(id) ON DELETE CASCADE,
  tipo falha_teste_tipo NOT NULL,
  descricao text NOT NULL,

  resolvida boolean NOT NULL DEFAULT false,
  resolvida_em timestamptz,
  resolvida_por uuid REFERENCES usuarios(id),

  -- Auditoria padrão Idemaq
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

-- Carregar falhas de uma OS específica (banner vermelho no AcaoOficina)
CREATE INDEX IF NOT EXISTS idx_falha_teste_os
  ON falha_teste(os_id)
  WHERE deleted_at IS NULL;

-- Listar todas as falhas em aberto (relatório operacional)
CREATE INDEX IF NOT EXISTS idx_falha_teste_abertas
  ON falha_teste(os_id, criado_em)
  WHERE deleted_at IS NULL AND resolvida = false;

-- Coerência: se resolvida=true, resolvida_em deve estar preenchido
ALTER TABLE falha_teste
  ADD CONSTRAINT ck_falha_resolvida_data
  CHECK ((resolvida = false) OR (resolvida = true AND resolvida_em IS NOT NULL));

COMMENT ON TABLE falha_teste IS
  'Falhas detectadas no Teste Final da OS. Histórico individualizado (não jsonb), permite marcar resolvida por linha.';

-- =========================================================================
-- 4. TRIGGERS de auditoria
-- =========================================================================

DROP TRIGGER IF EXISTS tg_checklist_etapa_audit ON checklist_etapa;
CREATE TRIGGER tg_checklist_etapa_audit
  BEFORE INSERT OR UPDATE ON checklist_etapa
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

DROP TRIGGER IF EXISTS tg_falha_teste_audit ON falha_teste;
CREATE TRIGGER tg_falha_teste_audit
  BEFORE INSERT OR UPDATE ON falha_teste
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 5. RLS — Row Level Security
-- =========================================================================
-- Política conforme spec: "dono vê tudo, logistica/oficina só leem".
--
-- ATENÇÃO: essa política impede técnico (Guilherme/oficina) de marcar itens
-- do checklist ou registrar falha no teste pelo app — só o dono escreve.
-- Se na prática o técnico precisar escrever (mais provável), trocar as
-- policies "_select_funcionario" pelas alternativas comentadas no fim
-- desta seção (libera INSERT/UPDATE pra logistica+oficina, mantém DELETE
-- só pro dono).
-- =========================================================================

ALTER TABLE checklist_etapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE falha_teste     ENABLE ROW LEVEL SECURITY;

-- --- checklist_etapa --------------------------------------------------------

-- Dono: tudo
CREATE POLICY checklist_dono_all ON checklist_etapa
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

-- Logística + oficina: só SELECT (e só linhas não deletadas)
CREATE POLICY checklist_select_funcionario ON checklist_etapa
  FOR SELECT USING (
    papel_atual() IN ('logistica', 'oficina')
    AND deleted_at IS NULL
  );

-- --- falha_teste -----------------------------------------------------------

-- Dono: tudo
CREATE POLICY falha_dono_all ON falha_teste
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

-- Logística + oficina: só SELECT
CREATE POLICY falha_select_funcionario ON falha_teste
  FOR SELECT USING (
    papel_atual() IN ('logistica', 'oficina')
    AND deleted_at IS NULL
  );

-- --- ALTERNATIVA (libera escrita pra funcionário) --------------------------
--
-- CREATE POLICY checklist_write_funcionario ON checklist_etapa
--   FOR INSERT WITH CHECK (papel_atual() IN ('logistica','oficina'));
-- CREATE POLICY checklist_update_funcionario ON checklist_etapa
--   FOR UPDATE USING (papel_atual() IN ('logistica','oficina') AND deleted_at IS NULL)
--           WITH CHECK (papel_atual() IN ('logistica','oficina'));
--
-- CREATE POLICY falha_write_funcionario ON falha_teste
--   FOR INSERT WITH CHECK (papel_atual() IN ('logistica','oficina'));
-- CREATE POLICY falha_update_funcionario ON falha_teste
--   FOR UPDATE USING (papel_atual() IN ('logistica','oficina') AND deleted_at IS NULL)
--           WITH CHECK (papel_atual() IN ('logistica','oficina'));
--
-- (DELETE continua restrito ao dono pelo policy `*_dono_all`.)

COMMIT;

-- =========================================================================
-- VERIFICAÇÃO RÁPIDA (rodar separado pra conferir):
--
--   SELECT table_name, column_name, data_type
--     FROM information_schema.columns
--    WHERE table_name IN ('checklist_etapa','falha_teste')
--    ORDER BY table_name, ordinal_position;
--
--   SELECT tablename, policyname, cmd, roles
--     FROM pg_policies
--    WHERE tablename IN ('checklist_etapa','falha_teste');
--
-- =========================================================================
