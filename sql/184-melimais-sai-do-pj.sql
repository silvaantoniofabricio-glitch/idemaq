-- Meli+ (assinatura do Mercado Livre, R$ 74,90 em 09/08) e PF, nao PJ.
--
-- No sql/183 eu classifiquei como PJ/Software junto com Anthropic e Amazon
-- Music, seguindo o padrao das compras avulsas do Mercado Livre — mas era
-- palpite, nao tinha comprovacao. Toni confirmou em 20/08 que e pessoal.
-- Na mesma conferencia ele confirmou que ML RankRank (R$ 223,00) e ML
-- FilipeFlop (R$ 78,00) sao PJ/Pecas mesmo, entao esses ficam como estao.
--
-- Passa a viver em DESPESAS_PF_TONI_AGOSTO_2026 (categoria 'Assinatura', a
-- mesma do Nubank+). Aqui so sai do PJ, via soft-delete.
--
-- Efeito na fatura MP de agosto (venc. 20/08, total R$ 3.089,70):
--   PJ  46 itens R$ 2.661,84  ->  45 itens R$ 2.586,94
--   PF   7 itens R$   224,97  ->   8 itens R$   299,87
--   soma continua R$ 2.886,81 = "Total a pagar" da fatura.

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND descricao = 'FAT-MP-AGO:MP MeliMais 09/08';

COMMIT;

-- APLICADO em 20/08/2026 — FAT-MP-AGO ficou com 45 itens / R$ 2.586,94.
--
-- ACHADO NA VERIFICACAO, ainda NAO resolvido: a MESMA assinatura Meli+ esta
-- lancada em maio como PJ — 'FAT-BRAD-PJ-ELO-MAIO:MP MeliMais 08/04',
-- R$ 74,90, categoria Software, venc. 10/05, no cartao Bradesco Elo Mais
-- (o que foi cancelado em julho). Se Meli+ e PF em agosto, o de maio tambem
-- deveria ser. NAO mexi porque maio ja esta fechado e mexer em mes fechado
-- depende de autorizacao do Toni. Perguntado em 20/08, aguardando resposta.

-- Verificacao 1: nao pode sobrar Meli+ em agosto.
-- Atencao: essa query pega o de MAIO tambem — 1 linha e o esperado hoje.
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE '%MeliMais%';

-- Verificacao 2: fatura MP de agosto agora (esperado 45 itens / R$ 2.586,94)
SELECT COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-MP-AGO:%';

-- Verificacao 3: RankRank e FilipeFlop seguem em Pecas, como o Toni confirmou
SELECT descricao, valor, categoria
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND (descricao ILIKE '%RankRank%' OR descricao ILIKE '%FilipeFlop%')
ORDER BY descricao;
