-- sql/73-jussara-os-a-receber.sql
-- OS da Jussara Suelen Berluchi: entregue 20/05/2026, R$ 255, AINDA NÃO PAGA.
-- Resultado: OS na etapa 'pagamento' (entregue, aguardando pagamento) +
-- lançamento financeiro "A receber" (receita com pago_em NULL).
-- Idempotente: marcador MANUAL-2026:JussaraSuelenBerluchi no observacoes/descricao.
-- Rodar no Supabase SQL Editor.

BEGIN;

-- 1) Cliente (cria só se ainda não existe um com esse nome)
INSERT INTO cliente (nome, observacoes)
SELECT 'Jussara Suelen Berluchi', 'Cadastro manual 2026'
WHERE NOT EXISTS (
  SELECT 1 FROM cliente
  WHERE lower(nome) = lower('Jussara Suelen Berluchi')
    AND deleted_at IS NULL
);

-- 2) OS — atendimento, entregue 20/05, aguardando pagamento (etapa 'pagamento')
INSERT INTO os (cliente_id, tipo, etapa, valor_total, valor_pago, pago,
                observacoes, criado_em, data_conclusao)
SELECT
  (SELECT id FROM cliente
     WHERE lower(nome) = lower('Jussara Suelen Berluchi')
       AND deleted_at IS NULL
     ORDER BY id LIMIT 1),
  'atendimento', 'pagamento', 255.00, 0.00, 'nao'::os_pagamento_status,
  'MANUAL-2026:JussaraSuelenBerluchi | Entregue 20/05/2026, aguardando pagamento (R$ 255)',
  '2026-05-20 12:00:00+00', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM os
  WHERE observacoes ILIKE '%MANUAL-2026:JussaraSuelenBerluchi%' AND deleted_at IS NULL
);

-- 3) Lançamento financeiro "A RECEBER" (receita, pago_em NULL)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                   vencimento, pago_em, taxa_pct, forma_pagamento, os_id)
SELECT
  'receita', 255.00, 'Servico', 'Jussara Suelen Berluchi — entregue 20/05, a receber',
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' LIMIT 1),
  '2026-05-20', NULL, 0, 'pix',
  (SELECT id FROM os WHERE observacoes ILIKE '%MANUAL-2026:JussaraSuelenBerluchi%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao ILIKE '%Jussara Suelen Berluchi%' AND deleted_at IS NULL
);

COMMIT;

-- Conferência
SELECT o.numero, o.etapa, o.valor_total, o.valor_pago, o.pago, o.criado_em, c.nome
FROM os o LEFT JOIN cliente c ON c.id = o.cliente_id
WHERE o.observacoes ILIKE '%MANUAL-2026:JussaraSuelenBerluchi%' AND o.deleted_at IS NULL;

SELECT tipo, valor, descricao, vencimento, pago_em
FROM lancamento_financeiro
WHERE descricao ILIKE '%Jussara Suelen Berluchi%' AND deleted_at IS NULL;
