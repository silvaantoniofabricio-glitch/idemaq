-- 130-fix-definitivo-funcionario-conclui-os.sql
-- CAUSA RAIZ do "Erro ao mover OS — revertido" quando o FUNCIONÁRIO conclui
-- uma OS paga na entrega:
--   O Postgres NÃO deixa um usuário gravar/atualizar uma linha que ele mesmo
--   não conseguiria enxergar (SELECT). Como a os_select escondia 'concluido'
--   de quem não é dono, o funcionário não conseguia LEVAR uma OS até
--   'concluido' — a linha resultante seria invisível pra ele → RLS barra.
--   (Testado e confirmado em sql/129: liberando o SELECT, a conclusão passa.)
--
-- FIX: os_select deixa qualquer authenticated enxergar as OS. Não afrouxa a
-- experiência do funcionário — a TELA dele já esconde a coluna "Concluído"
-- (adminOnly em osData.js + filtro JS no OSMobile), inclusive na busca. Ou
-- seja, o funcionário continua sem ver OS concluídas no app; a regra do banco
-- era só redundância que estava travando a conclusão.
--
-- os_update segue igual: USING ainda impede o funcionário de EDITAR uma OS que
-- JÁ está concluída (não pode "reabrir"/mexer no que virou concluído), e o
-- WITH CHECK exige só authenticated (pode levar até concluido).
--
-- RODAR NO SQL EDITOR DO SUPABASE.

DROP POLICY IF EXISTS os_select ON os;
CREATE POLICY os_select ON os
  FOR SELECT
  USING (auth.role() = 'authenticated' OR is_dono());

-- Reafirma o os_update no estado correto (idempotente):
DROP POLICY IF EXISTS os_update ON os;
CREATE POLICY os_update ON os
  FOR UPDATE
  USING (
    is_dono()
    OR (auth.role() = 'authenticated' AND etapa <> 'concluido'::os_etapa)
  )
  WITH CHECK (auth.role() = 'authenticated');

-- Conferência:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname='public' AND tablename='os' ORDER BY policyname;
