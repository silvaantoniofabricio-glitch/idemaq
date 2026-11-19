-- 19/11/2026 (aplicado): so troca o NOME de dois lancamentos de setembro (valores e datas iguais).
-- O print do DAS mostrou que os R$618,43 sao o Simples de AGOSTO (venc. 21/09, pago 16/10 com multa+juros 52,36).
-- Pela mesma logica (serie ESOCIAL-JUN 20/07, ESOCIAL-JUL 20/08), o eSocial 661,28 tambem e competencia 08/2026.
-- Assim nao ha sobreposicao com o DARF de INSS competencia 09/2026 (350,50, sql/211).
UPDATE lancamento_financeiro SET descricao = 'CRESOL-SET:Simples Nacional (DAS) competencia 08/2026, venc 21/09, pago 16/10 com multa+juros 52,36'
WHERE deleted_at IS NULL AND descricao = 'CRESOL-SET:Ministerio da Fazenda (DAS) set/2026';
UPDATE lancamento_financeiro SET descricao = 'ESOCIAL-SET:INSS+FGTS competencia 08/2026 (pago 16/10)'
WHERE deleted_at IS NULL AND descricao = 'ESOCIAL-SET:INSS+FGTS competencia 09/2026';
