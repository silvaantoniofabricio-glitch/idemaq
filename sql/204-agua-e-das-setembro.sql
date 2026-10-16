-- Setembro/2026 — duas contas pagas em outubro mas lançadas em SETEMBRO a pedido do Toni.
--   Agua Sanesul set/2026: R$146,29, paga 14/10 -> lançada no vencimento (02/09), mesmo padrao do sql/191.
--   Simples Nacional (DAS) set/2026: R$618,43, paga 16/10 -> lançada em 20/09 (precedente: 'CRESOL-JUL:Ministerio da Fazenda (DAS)', Impostos).
-- Ambas saem da Cresol. NAO duplicar quando o extrato de OUTUBRO chegar: as duas saidas
-- (14/10 e 16/10) sao so a quitacao destas.
-- eSocial de setembro: ainda NAO pago — Toni avisa quando pagar; vai em SETEMBRO tambem.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  v.data::date, v.data::date, 0, v.forma
FROM (VALUES
  ('CRESOL-SET:Sanesul agua set/2026',                  146.29, 'Agua/Luz/Fone', '2026-09-02', 'debito'),
  ('CRESOL-SET:Ministerio da Fazenda (DAS) set/2026',   618.43, 'Impostos',      '2026-09-20', 'pix')
) AS v(descricao, valor, categoria, data, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL
);

COMMIT;

SELECT descricao, valor, categoria, pago_em FROM lancamento_financeiro
WHERE deleted_at IS NULL AND (descricao LIKE 'CRESOL-SET:Sanesul%' OR descricao LIKE 'CRESOL-SET:Ministerio%');
