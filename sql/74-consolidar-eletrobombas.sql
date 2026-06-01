-- Consolida as 12 eletrobombas em apenas 2 itens:
--   1. "Eletrobomba Emicol 127V"
--   2. "Eletrobomba Emicol 220V"
--
-- Logica:
--  - Agrupa por voltagem (procura 127/110 no nome -> 127V; 220/bivolt -> 220V)
--  - Escolhe um "keeper" por voltagem (favorito primeiro, depois maior qtd, depois menor id)
--  - Soma qtd_atual de todos os irmaos no keeper
--  - Renomeia o keeper pro nome canonico
--  - Soft-delete dos outros (deleted_at = now())
--
-- Idempotente: depois de rodar 1x, restam so 2 linhas, e os ILIKE so pegam essas.

-- ============ INSPECAO ANTES (rode primeiro pra conferir) ============
SELECT id, nome, sku, qtd_atual, qtd_minima, qtd_maxima,
       custo_atual, preco_venda, favorito, fornecedor
  FROM peca
 WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
 ORDER BY nome;

-- ============ EXECUCAO ============
BEGIN;

DO $$
DECLARE
  keeper_127 uuid;
  keeper_220 uuid;
  total_127  numeric;
  total_220  numeric;
  outros_127 int;
  outros_220 int;
BEGIN
  -- ---- 127V ----
  SELECT id INTO keeper_127
    FROM peca
   WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
     AND (nome ILIKE '%127%' OR nome ILIKE '%110%')
   ORDER BY favorito DESC NULLS LAST, qtd_atual DESC NULLS LAST, id ASC
   LIMIT 1;

  IF keeper_127 IS NOT NULL THEN
    SELECT COALESCE(SUM(qtd_atual), 0) INTO total_127
      FROM peca
     WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
       AND (nome ILIKE '%127%' OR nome ILIKE '%110%');

    UPDATE peca
       SET nome = 'Eletrobomba Emicol 127V',
           qtd_atual = total_127
     WHERE id = keeper_127;

    UPDATE peca
       SET deleted_at = now()
     WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
       AND (nome ILIKE '%127%' OR nome ILIKE '%110%')
       AND id <> keeper_127;

    GET DIAGNOSTICS outros_127 = ROW_COUNT;
    RAISE NOTICE '127V: keeper=%, total qtd=%, irmaos removidos=%', keeper_127, total_127, outros_127;
  ELSE
    RAISE NOTICE '127V: nenhuma eletrobomba encontrada';
  END IF;

  -- ---- 220V ----
  SELECT id INTO keeper_220
    FROM peca
   WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
     AND (nome ILIKE '%220%' OR nome ILIKE '%bivolt%')
   ORDER BY favorito DESC NULLS LAST, qtd_atual DESC NULLS LAST, id ASC
   LIMIT 1;

  IF keeper_220 IS NOT NULL THEN
    SELECT COALESCE(SUM(qtd_atual), 0) INTO total_220
      FROM peca
     WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
       AND (nome ILIKE '%220%' OR nome ILIKE '%bivolt%');

    UPDATE peca
       SET nome = 'Eletrobomba Emicol 220V',
           qtd_atual = total_220
     WHERE id = keeper_220;

    UPDATE peca
       SET deleted_at = now()
     WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
       AND (nome ILIKE '%220%' OR nome ILIKE '%bivolt%')
       AND id <> keeper_220;

    GET DIAGNOSTICS outros_220 = ROW_COUNT;
    RAISE NOTICE '220V: keeper=%, total qtd=%, irmaos removidos=%', keeper_220, total_220, outros_220;
  ELSE
    RAISE NOTICE '220V: nenhuma eletrobomba encontrada';
  END IF;
END $$;

COMMIT;

-- ============ VERIFICACAO POS ============
-- Deve mostrar 2 linhas: 127V e 220V (e nenhuma outra)
SELECT id, nome, qtd_atual, qtd_minima, qtd_maxima, custo_atual, preco_venda, favorito
  FROM peca
 WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
 ORDER BY nome;

-- Itens "orfaos" — eletrobombas sem 127/110/220/bivolt no nome (precisa decidir manualmente)
SELECT id, nome, qtd_atual
  FROM peca
 WHERE nome ILIKE '%eletrobomba%' AND deleted_at IS NULL
   AND nome NOT ILIKE '%127%' AND nome NOT ILIKE '%110%'
   AND nome NOT ILIKE '%220%' AND nome NOT ILIKE '%bivolt%';
