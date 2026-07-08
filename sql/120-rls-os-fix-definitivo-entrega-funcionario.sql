-- 120-rls-os-fix-definitivo-entrega-funcionario.sql
-- FIX DEFINITIVO do "Erro ao mover OS — revertido" quando o FUNCIONÁRIO
-- confirma entrega de uma OS já paga (vai direto pra 'concluido').
--
-- Contexto: sql/118 liberou funcionário na etapa 'pagamento', mas o WITH CHECK
-- ainda barrava gravar etapa='concluido'. sql/119-rls corrigia isso — porém
-- existem DOIS arquivos numerados 119 (o outro é de pontuação), então é
-- provável que o 119 certo nunca tenha rodado. Este 120 aplica de forma
-- idempotente e imprime o resultado pra conferência.
--
-- RODAR ESTE ARQUIVO INTEIRO no SQL Editor do Supabase.

-- 1) Reaplica as duas policies no estado correto
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
  WITH CHECK (auth.role() = 'authenticated');

-- 2) Diagnóstico: mostra como as policies ficaram (me manda o resultado)
SELECT policyname, cmd, qual AS condicao_using, with_check AS condicao_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'os'
ORDER BY policyname;
