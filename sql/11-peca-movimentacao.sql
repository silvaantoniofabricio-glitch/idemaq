-- =========================================================================
-- IDEMAQ — sql/11 — `peca_movimentacao`
-- Histórico real de movimentações de estoque (substitui o mock movsMock()
-- do PecaDetalheModal).
--
-- O QUE GRAVA:
--   - tipo='ajuste_manual'   — toda chamada de usePecas.ajustarEstoque()
--   - tipo='baixa_os'        — toda baixa em usePecas.baixarItensDaOS()
--   - tipo='entrada_compra'  — futuro (entrada por nota fiscal / compra)
--   - tipo='devolucao'       — futuro (devolução de cliente sem ajuste manual)
--
-- POR QUE NÃO É TRIGGER: o INSERT acontece no front pra ter contexto rico
-- (os_id, motivo, observação digitada). Trigger BEFORE UPDATE em peca não
-- saberia o porquê da mudança. Se quiser blindar contra UPDATE direto no
-- banco no futuro, dá pra adicionar um trigger AFTER UPDATE como fallback.
--
-- IDEMPOTÊNCIA: a tabela só grava — quem garante "não duplicar" é o claim
-- atômico `os.itens_baixados=false → true` em baixarItensDaOS (sql/07).
--
-- AÇÃO PRA TONI: copiar este arquivo INTEIRO no Supabase SQL Editor e
-- rodar. Depois, no PecaDetalheModal, o histórico mock vira real
-- automaticamente. Sem essa execução, o front detecta o 42P01 e mostra
-- empty state suave.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. TABELA
-- =========================================================================

CREATE TABLE IF NOT EXISTS peca_movimentacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Peça afetada (NOT NULL — sempre tem uma peça)
  peca_id uuid NOT NULL REFERENCES peca(id),

  -- Tipo da movimentação (CHECK constraint pra evitar typo)
  tipo text NOT NULL CHECK (tipo IN (
    'baixa_os', 'ajuste_manual', 'entrada_compra', 'devolucao'
  )),

  -- Variação aplicada: positivo = entrada, negativo = saída.
  -- Convenção: delta = qtd_depois - qtd_antes (sempre).
  delta integer NOT NULL,
  qtd_antes integer NOT NULL CHECK (qtd_antes >= 0),
  qtd_depois integer NOT NULL CHECK (qtd_depois >= 0),

  -- Sub-motivo livre. Convenção pra tipo='ajuste_manual':
  --   'contagem' | 'perda' | 'ganho' | 'devolucao' | 'outro'
  -- Em outros tipos pode ficar NULL.
  motivo text,

  -- Observação livre digitada pelo usuário no modal de ajuste,
  -- ou descrição auto-gerada pelas baixas ("OS #1234").
  observacao text,

  -- Vínculo com OS (NOT NULL quando tipo='baixa_os', NULL nos outros)
  os_id uuid REFERENCES os(id),

  -- Auditoria padrão Idemaq
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

-- =========================================================================
-- 2. COMENTÁRIOS — auto-documentação no banco
-- =========================================================================

COMMENT ON TABLE peca_movimentacao IS
  'Histórico real de movimentações de estoque. Auditoria de toda mudança em peca.qtd_atual: ajuste manual, baixa por OS concluída, entrada por compra/NF, devolução. Gravado pelo front (usePecas.ajustarEstoque + baixarItensDaOS) — sem trigger pra preservar o contexto (os_id, motivo, observação). Substitui o mock movsMock() do PecaDetalheModal.';

COMMENT ON COLUMN peca_movimentacao.tipo IS
  'Categoria: baixa_os (saída ao concluir OS) | ajuste_manual (correção do dono) | entrada_compra (compra/NF) | devolucao (volta do cliente). Saídas têm delta negativo; entradas têm delta positivo.';

COMMENT ON COLUMN peca_movimentacao.motivo IS
  'Sub-motivo livre. Convenção pra ajuste_manual: contagem | perda | ganho | devolucao | outro. NULL nos outros tipos.';

COMMENT ON COLUMN peca_movimentacao.delta IS
  'Variação aplicada à qtd_atual. Positivo = entrada, negativo = saída. Sempre = qtd_depois - qtd_antes.';

COMMENT ON COLUMN peca_movimentacao.os_id IS
  'Vínculo com a OS. Obrigatório quando tipo=baixa_os; NULL nos outros tipos. Permite reconstruir "quais peças saíram pra qual OS" sem precisar relinkar.';

-- =========================================================================
-- 3. ÍNDICES — histórico por peça é a query mais comum
-- =========================================================================

-- Lookup do histórico no PecaDetalheModal: WHERE peca_id = X ORDER BY criado_em DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_peca_mov_peca_data
  ON peca_movimentacao (peca_id, criado_em DESC)
  WHERE deleted_at IS NULL;

-- Filtros por tipo (relatório de baixas, relatório de ajustes…)
CREATE INDEX IF NOT EXISTS idx_peca_mov_tipo
  ON peca_movimentacao (tipo)
  WHERE deleted_at IS NULL;

-- "Quais peças saíram desta OS?" (parcial — só linhas com os_id)
CREATE INDEX IF NOT EXISTS idx_peca_mov_os
  ON peca_movimentacao (os_id)
  WHERE os_id IS NOT NULL AND deleted_at IS NULL;

-- =========================================================================
-- 4. TRIGGER de auditoria (padrão Idemaq)
-- =========================================================================
-- Reusa tg_set_audit() pra preencher criado_por / atualizado_em /
-- atualizado_por automaticamente.

DROP TRIGGER IF EXISTS tg_peca_mov_audit ON peca_movimentacao;
CREATE TRIGGER tg_peca_mov_audit
  BEFORE INSERT OR UPDATE ON peca_movimentacao
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 5. RLS
-- =========================================================================
-- SELECT pra qualquer authenticated (funcionário vê histórico da peça no
-- PecaDetalheModal — sem custos, igual ao resto do estoque).
-- INSERT/UPDATE/DELETE só pro dono — não funcionário, mesmo que o claim
-- da OS rode no front: o concluir-OS-com-baixa só é exposto pro dono
-- (CLAUDE.md §10), então o auth.uid() sempre é dono nessa rota.
-- Quando entrar Painel Funcionário com baixa-de-estoque-por-funcionário,
-- relaxar esta policy.

ALTER TABLE peca_movimentacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS peca_mov_select_auth   ON peca_movimentacao;
DROP POLICY IF EXISTS peca_mov_insert_dono   ON peca_movimentacao;
DROP POLICY IF EXISTS peca_mov_update_dono   ON peca_movimentacao;
DROP POLICY IF EXISTS peca_mov_delete_dono   ON peca_movimentacao;

CREATE POLICY peca_mov_select_auth ON peca_movimentacao
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY peca_mov_insert_dono ON peca_movimentacao
  FOR INSERT
  WITH CHECK (is_dono());

CREATE POLICY peca_mov_update_dono ON peca_movimentacao
  FOR UPDATE
  USING (is_dono())
  WITH CHECK (is_dono());

CREATE POLICY peca_mov_delete_dono ON peca_movimentacao
  FOR DELETE
  USING (is_dono());

COMMIT;

-- =========================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO (rodar em query separada):
--   SELECT to_regclass('public.peca_movimentacao');   -- esperado: peca_movimentacao
--   SELECT count(*) FROM peca_movimentacao;            -- esperado: 0 (tabela vazia)
--   \d peca_movimentacao                                -- (no psql) confere schema
-- =========================================================================
