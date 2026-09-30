-- sql/146-feriado-rls-public-read.sql
-- Feriados são informação pública — permite leitura pelo front (anon key)

ALTER TABLE feriado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feriado_leitura_publica"
  ON feriado FOR SELECT
  USING (true);
