-- ============================================================================
-- 08 — Storage policies pro bucket `idemaq-privado` (foto da coleta da OS)
--
-- PRÉ-REQUISITO (manual, 1 vez):
--   No Supabase Dashboard → Storage → New bucket
--     Nome:    idemaq-privado
--     Public:  OFF (privado)
--     Click "Create bucket"
--
-- Este SQL aplica as policies que permitem:
--   - SELECT/INSERT/UPDATE/DELETE em `idemaq-privado` só pra usuários
--     autenticados (auth.role() = 'authenticated')
--   - Como já temos só 3 usuários reais (Toni + Alessandro + Guilherme),
--     não precisa diferenciar por papel — qualquer um deles bate e tira foto
--
-- Conteúdo armazenado:
--   - os/{osId}/coleta.jpg — 1 foto por OS, sobrescreve em re-upload
--   - (futuro: os/{osId}/entrega.jpg, os/{osId}/diagnostico/*.jpg)
-- ============================================================================

-- Habilita RLS na tabela storage.objects (já vem habilitada por default,
-- mas garante idempotência).
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ─── SELECT (visualizar via signed URL exige read na linha) ─────────────────
DROP POLICY IF EXISTS "idemaq_privado_select" ON storage.objects;
CREATE POLICY "idemaq_privado_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'idemaq-privado');

-- ─── INSERT (upload de foto nova) ───────────────────────────────────────────
DROP POLICY IF EXISTS "idemaq_privado_insert" ON storage.objects;
CREATE POLICY "idemaq_privado_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'idemaq-privado');

-- ─── UPDATE (sobrescrever via upsert) ───────────────────────────────────────
DROP POLICY IF EXISTS "idemaq_privado_update" ON storage.objects;
CREATE POLICY "idemaq_privado_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'idemaq-privado')
  WITH CHECK (bucket_id = 'idemaq-privado');

-- ─── DELETE (remover foto) ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "idemaq_privado_delete" ON storage.objects;
CREATE POLICY "idemaq_privado_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'idemaq-privado');

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO:
--   SELECT polname FROM pg_policy
--     WHERE polrelid = 'storage.objects'::regclass
--       AND polname LIKE 'idemaq_privado_%';
--   -- esperado: 4 policies (select, insert, update, delete)
-- ============================================================================
