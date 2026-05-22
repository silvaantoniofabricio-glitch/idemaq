-- ============================================================================
-- Diagnostico: por que as OS importadas do Trello aparecem sem tel/end?
-- Roda no Supabase SQL Editor. Nao modifica nada.
-- ============================================================================

-- 1) Quantas OS Trello tem cliente_id NULL (nao deveria ter, sql/12 fez JOIN)
SELECT COUNT(*) AS os_trello_sem_cliente
FROM os
WHERE deleted_at IS NULL
  AND observacoes LIKE 'TRELLO-CARD:%'
  AND cliente_id IS NULL;

-- 2) Quantas OS Trello apontam pra cliente que esta sem telefone valido
SELECT COUNT(*) AS os_trello_cliente_sem_tel
FROM os o
JOIN cliente c ON c.id = o.cliente_id
WHERE o.deleted_at IS NULL
  AND o.observacoes LIKE 'TRELLO-CARD:%'
  AND (c.telefone IS NULL OR LENGTH(regexp_replace(c.telefone, '\D', '', 'g')) < 8);

-- 3) Quantas OS Trello apontam pra cliente sem endereco
SELECT COUNT(*) AS os_trello_cliente_sem_end
FROM os o
JOIN cliente c ON c.id = o.cliente_id
WHERE o.deleted_at IS NULL
  AND o.observacoes LIKE 'TRELLO-CARD:%'
  AND (c.endereco IS NULL OR c.endereco = '');

-- 4) Amostra de 10 OS Trello com cliente embed (pra ver o que tem)
SELECT
  o.numero,
  o.etapa,
  o.observacoes AS marker,
  c.nome,
  c.telefone,
  c.endereco
FROM os o
LEFT JOIN cliente c ON c.id = o.cliente_id
WHERE o.deleted_at IS NULL
  AND o.observacoes LIKE 'TRELLO-CARD:%'
ORDER BY o.criado_em DESC
LIMIT 10;

-- 5) Se tiver MUITAS sem tel: amostra dos clientes-pais com problema
SELECT
  c.id,
  c.nome,
  c.telefone,
  c.endereco,
  c.observacoes,
  COUNT(o.id) AS qtd_os_trello
FROM cliente c
JOIN os o ON o.cliente_id = c.id AND o.observacoes LIKE 'TRELLO-CARD:%'
WHERE c.deleted_at IS NULL
  AND (c.telefone IS NULL OR LENGTH(regexp_replace(c.telefone, '\D', '', 'g')) < 8
       OR c.endereco IS NULL OR c.endereco = '')
GROUP BY c.id
ORDER BY qtd_os_trello DESC
LIMIT 20;
