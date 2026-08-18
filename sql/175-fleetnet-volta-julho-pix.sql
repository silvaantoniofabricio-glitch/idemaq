-- Desfaz o sql/173: o FleetNet de julho volta pra 10/07.
--
-- Erro meu: tratei um pagamento PIX como se fosse compra em fatura de cartao.
-- Toni corrigiu — a internet e paga por PIX do banco, aparece no EXTRATO, nao
-- em fatura. Confere com o historico: maio saiu da conta Nubank (sql/59) e
-- junho foi PIX pela Cresol (sql/94).
--
-- Regra que eu tinha embaralhado:
--   compra no cartao  -> conta no mes do VENCIMENTO da fatura
--   PIX / debito      -> conta na DATA DO PAGAMENTO
--
-- Consequencia do erro: julho ficou sem despesa de internet, e agosto ganhou
-- uma que nao era dele.
--
-- Alem da data, corrige duas coisas:
--   - conta: estava no cartao 'Nubank PF' (o sql/171 pegou pelo prefixo FAT-);
--     PIX sai da CONTA 'Nubank', nao do cartao.
--   - descricao: o prefixo FAT- sugeria fatura. Passa a seguir o padrao de
--     maio ('NUBANK-MAIO:FleetNet...'), que ja era pagamento direto.
--
-- ATENCAO: nao rodar o sql/156 de novo — ele recriaria o lancamento antigo.

BEGIN;

UPDATE lancamento_financeiro
SET vencimento = '2026-07-10',
    pago_em    = '2026-07-10',
    categoria  = 'Internet',
    conta_id   = (SELECT id FROM conta_bancaria WHERE nome = 'Nubank' AND deleted_at IS NULL LIMIT 1),
    descricao  = 'NUBANK-JUL:FleetNet Telecomunicacoes (internet)'
WHERE descricao = 'FAT-NUBANK-PF-JUL10:FleetNet Telecomunicacoes'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao: a internet deve aparecer em maio, junho e julho
SELECT lf.descricao, lf.valor, lf.vencimento, lf.categoria, cb.nome AS conta
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL
  AND lf.descricao ILIKE '%fleetnet%'
  AND lf.vencimento >= '2026-05-01'
ORDER BY lf.vencimento;
