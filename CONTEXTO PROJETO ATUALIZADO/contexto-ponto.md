# Contexto — Relógio de Ponto

> Doc vivo do terminal `ponto`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.
>
> **Especificação completa**: `idemaq-modulo-ponto-CLAUDE-CODE.md` na raiz do projeto (17 seções, ~22KB). **LER ANTES de codar.**

---

## 1. Status atual

🟡 **Fundação pronta — aguardando deploy do SQL**.
- Schema (`sql/09-ponto-schema.sql`) versionado e pronto pra rodar no Supabase.
- Hook `usePonto` criado com CRUD, geolocalização, agregação por janela e modo demo automático (fallback quando tabela não existe).
- Componentes do painel do funcionário criados: `BotaoBaterPonto`, `CardPontoFuncionario`, `ResumoDia`, `SaldoBancoHoras`, `HistoricoSemana`, `EspelhoPonto`, `MapaDeBatidas`, `RelatorioPontoDono`, `ConfigJornadaModal`.
- **Pendente**: criar `PainelFuncionario.jsx` que orquestra esses componentes + roteamento no `App.jsx`.

---

## 2. Resumo executivo

### O que o módulo faz
Sistema de relógio de ponto para os **2 funcionários** (Alessandro + Guilherme).

**Dono (Toni) NÃO bate ponto.**

### Pilares
- **2 tabelas novas**: `ponto_registro` + `jornada_funcionario` (aplicado via sql/09)
- **RLS por usuário** — cada funcionário só vê o próprio
- **Geolocalização obrigatória** ao bater (sem selfie — decidido pro Toni evitar fricção)
- **Painel diferente pros funcionários** — substitui o slot Financeiro que eles não veem
- **Relatório só pro dono** em Relatórios → Relógio de Ponto
- **Banco de horas** com saldo positivo/negativo
- **Falta automática** se não bater no dia útil

---

## 3. Tabelas (schema parte 2 — versionado, NÃO aplicado ainda)

> Arquivo SQL: `sql/09-ponto-schema.sql`. **Pendente: Toni rodar no Supabase SQL Editor.**

### `ponto_registro`
- `id uuid` PK
- `funcionario_id uuid` FK → `usuarios.id`
- `tipo` enum `ponto_tipo`: `entrada | saida_almoco | volta_almoco | saida`
- `bateu_em timestamptz` (default `now()` — front NÃO envia, evita batida retroativa)
- `lat numeric(10,7)`, `lng numeric(10,7)` (nullable no banco, mas regra de negócio do front EXIGE)
- `endereco_aproximado text` (reverse geocoding opcional)
- `observacao text`
- Soft-delete + auditoria padrão (`tg_set_audit`)

### `jornada_funcionario`
- `id uuid` PK
- `funcionario_id uuid` FK → `usuarios.id`
- `dia date`
- `entrada / saida_almoco / volta_almoco / saida timestamptz` (podem ser nulos)
- `total_horas_trabalhadas / total_horas_almoco / saldo_horas` em `interval` (suporta saldo negativo)
- `status` enum `jornada_status`: `presente | falta | falta_justificada | feriado`
- `UNIQUE(funcionario_id, dia)` → 1 linha por dia
- Soft-delete + auditoria padrão

### RLS
- `ponto_registro`: SELECT/INSERT → próprio funcionário (`auth.uid() = funcionario_id`) ou dono. UPDATE/DELETE → só dono.
- `jornada_funcionario`: SELECT → próprio ou dono. INSERT/UPDATE/DELETE → só dono.

### Dependências do SQL
Funções já existentes no banco (criadas em rounds anteriores):
- `tg_set_audit()` — preenche criado_em/por/atualizado_em/por
- `is_dono()` — retorna true se `auth.uid()` é o dono
- `papel_atual()` — retorna 'dono'|'logistica'|'oficina'

Se alguma faltar ao aplicar sql/09, comentar a seção 5 (RLS) e rodar depois.

---

## 4. Hook `usePonto` — `src/hooks/usePonto.js`

API:
```js
const {
  batidas, batidasHoje, jornadas,
  ultima, prox,                    // próxima batida esperada (string ou null)
  minutosTrabHoje,
  saldoBancoMin,                   // saldo banco de horas em minutos (pode ser negativo)
  loading, tabelaAusente, erro,
  bater,                           // async ({ tipo, observacao }) — captura geo + insert
  recarregar,
} = usePonto({ funcionarioId, escopo: 'hoje'|'semana'|'mes'|'custom', ano, mes, dataInicio, dataFim })
```

- **Fallback automático**: enquanto `sql/09` não rodar, `tabelaAusente: true` e `bater()` retorna `{ error: { code: 'OFFLINE' } }`. UI fica em modo demo (usa `_mocks.js`).
- **Realtime**: assina canal de `ponto_registro` — novas batidas atualizam a UI sem reload.
- **`bater()`**: chama `capturarGeolocalizacao()` antes do insert. Se permissão negada, propaga `Error` pra UI bloquear.
- Helpers exportados: `proximoTipo(ultima)`, `minutosTrabalhados(batidas)`, `saldoBancoMinutos(batidas)`, `capturarGeolocalizacao()`.

---

## 5. Componentes

### Já criados em `src/components/ponto/`

- **`BotaoBaterPonto.jsx`** — CTA grande, visual muda conforme `proximoTipo`. Captura geolocalização (mock no MVP visual; troca pra real ao plugar `usePonto.bater`).
- **`CardPontoFuncionario.jsx`** — card destaque do painel-func: header + status + botão + footer (Hoje + banco). Hoje usa state local; futuro plugado em `usePonto`.
- **`ResumoDia.jsx`** ✨ — strip horizontal com as 4 batidas do dia + destaque na próxima.
- **`SaldoBancoHoras.jsx`** ✨ — card grande de saldo (positivo azul / negativo vermelho), ícone redundante pra Deutan.
- **`HistoricoSemana.jsx`** ✨ — lista compacta dos últimos 7 dias com status (ok/atraso/extra/falta/fds/parcial).
- **`EspelhoPonto.jsx`** — tabela mensal de batidas com badges de status.
- **`MapaDeBatidas.jsx`** — placeholder do mapa + lista de batidas do dia com botão "abrir rota no Maps".
- **`RelatorioPontoDono.jsx`** — dashboard completo com 6 abas (Visão geral, Espelhos, Mapa, Produtividade, Ajustes, Configurações).
- **`ConfigJornadaModal.jsx`** — modal pra dono configurar jornada de cada funcionário.

### Ainda a criar

- **`src/components/paineis/PainelFuncionario.jsx`** — orquestra os componentes acima no painel do funcionário (substitui o slot Financeiro).
- Roteamento no `App.jsx`: papel `dono` → painel atual; `logistica`/`oficina` → `PainelFuncionario`.
- Cronjob de falta automática (Supabase Edge Function 23h).

---

## 6. Convenção de nomenclatura (decisão 20/05/2026)

Decidido alinhar os tipos da batida e os campos com o jeito mais natural pro funcionário:

| Campo de tabela | Tipo enum    | Significado          |
|-----------------|--------------|----------------------|
| `bateu_em`      | —            | timestamp da batida  |
| `lat` / `lng`   | —            | geolocalização       |
| `endereco_aproximado` | —      | reverse geocoding    |
| `tipo`          | `entrada`        | chegou pra trabalhar |
| `tipo`          | `saida_almoco`   | saiu pro almoço      |
| `tipo`          | `volta_almoco`   | voltou do almoço     |
| `tipo`          | `saida`          | fim de expediente    |

**Por que esses nomes**: "saiu pro almoço" / "voltou do almoço" lê mais natural que "almoço início" / "almoço fim". E `bateu_em` é mais explícito que `data_hora` no contexto de relógio de ponto.

> Spec em `idemaq-modulo-ponto-CLAUDE-CODE.md` ainda menciona `almoco_inicio`/`almoco_fim`/`data_hora` — desconsiderar; nomenclatura nova vale.

---

## 7. Geolocalização (obrigatória)

- Navigator API ao clicar em "Bater ponto" (`capturarGeolocalizacao()` em `usePonto.js`)
- Se usuário negar permissão → erro bloqueia bater
- `lat`/`lng` salvos em `ponto_registro`
- Opcional: reverse geocoding pra `endereco_aproximado` (Google Maps API — pago, futuro)
- Validação: tolerância de raio da empresa (config futuro)

**Sem selfie** — decisão do dono: fricção alta, foto não ajuda muito (Alessandro/Guilherme são confiáveis).

---

## 8. Falta automática

- Cronjob (Supabase Edge Functions ou trigger temporal) roda 23h de cada dia útil
- Cria linha em `jornada_funcionario` com `status = falta` se não houver `ponto_registro` daquele dia
- Considera feriados (nacionais + municipais de Naviraí/MS)

---

## 9. Banco de horas

- Jornada padrão: 8h/dia (480 min — hardcoded em `usePonto.JORNADA_PADRAO_MIN`, futuro vira config por funcionário)
- Saldo = (horas trabalhadas) − (jornada padrão)
- Positivo = funcionário fez hora extra (a compensar/pagar)
- Negativo = funcionário deve horas
- `SaldoBancoHoras` reforça com ícone (`ti-trending-up` / `ti-trending-down`) pra acessibilidade Deutan

---

## 10. Painel do funcionário (substitui Financeiro)

**Item de menu "Financeiro" some pro funcionário** (já some — admin-only). No lugar, aparece "Meu Ponto" ou similar.

`PainelFuncionario.jsx` (ainda a criar):
- `CardPontoFuncionario` com botão grande (CTA principal)
- `ResumoDia` com as 4 batidas
- `SaldoBancoHoras`
- `HistoricoSemana`

Ver `contexto-painel-func.md`.

---

## 11. Relatório só pro dono

Em `Relatórios → Relógio de Ponto` (`RelatorioPontoDono.jsx`):
- Por funcionário
- Por período (mês atual / mês anterior / custom)
- Horas trabalhadas, faltas, atrasos
- Saldo banco de horas
- Localização das batidas (mapa de calor opcional)

Ver `contexto-relatorios.md`.

---

## 12. Pendências (próxima sessão)

1. **Toni roda `sql/09-ponto-schema.sql` no Supabase SQL Editor** (ação fora do code)
2. Criar `src/components/paineis/PainelFuncionario.jsx` orquestrando os componentes
3. Plugar `usePonto.bater` no `BotaoBaterPonto` (hoje usa mock visual)
4. Trocar `BATIDAS_MOCK` por dados reais em `CardPontoFuncionario` / `EspelhoPonto`
5. Roteamento no `App.jsx`: `dono` → painel atual; `logistica`/`oficina` → `PainelFuncionario`
6. Cronjob de falta automática (Edge Function)
7. Adicionar item "Relógio de Ponto" no menu Relatórios (admin-only)

---

## 13. Interseções com outras áreas

- **Painel Funcionários**: substitui slot Financeiro. Ver `contexto-painel-func.md`
- **Relatórios**: relatório de Ponto (admin-only). Ver `contexto-relatorios.md`
- **Geral / cross-area**: schema parte 2 (2 tabelas novas + RLS por usuário). Ver `CLAUDE.md` seção 11

---

## 14. Log da sessão 20/05/2026 — terminal `ponto`

**Commit**: `4e19b7d feat(ponto): schema parte 2 + hook usePonto + componentes do painel-func`

### O que foi entregue
- ✅ `sql/09-ponto-schema.sql` (versionado, **NÃO aplicado**) — 2 tabelas + 2 enums + 4 índices + 4 policies RLS + 2 triggers de auditoria.
- ✅ `src/hooks/usePonto.js` — hook completo (CRUD, geo, agregação, Realtime, fallback demo).
- ✅ Componentes novos: `ResumoDia.jsx`, `SaldoBancoHoras.jsx`, `HistoricoSemana.jsx`.
- ✅ Realinhamento da nomenclatura: `_mocks.js` + `BotaoBaterPonto`, `CardPontoFuncionario`, `EspelhoPonto`, `MapaDeBatidas`, `RelatorioPontoDono` migrados de `data_hora/latitude/longitude/endereco/almoco_inicio/almoco_fim` para `bateu_em/lat/lng/endereco_aproximado/saida_almoco/volta_almoco`.
- ✅ Build local validado (`vite build` em 237ms, 187 módulos).

### Decisões dessa sessão
1. **Nomenclatura** dos tipos da batida: `entrada | saida_almoco | volta_almoco | saida` (em vez do que estava na spec `almoco_inicio`/`almoco_fim`). Motivo: lê mais natural pro funcionário, e o user pediu explicitamente.
2. **`bateu_em` em vez de `data_hora`** — mais explícito no contexto de relógio de ponto.
3. **`bateu_em` é preenchido pelo servidor** (DEFAULT `now()`) — front NÃO envia, pra evitar batida retroativa.
4. **`lat`/`lng` nullable no banco** mas obrigatórios pela regra do front — só ficam nullable pra permitir ajuste manual do dono.
5. **`jornada_funcionario` é o agregado diário** (1 linha por funcionário/dia, não 1 linha de config por funcionário — a config padrão fica como constante no hook por enquanto, vira tabela `config_jornada` se precisar).
6. **Saldo banco de horas calculado client-side por enquanto**: hook soma minutos trabalhados de cada dia (do `ponto_registro`) menos jornada padrão (480 min). Quando trigger consolidar `jornada_funcionario.saldo_horas`, hook passa a ler dali.

### Por que sql/09 ainda não rodou
A regra do projeto é que o terminal só versiona SQL — o Toni roda no Supabase SQL Editor manualmente. Próxima sessão `geral` ou Toni mesmo aplica `sql/09-ponto-schema.sql`.

### Próximos passos exatos (ordem)
1. Toni roda `sql/09-ponto-schema.sql` no Supabase. Conferir RLS funcionando (logar como funcionário e tentar SELECT — deve ver só os próprios).
2. Criar `src/components/paineis/PainelFuncionario.jsx` chamando `usePonto({ funcionarioId: user.id })` + montando `CardPontoFuncionario` + `ResumoDia` + `SaldoBancoHoras` + `HistoricoSemana`.
3. No `App.jsx`, rotear painel: papel `dono` → painel atual; `logistica`/`oficina` → `PainelFuncionario`.
4. Trocar mock visual do `BotaoBaterPonto` por chamada real ao `usePonto.bater()` (já tem fallback).
5. Trocar `BATIDAS_MOCK` por dados reais nos componentes existentes (`CardPontoFuncionario` / `EspelhoPonto` / `RelatorioPontoDono` / `MapaDeBatidas`).

### Anti-patterns que evitei nesta sessão
- ❌ Não mexi em `CLAUDE.md` (outro terminal estava atualizando).
- ❌ Não mexi em `App.jsx`, `BottomNav.jsx`, `Sidebar.jsx`, `Painel.jsx`, `sql/10-configuracoes.sql`, `Configuracoes.jsx`, `useConfiguracoes.js` (outro terminal `geral`).
- ❌ Não usei `git add -A` — fiz git add explícito só dos 12 arquivos do escopo.
- ❌ Não criei `useGeolocalizacao` hook separado — coloquei `capturarGeolocalizacao()` exportado dentro do `usePonto.js` (escopo era só esse hook).
