-- "Pronto Paulo Cesar AD" — Toni confirmou em 20/08: e peca da Montana (PJ),
-- nao o Focus (PF) como o array controleFinanceiroPF.js tinha classificado.
-- Duas series diferentes do mesmo fornecedor, cartao Bradesco PJ Elo Mais 3914:
--   27/02, 10x R$107,40  ("2/10" ate "5/10" tratado aqui — falta a 1/10, de
--   antes do sistema comecar a rastrear, e a 6/10 em diante, futuro)
--   30/03, 2x R$106,00   (ja completa: 1/2 maio, 2/2 aqui em junho)
--
-- A parcela 2/10 (107,40) e 1/2 (106,00) de MAIO ja estavam certas no PJ
-- (FAT-BRAD-PJ-ELO-MAIO) — a duplicata era so com o PF, que classificava as
-- MESMAS parcelas como Focus. O PF foi corrigido (removidas as 4 linhas
-- 'Focus' de maio/junho) e ganhou a serie certa do JIM Wellynton no lugar
-- (ver sql/187 — essa sim e PJ->PF).
--
-- Faltavam no PJ: 3/10 e 2/2 (junho, so estavam erradas no PF), 4/10 (julho,
-- nunca lancada em lugar nenhum — cartao "sumiu" ate a fatura de agosto
-- reaparecer), e agora 5/10 + anuidade (agosto, fatura nova).
--
-- Fonte agosto: REVISAO FECHAMENTO 2026/AGOSTO/FATURAS/Fatura Bradesco
-- Empresas Agosto.xlsx — cartao "EMPRESARIAL ELO MAIS" final 3914,
-- venc. dia 10, total R$ 129,40 (107,40 + 22,00 anuidade).
--
-- ATENCAO: nao consegui confirmar pelo Chrome (extensao instavel) o nome
-- exato da conta_bancaria usada nos lancamentos de maio deste cartao. Uso
-- 'Bradesco PJ' por ser o mais provavel (bate com o prefixo FAT-BRAD-PJ-ELO
-- e é o unico cartao 'PJ genérico' cadastrado) — mas o bloco abaixo trava
-- com RAISE EXCEPTION se esse nome nao existir, entao nao ha risco de cair
-- com conta_id errado ou NULL silenciosamente. Se falhar, rode a Verificacao
-- 0 pra ver os nomes reais e ajuste antes de tentar de novo.

-- Verificacao 0 (rode antes se o BEGIN abaixo falhar): nomes de conta reais
-- SELECT nome, tipo FROM conta_bancaria WHERE deleted_at IS NULL ORDER BY nome;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM conta_bancaria WHERE nome = 'Bradesco PJ' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Conta ''Bradesco PJ'' nao encontrada — rode a Verificacao 0 (comentada acima) e ajuste o nome antes de continuar.';
  END IF;
END $$;

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  (SELECT id FROM conta_bancaria WHERE nome = 'Bradesco PJ' AND deleted_at IS NULL LIMIT 1),
  v.vencimento::date, v.vencimento::date, 0, v.forma
FROM (VALUES
  ('FAT-BRAD-PJ-ELO-JUN:Pronto Paulo Cesar AD 27/02 3/10 (pecas Montana)', 107.40, 'Servicos/Manutencao', '2026-06-10', 'credito_parcelado'),
  ('FAT-BRAD-PJ-ELO-JUN:Pronto Paulo Cesar AD 30/03 2/2 (pecas Montana)',  106.00, 'Servicos/Manutencao', '2026-06-10', 'credito_parcelado'),
  ('FAT-BRAD-PJ-ELO-JUL:Pronto Paulo Cesar AD 27/02 4/10 (pecas Montana)', 107.40, 'Servicos/Manutencao', '2026-07-10', 'credito_parcelado'),
  ('FAT-BRAD-PJ-ELO-AGO:Pronto Paulo Cesar AD 27/02 5/10 (pecas Montana)', 107.40, 'Servicos/Manutencao', '2026-08-10', 'credito_parcelado'),
  ('FAT-BRAD-PJ-ELO-AGO:Anuidade 08/12',                                   22.00,  'Tarifa cartao',       '2026-08-10', 'credito_1x')
) AS v(descricao, valor, categoria, vencimento, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL
);

COMMIT;

-- Verificacao 1: a serie 27/02 completa, mes a mes (2/10 a 5/10, avancando 1 por vez)
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%Pronto Paulo Cesar AD 27/02%'
ORDER BY vencimento;

-- Verificacao 2: a serie 30/03, agora completa (1/2 maio, 2/2 junho)
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%Pronto Paulo Cesar AD 30/03%'
ORDER BY vencimento;

-- Verificacao 3: fatura de agosto bate com o documento (esperado 2 itens / R$ 129,40)
SELECT COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-BRAD-PJ-ELO-AGO:%';
