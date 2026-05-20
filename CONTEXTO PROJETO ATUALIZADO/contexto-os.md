# Contexto — OS / Kanban / OSDetalhe

> Doc vivo do terminal `os`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

### Kanban (`src/pages/Kanban.jsx`)
- ✅ UI + drag-and-drop persistindo no Supabase (optimistic + rollback)
- ✅ Toggle "aguardando peça" persiste
- ✅ **Realtime ligado (19/05/2026 noite)**: `useOS` subscreve `postgres_changes` na tabela `os` e faz refetch silencioso. 2 dispositivos veem mudanças em tempo real. **Gotcha**: precisa habilitar a tabela `os` na publication `supabase_realtime` do dashboard Supabase
- ✅ SELECT inclui `os_item(count)` (mapeado pro campo `itens`)
- ✅ Filtra `cliente.deleted_at` em JS pós-fetch (outer join — fabricação tem `cliente_id NULL` e precisa aparecer)
- ✅ Skeleton de 3 cards/coluna enquanto loading

### Nova OS (`src/_legacy/desktopKanbanModals.jsx`)
- ✅ **Salva real** (19/05/2026 → commit em 20/05): busca cliente do Supabase com debounce **250ms** + ILIKE em nome/telefone + **mínimo 2 chars** + LIMIT 20
- ✅ Cadastro inline via helper `criarClientePersist` de `useClientes.js` (standalone — evita carregar 782 clientes só pra cadastrar 1)
- ✅ `salvar()` faz INSERT em `os` (trigger preenche `numero`/`criado_em`/`criado_por`)
- ✅ Toast verde "OS #NNN criada", aparece imediato no Kanban via Realtime
- ⚠️ **Exceção `_legacy` autorizada pelo dono (20/05/2026)**: edição cirúrgica do trecho NovaOSModal pra trocar `CLIENTES_MOCK` por busca real. Resto do arquivo não tocado. Imports `CLIENTES_MOCK`/`adaptarClientesMock` ficaram órfãos (sem uso) — deletar quando o arquivo for refatorado pra fora do legacy

### OSDetalhe + 10 Ações (`src/components/osDetalhe/`)
- ✅ Header redesenhado (foto 72x72 + nome cliente big + contato + equipamento)
- ✅ Todas as 10 ações implementadas visualmente (17-18/05/2026)
- ✅ Resumo Tab completa: banners contextuais, mini-cards de prazo, RelatorioDiagnostico compartilhado, orçamento admin-only, histórico recente, observações
- ✅ `updateOS(numero, patch)` exposto pelo hook `useOS` (movido pra lá em 19/05/2026 noite): retorna `{ ok, error, skipped }`. Consumer (Kanban) só wrappa pra toast em erro. Manual de insert em `os_historico` removido — trigger do banco cuida
- ✅ Persiste parcial via `normalizePatchOS()` em `utils/osPatch.js`: whitelist + optimistic + rollback
- ✅ **Schema parte 2 plugado (19/05/2026)**: checklist de Recebido / Em oficina / Teste final persistido em `checklist_etapa`; falhas de teste em `falha_teste` (substituiu jsonb em memória `os.teste_falhas`)
- ✅ **OS de garantia funcional (19/05/2026)**: botão em AcaoConcluido cria OS nova via `criarOSDerivada()` (atendimento + garantia=true + valor 0 + 90 dias)
- ✅ **Recusada → Fabricação refeito (19/05/2026)**: agora cria OS NOVA com `os_origem_id`, preservando o cliente na OS original (em vez de UPDATE in-place)

**Campos persistidos hoje** (via `updateOS`):
- Financeiro: `valor_total`, `desconto`, `valor_pago`, `pago`, `forma_pagamento`
- Outros: `prazo`, recusa, `aguardando_peca`

**Checklist por etapa** (via `useChecklistEtapa` → tabela `checklist_etapa`):
- `recebido`: 4 testes (entrada_agua/saida_agua/agitacao/centrifugacao) com valor ok/defeito/barulho + observações
- `em_oficina`: desmontagem/limpeza/montagem + checklist por item do diagnóstico (`serv:<key>`/`pend:<key>`)
- `teste_final`: 4 testes + 3 acabamentos condicionais (`acab:<id>`)
- Foto da coleta (jsonb `os.pre_diagnostico.foto`) **ainda em memória** — migrar pra Storage privado em outro PR

---

## 2. Próximos passos

1. **Aplicar `sql/05-schema-parte-2-checklist-falha.sql` no Supabase SQL Editor** se ainda não foi (publishable key não roda DDL). Sem isso, escritas em checklist_etapa/falha_teste falham silenciosamente.
1b. **Aplicar `sql/07-os-itens-baixados.sql`** (mesmo motivo): adiciona `os.itens_baixados` + `os_item.peca_id` pra baixa automática de estoque. Enquanto não rodar, a baixa só loga "schema-pendente" no console — OS conclui normal mas estoque não decrementa.
2. **Foto da coleta → Supabase Storage privado** (`idemaq-privado/os/{id}/coleta/`). Hoje base64 em memória no jsonb local `os.pre_diagnostico.foto`. Header e AcaoRecebido leem desse mesmo jsonb.
3. **Adicionar colunas pros campos pendentes em `os`**: `entrega_*` (data/hora/responsavel/obs), `observacoes` global (ver PENDENCIAS-ROTAS).
4. **AcaoOrçamento → lançamento real de itens via `useOSItens.addItem/updateItem/removeItem`** (hoje ainda escreve só local).
5. ✅ Schema parte 2 plugado (19/05/2026 — checklist_etapa + falha_teste em Recebido/Oficina/Teste).
6. ✅ OS de garantia (19/05/2026 — AcaoConcluido).
7. ✅ Conversão Recusada → Fabricação refeita com OS nova (19/05/2026 — ver §9 "Recusada").

---

## 3. Schema das tabelas OS

### `os`
- `id uuid` PK (gen_random_uuid)
- `numero bigint UNIQUE` (sequencial via trigger)
- `cliente_id uuid` FK → `cliente` (NULL pra Fabricação)
- `tipo` enum `os_tipo`: `atendimento | fabricacao | venda`
- `etapa` enum `os_etapa`: 11 valores (ver abaixo)
- `garantia bool`, `os_origem_id uuid` (FK → `os.id` se garantia=true)
- `garantia_dias int` (padrão 90)
- Pagamento: `pago` enum `os_pagamento_status` (`nao | parcial | total`), `valor_pago numeric(10,2)`, `forma_pagamento text`
- Financeiro: `valor_total`, `desconto`
- Soft-delete: `deleted_at`, `excluido_por`
- Auditoria automática via trigger: `criado_em/por`, `atualizado_em/por`

### `os_item`
- Itens (peças, serviços, taxa de diagnóstico — tudo "item")
- FK `os_id`
- Tipos: serviço · item/produto · custo de fabricação (pra OS de fabricação, itens viram custo, não receita)

### `os_historico`
- Cada mudança de etapa gera 1 linha (via trigger)
- Campos: `os_id`, `etapa_de`, `etapa_para`, `funcionario_id`, `data`, `duracao_segundos`, `observacao`
- Hard-delete CASCADE com a OS
- Permite relatórios cruzados (tempo médio por etapa, performance, etc)

### `pre_diagnostico`
- Schema existe, dados ainda em jsonb na `os.pre_diagnostico` (incluindo foto base64)
- A migrar pra coluna estruturada quando schema parte 2 entrar

---

## 4. Etapas (enum `os_etapa` — 11 valores)

`aguardando_agendamento | agendamento | recebido | diagnostico | orcamento | em_oficina | teste_final | entrega | pagamento | concluido | recusado`

**Definições importantes**:
- `Recebido` = pré-diagnóstico (primeiro teste e check do defeito aparente)
- `Diagnóstico` = entender o motivo da falha (trabalho técnico)
- `Orçamento` = único lugar onde se mexe em preço
- **Não existe etapa "A receber"** — Pagamento já cumpre essa função (entregue mas não pago)
- Se cliente paga **antes** da entrega, ao entregar a OS pula direto pra `Concluído` (não passa por Pagamento)

---

## 5. 3 Tipos de OS — Fluxos

### Atendimento (máquina do cliente)
`Aguardando ag.` → `Agendado` → `Recebido` → `Diagnóstico` → `Orçamento` → `Em oficina (Limpeza + Manutenção simultâneos)` → `Teste final` → `Entrega` → `Pagamento` → `Concluído`

Saída lateral: `Recusado` (dentro de Orçamento conceitualmente).
- Opções: converter pra Fabricação **ou** seguir pra Entrega

### Fabricação (máquina pro estoque)
`Compra direta` ou `conversão de Recusado` → `Diagnóstico (campos pré-preenchidos)` → `Limpeza + Manutenção` → `Teste final` → máquina entra no estoque + itens usados saem do estoque → `Concluído`

### Venda (produto pronto)
`Agendamento` → `Entregue` → `Pagamento` → `Concluído`

Comprador de máquina do estoque vira cliente cadastrado.

---

## 6. Kanban — Estrutura

### 4 abas no topo
**Todos** · **Externo** · **Interno** · **Financeiro**

### Zonas de atividade
| Zona | Cor | Colunas |
|---|---|---|
| Externo | azul | Aguardando ag., Agendamento, Entrega |
| Interno | amarelo | Recebido, Diagnóstico, Em oficina, Teste final |
| Financeiro | verde | Orçamento, Pagamento, Concluído (e Recusado quando toggle ativo) |

- Em **"Todos"** mostra as 11 colunas na ordem do fluxo
- 3 tipos de OS viram toggle múltiplo na linha de filtros, independente da zona; sempre fica pelo menos 1 tipo ativo
- Toggle **"Recusadas"** aparece só nas abas Todos e Financeiro

### Estados de pagamento no card
- **Não pago**: sem badge
- **Pago parcial**: badge amarela mostrando R$ pago/total (ex: "R$ 150/380")
- **Pago total**: badge verde "✓ Pago"
- Pagamento parcial entregue → vai pra `Pagamento` (resta receber)
- Pagamento total entregue → vai direto pra `Concluído`

### Drag-and-drop — regras
- Avança/volta 1 etapa por vez (não pula)
- `Concluído` **não volta** por drag (reabertura é ação explícita)
- `Recusado` só volta pra `Diagnóstico` ou converte pra Fabricação
- `Teste final` exige limpeza E manutenção concluídas
- `Concluído` exige pago total + entregue (ou Teste final no caso de Fabricação)
- Mover OS já paga pra `Pagamento` → sistema redireciona pra `Concluído` (toast verde)
- Movimentos bloqueados mostram **toast vermelho** com motivo
- Usar `podeMoverOS()` de `utils/osHelpers.js` antes de mover

### Responsabilidade por etapa
- **Sem responsável fixo por OS** — cada etapa tem seu próprio responsável
- Quem dá check fica registrado em `os_historico.funcionario_id`
- **Avatar do responsável NÃO aparece no card** (polui visualmente). Informação fica em:
  - Aba "Histórico" no OSDetalhe (timeline cronológica lida de `os_historico`)
  - Timeline horizontal no OSDetalhe (badge embaixo de cada etapa concluída)
  - Bloco "Última ação registrada"
  - Relatórios por funcionário
- Filtro "Resp." no Kanban filtra OS por funcionário que passou por ela

### Visibilidade por papel
- Colunas **Pagamento** e **Concluído** só visíveis pro **dono**
- RLS no banco bloqueia Alessandro/Guilherme de ver/editar OS nessas etapas

---

## 7. OSDetalhe — Header (18/05/2026)

Linha 2 do header: foto da máquina + bloco info estruturado.

- **Foto 72x72** à esquerda
  - Lê de `os.pre_diagnostico.foto` (base64 do AcaoRecebido)
  - Click em foto existente → abre `FotoAmpliadaModal` (overlay rgba(0,0,0,0.85), Esc/click-fora fecham)
  - Click em placeholder vazio → abre input file (mesma lógica do AcaoRecebido)
  - Salva via `onUpdateOS`
- **Bloco info** à direita (3 linhas):
  1. Nome cliente grande (17px, fonte 700) — clique abre toast "Cadastro do cliente em breve" (TODO `FormClienteEdit`)
  2. Contato 11.5px cinza — `ti-phone` + telefone (click WhatsApp) · `ti-map-pin` + endereço (click Maps). Chunks individuais clicáveis
  3. Equipamento 12px — `ti-device-washing-machine` azul + Marca·Modelo (strong) + (série) cinza + · defeito. Click abre toast (TODO `FormEquipamentoEdit`)
- Timeline com `border-top` separando do bloco novo

### Botão ⋮ "Mais ações" (20/05/2026)
- Dropdown ancorado no botão (top:calc(100% + 4px), right:0, z-index:50). Fecha por ESC, click-fora e click no item (atributo `data-mais-acoes` no container)
- 2 itens hoje:
  1. **Copiar nº da OS** — `navigator.clipboard.writeText(os.numero)` + toast
  2. **Excluir OS** (só pra admin via prop `admin`) — soft-delete (`deleted_at`+`excluido_por` via `supabase.auth.getUser`), `window.confirm` antes, fecha o modal e some do Kanban via filtro do `useOS`
- Histórico: botão nasceu disabled no commit `985f31c` (17/05, PR1) e ficou ~3 dias inerte. Não era regressão da Onda 2 (schema parte 2 não tocou em Header.jsx)

---

## 8. OSDetalhe — Tabs

- **Etapa**: delega pra `acoes/AcaoXxx.jsx` baseado em `os.etapa` (10 Ações registradas em `EtapaTab.MAP`)
- **Resumo**: contexto do caso (não duplica Cliente/Equipamento que já vivem no Header). Usa `RelatorioDiagnostico` compartilhado pro bloco de diagnóstico. Orçamento admin-only
- **Pagamento**: itens + recebimento (FormRecebimento real)

---

## 9. Etapas com formulário estruturado

### Recebido (Pré-diagnóstico)
4 testes × OK/Defeito/Barulho + textarea obs + **foto da coleta** (input file → base64 → preview com botão trocar/remover, salva em `os.pre_diagnostico.foto`).

### Diagnóstico
Checklist técnico 2×2 colapsável + busca + campo Causa.

### Orçamento
- Editor completo + atalhos rápidos
- Desconto bidirecional (R$ e % se atualizam mutuamente)
- 4 ações: Gerar PDF · Enviar WhatsApp · Aprovar→Oficina · Recusar
- **Único lugar onde se mexe em preço**
- Editável até o pagamento (pode adicionar itens a qualquer momento)
- Estados: Editando → Enviado → Aprovado / Recusado
- Ao enviar: bloqueia edição até cliente responder. Se precisar editar após envio: reabre edição + obriga reenvio
- Registra: por quem foi aprovado, data e hora

### Em oficina (regras críticas)
- **Card de Limpeza** só ativo se orçamento tem item com `/limpeza/i` no nome
- **Card de Manutenção** só ativo se orçamento tem qualquer item NÃO-limpeza
- Cada lado tem 3 etapas: Desmontagem · Limpeza/Serviço · Montagem
- **Desmontagem e Montagem sincronizadas** entre os dois cards (mesma máquina física) — marcar num lado marca no outro. Ícone `ti-arrows-left-right` "↔" indica
- **Serviço da Manutenção** = checklist dos itens marcados no Diagnóstico (peça troca, peça manutenção). Se diagnóstico vazio, mostra aviso pra completar
- **Segurança cruzada da Montagem** (anti-erro técnico): pra montar, o serviço do outro lado precisa estar 100% concluído. Mensagem: "Aguardando Limpeza" ou "Aguardando Manutenção"
- Estados sincronizam com `os.limpeza` / `os.manutencao` (`pendente`/`andamento`/`concluido`) e `os.oficina_execucao` (jsonb com todos os checks)
- **Falhas do Teste**: se OS volta do Teste final com falhas (campo `os.teste_falhas`), aparece banner vermelho no topo do AcaoOficina listando cada falha pra técnico saber o que corrigir

### Teste final
- MESMO checklist do Recebido (4 testes × OK/Defeito/Barulho)
- **Acabamento condicional** (3 toggles: Polimento · Limpeza final · Enceramento) que aparece SÓ se orçamento tem limpeza
- Aprovar só libera com todos os testes OK E (se aplicável) todo acabamento marcado
- Falhas (defeito/barulho) geram `os.teste_falhas` automaticamente

### Entrega (2 fases)
1. **Aguardando agendar entrega** com form data/hora/responsável/obs salvando em `os.entrega_data` etc
2. **Entrega agendada**: card resumo + botão WhatsApp pro cliente + Confirmar entrega (vai pra Pagamento ou direto Concluído se já paga) + Reagendar

### Pagamento
- `FormRecebimento` real: PIX/Cartão/Misto/A prazo/Dinheiro
- Pagamento adiantado em qualquer etapa
- Pagamento misto permitido (PIX + cartão + a prazo na mesma OS)
- Total lançado deve bater exatamente com total da OS — botão confirmar só libera quando valores batem
- A prazo: data de vencimento obrigatória, vai pra "Contas a receber" automaticamente

### Concluído
- Resumo final (cliente/equipamento/itens/tempo total/R$)
- Botão **OS de garantia** ✅ (19/05/2026 — `AcaoConcluido.abrirGarantia`)
  - Usa `criarOSDerivada(os.id, { tipo: 'atendimento', etapa: 'recebido', garantia: true, garantia_dias: 90, valor_total: 0, ... })`
  - Herda `cliente_id`, `marca_equipamento`, `modelo_equipamento`, `defeito_relatado` da OS original via SELECT na origem
  - Realtime do `useOS` leva a OS nova pro Kanban em <1s
  - Confirm dialog mostra cliente/equipamento/valor/dias antes de criar
- Reabrir (volta pra Entrega)

### Recusada
3 decisões:
1. **Converter em Fabricação** ✅ (refeito 19/05/2026 — `AcaoRecusada.converterFabricacao`)
   - Cria OS NOVA via `criarOSDerivada(os.id, { tipo: 'fabricacao', etapa: 'diagnostico', cliente_id: null })`
   - OS original mantém status `recusado` com cliente preservado (some em 24h via filtro do Kanban)
   - Marca/modelo/defeito copiados da origem (campos "pré-preenchidos" do contexto)
   - Itens NÃO são copiados — fabricação parte do zero (refurbish), custos lançados manualmente
   - Realtime do `useOS` leva a OS nova pro Kanban em <1s
   - **Resolve pendência antiga**: cliente que recusou continua rastreável na OS original
2. Cobrar taxa R$ 30 → Pagamento (⚠️ `observacoes` não persiste — ver PENDENCIAS-ROTAS.md)
3. Devolver máquina → Entrega

### Agendamento
Confirma data/hora + responsável.

---

## 10. Componente compartilhado: RelatorioDiagnostico

Em `src/components/osDetalhe/RelatorioDiagnostico.jsx`.

Bloco com defeito do cliente + causa do técnico + chips dos itens marcados.

Usado em: **Orçamento, Em oficina E Resumo do OSDetalhe** (unificado 18/05/2026).

Helper `itensMarcadosDoDiag` + map `ITENS_DIAG`.

---

## 11. Adicionar AÇÃO numa etapa

1. Criar `components/osDetalhe/acoes/AcaoMinhaEtapa.jsx` recebendo `{ T, dark, os, onMoverOS, onUpdateOS, setAba }`
2. Usar `<BlocoAcao T={T} dark={dark} icon="ti-..." etapa="Nome" descricao="...">` como wrapper (mantém visual "FAZER AGORA · ETAPA")
3. Exportar de `acoes/index.js`
4. Registrar em `tabs/EtapaTab.MAP[etapa_id]`
5. Pra avançar: `onMoverOS(os.numero, proximaEtapaId)`. Pra salvar campos: `onUpdateOS(os.numero, { campo: valor })`

---

## 12. Regras de negócio da OS

- OS abre **no agendamento**, não no recebimento (compromisso com cliente já existe)
- Itens são "itens" (não peças) — engloba máquina, capa, mangueira, qualquer coisa
- Taxa de diagnóstico = item normal no orçamento (sem campo especial); dono decide caso a caso
- OS some do Kanban 24h após concluída (visível via busca/relatórios/ficha do cliente)
- Coluna Concluído = mês corrente do calendário (não 30d corridos); busca escapa o filtro
- Foto obrigatória na coleta (com opção pular). Entrega = foto opcional
- Endereços validados via Google Maps Places (a implementar)

---

## 13. Garantia

- **OS de garantia = OS nova** de tipo `Atendimento`, com `garantia: true` e `os_origem_id` apontando pra OS original
- Constraint no banco: garantia=true exige `os_origem_id` não-nulo
- Valor padrão **R$ 0** (mão de obra não cobrada)
- Itens lançados normalmente: peça sai do estoque a preço de custo (sem cobrar do cliente)
- Card mostra badge azul "🛡 Garantia" + link pra OS original no detalhe
- OS original concluída dentro dos 90 dias mostra banner "Garantia ativa — faltam X dias"
- `garantia_dias` na OS original (padrão 90, configurável)

---

## 14. Interseções com outras áreas

- **Clientes**: NovaOSModal usa `criarClientePersist` standalone. Ver `contexto-clientes.md`
- **Estoque**: ✅ baixa automática ao concluir OS (20/05/2026) — `useOS.updateOS` dispara `baixarEstoqueAoConcluir(osId, osNumero)` fire-and-forget na transição pra `concluido`, que chama `baixarItensDaOS(osId)` de `usePecas.js`. **Idempotente** via claim atômico `UPDATE os SET itens_baixados=true WHERE itens_baixados=false`. Decremento via `os_item.peca_id` (avulsos com peca_id NULL são ignorados). Pré-requisito: aplicar `sql/07-os-itens-baixados.sql` no SQL Editor do Supabase. Categorias de peça espelham `ITENS_DIAG`. Ver `contexto-estoque.md` §9
- **Financeiro**: pagamento gera lançamento em `lancamento_financeiro` (schema parte 2 pendente). Ver `contexto-financeiro.md`
- **Geral / cross-area**: ✅ `checklist_etapa` + `falha_teste` aplicados (19/05/2026 via sql/05). `retorno_garantia` ainda pendente.

---

## 15. Hooks e helpers do schema parte 2 (19/05/2026)

### `src/hooks/useChecklistEtapa.js`
- `useChecklistEtapa(osId, etapaDb)` → `{ itens, observacoes, loading, error, salvar, refetch }`
- `etapaDb` é o enum do banco (`recebido | em_oficina | teste_final | …`), não o id da UI
- `itens` é jsonb array `[{ id, label, checked, ...extras }]`. Estrutura é decidida pelo front
- `salvar(itens, observacoes?)` faz upsert manual (SELECT existe → UPDATE/INSERT). Não usa `.upsert()` porque o UNIQUE index é parcial (`WHERE deleted_at IS NULL`)
- Carregado on-demand pelo OSDetalhe — fora do select do `useOS` pra não causar N+1 no Kanban

### `src/hooks/useFalhaTeste.js`
- `useFalhaTeste(osId)` → `{ falhas, abertas, loading, sincronizarAbertas, resolverTodas, refetch }`
- `sincronizarAbertas(descricoes)` resolve todas as abertas + insere as novas
- UI "barulho" mapeia pro enum `defeito` (mesmo conceito de "não passou no teste"), descrição preserva o texto original

### `src/utils/osDerivada.js`
- `criarOSDerivada(osOrigemId, overrides)` → `{ data, error, numero }`
- Standalone (não depende do `useOS`) — Realtime do hook leva a OS nova pro Kanban
- Faz 1 SELECT na OS origem pra puxar cliente/marca/modelo/defeito + INSERT com overrides
- Usado em: AcaoConcluido (OS de garantia) e AcaoRecusada (conversão pra Fabricação)
