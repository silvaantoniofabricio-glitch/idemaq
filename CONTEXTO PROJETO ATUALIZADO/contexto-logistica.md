# Contexto — Logística

> Doc vivo do terminal `logistica`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 0a3. Sessão 21/05/2026 noite — Desktop alinhado com Mobile (A/B/C)

**Pedido do Toni:** "atualiza minha pagina logistica versao web inspirado na versão mobile".

**O que mudou em `src/pages/Logistica.jsx` (LogisticaDesktop):**

| Antes | Depois |
|---|---|
| Slots `Rota 1/2/3` (desktop) vs `Rota A/B/C` (mobile) — incompatíveis | Slots **`Rota A/B/C` em ambos** (sincronizado) |
| Grid 2 col: sidebar `OSDisponiveisSidebar` + lista grande de paradas \| mapa | Grid 2 col: **mapa grande à esquerda** (height 580) \| **3 accordions A/B/C empilhados à direita** |
| Click no pino → abre `RotaDetalheModal` da rota mãe | Click no pino disponível → **card flutuante `CardFlutuanteOS` sobre o mapa com +A/+B/+C** (igual mobile) |
| `OSDisponiveisSidebar` (componente de ~400 linhas com chips de etapa, busca, lista de cards) | **Removido do layout** — etapas viraram `FiltroEtapas` no topo (chips). OS aparecem como pinos no mapa. |
| Sem diagnóstico do mapa | `DiagnosticoMapa` mostra "X no mapa · Y geocodificando · Z sem endereço" |
| Sem auto-criação de slots | **Auto-cria Rota A/B/C** ao abrir o dia (igual mobile) |

**Subcomponentes do `LogisticaMobile.jsx` que viraram `export`** pra reuso no desktop:
`NOMES_SLOT`, `LETRA_POR_SLOT`, `ETAPAS_DEFAULT_LOGISTICA`, `tipoUiPorEtapa`, `normalizarTipoUi`, `VISUAL_TIPO`, `CardFlutuanteOS`, `RotaAccordion`, `FiltroEtapas`, `DiagnosticoMapa`. Decisão de exportar vs criar módulo compartilhado: o CLAUDE.md desencoraja abstrações desnecessárias — `LogisticaMobile` virou home dos componentes; desktop importa de lá.

**Que recursos do desktop antigo continuam acessíveis:**
- **Editar rota** (motorista, status, DnD de paradas, excluir) → botão "Editar Rota X" abaixo dos accordions abre `RotaDetalheModal`.
- **Nova rota extra** (fora dos 3 slots) → botão "Nova rota" no header abre `NovaRotaModal`.
- **OSDetalhe inline** → click em parada com `os_id` no accordion ou em "Ver OS completa" no card flutuante abre `<OSDetalhe>` sem trocar de rota.
- **Abrir rota no Google Maps** → `IconButton` de external-link no header.

**Que recursos do desktop antigo foram removidos** (já que mobile não tinha e ficou mais limpo):
- `OSDisponiveisSidebar` com busca/filtros próprios — etapas viraram chips simples no topo, OS pendentes aparecem como pinos tracejados no mapa.
- Lista grande de paradas com botões WhatsApp/Maps/Concluir por linha — accordion mostra paradas resumidas; pra concluir uma parada, abrir `RotaDetalheModal`.
- Toolbar de busca por texto — não tinha equivalente no mobile, era ruído.
- Chip de filtro de slot (Rota 1/2/3 na sidebar) — `rotaSelecionadaId` filtrava o mapa; agora cada accordion é seu próprio filtro visual.

**Resultado**: bundle 18KB menor (700KB vs 717KB), código do `LogisticaDesktop` reduziu de ~500 linhas pra ~280 (compartilha com mobile).

**Build local OK em 259ms.**

---

## 0a2. Sessão 21/05/2026 tarde — 3 slots de rota + mapa simplificado

**Pedido do Toni:**
1. As 3 rotas (Rota 1/2/3) já vêm abertas — só "encher" com OS.
2. Essas 3 rotas viram filtro dentro de "OS disponíveis" — selecionar uma → ver só ela no mapa.
3. Mapa simplificado: **3 cores** (coleta=azul, entrega=verde, outro=azulClaro) e pino mostra **número da ordem na rota** em vez de letra.

**Entregue:**

| Arquivo | Mudança |
|---|---|
| `sql/17-rota-nome.sql` | **NOVO (não aplicado).** ADD COLUMN `nome` + DROP UNIQUE antigo + UNIQUE (data, motorista_id, nome). Toni roda no Supabase pra ativar os slots automáticos. |
| `MapaLogistica.jsx` | TIPO_VISUAL reduzido pra 3 cores efetivas (cobranca/visita/avulsa caem em azulClaro). `svgPin()` aceita `texto` em vez de `letra` fixa (suporta 1 ou 2 dígitos). Pino aceita `ordem` por parada → mostra número da ordem em vez de letra. |
| `Logistica.jsx` | Auto-cria 3 rotas vazias (`Rota 1/2/3`) pra `dataAtiva` quando faltam. Fallback gracioso se a coluna `nome` ainda não existe (`schemaNomeAusente`). Estado `rotaSelecionadaId` filtra lista e pinos do mapa. Achata paradas injetando `ordem` (idx+1 se faltar) + `rotaNome`. Legenda do mapa reescrita pras 3 cores. |
| `OSDisponiveisSidebar.jsx` | Topo do card ganha chips `Todas / Rota 1 / Rota 2 / Rota 3` (componente `<ChipRota>` interno) com contador de paradas por chip. Mostra "slots desabilitados" se o SQL ainda não rodou. |

**Detalhes do auto-criar:**
- Guard via `useRef` (`criandoRotasRef`) evita disparar `criarRota` em loop enquanto o `fetchAll()` converge.
- Quando `criar({ nome })` retorna erro "column does not exist" → seta `schemaNomeAusente=true` e para de tentar (sem spam de erros).
- Filtro "semana" (`dataAtiva === null`) não cria slots — slot é por-dia.
- `rotaSelecionadaId` é resetado quando troca de data (id pertence a outro dia).

**Como vai ficar quando o SQL `sql/17` rodar:**
1. Abre `/logistica` em "Hoje" → 3 rotas vazias aparecem como chips na sidebar.
2. Toni clica em uma OS pendente → `AdicionarOSARotaModal` abre → escolhe destino (Rota 1/2/3) → OS vira parada.
3. Clica no chip "Rota 1" no topo da sidebar → mapa mostra só os pinos da Rota 1, numerados 1, 2, 3… conforme a ordem.
4. "Todas" volta a mostrar tudo (paradas das 3 rotas + OS disponíveis tracejadas).

---

## 0a. Sessão 21/05/2026 — Sincronização pós-refactor + fix de tipos

Verifiquei que o refactor de planejamento da sessão `geral` (§0b) preservou os 3 arquivos entregues em §0:

- `Logistica.jsx` ainda monta `<NovaRotaModal>` e `<RotaDetalheModal>` exatamente como deixei (linhas ~506-523).
- Pinos do mapa `MapaLogistica` chamam `setRotaDetalhe(rotaAlvo)` no click → abre meu `RotaDetalheModal`. Click no corpo da parada na lista também (lógica que plantei, mantida).
- `AdicionarOSARotaModal` (novo) consome `criarRota`/`atualizarRota` do mesmo `useRotas` — mesma camada de persistência, mesmo shape de jsonb (§3).

**Fix entregue hoje (1 arquivo):**

- **`ParadasEditor.jsx`** — Select de tipo só conhecia `coleta`/`entrega`/`servico`. Como a sessão geral expandiu o jsonb pra 5 tipos canônicos (`coleta`/`entrega`/`cobranca`/`visita`/`avulsa`), abrir uma parada criada via `AdicionarOSARotaModal` no `RotaDetalheModal` mostrava o Select **em branco** (valor não-listado) e qualquer interação com o Select **perderia o tipo original**. Expandido pra os 5 tipos canônicos, com cores alinhadas ao `MapaLogistica` (coleta=azul, entrega=verde, cobranca=amarelo, visita=azulClaro, avulsa=neutro). `servico` removido — era valor meu que ninguém usa em prod.

Também atualizei §0 trocando a antiga nota "outros componentes paralelos, documentar depois" por uma explicação de como meus modais convivem com o refactor. E reescrevi §1 (status) e §3 (schema) pra refletir o estado canônico pós-planejamento — ver baixo.

---

## 0b. Sessão 20/05/2026 noite — Logística virou ferramenta de planejamento

**Reformulação conceitual (sessão `geral`):**

A página `/logistica` deixou de ser "criar rotas avulsas" pra virar ferramenta de **PLANEJAMENTO** — decidir o que cabe junto em cada ida/volta do carro. Rotas ainda existem como entidade (tabela `rota` mantida), mas a UI agora orbita em torno das OS pendentes e do mapa.

**Entregue em 6 commits sequenciais:**

| Commit | O quê |
|---|---|
| `6c435b9` | Mapa real Google Maps centrado em Naviraí-MS (substituiu placeholder) |
| `c74b2d2` | Bootstrap loader oficial (fix race condition `script.onload` antes do `importLibrary` ficar pronto) |
| `b5c4786` | Sidebar `OSDisponiveisSidebar` + hook `useOSLogistica` (4 etapas + Pagamento) |
| `9ea8ccd` | Modal `AdicionarOSARotaModal` com 4 tipos (coleta/entrega/cobrança/visita) + validação 2C+2E |
| `9c0faa3` | Pinos coloridos no mapa por tipo de parada + parada Avulsa (5º tipo) |
| `d060392` | Sidebar movida pra coluna esquerda do grid (mesma posição da lista de rotas) |
| `76697d7` | Mapa esconde POIs (restaurantes, hotéis, transit) — visual limpo |
| `6b05a98` | Click no card da sidebar abre `OSDetalhe` inline (via `useOSDetalheModal`) |

**Conceito de Rota refinado:**

Rota = 1 ida/volta do carro com até **2 coletas + 2 entregas** (limite físico — carro cabe 2 máquinas). Tipos de parada:

| Tipo | Vem de | Conta no limite 2+2? | Quando usar |
|---|---|---|---|
| Coleta | OS em `agendamento` | ✅ Sim | Buscar máquina do cliente |
| Entrega | OS em `entrega` | ✅ Sim | Devolver máquina pronta |
| Cobrança | OS em `pagamento` | ❌ Não | Passar pra receber, sem mover máquina |
| Visita | OS em qualquer das 4 etapas logísticas | ❌ Não | Manutenção rápida no local |
| Avulsa | Manual (sem OS) | ❌ Não | Loja de peça, posto, almoço, etc |

**`tipo` no jsonb `paradas`** ganhou 3 valores novos além do `coleta|entrega` original: `cobranca`, `visita`, `avulsa`. Schema do banco (`sql/06`) NÃO precisou mudar — jsonb aceita qualquer string.

**Arquivos novos:**

| Arquivo | Função |
|---|---|
| `src/hooks/useOSLogistica.js` | Busca OS nas etapas relevantes (`aguardando_agendamento`, `agendamento`, `teste_final`, `entrega` + opcional `pagamento`). Exporta `tipoParadaPorEtapa()` e `FILTROS_ETAPA_LOGISTICA`. |
| `src/hooks/useOSDetalheModal.js` | Encapsula `useOS` + `useUsuarios` + auth + callbacks pra renderizar `<OSDetalhe>` em qualquer página. Hoje usado na Logística; futuramente Kanban também (refator opcional). |
| `src/components/logistica/MapaLogistica.jsx` | Google Map com Bootstrap Loader. Marker da oficina sempre laranja "O". Aceita `paradas` com `{ lat, lng, tipo, label, onClick? }` → pinos SVG coloridos com letra (C/E/$/V/A). `clickableIcons: false` + styles escondem POIs. `fitBounds` automático quando paradas mudam. |
| `src/components/logistica/OSDisponiveisSidebar.jsx` | Lista de OS pendentes com chips de filtro (5 etapas). Default: 4 marcadas, Pagamento desmarcado. Click no nome → `onAbrirOSDetalhe`. Botão "+ Rota" → `onSelecionarOS`. |
| `src/components/logistica/AdicionarOSARotaModal.jsx` | Modal de adicionar OS (ou parada avulsa) a uma rota. Modo `'os'` ou `'avulsa'`. Em modo avulsa esconde chips de tipo e mostra form (nome + AddressInput). Valida limite 2C+2E. |

**Botão "Parada avulsa" novo no header** da página — abre o `AdicionarOSARotaModal` em modo avulsa direto.

**Limitação conhecida MVP:**

- OS sem lat/lng (campo `cliente.endereco` ainda é texto livre) **não aparecem no mapa**. Aparecem na sidebar e na lista de paradas. Quando endereço for editado via `AddressInput`, ganha coords automático.
- Click em pino do mapa abre `RotaDetalheModal` da rota mãe (não a OS individual).
- "Rotas de Hoje/Amanhã/Semana" — os chips de filtro já existiam, não mexi nessa parte (continua funcionando como antes).

---

## 0. Sessão 20/05/2026 — UI de criação/edição de rota (drag-and-drop)

**Entregue (commit `c1a774d`):**

| Arquivo | Tipo | Função |
|---|---|---|
| `src/components/logistica/ParadasEditor.jsx` | NOVO | Lista editável de paradas com DnD HTML5 nativo (reusado pelos 2 modais) |
| `src/components/logistica/NovaRotaModal.jsx` | NOVO | Modal de criação — data, motorista, observações, paradas |
| `src/components/logistica/RotaDetalheModal.jsx` | NOVO | Modal de edição + concluir parada + excluir rota |
| `src/pages/Logistica.jsx` | EDIT | Botão "Nova rota" no header + click na parada abre detalhe |
| `CONTEXTO PROJETO ATUALIZADO/contexto-logistica.md` | EDIT | Este doc |

**Decisões técnicas:**

1. **Drag-and-drop com HTML5 nativo (não `@dnd-kit`)** — o projeto não tem `@dnd-kit` instalado (conferido em `package.json`) e a regra de ouro do CLAUDE.md proíbe adicionar dependências sem aprovação. HTML5 `draggable + onDragStart/onDragOver/onDrop` resolve com ~30 linhas dentro do `ParadasEditor`. Suficiente pra reorder simples de 5-15 paradas/dia.
2. **`ParadasEditor` compartilhado** entre os 2 modais pra evitar duplicação. Recebe `paradas` controlled + `onChange`, `osOptions` opcional pro picker, e `onConcluirParada` opcional (só aparece o botão "Concluir" quando passado — só na edição, não na criação).
3. **Picker de OS via `useOS`** — Select com `OS #N — cliente`. Quando o usuário escolhe uma OS, o editor auto-preenche `cliente_nome` e `cliente_fone` **só se estavam vazios** (não sobrescreve edição manual). Limita a 200 OS pra não estourar o Select.
4. **Motoristas via `useUsuarios`** filtrados por `papel ∈ {logistica, dono}` (Toni dirige também). Usa `apelido` (tabela `usuarios` não tem `nome` — repete a lição da Onda 4).
5. **DnD no detalhe NÃO usa `useRotas.reordenarParadas`** — o modal de detalhe mantém um draft local e só persiste tudo (paradas + campos da rota) no botão "Salvar alterações" via `useRotas.atualizar`. Mais previsível pro operador (pode arrastar e desistir). O hook `reordenarParadas` continua disponível pro caso de uma UI de "reordenar em linha" no futuro (lista da página).
6. **"Concluir parada" individual SIM dispara `useRotas.concluirParada` direto** dentro do modal — é uma ação atômica clara e já é optimistic no hook. O draft local também é atualizado pra feedback visual imediato.
7. ~~**Tipo `servico`** adicionado às paradas — cor amarela.~~ **REVOGADO em 21/05/2026**: a sessão `geral` (§0b) padronizou os tipos como `coleta`/`entrega`/`cobranca`/`visita`/`avulsa`. `servico` foi removido do `ParadasEditor` e substituído por `visita` (mesma ideia, nome canônico).

**Validações dos modais:**
- Data obrigatória
- ≥ 1 parada com endereço preenchido (paradas em branco são descartadas no save)
- `ordem` é renumerada (1..N) ao persistir

**Integração com o refactor de planejamento (sessão `geral`, ver §0b acima):** os modais entregues aqui continuam sendo o "cérebro" de criar/editar rota — o que mudou é o entorno:
- `NovaRotaModal` permanece como o botão "+ Nova rota" no header.
- `RotaDetalheModal` permanece sendo aberto pelo click no corpo de qualquer parada da lista (e pelo click em pino do mapa via `onClick` de cada parada — abre a rota mãe, não a OS).
- `ParadasEditor` permanece sendo o editor de paradas dentro dos 2 modais.
- O novo `AdicionarOSARotaModal` (sessão geral) NÃO substitui esses modais — ele é um caminho alternativo de adição: pega 1 OS específica da sidebar e plugha numa rota existente OU cria rota nova passando pelos mesmos `criarRota/atualizarRota` do hook.

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
