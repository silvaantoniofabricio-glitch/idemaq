-- 125-teste-mover-pagamento-vs-concluido.sql
-- DISCRIMINADOR (rollback, não altera nada). Simula o Alessandro movendo a
-- OS #1694 pra 'pagamento' (NÃO concluido). Mesmo trigger de histórico dispara,
-- mesma policy. Só muda o valor de destino.
--
-- Resultado esperado:
--   · "Success. No rows returned"  → mover pra 'pagamento' PASSA. Então o
--     bloqueio é ESPECÍFICO de 'concluido' (algo além destas 4 policies).
--   · Erro de RLS                  → funcionário não move essa OS de jeito
--     nenhum → o problema é mais amplo (USING/role).
--
-- RODAR o bloco inteiro e me dizer qual dos dois deu.

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
SET etapa = 'pagamento'
WHERE numero = 1694;

ROLLBACK;
