-- 150-backfill-maquinas-fabricacao-concluida.sql
-- Roda DEPOIS do sql/149-os-maquina-criada.sql.
--
-- A automação nova (useMaquinas.criarMaquinaAoConcluirFabricacao) só cria a
-- máquina na TRANSIÇÃO pra Concluído — OS de Fabricação que já estavam
-- concluídas antes dessa correção não disparam o gatilho. Este script cria
-- retroativamente a máquina pra essas OS e marca maquina_criada=true (pra
-- não duplicar se a OS for tocada de novo).

-- 1. Conferir quais OS de Fabricação concluídas ainda não geraram máquina.
SELECT o.numero, o.marca_equipamento, o.modelo_equipamento, o.valor_total, o.data_conclusao
FROM os o
WHERE o.tipo = 'fabricacao'
  AND o.etapa = 'concluido'
  AND o.deleted_at IS NULL
  AND o.maquina_criada = false
ORDER BY o.numero;

-- 2. Cria a máquina pra cada uma (mesmo cálculo de custo_itens que o front faz).
WITH alvo AS (
  SELECT o.id, o.numero, o.marca_equipamento, o.modelo_equipamento, o.valor_total
  FROM os o
  WHERE o.tipo = 'fabricacao'
    AND o.etapa = 'concluido'
    AND o.deleted_at IS NULL
    AND o.maquina_criada = false
),
custo AS (
  SELECT os_id, SUM(quantidade * valor_unitario) AS custo_itens
  FROM os_item
  WHERE categoria = 'peca' AND deleted_at IS NULL
  GROUP BY os_id
)
INSERT INTO maquina (modelo, marca, estado, custo_compra, custo_itens, custo_servico, preco_venda, observacoes)
SELECT
  a.modelo_equipamento,
  a.marca_equipamento,
  'disponivel',
  COALESCE(a.valor_total, 0),
  COALESCE(c.custo_itens, 0),
  0,
  0,
  'Gerada retroativamente (backfill) pela OS #' || a.numero || ' (Fabricação).'
FROM alvo a
LEFT JOIN custo c ON c.os_id = a.id;

-- 3. Marca as OS processadas pra não duplicar depois.
UPDATE os
SET maquina_criada = true
WHERE tipo = 'fabricacao'
  AND etapa = 'concluido'
  AND deleted_at IS NULL
  AND maquina_criada = false;

-- 4. Conferência final.
SELECT count(*) AS maquinas_criadas_backfill
FROM maquina
WHERE observacoes ILIKE '%backfill%';
