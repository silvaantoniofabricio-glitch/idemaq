# Contexto — Painel Funcionários (Alessandro + Guilherme)

> Doc vivo do terminal `painel_func`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

✅ **Real ponta a ponta** (20/05/2026, sessão `geral`). Renderizado pela rota `/` quando o usuário logado não é dono — switch fica em `src/App.jsx` no componente `PainelPorPerfil`. Também acessível em `/painel-func`.

**Importante:** não existe arquivo `src/pages/PainelFuncionarios.jsx`. A página principal segue sendo `src/pages/Painel.jsx` (do dono); o conteúdo do funcionário vive em `src/components/paineis/PainelFuncionario.jsx`, montado como alternativa pelo `PainelPorPerfil`. Não criar página separada — o roteamento é por papel, não por path.

**O que mudou em 20/05/2026 (sessão `geral` — 2 entregas):**
- Removidos os 3 mocks (`OS_DO_DIA_MOCK`, `AVISOS_MOCK`, `DESEMPENHO_MOCK`).
- Novo hook `src/hooks/usePainelFuncionario.js` agrega: OS ativas do Kanban + desempenho do mês (OS concluídas + tempo médio) + pontualidade do funcionário (% presente em `jornada_funcionario` no mês).
- Card de **Avisos removido** — fonte real não existia (era inline-mock). Recoloca quando houver tabela `aviso` ou agregador automático (estoque baixo / OS atrasadas).
- Lookup de `funcionario_id` por email (`func1@idemaq.com` → uuid em `usuarios`) com cache em memória.
- Loading/empty states: "Carregando…" enquanto consulta, "Nenhuma OS aberta no momento" quando lista vazia.

**Filtro por funcionário (20/05/2026 — 2ª entrega):**
- Hook agora consulta `os_historico` pra descobrir OS que o funcionário tocou nos últimos 90 dias (`os_historico.funcionario_id = funcUuid`).
- Se houver IDs: OS abertas e OS concluídas do mês são filtradas por esses IDs (`os.id IN (...)`).
- Se NÃO houver (funcionário ainda não atuou — começo do uso): cai em fallback global com flag `escopo: 'global'`.
- UI reflete o escopo: título "Minhas OS" vs "OS abertas" + avisinho discreto "Sem histórico no seu nome ainda — mostrando OS gerais" quando global.
- Pontualidade SEMPRE é específica (não tem fallback global — `jornada_funcionario` é por usuário por definição).

---

## 2. Estrutura real (o que existe hoje)

### Arquivos
- `src/components/paineis/PainelFuncionario.jsx` — composição do painel-func (header pessoal + card de ponto + minhas OS de hoje + avisos + meu desempenho).
- `src/components/ponto/CardPontoFuncionario.jsx` — card grande de ponto em destaque (status atual + botão grande + meta diária + banco de horas + link pro espelho).
- `src/components/ponto/BotaoBaterPonto.jsx` — o "Bater ponto" propriamente dito. Botão grande full-width com gradiente azul/amarelo/vermelho conforme próxima ação (entrada / almoço / volta / saída).
- `src/components/ponto/EspelhoPonto.jsx` — view inline aberta pelo "Ver meu espelho de ponto" (não é rota, é state local `verEspelho`).
- `src/components/ponto/_mocks.js` — `FUNCIONARIOS_PONTO`, `BATIDAS_MOCK`, `JORNADA_MOCK`, `TIPOS_BATIDA` + helpers.

### Roteamento
Switch baseado em `isAdmin(user)` (de `utils/osHelpers.js`):
- `dono` → `<Painel />` (executivo, do contexto-painel)
- `func1` (Alessandro) | `func2` (Guilherme) → `<PainelFuncionario funcId={getRole(user)} />`

`getRole(user)` mapeia pelo email: `func1@idemaq.com` → 'func1', `func2@idemaq.com` → 'func2'.

---

## 3. Botão "Bater ponto" — estado real

- **Arquivo**: `src/components/ponto/BotaoBaterPonto.jsx`
- **Onde aparece**: dentro do `CardPontoFuncionario`, abaixo do status atual.
- **Visual**: full-width 18px padding, gradiente `corEtapa(cfg.cor, dark)` + sombra colorida, ícone Tabler + label dinâmico ("Bater entrada" / "Iniciar almoço" / "Voltar do almoço" / "Bater saída"). Cor segue paleta Deutan: entrada/volta = azul, almoço = amarelo, saída = vermelho. Quando expediente encerrado mostra estado disabled cinza.
- **NÃO usa `<Button>` da lib UI**. É um botão custom grande pra dar peso visual de CTA principal — equivalente conceitual a um relógio de ponto físico. Decisão consciente: o `<Button primary>` da lib é pequeno demais pra esse caso.
- **Onde aponta hoje**: chama `onBater` → função `bater` em `CardPontoFuncionario.jsx` (linhas 49–62) que **só grava em state local** (`setBatidasLocais`) e dispara `notify('ok', ...)`. **TODO no código** (já marcado) pra trocar por INSERT em `ponto_registro` quando o terminal `ponto` subir o schema.
- **Geolocalização**: hoje é `capturarLocalizacaoMock()` com latência simulada + 5% de chance de erro pra exercitar UX. Trocar por `navigator.geolocation` real fica no escopo do terminal `ponto`.
- **NÃO existe rota `/ponto`** — e por design não precisa: o fluxo de bater ponto + ver espelho é todo inline no painel-func (state `verEspelho` troca a render do CardPontoFuncionario pelo `EspelhoPonto`). Spec em `idemaq-modulo-ponto-CLAUDE-CODE.md` confirma essa abordagem ("Mostre card de ponto no painel inicial dos funcionários").

---

## 4. Conceito (mantido)

**Visão operacional do dia, não dashboard executivo**.

Funcionário **não vê**:
- Faturamento, meta, inadimplência (admin-only)
- Pipeline macro
- DRE/relatórios financeiros

Funcionário **vê hoje**:
- Header personalizado com saudação + nome + data
- Card de ponto em destaque (status + botão grande + meta diária + banco de horas)
- Minhas OS de hoje (mock — 3 cards com nº + cliente + etapa + hora)
- Avisos (mock — reuniões, estoque baixo, etc.)
- Meu desempenho no mês: OS concluídas · tempo médio · pontualidade (sem R$)

---

## 5. Diferenciação por papel (não implementada)

Hoje o conteúdo é o **mesmo** pra func1 e func2 — só muda nome no header e o `funcId` que alimenta o card de ponto.

A diferenciação prevista no plano original (paradas do dia pro Alessandro, checklist de oficina pro Guilherme) **ainda não foi feita**. Fica como evolução quando o módulo Logística e a tabela `os` ganharem mais dados pra puxar.

---

## 6. Substituição do Financeiro no menu

**Decisão mantida**: o item "Financeiro" do menu não aparece pra funcionário (`MENUS_ADMIN_ONLY = ['financeiro', 'relatorios']` em `Sidebar.jsx` + `BottomNav.jsx`). O slot fica vazio; o painel-func **já tem o card de ponto em destaque** então não precisa de outro item de menu pra "Ponto".

---

## 7. Reaproveitamento de componentes

Atualmente usa do `src/components/ui/`:
- `Card`, `SectionHeader`, `Button` (só pro "Voltar" do espelho), `useToast`.

E componentes próprios:
- `src/components/paineis/PainelFuncionario.jsx` + KPI helper inline (não usa o `KPICard` do dono, por intenção — visual mais compacto).
- Família `src/components/ponto/*`.

**Não reusa** de `src/components/painel/` (KPICard, Hero, Pipeline, AlertasCriticos) — esses são do dono, viés financeiro/macro. Mantido o princípio do plano original.

---

## 8. Visibilidade — defesa em 3 camadas

Funcionário não vê:
- Financeiro (`/financeiro` → `<AdminOnly>` redireciona) e Relatórios (`/relatorios` idem)
- Custos do Estoque (prop `mostraValores={isAdmin(user)}` em `Estoque.jsx`, `PecaDetalheModal`, `MaquinaDetalheModal`)
- Etapas "Pagamento" e "Concluído" do Kanban (RLS no banco também)

Ver `project_papeis_visibilidade.md` na memória.

---

## 9. Padrão visual (cumprido)

- Paleta Deutan ✅ — só `corEtapa('blue'|'yellow'|'green'|'red', dark)` + `corHero(dark)`. Sem cor hardcoded.
- Ícones Tabler ✅ — `ti ti-clock-pin`, `ti-clipboard-list`, `ti-megaphone`, `ti-chart-line`, etc. Zero emoji.
- Cards com `idemaq-card` ✅ (via `<Card>` da lib + um manual no `CardPontoFuncionario` por causa do gap/flex custom).
- Tipografia tabular ✅ em horas, números de OS, percentuais, banco de horas.
- Max-width 720px centralizada — clima mobile-first mesmo no desktop, intencional pra um painel "operacional" enxuto.

---

## 10. Mudanças aplicadas nesta passada (2026-05-19)

1. **Sem refator do layout** — painel-func já estava bem montado, validei só.
2. **TODO comentado** no `CardPontoFuncionario.jsx` (função `bater`, linhas ~49–51) marcando que hoje é state local e precisa virar INSERT em `ponto_registro` quando o terminal `ponto` subir o schema real.
3. **CLAUDE.md §11** atualizado: linha "Painel Funcionários" trocada de 🔴 Não implementado → ✅ Implementado — botão de ponto presente, ajustes pontuais. Próximo passo macro virou "Trocar mocks por queries reais quando schema `ponto_registro` subir".
4. **Sem novas rotas** — `/ponto` não foi criado nem prometido. Fluxo continua inline no painel-func (espelho via state `verEspelho`). PENDENCIAS-ROTAS.md **não foi tocado** porque não há dependência cross-terminal nova.
5. **Sem mexer** em `App.jsx`, `theme.js`, `osData.js`, ou qualquer página fora deste módulo.

---

## 11. Pendências (ordem real)

1. **Schema `ponto_registro` + `jornada_funcionario`** — desbloqueia tirar os mocks. Terminal `ponto` é dono dessa SQL (ver `idemaq-modulo-ponto-CLAUDE-CODE.md`).
2. **Hook `usePonto`** (terminal `ponto`) — substitui `BATIDAS_MOCK` / `JORNADA_MOCK`. Expõe `bater(tipo, geo)`, `batidasDoDia(funcId)`, `bancoHoras(funcId)`.
3. **Trocar `bater` mock** em `CardPontoFuncionario.jsx` por chamada real (TODO já marcado no código).
4. **Trocar `OS_DO_DIA_MOCK` / `AVISOS_MOCK` / `DESEMPENHO_MOCK`** em `PainelFuncionario.jsx` por queries reais. Demanda: hook que filtra OS por papel/funcionário + tabela `aviso` (ainda não existe).
5. **Diferenciação por papel** (Alessandro = paradas do dia, Guilherme = checklist de oficina) — quando puder puxar dados reais.
6. **Geolocalização real** (terminal `ponto`) — trocar `capturarLocalizacaoMock` por `navigator.geolocation`.

---

## 12. Interseções com outras áreas

- **Ponto**: módulo todo é a fonte de verdade do card de ponto. Ver `contexto-ponto.md` e `idemaq-modulo-ponto-CLAUDE-CODE.md`.
- **OS**: fonte das "Minhas OS de hoje". Ver `contexto-os.md`.
- **Logística**: futuras "paradas do dia" do Alessandro. Ver `contexto-logistica.md`.
- **Painel (dono)**: roteamento bifurca em `PainelPorPerfil`. Ver `contexto-painel.md`.
