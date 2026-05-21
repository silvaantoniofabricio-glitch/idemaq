-- ============================================================================
-- CLEANUP — Apaga todos os dados de teste pra começar limpo
--
-- Apaga (hard-delete):
--   - OS + os_item + os_historico + checklist_etapa + falha_teste
--   - lancamento_financeiro (inclui os 8 seeds do sql/01)
--   - rota (paradas criadas em teste)
--   - peca_movimentacao (provavelmente já vazia)
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
-- ⚠️ AÇÃO DESTRUTIVA — irreversível. Rodar no SQL Editor do Supabase
-- com o usuário dono (postgres) — bypassa RLS.
-- ============================================================================

BEGIN;

-- 1. Filhas da OS (FK pra os.id) — apagar antes da OS por segurança
--    (CASCADE deveria pegar, mas explícito não custa nada)
DELETE FROM falha_teste;
DELETE FROM checklist_etapa;
DELETE FROM os_historico;
DELETE FROM os_item;

-- 2. Outras tabelas que referenciam os.id (FK opcional)
DELETE FROM lancamento_financeiro;
DELETE FROM peca_movimentacao;

-- 3. Rotas (paradas referenciam os.id via jsonb, sem FK — só apaga a rota)
DELETE FROM rota;

-- 4. OS — finalmente
DELETE FROM os;

-- 5. Resetar sequência do número da OS pra próxima ser #1
--    O nome da sequência pode variar (os_numero_seq, os_id_seq, etc).
--    Tenta os nomes comuns; ignora erro silenciosamente.
DO $$
DECLARE
  seq_name text;
BEGIN
  -- Procura sequência que esteja vinculada à coluna `numero` da `os`
  SELECT pg_get_serial_sequence('os', 'numero') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('ALTER SEQUENCE %s RESTART WITH 1', seq_name);
    RAISE NOTICE 'Sequência % resetada pra 1', seq_name;
  ELSE
    RAISE NOTICE 'Sem sequência vinculada a os.numero — numeração começa do que o trigger decidir';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ============================================================================
-- Rode esse SELECT depois pra confirmar:

SELECT 'os'                    AS tabela, count(*) AS total FROM os
UNION ALL SELECT 'os_item',                count(*) FROM os_item
UNION ALL SELECT 'os_historico',           count(*) FROM os_historico
UNION ALL SELECT 'checklist_etapa',        count(*) FROM checklist_etapa
UNION ALL SELECT 'falha_teste',            count(*) FROM falha_teste
UNION ALL SELECT 'lancamento_financeiro',  count(*) FROM lancamento_financeiro
UNION ALL SELECT 'rota',                   count(*) FROM rota
UNION ALL SELECT 'peca_movimentacao',      count(*) FROM peca_movimentacao
UNION ALL SELECT 'cliente (preservado)',   count(*) FROM cliente
UNION ALL SELECT 'peca (preservado)',      count(*) FROM peca
UNION ALL SELECT 'conta_bancaria (preservado)', count(*) FROM conta_bancaria
UNION ALL SELECT 'usuarios (preservado)',  count(*) FROM usuarios;

-- Esperado:
--   os = 0, os_item = 0, os_historico = 0, ... (tudo zerado)
--   cliente = 782 (intacto)
--   peca = 680 (intacto)
--   conta_bancaria = 12 (intacto)
--   usuarios = 3 (Toni + Alessandro + Guilherme)
-- ============================================================================
