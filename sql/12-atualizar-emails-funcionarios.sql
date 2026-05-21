-- =========================================================================
-- IDEMAQ — Atualizar emails dos funcionários (Alessandro e Guilherme)
-- Criado 20/05/2026
--
-- ATUALIZAÇÃO EM 2 LUGARES:
--   1. Tabela `usuarios` (pública, lida pela UI via useUsuarios) — este SQL.
--   2. `auth.users` (login do Supabase Auth) — feito no painel admin
--      (ver `prompts/chrome-atualizar-emails-supabase.md`).
--
-- Aqui filtramos por `papel` em vez de id pra evitar precisar saber os UUIDs.
-- Premissa: só 1 funcionário por papel (Alessandro=logistica, Guilherme=oficina).
-- Se algum dia tiver 2 logística, mudar o WHERE pra usar `apelido` ou `id`.
--
-- AÇÃO PRA TONI: copiar este arquivo no Supabase SQL Editor e rodar.
-- Idempotente: rodar de novo só faz UPDATE com o mesmo valor (no-op).
-- =========================================================================

BEGIN;

-- ─── Alessandro (logística) ─────────────────────────────────────────────────
UPDATE usuarios
   SET email = 'alessandrosilvamelo19@gmail.com'
 WHERE papel = 'logistica'
   AND ativo = true;

-- ─── Guilherme (oficina) ────────────────────────────────────────────────────
UPDATE usuarios
   SET email = 'guilhermecover56@gmail.com'
 WHERE papel = 'oficina'
   AND ativo = true;

COMMIT;

-- =========================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO:
--   SELECT apelido, papel, email FROM usuarios
--    WHERE papel IN ('logistica','oficina') AND ativo = true
--    ORDER BY papel;
--   -- esperado:
--   --   logistica → alessandrosilvamelo19@gmail.com
--   --   oficina   → guilhermecover56@gmail.com
-- =========================================================================

-- =========================================================================
-- IMPORTANTE — auth.users (login)
-- =========================================================================
-- Este SQL atualiza só a tabela `usuarios` (perfil do app). O LOGIN continua
-- com o email antigo porque ele vive em `auth.users` (schema gerenciado pelo
-- Supabase Auth, fora do controle do SQL comum).
--
-- Pra trocar o email de LOGIN tem 2 caminhos:
--
-- A) Pelo painel admin (recomendado — manda e-mail de confirmação):
--    1. Supabase Dashboard → Authentication → Users
--    2. Procurar o usuário pelo email antigo
--    3. Clicar nos "⋯" → "Send magic link" pro novo email NÃO funciona;
--       use "Edit user" → mudar campo Email → Save
--    4. Repetir pro outro funcionário
--    Ver prompts/chrome-atualizar-emails-supabase.md pra fluxo guiado.
--
-- B) Via SQL no SQL Editor (se quiser pular o painel):
--    -- ATENÇÃO: bypassa confirmação por email. Use só se tiver certeza.
--    UPDATE auth.users SET email = 'alessandrosilvamelo19@gmail.com',
--           email_confirmed_at = COALESCE(email_confirmed_at, now())
--     WHERE email = '<EMAIL_ATUAL_DO_ALESSANDRO>';
--
--    UPDATE auth.users SET email = 'guilhermecover56@gmail.com',
--           email_confirmed_at = COALESCE(email_confirmed_at, now())
--     WHERE email = '<EMAIL_ATUAL_DO_GUILHERME>';
--
--    -- E sincronizar com usuarios pra os IDs continuarem batendo (já feito acima).
-- =========================================================================
