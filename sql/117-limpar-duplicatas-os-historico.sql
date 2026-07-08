-- =============================================================================
-- sql/117 — Limpar duplicatas em os_historico (bug do INSERT manual)
--
-- Causa: o trigger `os_registra_historico` (AFTER INSERT OR UPDATE OF etapa)
-- já grava sozinho em os_historico com funcionario_id = auth.uid() e
-- duracao_segundos calculado. O código do app TAMBÉM fazia um INSERT manual
-- nos 3 lugares que movem etapa (Kanban desktop, Modal, Mobile) — duplicando
-- toda movimentação desde sempre no mobile, e desde 07/07/2026 no desktop
-- (quando um fix baseado em diagnóstico incompleto adicionou o INSERT lá
-- também). Removido em sql/117 companion — código já corrigido no commit
-- que trouxe este arquivo.
--
-- Sinal de duplicata: o INSERT manual nunca preenchia `duracao_segundos`
-- (só o trigger calcula isso). Então toda linha com etapa_de preenchido
-- (não é a criação da OS) E duracao_segundos NULL, que tem uma "irmã" com
-- os mesmos os_id/etapa_para/funcionario_id e duracao_segundos preenchido
-- feita a poucos segundos de diferença, é a cópia manual — pode apagar.
--
-- RODAR PRIMEIRO A CONSULTA DE CONFERÊNCIA (1), revisar o que vai ser
-- apagado, DEPOIS rodar o DELETE (2). Idempotente — rodar de novo não
-- apaga nada a mais.
-- =============================================================================

-- 1) CONFERÊNCIA — o que seria apagado (não altera nada ainda)
WITH duplicatas AS (
  SELECT h.id
  FROM os_historico h
  WHERE h.etapa_de IS NOT NULL
    AND h.duracao_segundos IS NULL
    AND EXISTS (
      SELECT 1 FROM os_historico h2
      WHERE h2.os_id = h.os_id
        AND h2.etapa_para = h.etapa_para
        AND h2.funcionario_id IS NOT DISTINCT FROM h.funcionario_id
        AND h2.duracao_segundos IS NOT NULL
        AND h2.id <> h.id
        AND abs(extract(epoch from (h2.data - h.data))) < 30
    )
)
SELECT h.id, h.os_id, o.numero, h.etapa_de, h.etapa_para, h.funcionario_id, h.data, h.duracao_segundos
FROM os_historico h
JOIN duplicatas d ON d.id = h.id
JOIN os o ON o.id = h.os_id
ORDER BY h.data DESC;

-- 2) DELETE — só rodar depois de conferir a query acima
-- DELETE FROM os_historico h
-- WHERE h.etapa_de IS NOT NULL
--   AND h.duracao_segundos IS NULL
--   AND EXISTS (
--     SELECT 1 FROM os_historico h2
--     WHERE h2.os_id = h.os_id
--       AND h2.etapa_para = h.etapa_para
--       AND h2.funcionario_id IS NOT DISTINCT FROM h.funcionario_id
--       AND h2.duracao_segundos IS NOT NULL
--       AND h2.id <> h.id
--       AND abs(extract(epoch from (h2.data - h.data))) < 30
--   );

-- 3) Depois de limpar, conferir que sobrou só 1 linha por movimentação real:
-- SELECT os_id, etapa_para, funcionario_id, COUNT(*)
-- FROM os_historico
-- GROUP BY os_id, etapa_para, funcionario_id
-- HAVING COUNT(*) > 1;
