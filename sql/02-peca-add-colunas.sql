-- ============================================================================
-- Schema: adiciona 5 colunas em 'peca' pra estrutura BCM (v2)
-- Geraco em 2026-05-20
-- modelos_compativeis ja entra como text[] (ARRAY) — front trata como array.
-- Se a coluna ja existir como text e voce quiser migrar, rode na mao:
--   ALTER TABLE peca
--     ALTER COLUMN modelos_compativeis TYPE text[]
--     USING string_to_array(regexp_replace(modelos_compativeis, '\s*[,/\n;]\s*', '|', 'g'), '|');
-- ============================================================================

BEGIN;

ALTER TABLE peca
  ADD COLUMN IF NOT EXISTS marca               text,
  ADD COLUMN IF NOT EXISTS tipo                text,
  ADD COLUMN IF NOT EXISTS referencia          text,
  ADD COLUMN IF NOT EXISTS modelo              text,
  ADD COLUMN IF NOT EXISTS modelos_compativeis text[];

-- indices uteis pra busca (modelo costuma ser codigo de fabricante pesquisado)
CREATE INDEX IF NOT EXISTS peca_modelo_idx     ON peca (modelo)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS peca_referencia_idx ON peca (referencia) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS peca_marca_idx      ON peca (marca)      WHERE deleted_at IS NULL;

COMMIT;
