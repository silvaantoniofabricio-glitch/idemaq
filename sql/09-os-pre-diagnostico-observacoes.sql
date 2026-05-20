-- ============================================================================
-- 09 — Garantir colunas `pre_diagnostico` (jsonb) e `observacoes` (text) em `os`
--
-- Por que: o front (AcaoRecebido + Header) escreve `pre_diagnostico` (testes
-- do pre-diagnostico + marker 'storage' da foto da coleta), e o AcaoPagamento
-- + PagamentoTab escrevem `observacoes` (parcelas a prazo, anotacoes livres).
--
-- Bug observado em 20/05/2026: foto da coleta era enviada pro Storage com
-- sucesso, mas o marker 'storage' caia em osPatch.skipped[] pq a coluna nao
-- estava na whitelist. Ao dar F5, pre_diagnostico vinha vazio e a foto sumia.
--
-- Fix em 2 passos:
--   1. osPatch.js: pre_diagnostico + observacoes adicionados a COLUNAS_SAFE
--   2. Este SQL garante que as colunas existem no banco (idempotente).
--
-- AÇÃO PRO TONI: rodar este SQL no Supabase SQL Editor.
-- ============================================================================

BEGIN;

ALTER TABLE os
  ADD COLUMN IF NOT EXISTS pre_diagnostico jsonb;

COMMENT ON COLUMN os.pre_diagnostico IS
  'Jsonb com testes do pre-diagnostico (entrada_agua/saida_agua/agitacao/centrifugacao) + observacoes + foto (marker "storage" quando foto vive no bucket idemaq-privado em os/{id}/coleta.jpg, ou base64 "data:..." legacy).';

ALTER TABLE os
  ADD COLUMN IF NOT EXISTS observacoes text;

COMMENT ON COLUMN os.observacoes IS
  'Observacoes livres da OS (anotacoes do header, parcelas a prazo registradas pelo FormRecebimento, etc).';

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO:
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'os' AND column_name IN ('pre_diagnostico','observacoes');
--   -- esperado: 2 linhas (jsonb + text)
-- ============================================================================
