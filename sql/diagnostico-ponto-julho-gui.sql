-- Diagnóstico: todos os registros de ponto do Guilherme em julho/2026
-- incluindo deletados (soft-delete)
-- Rodar no Supabase SQL Editor

SELECT
  (bateu_em AT TIME ZONE 'America/Cuiaba')::date          AS dia,
  to_char(bateu_em AT TIME ZONE 'America/Cuiaba', 'Dy')   AS dia_semana,
  to_char(bateu_em AT TIME ZONE 'America/Cuiaba', 'HH24:MI') AS hora,
  tipo,
  CASE WHEN deleted_at IS NOT NULL THEN 'DELETADO' ELSE '' END AS status,
  left(id::text, 8)                                        AS id_curto
FROM ponto_registro
WHERE funcionario_id = (
  SELECT id FROM usuarios WHERE papel = 'oficina' LIMIT 1
)
AND bateu_em >= '2026-07-01'
AND bateu_em <  '2026-08-01'
ORDER BY bateu_em;
