-- ============================================================
-- 43 — Reorganização de categorias do estoque (24/05/2026)
-- ============================================================
-- Instruções:
--   1. Copiar e rodar no Supabase SQL Editor (em partes se quiser ver o impacto)
--   2. Verificar os SELECTs de contagem no fim antes de confirmar
-- ============================================================

-- ── PRÉVIA: quantos itens serão afetados por bloco ─────────
SELECT
  'Mover → outros'   AS acao, count(*) AS itens FROM peca
  WHERE deleted_at IS NULL AND categoria IN ('banda_freio','chave_seletora','chicote','espalhador','filtro','interruptor','microchave')
UNION ALL
SELECT 'Renomear → dobradicas', count(*) FROM peca
  WHERE deleted_at IS NULL AND categoria = 'molas_dobradicas'
UNION ALL
SELECT 'Excluir (motor_ventilador)', count(*) FROM peca
  WHERE deleted_at IS NULL AND lower(replace(categoria,' ','_')) LIKE '%motor_ventilador%'
UNION ALL
SELECT 'Mover painel_decorativo → painel', count(*) FROM peca
  WHERE deleted_at IS NULL AND categoria = 'painel_decorativo'
UNION ALL
SELECT 'Excluir (recipiente)', count(*) FROM peca
  WHERE deleted_at IS NULL AND categoria = 'recipiente'
UNION ALL
SELECT 'Excluir (rele)', count(*) FROM peca
  WHERE deleted_at IS NULL AND categoria IN ('rele','relé');

-- ── 1. Mover itens das categorias excluídas para 'outros' ──
UPDATE peca
SET categoria = 'outros'
WHERE deleted_at IS NULL
  AND categoria IN (
    'banda_freio',    -- Banda de freio
    'chave_seletora', -- Chaves seletoras
    'chicote',        -- Chicotes
    'espalhador',     -- Espalhador
    'filtro',         -- Filtro de fiapos / Filtro pluma
    'interruptor',    -- Interruptores
    'microchave'      -- Micro chave
  );

-- ── 2. Molas e dobradiças → renomear para 'dobradicas' ─────
UPDATE peca
SET categoria = 'dobradicas'
WHERE deleted_at IS NULL AND categoria = 'molas_dobradicas';

-- ── 3. Motor ventilador → excluir todos os itens ───────────
-- Soft-delete (deleted_at). Tenta variações de capitalização / espaço.
UPDATE peca
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND lower(replace(categoria, ' ', '_')) LIKE '%motor_ventilador%';

-- ── 4. Paineis decorativos → mover para 'painel' ───────────
UPDATE peca
SET categoria = 'painel'
WHERE deleted_at IS NULL AND categoria = 'painel_decorativo';

-- ── 5. Recipiente → excluir todos os itens ─────────────────
UPDATE peca
SET deleted_at = now()
WHERE deleted_at IS NULL AND categoria = 'recipiente';

-- ── 6. Relé → excluir todos os itens ───────────────────────
UPDATE peca
SET deleted_at = now()
WHERE deleted_at IS NULL AND categoria IN ('rele', 'relé', 'Relé');

-- ── VERIFICAÇÃO FINAL: categorias ativas após a reorganização ──
SELECT categoria, count(*) AS total
FROM peca
WHERE deleted_at IS NULL
GROUP BY categoria
ORDER BY categoria;
