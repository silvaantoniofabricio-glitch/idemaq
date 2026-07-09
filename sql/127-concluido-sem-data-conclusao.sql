-- 127-concluido-sem-data-conclusao.sql
-- Isola o confound: o teste que FALHOU (sql/121) escrevia etapa='concluido'
-- E data_conclusao=now(); o que PASSOU (sql/125) só escrevia etapa. Aqui
-- testo etapa='concluido' SOZINHO (sem data_conclusao), com rollback.
--
--   · Erro de RLS  → é o VALOR 'concluido' mesmo (não a coluna data_conclusao)
--   · Success      → o problema era escrever data_conclusao, não o concluido
--
-- Se der erro, por favor expande e me manda também a linha "DETAIL:" (o
-- Supabase às vezes mostra "Failing row contains (...)").

BEGIN;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  (SELECT id::text FROM usuarios WHERE papel = 'logistica' AND ativo = true LIMIT 1),
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL role authenticated;

UPDATE os
SET etapa = 'concluido'
WHERE numero = 1694;

ROLLBACK;
