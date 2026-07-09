-- 129-testar-fix-os-select-concluir.sql
-- TESTE da hipótese/correção (transação inteira com ROLLBACK — NÃO altera nada
-- de verdade, nem a policy nem a OS).
--
-- Hipótese: o funcionário não conclui a OS porque o Postgres exige que a linha
-- resultante (etapa='concluido') seja VISÍVEL pra ele, e a os_select esconde
-- 'concluido' de quem não é dono. Solução testada: os_select passa a deixar
-- qualquer authenticated enxergar (a coluna Concluído continua escondida na
-- TELA do funcionário — isso é no app, não no banco).
--
-- Resultado esperado:
--   · "ROLLBACK" sem erro  → a correção funciona. Aí eu aplico de verdade.
--   · Erro de RLS          → a causa é outra e sigo.

BEGIN;

-- correção tentativa (só dentro desta transação)
DROP POLICY IF EXISTS os_select ON os;
CREATE POLICY os_select ON os
  FOR SELECT
  USING (is_dono() OR auth.role() = 'authenticated');

-- simula o Alessandro concluindo a OS #1694
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
SET etapa = 'concluido', data_conclusao = now()
WHERE numero = 1694;

-- desfaz TUDO (policy + update) — isso foi só um teste
ROLLBACK;
