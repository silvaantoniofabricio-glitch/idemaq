-- sql/25-fix-infinitepay-rename.sql
-- CORREÇÃO: os 362 lancamentos importados via sql/21 foram identificados como
-- Cresol banco, mas na verdade eram extratos da InfinitePay (maquininha).
-- Todos têm MEMO "Depósito InfinitePay" no OFX original.
--
-- Esta migração:
-- 1. Move os lancamentos da conta 'Cresol' pra conta 'InfinitePay' (já existe em sql/01)
-- 2. Renomeia tags: CRESOL-FITID → INFINITEPAY-FITID
-- 3. Ajusta categoria pra refletir natureza (depósito de maquininha = receita)

-- 1. Move conta_id
UPDATE lancamento_financeiro
SET conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'InfinitePay' LIMIT 1)
WHERE descricao LIKE 'CRESOL-FITID:%'
  AND deleted_at IS NULL;

-- 2. Renomeia tag
UPDATE lancamento_financeiro
SET descricao = 'INFINITEPAY-FITID:' || substring(descricao FROM 'CRESOL-FITID:([^ ]+)') ||
                substring(descricao FROM 'CRESOL-FITID:[^ ]+(.*)')
WHERE descricao LIKE 'CRESOL-FITID:%'
  AND deleted_at IS NULL;

-- 3. Ajusta categoria de Vendas → Maquininha (mais preciso)
UPDATE lancamento_financeiro
SET categoria = 'Depósito InfinitePay'
WHERE descricao LIKE 'INFINITEPAY-FITID:%'
  AND tipo = 'receita'
  AND deleted_at IS NULL;

-- Verificação
SELECT
  cb.nome AS conta,
  cb.tipo AS conta_tipo,
  COUNT(*) AS lancamentos,
  SUM(lf.valor) FILTER (WHERE lf.tipo='receita') AS receitas,
  SUM(lf.valor) FILTER (WHERE lf.tipo='despesa') AS despesas
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.descricao LIKE 'INFINITEPAY-FITID:%'
  AND lf.deleted_at IS NULL
GROUP BY cb.nome, cb.tipo;
