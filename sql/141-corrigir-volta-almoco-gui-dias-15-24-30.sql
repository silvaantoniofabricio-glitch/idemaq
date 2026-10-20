-- Correção ponto Guilherme julho/2026: dias 15, 24 e 30
-- Problema: clicou volta_almoco no horário de saída sem ter batido volta real
-- Solução: inserir volta_almoco às 13:14 (média de 18 dias do mês) e corrigir tipo errado
--
-- Dia 15: 08:08 entrada → 11:04 alm.saída → [13:14 inserido] → 18:10 saída (corrigido de volta_almoco)
-- Dia 24: 08:01 entrada → 11:00 alm.saída → [13:14 inserido] → 18:01 saída (corrigido de volta_almoco)
-- Dia 30: 08:02 entrada → 10:59 alm.saída → [13:14 inserido] → 18:41 saída (mantido)
--         + soft-delete do volta_almoco falso das 18:40 (f587bd4d)

DO $$
DECLARE
  gui_id uuid;
BEGIN
  SELECT id INTO gui_id FROM usuarios WHERE papel = 'oficina' LIMIT 1;
  RAISE NOTICE 'Guilherme id: %', gui_id;

  -- ── DIA 15/07 ───────────────────────────────────────────────────────────────
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'volta_almoco', '2026-07-15 17:14:00+00');

  UPDATE ponto_registro SET tipo = 'saida'
  WHERE left(id::text, 8) = '91d18ebe';  -- volta_almoco 18:10 → saida

  -- ── DIA 24/07 ───────────────────────────────────────────────────────────────
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'volta_almoco', '2026-07-24 17:14:00+00');

  UPDATE ponto_registro SET tipo = 'saida'
  WHERE left(id::text, 8) = '097e1fc5';  -- volta_almoco 18:01 → saida

  -- ── DIA 30/07 ───────────────────────────────────────────────────────────────
  INSERT INTO ponto_registro (funcionario_id, tipo, bateu_em)
  VALUES (gui_id, 'volta_almoco', '2026-07-30 17:14:00+00');

  -- Soft-delete do volta_almoco falso das 18:40 (clicou errado antes do saida)
  UPDATE ponto_registro SET deleted_at = now()
  WHERE left(id::text, 8) = 'f587bd4d';  -- volta_almoco 18:40 (falso)
  -- saida das 18:41 (516adcdd) fica como encerramento real do dia

  RAISE NOTICE 'Concluído. 3 volta_almoco inseridas, 2 tipos corrigidos, 1 deletado.';
END $$;
