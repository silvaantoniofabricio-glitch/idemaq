// src/utils/osStorage.js
// Upload de foto da coleta da OS pro Supabase Storage privado.
//
// Bucket: idemaq-privado (privado — só dono/funcionários autenticados)
// Path:   os/{osId}/coleta.jpg  (1 foto por OS, sobrescreve em re-upload)
//
// Pra exibir, geramos signed URL com expiração curta (1h). Base64 legacy
// (pre_diagnostico.foto começando com "data:") continua funcionando — a
// função `resolverFotoUrl()` detecta e devolve a URL correta.
//
// Pré-requisitos no Supabase (uma vez):
//   1. Dashboard → Storage → New bucket → "idemaq-privado" (private)
//   2. SQL Editor → rodar `sql/08-storage-os-coleta.sql` (policies)

import { supabase } from '../supabase'

const BUCKET = 'idemaq-privado'
const SIGNED_URL_TTL_SEC = 60 * 60 // 1h

// ─── Compressão client-side ─────────────────────────────────────────────────
// Fotos de celular chegam 5-10MB; redimensiona pra max 1600px lado maior +
// converte pra JPEG quality 85%. Reduz pra ~300-700KB. Usa Canvas — sem dep.
async function comprimirImagem(file, { maxDim = 1600, quality = 0.85 } = {}) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Arquivo não é imagem')
  }

  // Carrega como ImageBitmap (mais rápido que Image+onload)
  const bitmap = await createImageBitmap(file)
  const { width: w0, height: h0 } = bitmap

  // Calcula novas dimensões mantendo aspecto
  const escala = Math.min(1, maxDim / Math.max(w0, h0))
  const w = Math.round(w0 * escala)
  const h = Math.round(h0 * escala)

  // Desenha no canvas + exporta JPEG
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)

  // toBlob é async via callback — promisify
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob falhou'))),
      'image/jpeg',
      quality,
    )
  })

  bitmap.close?.()
  return blob
}

// ─── Path canônico de cada foto da OS ──────────────────────────────────────
// `tipo`: 'coleta' (default — retrocompat) | 'entrega' | futuros tipos
function pathFotoOS(osId, tipo = 'coleta') {
  return `os/${osId}/${tipo}.jpg`
}

// Alias legado — código antigo chama pathColetaOS direto
function pathColetaOS(osId) {
  return pathFotoOS(osId, 'coleta')
}

// ─── Upload genérico (coleta/entrega/etc) ──────────────────────────────────
/**
 * Faz upload de foto da OS pro bucket privado. Comprime client-side
 * (max 1600px JPEG 85%) antes de enviar.
 *
 * @param {string} osId - UUID da OS
 * @param {File} file - arquivo do <input type="file">
 * @param {string} tipo - 'coleta' | 'entrega' | etc (default 'coleta')
 * @returns {Promise<{ ok: boolean, path?: string, url?: string, error?: string }>}
 */
export async function uploadFotoOS(osId, file, tipo = 'coleta') {
  if (!osId)  return { ok: false, error: 'osId vazio' }
  if (!file)  return { ok: false, error: 'arquivo vazio' }

  try {
    const blob = await comprimirImagem(file)
    const path = pathFotoOS(osId, tipo)

    const { error: errUp } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true, // sobrescreve se já existe (re-upload)
      })

    if (errUp) {
      const msg = errUp.message || ''
      if (msg.includes('Bucket not found') || errUp.statusCode === '404') {
        return { ok: false, error: 'Bucket "idemaq-privado" não existe. Criar no Supabase Dashboard.' }
      }
      return { ok: false, error: msg }
    }

    // Já gera signed URL pra exibição imediata
    const { data: signed, error: errSig } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SEC)

    if (errSig) return { ok: true, path, url: null, error: errSig.message }
    return { ok: true, path, url: signed.signedUrl }
  } catch (e) {
    return { ok: false, error: e.message || String(e) }
  }
}

// Alias legado — código antigo (AcaoRecebido, Header) chama uploadFotoColeta
export function uploadFotoColeta(osId, file) {
  return uploadFotoOS(osId, file, 'coleta')
}
// Helper específico pra entrega (semântico)
export function uploadFotoEntrega(osId, file) {
  return uploadFotoOS(osId, file, 'entrega')
}

// ─── Signed URL on-demand ──────────────────────────────────────────────────
/**
 * Gera signed URL pra exibir a foto. TTL 1h — gere uma nova quando renderizar.
 * Retorna null se a foto não existir.
 *
 * @param {string} osId
 * @param {string} tipo - 'coleta' | 'entrega' | etc
 * @returns {Promise<string|null>}
 */
export async function getSignedUrlFoto(osId, tipo = 'coleta') {
  if (!osId) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(pathFotoOS(osId, tipo), SIGNED_URL_TTL_SEC)
  if (error) {
    if (!(error.message || '').includes('not found')) {
      console.warn(`[osStorage] signed URL ${tipo} falhou:`, error.message)
    }
    return null
  }
  return data?.signedUrl || null
}

// Aliases legados
export function getSignedUrlColeta(osId) { return getSignedUrlFoto(osId, 'coleta') }
export function getSignedUrlEntrega(osId) { return getSignedUrlFoto(osId, 'entrega') }

// ─── Remoção ───────────────────────────────────────────────────────────────
export async function removerFotoOS(osId, tipo = 'coleta') {
  if (!osId) return { ok: false, error: 'osId vazio' }
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([pathFotoOS(osId, tipo)])
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export function removerFotoColeta(osId) { return removerFotoOS(osId, 'coleta') }
export function removerFotoEntrega(osId) { return removerFotoOS(osId, 'entrega') }

// ─── Detecta tipo de referência (legacy base64 vs storage) ─────────────────
/**
 * Resolve uma string da coluna `pre_diagnostico.foto` (ou foto_entrega) em
 * URL exibível.
 * - Se começa com "data:" → base64 inline (legacy) → retorna direto
 * - Senão → é marker 'storage' → gera signed URL conforme `tipo`
 * - Se for null/vazio → retorna null
 *
 * @param {string|null} valor - conteúdo do campo no jsonb
 * @param {string} osId - usado pra resolver o path do storage
 * @param {string} tipo - 'coleta' (default) | 'entrega'
 * @returns {Promise<string|null>}
 */
export async function resolverFotoUrl(valor, osId, tipo = 'coleta') {
  if (!valor) return null
  if (typeof valor === 'string' && valor.startsWith('data:')) return valor // base64 legacy
  // qualquer outro valor não-vazio = path do Storage → gera signed URL
  return getSignedUrlFoto(osId, tipo)
}

// ─── Marker de "está no Storage" ───────────────────────────────────────────
// Convenção: pre_diagnostico.foto = 'storage' quando a foto vive no bucket.
// (Não armazenamos o path inteiro porque ele é derivável do osId.)
export const FOTO_STORAGE_MARKER = 'storage'
