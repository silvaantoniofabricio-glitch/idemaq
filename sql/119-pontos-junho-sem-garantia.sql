-- =============================================================================
-- sql/119 — Correção do sql/118: exclui OS de garantia do total de pontos
--
-- sql/118 contava TODAS as transições de junho, inclusive OS de garantia
-- (os.garantia = true) — retrabalho decorrente de um problema não deveria
-- gerar ponto novo. Mesma lógica de sql/118, só com o filtro a mais.
-- Só leitura, não altera nada.
-- =============================================================================

WITH transicoes AS (
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
  WHERE h.data >= '2026-06-01' AND h.data < '2026-07-01'
    AND h.etapa_de IS NOT NULL
),
transicoes_validas AS (
  SELECT DISTINCT ON (os_id, bloco) os_id, bloco, data
  FROM transicoes
  WHERE bloco IS NOT NULL
  ORDER BY os_id, bloco, data
),
os_info AS (
  SELECT
    o.id, o.numero, o.tipo_equipamento, o.pre_diagnostico,
    (SELECT COUNT(*) FROM jsonb_object_keys(
      COALESCE(o.pre_diagnostico->'oficina'->'execucao'->'manut_serv', '{}'::jsonb)
    )) AS n_manut
  FROM os o
  WHERE o.id IN (SELECT os_id FROM transicoes_validas)
    AND o.garantia IS NOT TRUE  -- <<< a correção
),
pontos AS (
  SELECT
    t.os_id, o.numero, t.bloco, t.data,
    CASE
      WHEN o.tipo_equipamento = 'lava_seca' THEN
        CASE t.bloco
          WHEN 'coleta'      THEN 6
          WHEN 'diagnostico' THEN 5
          WHEN 'entrega'     THEN 6
          WHEN 'teste_final' THEN 2 + (CASE WHEN (o.pre_diagnostico->'oficina'->>'tem_limpeza')::boolean THEN 3 ELSE 0 END)
          WHEN 'oficina'     THEN
            (CASE WHEN (o.pre_diagnostico->'oficina'->>'tem_limpeza')::boolean THEN 22 ELSE 0 END)
            + 5 + 5
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
  JOIN os_info o ON o.id = t.os_id
)

SELECT bloco, COUNT(*) AS n_transicoes, SUM(pontos) AS pontos_totais, 0 AS ordem
FROM pontos
GROUP BY bloco

UNION ALL

SELECT 'TOTAL GERAL', COUNT(*), SUM(pontos), 1
FROM pontos

ORDER BY ordem, pontos_totais DESC;
