// src/supabase.js
// Cliente Supabase. URL + anon key vêm de env vars (Vercel + .env.local).
//
// Pre-requisito (uma vez):
//   1. Vercel: Settings → Environment Variables → adicionar
//        VITE_SUPABASE_URL       = https://yfbbruxqfzgetapbvrgd.supabase.co
//        VITE_SUPABASE_ANON_KEY  = sb_publishable_...
//   2. Local: copiar .env.example pra .env.local e preencher
//
// Fallback hardcoded mantido pra não quebrar deploys atuais enquanto a
// configuração no Vercel não acontece. ⚠️ Remover quando confirmado que as
// env vars estão setadas em prod (não tem segredo aqui — anon key é pública
// por design do Supabase, mas a convenção é não acoplar URL ao bundle).

import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://yfbbruxqfzgetapbvrgd.supabase.co'
const FALLBACK_KEY = 'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  // Aviso visível no console pra lembrar de configurar. Não bloqueia o app.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] usando fallback hardcoded — setar VITE_SUPABASE_URL e ' +
    'VITE_SUPABASE_ANON_KEY no Vercel + .env.local pra remover este aviso.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
