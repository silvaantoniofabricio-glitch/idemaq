-- Query A: verificar timezone (rode com qualquer batida conhecida)
-- Esperado: hora_local deve mostrar ~07:55 pra Alessandro na entrada do dia 02/07
SELECT
  bateu_em                                                    AS utc_raw,
  bateu_em - INTERVAL '4 hours'                              AS local_menos4h,
  bateu_em AT TIME ZONE 'America/Cuiaba'                     AS cuiaba_tz,
  bateu_em AT TIME ZONE 'America/Campo_Grande'               AS campo_grande_tz,
  bateu_em AT TIME ZONE 'UTC-4'                              AS utc_menos4
FROM ponto_registro
WHERE date(bateu_em - INTERVAL '4 hours') = '2026-07-02'
  AND tipo = 'entrada'
  AND deleted_at IS NULL
LIMIT 1;

-- Query B: registros dos dias problemáticos
SELECT
  u.apelido,
  date(bateu_em - INTERVAL '4 hours')                        AS dia,
  to_char(bateu_em - INTERVAL '4 hours', 'HH24:MI')          AS hora_local,
  tipo,
  left(pr.id::text, 8)                                       AS id_curto
FROM ponto_registro pr
JOIN usuarios u ON u.id = pr.funcionario_id
WHERE u.papel IN ('logistica', 'oficina')
  AND pr.deleted_at IS NULL
  AND date(bateu_em - INTERVAL '4 hours') IN (
    '2026-09-11','2026-09-07','2026-08-27','2026-07-21',
    '2026-09-04','2026-09-09','2026-09-12',
    '2026-09-16','2026-09-18','2026-09-23',
    '2026-09-24','2026-09-25','2026-09-28'
  )
ORDER BY u.apelido DESC, bateu_em;
