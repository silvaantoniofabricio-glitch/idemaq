-- sql/18-rota-constraint-fix.sql
-- Garante que o UNIQUE constraint da tabela `rota` é o correto: (data,
-- motorista_id, nome). Em prod (21/05/2026 noite) descobrimos que Rota A
-- é criada com sucesso mas B e C falham silenciosamente — o sintoma bate
-- com o constraint antigo `rota_data_motorista_unico (data, motorista_id)`
-- ainda existindo (sql/17 deve ter rodado parcial — só o ADD COLUMN passou).
--
-- Idempotente: pode rodar várias vezes sem quebrar.
--
-- DIAGNÓSTICO ANTES (opcional):
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'rota'::regclass AND contype = 'u';

BEGIN;

-- 1. Garantia: coluna `nome` existe (caso sql/17 não tenha rodado ainda)
ALTER TABLE rota ADD COLUMN IF NOT EXISTS nome text;

COMMENT ON COLUMN rota.nome IS
  'Nome visual da rota (ex.: Rota A, Rota B, Rota C). Permite múltiplas rotas '
  'por dia/motorista — slot de planejamento, sem semântica de DB.';

-- 2. DROP do constraint antigo — em vários nomes possíveis pra cobrir todos
--    os caminhos de migração (sql/06 original, naming alternativo, etc).
ALTER TABLE rota DROP CONSTRAINT IF EXISTS rota_data_motorista_unico;
ALTER TABLE rota DROP CONSTRAINT IF EXISTS rota_data_motorista_key;
ALTER TABLE rota DROP CONSTRAINT IF EXISTS unique_rota_data_motorista;

-- 3. ADD do constraint novo (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rota_data_motorista_nome_unico'
  ) THEN
    ALTER TABLE rota
      ADD CONSTRAINT rota_data_motorista_nome_unico
      UNIQUE (data, motorista_id, nome);
  END IF;
END $$;

COMMIT;

-- VERIFICAÇÃO depois de rodar (cole no SQL Editor):
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'rota'::regclass AND contype = 'u';
--
-- Esperado: 1 linha com `rota_data_motorista_nome_unico UNIQUE (data, motorista_id, nome)`.
-- Se aparecer também o `rota_data_motorista_unico`, ele não foi dropado — investigar.
