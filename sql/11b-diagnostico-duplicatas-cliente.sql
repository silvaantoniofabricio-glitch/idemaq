-- ============================================================================
-- DIAGNÓSTICO de duplicatas na tabela `cliente`
-- Gerado 20/05/2026 — rodar ANTES do sql/11-cliente-importar-trello.sql
-- Cada SELECT é independente — pode rodar tudo de uma vez ou um por vez.
-- NÃO modifica nada.
-- ============================================================================

-- 1) Quantos clientes ativos com / sem telefone
SELECT
  COUNT(*)                                                          AS total_ativos,
  COUNT(*) FILTER (WHERE telefone IS NULL OR telefone = '')         AS sem_telefone,
  COUNT(*) FILTER (WHERE LENGTH(regexp_replace(COALESCE(telefone,''),'\D','','g')) >= 8) AS com_tel_valido
FROM cliente
WHERE deleted_at IS NULL;

-- 2) Telefones duplicados no banco hoje (mesmo tel_norm em 2+ clientes ativos)
SELECT
  regexp_replace(COALESCE(telefone,''),'\D','','g') AS tel_norm,
  COUNT(*)                                          AS qtd,
  array_agg(nome ORDER BY nome)                     AS nomes,
  array_agg(id   ORDER BY nome)                     AS ids
FROM cliente
WHERE deleted_at IS NULL
  AND LENGTH(regexp_replace(COALESCE(telefone,''),'\D','','g')) >= 8
GROUP BY tel_norm
HAVING COUNT(*) > 1
ORDER BY qtd DESC, tel_norm
LIMIT 50;

-- 3) Nomes duplicados (case-insensitive trim) no banco hoje
SELECT
  LOWER(TRIM(nome))             AS nome_norm,
  COUNT(*)                      AS qtd,
  array_agg(telefone ORDER BY criado_em) AS telefones,
  array_agg(id ORDER BY criado_em)       AS ids
FROM cliente
WHERE deleted_at IS NULL
GROUP BY nome_norm
HAVING COUNT(*) > 1
ORDER BY qtd DESC, nome_norm
LIMIT 50;

-- 4) Clientes do Bling SEM telefone que TÊM o mesmo nome de alguém com telefone
--    (esses são candidatos a "merge" antes da importação Trello)
SELECT
  c_sem.nome    AS nome,
  c_sem.id      AS id_sem_tel,
  c_com.id      AS id_com_tel,
  c_com.telefone
FROM cliente c_sem
JOIN cliente c_com
  ON LOWER(TRIM(c_sem.nome)) = LOWER(TRIM(c_com.nome))
 AND c_sem.id <> c_com.id
 AND c_sem.deleted_at IS NULL
 AND c_com.deleted_at IS NULL
WHERE (c_sem.telefone IS NULL OR c_sem.telefone = '')
  AND LENGTH(regexp_replace(COALESCE(c_com.telefone,''),'\D','','g')) >= 8
ORDER BY c_sem.nome
LIMIT 50;
