-- sql/19-rota-duplicatas-cleanup.sql
-- Limpa duplicatas de rota (data, nome) e recria o UNIQUE constraint com
-- NULLS NOT DISTINCT pra não permitir mais o problema.
--
-- CAUSA RAIZ (21/05/2026 noite):
--   Postgres trata NULL como distinto em UNIQUE por padrão. Como o front
--   cria rotas com motorista_id=NULL, o UNIQUE (data, motorista_id, nome)
--   permitiu múltiplas linhas com mesmo (data, NULL, 'Rota B'). Toni
--   reportou "Rota B e C somem/duplicam paradas sozinho" — sintoma clássico
--   de slotsRotas.find() pegar uma duplicata diferente a cada fetchAll().
--
-- SOLUÇÃO:
--   1. SOFT-DELETE das duplicatas, mantendo só a que tem MAIS paradas
--      (preserva o trabalho do Toni). Empate → mantém a mais antiga.
--   2. DROP do constraint atual.
--   3. RECRIATE com NULLS NOT DISTINCT (PG 15+) — NULL passa a contar
--      como valor único, então 2 inserts com mesmo (data, NULL, 'Rota B')
--      vão dar UNIQUE violation conforme esperado.
--
-- IDEMPOTENTE: pode rodar várias vezes. Após 1ª rodada, não há mais
-- duplicatas, então o UPDATE não afeta nada.

BEGIN;

-- 1. Diagnóstico (loga no SQL Editor o que vai mudar)
DO $$
DECLARE
  qtd_dup integer;
BEGIN
  SELECT COUNT(*) INTO qtd_dup
  FROM (
    SELECT data, motorista_id, nome, COUNT(*) AS n
    FROM rota
    WHERE deleted_at IS NULL
    GROUP BY data, motorista_id, nome
    HAVING COUNT(*) > 1
  ) t;
  RAISE NOTICE '[sql/19] grupos (data,motorista_id,nome) com duplicatas: %', qtd_dup;
END $$;

-- 2. Soft-delete das duplicatas (mantém a com mais paradas; empate → mais antiga)
WITH ranked AS (
  SELECT
    id,
    data,
    nome,
    jsonb_array_length(COALESCE(paradas, '[]'::jsonb)) AS qtd_paradas,
    criado_em,
    ROW_NUMBER() OVER (
      PARTITION BY data, motorista_id, nome
      ORDER BY jsonb_array_length(COALESCE(paradas, '[]'::jsonb)) DESC,
               criado_em ASC
    ) AS rk
  FROM rota
  WHERE deleted_at IS NULL
)
UPDATE rota
SET deleted_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rk > 1);

-- 3. Drop do constraint atual (tanto o nome novo quanto o antigo, defensivo)
ALTER TABLE rota DROP CONSTRAINT IF EXISTS rota_data_motorista_nome_unico;
ALTER TABLE rota DROP CONSTRAINT IF EXISTS rota_data_motorista_unico;

-- 4. Recria com NULLS NOT DISTINCT — agora NULL conta como valor único
ALTER TABLE rota
  ADD CONSTRAINT rota_data_motorista_nome_unico
  UNIQUE NULLS NOT DISTINCT (data, motorista_id, nome);

COMMIT;

-- VERIFICAÇÃO (rode depois, separado):
--   -- Constraint correta?
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'rota'::regclass AND contype = 'u';
--   -- Esperado: rota_data_motorista_nome_unico UNIQUE NULLS NOT DISTINCT (data, motorista_id, nome)
--
--   -- Ainda há duplicatas?
--   SELECT data, motorista_id, nome, COUNT(*)
--   FROM rota WHERE deleted_at IS NULL
--   GROUP BY data, motorista_id, nome
--   HAVING COUNT(*) > 1;
--   -- Esperado: 0 linhas
