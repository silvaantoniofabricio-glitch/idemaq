# Contexto — Logística

> Doc vivo do terminal `logistica`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

🟢 **CRUD completo: hook + UI + modais de criação/edição com drag-and-drop** (20/05/2026).
- `src/pages/Logistica.jsx` — UI completa, consome `useRotas`. Botão "Nova rota" no PageHeader; clique no corpo da parada abre `RotaDetalheModal`. Trata `loading`, `tabelaAusente` e `error` com estados próprios (EmptyState).
- `src/hooks/useRotas.js` — **modo real**, lê `rota` no Supabase com JOIN em `usuarios` (motorista). Mutações `concluirParada`/`reordenarParadas` fazem UPDATE optimistic do jsonb `paradas` inteiro (com rollback em caso de erro). `criar/atualizar/excluir` (soft-delete) implementados.
- `src/components/logistica/AddressInput.jsx` — autocomplete via Google Maps Places quando `VITE_GOOGLE_MAPS_KEY` está setada. Loader singleton, debounce 250ms, session token pra economizar quota. Fallback automático pra texto livre quando a chave não existe ou o script falha.
- `src/components/logistica/ParadasEditor.jsx` — **NOVO (20/05)**. Lista editável de paradas com **drag-and-drop nativo HTML5** (`@dnd-kit` não está instalado). Reusável entre criação e edição. Cada linha: handle de drag · número da ordem · ícone do tipo · Select tipo (`coleta`/`entrega`/`servico`) · Input cliente · time horário previsto · `AddressInput` · Select OS opcional (auto-preenche cliente/fone) · Input telefone · ações Concluir/Remover. Renumera `ordem` no parent ao salvar.
- `src/components/logistica/NovaRotaModal.jsx` — **NOVO (20/05)**. Campos: data (required), motorista (Select de usuarios com papel `logistica`/`dono`), observações, paradas (`ParadasEditor`). Valida data + ≥1 parada com endereço. Chama `useRotas.criar({ data, motorista_id, paradas, status: 'planejada', observacoes })`.
- `src/components/logistica/RotaDetalheModal.jsx` — **NOVO (20/05)**. Mesmos campos + Select de status (`planejada`/`em_andamento`/`concluida`/`cancelada`). Botões: "Excluir rota" (com confirmação inline), "Cancelar", "Salvar alterações" (chama `useRotas.atualizar`). Botão "Concluir" por parada dispara `useRotas.concluirParada` direto (já é optimistic no hook). Reordenação por DnD é parte do draft local — só persiste no Save.
- `sql/06-rota.sql` — ✅ **APLICADO em 19/05/2026** no SQL Editor do Supabase. Tabela `rota` em prod.
- `scripts/verificar-tabela-rota.mjs` — verificador: `node scripts/verificar-tabela-rota.mjs` reporta se o SQL já rodou.

### Bug fix Onda 4 (20/05/2026) — embed do motorista
- **Causa raiz**: hook usava `motorista:motorista_id(id,nome)` mas a tabela `usuarios` não tem coluna `nome` — tem `apelido`. PostgREST devolvia `42703 column "nome" does not exist`, que o handler `isMissingTable()` do hook estava interpretando como **tabela ausente** → UI ficava no modo demo com banner "Tabela rota não existe", mesmo com o SQL 06 já aplicado.
- **Fix**: trocar embed pra `motorista:motorista_id(id,apelido)` em `useRotas.js`. UI passou a listar as rotas reais.
- **Lição registrada**: `isMissingTable()` precisa distinguir `42P01` (tabela ausente) de `42703` (coluna ausente) — não tratar tudo como ausência de schema.

### O que falta
- Setar `VITE_GOOGLE_MAPS_KEY` no `.env.local` (ou Vercel) pra ativar autocomplete.
- ~~UI de criação/edição de rota~~ ✅ feito 20/05/2026 (NovaRotaModal + RotaDetalheModal + ParadasEditor)
- Otimização de rota (Maps Directions API — futuro)
- Foto na coleta/entrega (Storage privado)

---

## 2. Pendências (ordem)

1. ~~Schema parte 2: criar tabela `rota`~~ → `sql/06-rota.sql` pronto
2. ~~Hook `useRota`~~ → `useRotas.js` em modo real
3. ~~Ligar hook real + tratar `tabelaAusente`/`loading`/`error` na página~~ → feito
4. ~~Integração Google Maps Places no `AddressInput.jsx`~~ → feito (precisa `VITE_GOOGLE_MAPS_KEY`)
5. ~~Aplicar `sql/06-rota.sql` no Supabase~~ ✅ **feito 19/05/2026**
6. ~~Embed do motorista `nome`→`apelido`~~ ✅ **feito 20/05/2026 (Onda 4)**
7. ~~UI de criação/edição de rota (drag-and-drop pra reordenar)~~ ✅ **feito 20/05/2026** — `NovaRotaModal` + `RotaDetalheModal` + `ParadasEditor` (HTML5 DnD nativo)
8. Foto da coleta (obrigatória, com opção pular) — base64 + Storage
9. Foto da entrega (opcional)

---

## 3. Tabela `rota` (schema parte 2 — versionado em `sql/06-rota.sql`, não aplicado)

**Decisão tomada (19/05/2026):** uma tabela só (`rota`) com `paradas` como
**`jsonb`** (NÃO `jsonb[]` — array vai dentro do jsonb único, padrão Postgres).

**Por quê 1 tabela e não 2 (`rota` + `parada_rota`):**
1. MVP — paradas são sempre manipuladas em conjunto (drag-and-drop da rota inteira), não consultadas individualmente em escala
2. Schema da parada ainda vai evoluir (foto, geocoding, observações, horário de chegada) — jsonb evita migração a cada ajuste
3. Volume baixo: ~10-15 paradas/dia → 1 linha por dia, jsonb fica trivial
4. **Reversível**: se um dia precisar query por parada (relatório por OS, foto por entrega), promover via `INSERT ... SELECT jsonb_array_elements(paradas)`

### Tabela `rota` (campos)
- `id uuid` PK
- `data date` NOT NULL
- `motorista_id uuid` FK → `usuarios`
- `paradas jsonb` (array de objetos — shape documentado no SQL)
- `status rota_status` ENUM `'planejada' | 'em_andamento' | 'concluida' | 'cancelada'`
- `iniciada_em / concluida_em / km_total` (métricas — futuro)
- `observacoes text`
- Auditoria padrão Idemaq + soft-delete
- UNIQUE `(data, motorista_id)` — uma rota ativa por motorista/dia

### Shape de cada parada dentro do jsonb
```jsonc
{
  "id": "uuid-local",         // estável p/ React keys
  "ordem": 1,                 // sequência manual
  "tipo": "coleta" | "entrega",
  "os_id": "uuid",            // FK lógico (sem constraint formal)
  "os_num": 247,              // denormalizado p/ exibição
  "cliente_nome": "Ana Reis",
  "cliente_fone": "(67) 9 9911-1010",
  "endereco": "R. das Acácias, 412 — Naviraí/MS",
  "lat": -23.0654,            // futuro: vem do Google Places
  "lng": -54.1898,
  "horario_previsto": "08:30",
  "horario_chegada": null,    // preenchido ao concluir
  "status": "pendente" | "em_andamento" | "concluida" | "pulada",
  "foto_url": null,           // futuro: Storage privado
  "observacoes": null
}
```

### Índices
- `idx_rota_data` (DESC, soft-delete)
- `idx_rota_motorista`, `idx_rota_status`
- `idx_rota_paradas_gin` (GIN `jsonb_path_ops`) — pra busca por `os_id` dentro das paradas

### RLS
- SELECT: dono, logística, oficina
- INSERT/UPDATE/DELETE: dono + logística (Alessandro)

---

## 3.1. Hook `useRotas` (`src/hooks/useRotas.js`)

Modo real, padrão idêntico ao `useFinanceiro` com `tabelaAusente` gracioso:

```js
const { rotas, loading, error, tabelaAusente,
        refetch, concluirParada, reordenarParadas,
        criar, atualizar, excluir } = useRotas({ data, motorista_id, status })
```

- Consulta: `from('rota').select('*, motorista:motorista_id(id, apelido)').is('deleted_at', null)` — **`apelido`, não `nome`** (tabela `usuarios` não tem `nome`). Corrigido na Onda 4 (20/05/2026).
- Quando a tabela ainda não existe (`42P01` / "Could not find the table") → `tabelaAusente: true`, lista vazia, sem throw.
- Mutações `concluirParada` / `reordenarParadas` fazem **UPDATE optimistic do jsonb `paradas` inteiro** (`.update({ paradas: novaLista }).eq('id', rota.id)`) com rollback em caso de erro.
- `criar/atualizar` fazem insert/update + `fetchAll()`. `excluir` é soft-delete (`deleted_at = now()`).

## 3.2. Componente `AddressInput` (`src/components/logistica/AddressInput.jsx`)

Autocomplete via Google Maps Places, com fallback automático pra texto livre:

- **Sem chave** (`VITE_GOOGLE_MAPS_KEY` ausente): input simples + hint "Autocomplete em breve". Devolve `{ endereco, lat: null, lng: null }`.
- **Com chave**: carrega `maps.googleapis.com/.../js?libraries=places` uma vez (singleton de Promise). Digita → debounce 250ms → `AutocompleteService.getPlacePredictions({ componentRestrictions: { country: 'br' } })` → lista dropdown abaixo do input. Click numa sugestão → `PlacesService.getDetails({ fields: ['geometry', 'formatted_address'] })` → devolve `{ endereco, lat, lng }`. Usa `AutocompleteSessionToken` (renovado a cada seleção) pra economizar quota.
- Se o script falhar (rede, quota), seta `mapsErro` e mostra hint "Maps indisponível agora — digite o endereço normalmente". Texto livre continua sendo emitido normalmente em todo caso.

Onde será usado:
- Cadastro/edição de cliente (`NovoClienteModalCompleto`)
- Cadastro de parada na rota (modal futuro)

Pra ativar em prod: setar `VITE_GOOGLE_MAPS_KEY` no Vercel (Project → Settings → Environment Variables) e no `.env.local` em desenvolvimento.

---

## 4. Endereços via Google Maps Places (a implementar)

Onde precisa validar:
- Cadastro de cliente (`NovoClienteModalCompleto` e modal próprio de Clientes)
- Edição de endereço de cliente
- Cadastro de parada na rota (opcional? a confirmar)

Comportamento:
- Input com autocomplete
- Ao selecionar: salva texto formatado + lat/lng (pra geocoding na rota)
- Permite digitar livre se Maps não achar

---

## 5. Foto na coleta/entrega

### Coleta (obrigatória)
- Foto da máquina ao recolher (proteção legal: mostra estado original)
- Opção "Pular" disponível, mas registra que pulou
- Upload pro Storage privado em `idemaq-privado/os/{os_id}/coleta/{n}.jpg`

### Entrega (opcional)
- Foto da máquina ao entregar (opcional)
- Mesma estrutura de Storage: `idemaq-privado/os/{os_id}/entrega/{n}.jpg`

**Nome do arquivo é renomeado pelo sistema** (não o original do upload).

**Regra de negócio**: OS de Atendimento/Fabricação só pode sair da zona Externa pra Interna se tiver pelo menos 1 foto anexada (a aplicar).

---

## 6. Rota diária

- Coletas + entregas na mesma rota
- Sequência definida pelo operador (drag-and-drop manual)
- Sugestão de rota ótima (futuro, via Maps Directions API)

Pra cada parada:
- Nome, endereço, telefone, horário
- Observações (código de entrada, andar, campainha, etc)

Estados:
- Pendente
- Em andamento
- Concluída

---

## 7. Painel diferente pro Alessandro (logística)

Quando o terminal `painel_func` evoluir, Alessandro precisa ver no painel dele:
- Próximas paradas do dia
- Pendências de coleta/entrega
- Tempo previsto vs realizado

Ver `contexto-painel-func.md`.

---

## 8. Visibilidade

Logística é visível pra:
- Dono
- Alessandro (logística — papel principal)
- Guilherme (oficina — vê mas não opera por padrão)

Sem restrição de menu.

---

## 9. Interseções com outras áreas

- **OS**: cada parada referencia uma OS. Mover OS de zona Externa → Interna depende de foto da coleta. Ver `contexto-os.md`
- **Clientes**: endereço do cliente é fonte da parada. Maps Places valida ao cadastrar. Ver `contexto-clientes.md`
- **Painel Funcionários**: Alessandro vê paradas do dia. Ver `contexto-painel-func.md`
- **Geral / cross-area**: schema parte 2 (tabela `rota`). Ver `contexto-geral.md`
