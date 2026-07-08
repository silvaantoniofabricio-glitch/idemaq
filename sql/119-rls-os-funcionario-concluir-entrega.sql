-- 119-rls-os-funcionario-concluir-entrega.sql
-- Completa o sql/118: funcionário ainda não conseguia CONCLUIR uma OS.
--
-- O fluxo "Entregue · Concluir OS" (OS já paga sendo entregue) grava
-- etapa='concluido' — e o WITH CHECK do os_update (sql/118) rejeitava
-- qualquer não-dono gravando essa etapa. Resultado: "Erro ao mover OS —
-- revertido" pro Alessandro ao confirmar entrega de OS paga.
--
-- Fix: o WITH CHECK passa a aceitar qualquer authenticated (o funcionário
-- PODE levar uma OS até 'concluido'). A proteção da coluna Concluído
-- continua garantida pelos outros dois lados:
--   · os_select segue escondendo OS concluídas de não-dono (não vê a coluna)
--   · o USING do os_update segue bloqueando não-dono de EDITAR uma OS que
--     JÁ está concluída (a linha antiga falha no USING)
-- Ou seja: funcionário consegue entrar em Concluído, mas não enxerga nem
-- mexe no que está lá.

DROP POLICY IF EXISTS os_update ON os;
CREATE POLICY os_update ON os
  FOR UPDATE
  USING (
    is_dono()
    OR (auth.role() = 'authenticated' AND etapa <> 'concluido'::os_etapa)
  )
  WITH CHECK (auth.role() = 'authenticated');

-- Conferir depois:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE schemaname='public' AND tablename='os' AND policyname='os_update';
