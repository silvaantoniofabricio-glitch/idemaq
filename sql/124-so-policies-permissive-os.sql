-- 124-so-policies-permissive-os.sql
-- UMA consulta só (o SQL Editor do Supabase mostra só o resultado da última
-- query — por isso as anteriores "sumiam"). Lista TODAS as policies de `os`
-- com a coluna `permissive` — é aqui que uma regra RESTRICTIVE escondida
-- apareceria. Me manda essa tabela inteira.

SELECT policyname, cmd, permissive, roles,
       qual       AS using_expr,
       with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'os'
ORDER BY permissive, policyname;
