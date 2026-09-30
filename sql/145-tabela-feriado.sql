-- sql/145-tabela-feriado.sql
-- Cria tabela de feriados e insere feriados nacionais 2026/2027
-- Também remove as batidas falsas inseridas no 07/09 para ambos funcionários

-- 1. Tabela
CREATE TABLE IF NOT EXISTS feriado (
  id        uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  data      date    NOT NULL UNIQUE,
  descricao text    NOT NULL,
  tipo      text    NOT NULL DEFAULT 'nacional' -- nacional | estadual | municipal
);

-- 2. Feriados nacionais 2026
INSERT INTO feriado (data, descricao) VALUES
  ('2026-01-01', 'Confraternização Universal'),
  ('2026-02-16', 'Carnaval — segunda'),
  ('2026-02-17', 'Carnaval — terça'),
  ('2026-04-03', 'Sexta-feira Santa'),
  ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do Trabalho'),
  ('2026-06-04', 'Corpus Christi'),
  ('2026-09-07', 'Independência do Brasil'),
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamação da República'),
  ('2026-11-20', 'Dia da Consciência Negra'),
  ('2026-12-25', 'Natal')
ON CONFLICT (data) DO NOTHING;

-- 3. Feriados nacionais 2027
INSERT INTO feriado (data, descricao) VALUES
  ('2027-01-01', 'Confraternização Universal'),
  ('2027-02-08', 'Carnaval — segunda'),
  ('2027-02-09', 'Carnaval — terça'),
  ('2027-03-26', 'Sexta-feira Santa'),
  ('2027-04-21', 'Tiradentes'),
  ('2027-05-01', 'Dia do Trabalho'),
  ('2027-05-27', 'Corpus Christi'),
  ('2027-09-07', 'Independência do Brasil'),
  ('2027-10-12', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'Finados'),
  ('2027-11-15', 'Proclamação da República'),
  ('2027-11-20', 'Dia da Consciência Negra'),
  ('2027-12-25', 'Natal')
ON CONFLICT (data) DO NOTHING;

-- 4. Remover batidas falsas do 07/09 (inseridas manualmente como feriado)
--    Horários exatos que foram inseridos: 12:00, 15:00, 17:00 e 22:00 UTC
UPDATE ponto_registro
SET deleted_at = now()
WHERE date(bateu_em) = '2026-09-07'
  AND bateu_em IN (
    '2026-09-07 12:00:00+00',
    '2026-09-07 15:00:00+00',
    '2026-09-07 17:00:00+00',
    '2026-09-07 22:00:00+00'
  )
  AND deleted_at IS NULL;

SELECT 'Feriados inseridos e batidas falsas do 07/09 removidas.' AS resultado;
