-- Reaponta as faturas do Mercado Pago pro CARTAO, nao pra conta.
--
-- Mesmo caso do sql/171 (Elo Grafite / Neo Visa / Nubank): os scripts das
-- faturas MP (sql/65, 90, 148) usaram a conta 'Mercado Pago', que e o banco.
-- Mas essas despesas nasceram no cartao MP (Visa 5566) — e a conta
-- 'Mercado Pago Cartão' ja existe no seed (sql/01) sem uso.
--
-- Efeito: hoje a fatura MP aparece partida em duas origens na planilha
-- ('Mercado Pago' pro PJ e 'Cartão Mercado Pago' pro PF). Depois disso as
-- duas pontas caem no mesmo rotulo e a fatura fecha num filtro so.
--
-- NAO muda valor, data, categoria nem descricao. So o conta_id.
--
-- Fica de fora sql/56 (extrato da conta Mercado Pago, nao e cartao).

BEGIN;

UPDATE lancamento_financeiro
SET conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'Mercado Pago Cartão' AND deleted_at IS NULL LIMIT 1)
WHERE deleted_at IS NULL
  AND descricao LIKE 'FAT-MP-%';

COMMIT;

-- Verificacao: esperado 45 itens / R$3.116,35 em julho
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND lf.descricao LIKE 'FAT-MP-JUL:%'
GROUP BY cb.nome;
