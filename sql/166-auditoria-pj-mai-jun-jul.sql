-- ============================================================
-- AUDITORIA PJ — Maio, Junho, Julho 2026 (SOMENTE LEITURA)
-- Nenhum INSERT/UPDATE/DELETE. Roda tudo e manda os resultados.
-- ============================================================

-- ── A) DUPLICATAS: mesmo valor + mesma data, descricoes diferentes ──
-- (pega o caso "lancei de novo com outro prefixo", que ja aconteceu 2x)
SELECT 'A) possivel duplicata' AS check, valor, vencimento,
       COUNT(*) AS qtd, string_agg(descricao, ' || ' ORDER BY descricao) AS descricoes
FROM lancamento_financeiro
WHERE tipo='despesa' AND deleted_at IS NULL
  AND vencimento >= '2026-05-01' AND vencimento < '2026-08-01'
GROUP BY valor, vencimento
HAVING COUNT(*) > 1
ORDER BY valor DESC;

-- ── B) DUPLICATAS: mesma descricao repetida ──
SELECT 'B) descricao repetida' AS check, descricao, valor, COUNT(*) AS qtd
FROM lancamento_financeiro
WHERE tipo='despesa' AND deleted_at IS NULL
  AND vencimento >= '2026-05-01' AND vencimento < '2026-08-01'
GROUP BY descricao, valor
HAVING COUNT(*) > 1
ORDER BY qtd DESC;

-- ── C) PENDENTES (nao pagos) nos 3 meses ──
SELECT 'C) sem baixa' AS check, descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE tipo='despesa' AND deleted_at IS NULL AND pago_em IS NULL
  AND vencimento >= '2026-05-01' AND vencimento < '2026-08-01'
ORDER BY vencimento;

-- ── D) SEM CONTA BANCARIA ──
SELECT 'D) sem conta' AS check, descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE tipo='despesa' AND deleted_at IS NULL AND conta_id IS NULL
  AND vencimento >= '2026-05-01' AND vencimento < '2026-08-01'
ORDER BY vencimento;

-- ── E) CATEGORIAS VARIANTES (mesmo conceito, nomes diferentes) ──
SELECT 'E) categorias' AS check, categoria, COUNT(*) AS qtd, SUM(valor) AS total,
       MIN(vencimento) AS primeiro_uso, MAX(vencimento) AS ultimo_uso
FROM lancamento_financeiro
WHERE tipo='despesa' AND deleted_at IS NULL
  AND vencimento >= '2026-05-01' AND vencimento < '2026-08-01'
GROUP BY categoria
ORDER BY categoria;

-- ── F) SERIES DE PARCELA — conferir continuidade (N/M) ──
SELECT 'F) parcelas' AS check, descricao, valor, vencimento
FROM lancamento_financeiro
WHERE tipo='despesa' AND deleted_at IS NULL
  AND descricao ~ '[0-9]+/[0-9]+'
  AND vencimento >= '2026-05-01' AND vencimento < '2026-08-01'
ORDER BY regexp_replace(descricao, '^[A-Z-]+:', ''), vencimento;

-- ── G) ITENS QUE PODEM ESTAR TAMBEM NO PF (risco de contagem dupla) ──
-- Fornecedores que aparecem no array PF; se tiver PJ com mesmo nome, conferir.
SELECT 'G) overlap PF' AS check, descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE tipo='despesa' AND deleted_at IS NULL
  AND vencimento >= '2026-05-01' AND vencimento < '2026-08-01'
  AND (
    descricao ILIKE '%mano auto posto%' OR descricao ILIKE '%supermercado chama%'
    OR descricao ILIKE '%amigao%'        OR descricao ILIKE '%drogasil%'
    OR descricao ILIKE '%panobianco%'    OR descricao ILIKE '%aiqfome%'
    OR descricao ILIKE '%ifood%'         OR descricao ILIKE '%mercado kraus%'
    OR descricao ILIKE '%portal auto%'   OR descricao ILIKE '%thiago dos%'
    OR descricao ILIKE '%magalu%'        OR descricao ILIKE '%anthropic%'
    OR descricao ILIKE '%pronto%paulo%'
  )
ORDER BY descricao;
