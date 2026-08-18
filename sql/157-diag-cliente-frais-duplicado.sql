-- 157-diag-cliente-frais-duplicado.sql
-- SÓ LEITURA. Confere os 3 clientes "Frais" antes de decidir o que fazer —
-- telefone é quem manda na dedupe (nome/endereço parecido pode ser família
-- diferente morando junto, não duplicata).

SELECT
  c.id, c.nome, c.telefone, c.telefone2, c.endereco, c.criado_em,
  (SELECT COUNT(*) FROM os WHERE cliente_id = c.id AND deleted_at IS NULL) AS qtd_os
FROM cliente c
WHERE c.nome ILIKE '%frais%' AND c.deleted_at IS NULL
ORDER BY c.nome;

-- Se algum tiver qtd_os > 0 nos dois "duplicados", lista as OS de cada um
-- pra ver se são do mesmo atendimento espalhado ou coisas diferentes.
