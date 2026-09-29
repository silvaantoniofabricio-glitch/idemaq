-- sql/143-correcoes-ponto-jul-ago-set-2026.sql
-- Correções de ponto: Alessandro (4 itens) + Guilherme (9 dias)
-- Regra: média real do mês/tipo (sem cap)
-- Timezone: bateu_em - INTERVAL '4 hours' = hora local (UTC-4 fixo, sem DST)
-- Construção UTC: 'YYYY-MM-DD 00:00:00+00'::timestamptz + INTERVAL '4 hours' + avg_min * INTERVAL '1 minute'

DO $$
DECLARE
  ale_id  uuid;
  gui_id  uuid;

  -- Médias em minutos desde meia-noite (hora local)
  ale_jul_saida_min    int;
  ale_ago_saida_min    int;

  gui_set_entrada_min   int;
  gui_set_saida_alm_min int;
  gui_set_volta_alm_min int;
  gui_set_saida_min     int;

  v_ts timestamptz;

  -- (sem cap — usa média bruta)

BEGIN
  SELECT id INTO ale_id FROM usuarios WHERE papel = 'logistica' LIMIT 1;
  SELECT id INTO gui_id FROM usuarios WHERE papel = 'oficina'   LIMIT 1;
  RAISE NOTICE 'Alessandro id: %  |  Guilherme id: %', ale_id, gui_id;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1. CALCULAR MÉDIAS (excluindo os próprios dias a corrigir)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Alessandro · julho · saida  (exclui 21/07 + sábados)
  SELECT ROUND(AVG(
    EXTRACT(HOUR   FROM (bateu_em - INTERVAL '4 hours')::time)::numeric * 60 +
    EXTRACT(MINUTE FROM (bateu_em - INTERVAL '4 hours')::time)::numeric
  ))::int INTO ale_jul_saida_min
  FROM ponto_registro
  WHERE funcionario_id = ale_id AND tipo = 'saida' AND deleted_at IS NULL
    AND date(bateu_em - INTERVAL '4 hours') >= '2026-07-01'
    AND date(bateu_em - INTERVAL '4 hours') <  '2026-08-01'
    AND EXTRACT(DOW FROM date(bateu_em - INTERVAL '4 hours')) BETWEEN 1 AND 5
    AND date(bateu_em - INTERVAL '4 hours') <> '2026-07-21';
  ale_jul_saida_min := COALESCE(ale_jul_saida_min, 1080);
  RAISE NOTICE 'Ale Jul saida avg: %min  (= %h%m)', ale_jul_saida_min, ale_jul_saida_min/60, ale_jul_saida_min%60;

  -- Alessandro · agosto · saida  (exclui 27/08 + sábados)
  SELECT ROUND(AVG(
    EXTRACT(HOUR   FROM (bateu_em - INTERVAL '4 hours')::time)::numeric * 60 +
    EXTRACT(MINUTE FROM (bateu_em - INTERVAL '4 hours')::time)::numeric
  ))::int INTO ale_ago_saida_min
  FROM ponto_registro
  WHERE funcionario_id = ale_id AND tipo = 'saida' AND deleted_at IS NULL
    AND date(bateu_em - INTERVAL '4 hours') >= '2026-08-01'
    AND date(bateu_em - INTERVAL '4 hours') <  '2026-09-01'
    AND EXTRACT(DOW FROM date(bateu_em - INTERVAL '4 hours')) BETWEEN 1 AND 5
    AND date(bateu_em - INTERVAL '4 hours') <> '2026-08-27';
  ale_ago_saida_min := COALESCE(ale_ago_saida_min, 1080);
  RAISE NOTICE 'Ale Ago saida avg: %min  (= %h%m)', ale_ago_saida_min, ale_ago_saida_min/60, ale_ago_saida_min%60;

  -- Guilherme · setembro · entrada  (exclui os 9 dias problemáticos + sábados)
  SELECT ROUND(AVG(
    EXTRACT(HOUR   FROM (bateu_em - INTERVAL '4 hours')::time)::numeric * 60 +
    EXTRACT(MINUTE FROM (bateu_em - INTERVAL '4 hours')::time)::numeric
  ))::int INTO gui_set_entrada_min
  FROM ponto_registro
  WHERE funcionario_id = gui_id AND tipo = 'entrada' AND deleted_at IS NULL
    AND date(bateu_em - INTERVAL '4 hours') >= '2026-09-01'
    AND date(bateu_em - INTERVAL '4 hours') <  '2026-10-01'
    AND EXTRACT(DOW FROM date(bateu_em - INTERVAL '4 hours')) BETWEEN 1 AND 5
    AND date(bateu_em - INTERVAL '4 hours') NOT IN (
      '2026-09-04','2026-09-09','2026-09-12','2026-09-16','2026-09-18',
      '2026-09-23','2026-09-24','2026-09-25','2026-09-28'
    );
  gui_set_entrada_min := COALESCE(gui_set_entrada_min, 480);
  RAISE NOTICE 'Gui Set entrada avg: %min  (= %h%m)', gui_set_entrada_min, gui_set_entrada_min/60, gui_set_entrada_min%60;

  -- Guilherme · setembro · saida_almoco  (exclui problemáticos + sábados)
  SELECT ROUND(AVG(
    EXTRACT(HOUR   FROM (bateu_em - INTERVAL '4 hours')::time)::numeric * 60 +
    EXTRACT(MINUTE FROM (bateu_em - INTERVAL '4 hours')::time)::numeric
  ))::int INTO gui_set_saida_alm_min
  FROM ponto_registro
  WHERE funcionario_id = gui_id AND tipo = 'saida_almoco' AND deleted_at IS NULL
    AND date(bateu_em - INTERVAL '4 hours') >= '2026-09-01'
    AND date(bateu_em - INTERVAL '4 hours') <  '2026-10-01'
    AND EXTRACT(DOW FROM date(bateu_em - INTERVAL '4 hours')) BETWEEN 1 AND 5
    AND date(bateu_em - INTERVAL '4 hours') NOT IN (
      '2026-09-04','2026-09-09','2026-09-12','2026-09-16','2026-09-18',
      '2026-09-23','2026-09-24','2026-09-25','2026-09-28'
    );
  gui_set_saida_alm_min := COALESCE(gui_set_saida_alm_min, 660);
  RAISE NOTICE 'Gui Set saida_almoco avg: %min  (= %h%m)', gui_set_saida_alm_min, gui_set_saida_alm_min/60, gui_set_saida_alm_min%60;

  -- Guilherme · setembro · volta_almoco  (exclui problemáticos + sábados)
  SELECT ROUND(AVG(
    EXTRACT(HOUR   FROM (bateu_em - INTERVAL '4 hours')::time)::numeric * 60 +
    EXTRACT(MINUTE FROM (bateu_em - INTERVAL '4 hours')::time)::numeric
  ))::int INTO gui_set_volta_alm_min
  FROM ponto_registro
  WHERE funcionario_id = gui_id AND tipo = 'volta_almoco' AND deleted_at IS NULL
    AND date(bateu_em - INTERVAL '4 hours') >= '2026-09-01'
    AND date(bateu_em - INTERVAL '4 hours') <  '2026-10-01'
    AND EXTRACT(DOW FROM date(bateu_em - INTERVAL '4 hours')) BETWEEN 1 AND 5
    AND date(bateu_em - INTERVAL '4 hours') NOT IN (
      '2026-09-04','2026-09-09','2026-09-12','2026-09-16','2026-09-18',
      '2026-09-23','2026-09-24','2026-09-25','2026-09-28'
    );
  gui_set_volta_alm_min := COALESCE(gui_set_volta_alm_min, 780);
  RAISE NOTICE 'Gui Set volta_almoco avg: %min  (= %h%m)', gui_set_volta_alm_min, gui_set_volta_alm_min/60, gui_set_volta_alm_min%60;

  -- Guilherme · setembro · saida  (exclui problemáticos + sábados)
  SELECT ROUND(AVG(
    EXTRACT(HOUR   FROM (bateu_em - INTERVAL '4 hours')::time)::numeric * 60 +
    EXTRACT(MINUTE FROM (bateu_em - INTERVAL '4 hours')::time)::numeric
  ))::int INTO gui_set_saida_min
  FROM ponto_registro
  WHERE funcionario_id = gui_id AND tipo = 'saida' AND deleted_at IS NULL
    AND date(bateu_em - INTERVAL '4 hours') >= '2026-09-01'
    AND date(bateu_em - INTERVAL '4 hours') <  '2026-10-01'
    AND EXTRACT(DOW FROM date(bateu_em - INTERVAL '4 hours')) BETWEEN 1 AND 5
    AND date(bateu_em - INTERVAL '4 hours') NOT IN (
      '2026-09-04','2026-09-09','2026-09-12','2026-09-16','2026-09-18',
      '2026-09-23','2026-09-24','2026-09-25','2026-09-28'
    );
  gui_set_saida_min := COALESCE(gui_set_saida_min, 1080);
  RAISE NOTICE 'Gui Set saida avg: %min  (= %h%m)', gui_set_saida_min, gui_set_saida_min/60, gui_set_saida_min%60;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2. CORREÇÕES ALESSANDRO
  -- ═══════════════════════════════════════════════════════════════════════════

  -- [Ale-1] 11/09 — soft-delete entrada duplicada às 13:00 (#24d03708)
  --   O dia já tem: 07:57 entrada correta + 13:00 volta_almoco correto
  --   O #24d03708 é uma entrada extra às 13:00 que não deveria existir
  UPDATE ponto_registro SET deleted_at = now()
  WHERE left(id::text, 8) = '24d03708';
  RAISE NOTICE '[Ale-1] 11/09: entrada duplicada 13:00 deletada (#24d03708)';

  -- [Ale-2] 07/09 — feriado (Independência)
  --   Inserir dia completo no horário padrão → não conta como falta nem mexe no banco de horas
  --   08:00=12h UTC · 11:00=15h UTC · 13:00=17h UTC · 18:00=22h UTC
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (ale_id, 'entrada',      '2026-09-07 12:00:00+00'),
         (ale_id, 'saida_almoco', '2026-09-07 15:00:00+00'),
         (ale_id, 'volta_almoco', '2026-09-07 17:00:00+00'),
         (ale_id, 'saida',        '2026-09-07 22:00:00+00');
  RAISE NOTICE '[Ale-2] 07/09: feriado marcado (dia completo 08:00–18:00 local)';

  -- [Ale-3] 27/08 — saida não batida
  v_ts := '2026-08-27 04:00:00+00'::timestamptz + (ale_ago_saida_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (ale_id, 'saida', v_ts);
  RAISE NOTICE '[Ale-3] 27/08: saida inserida %', v_ts;

  -- [Ale-4] 21/07 — saida não batida
  v_ts := '2026-07-21 04:00:00+00'::timestamptz + (ale_jul_saida_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (ale_id, 'saida', v_ts);
  RAISE NOTICE '[Ale-4] 21/07: saida inserida %', v_ts;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3. CORREÇÕES GUILHERME
  -- ═══════════════════════════════════════════════════════════════════════════

  -- [Gui-1] 04/09 — saida_almoco e volta_almoco foram batidas às 13:33 (hora errada)
  v_ts := '2026-09-04 04:00:00+00'::timestamptz + (gui_set_saida_alm_min * INTERVAL '1 minute');
  UPDATE ponto_registro SET bateu_em = v_ts
  WHERE left(id::text, 8) = '0eabc15e';
  RAISE NOTICE '[Gui-1a] 04/09: saida_almoco corrigida → % (#0eabc15e)', v_ts;

  v_ts := '2026-09-04 04:00:00+00'::timestamptz + (gui_set_volta_alm_min * INTERVAL '1 minute');
  UPDATE ponto_registro SET bateu_em = v_ts
  WHERE left(id::text, 8) = '61368dfa';
  RAISE NOTICE '[Gui-1b] 04/09: volta_almoco corrigida → % (#61368dfa)', v_ts;

  -- [Gui-2] 09/09 — saida_almoco e volta_almoco foram batidas às 18:12 (junto com saida)
  --   saida (#a894d358) às 18:12 fica como encerramento real
  v_ts := '2026-09-09 04:00:00+00'::timestamptz + (gui_set_saida_alm_min * INTERVAL '1 minute');
  UPDATE ponto_registro SET bateu_em = v_ts
  WHERE left(id::text, 8) = 'd7fd718b';
  RAISE NOTICE '[Gui-2a] 09/09: saida_almoco corrigida → % (#d7fd718b)', v_ts;

  v_ts := '2026-09-09 04:00:00+00'::timestamptz + (gui_set_volta_alm_min * INTERVAL '1 minute');
  UPDATE ponto_registro SET bateu_em = v_ts
  WHERE left(id::text, 8) = 'c75622ef';
  RAISE NOTICE '[Gui-2b] 09/09: volta_almoco corrigida → % (#c75622ef)', v_ts;

  -- [Gui-3] 12/09 — saida batida às 13:40 local, certo é 12:40 local
  --   13:40 local = 17:40 UTC  →  12:40 local = 16:40 UTC
  UPDATE ponto_registro SET bateu_em = '2026-09-12 16:40:00+00'
  WHERE left(id::text, 8) = 'd724c1be';
  RAISE NOTICE '[Gui-3] 12/09: saida corrigida 13:40→12:40 local (#d724c1be)';

  -- [Gui-4] 16/09 — saida não batida
  v_ts := '2026-09-16 04:00:00+00'::timestamptz + (gui_set_saida_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'saida', v_ts);
  RAISE NOTICE '[Gui-4] 16/09: saida inserida %', v_ts;

  -- [Gui-5] 18/09 — saida não batida
  v_ts := '2026-09-18 04:00:00+00'::timestamptz + (gui_set_saida_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'saida', v_ts);
  RAISE NOTICE '[Gui-5] 18/09: saida inserida %', v_ts;

  -- [Gui-6] 23/09 — não bateu volta_almoco nem saida
  v_ts := '2026-09-23 04:00:00+00'::timestamptz + (gui_set_volta_alm_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'volta_almoco', v_ts);
  RAISE NOTICE '[Gui-6a] 23/09: volta_almoco inserida %', v_ts;

  v_ts := '2026-09-23 04:00:00+00'::timestamptz + (gui_set_saida_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'saida', v_ts);
  RAISE NOTICE '[Gui-6b] 23/09: saida inserida %', v_ts;

  -- [Gui-7] 24/09 — bateu "dos errados": só tem entrada às 10:06, resto falta
  --   Corrige entrada para média; insere saida_almoco, volta_almoco e saida
  v_ts := '2026-09-24 04:00:00+00'::timestamptz + (gui_set_entrada_min * INTERVAL '1 minute');
  UPDATE ponto_registro SET bateu_em = v_ts
  WHERE left(id::text, 8) = '8dc5b809';
  RAISE NOTICE '[Gui-7a] 24/09: entrada corrigida 10:06 → % (#8dc5b809)', v_ts;

  v_ts := '2026-09-24 04:00:00+00'::timestamptz + (gui_set_saida_alm_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'saida_almoco', v_ts);
  RAISE NOTICE '[Gui-7b] 24/09: saida_almoco inserida %', v_ts;

  v_ts := '2026-09-24 04:00:00+00'::timestamptz + (gui_set_volta_alm_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'volta_almoco', v_ts);
  RAISE NOTICE '[Gui-7c] 24/09: volta_almoco inserida %', v_ts;

  v_ts := '2026-09-24 04:00:00+00'::timestamptz + (gui_set_saida_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'saida', v_ts);
  RAISE NOTICE '[Gui-7d] 24/09: saida inserida %', v_ts;

  -- [Gui-8] 25/09 — saida não batida
  v_ts := '2026-09-25 04:00:00+00'::timestamptz + (gui_set_saida_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'saida', v_ts);
  RAISE NOTICE '[Gui-8] 25/09: saida inserida %', v_ts;

  -- [Gui-9] 28/09 — saida não batida
  v_ts := '2026-09-28 04:00:00+00'::timestamptz + (gui_set_saida_min * INTERVAL '1 minute');
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'saida', v_ts);
  RAISE NOTICE '[Gui-9] 28/09: saida inserida %', v_ts;

  RAISE NOTICE '======================================================';
  RAISE NOTICE 'CONCLUÍDO: 4 correções Alessandro + 9 dias Guilherme.';
  RAISE NOTICE '======================================================';
END $$;
