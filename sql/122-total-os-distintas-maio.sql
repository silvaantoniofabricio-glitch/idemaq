-- =============================================================================
-- sql/122 — Quantas OS DISTINTAS tiveram atividade em maio/2026 (sem garantia)
-- Mesma lógica do sql/120. Só leitura.
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
    END AS bloco
  FROM os_historico h
  WHERE h.data >= '2026-05-01' AND h.data < '2026-06-01'
    AND h.etapa_de IS NOT NULL
),
os_com_bloco AS (
  SELECT DISTINCT t.os_id
  FROM transicoes t
  JOIN os o ON o.id = t.os_id
  WHERE t.bloco IS NOT NULL
    AND o.garantia IS NOT TRUE
)
SELECT COUNT(*) AS total_os_distintas FROM os_com_bloco;
