# Contexto — Clientes

> Doc vivo do terminal `clientes`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

- ✅ **Hook `useClientes` real** (CRUD + soft-delete) ligado à tabela `cliente`
- ✅ **NovoClienteModal próprio** salva via Supabase
- ✅ **Importação Bling concluída (19/05/2026 noite)**: 777 clientes únicos dos 2 CSVs em `Base de dados clientes Bling/` + 5 de seed = 782 ativos no banco
- ✅ **Importação Trello concluída (21/05/2026)**: +144 novos do export do Trello (773 candidatos, 629 já existiam por match de telefone) = **926 ativos no banco**
- ✅ **Importação Trello — restantes (21/05/2026)**: sql/14 cobre 69 candidatos adicionais (21 Bucket B com nome=telefone, 4 Bucket C com tel extraído do Card Name via regex, 44 cards de revisão/Aguardando/Leeds — só cliente, OS não). Pendente Toni rodar e reportar quantos entraram.
- ✅ **Importação de OS Trello concluída (21/05/2026)**: 225-239 OS criadas via sql/12 (export inicial + export incremental 21/05 com +11 cards). Ver §4b e [[project_trello_export]] na memória.
- ✅ **Helper export-path** (`scripts/_trello-export-path.mjs`): detecta a pasta `areadetrabalho95498714_<TS>/` mais recente automaticamente — próximo export é só jogar na pasta e rodar os scripts, sem editar código.
- ✅ **`useOS` agora pega endereço do cliente** (21/05/2026): SELECT embed atualizado pra `cliente:cliente_id(id, nome, telefone, endereco, deleted_at)` e mapping `endereco: os.cliente?.endereco || ''`. Antes era hardcoded `''` — OS importadas do Trello apareciam sem endereço mesmo o cliente tendo. Diagnóstico de OS sem tel/end em `sql/16-diagnostico-os-trello-cliente.sql`.
- ✅ `useClientes.criar` corrigido pro schema real
- ✅ Helper standalone **`criarClientePersist(payload)`** exportado de `useClientes.js` — pra consumidores que não querem rehidratar 782 clientes (ex: NovaOSModal inline cadastra 1 cliente sem fetch full)
- ✅ Schema flat de cliente (não jsonb)
- ✅ **`ClienteDetalheModal` corrigido pro schema real** (19/05/2026): trocou `fone`→`telefone`, `obs`→`observacoes`, removeu campos `cidade/uf/cep` separados (não existem). Antes o `salvar` mandava colunas inexistentes pra `supabase.update` e quebrava silenciosamente.
- ✅ **`pages/Clientes.jsx` corrigido pro schema real** (19/05/2026): trocou `c.fone`→`c.telefone` (filtro + render), removeu `Badge` de `cidade/uf` (campos não existem na tabela).
- ✅ **`NovoClienteModal` form local alinhado ao schema** (19/05/2026): trocou `fone`→`telefone`, `obs`→`observacoes`. Campos auxiliares `cidade/uf/cep` mantidos no form local porque `criarClientePersist` já concatena no `endereco` final.
- ✅ **Histórico de OS no `ClienteDetalheModal`** (19/05/2026, v2): agora consome `osList` recebido por prop (do `useOS(true)` montado em `pages/Clientes.jsx`) e filtra `o.cliente_id === clienteId` em memória — antes era SELECT direto por modal aberto. Reaproveita Realtime do hook. Mostra `OS #numero · tipo · etapa(badge) · valor · data`. Prop `onAbrirOS(id)` no contrato — clique chama o pai pra abrir OSDetalhe.
- ✅ **SQL `04-cliente-importar-bling.sql` v3 commitado** (19/05/2026): INSERT agora usa `telefone`/`observacoes` e concatena `endereco — cidade/uf — cep` num único campo `endereco`. Staging table mantém colunas antigas (temp, drop on commit). Roda idempotente — match por telefone normalizado em `c.telefone` (não mais `c.fone`).
- ✅ **AddressInput plugado nos cadastros de cliente** (20/05/2026): `NovoClienteModal` próprio (em `src/components/clientes/`) e `NovoClienteModalCompleto` do `_legacy/desktopKanbanModals.jsx` (endereço 1 + extras) agora usam `<AddressInput>` (de `components/logistica/`) — autocomplete via Google Maps Places com debounce 250ms + fallback texto livre se a chave não estiver setada. Mudança cirúrgica no legacy, só o input de endereço. **Requer `VITE_GOOGLE_MAPS_KEY` no `.env.local` (local) e no Vercel (prod)** — sem a chave, cai pro modo texto com hint "Autocomplete em breve".
- ✅ **AddressInput com fallback Photon (OSM)** (21/05/2026): Toni reportou que autocomplete não aparecia no cadastro de cliente. Causa: Places API legacy bloqueada no projeto GCP (mesmo problema do geocoder, ver commits 8ab8d8c e 80eadb2). Solução: `AddressInput.jsx` agora tenta Places legacy 1º e cai pro **Photon** (`photon.komoot.io`, OSM, público sem chave) quando vem `REQUEST_DENIED`. Decisão memoizada em flag de módulo `placesLegacyIndisponivel` — depois do 1º denied, instâncias seguintes vão direto pro Photon. Photon retorna sugestões já com lat/lng (não precisa de `getDetails` igual Places). Hint visual "autocomplete em breve" removido — agora sempre tem autocomplete (Photon não exige chave). Beneficia também `ParadasEditor` e `AdicionarOSARotaModal`.

---

## 2. Pendências

1. **Wirar `onAbrirOS` em `pages/Clientes.jsx`** — o modal já expõe a prop e a página já tem `osList` em escopo via `useOS`. Falta importar `OSDetalhe` + montar `useUsuarios` + funções `moverOS/updateOS/toggleAgPeca` (duplicação do Kanban) ou criar um wrapper read-only. Decisão a tomar com o dono.
2. **FormClienteEdit** (substituir toast "em breve" do header do OSDetalhe)

> Nota (20/05/2026): schema `cliente` real (`telefone`/`observacoes`, sem `cidade/uf/cep`) confirmado em prod via probe. Onda 1 fechada sem regressões pendentes na área.

---

## 3. Schema da tabela `cliente` (REAL — gotcha)

A tabela `cliente` no banco usa nomes **diferentes** do que o CLAUDE.md antigo dizia. Conferir antes de mexer.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid | PK |
| `nome` | text | obrigatório |
| `telefone` | text | **NÃO `fone`** |
| `email` | text | opcional |
| `endereco` | text | concatena cidade/uf/cep porque não existem como colunas separadas |
| `observacoes` | text | **NÃO `obs`** |
| `deleted_at`, `excluido_por`, `criado_em/por`, `atualizado_em/por` | — | soft-delete + auditoria |

**Não existem no banco**: `cidade`, `uf`, `cep`, `fone`, `obs` — concatenar tudo em `endereco`.

---

## 4. Importação Bling (histórico)

Os 2 CSVs em `Base de dados clientes Bling/` foram a fonte da importação inicial:
- `clientes_bling.csv` (~777 únicos)
- + 5 de seed manual

**Versão atual no repo**: `sql/04-cliente-importar-bling.sql` (v3, commit 19/05/2026).

Ajustes do v3 vs original:
- `fone` → `telefone`
- `obs` → `observacoes`
- `cidade/uf/cep` → concatenados no `endereco` via `array_to_string(...)` com separador `' — '`
- Staging table preserva colunas antigas (temp, drop on commit) — só o INSERT final muda

Idempotente: rodar de novo não duplica.

---

## 4b. Export do Trello (clientes + OS pré-sistema)

Pasta `Base de dados clientes Bling/areadetrabalho95498714_<YYYYMMDD_HHMMSS>/`. Dois exports até agora: `20260519_035333` (876 cards) e `20260521_054331` (887 cards, +11 novos +6 mudaram de lista). **Helper `scripts/_trello-export-path.mjs` detecta o mais recente automaticamente** — próximo export é só descompactar na pasta e rodar os scripts.

| Board | Cards reais | Conteúdo |
|---|---|---|
| `serviços` | **876→887** | Histórico real de OS. Custom fields: Telefone, Endereço, Valor, Pagamento, Data Entrada/Saída, Obs, Serviços. JSON tem 20MB com 30k+ actions (comentários, movimentações entre listas, etc). |
| `finalizados` | 0 ativos | só archived no JSON (14KB) |
| `tarefas` | 2 | "Placa LTD13", "Capacitores" — peças pra pedido, não viraram OS |
| `visitas` | 0 ativos | só archived no JSON (9KB) |

> Atenção ao número: `wc -l serviços.csv` dá ~1100 linhas, mas cards têm campos com `\n` interno; o real é os 876/887 que começam com Card ID de 24 hex chars.

### Pipeline de importação (3 scripts + 5 SQLs)

1. **`scripts/importar-clientes-trello.mjs`** → `sql/11-cliente-importar-trello.sql`
   Clientes únicos por telefone (≥ 8 dígitos). Anti-join contra `cliente.telefone` normalizado. **Resultado 1ª rodada: +144 novos cadastrados** (773 candidatos, 629 já existiam pelo Bling). Total 782 → 926.

2. **`scripts/importar-clientes-trello-restantes.mjs`** → `sql/14-cliente-importar-trello-restantes.sql`
   Cobre 69 candidatos que ficaram de fora do sql/11:
   - **B (21)** — Cards com só telefone no nome: cadastrar com `nome = telefone literal`. Toni revisa depois quem tem nome=telefone.
   - **C (4)** — Coluna Telefone vazia, mas Card Name tem padrão de telefone → regex extrai. Outros 35 cards do bucket C eram lixo ("Electrolux 12kg") e foram descartados.
   - **R (44)** — Cards de listas que **não viram OS** (Aguardando, Leeds Limpeza, Lembretes, Máquinas pra venda): o **cliente entra**, a OS não.

3. **`scripts/importar-os-trello.mjs`** → `sql/12-os-importar-trello.sql` + `sql/13` + `sql/15`
   225-239 OS criadas, idempotente via tag `observacoes='TRELLO-CARD:<id>'`. Faz tudo numa passada: lê CSV+JSON, indexa actions por idCard, calcula data de entrada (primeira passagem por lista ≠ VISITAS/ROTA ATUAL), parseia pagamento dos comentários via regex (`"280 pix"`, `"650 cartao 12/5"`, etc), monta INSERT com JOIN em `cliente` pelo telefone normalizado pra pegar `cliente_id`. **Pagamento parseado em ~153 OS** (~66% das concluídas pagas). Cards sem cliente matchado: criar cliente novo na mesma rodada.

### Mapeamento lista do Trello → etapa do banco (decisão Toni 21/05)

| Lista Trello | Etapa DB | Pago |
|---|---|---|
| PAGOS · Finalizados/Pagos ABRIL/MARÇO/MAIO | `concluido` | `total` |
| A RECEBER | `pagamento` | `nao` |
| FINALIZADOS | `entrega` | `nao` (máquinas prontas pra entregar) |
| LIMPEZAS · SERVIÇOS | `em_oficina` | `nao` |
| DIAGNOSTICOS | `diagnostico` | `nao` |
| Pré-Diagnostico | `recebido` | `nao` |
| ORÇAMENTO | `orcamento` | `nao` |
| VISITAS · ROTA ATUAL | `aguardando_agendamento` | `nao` |
| **Aguardando · Leeds Limpeza · Lembretes · Máquinas pra venda** | **NÃO viram OS** (vão pro `notas-trello/cards-para-revisar.json`) |
| PEDIDOS · REGISTRO DE CLIENTE · Lançados no ERP | `notas-trello/...` (todos archived, 0 ativos) |

**Gotcha**: o ENUM `os_etapa` no banco usa `em_oficina`, `aguardando_agendamento`, `agendamento`, `entrega` — não os ids da UI (`oficina`, `ag_agendamento`, `agendado`, `entregue`). Ver [[feedback_etapa_ui_vs_db]].

### Re-sincronização incremental (sql/15)

Quando o Toni atualiza o Trello e gera export novo, o `sql/12` cobre OS novas (anti-join via tag) e `sql/15-os-trello-resync-etapas.sql` faz UPDATE condicional (`WHERE etapa <> X`) das OS que mudaram de lista — idempotente. No export 21/05: 11 cards novos + 6 mudaram de lista.

### Pendentes na importação de OS

- **76 OS concluídas sem comentário de pagamento parseável** → entraram com `valor_total=0` mas `pago=total`. Toni ajusta caso a caso.
- **Equipamento** (marca/modelo/série) não tinha no Trello → ficou em branco em todas as OS importadas.
- Sub-bucket "lembretes/aguardando/leeds" continua no JSON pra revisão futura (Toni decide depois se viram OS, agendamento de visita, ou descarte).

---

## 5. Cadastro de cliente

### Modal próprio (`src/pages/Clientes.jsx`)
NovoClienteModal próprio — salva via `useClientes.criar()`.

### Cadastro completo (`NovoClienteModalCompleto`)
- Vive em `src/_legacy/desktopKanbanModals.jsx` — **NÃO MEXER** sem aprovação (regra `_legacy/`)
- ⚠️ **Exceção autorizada pelo dono (20/05/2026)**: edit cirúrgico trocando o `<input>` cru de endereço (Endereço 1 + extras) por `<AddressInput>` da pasta `components/logistica/`. Resto do arquivo intacto. Mesmo padrão da exceção da NovaOSModal já registrada em `contexto-os.md`.
- Só ler/referenciar
- **Obrigatórios**: Nome, Telefone principal, Endereço 1
- **Opcionais**: CPF/CNPJ, E-mail, Telefone secundário, Endereços 2 e 3 (até 3)
- Botão "+ Adicionar outro endereço" inicia recolhido — abre Endereço 2 ao clicar, depois Endereço 3
- Limite máximo: 3 endereços
- Cada endereço extra tem botão Remover individual
- Telefone principal mostra indicador "WhatsApp principal"
- Validação Google Maps Places no campo de endereço **plugada via `AddressInput`** (20/05/2026) — funciona se `VITE_GOOGLE_MAPS_KEY` estiver setada, senão cai pro modo texto livre.

### Cadastro inline (NovaOSModal)
- Usa `criarClientePersist(payload)` — helper standalone, evita carregar 782 clientes
- Cria 1 cliente direto via INSERT, retorna ID pra atrelar à OS

---

## 6. Busca de cliente

Em NovaOSModal:
- Debounce 300ms
- ILIKE em nome/telefone
- LIMIT 20
- Server-side (não carrega 782 clientes na memória)

---

## 7. ClienteDetalheModal — Histórico de OS

Mostra dados do cliente + lista de OS dele (componente interno `HistoricoOS`).

**Fonte de dados**: `osList` recebida por prop (do `useOS(true)` montado em `pages/Clientes.jsx`). HistoricoOS filtra `o.cliente_id === clienteId` e ordena por `abertura desc` em memória.

Por que não query direta: evita disparar SELECT a cada abertura de modal e aproveita o Realtime do `useOS` (qualquer mudança em `os` atualiza o histórico sem refetch manual).

**Mapping de campos** (useOS já normaliza):
- `os.numero` (mesma coisa)
- `os.tipo` / `os.etapa` (UI etapa, não DB)
- `os.cliente_id` (filtro)
- `os.abertura` ← `criado_em` em Cuiabá ("YYYY-MM-DD HH:mm")
- `os.valor` ← `valor_total`

**Linha**: `OS #numero · tipo · etapa(badge colorida pela cor da etapa) — valor (fmtBRL) — data (DD/MM/YYYY)`.

**Clique** chama prop `onAbrirOS(id)` — o pai decide o que fazer (esperado: abrir `OSDetalhe`). Sem a prop, linha fica não-clicável (sem chevron, sem hover, sem cursor).

**Futuro** (agente de reativação Módulo 11):
- Status "2d · em andamento" ou "8m · sem OS ativa"
- Última OS com `fmtPrazoCurto`

---

## 8. Cliente vs OS

- OS de tipo **Atendimento** e **Venda** sempre têm cliente
- OS de tipo **Fabricação** tem `cliente_id NULL` (máquina pro estoque, sem dono ainda) — outer join no Kanban
- Filtro `cliente.deleted_at` é feito em JS pós-fetch no Kanban (não em SQL), pra não perder Fabricação no outer join

---

## 9. Reativação de clientes (futuro — Módulo 11)

- Agente que monitora "tempo desde última OS" → dispara WhatsApp via Z-API
- Vai usar tabelas `reativacao_*` do schema parte 2

---

## 10. Interseções com outras áreas

- **OS**: NovaOSModal usa `criarClientePersist`. Ver `contexto-os.md`
- **Logística**: endereços de cliente validados via Maps. Ver `contexto-logistica.md`
- **Relatórios**: cliente aparece em relatório de Vendas (recorrência). Ver `contexto-relatorios.md`
