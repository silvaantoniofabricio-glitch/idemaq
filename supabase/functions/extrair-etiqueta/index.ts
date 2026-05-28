// supabase/functions/extrair-etiqueta/index.ts
//
// Edge function (Deno) que lê a foto da etiqueta de uma máquina de lavar
// usando Claude Haiku 4.5 (vision) e devolve { marca, modelo, serie }.
//
// Chamada pelo front via:
//   supabase.functions.invoke('extrair-etiqueta', { body: { imageUrl } })
//
// Modelo: claude-haiku-4-5 — vision, mais barato que Sonnet. Etiquetas são
// OCR simples, não precisa de raciocínio profundo.
//
// Reaproveita ANTHROPIC_API_KEY já configurada no secret do Supabase
// (mesmo padrão da relatorio-ia).
//
// Deploy:
//   supabase functions deploy extrair-etiqueta --no-verify-jwt

// @ts-ignore — Deno runtime (resolve em runtime do Supabase, não no tsc local)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `Você é um OCR especializado em etiquetas de máquinas de lavar roupa.

Sua tarefa: olhar a foto e extrair APENAS três campos:
- marca:   fabricante (Brastemp, Consul, Electrolux, LG, Samsung, Mueller, Continental, etc.)
- modelo:  código do modelo (ex: BWK11AB, LSE12, CWE10AB, BWL11A)
- serie:   número de série (ex: BR-2024-00887, FA-21345-77)

Regras CRÍTICAS:
1. Responda SEMPRE em JSON válido puro — sem markdown, sem texto antes/depois.
2. Cada campo é uma string OU null se não conseguir ler com confiança.
3. NÃO chute. Se não tem certeza, retorne null naquele campo.
4. NÃO inclua "Modelo:" ou "Marca:" no valor — só o valor cru.
5. Modelo e série geralmente são alfanuméricos maiúsculos.

Formato exato da resposta:
{"marca": "...", "modelo": "...", "serie": "..."}

Se a foto não é uma etiqueta ou está ilegível:
{"marca": null, "modelo": null, "serie": null}`

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  // @ts-ignore — Deno global existe em runtime do Supabase
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY não configurada nos secrets' }, 500)
  }

  let body: { imageUrl?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'body inválido (esperado JSON com imageUrl)' }, 400)
  }

  const { imageUrl } = body
  if (!imageUrl || typeof imageUrl !== 'string') {
    return json({ error: 'campo "imageUrl" obrigatório' }, 400)
  }

  // Baixa a imagem (signed URL do Supabase Storage) e converte pra base64.
  // Mais robusto que passar URL direto pro Anthropic (signed URLs do Supabase
  // expiram em 1h e o servidor da Anthropic pode falhar em buscar).
  let imageBase64: string
  let mediaType = 'image/jpeg'
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      return json({ error: `falha ao baixar imagem (${imgRes.status})` }, 400)
    }
    const ctype = imgRes.headers.get('content-type') || ''
    if (ctype.startsWith('image/')) mediaType = ctype.split(';')[0].trim()
    const buf = new Uint8Array(await imgRes.arrayBuffer())
    imageBase64 = uint8ToBase64(buf)
  } catch (e) {
    return json({ error: 'erro ao baixar imagem', detail: String(e) }, 500)
  }

  try {
    const claudeRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Extraia marca, modelo e número de série desta etiqueta. Responda só com o JSON.',
              },
            ],
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return json({ error: `Claude API erro ${claudeRes.status}`, detail: errText }, 502)
    }

    const payload = await claudeRes.json()
    const rawText = (payload?.content || [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n')
      .trim()

    // Claude pode envolver o JSON em ```json … ``` mesmo depois do prompt
    // pedir puro. Strip defensivo.
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    let parsed: { marca?: string | null; modelo?: string | null; serie?: string | null }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return json({
        ok: false,
        error: 'resposta não-JSON',
        raw: rawText,
      }, 200)
    }

    return json({
      ok: true,
      marca:  sanitize(parsed?.marca),
      modelo: sanitize(parsed?.modelo),
      serie:  sanitize(parsed?.serie),
      modelo_ia: MODEL,
      usage: payload?.usage ?? null,
    })
  } catch (e) {
    return json({ error: 'falha ao chamar Claude API', detail: String(e) }, 500)
  }
})

function sanitize(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'null' || s === '—' || s === '-') return null
  return s
}

function uint8ToBase64(bytes: Uint8Array): string {
  // chunked pra não estourar stack em imagens grandes
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  // @ts-ignore — btoa existe no runtime Deno
  return btoa(bin)
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}
