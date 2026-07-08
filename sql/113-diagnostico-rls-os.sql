-- 113-diagnostico-rls-os.sql
-- SÓ LEITURA — lista as policies de RLS hoje ativas na tabela `os`.
--
-- Por quê: funcionário reportou "Erro ao mover OS — revertido" ao confirmar
-- entrega de uma OS NÃO paga (deveria ir pra etapa 'pagamento'). O código da
-- tela já libera "A receber"/Pagamento pro funcionário desde 21/05/2026
-- (osData.js só marca 'concluido' como adminOnly), mas a REGRA DE SEGURANÇA
-- do banco (RLS) pode não ter sido atualizada junto — rodar isso mostra a
-- condição exata de cada policy pra confirmar.

SELECT policyname, cmd, roles, qual AS condicao_using, with_check AS condicao_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'os';
