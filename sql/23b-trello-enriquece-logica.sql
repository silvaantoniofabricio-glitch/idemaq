-- sql/23b-trello-enriquece-logica.sql
-- Aplica enriquecimento Trello em 3 passos:
-- 1. UPDATE OS Trello sem valor → seta valor/pago/forma
-- 2. INSERT os_item com descrição do comentário
-- 3. INSERT lancamento_financeiro (receita) — só pra OS Trello SEM Bling enrichment
-- Idempotente via tag TRELLO-COMENT:<comment_id> em descricao do financeiro.

-- 1. UPDATE OS — só pra OS que ainda têm valor_total=0/NULL E têm TRELLO-CARD tag
UPDATE os o
SET valor_total = te.valor,
    valor_pago = te.valor,
    pago = 'total'::os_pagamento_status,
    forma_pagamento = COALESCE(o.forma_pagamento, te.forma),
    data_conclusao = COALESCE(o.data_conclusao, te.data_pagamento::timestamptz),
    observacoes = CASE
      WHEN o.observacoes ILIKE '%TRELLO-COMENT:' || te.comment_id || '%' THEN o.observacoes
      ELSE COALESCE(o.observacoes, '') || E'\n[TRELLO-COMENT:' || te.comment_id || ']'
    END
FROM _trello_enrich te
WHERE o.observacoes ILIKE '%TRELLO-CARD:' || te.trello_id || '%'
  AND o.deleted_at IS NULL
  AND (o.valor_total IS NULL OR o.valor_total = 0)
  AND o.observacoes NOT ILIKE '%TRELLO-COMENT:' || te.comment_id || '%';

-- 2. INSERT os_item — descrição do comentário como serviço
INSERT INTO os_item (os_id, nome, quantidade, valor_unitario)
SELECT o.id, te.descricao, 1::numeric, te.valor
FROM _trello_enrich te
JOIN os o ON o.observacoes ILIKE '%TRELLO-CARD:' || te.trello_id || '%'
         AND o.deleted_at IS NULL
         AND o.observacoes ILIKE '%TRELLO-COMENT:' || te.comment_id || '%'  -- só OS que receberam o UPDATE
WHERE NOT EXISTS (
  SELECT 1 FROM os_item oi
  WHERE oi.os_id = o.id
    AND oi.nome = te.descricao
    AND oi.valor_unitario = te.valor
    AND oi.deleted_at IS NULL
);

-- 3. INSERT lancamento_financeiro — só pra OS sem lançamento Bling
-- (pra evitar dupla contagem com sql 20)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT
  'receita',
  te.valor,
  'Vendas de serviços',
  'TRELLO-COMENT:' || te.comment_id || ' ' || COALESCE(te.descricao, ''),
  te.data_pagamento,
  te.data_pagamento,
  te.forma,
  (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1)
FROM _trello_enrich te
JOIN os o ON o.observacoes ILIKE '%TRELLO-CARD:' || te.trello_id || '%'
         AND o.deleted_at IS NULL
         AND o.observacoes ILIKE '%TRELLO-COMENT:' || te.comment_id || '%'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE 'TRELLO-COMENT:' || te.comment_id || '%'
    AND lf.deleted_at IS NULL
)
AND NOT EXISTS (
  -- não duplica se já tem lançamento Bling pra OS
  SELECT 1 FROM lancamento_financeiro lf2
  WHERE lf2.descricao LIKE 'BLING-REC:%'
    AND lf2.vencimento = te.data_pagamento
    AND lf2.valor = te.valor
    AND lf2.deleted_at IS NULL
);

-- Verificação
SELECT
  (SELECT COUNT(*) FROM os WHERE observacoes ILIKE '%TRELLO-COMENT:%' AND deleted_at IS NULL) AS os_enriquecidas,
  (SELECT COUNT(*) FROM lancamento_financeiro WHERE descricao LIKE 'TRELLO-COMENT:%' AND deleted_at IS NULL) AS lancamentos_novos,
  (SELECT SUM(valor) FROM lancamento_financeiro WHERE descricao LIKE 'TRELLO-COMENT:%' AND deleted_at IS NULL) AS soma_novos,
  (SELECT COUNT(*) FROM _trello_enrich) AS staging_total;

-- Cleanup
DROP TABLE IF EXISTS _trello_enrich;