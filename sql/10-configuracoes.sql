-- =========================================================================
-- IDEMAQ — Schema Parte 2 — `configuracoes` (Módulo 09)
-- Criado 20/05/2026
--
-- Tabela chave/valor pra configurações editáveis pelo dono. Valor em JSONB
-- pra suportar qualquer tipo (número, texto, lista, objeto). Cada chave
-- representa uma config independente — sem schema rígido por entrada.
--
-- Chaves seed iniciais:
--   meta_mensal             : numérico (R$/mês — usado no Painel/Hero)
--   jornada_padrao_horas    : numérico (h/dia — base do Ponto futuro)
--
-- AÇÃO PRA TONI: copiar este arquivo INTEIRO no Supabase SQL Editor e rodar.
-- Idempotente: pode rodar de novo sem problema (DROP IF EXISTS + recriar).
-- =========================================================================

BEGIN;

-- =========================================================================
-- 0. LIMPEZA (idempotência — caso já tenha rodado uma versão antiga)
-- =========================================================================

DROP TABLE IF EXISTS configuracoes CASCADE;

-- =========================================================================
-- 1. TABELA `configuracoes`
-- =========================================================================

CREATE TABLE configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  chave text NOT NULL UNIQUE,            -- 'meta_mensal', 'jornada_padrao_horas', etc
  valor jsonb NOT NULL,                  -- valor tipado livre (number, string, array, object)
  descricao text,                        -- legenda exibida na UI

  -- Auditoria padrão Idemaq (trigger preenche)
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

CREATE INDEX idx_configuracoes_chave ON configuracoes(chave) WHERE deleted_at IS NULL;

-- =========================================================================
-- 2. TRIGGER de auditoria (padrão Idemaq)
-- =========================================================================

CREATE TRIGGER tg_configuracoes_audit
  BEFORE INSERT OR UPDATE ON configuracoes
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 3. RLS — leitura aberta · escrita só dono
-- =========================================================================
-- Leitura aberta porque chaves como `jornada_padrao_horas` são consultadas
-- pelo módulo Ponto a partir de qualquer usuário logado. Edição só dono.

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY configuracoes_read_all ON configuracoes
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY configuracoes_write_dono ON configuracoes
  FOR INSERT WITH CHECK (is_dono());

CREATE POLICY configuracoes_update_dono ON configuracoes
  FOR UPDATE USING (is_dono()) WITH CHECK (is_dono());

CREATE POLICY configuracoes_delete_dono ON configuracoes
  FOR DELETE USING (is_dono());

-- =========================================================================
-- 4. SEED inicial
-- =========================================================================

INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('meta_mensal',          to_jsonb(20000),  'Meta mensal de faturamento (R$). Usada no Painel pra calcular progresso e meta diária restante.'),
  ('jornada_padrao_horas', to_jsonb(8),      'Jornada padrão de trabalho por dia (em horas). Base do módulo Ponto.')
ON CONFLICT (chave) DO NOTHING;

COMMIT;

-- =========================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO:
--   SELECT chave, valor FROM configuracoes ORDER BY chave;
--   -- esperado 2 linhas: jornada_padrao_horas=8 · meta_mensal=20000
-- =========================================================================

-- =========================================================================
-- NOTAS:
-- 1. `valor` em JSONB permite evoluir sem ALTER TABLE. Pra ler número no
--    front: Number(valor). Pra ler array/objeto: já vem desserializado pelo
--    PostgREST.
-- 2. Pra adicionar nova chave em runtime: UPSERT (chave, valor, descricao).
--    Hook `useConfiguracoes` faz isso via `set(chave, valor)`.
-- 3. Funções esperadas no banco (vindas do schema base):
--      - tg_set_audit()  — trigger comum
--      - is_dono()       — usada nas RLS
--    Se a RLS quebrar por falta de is_dono(), comentar as POLICIES.
-- =========================================================================
