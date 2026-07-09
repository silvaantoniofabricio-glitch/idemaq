-- 126-listar-triggers-os.sql
-- UMA query só. Lista TODOS os triggers da tabela `os`. Procuro um segundo
-- trigger (além do tg_os_historico) que dispare quando a etapa vira 'concluido'
-- e escreva de volta em `os` — é o suspeito nº1 do "new row violates RLS for
-- table os" que só acontece com destino 'concluido'.
--
-- Me manda a tabela inteira (trigger_nome, quando, evento, funcao, security_definer).

SELECT
  t.tgname AS trigger_nome,
  CASE WHEN (t.tgtype::int & 2) <> 0 THEN 'BEFORE' ELSE 'AFTER' END AS quando,
  CASE
    WHEN (t.tgtype::int & 4)  <> 0 THEN 'INSERT'
    WHEN (t.tgtype::int & 8)  <> 0 THEN 'DELETE'
    WHEN (t.tgtype::int & 16) <> 0 THEN 'UPDATE'
    ELSE 'MULTI'
  END AS evento,
  p.proname   AS funcao,
  p.prosecdef AS security_definer,
  pg_get_triggerdef(t.oid) AS definicao
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'os'::regclass AND NOT t.tgisinternal
ORDER BY t.tgname;
