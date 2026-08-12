-- 155-diag-tamanho-baixa-estoque-pendente.sql
-- SÓ LEITURA. Mede o tamanho do problema: OS já concluídas cuja baixa
-- automática de peças nunca rodou (itens_baixados=false), por causa do
-- bug do moverOS corrigido em 12/08/2026 (Kanban.jsx / OSMobile.jsx
-- escreviam direto no banco, sem passar pela função que baixa estoque).

-- 1. Visão geral: quantas OS, quantos itens de peça, valor total (custo).
WITH os_pendentes AS (
  SELECT id, numero, tipo, data_conclusao
  FROM os
  WHERE etapa = 'concluido' AND deleted_at IS NULL AND itens_baixados = false
),
itens_pendentes AS (
  SELECT oi.os_id, oi.peca_id, oi.nome, oi.quantidade,
         COALESCE(p.custo_medio, p.custo_atual, 0) AS custo_unit
  FROM os_item oi
  JOIN os_pendentes op ON op.id = oi.os_id
  LEFT JOIN peca p ON p.id = oi.peca_id
  WHERE oi.peca_id IS NOT NULL AND oi.deleted_at IS NULL
)
SELECT
  (SELECT COUNT(*) FROM os_pendentes) AS os_concluidas_sem_baixa,
  (SELECT COUNT(*) FROM itens_pendentes) AS itens_de_peca_nao_baixados,
  (SELECT COUNT(DISTINCT peca_id) FROM itens_pendentes) AS pecas_distintas_afetadas,
  (SELECT COALESCE(SUM(quantidade), 0) FROM itens_pendentes) AS qtd_total_nao_baixada,
  (SELECT ROUND(SUM(quantidade * custo_unit)::numeric, 2) FROM itens_pendentes) AS custo_total_estimado,
  (SELECT MIN(data_conclusao) FROM os_pendentes) AS conclusao_mais_antiga,
  (SELECT MAX(data_conclusao) FROM os_pendentes) AS conclusao_mais_recente;

-- 2. Por peça — quais peças mais "sumiram" do controle (top 15 por quantidade).
WITH os_pendentes AS (
  SELECT id FROM os WHERE etapa = 'concluido' AND deleted_at IS NULL AND itens_baixados = false
)
SELECT
  p.nome, p.qtd_atual AS estoque_hoje_no_sistema,
  SUM(oi.quantidade) AS qtd_deveria_ter_sido_baixada,
  COUNT(DISTINCT oi.os_id) AS em_quantas_os
FROM os_item oi
JOIN os_pendentes op ON op.id = oi.os_id
JOIN peca p ON p.id = oi.peca_id
WHERE oi.peca_id IS NOT NULL AND oi.deleted_at IS NULL
GROUP BY p.id, p.nome, p.qtd_atual
ORDER BY qtd_deveria_ter_sido_baixada DESC
LIMIT 15;
