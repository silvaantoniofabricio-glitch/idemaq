-- 44-peca-favorito.sql
-- Adiciona coluna "favorito" na tabela peca + índice para ordenação rápida
-- Gerado em 2026-05-25

ALTER TABLE peca ADD COLUMN IF NOT EXISTS favorito boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_peca_favorito ON peca (favorito DESC, nome);

COMMENT ON COLUMN peca.favorito IS 'Peça frequentemente comprada/usada — aparece primeiro nos seletores.';
