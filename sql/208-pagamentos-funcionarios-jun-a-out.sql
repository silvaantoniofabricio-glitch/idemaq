-- =============================================================================
-- sql/208 — Pagamentos a funcionários (salário + premiação) de junho a
-- outubro/2026, um por linha, pra separar por pessoa e comparar com o nível
-- de pontos de cada um. Só leitura, não altera nada.
-- =============================================================================

SELECT
  vencimento, pago_em, categoria, descricao, valor, conta_id IS NOT NULL AS tem_conta
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND tipo = 'despesa'
  AND vencimento >= '2026-06-01' AND vencimento < '2026-11-01'
  AND (
    categoria IN ('Salario', 'Funcionarios')
    OR descricao ILIKE '%alessandro%' OR descricao ILIKE '%guilherme%'
    OR descricao ILIKE '%gui %' OR descricao ILIKE '%premi%' OR descricao ILIKE '%bonus%'
    OR descricao ILIKE '%vale%' OR descricao ILIKE '%adiantamento%'
  )
ORDER BY vencimento, descricao;
