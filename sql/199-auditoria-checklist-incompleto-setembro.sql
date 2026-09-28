-- =============================================================================
-- sql/199 — Auditoria: setembro/2026 faturou quase igual a julho mas a
-- pontuação ficou bem mais baixa. Hipótese: OS finalizadas sem checklist
-- completo (pontua 0 nesse bloco mesmo tendo sido entregue/faturada de
-- verdade), ou mais OS de garantia/venda/fabricação (pontuam menos ou não
-- passam pelo fluxo de oficina). Só leitura, não altera nada.
-- =============================================================================

-- 1) Distribuição por tipo/garantia — setembro vs julho (pra comparar mix)
SELECT
  to_char(date_trunc('month', o.data_conclusao), 'YYYY-MM') AS mes,
  COALESCE(o.tipo, 'atendimento') AS tipo,
  o.garantia,
  COUNT(*) AS n
FROM os o
WHERE o.etapa IN ('concluido', 'entrega')
  AND o.deleted_at IS NULL
  AND o.data_conclusao >= '2026-07-01' AND o.data_conclusao < '2026-10-01'
  AND date_trunc('month', o.data_conclusao) IN ('2026-07-01', '2026-09-01')
GROUP BY 1, 2, 3
ORDER BY 1, 4 DESC;

-- 2) Auditoria de checklist — OS finalizadas em setembro, bloco por bloco
SELECT
  o.numero,
  o.tipo_equipamento,
  o.tipo,
  o.garantia,
  (o.pre_diagnostico->'coleta_confirmada'->>'apelido') IS NOT NULL AS coleta_ok,
  (o.pre_diagnostico->'oficina'->'execucao'->'desmontagem'->'feito'->>'apelido') IS NOT NULL AS desmontagem_ok,
  (o.pre_diagnostico->'oficina'->'execucao'->'montagem'->'feito'->>'apelido') IS NOT NULL AS montagem_ok,
  (o.pre_diagnostico->'oficina'->>'tem_limpeza')::boolean AS tem_limpeza,
  (o.pre_diagnostico->'oficina'->'execucao'->'limpeza_serv'->'feito'->>'apelido') IS NOT NULL AS limpeza_ok,
  (SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(o.pre_diagnostico->'oficina'->'execucao'->'manut_serv', '{}'::jsonb))) AS n_manut,
  (o.pre_diagnostico->'entrega'->'realizada_por'->>'apelido') IS NOT NULL AS entrega_ok
FROM os o
WHERE o.etapa IN ('concluido', 'entrega')
  AND o.deleted_at IS NULL
  AND o.data_conclusao >= '2026-09-01' AND o.data_conclusao < '2026-10-01'
ORDER BY o.numero;
