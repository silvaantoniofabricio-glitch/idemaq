-- ============================================================================
-- DEBUG — Inspeciona policies RLS da tabela `os`
-- Cola no SQL Editor + Run. Cola o resultado de volta pro Claude.
-- ============================================================================

-- 1) Quais policies existem em `os`?
SELECT
  polname           AS policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END               AS comando,
  pg_get_expr(polqual, polrelid)      AS using_expr,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expr,
  (SELECT array_agg(rolname) FROM pg_roles WHERE oid = ANY(polroles)) AS roles
FROM pg_policy
WHERE polrelid = 'os'::regclass
ORDER BY polname;

-- 2) Funções auxiliares de RLS (is_dono, papel_atual) — confirma que existem
SELECT proname, pg_get_function_result(oid) AS retorna
FROM pg_proc
WHERE proname IN ('is_dono', 'papel_atual')
ORDER BY proname;

-- 3) Quantas OS existem em cada etapa AGORA (sem RLS — vc é dono no SQL Editor)
SELECT etapa, count(*) AS total
FROM os
WHERE deleted_at IS NULL
GROUP BY etapa
ORDER BY etapa;
