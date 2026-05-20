-- ============================================================================
-- 07 — Baixa automatica de estoque ao concluir OS
-- Adiciona:
--   os.itens_baixados   boolean NOT NULL DEFAULT false  (idempotencia)
--   os_item.peca_id     uuid    REFERENCES peca(id)     (FK opcional)
--
-- Comportamento esperado no front:
--   - usePecas.baixarItensDaOS(osId) tenta `UPDATE os SET itens_baixados=true
--     WHERE id=$1 AND itens_baixados=false` — se ninguem casa, outro side ja
--     baixou (idempotente). Se casa, varre os_item com peca_id NOT NULL,
--     tipo='peca' e debita peca.qtd_atual.
--   - Itens com peca_id NULL ("item avulso", texto livre) sao ignorados.
-- ============================================================================

BEGIN;

-- 1) Flag de idempotencia da baixa
ALTER TABLE os
  ADD COLUMN IF NOT EXISTS itens_baixados boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN os.itens_baixados IS
  'Flag de idempotencia: true se a OS ja decrementou seu estoque ao chegar em concluido. Setada pelo usePecas.baixarItensDaOS via UPDATE atomico WHERE itens_baixados=false.';

-- 2) FK opcional pra peca do catalogo
ALTER TABLE os_item
  ADD COLUMN IF NOT EXISTS peca_id uuid REFERENCES peca(id);

COMMENT ON COLUMN os_item.peca_id IS
  'FK opcional pra peca do catalogo. NULL = item avulso (texto livre criado no orcamento), nao mexe no estoque. Preenchido quando o usuario seleciona uma peca do catalogo no orcamento.';

CREATE INDEX IF NOT EXISTS os_item_peca_id_idx
  ON os_item (peca_id)
  WHERE deleted_at IS NULL;

COMMIT;
