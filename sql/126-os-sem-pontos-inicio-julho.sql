-- =============================================================================
-- sql/126 — OS de julho/2026 que tiveram trabalho ANTES do sistema de
-- autoria existir (06/07/2026) — checks feitos nos dias 1-5 não geram ponto,
-- porque o carimbo {uid,em,apelido} só passou a ser gravado a partir do dia 6.
--
-- Conta OS distintas com pelo menos 1 transição de etapa (bloco de trabalho)
-- registrada em os_historico entre 01/07 e 06/07 (exclusivo). Só leitura.
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
  WHERE h.data >= '2026-07-01' AND h.data < '2026-07-06'
    AND h.etapa_de IS NOT NULL
)
SELECT
  COUNT(DISTINCT t.os_id) AS total_os_sem_pontos_possivel,
  COUNT(*) AS total_transicoes_sem_pontos
FROM transicoes t
WHERE t.bloco IS NOT NULL;

-- Detalhe: quais OS foram essas (números + quantas transições cada uma)
-- SELECT o.numero, COUNT(*) AS n_transicoes
-- FROM transicoes t
-- JOIN os o ON o.id = t.os_id
-- WHERE t.bloco IS NOT NULL
-- GROUP BY o.numero
-- ORDER BY o.numero;
