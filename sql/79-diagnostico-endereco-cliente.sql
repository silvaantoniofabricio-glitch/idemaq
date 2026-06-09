-- ============================================================
-- DIAGNÓSTICO: endereços com CEP/Brasil/cidade repetida
-- Não altera nada — só mostra o antes e depois
-- Rodar ANTES do sql/80 para revisar
-- ============================================================
-- Estratégia: corta tudo a partir da primeira vírgula seguida de CEP (NNNNN-NNN)
-- Exemplo:
--   ANTES: "R. Dez de Junho, 36 - Jardim Oásis, Naviraí - MS, 79950-000, Brasil, Naviraí, MS"
--   DEPOIS: "R. Dez de Junho, 36 - Jardim Oásis, Naviraí - MS"
-- ============================================================

SELECT
  id,
  endereco                                                          AS endereco_original,
  regexp_replace(endereco, ',\s*\d{5}-?\d{3}.*', '')               AS endereco_limpo,
  length(endereco) - length(regexp_replace(endereco, ',\s*\d{5}-?\d{3}.*', ''))
                                                                    AS chars_removidos
FROM cliente
WHERE deleted_at IS NULL
  AND endereco ~ '\d{5}-?\d{3}'   -- tem padrão de CEP
ORDER BY endereco;
