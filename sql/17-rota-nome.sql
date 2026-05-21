-- sql/17-rota-nome.sql
-- Adiciona coluna `nome` em `rota` pra suportar múltiplas rotas/dia/motorista
-- (Rota 1 / Rota 2 / Rota 3 como slots fixos por dia — pedido 21/05/2026).
--
-- Por quê:
--   O constraint original UNIQUE (data, motorista_id) só permitia 1 rota por
--   motorista/dia, mas o planejamento real do Alessandro precisa de 3 idas/
--   voltas do carro programadas em paralelo no mesmo dia.
--
-- Mudanças:
--   1. ADD COLUMN `nome text` — 'Rota 1', 'Rota 2', 'Rota 3' (ou livre).
--   2. DROP CONSTRAINT antigo.
--   3. ADD UNIQUE (data, motorista_id, nome) — agora 3 rotas/dia pro mesmo
--      motorista são possíveis, desde que tenham nomes diferentes.
--
-- Compatibilidade:
--   - Rotas antigas (nome NULL) continuam válidas. Front trata fallback.
--   - Idempotente: pode rodar mais de uma vez sem quebrar.

BEGIN;

ALTER TABLE rota
  ADD COLUMN IF NOT EXISTS nome text;

COMMENT ON COLUMN rota.nome IS
  'Nome visual da rota (ex.: Rota 1, Rota 2, Rota 3). Permite múltiplas rotas '
  'por dia/motorista — slot de planejamento, sem semântica de DB.';

-- Drop constraint antigo (se ainda existir com o nome original)
ALTER TABLE rota
  DROP CONSTRAINT IF EXISTS rota_data_motorista_unico;

-- Novo unique inclui `nome`. Tratamento de NULL: por padrão Postgres
-- considera NULLs distintos no UNIQUE, então rotas antigas (nome NULL)
-- não conflitam entre si.
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

-- Verificação manual (rodar separado depois):
-- SELECT data, motorista_id, nome, jsonb_array_length(paradas) AS n_paradas
-- FROM rota
-- WHERE deleted_at IS NULL
-- ORDER BY data DESC, nome NULLS LAST;
