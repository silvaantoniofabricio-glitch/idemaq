-- ============================================================
-- LIMPEZA: remove CEP, "Brasil" e cidade/UF repetidos do endereço
-- Rodar só após revisar o diagnóstico do sql/79
--
-- Resultado: mantém "Rua, Número - Bairro, Cidade - UF"
--            remove ", 79950-000, Brasil, Naviraí, MS" em diante
-- ============================================================

UPDATE cliente
SET endereco = regexp_replace(endereco, ',\s*\d{5}-?\d{3}.*', '')
WHERE deleted_at IS NULL
  AND endereco ~ '\d{5}-?\d{3}';

-- Resumo
SELECT
  count(*) AS registros_atualizados,
  'Endereços limpos com sucesso' AS status
FROM cliente
WHERE deleted_at IS NULL
  AND endereco IS NOT NULL
  AND endereco != ''
  AND endereco !~ '\d{5}-?\d{3}';
