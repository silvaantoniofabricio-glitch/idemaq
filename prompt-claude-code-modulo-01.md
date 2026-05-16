# PROMPT — CLAUDE CODE — MÓDULO 01: KANBAN CONECTADO AO SUPABASE

> Cole este prompt inteiro no Claude Code (terminal).
> Ele contém tudo que você precisa saber pra executar sem interrupções.

---

## CONTEXTO DO PROJETO

Você está trabalhando no **sistema Idemaq** — gestão de OS para assistência técnica de máquinas de lavar.

- **Pasta do projeto**: `C:\Users\Toni-PC\projetos\idemaq`
- **Produção**: https://idemaq.vercel.app
- **GitHub**: https://github.com/silvaantoniofabricio-glitch/idemaq
- **Supabase**: https://yfbbruxqfzgetapbvrgd.supabase.co (região sa-east-1 São Paulo)
- **Deploy**: automático via Vercel ao fazer push no `main` (~30s)

### Stack
React + Vite · Supabase (PostgreSQL) · Vercel

### Dependências já instaladas
`@supabase/supabase-js`, `react-router-dom`, `lucide-react`, `chart.js`, `react-chartjs-2`

---

## O QUE JÁ ESTÁ PRONTO (não refazer)

O arquivo `src/App.jsx` tem **~3.181 linhas** com:

- ✅ Kanban visual 100% pronto (desktop linhas ~1826-2290, mobile ~1144-1620)
- ✅ 4 abas: Todos · Externo · Interno · Financeiro
- ✅ 11 colunas com cores e zonas
- ✅ Filtros: tipo, responsável, prazo, aguardando peça, recusadas
- ✅ Drag-and-drop HTML5 nativo com função `moverOS()` e `podeMoverOS()`
- ✅ Regras de bloqueio de movimentação já implementadas
- ✅ Toast vermelho/verde já funcionando
- ✅ 3 estados de pagamento no card
- ✅ Badge de garantia (`🛡 Garantia`)
- ✅ Colunas Pagamento e Concluído ocultas para Func1/Func2
- ✅ Tema dark/light com prop `T` (cores nunca hardcoded)
- ✅ Ícones Tabler Icons (classe `ti ti-nome`)
- ✅ Modal Nova OS com seleção de tipo (UI pronta, ainda não salva no banco)
- ✅ Detalhe da OS com abas (UI pronta, ainda não salva no banco)
- ✅ Pull-to-refresh mobile (hook `onRefresh` pronto, ainda não busca do banco)
- ✅ Constante `OS_MOCK` alimentando o Kanban atualmente
- ✅ Constante `FUNCIONARIOS` com Toni, Alessandro, Guilherme (mock)
- ✅ Auth funcionando (login real com Supabase Auth)
- ✅ `src/supabase.js` com cliente configurado

---

## BANCO DE DADOS — SCHEMA APLICADO

Todas as tabelas já existem no Supabase. Regras obrigatórias:

- **Soft-delete**: todas as tabelas têm `deleted_at timestamptz`. Sempre filtrar `WHERE deleted_at IS NULL`
- **Auditoria automática**: trigger `tg_set_audit()` preenche `criado_em/por` e `atualizado_em/por` via `auth.uid()`. **Front não preenche esses campos.**
- **Datas**: tudo em UTC no banco. Exibir convertido para `America/Cuiaba` (-04:00, sem horário de verão)
- **Número da OS**: campo `numero` (bigint) gerado automaticamente por trigger. Não preencher no front.

### Tabelas relevantes para este módulo

**`os`** — tabela central
```sql
id uuid PK
numero bigint UNIQUE (gerado por trigger)
tipo os_tipo ('atendimento' | 'fabricacao' | 'venda')
etapa os_etapa ('aguardando_ag' | 'agendamento' | 'recebido' | 'diagnostico' | 'orcamento' | 'em_oficina' | 'teste_final' | 'entrega' | 'pagamento' | 'concluido' | 'recusado')
cliente_id uuid FK -> cliente
maquina_id uuid FK -> maquina (nullable)
valor_total numeric
desconto numeric default 0
pago os_pagamento_status ('nao' | 'parcial' | 'total')
valor_pago numeric default 0
forma_pagamento text
garantia boolean default false
os_origem_id uuid FK -> os (nullable)
garantia_dias integer default 90
recusada boolean default false
aguardando_peca boolean default false
prazo timestamptz (nullable)
data_conclusao timestamptz (nullable)
deleted_at timestamptz (soft-delete)
criado_em timestamptz (automático)
atualizado_em timestamptz (automático)
```

**`os_historico`** — log de movimentações
```sql
id uuid PK
os_id uuid FK -> os
etapa_de os_etapa (nullable — null = criação da OS)
etapa_para os_etapa
funcionario_id uuid FK -> usuarios
criado_em timestamptz (automático)
```

**`cliente`**
```sql
id uuid PK
nome text
telefone text
deleted_at timestamptz
```

**`usuarios`**
```sql
id uuid PK (= auth.users.id)
nome text
apelido text ('Toni' | 'Alessandro' | 'Guilherme')
papel papel ('dono' | 'logistica' | 'oficina')
deleted_at timestamptz
```

---

## DECISÕES FECHADAS — RESPEITAR EXATAMENTE

1. **Dados de teste**: criar 5 OS de seed no Supabase via SQL antes de conectar a UI
2. **Histórico na criação**: registrar automaticamente com `etapa_de = NULL` e `etapa_para = etapa inicial`. Verificar se o trigger do banco já faz isso no INSERT; se não fizer, o front insere manualmente após criar a OS.
3. **Filtro "Resp."**: sempre carregar os 3 usuários de `usuarios WHERE deleted_at IS NULL` — nunca lista vazia
4. **Movimento bloqueado**: toast vermelho com mensagem específica (já implementado) + animação CSS `shake` de 200ms no card que não pode ser solto (novo — adicionar)
5. **OS concluída**: ao clicar no card, abre o detalhe em **modo somente leitura** com banner verde no topo: ícone ✓ + texto "OS finalizada" + botão "Reabrir OS" (apenas para papel `dono`). Alessandro e Guilherme não veem a coluna Concluído, mas se acessarem via busca: detalhe em modo leitura sem botão reabrir.

### Decisões técnicas
- **Cache**: `useState` puro + refetch manual (sem react-query ou SWR)
- **Drag-and-drop**: optimistic update (atualiza UI imediatamente, reverte se o banco falhar)
- **Realtime**: não implementar agora — refresh manual é suficiente
- **Erro de rede**: toast vermelho + reverter a mudança visual. Sem retry automático.
- **Loading state**: skeleton de cards (3-4 por coluna) enquanto carrega do banco
- **Tempo de cache**: sem cache automático — carrega ao abrir a tela + ao fazer pull-to-refresh

---

## ACESSIBILIDADE — OBRIGATÓRIO

O dono é **daltônico Deutan**. Regras que nunca quebram:

- **Paleta Deutan**: `#5B9BD5` azul · `#FFD966` amarelo · `#FF6B6B` vermelho · `#B8CCE4` azul claro
- **Nunca usar vermelho/verde puros** sem indicador adicional de forma ou texto
- **Cores sempre via prop `T`** — nunca hardcoded no JSX
- **Filtros ativos sempre em azul** — nunca na cor do tipo de OS
- **Banner "OS finalizada"**: usar verde + ícone ✓ + texto (não só cor)

---

## REGRAS VISUAIS QUE NÃO MUDAM

- Ícones: **Tabler Icons** (classe `ti ti-nome`) — nunca outro ícone
- Tema dark é padrão desktop, light é padrão mobile — via prop `dark` (boolean)
- Prop `T` carrega o objeto de cores do tema atual — nunca usar cor diretamente
- `T.shadow` e `T.shadowHover` existem só no light (são `'none'` no dark)
- Cards com `className="idemaq-card"` recebem estilo light mode via CSS global
- Fonte: `system-ui`

---

## O QUE VOCÊ VAI IMPLEMENTAR — SEQUÊNCIA

### PASSO 1 — Criar SQL de seed (5 OS de teste)

Criar o arquivo `seeds/01-kanban-teste.sql` com 5 OS distribuídas em colunas diferentes, incluindo:
- 1 OS em `agendamento` (tipo atendimento)
- 1 OS em `diagnostico` (tipo atendimento)
- 1 OS em `orcamento` com `recusada = true` (tipo atendimento) — para testar o toggle
- 1 OS em `em_oficina` (tipo fabricacao) — com campo que indique limpeza OK mas manutenção pendente (usar observações ou campo auxiliar)
- 1 OS em `concluido` do mês atual (tipo atendimento, `pago = 'total'`, `data_conclusao = agora`)

Para cada OS:
- Usar `cliente_id` de um cliente real que você vai criar junto no seed (ou buscar o primeiro disponível)
- `valor_total` entre R$185 e R$380
- Pelo menos 1 OS com `garantia = true` e `os_origem_id` apontando para outra OS do seed
- Comentários legíveis no SQL explicando cada OS

**Não rodar o SQL automaticamente** — salvar o arquivo e informar Toni que ele precisa rodar no Supabase SQL Editor.

---

### PASSO 2 — Criar hook `useOS` em `src/hooks/useOS.js`

```js
// Estrutura esperada do hook:
const { osList, loading, error, refetch } = useOS()
```

- Faz `SELECT` na tabela `os` com JOIN em `cliente` (nome, telefone) e LEFT JOIN em `os_historico` (último registro para saber quem moveu por último)
- **Sempre filtrar** `deleted_at IS NULL` na tabela `os`
- **Regra "24h após concluída"**: filtrar fora do resultado OS com `data_conclusao IS NOT NULL AND data_conclusao < NOW() - INTERVAL '24 hours'`
  - Exceção: se a busca global estiver ativa, mostrar mesmo as concluídas há mais de 24h
- Converter datas de UTC para `America/Cuiaba` antes de retornar
- Retornar loading state e error state
- Expor `refetch()` para refresh manual

---

### PASSO 3 — Criar hook `useUsuarios` em `src/hooks/useUsuarios.js`

```js
const { usuarios, loading } = useUsuarios()
```

- Busca `usuarios WHERE deleted_at IS NULL ORDER BY apelido`
- Substitui a constante `FUNCIONARIOS` que existe no `App.jsx`
- Usado pelo filtro "Resp." do Kanban (sempre os 3)

---

### PASSO 4 — Conectar Kanban ao `useOS`

No `App.jsx`, **substituir** `OS_MOCK` por `useOS()`:

1. Importar o hook
2. Remover (ou comentar com `// TODO: remover após testes`) a constante `OS_MOCK`
3. Plugar `osList` do hook onde `OS_MOCK` era usado no Kanban desktop e mobile
4. Adicionar **skeleton de cards** enquanto `loading === true`:
   - 3 a 4 cards "fantasma" por coluna visível
   - Usar a cor `T.border` com opacity para os blocos do skeleton
   - Animação `pulse` suave (CSS keyframe)
5. Se `error`, mostrar toast vermelho "Erro ao carregar OS — tente recarregar"

---

### PASSO 5 — Persistir drag-and-drop no Supabase

Na função `moverOS()` do `App.jsx`:

**Fluxo com optimistic update:**
```
1. Guardar estado anterior (para reverter se falhar)
2. Atualizar estado local imediatamente (UI responde na hora)
3. Fazer UPDATE no Supabase: { etapa: novaEtapa, atualizado_em: now() }
4. Se OK: nada (UI já está certa)
5. Se erro: reverter estado local para o anterior + toast vermelho "Erro ao mover OS — mudança revertida"
```

**Sobre `os_historico`**: verificar se existe trigger no banco que insere automaticamente ao UPDATE de `etapa`. Se existir, não fazer nada no front. Se não existir, inserir manualmente:
```js
await supabase.from('os_historico').insert({
  os_id: os.id,
  etapa_de: etapaAnterior,
  etapa_para: novaEtapa,
  funcionario_id: usuarioLogado.id
})
```

---

### PASSO 6 — Animação shake no card bloqueado

Quando `podeMoverOS()` retornar `false` e o usuário soltar o card:

1. Adicionar keyframe CSS `@keyframes shake` com vibração horizontal de 200ms
2. Aplicar temporariamente a classe `shake` no card tentou-se mover (por 300ms)
3. Remover a classe depois
4. O toast vermelho já existe — manter

---

### PASSO 7 — Persistir toggle "Aguardando peça"

Na função que ativa/desativa o toggle `aguardando_peca`:

- Fazer `UPDATE` no Supabase: `{ aguardando_peca: novoValor }`
- Optimistic update também aqui
- Reverter + toast se falhar

---

### PASSO 8 — Plug do pull-to-refresh mobile

Encontrar o hook `onRefresh` no componente mobile (já existe mas não faz nada real):
- Chamar `refetch()` do `useOS`
- Aguardar a Promise resolver antes de sinalizar fim do refresh

---

### PASSO 9 — Filtro "Resp." usando `useUsuarios`

Substituir a constante `FUNCIONARIOS` pelo hook `useUsuarios()`:
- O filtro sempre mostra os 3 usuários ativos
- Se `loading`, mostrar o filtro desabilitado com "..." em cada opção

---

### PASSO 10 — Banner "OS finalizada" no detalhe

No componente de detalhe da OS (já existe no App.jsx):

Quando `os.etapa === 'concluido'`:
- Adicionar banner no **topo do detalhe**, acima de tudo:
  - Fundo: `T.cardSecondario` com borda `#28a745` (verde) de 1px — com ícone `ti ti-circle-check` ao lado
  - Texto: "OS finalizada" em destaque
  - **Indicador extra além da cor** (acessibilidade Deutan): ícone ✓ + texto "Finalizada" — nunca só cor
  - Botão "Reabrir OS" visível apenas se `papel === 'dono'`
- Bloquear todos os campos e botões de ação do detalhe (modo somente leitura)
- O botão "Reabrir OS" apenas mostra toast "Funcionalidade disponível no Módulo 03" por agora — não implementar a lógica de reabertura neste módulo

---

### PASSO 11 — Validação e push

1. Rodar `npm run dev` e verificar:
   - Kanban carrega com skeleton → dados reais aparecem
   - Drag-and-drop funciona e persiste após recarregar a página
   - Filtro "Resp." mostra Toni, Alessandro, Guilherme
   - OS concluída mostra banner correto
   - Sem erros no console
2. Rodar `npm run build` — deve compilar sem erros
3. Se tudo OK: `git add . && git commit -m "feat: kanban conectado ao supabase - módulo 01" && git push origin main`
4. Aguardar deploy Vercel (~30s) e confirmar em https://idemaq.vercel.app

---

## REGRAS DE COMPORTAMENTO — OBRIGATÓRIAS

- **Nunca criar** funcionalidades, regras de negócio ou telas novas além do que está descrito acima
- **Não fazer "limpezas" ou melhorias visuais não pedidas**
- Se encontrar algo que parece errado mas não está na lista: **anotar num comentário `// TODO:` e seguir**
- Se encontrar uma decisão técnica ambígua: escolher a opção **mais simples e menos destrutiva**
- **Nunca usar cores hardcoded** — sempre via prop `T`
- **Nunca remover código existente** sem ter certeza de que é substituído corretamente
- Ao terminar cada passo, informar brevemente o que foi feito antes de continuar

---

## CHECKLIST DE ENTREGA

Ao finalizar, confirmar cada item:

- [ ] Arquivo `seeds/01-kanban-teste.sql` criado com 5 OS de teste
- [ ] Hook `useOS.js` criado em `src/hooks/`
- [ ] Hook `useUsuarios.js` criado em `src/hooks/`
- [ ] `OS_MOCK` desativado (comentado ou removido) do Kanban
- [ ] Skeleton de cards funcionando enquanto carrega
- [ ] Drag-and-drop persiste no Supabase (optimistic update)
- [ ] Animação shake no card bloqueado
- [ ] Toggle "aguardando peça" persiste no Supabase
- [ ] Pull-to-refresh mobile chama `refetch()` real
- [ ] Filtro "Resp." usa dados reais de `usuarios`
- [ ] Banner "OS finalizada" no detalhe com modo somente leitura
- [ ] `npm run build` sem erros
- [ ] `git push origin main` feito
- [ ] Informado ao Toni que ele precisa rodar o SQL de seed no Supabase

---

*Fim do prompt — Módulo 01 · Idemaq · gerado em 15/05/2026*
