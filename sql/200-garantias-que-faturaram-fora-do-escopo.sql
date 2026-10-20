-- =============================================================================
-- sql/200 — OS marcadas como garantia (os.garantia = true) que faturaram
-- algo (valor_total > 0). Uma OS de garantia "pura" deveria ficar em R$ 0
-- (grátis, é retrabalho do mesmo defeito) — se tem valor, é sinal de que
-- mexeu em algo FORA da garantia (peça nova, problema diferente) e ninguém
-- desmarcou o campo garantia na hora. Candidatas a corrigir com
-- UPDATE os SET garantia = false WHERE numero = <numero>.
-- Só leitura, não altera nada.
-- =============================================================================

SELECT
  o.numero,
  c.nome AS cliente,
  o.marca_equipamento, o.modelo_equipamento,
  o.data_conclusao,
  o.valor_total, o.desconto, o.valor_pago, o.pago,
  o.etapa,
  o.os_origem_id,
  origem.numero AS os_origem_numero,
  o.defeito_relatado
FROM os o
LEFT JOIN cliente c ON c.id = o.cliente_id
LEFT JOIN os origem ON origem.id = o.os_origem_id
WHERE o.garantia = true
  AND o.deleted_at IS NULL
  AND COALESCE(o.valor_total, 0) > 0
ORDER BY o.numero;
