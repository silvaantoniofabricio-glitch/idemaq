// supabase/functions/extrair-etiqueta/index.ts
// Lê foto de etiqueta via Claude Haiku 4.5 (vision) e devolve { marca, modelo, serie }.
// Secret necessário: ANTHROPIC_API_KEY (mesma do relatorio-ia)
// Deploy: supabase functions deploy extrair-etiqueta --no-verify-jwt

// @ts-ignore — Deno runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PROMPT = `Você é um OCR especializado em etiquetas de máquinas de lavar roupa.

Olhe a foto e extraia APENAS três campos:
- marca:  fabricante (Brastemp, Consul, Electrolux, LG, Samsung, Mueller, Continental, etc.)
- modelo: código do modelo (ex: BWK11AB, LSE12, CWE10AB, BWL11A)
- serie:  número de série (ex: BR-2024-00887, FA-21345-77)

Regras:
1. Responda SEMPRE em JSON válido puro — sem markdown, sem texto antes/depois.
2. Cada campo é uma string OU null se não conseguir ler com confiança.
3. NÃO chute. Se não tem certeza, retorne null naquele campo.
4. NÃO inclua "Modelo:" ou "Marca:" no valor — só o valor cru.
5. Modelo e série geralmente são alfanuméricos maiúsculos.

Formato exato:
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

  // @ts-ignore — Deno global
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY não configurada nos secrets' }, 500)
  }

  let body: { imageUrl?: string; imageBase64?: string; mediaType?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'body inválido (esperado JSON)' }, 400)
  }

  let imageBase64: string
  let mediaType = body.mediaType || 'image/jpeg'

  if (body.imageBase64) {
    imageBase64 = body.imageBase64
  } else if (body.imageUrl) {
    try {
      const imgRes = await fetch(body.imageUrl)
      if (!imgRes.ok) return json({ error: `falha ao baixar imagem (${imgRes.status})` }, 400)
      const ctype = imgRes.headers.get('content-type') || ''
      if (ctype.startsWith('image/')) mediaType = ctype.split(';')[0].trim()
      const buf = new Uint8Array(await imgRes.arrayBuffer())
      imageBase64 = uint8ToBase64(buf)
    } catch (e) {
      return json({ error: 'erro ao baixar imagem', detail: String(e) }, 500)
    }
  } else {
    return json({ error: 'forneça imageBase64 ou imageUrl' }, 400)
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return json({ error: `Anthropic API erro ${res.status}`, detail: errText }, 502)
    }

    const payload = await res.json()
    const rawText = (payload?.content || [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
      .trim()

    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    let parsed: { marca?: string | null; modelo?: string | null; serie?: string | null }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return json({ ok: false, error: 'resposta não-JSON', raw: rawText }, 200)
    }

    return json({
      ok: true,
      marca:  sanitize(parsed?.marca),
      modelo: sanitize(parsed?.modelo),
      serie:  sanitize(parsed?.serie),
      modelo_ia: 'claude-haiku-4-5',
    })
  } catch (e) {
    return json({ error: 'falha ao chamar Anthropic API', detail: String(e) }, 500)
  }
})

function sanitize(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'null' || s === '—' || s === '-') return null
  return s
}

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  // @ts-ignore — btoa existe no Deno runtime
  return btoa(bin)
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}
