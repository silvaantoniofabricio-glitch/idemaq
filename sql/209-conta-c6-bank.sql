-- 209 — Conta "C6 Bank" (maquininha C6) pra receber débito/crédito da maquininha C6.
-- osToFinanceiro.js mapeia c6debito / c6credito_Nx -> conta "C6 Bank".
-- Idempotente: só insere se ainda não existir.
INSERT INTO conta_bancaria (nome, tipo)
SELECT 'C6 Bank', 'maquininha'
WHERE NOT EXISTS (
  SELECT 1 FROM conta_bancaria WHERE nome = 'C6 Bank' AND deleted_at IS NULL
);
