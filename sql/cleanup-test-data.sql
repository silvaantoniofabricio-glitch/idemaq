-- ============================================================================
-- CLEANUP — Apaga todos os dados de teste pra começar limpo
--
-- Idempotente: cada DELETE é guardado por IF EXISTS — se uma tabela ainda
-- não foi criada (ex: sql/05 não rodou), o SQL pula em vez de quebrar.
--
-- Apaga (hard-delete):
--   - OS + os_item + os_historico + checklist_etapa + falha_teste
--   - lancamento_financeiro (inclui os 8 seeds do sql/01)
--   - rota (paradas criadas em teste)
--   - peca_movimentacao
--
-- PRESERVA (não toca):
--   - cliente (782 importados do Bling)
--   - peca (680 do catálogo BCM)
--   - usuarios (auth)
--   - conta_bancaria (12 contas reais)
--   - configuracoes (meta R$ 20k, etc)
--   - ponto_registro + jornada_funcionario (já vazias)
--
-- Reseta sequência da OS pra próxima começar em #1.
--
-- ⚠️ AÇÃO DESTRUTIVA — irreversível.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  tab text;
  ordem text[] := ARRAY[
    'falha_teste',
    'checklist_etapa',
    'os_historico',
    'os_item',
    'lancamento_financeiro',
    'peca_movimentacao',
    'rota',
    'os'  -- por último (filhas já foram limpas)
  ];
BEGIN
  FOREACH tab IN ARRAY ordem LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tab
    ) THEN
      EXECUTE format('DELETE FROM %I', tab);
      RAISE NOTICE 'Apagado: %', tab;
    ELSE
      RAISE NOTICE 'Pulado (nao existe): %', tab;
    END IF;
  END LOOP;
END $$;

-- Resetar sequência do número da OS (se existir)
DO $$
DECLARE seq_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'os'
  ) THEN
    SELECT pg_get_serial_sequence('os', 'numero') INTO seq_name;
    IF seq_name IS NOT NULL THEN
      EXECUTE format('ALTER SEQUENCE %s RESTART WITH 1', seq_name);
      RAISE NOTICE 'Sequencia % resetada pra 1', seq_name;
    END IF;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO (rodar separado, se quiser):
-- ============================================================================
-- SELECT 'os' AS tabela, count(*) FROM os
-- UNION ALL SELECT 'lancamento_financeiro', count(*) FROM lancamento_financeiro
-- UNION ALL SELECT 'rota', count(*) FROM rota
-- UNION ALL SELECT 'cliente (preservado)', count(*) FROM cliente
-- UNION ALL SELECT 'peca (preservado)', count(*) FROM peca;
