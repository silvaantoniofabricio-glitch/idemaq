-- sql/100 — Inserir peça: Trava Tampa Brastemp/Consul BWH15/CWL16/CWE15
-- Fonte: Mercado Livre · custo R$33 · venda R$65 · 1 unidade

INSERT INTO peca (
  nome,
  categoria,
  modelos_compativeis,
  qtd_atual,
  qtd_minima,
  custo_atual,
  preco_venda,
  fornecedor
) VALUES (
  'Trava Tampa Brastemp Consul BWH15 CWL16 CWE15',
  'trava_porta',
  ARRAY['BWH15', 'CWL16', 'CWE15'],
  1,
  1,
  33.00,
  65.00,
  'Mercado Livre'
);
