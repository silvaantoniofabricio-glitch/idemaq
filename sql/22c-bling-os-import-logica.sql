-- sql/22c-bling-os-import-logica.sql
-- PARTE 5/6: match cliente+OS Trello, UPDATE OS existentes, INSERT novas OS, INSERT os_item.
-- Pré-req: 22a1, 22a2, 22b1, 22b2 rodados.

-- 1. Match cliente (telefone) e OS Trello (observacoes)
DROP TABLE IF EXISTS _bling_match;
CREATE TABLE _bling_match AS
SELECT
  bp.numero AS pedido_numero,
  bp.trello_id,
  c.id AS cliente_id,
  os.id AS os_existente_id,
  os.numero AS os_existente_numero
FROM _bling_pedido bp
LEFT JOIN LATERAL (
  SELECT id FROM cliente
  WHERE deleted_at IS NULL
    AND bp.telefone IS NOT NULL
    AND regexp_replace(telefone, '[^0-9]', '', 'g') LIKE '%' || bp.telefone
  LIMIT 1
) c ON TRUE
LEFT JOIN LATERAL (
  SELECT id, numero FROM os
  WHERE deleted_at IS NULL
    AND bp.trello_id IS NOT NULL
    AND observacoes ILIKE '%TRELLO-CARD:' || bp.trello_id || '%'
  LIMIT 1
) os ON TRUE;

SELECT COUNT(*) AS match_total, COUNT(cliente_id) AS com_cliente, COUNT(os_existente_id) AS com_os_trello FROM _bling_match;

-- 2. UPDATE OS Trello existentes (enriquece com dados Bling)
UPDATE os o
SET valor_total = COALESCE(NULLIF(o.valor_total, 0), bp.total),
    valor_pago = CASE WHEN bp.forma_pagamento != 'a_prazo' THEN bp.total ELSE COALESCE(o.valor_pago, 0) END,
    pago = CASE WHEN bp.forma_pagamento != 'a_prazo' THEN 'total'::os_pagamento_status ELSE COALESCE(o.pago, 'nao'::os_pagamento_status) END,
    forma_pagamento = COALESCE(o.forma_pagamento, bp.forma_pagamento),
    desconto = COALESCE(NULLIF(o.desconto, 0), bp.desconto),
    cliente_id = COALESCE(o.cliente_id, m.cliente_id),
    observacoes = CASE
      WHEN o.observacoes ILIKE '%BLING-PEDIDO:%' THEN o.observacoes
      ELSE COALESCE(o.observacoes, '') || E'\n[BLING-PEDIDO:' || bp.numero || ']'
    END
FROM _bling_pedido bp
JOIN _bling_match m ON m.pedido_numero = bp.numero
WHERE m.os_existente_id = o.id
  AND (o.observacoes IS NULL OR o.observacoes NOT ILIKE '%BLING-PEDIDO:' || bp.numero || '%');

-- 3. INSERT OS retroativas (pedidos Bling sem OS Trello)
INSERT INTO os (cliente_id, tipo, etapa, valor_total, desconto, valor_pago, pago, forma_pagamento, observacoes, criado_em, data_conclusao)
SELECT
  m.cliente_id,
  bp.tipo::os_tipo,
  'concluido'::os_etapa,
  bp.total,
  bp.desconto,
  CASE WHEN bp.forma_pagamento != 'a_prazo' THEN bp.total ELSE 0 END,
  CASE WHEN bp.forma_pagamento != 'a_prazo' THEN 'total'::os_pagamento_status ELSE 'nao'::os_pagamento_status END,
  bp.forma_pagamento,
  COALESCE(bp.observacoes || E'\n', '') || '[BLING-PEDIDO:' || bp.numero || ']' ||
    CASE WHEN bp.trello_id IS NOT NULL THEN E'\n[TRELLO-CARD:' || bp.trello_id || ']' ELSE '' END,
  bp.data::timestamptz,
  bp.data::timestamptz
FROM _bling_pedido bp
JOIN _bling_match m ON m.pedido_numero = bp.numero
WHERE m.os_existente_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM os o2
    WHERE o2.observacoes ILIKE '%BLING-PEDIDO:' || bp.numero || '%'
      AND o2.deleted_at IS NULL
  );

-- 4. INSERT os_item — produtos de cada pedido
INSERT INTO os_item (os_id, nome, quantidade, valor_unitario)
SELECT
  o.id,
  bi.nome,
  bi.quantidade,
  bi.valor_unit
FROM _bling_item bi
JOIN os o ON o.observacoes ILIKE '%BLING-PEDIDO:' || bi.pedido_numero || '%'
           AND o.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM os_item oi
  WHERE oi.os_id = o.id
    AND oi.nome = bi.nome
    AND oi.valor_unitario = bi.valor_unit
    AND oi.deleted_at IS NULL
);

-- 5. Verificação
SELECT
  (SELECT COUNT(*) FROM os WHERE observacoes ILIKE '%BLING-PEDIDO:%' AND deleted_at IS NULL) AS os_com_tag_bling,
  (SELECT COUNT(*) FROM os WHERE observacoes ILIKE '%BLING-PEDIDO:%' AND observacoes ILIKE '%TRELLO-CARD:%' AND deleted_at IS NULL) AS os_bling_e_trello,
  (SELECT COUNT(*) FROM os_item oi JOIN os o ON o.id=oi.os_id WHERE o.observacoes ILIKE '%BLING-PEDIDO:%' AND oi.deleted_at IS NULL) AS itens_importados,
  (SELECT SUM(valor_total) FROM os WHERE observacoes ILIKE '%BLING-PEDIDO:%' AND deleted_at IS NULL) AS soma_valores,
  (SELECT COUNT(*) FROM _bling_match WHERE cliente_id IS NULL) AS pedidos_sem_cliente_match;