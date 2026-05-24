-- sql/40-clientes-reativacao.sql
-- Lista os 306 clientes cadastrados que NUNCA viraram OS.
-- Sortido por data de cadastro DESC (recentes primeiro = mais quentes pra reativar).
-- Saída pronta pra exportar como CSV via Supabase Dashboard.

-- 1. Visão geral por origem (Bling vs Trello vs manual)
SELECT
  CASE
    WHEN observacoes ILIKE '%trello%' THEN 'Trello'
    WHEN endereco ILIKE '%bling%' OR observacoes ILIKE '%bling%' THEN 'Bling'
    ELSE 'Outros / manual'
  END AS origem,
  COUNT(*) AS qtd
FROM cliente c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM os WHERE cliente_id = c.id AND deleted_at IS NULL
  )
GROUP BY 1
ORDER BY qtd DESC;

-- 2. Lista TOP 100 clientes frios (priorizando os mais recentes)
SELECT
  c.nome,
  c.telefone,
  c.email,
  substring(c.endereco FROM 1 FOR 60) AS endereco,
  c.criado_em::date AS cadastrado_em,
  EXTRACT(DAY FROM NOW() - c.criado_em)::int AS dias_desde_cadastro,
  CASE
    WHEN c.telefone IS NULL OR c.telefone = '' THEN '❌ sem telefone'
    WHEN length(regexp_replace(c.telefone, '[^0-9]', '', 'g')) < 10 THEN '⚠️ telefone curto'
    ELSE '✅ contatável'
  END AS status_contato
FROM cliente c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM os WHERE cliente_id = c.id AND deleted_at IS NULL
  )
ORDER BY c.criado_em DESC NULLS LAST
LIMIT 100;

-- 3. Resumo de contatabilidade dos 306
SELECT
  CASE
    WHEN c.telefone IS NULL OR c.telefone = '' THEN '❌ sem telefone'
    WHEN length(regexp_replace(c.telefone, '[^0-9]', '', 'g')) < 10 THEN '⚠️ telefone curto'
    ELSE '✅ contatável'
  END AS status,
  COUNT(*) AS qtd
FROM cliente c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM os WHERE cliente_id = c.id AND deleted_at IS NULL
  )
GROUP BY 1
ORDER BY qtd DESC;
