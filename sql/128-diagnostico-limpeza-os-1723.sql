-- =============================================================================
-- sql/128 — Diagnóstico: por que a limpeza da OS #1723 não pontuou?
-- Mostra exatamente o que está gravado em pre_diagnostico.oficina pra essa
-- OS específica. Só leitura.
-- =============================================================================

SELECT
  numero,
  tipo_equipamento,
  garantia,
  pre_diagnostico->'oficina'->>'tem_limpeza'          AS tem_limpeza,
  pre_diagnostico->'oficina'->'execucao'->'limpeza_serv' AS limpeza_serv_bruto,
  jsonb_typeof(pre_diagnostico->'oficina'->'execucao'->'limpeza_serv') AS limpeza_serv_tipo,
  pre_diagnostico->'oficina'->'execucao'->'desmontagem'  AS desmontagem_bruto,
  pre_diagnostico->'oficina'->'execucao'->'montagem'     AS montagem_bruto
FROM os
WHERE numero = 1723;

-- Se quiser ver o orçamento (pra checar se algum item bate com /limpeza/i):
-- SELECT nome, categoria, quantidade FROM os_item
-- WHERE os_id = (SELECT id FROM os WHERE numero = 1723) AND deleted_at IS NULL;
