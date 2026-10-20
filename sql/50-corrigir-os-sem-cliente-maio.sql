-- Corrige 3 OS de maio/2026 que ficaram sem cliente_id
-- Telefones fornecidos: Marlia 67 99799009, Lorival 67 9646-8082, Gleisy 67 9833-0461

BEGIN;

-- 1. Garante clientes
INSERT INTO cliente (nome, telefone, observacoes) VALUES
  ('Marlia Freire Marques', '67 99799-009', 'Importado Trello Maio 2026 (correcao)'),
  ('Lorival', '67 9646-8082', 'Importado Trello Maio 2026 (correcao)'),
  ('Gleisy Cavallini', '67 9833-0461', 'Importado Trello Maio 2026 (correcao)')
ON CONFLICT DO NOTHING;

-- 2. Liga OS Marlia
UPDATE os SET cliente_id = (
  SELECT id FROM cliente
  WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799799009%'
    AND deleted_at IS NULL LIMIT 1
)
WHERE observacoes ILIKE '%TRELLO-MAIO-2026:MarliaFreireMarques6799799009%'
  AND deleted_at IS NULL
  AND cliente_id IS NULL;

-- 3. Liga OS Lorival
UPDATE os SET cliente_id = (
  SELECT id FROM cliente
  WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6796468082%'
    AND deleted_at IS NULL LIMIT 1
)
WHERE observacoes ILIKE '%TRELLO-MAIO-2026:Lorival%'
  AND deleted_at IS NULL
  AND cliente_id IS NULL;

-- 4. Liga OS Gleisy
UPDATE os SET cliente_id = (
  SELECT id FROM cliente
  WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6798330461%'
    AND deleted_at IS NULL LIMIT 1
)
WHERE observacoes ILIKE '%TRELLO-MAIO-2026:GleisyCavallini%'
  AND deleted_at IS NULL
  AND cliente_id IS NULL;

COMMIT;

-- Verificacao
SELECT o.id, o.etapa, o.valor_total, c.nome, c.telefone
FROM os o LEFT JOIN cliente c ON c.id = o.cliente_id
WHERE o.observacoes ILIKE ANY (ARRAY[
  '%TRELLO-MAIO-2026:MarliaFreireMarques%',
  '%TRELLO-MAIO-2026:Lorival%',
  '%TRELLO-MAIO-2026:GleisyCavallini%'
])
AND o.deleted_at IS NULL;
