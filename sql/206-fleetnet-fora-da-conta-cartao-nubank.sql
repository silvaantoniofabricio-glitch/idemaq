-- 22/10/2026 — Toni conferiu fatura Nubank PF de setembro (R$199,78) contra o sistema e achou 319,77.
-- Causa: o boleto FleetNet R$119,99 (EXTRATO bancario Nubank, 10/09) foi lancado na conta 'Nubank PF',
-- que e a do CARTAO. 80,36 (PF) + 119,42 (PJ cartao) + 119,99 = 319,77.
-- Correcao: boleto fica SEM conta (a conta corrente Nubank do Toni nao e rastreada, como Bradesco PF).
-- Continua despesa PJ de setembro, categoria Internet.
-- APLICADO em 22/10/2026 — Nubank PF cartao em setembro = 2 itens / R$119,42 (+ 80,36 PF = 199,78).
UPDATE lancamento_financeiro SET conta_id = NULL
WHERE deleted_at IS NULL AND descricao = 'NUBANK-CONTA-SET:FleetNet Telecomunicacoes set/2026 (boleto 10/09)';
