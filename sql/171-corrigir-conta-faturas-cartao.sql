-- Corrige a CONTA dos lancamentos de fatura de cartao.
--
-- Erro: os scripts das faturas (sql/62, 85, 145, 167, 168 / 63, 86) jogaram
-- tudo na conta 'Bradesco PJ'. Mas essas despesas nasceram em cartoes
-- diferentes, e as contas certas ja existiam no seed (sql/01):
--   'Elo Grafite'   (cartao)
--   'Bradesco Visa' (cartao)
--
-- Confirmado por Toni: o cartao Bradesco PJ (Elo Mais 3914) deixou de existir
-- em julho — as saidas dessas faturas vieram do Elo Grafite.
--
-- NAO muda valor, data, categoria nem descricao. So o conta_id.
--
-- Fica de fora de proposito (sao da conta corrente Bradesco PJ, nao de cartao):
--   sql/60 (extrato maio) · sql/96 (tarifa) · sql/97 (Bling)
-- Fica de fora tambem sql/66 (FAT-BRAD-PJ-ELO-MAIO) — esse e o proprio
-- cartao Elo Mais 3914, entao 'Bradesco PJ' esta correto.

BEGIN;

-- Elo Grafite: maio, junho (6819), julho (JUN) e agosto (JUL)
UPDATE lancamento_financeiro
SET conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'Elo Grafite' LIMIT 1)
WHERE deleted_at IS NULL
  AND descricao LIKE 'FAT-ELO-GRAFITE-%';

-- Visa Bradesco: maio e junho
UPDATE lancamento_financeiro
SET conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'Bradesco Visa' LIMIT 1)
WHERE deleted_at IS NULL
  AND descricao LIKE 'FAT-VISA-BRADESCO-%';

COMMIT;

-- Verificacao: como ficou a distribuicao por conta
SELECT cb.nome AS conta, cb.tipo, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL
  AND lf.vencimento >= '2026-05-01' AND lf.vencimento < '2026-09-01'
GROUP BY cb.nome, cb.tipo
ORDER BY total DESC;

-- Confere a fatura de julho inteira (esperado: 14 itens PJ, R$838,68)
SELECT COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-ELO-GRAFITE-JUN:%';
