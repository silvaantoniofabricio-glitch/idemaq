// supabase/functions/relatorio-ia/index.ts
//
// Edge function (Deno) chamada pelo front via `supabase.functions.invoke('relatorio-ia', { body })`.
// Recebe `{ tipo, dados }` e gera análise em Markdown via Claude API.
//
// Mantém a chave da API no servidor (vaza se chamar do front).
//
// Tipos suportados:
//   - 'dre'           → análise do DRE (receitas/despesas/margem)
//   - 'funcionarios'  → análise da performance da equipe
//
// Modelo: claude-opus-4-7 (Toni pediu Opus pra análises mais profundas).
//
// Prompt caching:
//   `cache_control: { type: 'ephemeral' }` no system prompt + no bloco de instruções
//   pra economizar tokens entre chamadas repetidas. TTL padrão 5min.
//
// Deploy (depois):
//   supabase functions deploy relatorio-ia --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// CORS aberto pra ser chamado do front (dev + Vercel).

// @ts-ignore — Deno runtime (resolve em runtime do Supabase, não no tsc local)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-7'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// =============================================================================
// Prompts por tipo
// =============================================================================
// O system prompt fica cacheado (estável entre chamadas). Só `dados` muda.

const SYSTEM_BASE = `Você é o analista financeiro/operacional da IDEMAQ Assistência Técnica (Naviraí/MS — manutenção, limpeza, refurbish e venda de máquinas de lavar; ~50 OS/mês; meta R$ 20.000/mês).

Estilo:
- Direto, português do Brasil, sem rodeios.
- Markdown limpo: usar ## pra seções, listas curtas, **negrito** pra números-chave.
- Nunca inventar dados. Trabalhe SÓ com o JSON recebido.
- Se um número estiver ausente, diga "sem dado" — não chute.
- Foque em: o que está bem, o que está mal, e 2-3 ações práticas pro dono.

Público: Toni (dono, não-técnico, daltônico Deutan — não use cor pra distinguir nada).`

const PROMPTS: Record<string, string> = {
  dre: `Analise o DRE abaixo (JSON com receitas/despesas/lucro/margem/categorias).

Estrutura da resposta:
## Resumo do mês
2-3 linhas com o headline (faturou, lucrou, margem).

## O que puxou pra cima
Bullets com as categorias de receita ou economia que se destacaram.

## O que puxou pra baixo
Bullets com despesas acima do esperado ou receitas abaixo.

## Ações sugeridas
3 ações concretas, priorizadas (mais impacto primeiro).`,

  funcionarios: `Analise a performance da equipe abaixo (JSON com cada pessoa: OS feitas, etapas concluídas, tempo médio, score).

Estrutura da resposta:
## Visão geral
1-2 linhas com o headline da equipe.

## Destaques individuais
Pra cada pessoa: 1 ponto forte + 1 ponto a melhorar (curto, baseado nos números).

## Gargalos detectados
Etapas onde alguém demora demais ou faz pouco volume.

## Ações sugeridas
2-3 sugestões práticas (treino, redistribuir tarefa, reconhecimento).`,
}

// =============================================================================
// Handler
// =============================================================================
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

  let body: { tipo?: string; dados?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'body inválido (esperado JSON)' }, 400)
  }

  const { tipo, dados } = body
  if (!tipo || !PROMPTS[tipo]) {
    return json({ error: `tipo inválido — use: ${Object.keys(PROMPTS).join(', ')}` }, 400)
  }
  if (dados == null) {
    return json({ error: 'campo "dados" é obrigatório' }, 400)
  }

  const instrucao = PROMPTS[tipo]
  const dadosStr = typeof dados === 'string' ? dados : JSON.stringify(dados, null, 2)

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
        max_tokens: 1500,
        system: [
          {
            type: 'text',
            text: SYSTEM_BASE,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: instrucao,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Dados (JSON):\n\n\`\`\`json\n${dadosStr}\n\`\`\``,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return json({ error: `Claude API erro ${claudeRes.status}`, detail: errText }, 502)
    }

    const payload = await claudeRes.json()
    const markdown = (payload?.content || [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n')

    return json({
      tipo,
      markdown,
      modelo: MODEL,
      usage: payload?.usage ?? null,
    })
  } catch (e) {
    return json({ error: 'falha ao chamar Claude API', detail: String(e) }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}
