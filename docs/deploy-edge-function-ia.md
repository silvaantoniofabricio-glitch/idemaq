# Deploy da edge function `relatorio-ia`

Destrava o botão **"Gerar análise"** nos relatórios **DRE** e **Funcionários**.
Hoje o botão está oculto via flag `IA_DEPLOYED = false` em `src/pages/Relatorios.jsx`.

## Pré-requisitos

- Supabase CLI instalada
  - macOS/Linux: `brew install supabase/tap/supabase`
  - Windows: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`
  - Verificar: `supabase --version`
- Chave da API Anthropic (precisa de uma conta em console.anthropic.com)
  - Formato: `sk-ant-api03-...`
  - Console → Settings → API Keys → Create Key

## Passos (~5 min)

### 1. Login na CLI

```bash
supabase login
```

Abre o browser pra autenticar.

### 2. Link no projeto Idemaq

Rodar **na raiz do repo** (`C:\Users\Toni-PC\projetos\idemaq`):

```bash
supabase link --project-ref yfbbruxqfzgetapbvrgd
```

Pede a database password (a do dashboard Supabase). Pode pular se quiser — só precisa do link pra deployar functions.

### 3. Setar a chave Anthropic como secret

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
```

Verificar:

```bash
supabase secrets list
```

Deve listar `ANTHROPIC_API_KEY` (valor mascarado).

### 4. Deploy da function

```bash
supabase functions deploy relatorio-ia --no-verify-jwt
```

`--no-verify-jwt` permite que o front chame sem precisar de auth header (a function já valida internamente).

Resultado esperado:
```
Deployed Function relatorio-ia
```

### 5. Flipar a flag no front

Editar `src/pages/Relatorios.jsx` linha 57:

```diff
- const IA_DEPLOYED = false
+ const IA_DEPLOYED = true
```

Commitar + push:

```bash
git add src/pages/Relatorios.jsx
git commit -m "feat(relatorios): IA_DEPLOYED=true — destrava DRE+Funcionarios com IA"
git push origin main
```

Vercel deploya em ~30s.

## Validação

1. Abrir https://idemaq.vercel.app/relatorios
2. Selecionar **DRE Inteligente** (ou **Funcionários**)
3. Clicar **"Gerar análise agora"**
4. Esperar ~10-20s
5. Deve aparecer markdown gerado pelo Claude Opus

Se travar/falhar:
- Verificar logs em https://supabase.com/dashboard/project/yfbbruxqfzgetapbvrgd/functions/relatorio-ia/logs
- Conferir se `ANTHROPIC_API_KEY` está correta via `supabase secrets list`
- Conferir billing/créditos da conta Anthropic

## Custos

- **Claude Opus 4.7** é o modelo. Cada análise consome ~3000-5000 input tokens + ~800-1500 output tokens.
- Custo aproximado por análise: **R$ 0,10 a R$ 0,30** (depende do volume de dados no período).
- Prompt caching `ephemeral` já está habilitado na function — chamadas repetidas em < 5min pagam menos.

---

# Deploy da edge function `extrair-etiqueta`

Lê a foto da **etiqueta** da máquina (slot 1 em "Fotos da coleta") via
Claude Haiku 4.5 (vision) e auto-preenche marca/modelo/série.

Disparada automaticamente quando o usuário faz upload da foto Etiqueta
no FormEquipamentoEdit (e na ação Coleta).

## Pré-requisitos

Mesmos da `relatorio-ia` (Supabase CLI + ANTHROPIC_API_KEY no secret).
Se já fez deploy da `relatorio-ia`, **a chave já está configurada** — só rodar:

```bash
supabase functions deploy extrair-etiqueta --no-verify-jwt
```

## Validação

1. Abrir uma OS qualquer no app
2. Clicar em **"editar equipamento"** (Header da OS)
3. Em **Fotos da coleta**, clicar no slot **Etiqueta**
4. Tirar/escolher foto de uma etiqueta de máquina
5. Após upload, overlay "Lendo etiqueta…" aparece sobre a foto (~2-5s)
6. Toast verde "Etiqueta lida: modelo: BWK11AB · serie: …"
7. Campos **Marca/Modelo/Número de série** preenchem automaticamente
8. Usuário revisa e clica **Salvar alterações**

Se travar/falhar:
- Logs em https://supabase.com/dashboard/project/yfbbruxqfzgetapbvrgd/functions/extrair-etiqueta/logs
- Falha silenciosa no front (não atrapalha o fluxo) — só não auto-preenche

## Custos

- **Claude Haiku 4.5** com vision. ~1500 input tokens (imagem) + ~80 output tokens (JSON).
- Custo por foto: **~R$ 0,01 a R$ 0,03**.
- Volume estimado: 50 OS/mês × 1 foto = ~R$ 0,50 a R$ 1,50/mês.
