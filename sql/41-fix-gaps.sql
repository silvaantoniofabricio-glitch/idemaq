-- sql/41-fix-gaps.sql
-- Aplica fixes automáticos pros 2 gaps pequenos:
-- A) 21 OS sem cliente (não-fabricação) → atribui ao "Consumidor Final"
-- B) 30 OS sem valor_total → marca [REVISAR-VALOR] em observacoes
--
-- Idempotente: WHERE garante não rodar 2x na mesma linha.

-- ────────── A: Cria "Consumidor Final" se não existir ──────────
INSERT INTO cliente (nome, telefone, observacoes)
SELECT 'Consumidor Final', '', '[SISTEMA] cliente catch-all pra OS sem identificação'
WHERE NOT EXISTS (
  SELECT 1 FROM cliente WHERE nome = 'Consumidor Final' AND deleted_at IS NULL
);

-- ────────── A.2: Atribui OS sem cliente ao Consumidor Final ──────────
UPDATE os
SET cliente_id = (SELECT id FROM cliente WHERE nome = 'Consumidor Final' AND deleted_at IS NULL LIMIT 1)
WHERE cliente_id IS NULL
  AND tipo != 'fabricacao'
  AND deleted_at IS NULL;

-- ────────── B: Marca OS sem valor ──────────
UPDATE os
SET observacoes = COALESCE(observacoes, '') || E'\n[REVISAR-VALOR]'
WHERE (valor_total IS NULL OR valor_total = 0)
  AND deleted_at IS NULL
  AND (observacoes IS NULL OR observacoes NOT ILIKE '%[REVISAR-VALOR]%');

-- ────────── Verificação ──────────
SELECT
  (SELECT COUNT(*) FROM os WHERE cliente_id = (SELECT id FROM cliente WHERE nome='Consumidor Final') AND deleted_at IS NULL) AS os_atribuidas_consumidor_final,
  (SELECT COUNT(*) FROM os WHERE cliente_id IS NULL AND tipo != 'fabricacao' AND deleted_at IS NULL) AS os_sem_cliente_restantes,
  (SELECT COUNT(*) FROM os WHERE observacoes ILIKE '%[REVISAR-VALOR]%' AND deleted_at IS NULL) AS os_marcadas_revisar_valor,
  (SELECT COUNT(*) FROM os WHERE (valor_total IS NULL OR valor_total = 0) AND deleted_at IS NULL) AS os_sem_valor_restantes;
