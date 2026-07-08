-- =============================================================================
-- sql/115 — Diagnóstico: os_historico está duplicando linhas por movimentação?
-- Rodar no SQL Editor do Supabase. SÓ LEITURA — não altera nada.
-- =============================================================================

-- 1) Quantas linhas de os_historico o Toni (dono) tem no mês atual, e quantas
--    são "gêmeas" (mesma OS + mesma etapa_para + mesmo funcionário, criadas a
--    poucos segundos de diferença — sinal de INSERT duplicado por movimentação).
WITH hist_mes AS (
  SELECT h.*, u.apelido, u.papel
  FROM os_historico h
  JOIN usuarios u ON u.id = h.funcionario_id
  WHERE h.data >= date_trunc('month', now())
),
duplicatas AS (
  SELECT
    os_id, etapa_para, funcionario_id,
    COUNT(*) AS n_linhas,
    array_agg(data ORDER BY data) AS datas
  FROM hist_mes
  GROUP BY os_id, etapa_para, funcionario_id
  HAVING COUNT(*) > 1
)
SELECT * FROM duplicatas ORDER BY n_linhas DESC;

-- 2) Total de linhas no mês por pessoa (pra comparar com o que aparece na tela)
SELECT u.apelido, u.papel, COUNT(*) AS total_linhas
FROM os_historico h
JOIN usuarios u ON u.id = h.funcionario_id
WHERE h.data >= date_trunc('month', now())
GROUP BY u.apelido, u.papel
ORDER BY total_linhas DESC;

-- 3) Amostra de 20 linhas mais recentes do Toni — olhar se tem pares muito
--    próximos no tempo (mesma os_id, etapa_para repetida em <5s de diferença)
SELECT h.os_id, o.numero, h.etapa_de, h.etapa_para, h.data
FROM os_historico h
JOIN usuarios u ON u.id = h.funcionario_id
JOIN os o ON o.id = h.os_id
WHERE u.papel = 'dono'
  AND h.data >= date_trunc('month', now())
ORDER BY h.data DESC
LIMIT 30;

-- 4) Ver se existe trigger no banco que grava em os_historico automaticamente
--    (fora do que o app faz explicitamente)
SELECT tgname, tgrelid::regclass AS tabela, pg_get_triggerdef(oid) AS definicao
FROM pg_trigger
WHERE tgrelid = 'os'::regclass
  AND NOT tgisinternal;
