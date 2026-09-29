-- sql/144-feriado-07set-guilherme.sql
-- Marca 07/09 (feriado Independência) como dia trabalhado pro Guilherme
-- Horário padrão: 08:00 entrada · 11:00 alm.saída · 13:00 volta · 18:00 saída (UTC-4 = +4h)

DO $$
DECLARE
  gui_id uuid;
BEGIN
  SELECT id INTO gui_id FROM usuarios WHERE papel = 'oficina' LIMIT 1;
  RAISE NOTICE 'Guilherme id: %', gui_id;

  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES
    (gui_id, 'entrada',      '2026-09-07 12:00:00+00'),
    (gui_id, 'saida_almoco', '2026-09-07 15:00:00+00'),
    (gui_id, 'volta_almoco', '2026-09-07 17:00:00+00'),
    (gui_id, 'saida',        '2026-09-07 22:00:00+00');

  RAISE NOTICE 'Feriado 07/09 marcado para Guilherme (08:00–18:00 local).';
END $$;
