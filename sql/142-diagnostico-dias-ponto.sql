-- Passo 1 de 2: Diagnóstico dos dias problemáticos
-- Cole o resultado aqui embaixo antes de rodar o SQL 143

-- 1) Ver o que tem em cada dia errado
SELECT
  u.apelido,
  u.papel,
  date(bateu_em AT TIME ZONE 'America/Cuiaba')          AS dia,
  to_char(bateu_em AT TIME ZONE 'America/Cuiaba','Dy')  AS dia_semana,
  to_char(bateu_em AT TIME ZONE 'America/Cuiaba','HH24:MI') AS hora,
  tipo,
  left(pr.id::text, 8)                                   AS id_curto
FROM ponto_registro pr
JOIN usuarios u ON u.id = pr.funcionario_id
WHERE u.papel IN ('logistica', 'oficina')
  AND pr.deleted_at IS NULL
  AND date(bateu_em AT TIME ZONE 'America/Cuiaba') IN (
    -- Alessandro
    '2026-09-11', '2026-09-07', '2026-08-27', '2026-07-21',
    -- Guilherme
    '2026-09-04', '2026-09-09', '2026-09-12',
    '2026-09-16', '2026-09-18', '2026-09-23',
    '2026-09-24', '2026-09-25', '2026-09-28'
  )
ORDER BY u.apelido DESC, bateu_em;

-- 2) Médias por pessoa/mês/tipo (excluindo os dias problemáticos)
SELECT
  u.apelido,
  to_char(date_trunc('month', bateu_em AT TIME ZONE 'America/Cuiaba'), 'YYYY-MM') AS mes,
  tipo,
  to_char(
    make_time(
      ( AVG(
          EXTRACT(HOUR  FROM (bateu_em AT TIME ZONE 'America/Cuiaba')::time) * 60 +
          EXTRACT(MINUTE FROM (bateu_em AT TIME ZONE 'America/Cuiaba')::time)
        ) / 60 )::int,
      ( AVG(
          EXTRACT(HOUR  FROM (bateu_em AT TIME ZONE 'America/Cuiaba')::time) * 60 +
          EXTRACT(MINUTE FROM (bateu_em AT TIME ZONE 'America/Cuiaba')::time)
        ) % 60 )::int,
      0
    ),
    'HH24:MI'
  ) AS media_hora,
  COUNT(*) AS n_dias
FROM ponto_registro pr
JOIN usuarios u ON u.id = pr.funcionario_id
WHERE u.papel IN ('logistica', 'oficina')
  AND pr.deleted_at IS NULL
  AND tipo IN ('entrada','saida_almoco','volta_almoco','saida')
  AND bateu_em >= '2026-07-01' AND bateu_em < '2026-10-01'
  -- exclui os dias que vamos corrigir
  AND date(bateu_em AT TIME ZONE 'America/Cuiaba') NOT IN (
    '2026-09-11','2026-09-07','2026-08-27','2026-07-21',
    '2026-09-04','2026-09-09','2026-09-12',
    '2026-09-16','2026-09-18','2026-09-23',
    '2026-09-24','2026-09-25','2026-09-28'
  )
GROUP BY u.apelido, mes, tipo
ORDER BY u.apelido DESC, mes, tipo;
