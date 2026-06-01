-- sql/71-os-tipo-equipamento.sql
-- Adiciona coluna `tipo_equipamento` na tabela `os`.
-- Valores esperados: 'lavadora', 'lava_loucas', 'microondas', 'outros'
-- Padrão NULL (equivale a 'lavadora' para OS antigas).
--
-- Como rodar:
--   Supabase Dashboard → SQL Editor → cola este script inteiro → Run.

BEGIN;

ALTER TABLE os
  ADD COLUMN IF NOT EXISTS tipo_equipamento text;

COMMENT ON COLUMN os.tipo_equipamento IS 'Tipo do equipamento: lavadora | lava_loucas | microondas | outros. NULL = lavadora (legado).';

NOTIFY pgrst, 'reload schema';

COMMIT;
