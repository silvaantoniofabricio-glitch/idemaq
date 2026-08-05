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
- ✅ **Scroll inteligente (21/05/2026)**: `handleWheel` rola horizontal o Kanban por padrão, mas se o cursor está sobre uma coluna lotada com barra própria e ainda dá pra rolar na direção do gesto, deixa a coluna rolar nativamente. Detalhe em §17.
- ✅ **Reescrita Apple HIG (27/05/2026)**: `KanbanCard` usa elevação (shadow) no light mode, `background: #2a2a2d` no dark, accent stripe 3px na esquerda, tags em pill (borderRadius 100), tipografia cliente 13.5px. `KanbanColumn` tem stripe colorida no topo, header limpo com badge pill, borda transparente no dark. Barra de filtros: abas de zona viram segmented control estilo macOS (container acinzentado, aba ativa = branco/card com sombra); chips e campo de busca em pill-shape.

### Roteiro do Dia (`src/components/roteiro/RoteiroDia.jsx` + `src/hooks/useRoteiro.js`)
- ✅ **Substituiu a "Notas do Dia" (15/06/2026)**. Antes era 1 nota de texto compartilhada (string com `\n` em `configuracoes`, chave `kanban_notas_<data>`). Agora é agenda **por funcionário**, estruturada, ligada às OS e ao vivo.
- **Tabela nova**: `roteiro_item` (`sql/83-roteiro-dia.sql`) — 1 linha = 1 tarefa do dia de UM funcionário. Campos: `dia` (date local Cuiaba 'YYYY-MM-DD'), `responsavel_id`, `ordem`, `texto`, `os_id` (FK opcional → `os`), `urgente`, `feito`, `feito_em` + auditoria + soft-delete. RLS: funcionário vê/edita o próprio, dono tudo. **Gotcha**: o SQL já faz `ALTER PUBLICATION supabase_realtime ADD TABLE roteiro_item` — sem isso o "ao vivo" não funciona. **sql/83 APLICADO em 15/06/2026** (probe confirmou tabela + colunas no PostgREST). O fallback `tabelaAusente` segue no código como rede de segurança (padrão do `usePonto`).
- **Hook `useRoteiro({ dia, responsavelId })`**: carrega itens do dia (todos se dono; filtra por pessoa se funcionário) + Realtime (canal nome único) + mutações optimistic com rollback: `adicionar`, `marcarFeito`, `editarTexto`, `setUrgente`, `setOS`, `remover`, `reordenar`. Helper `diaCuiaba()` exportado.
- **2 modos no mesmo componente `RoteiroDia`** (decide por `getRole(user)`):
  - **Dono → Organizador**: 1 coluna por funcionário (papel ≠ dono). Add tarefa, vincular OS via `@` (MentionTextInput `onPick` → `setOS`), marcar urgente (flag), reordenar (drag HTML5 dentro da coluna), excluir. `maxWidth 920`.
  - **Funcionário → Meu Dia**: só a própria lista, barra de progresso azul (Deutan-safe, nada de verde sozinho) + "N de M", checks grandes (tap = `marcarFeito`), pendentes/urgentes no topo e feitas afundam, chip da OS abre o detalhe via `onAbrirOS`. `maxWidth 460`.
- **Ligado em**: `Kanban.jsx` (chip "Roteiro" ícone `ti-checklist`, `onAbrirOS` → `setDetalhe`) e `mobile/OSMobile.jsx` (FAB `ti-checklist`, `onAbrirOS` → `setOsAberta`). `MentionTextInput` agora é importado só pelo `RoteiroDia` (saiu de Kanban e OSMobile).
- **"Mandar pro roteiro" (15/06/2026)**: helper standalone `src/utils/roteiroEnvio.js` (`enviarOSParaRoteiro({os, responsavelId, dia, texto, apelidoDe})` + `textoAutoPorEtapa` + `diaRelativo`) — cria `roteiro_item` vinculado à OS de qualquer lugar, com anti-duplicata (se a OS já está no roteiro de alguém naquele dia, avisa em vez de duplicar) e texto automático pela etapa. Dois gatilhos, **só admin**: (1) item "Mandar pro roteiro" no menu ⋮ "Mais ações" do `osDetalhe/Header.jsx` (submenu pessoa + Hoje/Amanhã); (2) botão ⋮ no `KanbanCard` que aparece no hover (props `admin`/`funcionarios`/`onMandarRoteiro` drilladas via `KanbanColumn`; `stopPropagation` pra não disparar o arraste manual nem abrir a OS; menu via **portal** porque o card tem `transform` no hover — ver [[feedback_transform_quebra_fixed]]). Handler `mandarOSparaRoteiro` no `Kanban.jsx`.
  - **Diálogo de descrição (17/06/2026)**: ao escolher a pessoa, abre `src/components/roteiro/MandarRoteiroDialog.jsx` (modal via portal) com a descrição **pré-preenchida pela etapa** (cursor no fim pra acrescentar) → Enter/botão confirma e cria o item com o texto editado. Compartilhado pelos dois gatilhos.
  - **Avatar no card**: `Kanban` carrega o roteiro de hoje (`useRoteiro({})`, ao vivo) → `roteiroPorOS` (os_id→responsavel) → `KanbanCard` mostra avatar colorido (iniciais, cor por papel) ao lado do nº quando a OS está no roteiro.
- **Próximas ondas (não feitas — combinar com Toni)**: roll-over de pendências pro dia seguinte; marcar feito mover etapa da OS / logar em `os_historico`; sugestões automáticas ("OS na etapa Oficina sem responsável hoje → joga na coluna").

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
- ✅ **Enviar orçamento ao cliente (10/06/2026)**: na etapa Orçamento (`AcaoOrcamento.jsx`), o botão idle "Enviar orçamento ao cliente" agora monta a mensagem em texto corrido (estilo `FERRAMENTAS/gerador_idemaq_v4.html`) com `os.cliente` + causa/`os.defeito` + nomes das peças + `total`, e abre o WhatsApp do cliente (`whatsapp://send?phone=...&text=...`) já preenchido, depois marca `aguardando`. Helper `montarMensagemOrcamento` no próprio arquivo. Só dispara se `total > 0`. **Pendente**: replicar na higienização (`AcaoOrcamentoHIG.jsx`, 2 variantes de BotaoStatus, preço fixo R$165/185 — mensagem diferente).
- ✅ `updateOS(numero, patch)` exposto pelo hook `useOS` (movido pra lá em 19/05/2026 noite): retorna `{ ok, error, skipped }`. Consumer (Kanban) só wrappa pra toast em erro. Manual de insert em `os_historico` removido — trigger do banco cuida
- ✅ Persiste parcial via `normalizePatchOS()` em `utils/osPatch.js`: whitelist + optimistic + rollback
- ✅ **Schema parte 2 plugado (19/05/2026)**: checklist de Recebido / Em oficina / Teste final persistido em `checklist_etapa`; falhas de teste em `falha_teste` (substituiu jsonb em memória `os.teste_falhas`)
- ✅ **OS de garantia funcional (19/05/2026)**: botão em AcaoConcluido cria OS nova via `criarOSDerivada()` (atendimento + garantia=true + valor 0 + 90 dias)
- ✅ **Recusada → Fabricação refeito (19/05/2026)**: agora cria OS NOVA com `os_origem_id`, preservando o cliente na OS original (em vez de UPDATE in-place)
- ✅ **OSDetalhe acessível de outras páginas (20/05/2026 noite)**: novo hook `src/hooks/useOSDetalheModal.js` encapsula `useOS` + `useUsuarios` + auth + callbacks (`moverOS`, `updateOS`, `excluirOS`, `toggleAgPecaOS`). Retorna `{ abrirOSPorNumero, abrirOSPorId, modalProps }`. 1º consumidor: `Logistica.jsx` (click no card da sidebar abre OSDetalhe inline). Lógica é cópia da do Kanban — refator futuro pode unificar.
- ✅ **Foto da entrega obrigatória (21/05/2026)**: `AcaoEntrega` Fase 2 (entrega agendada) agora exige foto da máquina entregue antes de confirmar — botão fica opacity 0.5 + bloqueia avanço com toast quando sem foto + scroll auto. Storage: `os/{id}/entrega.jpg`. Marker em `pre_diagnostico.foto_entrega = 'storage'` (reusa jsonb existente, sem SQL). `osStorage.js` refatorado pra parametrizar tipo (`uploadFotoOS`, `getSignedUrlFoto`, `removerFotoOS`) — aliases `uploadFotoColeta` / `uploadFotoEntrega` mantidos pra retrocompat. `resolverFotoUrl(valor, osId, tipo)` aceita tipo opcional (default 'coleta').
- ✅ **Admin bypassa foto da entrega (21/05/2026 noite)**: `AcaoEntrega` recebe prop `admin` (vinda de `tabProps` do `OSDetalhe`) — quando `admin === true`, `confirmarEntrega()` não bloqueia se faltar foto, label do bloco vira "Foto da entrega · opcional" e o botão confirmar não fica opaco. Funcionário continua obrigado. Útil pro dono fechar entrega em mãos / OS retroativa.
- ✅ **Fluxo "Recusado" reformulado (03/06/2026)**: ao recusar orçamento em `AcaoOrcamentoHIG`/`AcaoOrcamento`, `resolver('recusado')` chama `onMoverOS(numero, 'recusado')` (antes só movia em `confirmado→oficina`). `podeMoverOS` libera `recusado` como etapa **lateral** (`if (etapaAlvo === 'recusado') return { ok: true }`) — pode vir de qualquer etapa, não precisa estar no fluxo linear. Também libera `recusado → entrega` pra devolver a máquina ao cliente. `Kanban.moverOS` grava `recusada = true` + `data_conclusao = now()` ao entrar em recusado (passa pelo filtro de mês do `useOS`). `useOS` filtra `concluido` por mês mas **recusado sempre aparece** (até ser movido pra entrega/fabricação). `verRecusados` default `true`. `AcaoEntregaHIG.confirmarEntregaConfirmado` checa `os.recusada` — se true, volta pra `recusado` em vez de `pagamento/concluido`. Loop removido em `Kanban.osFiltradas` que descartava cards de etapa recusado antes da distribuição por coluna.
- ✅ **Nova OS mobile redesenhada (21/05/2026 noite)**: criado `src/components/os/NovaOSMobile.jsx` (novo, mobile-first). Desktop continua usando `NovaOSModal` do `_legacy/` intocado. Mudanças visíveis: bottom sheet com drag handle + animação slide-up/fade, tipo como **segmented control** sempre visível (Atendimento/Venda/Fabricação) em vez de dropdown escondido, busca de cliente com **resultados como cards de 64px com avatar de iniciais** (não dropdown stretched), endereços e máquinas como **radio cards grandes**, **equipamento colapsado em acordeão** (opcional), inputs com `font-size:16px` (evita zoom iOS) e `minHeight:48-52px`, CTA sticky 54px com gradient fade no topo + `safe-area-inset-bottom`, indicador "**N de M obrigatórios**" no header. Reusa `criarClientePersist` + `NovoClienteModal` da pasta `components/clientes`. Mesmo payload de INSERT em `os` que o legacy. Confirmação "Descartar?" se houver campos preenchidos antes de fechar.
- ✅ **Fix zoom-on-focus iOS (21/05/2026 noite — v2)**: tentativa 1 (mexer viewport `maximum-scale`) foi revertida — afeta o app inteiro. Solução final: **media query mobile-only em `src/styles/global.css`** forçando `input, select, textarea { font-size: 16px !important; }` em telas ≤768px. Resolve sem tocar viewport e sem tocar componentes do UI lib (que continuam compactos no desktop). Atinge tanto o `NovaOSMobile` quanto o `NovoClienteModal` (que usa `<Input>` 12.5px do UI lib). `autoFocus` do input de busca de cliente também foi removido (boa prática mobile — não abre teclado sem o user pedir).

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

1. ✅ ~~**Aplicar `sql/05-schema-parte-2-checklist-falha.sql` no Supabase SQL Editor**~~ — **APLICADO em 19/05/2026** (Onda 2). checklist_etapa + falha_teste em produção.
1b. ✅ ~~Aplicar `sql/07-os-itens-baixados.sql`~~ — **APLICADO em 20/05/2026** (sessão `geral`). Verificador: `node scripts/verificar-sql-07.mjs`. Baixa automática de estoque agora roda end-to-end (idempotente via flag `os.itens_baixados`). Drift colateral em `usePecas.baixarItensDaOS` (filtrava coluna `tipo` removida na Onda 4 + usava `qtd` em vez de `quantidade`) **corrigido na mesma sessão**, igual em `AcaoOrcamento.salvar()` e `PagamentoTab.salvar()`.
1c. ✅ ~~Cadastro cliente + equipamento inline via Header do OSDetalhe~~ — **plugado em 20/05/2026** (Onda 5 + 3 ondas de fix). `FormClienteEdit` e `FormEquipamentoEdit` em `src/components/osDetalhe/`. Cliente: SELECT fresco por `id` na abertura (useOS só traz nome+telefone) + parser do endereço gravado por `criarClientePersist` (split em ` — `) + concat de volta no save + `UPDATE cliente WHERE id=os.cliente_id`. Após save, `onSalvarOk` dispara `osRefetch` propagado por Kanban→OSDetalhe→Header (useOS subscreve só `os`, não `cliente`). Equipamento: patch via `onUpdateOS` (optimistic do useOS) → `normalizePatchOS` traduz `marca/modelo/serie/defeito` pra `marca_equipamento/modelo_equipamento/numero_serie/defeito_relatado`. **Saga das colunas**: as 4 colunas de equipamento + `numero_serie` **não existiam em prod** (confirmado por probe — PostgREST 42703/PGRST204) apesar de o código referenciar em 4 lugares. Causou cascata quebrando o Kanban inteiro e expondo que o INSERT do NovaOSModal também já falhava silenciosamente. `sql/10-os-equipamento.sql` aplicado pelo Toni no Supabase → as 4 colunas criadas + `NOTIFY pgrst` → useOS SELECT+map, `osPatch.COLUNAS_SAFE` e payload do NovaOSModal **todos reativados**. Validador `scripts/probe-useos-select.mjs` no repo pra detectar regressão semelhante antes do push.
2. ✅ ~~Foto da coleta → Supabase Storage privado~~ — **plugada em 20/05/2026** (sessão `geral`). Bucket `idemaq-privado`, path `os/{osId}/coleta.jpg` (1 foto por OS, upsert). Helper em `src/utils/osStorage.js` faz compressão client-side via Canvas (max 1600px JPEG 85% — fotos de 5MB caem pra ~500KB) + upload + signed URL (TTL 1h) + remoção. `pre_diagnostico.foto` no banco agora guarda o marker `'storage'` em vez de base64 (URL é gerada on-demand). Retro-compatível: base64 legacy (`data:...`) continua sendo exibido direto via `resolverFotoUrl()`. **Pré-requisitos manuais (1x)**: criar o bucket `idemaq-privado` (private) no Supabase Dashboard + rodar `sql/08-storage-os-coleta.sql` pra criar as 4 policies (SELECT/INSERT/UPDATE/DELETE pra `authenticated`).
3. **Adicionar colunas pros campos pendentes em `os`**: `entrega_*` (data/hora/responsavel/obs), `observacoes` global (ver PENDENCIAS-ROTAS). ~~`numero_serie`~~ aplicado em 20/05 via `sql/10-os-equipamento.sql` junto das colunas de equipamento.
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
- ⚠️ **`recebido` APOSENTADO (06/07/2026)** — Avaliação + Diagnóstico unificados numa etapa só (`diagnostico`). O valor segue no enum (histórico referencia), mas nenhuma OS nova entra nele. `dbEtapaToUI` mapeia `recebido`→`diagnostico` (os.etapa antigo E os_historico). Migração: `sql/114`.
- `Diagnóstico` = testes de funcionamento + entender o motivo da falha + marcar componentes (tela unificada)
- `Orçamento` = único lugar onde se mexe em preço
- **Não existe etapa "A receber"** — Pagamento já cumpre essa função (entregue mas não pago)
- Se cliente paga **antes** da entrega, ao entregar a OS pula direto pra `Concluído` (não passa por Pagamento)

---

## 5. 3 Tipos de OS — Fluxos

### Atendimento (máquina do cliente)
`Aguardando ag.` → `Agendado` → `Diagnóstico (testes + componentes)` → `Orçamento` → `Em oficina (Limpeza + Manutenção simultâneos)` → `Teste final` → `Entrega` → `Pagamento` → `Concluído`

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
  1. Nome cliente grande (17px, fonte 700) — clique abre `FormClienteEdit` (20/05/2026, Onda 5)
  2. Contato 11.5px cinza — `ti-phone` + telefone (click WhatsApp) · `ti-map-pin` + endereço (click Maps). Chunks individuais clicáveis
  3. Equipamento 12px — `ti-device-washing-machine` azul + Marca·Modelo (strong) + (série) cinza + · defeito. Click abre `FormEquipamentoEdit` (20/05/2026, Onda 5)
- Timeline com `border-top` separando do bloco novo

### Botão ⋮ "Mais ações" (20/05/2026)
- ✅ **Bug de "não abria" corrigido na Onda 3 (20/05)**: dropdown voltou a abrir; problema era no handler de click-fora detectando o próprio botão como "fora".
- Dropdown ancorado no botão (top:calc(100% + 4px), right:0, z-index:50). Fecha por ESC, click-fora e click no item (atributo `data-mais-acoes` no container)
- 2 itens hoje:
  1. **Copiar nº da OS** — `navigator.clipboard.writeText(os.numero)` + toast
  2. **Excluir OS** (só pra admin via prop `admin`) — Header só chama `onExcluir(numero)` + `onClose`. A função real mora no Kanban (`excluirOS`) e faz **optimistic remove** via `setOsList(prev => prev.filter(...))` ANTES do UPDATE no Supabase. Rollback se UPDATE falhar. Não confia em Realtime (latência variável + publication `os` às vezes desabilitada)
- Histórico: botão nasceu disabled no commit `985f31c` (17/05, PR1) e ficou ~3 dias inerte. Não era regressão da Onda 2 (schema parte 2 não tocou em Header.jsx)

---

## 8. OSDetalhe — Tabs

- **Etapa**: delega pra `acoes/AcaoXxx.jsx` baseado em `os.etapa` (10 Ações registradas em `EtapaTab.MAP`)
- **Relatório** (`RelatorioTab.jsx` — renomeado de `ResumoTab` em 21/05/2026): relatório completo da OS, etapa por etapa. Banners contextuais + mini-cards + diagnóstico + orçamento (admin) + **bloco "Relatório por etapa"** (lê do histórico real + 3 hooks de `useChecklistEtapa` recebido/oficina/teste + `useFalhaTeste`; renderiza card por etapa com data/responsável + dados específicos: checklist resumido, falhas abertas/resolvidas, KPIs de pagamento) + histórico recente + observações. Aba `id: 'relatorio'` (era `'resumo'`); `abaInicial('concluido'|'recusado')` retorna `'relatorio'`.
- **Pagamento**: itens + recebimento (FormRecebimento real)

---

## 9. Etapas com formulário estruturado

### Diagnóstico (= ex-Avaliação + ex-Diagnóstico, unificados 06/07/2026)
Tela única (`AcaoDiagnosticoHIG.jsx` reescrito): relato do cliente → testes de funcionamento (toggle "não liga" + 4 testes × OK/Defeito/Barulho) → vazamentos (lavadora/lava-louças) → componentes afetados (busca + grupos + Troca/Manut.) → observações → CTA "Concluir diagnóstico" (exige testes avaliados OU não-liga, E ≥1 componente). **Persistência mantém as chaves antigas**: testes em `checklist.recebido.itens` (compat com OS antigas + RelatorioTab). `AcaoRecebidoHIG.jsx` ficou órfão (sem uso no MAP).

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
- **Histórico do Trello → OS REAIS importadas (21/05/2026)**: ~239 OS criadas via `sql/12-os-importar-trello.sql` (idempotente, tag `observacoes='TRELLO-CARD:<id>'` evita duplicação). Pipeline em 3 scripts (`importar-clientes-trello.mjs`, `importar-clientes-trello-restantes.mjs`, `importar-os-trello.mjs`) e 5 SQLs (sql/11, sql/12, sql/13 UPDATE A RECEBER→pagamento, sql/14 clientes restantes, sql/15 re-sync de etapa pra exports futuros, sql/16 diagnóstico). Helper `scripts/_trello-export-path.mjs` detecta automaticamente a pasta de export mais recente. Pagamento parseado de comentários (~66% cobertura). Equipamento ficou em branco (Trello não tinha). Mapeamento completo em `contexto-clientes.md §4b`. Endereço da OS vem do cliente embed via `useOS` (linha 67/109) — não há coluna `os.endereco` própria.

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

---

## 16. Notas de implementação (decisões importantes)

- **Chain `onRefetchOS`**: `Kanban.osRefetch` → `OSDetalhe` → `Header` → `FormClienteEdit.onSalvarOk`. Mesma propagação no `OSMobile`. Necessário porque `useOS` só traz `nome+telefone` do cliente via join — após editar cliente, precisa refetch pra refletir.
- **Saga colunas equipamento**: colunas `marca_equipamento/modelo_equipamento/numero_serie/defeito_relatado` não existiam em prod até 20/05 (`sql/10`). Se aparecer PostgREST 42703, rodar `scripts/probe-useos-select.mjs` antes de mexer no SELECT do `useOS`.
- **Scroll horizontal Kanban**: `handleWheel` em `Kanban.jsx` detecta se coluna sob cursor ainda tem espaço pra rolar verticalmente — se sim, deixa browser rolar; senão converte pra `scrollLeft += deltaY`.
- **RelatorioTab** (ex-ResumoTab): 3 hooks `useChecklistEtapa` + `useFalhaTeste` rodam ao montar a aba (4 queries extras). Se virar gargalo, migrar pra lazy on-demand.
- **OSDetalhe mobile**: `HeaderMobile.jsx` + `FooterMobile.jsx` são fork do desktop (`mobile=true` no `OSDetalhe.jsx`). Swipe-down-to-close só no grab handle (não no conteúdo). Desktop zero mudança.

---

## 17. Autoria dos checks (base do prêmio por desempenho) — 06/07/2026

Toda ação de check nas etapas grava **quem fez e quando** — carimbo `{ uid, em, apelido }` via hook `src/hooks/useAutorCheck.js` (`carimbo()` + formatador `fmtAutor()` → "Guilherme · 17/06 10:30"). Objetivo: alimentar o futuro **sistema de pontuação/prêmio por desempenho** dos funcionários (relatório ainda não construído).

Onde cada etapa guarda a autoria (tudo em `os.pre_diagnostico`):

| Etapa | Campo | Formato |
|---|---|---|
| Coleta | `coleta_confirmada` | carimbo (no Confirmar coleta) |
| Avaliação | `checklist.recebido.itens[].autor` | carimbo por teste |
| Diagnóstico | `componentes_autores[itemId]` | carimbo por componente (paralelo a `componentes_marcados`, que segue string `troca|manutencao` — NÃO mudar o formato, tem N consumidores) |
| Conserto | `oficina.execucao.<secao>.<check>` | o **próprio valor** do check é o carimbo (antes era `true` — consumidores devem tratar truthy) |
| Teste final | `checklist.teste_final.itens[].autor` | carimbo por teste/acabamento |
| Entrega | `entrega.realizada_por` | carimbo (junto do `realizada_em`) |

Regras:
- **Merge preservativo**: nos checklists (Avaliação/Teste), o autor só é carimbado quando o VALOR do item muda; salvar sem mudar preserva o autor original.
- **Retrocompatível**: dados antigos (`true`, itens sem `autor`) continuam funcionando; `fmtAutor` retorna `null` pra eles.
- **UI**: autor aparece em texto pequeno cinza ao lado do check (Oficina, Avaliação, Teste, Diagnóstico).
- **os_historico agora é gravado nos 3 lugares** que movem etapa (Kanban desktop, Modal `useOSDetalheModal`, mobile `OSMobile`) com `funcionario_id` — antes só o mobile gravava, então o relatório de Funcionários subnotificava desktop.

## 18. Pontuação por desempenho — placar (06/07/2026, sem prêmio em R$ ainda)

Motor de cálculo em `src/utils/pontuacao.js` (`calcularPontosOS(os)` pura, testada com `node` direto rodando o módulo ESM real — ver histórico do chat) + agregação em `src/hooks/usePontuacao.js` (`{ iniIso, fimIso } → { equipe: [...], totalPontos }`).

**Tabela de pontos** (normal calibrada por tempo médio × dificuldade; lava e seca ajustada manualmente pelo Toni em 08/07/2026 — desmontagem/montagem valem bem mais por causa do mecanismo extra de secagem):

| Serviço | Normal | Lava e seca |
|---|---|---|
| Coleta | 5 | 5 |
| Diagnóstico (bloco unificado) | 4 | 4 |
| Desmontagem *(1x/OS, compartilhada)* | 4 | **7** |
| Limpeza | 18 | 22 |
| Manutenção *(por peça/componente)* | 3 | 4 |
| Montagem *(1x/OS, compartilhada)* | 4 | **8** |
| Teste final | 1 | 1 |
| Acabamento *(só se tem limpeza)* | 2 | 2 |
| Entrega | 5 | 5 |

**Regras de atribuição**:
- Só pontua bloco **completo** (todos os testes preenchidos, ≥1 componente marcado, etc.) **e** com carimbo válido (`{uid,em,apelido}` — dados antigos sem autor não pontuam, naturalmente).
- Diagnóstico e Teste final (blocos com múltiplos itens) atribuem ao autor do **carimbo mais recente** dentro do bloco — assume que quem fechou por último é quem "entregou" o bloco.
- Manutenção pontua **por chave** em `oficina.execucao.manut_serv` (cobre peças de troca E o caso "sem peças" que usa a chave `feito`).
- Filtragem por período usa o campo `em` do carimbo (quando o check foi feito), **não** `criado_em`/`atualizado_em` da OS — uma OS aberta em junho pode pontuar em julho se só foi trabalhada depois.
- **OS de garantia (`os.garantia = true`) NÃO pontuam** (corrigido 07/07/2026 — `usePontuacao.js` pula essas OS inteiras). É retrabalho decorrente de um problema, não serviço novo; o desconto de quem fez o original é rastreado à parte em `useRelatorioQualidade.js`.
- **Retrabalho dentro da mesma OS não duplica ponto** — o check é um campo único sobrescrito a cada toggle (não um log). Se a OS volta da Oficina e alguém remarca, o carimbo antigo é substituído; só conta 1x, pro autor da versão final. Nuance: se o reparo cair num mês diferente da 1ª tentativa, o ponto "migra" inteiro pro mês da correção (não fica dividido).

**Tipo de equipamento novo**: `lava_seca` adicionado em `FormEquipamentoEdit.jsx` (TIPOS_EQUIP) + reaproveita testes/vazamentos/acabamento da lavadora (+ teste extra "Secagem") em `AcaoDiagnosticoHIG.jsx` e `AcaoTesteHIG.jsx`.

**Onde aparece**:
- Painel do Funcionário (`PainelFuncionario.jsx`) → card "Meus pontos do mês" (só o próprio, mês corrente) — desktop e mobile.
- Relatórios → Funcionários → ver §19 (redesenho, pontos foram absorvidos no card por pessoa).

**Fase 1 apenas** — sem conversão em R$, sem desconto por garantia/retrabalho, sem metas. Combinado com o Toni: rodar 1 mês só de placar antes de comprometer dinheiro ou regra de desconto.

## 19. Redesenho Relatórios/Funcionários — Atlassian Design (07/07/2026)

Página inteira reconstruída em `RelatorioFuncionarios` (`src/pages/Relatorios.jsx`) usando as primitivas de `_AtlassianUI.jsx` (`AtlPanel`, `ATL_FONT`) — antes usava `Card`/`SecHeader` genéricos do design system principal. **O componente `PontuacaoDesempenho` (criado 07/07 de manhã) foi removido** — os pontos por pessoa foram absorvidos dentro do card de cada funcionário, pra não repetir a mesma lista de nomes em 3 lugares.

**Estrutura nova**:
- 6 KPIs de topo (`AtlKpi`): Pessoas ativas · Etapas registradas · OS atendidas · Pontos no período · OS c/ retrabalho · OS em garantia (as 2 últimas ficam verdes quando zero, vermelhas quando >0).
- 1 `AtlPanel` por funcionário (grid responsivo), reunindo: pontos do período (com badges por serviço) + delta vs período anterior · grid de stats (Etapas/OS participadas/OS finalizadas/Tempo médio) · distribuição de etapas (mini barras — onde a pessoa mais atua) · qualidade (retrabalho + garantia, ou "Sem retrabalho ✓" em verde).
- `InsightIA` no fim, inalterado.

**2 hooks novos**:
- `src/hooks/useRelatorioQualidade.js` — cruza `falha_teste` (retrabalho: OS que voltou do Teste com defeito) e `os.garantia`+`os_origem_id` (OS em garantia) com a **autoria dos checks de oficina** (`pre_diagnostico.oficina.execucao`) pra saber quem fez o conserto que falhou/voltou. Conta 1x por OS (não por defeito individual). Lógica de extração de autor (`autoresOficina`) testada isolada — não quebra com `pre_diagnostico` nulo/vazio.
- **Comparativo com período anterior**: calculado inline em `RelatorioFuncionarios` (mesma duração do período selecionado, imediatamente antes) — chama `useRelatorioFuncionarios` e `usePontuacao` de novo com esse range e mostra `DeltaTag` (seta verde/vermelha) nos números.
- `useRelatorioFuncionarios` (em `useRelatorios.js`) ganhou `distribuicaoEtapas` por pessoa — contagem de movimentações por etapa (não só duração/gargalo como antes).

**Verificação**: build limpo + lógica de `calcularPontosOS`/`autoresOficina` testada rodando os módulos ESM reais via `node` direto (fora do bundler) com cenários simulados. **Não foi possível verificar visualmente no navegador** (sessão sem credenciais de login) — pedir pro Toni conferir a tela ao vivo na primeira oportunidade.

## 20. ⚠️ Trigger `os_registra_historico` já grava os_historico sozinho (achado 07/07/2026)

**Regra de ouro nova**: `os` tem trigger `os_registra_historico` (`AFTER INSERT OR UPDATE OF etapa`) executando `tg_os_historico()` — grava em `os_historico` automaticamente toda vez que `os.etapa` muda, com `funcionario_id = auth.uid()` e `duracao_segundos` calculado (tempo desde a última entrada). **Nunca fazer `INSERT` manual em `os_historico` no código do app** — o trigger já cobre 100% dos casos (Kanban, Modal, Mobile, qualquer UPDATE de etapa daqui pra frente).

**O que aconteceu**: o código de `moverOS` em `OSMobile.jsx` sempre teve um `INSERT` manual redundante (bug antigo, não detectado). Em 06/07/2026 eu (Claude) diagnosticei errado — vi que só o mobile tinha esse insert e concluí "só o mobile grava o histórico", então **adicionei o mesmo INSERT manual no Kanban desktop e no Modal** (`useOSDetalheModal.js`) achando que estava corrigindo uma lacuna. Na real, o trigger já gravava em TODAS as telas — meu fix **duplicou** toda movimentação de etapa no desktop a partir daquele dia, e o mobile já duplicava havia mais tempo.

**Sintoma que expôs o bug**: Toni notou "140 etapas" parecendo alto demais pro Painel de Funcionários (Relatórios) — pediu confirmação, comparei triggers via `pg_trigger`/`pg_proc` (RLS bloqueia leitura anônima da tabela, precisei pedir pro Toni rodar a consulta com login real).

**Correção 07/07/2026**: removidos os 3 `INSERT`s manuais (`Kanban.jsx`, `useOSDetalheModal.js`, `OSMobile.jsx`) — código agora só faz o `UPDATE` em `os.etapa`, o trigger cuida do resto. `sql/117-limpar-duplicatas-os-historico.sql` (rodar manualmente) apaga as linhas duplicadas já existentes — sinal de duplicata: `etapa_de IS NOT NULL AND duracao_segundos IS NULL` com uma "irmã" idêntica que tem `duracao_segundos` preenchido a <30s de diferença (só o INSERT manual deixava duração nula; o trigger sempre calcula).

**Lição pra próximas sessões**: antes de "corrigir" uma lacuna aparente em gravação de dados, **checar se existe trigger no banco** (`SELECT * FROM pg_trigger WHERE tgrelid = 'TABELA'::regclass`) — várias tabelas deste projeto (`os`, possivelmente outras) têm triggers criados direto no Supabase dashboard, nunca versionados em `sql/`. Ver também [[feedback_verificar_coluna_antes_select]] (mesma categoria de erro: assumir a partir só do código React sem checar o banco).

## 21. "Roubo de pontos" — alertas de reatribuição (07/07/2026)

**O problema**: pontuação por bloco (Diagnóstico, Teste final) e por check único (Desmontagem/Montagem/Limpeza na Oficina) atribui o crédito a quem tem o carimbo **mais recente**. Como cada check é um campo único sobrescrito (não um log), qualquer pessoa pode desmarcar+remarcar um item que já era de outra pessoa e "roubar" o crédito — em 1 clique só (desmarcar já esconde o autor anterior).

**Não dá pra impedir 100%** (é um problema de confiança, não de código) — decisão com o Toni: em vez de travar, **deixar rastro visível**.

**Como funciona**: `detectarTrocaAutor(autorAnterior, quemMexeuAgora)` em `src/hooks/useAutorCheck.js` — dispara sempre que quem mexe agora (marcando OU desmarcando) é uma pessoa DIFERENTE de quem tinha o carimbo antes. Compara por `uid` quando os dois lados têm; cai pro `apelido` só se faltar uid de um lado (nunca cruza uid com apelido — isso dava falso positivo, testado e corrigido). Gera um alerta: `{ campo, autor_anterior, autor_novo, em }`.

**Onde é gravado**: array `pre_diagnostico.alertas_pontuacao` (append-only, mesmo padrão dos outros campos — sem tabela nova). Detecção acontece nos 3 lugares com check:
- `AcaoDiagnosticoHIG.jsx` — testes (`montarItensTestes`) e componentes (`onSetAcao`, via `alertasPendentes` state que junta no autosave debounced)
- `AcaoTesteHIG.jsx` — testes + acabamento (`serializarChecklist`, alertas passados pro `salvarChk` que ganhou um 3º parâmetro em `useChecklistEtapa.salvar`)
- `AcaoOficinaHIG.jsx` — `toggleEm` (desmontagem/montagem/limpeza/cada peça de manutenção), alerta passado pro `persistExec`

**Onde aparece**: Relatórios → Funcionários → seção "Alertas de reatribuição" (só mostra se tiver algo no período) — lista OS #, campo, "Fulano → Beltrano", data/hora. Hook: `src/hooks/useAlertasPontuacao.js`.

**Verificação**: `detectarTrocaAutor` testado isolado com 7 cenários (pessoa diferente, mesma pessoa, item nunca teve dono, desmarcar sem novo autor, dado legado sem uid) — pegou e corrigiu um bug real (comparação uid-vs-apelido cruzada dava falso positivo em dado legado). Build limpo. Não verificado visualmente (sem login).

## 22. Metas de prêmio por desempenho (08/07/2026)

**⚠️ Correção importante**: não existe divisão de tarefa por papel na equipe — `usuarios.papel` (`logistica`/`oficina`) é só rótulo de cadastro, **qualquer funcionário faz qualquer etapa** (Coleta, Diagnóstico, Conserto, Teste, Entrega). Eu (Claude) assumi erroneamente uma divisão ("Alessandro só Coleta/Entrega, Guilherme só Diagnóstico/Conserto") baseada numa nota antiga especulativa — Toni corrigiu. Ver memória `feedback_nao_ha_divisao_de_papel_por_tarefa`. **Nunca reintroduzir essa suposição.**

**Metas de prêmio**: por isso a meta é **igual pros dois** — `METAS` em `src/utils/pontuacao.js`:

| Nível | Pontos (cada um) | Prêmio |
|---|---|---|
| 1 · mês comum | 900 | R$ 100 |
| 2 · mês bom | 1.050 | R$ 150 |
| 3 · mês excelente | 1.200 | R$ 200 |

Não cumulativo — paga o prêmio do **maior** nível atingido, não a soma. `calcularNivelPremio(totalPontos)` retorna `{ nivelAtingido, proximoNivel, pct, faltam }`.

**Onde aparece**: barra de progresso + nível/prêmio em R$ tanto no card "Meus pontos do mês" (`PainelFuncionario.jsx`) quanto no card por pessoa em Relatórios → Funcionários (`PessoaCard` em `Relatorios.jsx`). **Decisão explícita do Toni**: mostrar o valor em R$ pro próprio funcionário — isso é ganho pessoal dele, não "financeiro do negócio" (a regra "nunca mostrar R$" do painel é sobre faturamento/lucro da empresa, não se aplica aqui).

**Calibração**: baseada em maio-julho/2026 (ticket médio R$317,03 pra 64 OS "válidas" — só as que têm rastro real de check no sistema, sem garantia, sem OS importada sem histórico). 1 ponto ≈ R$9,79 de faturamento. Tratar como provisório — recalibrar depois de um mês cheio com autoria real (julho é o primeiro).

## 23. Relatório de Pontuação por OS (08/07/2026)

Modal novo `src/components/osDetalhe/RelatorioPontuacaoModal.jsx`, aberto pelo menu "⋮ Mais ações" do `Header.jsx` (item "Relatório de Pontuação", ícone `ti-trophy`). Mostra, pra UMA OS específica: total de pontos gerados, quebra por pessoa, e detalhamento por bloco (serviço + autor + data/hora de cada check).

**Reaproveita `calcularPontosOS(os)`** (mesma função do placar agregado) — garante que o número bate exatamente com o que conta pro prêmio, sem lógica duplicada. OS de garantia mostra banner explicando o fator reduzido (ver §25).

Atlassian Design (`AtlPanel`/`ATL_FONT` de `_AtlassianUI.jsx`), mesmo padrão visual do resto da OS. Testado com dados simulados batendo o total esperado antes de subir.

## 24. Bônus do gap de lançamento — julho/2026 (08/07/2026)

14 OS tiveram trabalho real entre 01-05/07/2026, **antes** do sistema de autoria existir (foi ao ar 06/07) — 233 pontos que teriam sido gerados (calculados sem autoria, via `sql/126`/`sql/127`) nunca puderam ser atribuídos a ninguém por falta de carimbo.

**Decisão do Toni**: aplicar como bônus fixo, dividido igual entre os funcionários ativos não-dono (233 ÷ 2 = 116,5 cada). Implementado em `usePontuacao.js` — constante `BONUS_GAP_JULHO` (janela + total), soma automaticamente quando o período consultado **sobrepõe** 01-06/07/2026 (testado com 7 cenários: mês julho pega, junho/agosto não pegam, período comparativo não pega, trimestre que inclui julho pega, sem filtro pega).

**Autoexpira sozinho** — a partir de agosto/2026 a condição de sobreposição nunca mais é verdadeira, não precisa lembrar de remover o código. Aparece no placar com o rótulo "Ajuste · gap lançamento" (`LABEL_SERVICO.ajuste_gap`).

**Isso é um ajuste ÚNICO, específico do mês de lançamento — não é um mecanismo genérico de bônus manual.** Se precisar de outro ajuste no futuro, replicar o padrão (constante com janela de data + query de funcionários ativos) ou considerar uma tabela dedicada se virar recorrente.

## 25. Garantia pontua pela metade (08/07/2026)

**⚠️ Mudança de regra** — antes (§18) OS de garantia não pontuavam (`if (os.garantia) continue` em `usePontuacao.js`). O Toni pediu revisão: nem todo retorno de garantia é culpa de quem consertou (peça com defeito de fábrica, desgaste natural, mau uso do cliente) — zero pontos ignorava trabalho real; pontos cheios perdia o efeito de "trava de qualidade".

**Decisão**: `FATOR_GARANTIA = 0.5` em `src/utils/pontuacao.js` — `calcularPontosOS(os)` aplica esse fator em TODOS os blocos quando `os.garantia === true` (pontos ficam com `.5`, ex: coleta normal=5 → garantia=2.5). `usePontuacao.js` não pula mais garantia (removido o `continue`) — processa normal, o desconto já vem embutido no cálculo.

**Continua funcionando junto, sem conflito**: `useRelatorioQualidade.js` (contador de "OS em garantia" atribuído a quem fez o serviço **original**) é um mecanismo **independente** — não mudou. São duas coisas: quem conserta a garantia agora ganha metade do ponto; quem fez o serviço original que voltou continua aparecendo no contador de qualidade.

**Verificado**: testado com cenário simulado (OS normal coleta=5/diagnóstico=4 vs mesma OS com garantia=true → coleta=2.5/diagnóstico=2) batendo exatamente antes de subir. Build limpo.

## 26. ⚠️ Bug crítico corrigido — Desmontagem/Montagem/Limpeza nunca pontuavam (08/07/2026)

**O bug**: `AcaoOficinaHIG.toggleEm` salva os checks de valor único (Desmontagem, Montagem, Limpeza) como `{ feito: carimbo }` — chaveId sempre `'feito'` pra esses 3 (ver `onToggle={() => onToggleDesm('feito')}` etc). Mas `calcularPontosOS` em `pontuacao.js` lia `exec.desmontagem`/`exec.montagem`/`exec.limpeza_serv` **direto**, esperando o carimbo ali — sem entrar na chave `'feito'`. `isCarimbo({feito:...})` retorna `false` (não tem `.apelido` no nível certo) → `push()` silenciosamente não fazia nada.

**Impacto real**: desde 06/07/2026 (quando a pontuação foi ao ar) até 08/07/2026, **Desmontagem, Montagem e Limpeza nunca geraram ponto pra ninguém** — em nenhuma OS, mesmo com o check certinho e o carimbo certo. Diagnóstico, Teste, Coleta, Entrega e Manutenção (por peça) **não tinham esse bug** — só esses 3 checks de "clique único" da Oficina.

**Como foi achado**: Toni notou que a OS #1723 tinha limpeza feita mas não aparecia pontuação de ninguém — pediu diagnóstico em vez de aceitar "deve ter esquecido o check". Consulta direta em `pre_diagnostico` (`sql/128`) mostrou o carimbo intacto dentro de `.feito`, confirmando bug de leitura, não de gravação.

**Correção**: `push('desmontagem', exec.desmontagem?.feito)` (e igual pra montagem/limpeza_serv) em `calcularPontosOS`. Testado com os dados REAIS da OS #1723 (26 pontos: 4+4+18, todos Guilherme) + casos vazio/dado-antigo continuam 0. Build limpo.

**Efeito pós-deploy**: como o cálculo é sempre ao vivo (não fica guardado em lugar nenhum), o placar de TODO MUNDO sobe automaticamente assim que essa correção for pro ar — não precisa reprocessar nada. Os totais de julho que o Toni viu na tela até agora estavam **subestimados**.

⚠️ **Lição pra próximas sessões**: os testes que eu fiz anteriormente pra `calcularPontosOS` (ver §18) usaram fixtures **inventadas à mão**, sem checar contra o dado REAL salvo no banco pra Desmontagem/Montagem/Limpeza — por isso não pegaram esse bug. Testar lógica de leitura de dado sempre com pelo menos 1 exemplo de dado real (consulta SQL), não só com fixture que eu mesmo montei baseado em como *achei* que o dado seria salvo.

## 27. Serviço "Limpeza" renomeado pra "Higienização" (29/07/2026)

Pedido do Toni: trocar o nome do serviço "Limpeza" por "Higienização" em
toda a interface — chips do Kanban/OSMobile, seção do Conserto
(`AcaoOficinaHIG.jsx`: título, check "Higienização feita", mensagens de
bloqueio), acabamento no Teste final (`AcaoTesteHIG.jsx`), chip rápido
de item no Orçamento (`AcaoOrcamentoHIG.jsx` — `SUGESTOES`/`QUICK_CHIPS`),
`LABEL_SERVICO.limpeza` em `pontuacao.js`, item padrão criado por
`NovaOSMobile.jsx`.

**Chaves internas não mudaram** (`limpeza`, `limpeza_serv`, `temLimpeza`
etc continuam com esse nome no código/banco) — só o texto exibido virou
"Higienização". **Dado antigo não foi migrado**: itens salvos como
"Limpeza" continuam assim; toda detecção (`/limpez|higieniz/i`) reconhece
os dois nomes igual, então nada quebrou pra OS antiga.

Aproveitado pra corrigir um bug junto: a detecção de "tem serviço de
limpeza" em vários arquivos (`AcaoOficinaHIG.jsx`, `AcaoTesteHIG.jsx`,
`Kanban.jsx`, `OSMobile.jsx`, `Vendas.jsx`) usava regex `/limpeza/i` sem
o `higieniz` — corrigido em todos pra aceitar os dois nomes daqui pra
frente.

## 28. ⚠️ Causa real do bug do filtro de Higienização — corte de 1000 linhas do PostgREST (29/07/2026)

A correção do §27 (regex aceitando "limpez"/"higieniz") **não era a causa
raiz** — o Toni testou de novo e o filtro continuava só pegando OS
importadas. Diagnóstico com dado real (`sql/148`) mostrou que o item
nativo existe certinho no banco (nome "Limpeza", categoria 'servico',
sem soft-delete) — o problema era a query nunca trazer essa linha pro
front.

**Causa**: a tabela `os_item` tem **mais de 1687 itens só com categoria
NULL** (import em massa do Bling/Trello). O Supabase/PostgREST **corta
a resposta em 1000 linhas por padrão** quando a query não tem `.range()`
ou `.limit()` explícito. Os itens importados em massa lotavam esse
limite sozinhos e os itens nativos de serviço (adicionados um a um ao
longo do tempo) nunca apareciam na resposta.

**Correção**: `.range(0, 9999)` adicionado nas 3 queries idênticas de
detecção de serviço (`Vendas.jsx`, `Kanban.jsx`, `OSMobile.jsx`).

⚠️ **Lição pra próximas sessões**: qualquer `.select()` no Supabase sem
`.range()`/`.limit()` explícito que busque "todas as linhas" de uma
tabela que só cresce (`os_item`, `os_historico`, etc) é candidato a
esse mesmo bug silencioso — não dá erro, só corta o resultado. Antes de
copiar esse padrão de query pra lugar novo, ou ao investigar um filtro
que "só funciona parcialmente", checar `count(*)` da tabela e comparar
com 1000.

## 29. Venda ganha etapa Orçamento — sem trava de 1 máquina fixa (29/07/2026)

Pedido do Toni: criar uma OS de Venda não devia obrigar escolher 1 máquina específica do estoque de antemão — a venda pode ter qualquer item, e o correto era abrir a tela de Orçamento normal (que já busca máquinas do estoque junto com peças ao digitar) pra montar os itens depois de criar a OS.

**Achado no meio do caminho**: o modal antigo (`MaquinaEstoqueBlock` em `NovaOSMobile.jsx`) nem persistia nada de verdade — só preenchia `modelo_equipamento` como texto solto; não criava `os_item`, não salvava preço (`valor_total` nunca era setado pra Venda). Ou seja, o fluxo antigo de Venda já estava quebrado antes desse pedido.

**Mudança**: `osData.js` → `venda.etapas` virou `Orçamento → Entrega → A receber → Concluído` (era `Agenda → Entrega → A receber → Concluído`). `ETAPAS_TODOS` atualizado (match `orcamento` ganhou `venda:'orcamento'`; `agendamento` perdeu `venda:'agendamento'`, que não existe mais nesse fluxo). `NovaOSMobile.jsx`: Venda agora nasce direto em `etapa='orcamento'` (pulando Coleta — item já tá pronto/no estoque), form de criação simplificado pra só Cliente comprador + endereço opcional (igual Atendimento). `MaquinaEstoqueBlock` removido (dead code).

**Atualização 29/07/2026**: Toni pediu a mesma correção no desktop (`_legacy/desktopKanbanModals.jsx` → `NovaOSModal`) e aprovou explicitamente mexer em `_legacy/` pra esse caso pontual. Mesma mudança replicada: `etapaInicial='orcamento'` pra venda, `podeAvancar`/`statusCamposFaltando` só exigem Cliente, bloco "Máquina do estoque" removido, "Endereço e agendamento da entrega" virou só "Endereço de entrega" (data/hora tiradas — agendamento da entrega acontece na própria etapa Entrega). Import `ESTOQUE_MAQUINAS_MOCK` (agora sem uso nesse arquivo) removido do topo de `desktopKanbanModals.jsx` — a constante em si continua existindo em `osData.js`.

## 30. Fabricação ganha 2ª origem — compra direta de máquina (29/07/2026)

Toni esclareceu que Fabricação tem 2 origens bem diferentes:
1. **Conversão de recusada** (Toni compra a máquina de quem recusou o conserto) — já testado e funcionando, `AcaoRecusada.jsx` cria a OS derivada direto em `etapa='oficina'` (`cliente_id: null`, copia itens do orçamento original). **Não mexido.**
2. **Compra direta** (cliente liga já querendo vender) — pedido novo: precisa do fluxo completo Agenda → Coleta → Diagnóstico → Orçamento (custo do conserto, somado ao valor pago na máquina) → Conserto → Teste → Concluído → vira estoque.

**Mudança**: `osData.js` → `fabricacao.etapas` ganhou `ag_agendamento`/`agendado`/`orcamento` (só tinha diagnóstico/oficina/teste/concluído). `ETAPAS_TODOS` atualizado. As duas origens convivem no mesmo array de etapas porque `podeMoverOS` só valida a **posição relativa** da transição, não exige visitar etapa anterior — quem nasce em 'oficina' (situação 1) simplesmente pula as etapas de trás.

`NovaOSMobile.jsx` e `_legacy/desktopKanbanModals.jsx` (aprovado pelo Toni mexer em `_legacy/` de novo): formulário de Fabricação ganhou Cliente vendedor + Endereço de coleta + Agendamento da coleta (igual Atendimento). Cliente virou obrigatório pra criar Fabricação pelo modal — antes só pedia Tipo de máquina.

**Bug notado de passagem, não corrigido (fora do escopo)**: `form.equipamentoTipo` ("Tipo de máquina") nunca foi persistido em `os.tipo_equipamento` (coluna real, `sql/71`) em NENHUM tipo de OS (atendimento/visita/fabricação) — só fica na UI local do formulário e se perde ao criar. Os valores do dropdown (`'Máquina de Lavar'` etc) também usam vocabulário diferente do `tipo_equipamento` salvo em outros lugares (`FormEquipamentoEdit` usa ids tipo `'lavadora'`). Precisaria de um mapeamento label→id antes de persistir. Vale abrir como tarefa separada se o Toni notar que o tipo de equipamento nunca aparece salvo.

## 31. ⚠️ Bug corrigido — Fabricação sumia do Kanban ao mover pra Coleta (29/07/2026)

Efeito colateral do §30 (Fabricação ganhou etapa Coleta): `dbEtapaToUI` em `useOS.js` só convertia a etapa do banco `'agendamento'` pra `'agendado'` (id usado nos arrays de etapas) quando `tipo === 'atendimento'`. Fabricação passou a ter etapa `id:'agendado'` também, mas a tradução não incluía o tipo — a OS ficava com etapa computada `'agendamento'`, que não bate com nenhum item de `fabricacao.etapas`, e o card sumia do Kanban (sem coluna pra desenhar).

**Sintoma reportado pelo Toni**: criou OS de Fabricação (situação 2, cliente vendendo máquina), moveu de Agenda pra Coleta, card sumiu.

**Correção**: `if (dbEtapa === 'agendamento' && (tipo === 'atendimento' || tipo === 'fabricacao')) return 'agendado'`. Não precisou de fix de dado — o valor gravado no banco (`'agendamento'`) sempre esteve certo, só a tradução pra tela é que tava errada. OS que já tinham sumido voltam a aparecer sozinhas assim que o deploy for aplicado, sem precisar recriar.

## 27. "Pontos por etapa" agregado — Relatórios/Funcionários (08/07/2026)

`usePontuacao.js` ganhou `data.porServico` — array `[{ servico, label, pontos, n }]` agregando a EQUIPE TODA (não por pessoa) por tipo de serviço, ordenado por pontos desc. `n` = quantidade de blocos concluídos daquele tipo (cada peça de manutenção conta 1, etc). Inclui o "Ajuste · gap lançamento" também.

Nova seção `PontosPorEtapa` em `Relatorios.jsx`, entre os KPIs e os cards por pessoa — tabela com barra proporcional (Etapa · Concluídas · Pontos), rodapé com total. Testado a lógica de agregação isolada antes de subir.

## 28. "Pontos por etapa" dentro de cada card de pessoa (08/07/2026)

Complementa §27 — o Toni pediu pra lista com barra (Etapa · Concluídas · Pontos) aparecer **dentro de cada card de pessoa** também, não só no agregado da equipe. Mudança de formato: `porFunc[chave].porServico[servico]` deixou de ser um número (`pontos`) e virou objeto `{ pontos, n }` — igual ao `data.porServico` agregado (§27), pra reaproveitar a mesma lógica de renderização nos dois lugares.

**Consumidores atualizados** (badges pill → lista com barra): `PessoaCard` em `Relatorios.jsx` e `CardPontos` em `PainelFuncionario.jsx` — os dois quebrariam silenciosamente sem essa atualização (mostrariam `[object Object]` no lugar do número). Testado a agregação por pessoa isolada antes de subir.
