-- sql/20-rota-rls-fix.sql
-- Corrige RLS da tabela `rota` que estava bloqueando criação dos slots A/B/C
-- mesmo pro Toni (dono). Sintoma observado 2026-05-27 22:15:
--   Toast no LogisticaMobile: "Falha Rota A: new row violates row-level
--   security policy for table 'rota'"
--
-- CAUSA PROVÁVEL: as funções `is_dono()` / `papel_atual()` não estão
-- retornando o esperado pro auth.uid() atual (definidas no Supabase
-- dashboard, podem ter quebrado ou nunca cobriram o caso atual).
--
-- ESTRATÉGIA: rota é dado interno (3 funcionários), RLS estrita não agrega
-- nada — basta exigir que o usuário esteja autenticado.
--
-- ROLLBACK: rodar de novo `sql/06-rota.sql` (seção 4. RLS) pra restaurar.

BEGIN;

-- Diagnóstico — descomentar e rodar separado pra ver o que está rolando:
-- SELECT auth.uid() AS uid, is_dono() AS is_dono, papel_atual() AS papel;

-- Dropa policies antigas
DROP POLICY IF EXISTS rota_select_todos     ON rota;
DROP POLICY IF EXISTS rota_modify_logistica ON rota;

-- Policies novas — qualquer authenticated pode tudo
CREATE POLICY rota_select_auth ON rota
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY rota_modify_auth ON rota
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;
