-- ============================================================================
-- 149 — Máquina automática ao concluir OS de Fabricação
-- Adiciona:
--   os.maquina_criada   boolean NOT NULL DEFAULT false  (idempotencia)
--
-- Comportamento esperado no front:
--   - useMaquinas.criarMaquinaAoConcluirFabricacao(osId) tenta
--     `UPDATE os SET maquina_criada=true WHERE id=$1 AND maquina_criada=false`
--     — se ninguém casa, outro side já criou (idempotente). Se casa e a OS é
--     tipo='fabricacao', insere 1 linha em `maquina` com marca/modelo do
--     equipamento, estado='disponivel', custo_compra=os.valor_total,
--     custo_itens=soma das peças usadas (os_item.categoria='peca').
-- ============================================================================

BEGIN;

ALTER TABLE os
  ADD COLUMN IF NOT EXISTS maquina_criada boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN os.maquina_criada IS
  'Flag de idempotencia: true se essa OS de Fabricação já gerou seu registro em `maquina` ao chegar em concluido. Setada via UPDATE atomico WHERE maquina_criada=false.';

COMMIT;
