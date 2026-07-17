-- 136-historico-os-eleni-sordi.sql
-- SÓ LEITURA. Mostra TODAS as OS da Eleni Sordi Maier (telefone 67 9977-2525),
-- incluindo as excluídas (deleted_at preenchido) — pra responder se alguma
-- OS dela foi apagada em algum momento.

SELECT o.numero, o.etapa, o.pago, o.valor_total, o.valor_pago,
       o.criado_em, o.data_conclusao,
       o.deleted_at, o.excluido_por,
       o.observacoes
FROM os o
JOIN cliente c ON c.id = o.cliente_id
WHERE regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') LIKE '%6799772525%'
ORDER BY o.criado_em;

-- Se quiser ver quem excluiu e quando (nome de quem fez, não só o id):
-- SELECT o.numero, o.deleted_at, u.nome AS excluido_por_nome
-- FROM os o
-- JOIN cliente c ON c.id = o.cliente_id
-- LEFT JOIN usuarios u ON u.id = o.excluido_por
-- WHERE regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') LIKE '%6799772525%'
--   AND o.deleted_at IS NOT NULL;
