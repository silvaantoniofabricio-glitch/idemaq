-- Plano NuCel (R$10/mes, cartao Nubank) e PF nos tres meses — confirmado por Toni.
--
-- Estava inconsistente: PJ em maio (sql/67) e julho (sql/141), ambos rotulados
-- "linha PJ", mas PF em junho. Como e a mesma cobranca recorrente, os tres
-- passam a ser PF.
--
-- Remove os dois lancamentos PJ (soft-delete). Os equivalentes PF ja foram
-- adicionados em controleFinanceiroPF.js (maio e julho; junho ja estava la).

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND descricao IN (
    'FAT-NUBANK-PF-MAIO:Plano NuCel 19/04 (linha PJ)',
    'FAT-NUBANK-PF-JUL:Plano NuCel 19/06 (linha PJ)'
  );

COMMIT;

-- Verificacao: nao deve sobrar nenhum NuCel ativo no PJ
SELECT descricao, valor, vencimento, deleted_at IS NOT NULL AS removido
FROM lancamento_financeiro
WHERE descricao ILIKE '%nucel%'
ORDER BY vencimento;
