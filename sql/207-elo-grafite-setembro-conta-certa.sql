-- 23/10/2026 — Toni apontou: itens PJ da fatura ELO GRAFITE de setembro estavam na conta 'Bradesco PJ'
-- (que e a do Elo Mais, fatura R$129,40). A fonte e o Elo Grafite -> conta 'Elo Grafite'.
-- Erro meu no sql/203 (copiei a conta usada nos meses anteriores, que ja estava errada).
-- APLICADO em 23/10/2026 — Bradesco PJ/Elo Mais setembro = 2 itens R$129,40; Elo Grafite = 7 itens R$433,95.
-- Meses anteriores (prefixos FAT-ELO-GRAFITE-MAIO/6819/JUN/JUL) AINDA estao em 'Bradesco PJ' — aguardando OK do Toni.
UPDATE lancamento_financeiro SET conta_id = (SELECT id FROM conta_bancaria WHERE nome ILIKE '%grafite%' AND deleted_at IS NULL LIMIT 1)
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-ELO-GRAFITE-AGO:%';
