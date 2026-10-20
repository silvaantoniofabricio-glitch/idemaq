-- =============================================================================
-- sql/201 — Corrige garantia=false nas 5 OS que foram identificadas em
-- sql/200 como realmente pagas pelo cliente (valor_pago > 0) — sinal forte
-- de que era um problema diferente do serviço anterior, não retrabalho da
-- garantia. Confirmado com o Toni em 30/09/2026.
--
-- Efeito automático (nenhum outro UPDATE necessário): pontuacao.js e
-- useRelatorioQualidade.js já leem os.garantia direto, então essas 5 OS
-- passam a pontuar 100% (em vez de 50%) e saem da conta de retrabalho nos
-- relatórios — recalculado sozinho na próxima vez que a página carregar.
-- =============================================================================

UPDATE os
SET garantia = false
WHERE numero IN (1624, 1759, 1773, 1774, 1782)
  AND deleted_at IS NULL;

-- Conferência
SELECT numero, garantia, valor_total, valor_pago, pago
FROM os
WHERE numero IN (1624, 1759, 1773, 1774, 1782)
ORDER BY numero;
