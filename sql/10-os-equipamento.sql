-- sql/10-os-equipamento.sql
-- Adiciona colunas de equipamento na tabela `os`. Antes essas colunas eram
-- referenciadas em vários lugares do código (NovaOSModal payload,
-- osDerivada.CAMPOS_ORIGEM, seed-os-teste, osPatch.UI_TO_DB) mas NUNCA
-- existiram em prod — confirmado em 20/05/2026 via probe que retornou
-- PostgREST 42703 (SELECT) e PGRST204 (INSERT, schema cache).
--
-- Sintoma: criar OS dava "Could not find the 'defeito_relatado' column".
-- Editar equipamento via FormEquipamentoEdit chegava a fazer optimistic
-- update mas o UPDATE no banco silenciosamente não acontecia.
--
-- DEPENDENTES (descomentar/reativar após aplicar este SQL):
--  1. `src/_legacy/desktopKanbanModals.jsx` — voltar a colocar
--     marca_equipamento/modelo_equipamento/defeito_relatado no payload de
--     NovaOSModal.salvar().
--  2. `src/utils/osPatch.js` — adicionar de volta as 3 chaves no
--     COLUNAS_SAFE pra FormEquipamentoEdit persistir.
--  3. `src/hooks/useOS.js` — incluir as 3 colunas no SELECT e mapear no
--     return (em vez de hardcoded `''`).
--
-- Como rodar:
--   Supabase Dashboard → SQL Editor → cola este script inteiro → Run.

BEGIN;

ALTER TABLE os
  ADD COLUMN IF NOT EXISTS marca_equipamento  text,
  ADD COLUMN IF NOT EXISTS modelo_equipamento text,
  ADD COLUMN IF NOT EXISTS numero_serie       text,
  ADD COLUMN IF NOT EXISTS defeito_relatado   text;

COMMENT ON COLUMN os.marca_equipamento  IS 'Marca da máquina (Brastemp, Electrolux, etc.) — texto livre por enquanto.';
COMMENT ON COLUMN os.modelo_equipamento IS 'Modelo da máquina.';
COMMENT ON COLUMN os.numero_serie       IS 'Número de série gravado na máquina (quando legível).';
COMMENT ON COLUMN os.defeito_relatado   IS 'Defeito relatado pelo cliente na abertura da OS.';

-- PostgREST reload do schema cache (sem isso o INSERT/SELECT continua dando
-- PGRST204 mesmo com a coluna criada).
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verificação pós-apply (opcional — descomentar e rodar separado):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'os'
--   AND column_name IN ('marca_equipamento','modelo_equipamento','numero_serie','defeito_relatado');
