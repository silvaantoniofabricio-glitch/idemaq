-- sql/39-relatorio-gaps.sql
-- Relatório de gaps no banco: OS órfãs, lançamentos sem associação,
-- clientes sem OS, etc. Tudo pra revisão manual.

-- ════════════════════════════════════════════════════════════
-- BLOCO 1: OS COM PROBLEMAS
-- ════════════════════════════════════════════════════════════

-- 1.1. OS sem cliente_id (esperado pra Fabricação, mas suspeito pra Atendimento/Venda)
SELECT
  'OS sem cliente_id por tipo' AS metrica,
  tipo,
  COUNT(*) AS qtd
FROM os
WHERE cliente_id IS NULL
  AND deleted_at IS NULL
GROUP BY tipo
ORDER BY qtd DESC;

-- 1.2. OS de Atendimento sem cliente (NÃO esperado — investigar)
SELECT 'OS atendimento sem cliente' AS aviso, numero, valor_total, observacoes
FROM os
WHERE tipo='atendimento'
  AND cliente_id IS NULL
  AND deleted_at IS NULL
LIMIT 10;

-- 1.3. OS com cliente_id apontando pra cliente deletado (zumbi)
SELECT 'OS apontando cliente deletado' AS aviso, COUNT(*) AS qtd
FROM os o
JOIN cliente c ON c.id = o.cliente_id
WHERE c.deleted_at IS NOT NULL
  AND o.deleted_at IS NULL;

-- 1.4. OS sem valor_total (= 0 ou NULL)
SELECT
  'OS sem valor_total' AS metrica,
  etapa,
  COUNT(*) AS qtd
FROM os
WHERE (valor_total IS NULL OR valor_total = 0)
  AND deleted_at IS NULL
GROUP BY etapa
ORDER BY qtd DESC;

-- 1.5. OS sem nenhum item (os_item)
SELECT 'OS sem itens' AS metrica, COUNT(*) AS qtd
FROM os o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM os_item oi WHERE oi.os_id = o.id AND oi.deleted_at IS NULL
  );

-- ════════════════════════════════════════════════════════════
-- BLOCO 2: LANCAMENTOS FINANCEIROS COM PROBLEMAS
-- ════════════════════════════════════════════════════════════

-- 2.1. Lançamentos sem conta_id (devem ter sempre)
SELECT 'Lançamento sem conta_id' AS metrica, COUNT(*) AS qtd
FROM lancamento_financeiro
WHERE conta_id IS NULL AND deleted_at IS NULL;

-- 2.2. Lançamentos sem categoria
SELECT 'Lançamento sem categoria' AS metrica, COUNT(*) AS qtd, SUM(valor) AS soma
FROM lancamento_financeiro
WHERE (categoria IS NULL OR categoria = '') AND deleted_at IS NULL;

-- 2.3. Lançamentos sem forma_pagamento
SELECT 'Lançamento sem forma_pagamento' AS metrica, COUNT(*) AS qtd
FROM lancamento_financeiro
WHERE forma_pagamento IS NULL AND deleted_at IS NULL;

-- 2.4. Lançamentos sem os_id (a maioria de Cresol/Bling não tem, mas BLING-REC deveria)
SELECT
  CASE
    WHEN descricao LIKE 'BLING-REC:%' THEN 'BLING_REC sem os_id'
    ELSE 'Outros sem os_id'
  END AS metrica,
  COUNT(*) AS qtd
FROM lancamento_financeiro
WHERE os_id IS NULL
  AND tipo = 'receita'
  AND deleted_at IS NULL
GROUP BY 1;

-- ════════════════════════════════════════════════════════════
-- BLOCO 3: CLIENTES COM PROBLEMAS
-- ════════════════════════════════════════════════════════════

-- 3.1. Clientes sem telefone
SELECT 'Cliente sem telefone' AS metrica, COUNT(*) AS qtd
FROM cliente
WHERE (telefone IS NULL OR telefone = '') AND deleted_at IS NULL;

-- 3.2. Clientes sem nenhuma OS
SELECT 'Cliente sem nenhuma OS' AS metrica, COUNT(*) AS qtd
FROM cliente c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM os o WHERE o.cliente_id = c.id AND o.deleted_at IS NULL
  );

-- 3.3. Telefones duplicados (mesmo número, vários cadastros)
SELECT
  telefone,
  COUNT(*) AS cadastros,
  array_agg(nome ORDER BY criado_em) AS nomes
FROM cliente
WHERE deleted_at IS NULL
  AND telefone IS NOT NULL
  AND telefone != ''
GROUP BY telefone
HAVING COUNT(*) > 1
ORDER BY cadastros DESC
LIMIT 20;

-- ════════════════════════════════════════════════════════════
-- BLOCO 4: SUMÁRIO EXECUTIVO
-- ════════════════════════════════════════════════════════════

SELECT
  (SELECT COUNT(*) FROM os WHERE deleted_at IS NULL) AS total_os,
  (SELECT COUNT(*) FROM os WHERE cliente_id IS NULL AND tipo!='fabricacao' AND deleted_at IS NULL) AS os_sem_cliente_problematicas,
  (SELECT COUNT(*) FROM os WHERE (valor_total IS NULL OR valor_total = 0) AND deleted_at IS NULL) AS os_sem_valor,
  (SELECT COUNT(*) FROM lancamento_financeiro WHERE (categoria IS NULL OR categoria='') AND deleted_at IS NULL) AS lanc_sem_categoria,
  (SELECT COUNT(*) FROM cliente c WHERE c.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM os WHERE cliente_id=c.id AND deleted_at IS NULL)) AS clientes_sem_os;
