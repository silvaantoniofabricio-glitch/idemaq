-- 146-diag-rls-os-item.sql
-- SÓ LEITURA. Mostra as regras de segurança (RLS) da tabela `os_item` —
-- suspeita: alguma condição ali está bloqueando a busca do filtro de
-- serviço (Limpeza/Manutenção) mesmo pro dono logado.

SELECT policyname, cmd, roles, qual AS condicao_using, with_check AS condicao_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'os_item';
