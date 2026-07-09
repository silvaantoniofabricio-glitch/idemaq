-- 128-fonte-tg-set-audit.sql
-- UMA query. Mostra a fonte dos 2 triggers cujo código eu ainda não vi
-- (tg_set_audit roda BEFORE em TODO UPDATE — é o último suspeito do bloqueio
-- que só ocorre quando etapa vira 'concluido'). Me manda o prosrc dos dois.

SELECT proname, prosecdef AS security_definer, prosrc
FROM pg_proc
WHERE proname IN ('tg_set_audit', 'tg_os_numero');
