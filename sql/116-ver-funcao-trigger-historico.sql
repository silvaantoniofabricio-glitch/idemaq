-- Só leitura — mostra o código da função do trigger que grava os_historico
SELECT prosrc FROM pg_proc WHERE proname = 'tg_os_historico';
