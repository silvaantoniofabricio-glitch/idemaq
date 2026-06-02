-- Flag pra ocultar OS do Kanban sem afetar Vendas/Relatorios.
-- Usado quando a OS ja foi resolvida por fora ou e' caso especial que nao deve
-- aparecer no quadro mas precisa continuar contabilizada.

ALTER TABLE os
  ADD COLUMN IF NOT EXISTS oculta_no_kanban boolean NOT NULL DEFAULT false;

-- Index parcial: a maioria sera false, so vale indexar quem esta oculta
CREATE INDEX IF NOT EXISTS idx_os_oculta_no_kanban
  ON os (oculta_no_kanban) WHERE oculta_no_kanban = true;
