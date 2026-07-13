-- 134-diag-os-endereco.sql
-- DIAGNÓSTICO (só leitura). Mostra as 5 OS mais recentes com o endereço que
-- ficou salvo em os.endereco, ao lado dos 3 endereços do cliente. Assim dá pra
-- ver se o endereço 2 escolhido na criação foi realmente gravado.
--
--   - Se os_endereco = endereço 2 do cliente  → gravou certo (bug seria na tela)
--   - Se os_endereco = endereço 1 ou vazio      → a criação NÃO gravou o escolhido
--
-- RODAR e me mandar a tabela.

SELECT
  o.numero,
  o.criado_em,
  o.endereco               AS os_endereco,
  c.nome                   AS cliente,
  c.endereco               AS cli_end1,
  c.endereco2              AS cli_end2,
  c.endereco3              AS cli_end3
FROM os o
LEFT JOIN cliente c ON c.id = o.cliente_id
WHERE o.deleted_at IS NULL
ORDER BY o.criado_em DESC
LIMIT 5;
