-- 154-diag-abrangencia-automacoes-perdidas.sql
-- SÓ LEITURA. Verifica se a falha das automações (baixa de estoque +
-- criação de máquina) na OS #1761 é um caso isolado ou mais amplo.

-- 1. Todas as OS de Fabricação concluídas — mostra se a máquina saiu ou não.
SELECT
  o.numero, o.etapa, o.cliente_id, o.marca_equipamento, o.modelo_equipamento,
  o.maquina_criada, o.itens_baixados, o.criado_em, o.data_conclusao,
  EXISTS (
    SELECT 1 FROM maquina m
    WHERE m.observacoes ILIKE '%OS #' || o.numero || '%'
  ) AS tem_maquina_vinculada
FROM os o
WHERE o.tipo = 'fabricacao' AND o.etapa = 'concluido' AND o.deleted_at IS NULL
ORDER BY o.numero;

-- 2. Qualquer OS (de qualquer tipo) concluída que também não teve a baixa de
--    estoque automática — pra saber se o problema é só com máquina ou mais
--    geral. Limita às últimas 20 concluídas pra não trazer histórico demais.
SELECT numero, tipo, etapa, itens_baixados, criado_em, data_conclusao
FROM os
WHERE etapa = 'concluido' AND deleted_at IS NULL
ORDER BY criado_em DESC
LIMIT 20;
