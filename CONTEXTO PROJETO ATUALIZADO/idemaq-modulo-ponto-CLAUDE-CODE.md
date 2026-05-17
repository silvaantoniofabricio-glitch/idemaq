# IDEMAQ — Módulo Relógio de Ponto
## Contexto e plano de execução para Claude Code

> **Atenção Claude Code:** Este documento é a especificação completa do módulo de Relógio de Ponto da IDEMAQ. Leia até o final antes de começar. Siga a ordem do checklist. Não invente funcionalidades fora do escopo. Não mexa em arquivos não listados sem antes pedir confirmação ao dono.

---

## 1. Resumo executivo

Criar um módulo de **Relógio de Ponto** integrado ao sistema IDEMAQ que:

- Permita aos funcionários (Func1 e Func2) bater entrada/almoço/volta/saída
- Capture geolocalização (lat/long) em toda batida
- NÃO use selfie (decisão do dono — equipe de 2 pessoas, confiança)
- Mostre card de ponto no **painel inicial dos funcionários** (substituindo o painel financeiro que eles não devem ver)
- Crie um **Relatório de Ponto** dentro do módulo de Relatórios, acessível **apenas ao dono**
- NÃO altere o painel inicial do dono (continua como está)
- O dono **NÃO bate ponto** (controle livre)

---

## 2. Decisões já tomadas pelo dono (não revisar)

| Tópico | Decisão |
|---|---|
| Geolocalização | **OBRIGATÓRIA** em toda batida |
| Selfie | **NÃO usar** |
| Dono bate ponto? | **NÃO** — controle livre |
| Painel do dono | **NÃO alterar** — fica como está |
| Painel dos funcionários | **Criar do zero** — só informações úteis pro trabalho deles + card de ponto |
| Funcionários veem financeiro? | **NÃO, nunca** |
| Funcionários veem ponto do colega? | **NÃO** |
| Onde dono acessa o ponto? | Dentro de Relatórios → "Relógio de Ponto" |
| Banco de horas | Ativo, configurável on/off por funcionário |
| Falta automática | Sim, 2h após horário de entrada sem batida |
| Edição de batidas | Só o dono, sempre auditada (campo `ajuste_manual: true`) |

---

## 3. Estrutura de banco — 2 tabelas novas no Supabase

### Tabela `ponto_registro`

```sql
create table public.ponto_registro (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','almoco_inicio','almoco_fim','saida')),
  data_hora timestamptz not null default now(),
  latitude numeric(10,7),
  longitude numeric(10,7),
  endereco text,
  dispositivo text,
  ip text,
  observacao text,
  ajuste_manual boolean not null default false,
  aprovado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_ponto_funcionario_data on public.ponto_registro(funcionario_id, data_hora desc);
create index idx_ponto_data on public.ponto_registro(data_hora desc);
```

### Tabela `jornada_funcionario`

```sql
create table public.jornada_funcionario (
  funcionario_id uuid primary key references auth.users(id) on delete cascade,
  entrada_padrao time not null default '07:30',
  saida_padrao time not null default '17:30',
  almoco_inicio_padrao time not null default '12:00',
  almoco_fim_padrao time not null default '13:30',
  carga_diaria_horas numeric(4,2) not null default 8.0,
  dias_trabalho text[] not null default array['seg','ter','qua','qui','sex'],
  tolerancia_min int not null default 10,
  banco_horas_ativo boolean not null default true,
  banco_horas_saldo numeric(6,2) not null default 0,
  raio_batida_km numeric(5,2) default 50,
  ativo boolean not null default true,
  updated_at timestamptz not null default now()
);
```

### RLS — Row Level Security (CRÍTICO)

```sql
-- ponto_registro
alter table public.ponto_registro enable row level security;

-- Funcionário vê e cria SÓ as próprias batidas
create policy "func_ve_proprio_ponto" on public.ponto_registro
  for select using (auth.uid() = funcionario_id);

create policy "func_bate_proprio_ponto" on public.ponto_registro
  for insert with check (auth.uid() = funcionario_id);

-- Dono (empresaidemaq@gmail.com) vê e edita tudo
create policy "dono_ve_tudo_ponto" on public.ponto_registro
  for all using (
    auth.jwt() ->> 'email' = 'empresaidemaq@gmail.com'
  );

-- jornada_funcionario
alter table public.jornada_funcionario enable row level security;

create policy "func_ve_propria_jornada" on public.jornada_funcionario
  for select using (auth.uid() = funcionario_id);

create policy "dono_gerencia_jornadas" on public.jornada_funcionario
  for all using (
    auth.jwt() ->> 'email' = 'empresaidemaq@gmail.com'
  );
```

### Seeds iniciais (após criar as tabelas)

```sql
-- Inserir jornada padrão para Func1 e Func2
-- (substituir os UUIDs pelos reais dos usuários no auth.users)
insert into public.jornada_funcionario (funcionario_id, entrada_padrao, saida_padrao)
select id, '07:30', '17:30'
from auth.users
where email in ('func1@idemaq.com', 'func2@idemaq.com')
on conflict (funcionario_id) do nothing;
```

---

## 4. Arquivos a criar / modificar

### CRIAR (novos arquivos)

```
src/
├── components/
│   ├── ponto/
│   │   ├── CardPontoFuncionario.jsx       ← Card de ponto no painel deles
│   │   ├── BotaoBaterPonto.jsx            ← Botão grande com geolocalização
│   │   ├── EspelhoPonto.jsx               ← Tabela mensal do próprio ponto
│   │   ├── RelatorioPontoDono.jsx         ← Dashboard completo (só dono)
│   │   ├── MapaDeBatidas.jsx              ← Pontos no Google Maps
│   │   └── ConfigJornadaModal.jsx         ← Configurar jornada de cada func
│   └── paineis/
│       └── PainelFuncionario.jsx          ← Painel inicial NOVO dos funcs
├── hooks/
│   ├── useGeolocalizacao.js               ← Hook pra capturar lat/long
│   └── usePontoAtual.js                   ← Hook pra estado atual do ponto
└── utils/
    ├── pontoCalculos.js                   ← Horas extras, banco, atrasos
    └── feriadosNavirai.js                 ← (se ainda não existir)
```

### MODIFICAR (arquivos existentes)

```
src/
├── App.jsx                                 ← Rotear painel certo por perfil
├── components/
│   └── Relatorios.jsx (ou equivalente)    ← Adicionar item "Relógio de Ponto"
```

---

## 5. Lógica de roteamento do painel inicial

No `App.jsx`, ao detectar o perfil logado:

```javascript
// Pseudocódigo — adaptar pra estrutura real
const email = user?.email;
const isDono = email === 'empresaidemaq@gmail.com';

if (isDono) {
  // Renderiza PainelDono (atual, sem alterações)
  return <PainelDono T={T} dark={dark} />;
} else {
  // Renderiza PainelFuncionario (novo, do zero)
  return <PainelFuncionario T={T} dark={dark} user={user} />;
}
```

---

## 6. Especificação do `PainelFuncionario.jsx` (novo, do zero)

Layout vertical em cards, mobile-first (funcionários usam celular):

```
┌─────────────────────────────────────┐
│  Olá, Func1 👋                       │
│  Naviraí · Segunda, 18 de Maio       │
├─────────────────────────────────────┤
│                                     │
│  [CARD DE PONTO — destaque]         │
│                                     │
├─────────────────────────────────────┤
│  📋 Minhas OS de hoje                │
│  • OS #1247 — Agendada 14:00         │
│  • OS #1245 — Em diagnóstico         │
├─────────────────────────────────────┤
│  📢 Avisos                           │
│  • Reunião terça 8h                  │
│  • Estoque de mangueira no mínimo    │
├─────────────────────────────────────┤
│  📊 Meu desempenho do mês            │
│  OS concluídas: 18                   │
│  Tempo médio: 3h22                   │
└─────────────────────────────────────┘
```

**REGRA:** Nada de R$, faturamento, lucro, despesas, caixa, financeiro. **NUNCA.**

---

## 7. Especificação do `CardPontoFuncionario.jsx`

Estado visual conforme situação atual:

```
┌─────────────────────────────────────┐
│  🕐 Meu Ponto                        │
│                                     │
│  Status: Trabalhando há 4h12min     │
│  Entrada: 07:58 · Oficina Idemaq    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   ☕  INICIAR ALMOÇO         │    │
│  │       (botão grande)         │    │
│  └─────────────────────────────┘    │
│                                     │
│  Hoje: 4h12min trabalhadas          │
│  Banco de horas: +3h30              │
│                                     │
│  [ Ver meu espelho de ponto → ]     │
└─────────────────────────────────────┘
```

### Estados possíveis do botão

| Última batida | Próxima batida | Cor botão | Ícone |
|---|---|---|---|
| Nenhuma hoje | **Bater entrada** | `#5B9BD5` azul | `ti ti-clock-play` |
| `entrada` | **Iniciar almoço** | `#FFD966` amarelo | `ti ti-coffee` |
| `almoco_inicio` | **Voltar do almoço** | `#5B9BD5` azul | `ti ti-clock-play` |
| `almoco_fim` | **Bater saída** | `#FF6B6B` vermelho | `ti ti-clock-stop` |
| `saida` | (desabilitado) "Expediente encerrado" | cinza | `ti ti-check` |

### Fluxo do clique no botão

1. Mostrar loading "Capturando localização..."
2. Chamar `useGeolocalizacao()` → `navigator.geolocation.getCurrentPosition`
3. Se negado: toast amarelo "Permita a localização pra bater ponto" e parar
4. Se OK: chamar reverse geocoding via Google Maps Places (já configurado no projeto)
5. Inserir registro em `ponto_registro` via Supabase
6. Toast verde: "Entrada registrada às 07:58 · Naviraí/MS"
7. Atualizar estado local → botão muda automaticamente pro próximo

---

## 8. Especificação do `EspelhoPonto.jsx`

Tela acessada via link "Ver meu espelho de ponto" no card. Mostra mês atual com seletor de mês.

```
┌──────────────────────────────────────────────────┐
│  Meu Espelho de Ponto — Maio/2026                │
│  [ ← Mês anterior ]  [ Próximo mês → ]           │
├──────────────────────────────────────────────────┤
│  Horas trabalhadas: 168h30                       │
│  Horas extras: +4h15                             │
│  Atrasos: 2 (23min)  · Faltas: 0                 │
│  Banco de horas: +3h30                           │
├──────────────────────────────────────────────────┤
│  Dia │ Ent.  │ Alm.S │ Alm.V │ Saí.  │ Total    │
│ ─────┼───────┼───────┼───────┼───────┼──────────│
│  01  │ 07:58 │ 12:00 │ 13:30 │ 17:30 │ 8h00     │
│  02  │ 08:11 │ 12:05 │ 13:32 │ 17:30 │ 7h42 ⚠   │ ← atraso
│  03  │  —    │  —    │  —    │  —    │ Sábado   │
│  04  │  —    │  —    │  —    │  —    │ Domingo  │
│  05  │ 07:30 │ 12:00 │ 13:30 │ 18:45 │ 9h15 +1  │ ← extra
└──────────────────────────────────────────────────┘
```

### Paleta dos badges (Deutan, obrigatória)
- Hora extra: badge azul `#5B9BD5` com texto branco
- Atraso: badge amarela `#FFD966` com texto preto + ícone `ti ti-alert-triangle`
- Falta: badge vermelha `#FF6B6B` com texto branco + ícone `ti ti-x`
- Folga (fds/feriado): fundo cinza claro, texto cinza

---

## 9. Especificação do `RelatorioPontoDono.jsx` (acessível só pelo dono)

Acesso: **Relatórios → Relógio de Ponto**

Abas no topo:
1. **Visão geral** — quem está trabalhando agora, banco de horas consolidado, alertas
2. **Espelhos** — selecionar funcionário e mês, ver espelho completo
3. **Mapa de batidas** — Google Maps com pontos coloridos por funcionário
4. **Ponto × Produtividade** — cruzamento horas × OS (alimenta IA depois)
5. **Ajustes manuais** — editar batidas com justificativa
6. **Configurações de jornada** — link rápido pra `ConfigJornadaModal`

### Aba "Visão geral" — cards principais

```
┌─ Equipe agora ─────────────────────────┐
│  🟢 Func1 — Trabalhando há 4h12min      │
│     Entrada 07:58 · em rota             │
│                                         │
│  🟡 Func2 — Em almoço há 38min          │
│     Volta prevista 13:30                │
└─────────────────────────────────────────┘

┌─ Banco de horas ───────────────────────┐
│  Func1: +3h30  ·  Func2: -1h15          │
└─────────────────────────────────────────┘

┌─ Alertas hoje ─────────────────────────┐
│  ⚠ Func2 atrasou 11min na entrada       │
└─────────────────────────────────────────┘
```

---

## 10. Regras de negócio críticas

### Tolerância de atraso
- Configurável por funcionário (padrão 10min)
- Bateu até `entrada_padrao + tolerancia_min` → pontual
- Acima disso → conta como atraso (em minutos)

### Falta automática
- Job que roda a cada hora (ou trigger ao acessar painel do dono)
- Em dia útil do funcionário, se passou 2h do `entrada_padrao` sem nenhuma batida → marca como falta
- Cria notificação pro dono via Z-API (integração já planejada no projeto)

### Banco de horas
- Cada dia trabalhado: `saldo += (horas_trabalhadas - carga_diaria_horas)`
- Atualizado por trigger no Supabase ao inserir batida de saída
- Pode ser zerado manualmente pelo dono (com justificativa)

### Saída sem registro
- Se funcionário bate entrada mas não bate saída até 23h59 do mesmo dia
- Sistema fecha automaticamente no `saida_padrao`
- Marca como `ajuste_manual: true` e `observacao: "Saída não registrada — fechamento automático"`
- Alerta pro dono revisar

### Não pode bater ponto retroativo
- Funcionário só bate ponto AGORA
- Ajustes retroativos só pelo dono em "Ajustes manuais"

### Raio de batida (opcional, padrão 50km)
- Se `raio_batida_km` configurado, valida se a batida está dentro do raio da oficina
- Coordenadas da oficina: pegar do cadastro da empresa (ou hardcoded inicialmente: Naviraí/MS)
- Fora do raio: permite batida mas marca `observacao: "Fora do raio — Func a X km da oficina"`

---

## 11. Padrão visual — REGRAS OBRIGATÓRIAS

### Paleta Deutan (acessibilidade — dono é daltônico)
- Azul: `#5B9BD5`
- Amarelo: `#FFD966`
- Vermelho: `#FF6B6B`
- Azul claro: `#B8CCE4`
- **NUNCA usar vermelho/verde puros sem ícone ou texto auxiliar**

### Temas
- Componentes recebem prop `T` (objeto de cores) e `dark` (boolean)
- **Nunca usar cores hardcoded** — sempre via `T.bg`, `T.card`, `T.text`, `T.border`, etc.
- Cards que renderizam "container" devem ter `className="idemaq-card"` pra pegar sombra no light mode

### Ícones
- **Sempre Tabler Icons** via classe (ex: `ti ti-clock-play`)
- CDN já configurado no `index.css`

### Padrão de filtros (botões, abas, chips)
- Ativo: azul `T.blue` (dark) ou `T.blueDark` (light), fundo `'#0d2035'` (dark) ou `'#e6f1fb'` (light)
- Inativo: `T.textMuted`, borda `T.border`, fundo transparente

---

## 12. Hooks utilitários a criar

### `src/hooks/useGeolocalizacao.js`

```javascript
import { useState } from 'react';

export function useGeolocalizacao() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  async function capturar() {
    setLoading(true);
    setErro(null);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setErro('Navegador não suporta geolocalização');
        setLoading(false);
        reject('sem suporte');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisao: pos.coords.accuracy,
          });
        },
        (err) => {
          setErro(err.message);
          setLoading(false);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  return { capturar, loading, erro };
}
```

### `src/hooks/usePontoAtual.js`

```javascript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // ajustar caminho

export function usePontoAtual(funcionarioId) {
  const [ultimaBatida, setUltimaBatida] = useState(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('ponto_registro')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .gte('data_hora', hoje.toISOString())
      .order('data_hora', { ascending: false })
      .limit(1);
    setUltimaBatida(data?.[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    if (funcionarioId) carregar();
  }, [funcionarioId]);

  function proximoTipo() {
    if (!ultimaBatida) return 'entrada';
    const mapa = {
      entrada: 'almoco_inicio',
      almoco_inicio: 'almoco_fim',
      almoco_fim: 'saida',
      saida: null, // expediente encerrado
    };
    return mapa[ultimaBatida.tipo];
  }

  return { ultimaBatida, proximoTipo, recarregar: carregar, loading };
}
```

---

## 13. Checklist de implementação — SEGUIR NESTA ORDEM

- [ ] **1.** Criar as 2 tabelas no Supabase via SQL Editor (rodar os blocos da seção 3)
- [ ] **2.** Aplicar as policies de RLS (seção 3)
- [ ] **3.** Inserir seeds das jornadas padrão (seção 3)
- [ ] **4.** Criar os 2 hooks: `useGeolocalizacao.js` e `usePontoAtual.js`
- [ ] **5.** Criar `utils/pontoCalculos.js` (funções: calcularAtraso, calcularHorasExtras, atualizarBancoHoras)
- [ ] **6.** Criar `BotaoBaterPonto.jsx` — testar isoladamente capturando geolocalização e inserindo no Supabase
- [ ] **7.** Criar `CardPontoFuncionario.jsx` — usar o botão + mostrar status atual
- [ ] **8.** Criar `PainelFuncionario.jsx` (do zero — sem nada de financeiro)
- [ ] **9.** Modificar `App.jsx` pra rotear painel certo conforme perfil logado
- [ ] **10.** Testar como Func1 e Func2 batendo ponto real
- [ ] **11.** Criar `EspelhoPonto.jsx` (visão mensal própria)
- [ ] **12.** Criar `RelatorioPontoDono.jsx` com abas (Visão geral, Espelhos, Mapa, etc.)
- [ ] **13.** Adicionar item "Relógio de Ponto" no menu de Relatórios
- [ ] **14.** Criar `MapaDeBatidas.jsx` integrando Google Maps Places
- [ ] **15.** Criar `ConfigJornadaModal.jsx` pra dono configurar jornada de cada func
- [ ] **16.** Implementar lógica de falta automática (job ou trigger)
- [ ] **17.** Testar fluxo completo end-to-end como dono e como funcionário

---

## 14. Critérios de aceite (como saber se ficou pronto)

### Como funcionário (Func1 ou Func2):
- [ ] Faço login e caio no PainelFuncionario (novo, sem financeiro)
- [ ] Vejo card de ponto em destaque com botão grande
- [ ] Clico em "Bater entrada" → navegador pede permissão de localização
- [ ] Após permitir, batida é registrada com timestamp e localização
- [ ] Toast verde confirma "Entrada registrada às HH:MM · Endereço"
- [ ] Botão muda automaticamente pra "Iniciar almoço"
- [ ] Consigo ver meu espelho de ponto do mês atual
- [ ] **NÃO vejo** ponto do colega
- [ ] **NÃO vejo** financeiro em lugar nenhum

### Como dono:
- [ ] Faço login e caio no painel ATUAL (sem mudança nenhuma)
- [ ] Não vejo card de ponto no painel principal
- [ ] Acesso Relatórios → "Relógio de Ponto"
- [ ] Vejo aba "Visão geral" com status atual de cada funcionário
- [ ] Consigo abrir espelho de qualquer funcionário
- [ ] Consigo ver mapa de batidas no Google Maps
- [ ] Consigo editar uma batida (com justificativa) e fica registrado como `ajuste_manual: true`
- [ ] Consigo configurar jornada de cada funcionário

---

## 15. O que NÃO fazer (escopo controlado)

- ❌ NÃO criar app nativo separado — sistema web responsivo é suficiente
- ❌ NÃO adicionar selfie/biometria/reconhecimento facial
- ❌ NÃO integrar com eSocial (porte da empresa não exige)
- ❌ NÃO mostrar financeiro pros funcionários (NUNCA, em nenhum lugar)
- ❌ NÃO criar card de ponto no painel do dono
- ❌ NÃO permitir funcionário bater ponto retroativo
- ❌ NÃO permitir funcionário ver ponto do colega
- ❌ NÃO mexer em arquivos do projeto além dos listados sem avisar antes
- ❌ NÃO fazer "pequenas melhorias" não pedidas em outras partes do sistema

---

## 16. Integrações futuras (não implementar agora, deixar preparado)

- **Z-API (WhatsApp):** webhook ao bater ponto pode notificar dono em casos críticos (atraso > 30min, falta)
- **n8n Cloud:** pode consumir eventos de ponto via webhook do Supabase
- **Claude API:** análise IA dos dados de produtividade cruzando ponto × OS (entra no relatório de funcionários do roadmap)

Não codar essas integrações agora — só deixar a estrutura de dados pronta pra consumir depois.

---

## 17. Em caso de dúvida

Se durante a implementação surgir alguma dúvida sobre regra de negócio, **PARAR e perguntar ao dono** antes de assumir qualquer coisa. As instruções do projeto IDEMAQ são claras: "Nunca criar funcionalidades, regras de negócio ou mudanças sem autorização explícita".

---

**Fim do documento. Boa execução! 🚀**
