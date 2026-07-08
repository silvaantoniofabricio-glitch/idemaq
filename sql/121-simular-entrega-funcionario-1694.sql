-- 121-simular-entrega-funcionario-1694.sql
-- DIAGNÓSTICO — reproduz EXATAMENTE o que o app do Alessandro faz ao confirmar
-- a entrega da OS #1694 (mover pra 'concluido'), mas dentro de uma transação
-- que faz ROLLBACK no fim: NADA é alterado de verdade na produção.
--
-- Objetivo: fazer o Postgres cuspir a mensagem de erro REAL (RLS? trigger?
-- constraint?) em vez de a gente ficar adivinhando pelo "revertido" genérico
-- que o app mostra.
--
-- RODAR O BLOCO INTEIRO no SQL Editor do Supabase e me mandar:
--   · ou a mensagem de ERRO que aparecer (é o que eu quero ver), OU
--   · "Success. No rows returned" (aí o banco aceita — o problema é no app).

BEGIN;

-- Impersona o Alessandro (papel logistica) como usuário autenticado
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  (SELECT id FROM usuarios WHERE papel = 'logistica' AND ativo = true LIMIT 1)::text,
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL role authenticated;

-- A ação exata do "Entregue · Concluir OS"
UPDATE os
SET etapa = 'concluido', data_conclusao = now()
WHERE numero = 1694;

-- Desfaz tudo — só queríamos ver se o banco aceita ou reclama
ROLLBACK;
