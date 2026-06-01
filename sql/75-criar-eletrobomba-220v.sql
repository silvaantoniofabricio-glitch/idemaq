-- Cria "Eletrobomba Emicol 220V" se ainda nao existir.
-- Copia custo/preco/min/max do 127V se houver, qtd_atual=0.
-- Idempotente: nao duplica se ja existir uma 220V ativa.

INSERT INTO peca (nome, sku, fornecedor, qtd_atual, qtd_minima, qtd_maxima,
                  custo_atual, preco_venda, favorito, categoria)
SELECT
  'Eletrobomba Emicol 220V',
  NULL,
  fornecedor,
  0,
  qtd_minima,
  qtd_maxima,
  custo_atual,
  preco_venda,
  favorito,
  categoria
  FROM peca
 WHERE nome = 'Eletrobomba Emicol 127V' AND deleted_at IS NULL
 LIMIT 1
ON CONFLICT DO NOTHING;

-- Fallback: se nao existe 127V (logica acima nao retorna nada), cria 220V minima
INSERT INTO peca (nome, qtd_atual, qtd_minima, qtd_maxima, custo_atual, preco_venda)
SELECT 'Eletrobomba Emicol 220V', 0, 0, 0, 0, 0
 WHERE NOT EXISTS (
   SELECT 1 FROM peca
    WHERE nome = 'Eletrobomba Emicol 220V' AND deleted_at IS NULL
 );

-- Verificacao
SELECT id, nome, qtd_atual, custo_atual, preco_venda
  FROM peca
 WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
 ORDER BY nome;
