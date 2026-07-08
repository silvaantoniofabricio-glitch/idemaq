-- 122-ver-o-que-banco-enxerga-funcionario.sql
-- DIAGNÓSTICO (só leitura, rollback) — impersona o Alessandro e mostra o que
-- as funções de auth retornam. Isso diz se o "new row violates RLS" é real ou
-- se foi só artefato da simulação (formato do JWT claims).
--
-- RODAR O BLOCO INTEIRO. Me manda a linha de resultado (role_visto / uid_visto
-- / eh_dono).

BEGIN;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',   (SELECT id::text FROM usuarios WHERE papel = 'logistica' AND ativo = true LIMIT 1),
    'role',  'authenticated',
    'email', (SELECT email FROM usuarios WHERE papel = 'logistica' AND ativo = true LIMIT 1)
  )::text,
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub',
  (SELECT id::text FROM usuarios WHERE papel = 'logistica' AND ativo = true LIMIT 1), true);
SET LOCAL role authenticated;

SELECT
  auth.role()      AS role_visto,
  auth.uid()       AS uid_visto,
  public.is_dono() AS eh_dono;

ROLLBACK;
