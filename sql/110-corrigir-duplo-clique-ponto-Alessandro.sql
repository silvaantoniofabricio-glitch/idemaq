-- sql/110-corrigir-duplo-clique-ponto-Alessandro.sql
-- Alessandro clicou 2x no botão entrada em 02/07/2026 às 07:55.
-- Resultado: entrada 07:55 + saida 07:55 (errado). Ele saiu às 11:00.
-- Correção: soft-delete na saida falsa + insert saida real às 11:00.
--
-- ANTES DE RODAR: verificar os registros afetados com a SELECT abaixo.

-- ─── 1. DIAGNÓSTICO (olhar antes de alterar) ──────────────────────────
SELECT
  pr.id,
  pr.tipo,
  pr.bateu_em AT TIME ZONE 'America/Campo_Grande' AS bateu_local,
  pr.deleted_at
FROM ponto_registro pr
JOIN usuarios u ON u.id = pr.funcionario_id
WHERE u.papel = 'logistica'
  AND pr.bateu_em >= '2026-07-02T00:00:00-04:00'
  AND pr.bateu_em <  '2026-07-03T00:00:00-04:00'
ORDER BY pr.bateu_em;

-- ─── 2. SOFT-DELETE da batida errada (saida/saida_almoco às 07:55) ─────
-- Ajuste o WHERE se o tipo for 'saida_almoco' em vez de 'saida'.
UPDATE ponto_registro pr
SET deleted_at = now()
FROM usuarios u
WHERE u.id = pr.funcionario_id
  AND u.papel = 'logistica'
  AND pr.tipo IN ('saida', 'saida_almoco')
  AND (pr.bateu_em AT TIME ZONE 'America/Campo_Grande')::time
        BETWEEN '07:50' AND '08:05'
  AND pr.bateu_em >= '2026-07-02T00:00:00-04:00'
  AND pr.bateu_em <  '2026-07-03T00:00:00-04:00'
  AND pr.deleted_at IS NULL;

-- ─── 3. INSERT saída real às 11:00 ────────────────────────────────────
INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
SELECT
  u.id,
  'saida',
  '2026-07-02T11:00:00-04:00'
FROM usuarios u
WHERE u.papel = 'logistica';

-- ─── 4. CONFERÊNCIA FINAL ─────────────────────────────────────────────
SELECT
  pr.id,
  pr.tipo,
  pr.bateu_em AT TIME ZONE 'America/Campo_Grande' AS bateu_local,
  pr.deleted_at
FROM ponto_registro pr
JOIN usuarios u ON u.id = pr.funcionario_id
WHERE u.papel = 'logistica'
  AND pr.bateu_em >= '2026-07-02T00:00:00-04:00'
  AND pr.bateu_em <  '2026-07-03T00:00:00-04:00'
ORDER BY pr.bateu_em;
