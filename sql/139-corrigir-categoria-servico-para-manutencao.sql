-- sql/139-corrigir-categoria-servico-para-manutencao.sql
-- Corrige rótulo de categoria: 'Servico' → 'Manutenção'.
--
-- Causa raiz: o lote de importação do Trello (sql/49-trello-maio-2026.sql,
-- rodado 31/05/2026 de madrugada) gravou 41 lançamentos de receita com
-- categoria = 'Servico' (sem acento, singular) em vez do rótulo padrão
-- 'Manutenção' usado nos outros 94 lançamentos do mesmo tipo de receita.
--
-- Não é um caso isolado: é o MESMO tipo de receita (serviço prestado ao
-- cliente / OS), só que rotulado diferente por causa do script de origem.
-- Prova: a OS da Paula (aa239fa9-50c3-4019-8993-995d882815d9) tem 2
-- lançamentos — R$255 (parcela) + R$100 (saldo restante) — os DOIS com
-- 'Servico'. É a mesma manutenção, dividida em 2 pagamentos.
--
-- Efeito: sem essa correção, "Servico" aparece como categoria fantasma em
-- todo relatório que agrupa por categoria (Painel, Relatórios, DRE, e o
-- arquivo do contador) — distorcendo a leitura de quanto foi manutenção.
--
-- Escopo: SÓ lançamentos com categoria exata 'Servico' (case-sensitive).
-- Não toca em 'Venda de máquina' nem em 'Manutenção' já corretos.

-- 1) Conferir ANTES de rodar o UPDATE — deve mostrar 41 linhas
SELECT id, valor, descricao, vencimento, os_id
FROM lancamento_financeiro
WHERE categoria = 'Servico' AND deleted_at IS NULL
ORDER BY vencimento;

-- 2) Corrigir (idempotente — rodar de novo não faz nada se já corrigido)
UPDATE lancamento_financeiro
SET categoria = 'Manutenção'
WHERE categoria = 'Servico' AND deleted_at IS NULL;

-- 3) Conferir DEPOIS — deve retornar 0 linhas
SELECT COUNT(*) AS restantes_servico
FROM lancamento_financeiro
WHERE categoria = 'Servico' AND deleted_at IS NULL;
