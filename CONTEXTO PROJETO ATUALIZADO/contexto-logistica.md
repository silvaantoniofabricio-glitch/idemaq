# Contexto — Logística

> Doc vivo do terminal `logistica`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 0. Decisões técnicas da Logística

- **Slots Rota A/B/C**: `dataAtiva = HOJE` fixo. Auto-cria 3 rotas ao abrir o dia via guard `useRef(criandoRotasRef)`. `sql/17-rota-nome.sql` + `sql/18-rota-constraint-fix.sql` + `sql/19-rota-duplicatas-cleanup.sql` + `sql/20-rota-rls-fix.sql` — ✅ **aplicados em 2026-05-27** (coluna `nome`, UNIQUE `(data, motorista_id, nome) NULLS NOT DISTINCT`, duplicatas limpas, RLS permissiva pra `authenticated`).
- **Componentes compartilhados**: `LogisticaMobile.jsx` é home dos subcomponentes (`CardFlutuanteOS`, `RotaAccordion`, `FiltroEtapas`, `DiagnosticoMapa`, etc.). Desktop importa de lá — evita módulo separado.
- **DnD**: HTML5 nativo (não `@dnd-kit` — não está instalado). `RotaDetalheModal` mantém draft local e persiste tudo no "Salvar alterações"; "Concluir parada" individual dispara `useRotas.concluirParada` direto (optimistic).
- **Motoristas**: usar `apelido` (tabela `usuarios` não tem `nome`).
- **OS sem lat/lng** (endereço texto livre) aparecem na sidebar mas não no mapa. Ganham coords via `AddressInput` ao editar o endereço do cliente.
- **Tipo `servico` inválido**: removido em 21/05. Tipos canônicos: `coleta | entrega | cobranca | visita | avulsa`.

---

## 1. Status atual

🟢 **Ferramenta de planejamento + CRUD de rotas, integrados em prod** (20-21/05/2026).

A página `/logistica` é hoje uma ferramenta de PLANEJAMENTO (ver §0b): sidebar de OS disponíveis à esquerda, mapa Google real à direita, lista de rotas do dia/semana embaixo. CRUD de rotas (criar / editar / excluir) acontece via 2 modais; adição de OS específica numa rota acontece via um 3º modal alternativo. Toda persistência passa pelo mesmo `useRotas`.

**Por arquivo:**

- `src/pages/Logistica.jsx` — UI 2 colunas (sidebar+lista | mapa+legenda). Header com 3 botões: "Abrir no Maps", "Parada avulsa", "+ Nova rota". Consome `useRotas` + `useOSDetalheModal`. Trata `loading`, `tabelaAusente` e `error` com EmptyStates.
- `src/hooks/useRotas.js` — modo real, JOIN `usuarios(id, apelido)`. `concluirParada/reordenarParadas` fazem UPDATE optimistic do jsonb `paradas` inteiro com rollback. `criar/atualizar/excluir` (soft-delete) implementados.
- `src/hooks/useOSLogistica.js` (sessão geral) — busca OS nas etapas relevantes pra logística. Exporta `tipoParadaPorEtapa()` e `FILTROS_ETAPA_LOGISTICA`.
- `src/hooks/useOSDetalheModal.js` (sessão geral) — encapsula `useOS`+`useUsuarios`+auth+callbacks pra abrir `<OSDetalhe>` em qualquer página.
- `src/components/logistica/MapaLogistica.jsx` (sessão geral) — Google Map real (Naviraí-MS) via Bootstrap Loader oficial. Marker laranja "O" da oficina. Pinos SVG coloridos por tipo (5 tipos canônicos). `fitBounds` automático. POIs (restaurantes/hotéis/transit) escondidos.
- `src/components/logistica/OSDisponiveisSidebar.jsx` (sessão geral) — lista de OS pendentes com chips de filtro (5 etapas, Pagamento desmarcado por default). Click no nome → `OSDetalhe`. Botão "+ Rota" → `AdicionarOSARotaModal`.
- `src/components/logistica/AdicionarOSARotaModal.jsx` (sessão geral) — pega 1 OS (ou parada avulsa) e plugha em rota nova OU existente da mesma data. Valida limite 2C+2E. Tipos: coleta/entrega/cobranca/visita (ou avulsa em modo manual).
- `src/components/logistica/AddressInput.jsx` — autocomplete via Google Maps Places quando `VITE_GOOGLE_MAPS_KEY` setada. Loader singleton, debounce 250ms, session token. Fallback texto livre.
- `src/components/logistica/ParadasEditor.jsx` — lista editável com **DnD HTML5 nativo** (`@dnd-kit` não está instalado). Reusado por `NovaRotaModal` e `RotaDetalheModal`. **5 tipos canônicos** (coleta/entrega/cobranca/visita/avulsa) desde 21/05 — antes só 3.
- `src/components/logistica/NovaRotaModal.jsx` — criação. Data + motorista + observações + paradas. Valida data + ≥1 parada com endereço. Chama `useRotas.criar({ data, motorista_id, paradas, status:'planejada', observacoes })`.
- `src/components/logistica/RotaDetalheModal.jsx` — edição + Select de status (`planejada`/`em_andamento`/`concluida`/`cancelada`). "Excluir rota" 2 cliques. "Concluir" por parada chama `useRotas.concluirParada` direto. DnD é draft local — só persiste no "Salvar alterações" via `useRotas.atualizar`.
- `sql/06-rota.sql` — ✅ APLICADO em 19/05/2026. Tabela `rota` em prod com jsonb `paradas` aceitando os 5 tipos (jsonb não precisa de migration pra novos valores).
- `scripts/verificar-tabela-rota.mjs` — `node scripts/verificar-tabela-rota.mjs` reporta se o SQL já rodou.

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

## 3. Tabela `rota` (schema parte 2 — versionado em `sql/06-rota.sql`, ✅ aplicado 19/05/2026)

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
  "tipo": "coleta" | "entrega" | "cobranca" | "visita" | "avulsa",
  "os_id": "uuid",            // FK lógico (sem constraint formal); null em avulsa
  "os_num": 247,              // denormalizado p/ exibição; null em avulsa
  "cliente_nome": "Ana Reis",
  "cliente_fone": "(67) 9 9911-1010",
  "endereco": "R. das Acácias, 412 — Naviraí/MS",
  "lat": -23.0654,            // vem do Google Places (AddressInput) ou null
  "lng": -54.1898,
  "horario_previsto": "08:30",
  "horario_chegada": null,    // preenchido ao concluir
  "status": "pendente" | "em_andamento" | "concluida" | "pulada",
  "foto_url": null,           // futuro: Storage privado
  "observacoes": null
}
```

**Os 5 tipos** estão alinhados em 3 arquivos — alterar `TIPOS` em **um** exige tocar nos outros 2:
| Tipo | ParadasEditor (Select) | MapaLogistica (pino) | AdicionarOSARotaModal (chips) | Conta no limite 2C+2E? |
|---|---|---|---|---|
| coleta   | ✅ | azul `#5B9BD5` (C) | ✅ | ✅ |
| entrega  | ✅ | verde `#8FBC55` (E) | ✅ | ✅ |
| cobranca | ✅ | amarelo `#FFD966` ($) | ✅ | ❌ |
| visita   | ✅ | azulClaro `#B8CCE4` (V) | ✅ | ❌ |
| avulsa   | ✅ | cinza `#9CA3AF` (A) | ✅ (modo avulsa) | ❌ |

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

## 3.3. Componente `ParadasEditor` (`src/components/logistica/ParadasEditor.jsx`)

Lista controlled de paradas com **drag-and-drop nativo HTML5** (sem libs). Reusado por `NovaRotaModal` e `RotaDetalheModal`.

```jsx
import ParadasEditor, { paradaVazia } from '../components/logistica/ParadasEditor'

<ParadasEditor
  T={T} dark={dark}
  paradas={paradas}                  // array controlled (shape do jsonb)
  onChange={setParadas}              // (novoArray) => void
  osOptions={[                       // opcional — picker de OS por parada
    { value: 'uuid', label: 'OS #247 — João', numero: 247, cliente: 'João', fone: '67 9...' }
  ]}
  onConcluirParada={(paradaId) => {} } // opcional — só passa no modal de edição
/>
```

**O que faz internamente:**
- DnD: handle `ti-grip-vertical` à esquerda; `onDragOver` destaca a linha-alvo com borda colorida; `onDrop` move o item no array.
- Adiciona parada nova com `paradaVazia(tipoSugerido)` — sugestão alterna `coleta`↔`entrega` baseado na última.
- Ao escolher uma OS no Select, auto-preenche `cliente_nome` e `cliente_fone` SE estavam vazios (preserva edição manual).
- **NÃO persiste**. Quem decide o quê fazer com o novo array é o componente pai (modal/página).

**Tipos de parada suportados (5 canônicos, alinhados ao MapaLogistica):** `coleta` (azul) · `entrega` (verde) · `cobranca` (amarelo) · `visita` (azulClaro) · `avulsa` (neutro). Tipo `servico` foi removido em 21/05/2026 — não é mais válido.

---

## 3.4. Modais `NovaRotaModal` e `RotaDetalheModal`

**`NovaRotaModal` (`src/components/logistica/NovaRotaModal.jsx`)**
```jsx
<NovaRotaModal
  T={T} dark={dark}
  onClose={() => setNovaRotaAberta(false)}
  onCriar={criarRota}   // = useRotas().criar — devolve { data, error }
/>
```
- Internamente usa `useUsuarios` e `useOS(false)` pra popular Selects.
- Valida data + ≥1 parada com endereço.
- Status inicial gravado: `'planejada'`.

**`RotaDetalheModal` (`src/components/logistica/RotaDetalheModal.jsx`)**
```jsx
<RotaDetalheModal
  T={T} dark={dark}
  rota={rotaSelecionada}                // objeto da lista do useRotas
  onClose={() => setRotaDetalhe(null)}
  onAtualizar={atualizarRota}           // = useRotas().atualizar
  onExcluir={excluirRota}               // = useRotas().excluir (soft-delete)
  onConcluirParada={concluirParadaHook} // = useRotas().concluirParada
/>
```
- Mostra status atual no header (Badge: planejada/em_andamento/concluida/cancelada).
- "Concluir" por parada dispara `onConcluirParada(rotaId, paradaId)` IMEDIATAMENTE (já é optimistic) + atualiza draft local pra feedback visual instantâneo.
- "Excluir rota" exige **dois cliques** (1º vira "Confirmar exclusão?", 2º executa).
- "Salvar alterações" envia patch completo: `{ data, motorista_id, status, observacoes, paradas (renumeradas) }`.

---

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
