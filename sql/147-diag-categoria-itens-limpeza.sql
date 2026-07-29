-- 147-diag-categoria-itens-limpeza.sql
-- SÓ LEITURA. Mostra o valor REAL da coluna categoria nos itens de
-- limpeza/manutenção — pra confirmar se é NULL, string vazia, ou outra
-- coisa (o filtro do Vendas/Kanban só aceita NULL ou 'servico').

SELECT id, os_id, nome,
       categoria,
       categoria IS NULL      AS eh_null,
       categoria = ''         AS eh_string_vazia,
       length(categoria)      AS tamanho_string
FROM os_item
WHERE (nome ILIKE '%limpez%' OR nome ILIKE '%manuten%')
  AND deleted_at IS NULL
ORDER BY os_id
LIMIT 30;
