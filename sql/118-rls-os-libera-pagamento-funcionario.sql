-- 118-rls-os-libera-pagamento-funcionario.sql
-- Corrige RLS da tabela `os`: hoje `os_select` e `os_update` bloqueiam
-- QUALQUER não-dono de ler/escrever OS nas etapas 'pagamento' E 'concluido'.
--
-- Isso contradiz a regra de negócio (contexto-os.md, 21/05/2026): "Pagamento"
-- foi liberado pro funcionário — eles precisam ver e dar baixa do
-- recebimento. Só "Concluído" é realmente admin-only (CLAUDE.md §10).
--
-- Efeito prático do bug: funcionário não enxergava direito OS em "A receber"
-- (SELECT bloqueado) e tomava "Erro ao mover OS — revertido" ao confirmar
-- entrega de OS ainda não paga (UPDATE pra etapa='pagamento' rejeitado).
--
-- Fix: as duas policies passam a excluir só 'concluido' pra não-dono.

DROP POLICY IF EXISTS os_select ON os;
CREATE POLICY os_select ON os
  FOR SELECT
  USING (
    is_dono()
    OR (auth.role() = 'authenticated' AND etapa <> 'concluido'::os_etapa)
  );

DROP POLICY IF EXISTS os_update ON os;
CREATE POLICY os_update ON os
  FOR UPDATE
  USING (
    is_dono()
    OR (auth.role() = 'authenticated' AND etapa <> 'concluido'::os_etapa)
  )
  WITH CHECK (
    is_dono()
    OR (auth.role() = 'authenticated' AND etapa <> 'concluido'::os_etapa)
  );

-- Conferir depois (deve devolver os_select e os_update SEM 'pagamento' na condição):
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname='public' AND tablename='os';
