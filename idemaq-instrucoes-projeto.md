# 📋 IDEMAQ — Instruções Mestras do Projeto

> Documento de referência compartilhado entre todos os chats do projeto Idemaq.
> Última atualização: 15/05/2026 — Módulo 00b parte 1 aplicado ✅

---

## 🎯 STATUS ATUAL DO PROJETO

### ✅ Pronto
- **Painel principal** (App.jsx atual, padrão visual estabelecido)
- **Estrutura base**: React + Vite + Supabase + Vercel
- **Deploy automático** via Vercel ao fazer push no `main`
- **Schema do banco aplicado em 15/05/2026 (Módulo 00b parte 1)** — 8 tabelas criadas com:
  - Soft-delete (`deleted_at` + `excluido_por`) em todas as tabelas principais
  - Auditoria completa (`criado_em/por` + `atualizado_em/por`) via trigger automático
  - UUID interno + número visível sequencial (OS)
  - `timestamptz` em UTC + fuso `America/Cuiaba` na aplicação
  - Tabela `usuarios` (FK pra `auth.users`) com enum `papel` (dono / logistica / oficina)
  - 23 índices, RLS policies por papel, 5 enums
  - 2 buckets de Storage: `idemaq-publico` + `idemaq-privado`
- **Tabelas atuais**: `usuarios`, `cliente`, `maquina`, `peca`, `os`, `os_item`, `os_historico`, `pre_diagnostico`
- **Usuários ativos**: Toni (dono), Alessandro (logística), Guilherme (oficina)
- **Tema dark/light com paleta Deutan** definidos e aprovados

### 🚧 Em andamento / Próximo passo
- **Kanban de OS** — próximo módulo a ser implementado

### 📅 Roadmap (ordem prevista)
1. Kanban de OS ← **próximo**
2. Formulário de nova OS (3 tipos: Atendimento / Fabricação / Venda)
3. Fluxo completo da OS
4. Clientes
5. Logística (mapa Google Maps)
6. Estoque
7. Financeiro completo (precisa do schema parte 2)
8. Relatórios com IA financeira
9. Configurações
10. Automações n8n + Z-API
11. Agente de reativação de clientes

### 🗄 Tabelas pendentes (schema parte 2 — fazer quando os módulos forem desenhados)
`checklist_etapa`, `falha_teste`, `retorno_garantia`, `lancamento_financeiro`, `rota`, `configuracoes`, `webhook_log`, `reativacao_*`

---

## 🏢 SOBRE A EMPRESA

- **Razão social**: IDEMAQ ASSISTENCIA TECNICA LTDA (ME)
- **Segmento**: Manutenção e limpeza de máquinas de lavar
- **Localização**: Naviraí/MS · 12 anos de experiência
- **Faturamento médio**: R$ 17.500/mês · **Meta**: R$ 20.000/mês
- **Volume**: ~50 serviços/mês · **Ticket médio**: R$ 350
- **Equipe**: Toni (dono/admin) + Alessandro (logística) + Guilherme (oficina)
- **Perfil do dono**: não técnico, prefere interfaces visuais simples

---

## 🛠 INFRAESTRUTURA E STACK

### URLs e acessos
- **Produção**: https://idemaq.vercel.app
- **GitHub**: https://github.com/silvaantoniofabricio-glitch/idemaq
- **Supabase**: https://yfbbruxqfzgetapbvrgd.supabase.co (sa-east-1 São Paulo)
- **Pasta local**: `C:\Users\Toni-PC\projetos\idemaq`

### Stack
- **Frontend**: React + Vite
- **Backend / DB**: Supabase (PostgreSQL)
- **Deploy**: Vercel (automático ao fazer push no `main`, ~30s)
- **Automações**: n8n Cloud
- **WhatsApp**: Z-API
- **IA**: Claude API (Anthropic)
- **Mapas**: Google Maps Places API

### Dependências instaladas
`@supabase/supabase-js`, `react-router-dom`, `lucide-react`, `chart.js`, `react-chartjs-2`

### Usuários do sistema
| Email | Apelido | Papel (enum) | UUID |
|---|---|---|---|
| empresaidemaq@gmail.com | **Toni** | `dono` | `ac0b828e-56c9-481a-b692-184ed556c18d` |
| func1@idemaq.com | **Alessandro** | `logistica` | `225a16d7-7542-4338-a2bd-4c45fceaf189` |
| func2@idemaq.com | **Guilherme** | `oficina` | `9ac4d56c-bd62-43a6-aae5-3ed4d21d13e6` |

Apelidos aparecem em: histórico de OS, "criado por", "última ação registrada", relatórios de funcionário.

---

## 🗄 DECISÕES TÉCNICAS DO BANCO (Módulo 00b — não revisar sem nova conversa)

### 1. Histórico em tabela separada
- Cada mudança de etapa da OS gera 1 linha em `os_historico`
- Campos: `os_id`, `etapa_de`, `etapa_para`, `funcionario_id`, `data`, `duracao_segundos`, `observacao`
- Trigger automático na `os` insere histórico quando `etapa` muda
- Permite relatórios cruzados poderosos (tempo médio por etapa, performance de funcionário, etc)

### 2. UUID interno + número visível separado
- Toda tabela tem `id uuid` (RG interno, gerado por `gen_random_uuid()`)
- `os.numero` é `bigint UNIQUE` sequencial gerado por trigger
- UI exibe "OS #247" (numero), banco usa UUID nas FKs/Storage
- Permite migrar pra prefixo (A-001, F-001) no futuro sem dor

### 3. Soft-delete como padrão
- Toda tabela principal tem `deleted_at timestamptz` + `excluido_por uuid`
- Consultas devem filtrar `WHERE deleted_at IS NULL`
- Restauração = setar `deleted_at = NULL`
- Hard-delete só pra `os_historico` (CASCADE com a OS) e casos LGPD pontuais

### 4. UTC no banco + fuso `America/Cuiaba` na aplicação
- Todas as colunas de data são `timestamptz`
- Front converte UTC → Naviraí na exibição (`-04:00`, sem horário de verão)
- Filtros "hoje", "mês corrente", "24h após conclusão" calculam no fuso da app

### 5. Auditoria completa (criado/atualizado/excluído + quem)
- Trigger `tg_set_audit()` preenche automaticamente:
  - INSERT: `criado_em`, `criado_por` (via `auth.uid()`), `atualizado_em`, `atualizado_por`
  - UPDATE: só `atualizado_em` + `atualizado_por` (preserva `criado_*`)
- Front nunca precisa preencher manualmente — banco resolve

### 6. Tabela `usuarios` com papel
- `id` (PK) = mesmo UUID de `auth.users` (FK)
- Enum `papel`: `'dono' | 'logistica' | 'oficina'`
- Funções helper: `papel_atual()` retorna papel do usuário logado; `is_dono()` retorna boolean
- RLS usa essas funções nas policies pra controle de acesso

### 7. Storage com 2 buckets
- **`idemaq-publico`** (URL direta): avatares de cliente, fotos de catálogo de peças
- **`idemaq-privado`** (URL assinada com expiração): fotos de coleta/entrega/diagnóstico, NFs, documentos
- Estrutura de pastas hierárquica por entidade:
  - `idemaq-privado/os/{os_id}/coleta/{n}.jpg`
  - `idemaq-privado/os/{os_id}/entrega/{n}.jpg`
  - `idemaq-privado/notas-fiscais/{ano-mes}/{uuid}.pdf`
  - `idemaq-publico/clientes/{cliente_id}/avatar.jpg`
  - `idemaq-publico/pecas/{peca_id}/{n}.jpg`
- Nome do arquivo renomeado pelo sistema (não nome original do upload)

### Como editar o código (workflow do dono)
1. VS Code local em `C:\Users\Toni-PC\projetos\idemaq`
2. Claude integrado no VS Code edita os arquivos diretamente
3. Após editar:
   ```bash
   git add .
   git commit -m "mensagem"
   git push origin main
   ```
4. Vercel publica automaticamente em ~30 segundos

### Como aplicar SQL novo no Supabase
- Painel Supabase → SQL Editor → New query → cola → Run (ou Ctrl+Enter)
- Ou usar Claude in Chrome (extensão) que automatiza o processo
- Sempre dentro de `BEGIN; ... COMMIT;` pra rollback automático em erro

---

## ♿ ACESSIBILIDADE — OBRIGATÓRIO

**Toni é daltônico Deutan.** Toda escolha visual respeita isso.

### Paleta obrigatória (planilhas, gráficos e elementos de cor)
- `#5B9BD5` azul
- `#FFD966` amarelo
- `#FF6B6B` vermelho (claro/realce)
- `#B8CCE4` azul claro

**Regra de ouro**: nunca usar vermelho/verde puros sem indicador adicional de forma ou texto.

---

## 🎨 TEMAS VISUAIS — 2 MODOS

### Modo escuro (padrão desktop)
- Fundo: `#161618`
- Cards: `#222225` · Cards secundários: `#1a1a1d`
- Bordas: `#2e2e32`
- Sidebar/Topbar: `#1c1c1f`
- Cards usam **bordas sutis** (estilo padrão)

### Modo claro (padrão mobile) — estilo "Conta Azul"
- Fundo: `#ececef`
- Cards: `#ffffff` · Cards secundários: `#f7f7f9`
- Bordas: `#eaeaee`
- Sidebar/Topbar: `#ffffff`
- Texto principal mais preto (`#0a0a0d`) para contraste máximo
- Cards usam **SOMBRA suave** em vez de bordas — visual "flutuante" tipo Conta Azul/Notion
- Sombra padrão: `0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)`
- Sombra hover: `0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.06)` + `translateY(-1px)`
- Valores em destaque (R$, totais) ficam em **preto puro e negrito** — não cinza

### Cores da paleta Deutan — versão escuro × claro
| Cor | Dark | Light |
|---|---|---|
| Azul | `#5B9BD5` | `#1a6aaa` |
| Amarelo | `#FFD966` | `#b8860b` |
| Vermelho | `#c04242` | `#c04242` |
| Azul claro | `#B8CCE4` | `#4a7ea8` |
| Verde | `#4ade80` | `#1a7a3a` |

### Regras dos temas
- Botão sol/lua na topbar alterna entre os modos
- Preferência salva no `localStorage` com chave `idemaq_tema`
- **Desktop abre escuro · Mobile abre claro** por padrão
- Tema passado via prop `T` (objeto de cores) e `dark` (boolean) para todos os componentes
- **Nunca usar cores hardcoded** nos componentes — sempre via `T`
- `T.shadow` e `T.shadowHover` existem só no light mode (são `'none'` no dark)
- Componentes-card devem incluir `className="idemaq-card"` para receber o estilo light mode via CSS global

### Padrão de componentes
- **Fonte**: system-ui
- **Ícones**: Tabler Icons (classe `ti ti-nome`, CDN já no `index.css`)
- Componentes seguem o padrão visual já estabelecido no `App.jsx` atual

---

## 📦 TIPOS DE OS — 3 FLUXOS

### Enum no banco
`os_tipo`: `'atendimento' | 'fabricacao' | 'venda'`

`os_etapa` (11 valores): `aguardando_agendamento | agendamento | recebido | diagnostico | orcamento | em_oficina | teste_final | entrega | pagamento | concluido | recusado`

### 1. Atendimento (máquina do cliente)
`Aguardando ag.` → `Agendado` → `Recebido (pré-diagnóstico)` → `Diagnóstico` → `Orçamento` → `Em oficina (Limpeza + Manutenção simultâneos)` → `Teste final` → `Entrega` → `Pagamento` → `Concluído`

**Saída lateral**: `Recusado` (fica dentro de Orçamento conceitualmente)
→ opções: converter para Fabricação **ou** seguir para Entrega

**Definições importantes das etapas**:
- `Recebido` = pré-diagnóstico (primeiro teste e check do defeito aparente)
- `Diagnóstico` = entender o motivo da falha (trabalho técnico)
- `Orçamento` = único lugar onde se mexe em preço
- **Não existe etapa "A receber"** — Pagamento já cumpre essa função (entregue mas ainda não pago)
- Se cliente paga **antes** da entrega, ao entregar a OS pula direto para `Concluído` (não passa por Pagamento)

### 2. Fabricação (máquina para estoque)
`Compra direta` ou `conversão de Recusado` → `Diagnóstico (campos pré-preenchidos)` → `Limpeza + Manutenção` → `Teste final` → máquina entra no estoque + itens usados saem do estoque → `OS Concluída`

### 3. Venda (produto pronto)
`Agendamento` → `Entregue` → `Pagamento` → `Concluído`

Comprador de máquina do estoque vira cliente cadastrado.

---

## ⚙️ REGRAS DE NEGÓCIO CRÍTICAS

- OS abre **no agendamento**, não no recebimento
- **Montagem ativa** só quando limpeza E manutenção concluídas simultaneamente
- **Orçamento editável** até o pagamento (pode adicionar itens e desconto)
- **Desconto**: campos R$ e % bidirecionais (um atualiza o outro)
- **Link de pagamento sempre InfinitePay D+1** — Ton Black link = 30 dias, nunca usar
- **Caixa**: só visualizar e excluir, sem edição de lançamentos confirmados
- **Parcelamento**: ID único por compra, gera parcelas anteriores e futuras automaticamente
- **Filtro calendário**: padrão mês atual; se alterado, retorna ao padrão em 1 hora
- OS de fabricação: itens usados saem do estoque, máquina entra com custo total ao concluir
- **OS some do Kanban 24h após concluída**, arquivamento automático no prazo configurado
- **Endereços validados via Google Maps Places**
- **Foto obrigatória na coleta** (com opção pular), **não obrigatória na entrega**
- **Inadimplência**: alertas D+1, D+5, D+15, depois 5º e 10º dia útil de cada mês
- **Meta diária**: dias úteis restantes, exclui fins de semana + feriados nacionais + municipais configuráveis
- Itens nas OS chamados de **"itens"** (não "peças") — máquina, capa, mangueira, qualquer item
- **Taxa de diagnóstico** não tem campo especial — é lançada como item normal no orçamento (mesma lógica de mão de obra e limpeza); dono decide caso a caso se inclui ou não
- Coluna `Concluído` mostra só OS concluídas **no mês corrente do calendário** (jan, fev — não 30d corridos); meses anteriores ficam acessíveis via busca, relatórios, cadastro do cliente
- **Barra de busca escapa o filtro de mês** — buscando, vê histórico completo
- No `Pagamento` de OS Recusada, dono decide caso a caso se cobra a taxa de diagnóstico

---

## 🗂 KANBAN — ESTRUTURA

### 4 abas no topo
- **Todos** · **Externo** · **Interno** · **Financeiro**

### Zonas de atividade
| Zona | Cor | Colunas |
|---|---|---|
| Externo | azul | Aguardando ag., Agendamento, Entrega |
| Interno | amarelo | Recebido, Diagnóstico, Em oficina, Teste final |
| Financeiro | verde | Orçamento, Pagamento, Concluído (e Recusado quando toggle ativo) |

- Em **"Todos"** mostra as 11 colunas na ordem do fluxo
- Os 3 tipos de OS (Atendimento/Fabricação/Venda) viram **toggle múltiplo** na linha de filtros, independente da zona; sempre fica pelo menos 1 tipo ativo
- Toggle **"Recusadas"** aparece apenas nas abas **Todos** e **Financeiro**

### Estados de pagamento no card
- **Não pago**: sem badge
- **Pago parcial**: badge amarela mostrando R$ pago/total (ex: "R$ 150/380")
- **Pago total**: badge verde "✓ Pago"
- Pagamento parcial entregue → vai para `Pagamento` (resta receber)
- Pagamento total entregue → vai direto para `Concluído`
- **Enum no banco**: `os_pagamento_status`: `'nao' | 'parcial' | 'total'`
- **Campos no modelo**: `pago`, `valor_pago numeric(10,2)`, `forma_pagamento text`

### Drag-and-drop — regras de bloqueio
- Cards arrastáveis entre colunas
- Só avança **1 etapa por vez** (não pula)
- Só volta **1 etapa por vez**
- `Concluído` **não volta** (reabertura precisa ser ação explícita)
- `Recusado` só volta para `Diagnóstico` ou converte para Fabricação
- `Teste final` exige limpeza E manutenção concluídas
- `Concluído` exige pago total + entregue (ou Teste final no caso de Fabricação)
- Mover OS já paga para `Pagamento` → sistema redireciona automaticamente para `Concluído` (toast verde)
- Movimentos bloqueados mostram **toast vermelho** explicando o motivo
- Avanço/retrocesso manual via botão dentro do detalhe da OS **coexiste** com drag-and-drop

### Responsabilidade por etapa
- **Não tem "responsável da OS inteira"** — cada etapa tem seu próprio responsável
- Quem dá o check em uma etapa fica registrado na tabela `os_historico` (campo `funcionario_id`)
- **Avatar do responsável NÃO aparece no card** do kanban (polui visualmente) — informação disponível em:
  - Aba "Histórico" no detalhe da OS (timeline cronológica completa, lida de `os_historico`)
  - Timeline horizontal no detalhe (badge pequeno com apelido embaixo de cada etapa concluída)
  - Bloco "Última ação registrada" no detalhe da OS
  - Futuros relatórios por funcionário
- Filtro **"Resp."** no kanban filtra OS por funcionário que passou por ela (não dono fixo)
- Alessandro pode fazer trabalho operacional também (sem restrição rígida de área entre funcionários)

### Padrão visual dos filtros
**TODOS** os botões de filtro (abas, chips, toggles) seguem o mesmo padrão de cor:
- **Ativo**: azul (`P.blue` no dark, `P.blueDark` no light), fundo `cor('#0d2035','#e6f1fb')`
- **Inativo**: cinza neutro (`T.textMuted`), borda `T.border`, fundo transparente

Aplica-se a: abas do kanban (Todos/Externo/Interno/Financeiro), filtros de Tipo (Atendimento/Fabricação/Venda), filtros de Resp., filtros de Prazo, botão Aguard. peça, botão Recusadas.

**NÃO aplicar cor própria do tipo** (amarelo pra fabricação, verde pra venda) nos filtros — só azul quando ativo.

Cores próprias dos tipos continuam visíveis em: ícone do tipo no header do card, bolinha de cor no header da coluna, cards visuais do NovaOSModal (escolha de tipo).

### Visibilidade por papel (já implementada via RLS)
- Colunas **Pagamento** e **Concluído** do Kanban só visíveis para o **dono**
- RLS no banco bloqueia Alessandro/Guilherme de ver/editar OS nessas etapas (não só esconde no front)

---

## 🛡 GARANTIA — 90 DIAS APÓS A ENTREGA

- **OS de garantia** = OS nova de tipo `Atendimento`, com flag `garantia: true` e campo `os_origem_id` apontando para a OS original
- **Constraint no banco**: garantia=true exige os_origem_id não-nulo
- Valor padrão **R$ 0** (mão de obra não cobrada)
- Itens podem ser lançados normalmente: peça sai do estoque a preço de custo (sem cobrar do cliente)
- Card mostra badge azul **"🛡 Garantia"** e link para a OS original no detalhe
- OS original concluída dentro dos 90 dias mostra banner **"Garantia ativa — faltam X dias"**
- Campo `garantia_dias` na OS original (padrão 90, configurável caso a caso)

---

## 💳 MAQUININHAS E TAXAS

### InfinitePay D+1 (padrão da casa)
- PIX: 0%
- Débito: 1,37%
- 1x: 3,15%
- 12x: 12,40%
- **Link 1x: 4,20%** ← sempre usar este para links de pagamento

### Ton Black D+1
- Débito: 1,36%
- 1x: 3,14%
- 12x: 12,39%
- **Link Ton = 30 dias — nunca usar para a Idemaq**

### Outras regras
- Pagamento **misto permitido**: PIX + cartão + a prazo na mesma OS

### Bancos e cartões cadastrados
- **Bancos**: Cresol · Bradesco · Mercado Pago
- **Cartões**: Elo Grafite · Bradesco Visa · Mercado Pago · Bradesco PJ · Cresol · Nubank PJ · Inter

---

## 💰 SERVIÇOS E PREÇOS

| Item | Compra | Venda |
|---|---|---|
| Limpeza | — | R$ 185 |
| Limpeza combinada (cada) | — | R$ 165 |
| Manutenção | — | R$ 185 |
| Taxa diagnóstico | — | R$ 30 |
| Máquina reformada | R$ 150 | R$ 650 |
| Capa | R$ 30 | R$ 85 |

---

## 📊 FINANCEIRO (tabelas pendentes — schema parte 2)

### Receitas
Limpeza, Manutenção, Peças, Venda de máquinas, Taxa diagnóstico, Outros

### Despesas
- Funcionários (2 × R$ 1.650)
- Peças ML
- Tráfego pago: R$ 500
- Impostos, Financiamento
- Luz/água/internet, Combustível
- Ferramentas, Materiais de limpeza

### Lançamentos
- **Avulso**
- **Parcelado** (ID único por compra)
- **Recorrente** (dia configurável)

### Fluxo
- Contas a receber → baixa → vai para **Caixa**
- Contas a pagar → baixa → vai para **Caixa**
- **Caixa = só movimentações confirmadas, sem edição**

---

## 📦 ESTOQUE (tabelas `peca` e `maquina` já criadas)

### Peças (tabela `peca`)
- Quantidade: `qtd_atual`, `qtd_minima`, `qtd_maxima`
- Custo: `custo_minimo`, `custo_medio`, `custo_maximo`, `custo_atual`
- Preço de venda: `preco_venda` · % lucro derivado (calculado, não armazenado)
- **Baixa automática** ao usar peça na OS (a implementar no fluxo)
- **Alerta** ao atingir mínimo (índice `idx_peca_estoque_baixo` já criado)

### Máquinas (tabela `maquina`)
- Estados (enum `maquina_estado`): `do_cliente` | `disponivel` | `em_revisao` | `vendida`
- **Custo total** = `custo_compra` + `custo_itens` + `custo_servico`
- `cliente_id NULL` = máquina do estoque (sem dono ainda)

### Entrada por nota fiscal (futuro)
Upload PDF/foto/Excel/CSV/texto → IA lê (Claude API) → revisão → salva

---

## 📈 RELATÓRIOS PLANEJADOS

- Geral
- OS operacional
- Estoque
- Vendas
- Financeiro (DRE completo + IA financeira)
- Funcionários (desempenho com IA — `os_historico` já guarda dados pra isso)

---

## 📅 FERIADOS

- **Nacionais**: já pré-cadastrados no sistema
- **Municipais Naviraí/MS**: 06/11 Aniversário da cidade + configuráveis manualmente

---

## 🔌 INTEGRAÇÕES PLANEJADAS

- **n8n Cloud**: automações via webhook
- **Z-API**: WhatsApp (criação de OS e clientes pelo WhatsApp, notificações)
- **Google Maps Places**: validação de endereços
- **Claude API (Anthropic)**: leitura de faturas e notas fiscais, IA financeira

---

## 🧠 HISTÓRICO DE DECISÕES IMPORTANTES

Decisões que foram tomadas após discussão e **não devem ser revistas** sem nova conversa com o dono.

### Schema do banco (Módulo 00b)
- ✅ **Histórico em tabela separada** (`os_historico`) — não jsonb na OS; permite relatórios cruzados poderosos
- ✅ **UUID interno + número visível separado** — flexibilidade pra mudar formato do número no futuro
- ✅ **Soft-delete em tudo** — `deleted_at` + `excluido_por`; permite restaurar, preserva histórico, dá auditoria
- ✅ **UTC no banco + fuso na app** — `timestamptz` sempre; padrão da indústria
- ✅ **Auditoria completa** — `criado_em/por` + `atualizado_em/por` via trigger automático; não precisa lembrar no front
- ✅ **Tabela `usuarios` com `papel`** — não usar email pra autorização; tem apelido humano pro display
- ✅ **2 buckets Storage (público/privado)** — separação de segurança importante

### Fluxo de OS
- ✅ **OS abre no agendamento**, não no recebimento — porque o compromisso com o cliente já existe nesse momento
- ✅ **Não existe etapa "A receber"** — `Pagamento` cumpre essa função (OS entregue mas não paga); se pagou antes, pula direto para `Concluído`
- ✅ **Taxa de diagnóstico é um item normal do orçamento** — não tem campo especial; o dono decide caso a caso se cobra (mesma lógica de mão de obra e limpeza)
- ✅ **Itens são "itens"**, não "peças" — porque englobam máquina, capa, mangueira, qualquer coisa

### Kanban e responsabilidade
- ✅ **Não tem responsável fixo por OS** — cada etapa tem seu responsável próprio, registrado em `os_historico`
- ✅ **Avatar do responsável não aparece no card** — polui visualmente; informação fica no detalhe e relatórios
- ✅ **Filtros sempre azul quando ativo** — nunca cor própria do tipo (amarelo/verde) nos filtros; cor do tipo só no header do card e bolinha da coluna
- ✅ **Coluna Concluído por mês corrente do calendário**, não 30 dias corridos — busca escapa o filtro

### Pagamento
- ✅ **Link de pagamento sempre InfinitePay D+1** — Ton Black tem link de 30 dias, inviável
- ✅ **3 estados de pagamento no card**: não pago (sem badge), parcial (badge amarela R$ pago/total), total (badge verde "✓ Pago")
- ✅ **Pagamento parcial → vai para coluna Pagamento; total → pula para Concluído**

### Garantia
- ✅ **Garantia é OS nova** com flag `garantia: true` e `os_origem_id` apontando para a original — não é "reabrir" OS antiga
- ✅ **Valor padrão R$ 0** na OS de garantia, itens saem do estoque a custo (sem cobrar do cliente)
- ✅ **90 dias padrão**, configurável por OS

### Visual
- ✅ **Paleta Deutan obrigatória** — Toni é daltônico, nada de vermelho/verde puros sem indicador adicional
- ✅ **Desktop abre dark, mobile abre light** — padrão por dispositivo
- ✅ **Light mode estilo "Conta Azul"** — cards com sombra suave em vez de bordas, valores em preto puro e negrito
- ✅ **Cores nunca hardcoded** — sempre via prop `T`

### Drag-and-drop
- ✅ **Só anda 1 etapa por vez** (avança ou volta) — para evitar saltos acidentais
- ✅ **Concluído não volta por drag** — reabertura precisa ser ação explícita
- ✅ **Sistema redireciona automaticamente** quando OS já paga é arrastada para `Pagamento` (vai pra Concluído)

---

## 👨‍💻 INSTRUÇÕES DE TRABALHO PARA O CLAUDE

### Princípios gerais
1. **Sempre considerar o que já está pronto** antes de sugerir refazer
2. **Priorizar soluções simples e visuais** (Toni não é técnico)
3. **Respeitar sempre a paleta de acessibilidade Deutan**
4. **Tema padrão dark** (light disponível conforme regras dos temas)
5. **Ícones sempre Tabler Icons** (classe `ti ti-nome`)
6. **Componentes seguem o padrão visual já estabelecido no `App.jsx` atual**
7. **Usar as tabelas que já existem** — schema parte 1 aplicado (`usuarios`, `cliente`, `maquina`, `peca`, `os`, `os_item`, `os_historico`, `pre_diagnostico`)

### Comunicação com o dono
- **Nunca criar** funcionalidades, regras de negócio ou mudanças **sem autorização explícita**
- **Antes de aplicar mudanças não triviais**, descrever o plano e esperar o OK do dono
- Quando houver **dúvida no fluxo de negócio**, **perguntar em vez de assumir**
- Trazer **sugestões de especialista em gestão de OS** quando relevante, mas **marcadas claramente como sugestão** (não aplicar sem aprovação)
- **Não fazer "pequenas melhorias" ou "limpezas" não pedidas**

### Entrega de código — 2 modos

#### Modo padrão (preferencial)
- Gerar **arquivo `App.jsx` completo**
- Dono copia para `src/App.jsx` e faz `git push`
- Mais rápido, **risco zero** de quebra

#### Modo instruções (quando o dono pedir)
- Gerar **arquivo `.md` com blocos LOCALIZAR/SUBSTITUIR POR**
- Para o Claude do VS Code aplicar pontualmente
- **Usar só em mudanças pequenas** (1 a 3 pontos)

### Regras absolutas
- ✅ Sempre **validar a sintaxe** antes de entregar
- ✅ Nunca mandar **fragmentos ou trechos parciais** sem contexto suficiente
- ✅ Ao usar dados do banco, sempre considerar soft-delete (`WHERE deleted_at IS NULL`)
- ✅ Auditoria é automática via trigger — não preencher `criado_em/por` no front

### Padrão de conexão com Supabase
```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Sempre filtrar soft-delete:
const { data, error } = await supabase
  .from('cliente')
  .select('*')
  .is('deleted_at', null)
  .order('nome');
```

---

## 📌 LEMBRETES RÁPIDOS

- 🎨 Paleta Deutan: `#5B9BD5` `#FFD966` `#FF6B6B` `#B8CCE4`
- 🌙 Dark = desktop · ☀️ Light = mobile
- 🔧 Itens, não "peças"
- 💰 Link de pagamento = InfinitePay D+1 (4,20%)
- 🛡 Garantia = OS nova com `garantia: true` e `os_origem_id`
- 📅 Coluna Concluído = mês do calendário, não 30 dias
- 🎯 Filtro ativo = sempre azul
- 👥 Sem responsável fixo por OS — só por etapa (em `os_historico`)
- 🚫 Nunca aplicar mudanças não pedidas
- 🗄 Soft-delete: sempre filtrar `WHERE deleted_at IS NULL`
- 🕐 Datas em UTC no banco, converter para Naviraí (America/Cuiaba) na UI
- 👤 Apelidos: Toni (dono) · Alessandro (logística) · Guilherme (oficina)
