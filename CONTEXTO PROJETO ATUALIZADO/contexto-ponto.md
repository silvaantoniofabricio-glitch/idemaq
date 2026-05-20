# Contexto — Relógio de Ponto

> Doc vivo do terminal `ponto`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.
>
> **Especificação completa**: `CONTEXTO PROJETO ATUALIZADO/idemaq-modulo-ponto-CLAUDE-CODE.md` (17 seções, ~22KB). **LER ANTES de codar.**

---

## 1. Status atual

🟡 **Não implementado**. Especificação completa disponível em `idemaq-modulo-ponto-CLAUDE-CODE.md` no diretório raiz da pasta de contexto.

---

## 2. Resumo executivo

### O que o módulo faz
Sistema de relógio de ponto para os **2 funcionários** (Alessandro + Guilherme).

**Dono (Toni) NÃO bate ponto.**

### Pilares
- **2 tabelas novas**: `ponto_registro` + `jornada_funcionario`
- **RLS por usuário** — cada funcionário só vê o próprio
- **Geolocalização obrigatória** ao bater (sem selfie — decidido pro Toni evitar fricção)
- **Painel diferente pros funcionários** — substitui o slot Financeiro que eles não veem
- **Relatório só pro dono** em Relatórios → Relógio de Ponto
- **Banco de horas** com saldo positivo/negativo
- **Falta automática** se não bater no dia útil

---

## 3. Tabelas (schema parte 2 — pendente aplicar)

### `ponto_registro`
- `id uuid` PK
- `funcionario_id uuid` FK → `usuarios.id`
- `tipo` enum: `entrada | saida_almoco | volta_almoco | saida`
- `bateu_em timestamptz` (UTC)
- `lat numeric`, `lng numeric` (geolocalização obrigatória)
- `endereco_aproximado text` (reverse geocoding opcional)
- `observacao text`
- Soft-delete + auditoria

### `jornada_funcionario`
- `id uuid` PK
- `funcionario_id uuid` FK → `usuarios.id`
- `dia date`
- `entrada timestamptz`, `saida_almoco timestamptz`, `volta_almoco timestamptz`, `saida timestamptz`
- `total_horas_trabalhadas interval` (calculado)
- `total_horas_almoco interval` (calculado)
- `saldo_horas interval` (vs jornada padrão)
- `status` enum: `presente | falta | falta_justificada | feriado`
- 1 linha por funcionário/dia

### RLS
- Funcionário só vê/edita os próprios registros
- Dono vê tudo

---

## 4. Componentes (a criar)

- `src/components/ponto/` (pasta nova)
  - `BotaoBaterPonto.jsx` — botão principal grande
  - `ResumoDia.jsx` — entrada/almoço/volta/saída do dia atual
  - `SaldoBancoHoras.jsx` — saldo positivo/negativo
  - `HistoricoSemana.jsx` — últimos 7 dias
- `src/components/paineis/PainelFuncionario.jsx` — painel novo dos funcionários (substitui slot Financeiro)

---

## 5. Geolocalização (obrigatória)

- Navigator API ao clicar em "Bater ponto"
- Se usuário negar permissão → erro bloqueia bater
- Lat/lng salvos em `ponto_registro.lat/lng`
- Opcional: reverse geocoding pra `endereco_aproximado` (Google Maps API — pago)
- Validação: tolerância de raio da empresa (config futuro)

**Sem selfie** — decisão do dono: fricção alta, foto não ajuda muito (Alessandro/Guilherme são confiáveis).

---

## 6. Falta automática

- Cronjob (Supabase Edge Functions ou trigger temporal) roda 23h de cada dia útil
- Cria linha em `jornada_funcionario` com `status = falta` se não houver `ponto_registro` daquele dia
- Considera feriados (nacionais + municipais de Naviraí/MS)

---

## 7. Banco de horas

- Jornada padrão: 8h/dia (configurável)
- Saldo = (horas trabalhadas) − (jornada padrão)
- Positivo = funcionário fez hora extra (a compensar/pagar)
- Negativo = funcionário deve horas

Mostrado no `SaldoBancoHoras.jsx` do painel do funcionário.

---

## 8. Painel do funcionário (substitui Financeiro)

**Item de menu "Financeiro" some pro funcionário** (já some — admin-only). No lugar, aparece "Meu Ponto" ou similar.

`PainelFuncionario.jsx`:
- Botão "Bater ponto" enorme (CTA principal)
- Status do dia: entrada feita? almoço? saída?
- Saldo banco de horas
- Histórico da semana (7 dias)

Ver `contexto-painel-func.md`.

---

## 9. Relatório só pro dono

Em `Relatórios → Relógio de Ponto`:
- Por funcionário
- Por período (mês atual / mês anterior / custom)
- Horas trabalhadas, faltas, atrasos
- Saldo banco de horas
- Localização das batidas (mapa de calor opcional)

Ver `contexto-relatorios.md`.

---

## 10. Pendências (ordem — ler especificação completa primeiro)

1. **Ler `idemaq-modulo-ponto-CLAUDE-CODE.md` inteiro** antes de codar (17 seções, ~22KB)
2. Criar schema (2 tabelas + RLS + enums)
3. Hook `usePonto` (CRUD + saldo banco horas)
4. Componentes em `src/components/ponto/`
5. `PainelFuncionario.jsx` no `src/components/paineis/`
6. Roteamento no `App.jsx` (papel `dono` → Painel cheio; `logistica`/`oficina` → PainelFuncionario)
7. Cronjob de falta automática
8. Relatório no `Relatorios.jsx` (admin-only)

---

## 11. Interseções com outras áreas

- **Painel Funcionários**: substitui slot Financeiro. Ver `contexto-painel-func.md`
- **Relatórios**: relatório de Ponto (admin-only). Ver `contexto-relatorios.md`
- **Geral / cross-area**: schema parte 2 (2 tabelas novas + RLS por usuário). Ver `contexto-geral.md`
