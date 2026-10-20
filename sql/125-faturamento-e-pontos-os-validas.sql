-- =============================================================================
-- sql/125 — Faturamento médio + pontuação média, SÓ das OS concluídas que têm
-- rastro real de trabalho no sistema (pelo menos 1 bloco com check/movimentação
-- registrada em os_historico). Exclui as OS "fantasmas" (importadas/corrigidas
-- via SQL sem passar pelo fluxo normal — eram 39 das 103 de maio até hoje).
--
-- Mesmo período (maio/2026 até hoje), mesma exclusão de garantia. Só leitura.
-- =============================================================================

WITH os_concluidas AS (
  SELECT id, numero, tipo_equipamento, valor_total, desconto
  FROM os
  WHERE deleted_at IS NULL
    AND etapa = 'concluido'
    AND garantia IS NOT TRUE
    AND data_conclusao >= '2026-05-01'
    AND data_conclusao <= now()
),
transicoes AS (
  SELECT
    h.os_id,
    CASE
      WHEN h.etapa_de = 'agendamento'              THEN 'coleta'
      WHEN h.etapa_de IN ('recebido','diagnostico') THEN 'diagnostico'
      WHEN h.etapa_de = 'em_oficina'                THEN 'oficina'
      WHEN h.etapa_de = 'teste_final'                THEN 'teste_final'
      WHEN h.etapa_de = 'entrega'                    THEN 'entrega'
      ELSE NULL
    END AS bloco,
    h.data
  FROM os_historico h
  WHERE h.os_id IN (SELECT id FROM os_concluidas)
    AND h.etapa_de IS NOT NULL
),
transicoes_validas AS (
  SELECT DISTINCT ON (os_id, bloco) os_id, bloco, data
  FROM transicoes
  WHERE bloco IS NOT NULL
  ORDER BY os_id, bloco, data
),
-- OS "válidas" = têm pelo menos 1 transição real registrada
os_validas AS (
  SELECT DISTINCT os_id FROM transicoes_validas
),
os_info AS (
  SELECT o.id, oc.tipo_equipamento, o.pre_diagnostico
  FROM os o
  JOIN os_concluidas oc ON oc.id = o.id
  WHERE o.id IN (SELECT os_id FROM os_validas)
),
os_info_manut AS (
  SELECT oi.*,
    (SELECT COUNT(*) FROM jsonb_object_keys(
      COALESCE(oi.pre_diagnostico->'oficina'->'execucao'->'manut_serv', '{}'::jsonb)
    )) AS n_manut
  FROM os_info oi
),
pontos AS (
  SELECT
    t.os_id,
    CASE
      WHEN o.tipo_equipamento = 'lava_seca' THEN
        CASE t.bloco
          WHEN 'coleta'      THEN 5
          WHEN 'diagnostico' THEN 4
          WHEN 'entrega'     THEN 5
          WHEN 'teste_final' THEN 1
          WHEN 'oficina'     THEN
            (CASE WHEN (o.pre_diagnostico->'oficina'->>'tem_limpeza')::boolean THEN 22 ELSE 0 END)
            + 7 + 8
            + 4 * o.n_manut
          ELSE 0
        END
      ELSE
        CASE t.bloco
          WHEN 'coleta'      THEN 5
          WHEN 'diagnostico' THEN 4
          WHEN 'entrega'     THEN 5
          WHEN 'teste_final' THEN 1 + (CASE WHEN (o.pre_diagnostico->'oficina'->>'tem_limpeza')::boolean THEN 2 ELSE 0 END)
          WHEN 'oficina'     THEN
            (CASE WHEN (o.pre_diagnostico->'oficina'->>'tem_limpeza')::boolean THEN 18 ELSE 0 END)
            + 4 + 4
            + 3 * o.n_manut
          ELSE 0
        END
    END AS pontos
  FROM transicoes_validas t
  JOIN os_info_manut o ON o.id = t.os_id
),
pontos_por_os AS (
  SELECT os_id, SUM(pontos) AS pontos_os
  FROM pontos
  GROUP BY os_id
)

SELECT
  (SELECT COUNT(*) FROM os_validas) AS total_os_validas,
  ROUND((SELECT SUM(valor_total - COALESCE(desconto,0)) FROM os_concluidas WHERE id IN (SELECT os_id FROM os_validas)), 2) AS faturamento_total,
  ROUND((SELECT AVG(valor_total - COALESCE(desconto,0)) FROM os_concluidas WHERE id IN (SELECT os_id FROM os_validas)), 2) AS ticket_medio,
  (SELECT SUM(pontos_os) FROM pontos_por_os) AS pontos_totais,
  ROUND((SELECT AVG(pontos_os) FROM pontos_por_os), 2) AS pontos_medio_por_os;
