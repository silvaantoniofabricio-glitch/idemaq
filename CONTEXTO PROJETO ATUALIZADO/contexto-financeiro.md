# Contexto — Financeiro

> Doc vivo do terminal `financeiro`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

🟡 **Mock reformulado Bling-style (17/05/2026 · commit `227af93`)** — visualmente pronto, falta banco.

### Decisões de negócio confirmadas (20/05/2026)
- ✅ **A Receber**: gerado ao concluir Entrega (receita real, não prevista no orçamento)
- ✅ **Caixa automático**: ao confirmar pagamento na OS, gera entrada no Caixa direto
- ✅ **Pagamento misto**: N lançamentos separados (1 por forma de pagamento)
- ✅ **Taxa da maquininha**: despesa automática em D+1 útil (pula FDS + feriados)

### O que está pronto (UI)
- Barra de filtros horizontal: período (5 presets + custom) · chips de status · busca · categoria · conta bancária · Limpar
- **Calendário no filtro**: `<input type="month">` mês específico OU dois `<input type="date">` intervalo livre; presets desativam quando custom selecionado
- KPI strip compacta: Total · Vencidas · Hoje · Pago
- Tabela real com colunas ordenáveis + checkbox por linha + menu ⋯ (Receber/Pagar · Editar · Duplicar · Excluir)
- Bulk action bar flutuante pra recebimento/pagamento em lote
- **Caixa**: saldo running por linha
- Tabs com badge contador
- `LancamentoDetalheModal` (3 tipos: receber/pagar/caixa) com baixa/excluir e **confirmação anti-clique-acidental** ([Voltar] no rodapé)
- Visão geral

### O que falta
- **Schema parte 2 pendente** — SQL pronto em `sql/01-lancamento-financeiro.sql` (lancamento_financeiro + categoria_financeira + conta_bancaria + 4 ENUMs)
- Hook `useFinanceiro` ainda consome mock
- Conexão real com tabela

---

## 2. Pendências (ordem)

1. **Rodar `sql/01-lancamento-financeiro.sql` no Supabase** (cria 3 tabelas + 4 enums)
2. **Criar `src/utils/financeiro.js`** com função `calcularD1Util()`
3. **Criar hook `useFinanceiro`** (CRUD + soft-delete)
4. **Ligar `FinanceiroPage` ao hook real** (substituir mocks)
5. **Ligar `LancamentoDetalheModal` ao Supabase** (baixa, excluir, criar)
6. **Criar `NovoLancamentoModal`** (avulso/parcelado/recorrente)
7. **Integração OS → Financeiro**: Entrega → A Receber, Pagamento → Caixa + Taxa

---

## 3. Schema parte 2 — Financeiro (pendente aplicar)

SQL em `sql/01-lancamento-financeiro.sql`.

### `lancamento_financeiro`
- `id uuid` PK
- `tipo` enum: `receber | pagar | caixa`
- `valor numeric(10,2)`
- `vencimento timestamptz`, `pago_em timestamptz`
- `status` enum
- `categoria_id uuid` FK
- `conta_id uuid` FK
- `os_id uuid` FK (NULL se avulso)
- `descricao` text
- Recorrência: `parcela_id uuid` (ID único da compra parcelada — gera parcelas anteriores e futuras), `recorrente_id uuid`, `dia_recorrencia int`
- Soft-delete + auditoria

### `categoria_financeira`
- Receitas: Limpeza, Manutenção, Peças, Venda de máquinas, Taxa diagnóstico, Outros
- Despesas: Funcionários, Peças ML, Tráfego pago, Impostos, Financiamento, Luz/água/internet, Combustível, Ferramentas, Materiais de limpeza

### `conta_bancaria`
- Bancos: Cresol · Bradesco · Mercado Pago
- Cartões: Elo Grafite · Bradesco Visa · Mercado Pago · Bradesco PJ · Cresol · Nubank PJ · Inter

---

## 4. Padrão visual Bling-style (obrigatório)

Decisão do dono: páginas financeiras seguem padrão Bling, não estilo Conta Azul puro.

- **Filtros horizontais** no topo (não em sidebar)
- **KPI strip compacta** (não cards gigantes)
- **Tabela densa** (não cards grandes por linha)
- **Bulk action bar flutuante** quando há checkbox selecionado
- **Menu ⋯** por linha pra ações
- **Caixa com saldo running** por linha (não totais separados)

Aplica-se a: Visão geral, Receber, Pagar, Caixa.

---

### 4.5. Regra do D+1 útil (pula fins de semana E feriados)

**Regra confirmada com as maquininhas:**
- InfinitePay D+1: usa calendário de feriados bancários
- Ton Black D+1: vendas em feriados ou fins de semana são pagas no dia útil subsequente

**Exemplos:**
| Pagamento | Taxa cai |
|---|---|
| Segunda | Terça |
| Sexta | Segunda (pula sáb/dom) |
| Sábado | Segunda |
| Feriado quinta | Sexta (ou segunda se sexta for feriado) |

**Função helper em `src/utils/financeiro.js`:**

```javascript
/**
 * Calcula D+1 útil (pula fins de semana E feriados bancários)
 * @param {Date} data - Data base (pagamento)
 * @returns {Date} - Data D+1 útil
 */
export function calcularD1Util(data) {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + 1); // +1 dia

  // Pula fins de semana
  let diaSemana = resultado.getDay(); // 0=dom, 6=sáb
  if (diaSemana === 0) {
    resultado.setDate(resultado.getDate() + 1); // Dom → Seg
  } else if (diaSemana === 6) {
    resultado.setDate(resultado.getDate() + 2); // Sáb → Seg
  }

  // Pula feriados bancários
  while (ehFeriadoBancario(resultado)) {
    resultado.setDate(resultado.getDate() + 1);
    // Se cair em FDS, pula de novo
    diaSemana = resultado.getDay();
    if (diaSemana === 0) resultado.setDate(resultado.getDate() + 1);
    else if (diaSemana === 6) resultado.setDate(resultado.getDate() + 2);
  }

  return resultado;
}

/**
 * Verifica se a data é feriado bancário nacional
 * TODO: migrar pra tabela `configuracoes` no Módulo 09
 */
function ehFeriadoBancario(data) {
  const dia = data.getDate();
  const mes = data.getMonth() + 1; // 1-12

  // Feriados fixos
  const feriadosFixos = [
    '01/01', // Ano Novo
    '21/04', // Tiradentes
    '01/05', // Dia do Trabalho
    '07/09', // Independência
    '12/10', // Nossa Senhora Aparecida
    '02/11', // Finados
    '15/11', // Proclamação da República
    '20/11', // Consciência Negra (nacional desde 2024)
    '25/12', // Natal
  ];

  const dataStr = `${dia.toString().padStart(2,'0')}/${mes.toString().padStart(2,'0')}`;
  if (feriadosFixos.includes(dataStr)) return true;

  // Feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi)
  // TODO: calcular via algoritmo ou tabela

  return false;
}
```

**Versão futura (Módulo 09):**
- Ler feriados da tabela `configuracoes`
- Incluir feriados municipais de Naviraí (06/11 Aniversário da cidade)

---

## 5. Lançamentos — 3 tipos

### Avulso
- 1 lançamento individual
- Vence numa data específica
- Pode ser receita ou despesa

### Parcelado
- ID único por compra (`parcela_id`)
- Gera parcelas anteriores E futuras automaticamente
- Editar 1 parcela ≠ editar todas (decisão por parcela ou pelo grupo)

### Recorrente
- Dia configurável (`dia_recorrencia int`)
- Gera próximas mensalidades automaticamente
- Ex: luz/água/internet, salário fixo

---

## 6. Fluxo de baixa

```
Contas a receber → baixa → Caixa
Contas a pagar   → baixa → Caixa
```

- **Caixa = só movimentações confirmadas, sem edição**
- Caixa: só visualizar e excluir (sem editar lançamentos confirmados)
- Pra editar valor/data: tem que estornar a baixa antes

---

## 7. Maquininhas e taxas

### InfinitePay D+1 (padrão da casa)
- PIX: 0%
- Débito: 1,37%
- 1x: 3,15%
- 12x: 12,40%
- **Link 1x: 4,20%** ← sempre usar este pra links de pagamento

### Ton Black D+1
- Débito: 1,36%
- 1x: 3,14%
- 12x: 12,39%
- **Link Ton = 30 dias — NUNCA usar pra Idemaq** (inviável)

### Pagamento misto
- Permitido na mesma OS: PIX + cartão + a prazo
- Total lançado deve bater exatamente com total da OS
- Cartão: selecionar maquininha + modalidade (débito / 1x a 12x) → taxa calculada → valor líquido exibido

---

## 8. Inadimplência

Alertas configuráveis:
- D+1, D+5, D+15
- Depois: 5º e 10º dia útil de cada mês

Cliente inadimplente aparece no Painel (alertas críticos) e em Relatórios (Vendas/DRE).

---

## 9. Meta diária

- Dias úteis restantes (exclui fins de semana + feriados nacionais + municipais configuráveis)
- Naviraí/MS tem feriado municipal **06/11** (Aniversário da cidade) já pré-cadastrado

Cálculo: `(meta_mensal - faturado_no_mes) / dias_uteis_restantes`.

---

## 10. Serviços e preços

| Item | Compra | Venda |
|---|---|---|
| Limpeza | — | R$ 185 |
| Limpeza combinada (cada) | — | R$ 165 |
| Manutenção | — | R$ 185 |
| Taxa diagnóstico | — | R$ 30 |
| Máquina reformada | R$ 150 | R$ 650 |
| Capa | R$ 30 | R$ 85 |

---

## 11. Filtro calendário — regra do dono

- Padrão: mês atual
- Se alterado pelo usuário, retorna ao padrão em **1 hora**
- Subtítulo da página reflete período real

---

## 12. Visibilidade

**Financeiro é admin-only**:
- Menu (Sidebar.jsx + BottomNav.jsx) esconde de funcionário (constante `MENUS_ADMIN_ONLY`)
- Rota `/financeiro` envolvida em `<AdminOnly user={...}>` no `App.jsx` (desktop + mobile) → redireciona pro Painel se funcionário digitar URL na mão
- RLS no banco reforça (defesa em 3 camadas)

---

## 13. Interseções com outras áreas

- **OS**: pagamento da OS gera lançamento em `lancamento_financeiro`. A prazo → vai pra "Contas a receber" automaticamente. Ver `contexto-os.md`
- **Estoque**: custo de peça compõe custo da OS, base do DRE. Ver `contexto-estoque.md`
- **Relatórios**: DRE com IA (Claude API) consome `lancamento_financeiro`. Ver `contexto-relatorios.md`
- **Painel**: KPI de receita do mês + meta diária + alertas de inadimplência. Ver `contexto-painel.md`
- **Geral / cross-area**: schema parte 2 (rodar SQL 01). Ver `contexto-geral.md`
