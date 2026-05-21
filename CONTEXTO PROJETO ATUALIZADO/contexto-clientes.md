# Contexto — Clientes

> Doc vivo do terminal `clientes`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

- ✅ **Hook `useClientes` real** (CRUD + soft-delete) ligado à tabela `cliente`
- ✅ **NovoClienteModal próprio** salva via Supabase
- ✅ **Importação Bling concluída (19/05/2026 noite)**: 777 clientes únicos dos 2 CSVs em `Base de dados clientes Bling/` + 5 de seed = 782 ativos no banco
- ✅ **Importação Trello concluída (21/05/2026)**: +144 novos do export do Trello (773 candidatos, 629 já existiam por match de telefone) = **926 ativos no banco**
- ✅ `useClientes.criar` corrigido pro schema real
- ✅ Helper standalone **`criarClientePersist(payload)`** exportado de `useClientes.js` — pra consumidores que não querem rehidratar 782 clientes (ex: NovaOSModal inline cadastra 1 cliente sem fetch full)
- ✅ Schema flat de cliente (não jsonb)
- ✅ **`ClienteDetalheModal` corrigido pro schema real** (19/05/2026): trocou `fone`→`telefone`, `obs`→`observacoes`, removeu campos `cidade/uf/cep` separados (não existem). Antes o `salvar` mandava colunas inexistentes pra `supabase.update` e quebrava silenciosamente.
- ✅ **`pages/Clientes.jsx` corrigido pro schema real** (19/05/2026): trocou `c.fone`→`c.telefone` (filtro + render), removeu `Badge` de `cidade/uf` (campos não existem na tabela).
- ✅ **`NovoClienteModal` form local alinhado ao schema** (19/05/2026): trocou `fone`→`telefone`, `obs`→`observacoes`. Campos auxiliares `cidade/uf/cep` mantidos no form local porque `criarClientePersist` já concatena no `endereco` final.
- ✅ **Histórico de OS no `ClienteDetalheModal`** (19/05/2026, v2): agora consome `osList` recebido por prop (do `useOS(true)` montado em `pages/Clientes.jsx`) e filtra `o.cliente_id === clienteId` em memória — antes era SELECT direto por modal aberto. Reaproveita Realtime do hook. Mostra `OS #numero · tipo · etapa(badge) · valor · data`. Prop `onAbrirOS(id)` no contrato — clique chama o pai pra abrir OSDetalhe.
- ✅ **SQL `04-cliente-importar-bling.sql` v3 commitado** (19/05/2026): INSERT agora usa `telefone`/`observacoes` e concatena `endereco — cidade/uf — cep` num único campo `endereco`. Staging table mantém colunas antigas (temp, drop on commit). Roda idempotente — match por telefone normalizado em `c.telefone` (não mais `c.fone`).
- ✅ **AddressInput plugado nos cadastros de cliente** (20/05/2026): `NovoClienteModal` próprio (em `src/components/clientes/`) e `NovoClienteModalCompleto` do `_legacy/desktopKanbanModals.jsx` (endereço 1 + extras) agora usam `<AddressInput>` (de `components/logistica/`) — autocomplete via Google Maps Places com debounce 250ms + fallback texto livre se a chave não estiver setada. Mudança cirúrgica no legacy, só o input de endereço. **Requer `VITE_GOOGLE_MAPS_KEY` no `.env.local` (local) e no Vercel (prod)** — sem a chave, cai pro modo texto com hint "Autocomplete em breve".

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

## 4b. Export do Trello (histórico pré-sistema)

Em `Base de dados clientes Bling/areadetrabalho95498714_20260519_035333/` mora o export completo do Trello do Toni (baixado 19/05/2026). 4 boards:

| Board | Cards no CSV | Conteúdo |
|---|---|---|
| `serviços` | **1012** | Histórico real de OS. Custom fields: Valor, Telefone, Endereço, Observação, Serviços, Horário de Busca/Entrega, Pagamento, Data de Entrada, Data de Saída. JSON tem 20MB com comentários/anexos. |
| `finalizados` | 0 (CSV vazio) | Cards arquivados — só no JSON (14KB) |
| `tarefas` | 2 | Peças pra pedido (board fechado) |
| `visitas` | 0 (CSV vazio) | Cards no JSON (9KB) |

**Por que importa pra Clientes**: o campo Telefone do card é a chave natural pra cruzar com `cliente.telefone` (mesma normalização da importação Bling). Quando o Toni pedir "puxa histórico de OS pro fulano" ou "migra Trello pro sistema", aqui é a fonte. Memória `project_trello_export` registra o detalhe.

**Clientes do Trello → IMPORTADOS (21/05/2026)**: `scripts/importar-clientes-trello.mjs` parseia o CSV, dedupe por telefone normalizado, e gera `sql/11-cliente-importar-trello.sql`. Resultado: **773 candidatos** únicos → **144 novos cadastrados** + 629 já existiam (telefone match com Bling). **Base agora tem 926 clientes ativos** (de 782). Bucket B (18 cards só-telefone, sem nome) e C (39 sem chave) descartados na geração. Regra de match: só telefone normalizado (≥ 8 dígitos), ver [[project_cliente_match_telefone]]. SQL é idempotente (anti-join `NOT EXISTS`); roda no SQL Editor do Supabase porque RLS bloqueia anon. **Gotcha do SQL Editor**: usa CTE com `WITH stg AS (VALUES ...)` em vez de TEMP TABLE — o editor abre transação por statement, então `ON COMMIT DROP` matava a temp antes do INSERT seguinte chegar. Diagnóstico de duplicatas pré-existentes do Bling fica em `sql/11b-diagnostico-duplicatas-cliente.sql` (não modifica nada).

OS históricas (data de entrada/saída, serviços feitos, comentários) ainda **não importadas** — matéria-prima parada esperando decisão de schema (vira histórico em `os` retroativo? Cria tabela `os_historico_trello` separada?).

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
