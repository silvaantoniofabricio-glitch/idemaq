-- 123-dump-completo-rls-triggers-os.sql
-- DIAGNÓSTICO (só leitura). O "new row violates RLS for table os" persiste
-- mesmo com auth.role()='authenticated' e with_check só exigindo authenticated.
-- Isso só é possível se houver (a) uma policy RESTRICTIVE escondida, ou
-- (b) um trigger que escreve de volta em `os`.
--
-- RODAR OS 3 BLOCOS e me mandar as 3 saídas.

-- (1) TODAS as policies de `os` — inclui a coluna permissive/restrictive
SELECT policyname, cmd, permissive, roles,
       qual AS using_expr, with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'os'
ORDER BY permissive, policyname;

-- (2) Triggers da tabela `os` (nome, evento, função chamada)
SELECT t.tgname AS trigger_nome,
       CASE t.tgtype::int & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS quando,
       p.proname  AS funcao,
       p.prosecdef AS security_definer
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'os'::regclass AND NOT t.tgisinternal
ORDER BY t.tgname;

-- (3) Se algum trigger acima escreve em `os`, mostra a fonte da função dele
--     (troque o nome se o item 2 revelar outro). Os candidatos comuns:
SELECT proname, prosecdef AS security_definer, prosrc
FROM pg_proc
WHERE proname IN ('tg_os_historico', 'tg_os_auditoria', 'set_updated_at',
                  'os_registra_historico', 'tg_os_atualizado');
