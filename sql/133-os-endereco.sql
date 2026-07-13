-- 133-os-endereco.sql
-- Adiciona a coluna `endereco` na tabela `os`.
--
-- Por quê: cliente pode ter até 3 endereços (endereco/endereco2/endereco3) e os
-- modais de Nova OS deixam escolher qual usar pra AQUELA OS. Só que não havia
-- onde guardar a escolha — a coluna os.endereco nunca existiu. Resultado:
--   - a OS sempre mostrava o endereço 1 do cliente (fallback no useOS)
--   - a criação de OS no MOBILE (que já mandava `endereco` no insert) FALHAVA
--     silenciosamente com "Could not find the 'endereco' column".
--
-- Após rodar, o `useOS` passa a ler os.endereco e os modais persistem o
-- endereço escolhido. OS antigas ficam com endereco NULL → continuam caindo no
-- endereço 1 do cliente (comportamento antigo), sem quebrar nada.
--
-- RODAR NO SQL EDITOR DO SUPABASE. Idempotente.

ALTER TABLE os ADD COLUMN IF NOT EXISTS endereco text;

-- Recarrega o schema cache do PostgREST (senão o INSERT/SELECT com a coluna
-- nova só passa a funcionar depois de um restart).
NOTIFY pgrst, 'reload schema';

-- Conferir:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'os' AND column_name = 'endereco';
