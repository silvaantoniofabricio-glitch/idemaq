# Setup Google Maps Places API (`VITE_GOOGLE_MAPS_KEY`)

Destrava o **autocomplete de endereço** no `AddressInput` (usado em NovaRotaModal,
RotaDetalheModal, cadastro de cliente etc). Hoje cai pra texto livre quando a chave
não está setada.

## Custo

- Places API tem **free tier de $200/mês** (~17.000 autocomplete sessions). Operação
  normal da Idemaq nem perto de bater isso.
- Mesmo assim, **fortemente recomendado restringir a chave por HTTP referrer** pra
  evitar abuso caso o JS vaze.

## Passos (~10 min)

### 1. Criar projeto no Google Cloud (se ainda não tiver)

1. https://console.cloud.google.com
2. Criar projeto novo: **"Idemaq"** (ou usar existente)

### 2. Habilitar as APIs necessárias

Em **APIs & Services → Library**, habilitar:

- **Places API (New)** — autocomplete principal
- **Maps JavaScript API** — loader do front

### 3. Criar a credencial

1. **APIs & Services → Credentials → + CREATE CREDENTIALS → API key**
2. Vai gerar uma chave tipo `AIzaSy...`

### 4. Restringir a chave (CRÍTICO — não pular)

Clica na chave criada e configura:

**Application restrictions**:
- Selecionar **HTTP referrers (web sites)**
- Adicionar:
  - `https://idemaq.vercel.app/*`
  - `https://*.vercel.app/*` (cobre previews do Vercel)
  - `http://localhost:5173/*` (dev local)

**API restrictions**:
- Selecionar **Restrict key**
- Marcar só: **Places API (New)** + **Maps JavaScript API**

Salvar.

### 5. Habilitar billing

A Places API exige billing habilitado mesmo dentro do free tier. Adicionar
cartão em **Billing → Link a billing account**.

### 6. Setar a chave no Vercel

1. https://vercel.com/dashboard → projeto Idemaq → **Settings → Environment Variables**
2. Adicionar:
   - **Name**: `VITE_GOOGLE_MAPS_KEY`
   - **Value**: `AIzaSy...` (chave criada)
   - **Environments**: marcar **Production**, **Preview**, **Development**
3. Salvar
4. Trigger redeploy: **Deployments → último deploy → ⋯ → Redeploy**

### 7. Setar local (opcional)

No `.env.local` (raiz do projeto):

```
VITE_GOOGLE_MAPS_KEY=AIzaSy...
```

Reiniciar `npm run dev`.

## Validação

1. Abrir https://idemaq.vercel.app/logistica
2. Clicar em **Nova rota** ou abrir rota existente
3. Em qualquer campo de endereço (parada), digitar parte de um endereço de Naviraí
4. Deve aparecer dropdown com sugestões em < 1s

Se NÃO aparecer dropdown:
- DevTools → Console: procurar erro tipo `RefererNotAllowedMapError` (faltou restrição) ou `ApiNotActivatedMapError` (Places API não habilitada)
- Conferir no Vercel se a env var realmente foi salva
- Conferir se o último deploy foi DEPOIS de salvar a env var

## Detalhe técnico

`src/components/logistica/AddressInput.jsx` faz fallback gracioso: se `VITE_GOOGLE_MAPS_KEY` for vazio/inválido, o input vira texto livre normal. **Não quebra a UI** — só perde autocomplete.
