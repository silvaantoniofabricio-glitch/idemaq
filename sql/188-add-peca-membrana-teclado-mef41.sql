-- 188-add-peca-membrana-teclado-mef41.sql
-- Cadastro de nova peça (já aplicado via SQL Editor em 14/09/2026 — script
-- fica versionado pra registro/histórico).

INSERT INTO peca (
  nome, categoria, marca, tipo, modelo, modelos_compativeis,
  fornecedor, qtd_atual, custo_atual, custo_medio, preco_venda
) VALUES (
  'Membrana Teclado/Película Microondas Electrolux MEF41',
  'painel', 'Electrolux', 'Membrana teclado', 'MEF41', ARRAY['MEF41'],
  'Mercado Livre', 1, 50, 50, 100
)
RETURNING id, nome, categoria, custo_atual, preco_venda, qtd_atual;
