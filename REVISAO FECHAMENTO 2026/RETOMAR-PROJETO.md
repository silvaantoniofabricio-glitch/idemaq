# Fechamento Maio 2026 — Status de Retomada
**Atualizado: 31/05/2026**

---

## ✅ RECEITAS — CONCLUÍDO (sessão 31/05/2026)

### O que foi feito
- Leu 38 cards do Trello ("Finalizados/Pagos MAIO") e extraiu valor, pagamento e data dos comentários
- Cruzou com TON maquininha (12/12 ✅), Cresol PIX (23/23 ✅) e 2 entradas manuais InfinitePay
- Criou planilha consolidada: `RECEBEDOR MAIO 2026 - COMPLETO.csv` (39 registros)
- Rodou `sql/49-trello-maio-2026.sql` no Supabase:
  - **38 OS** criadas (tag `TRELLO-MAIO-2026:<telefone>` nas observacoes)
    - 36 com `etapa='concluido'`, `pago='total'`
    - 2 com `etapa='pagamento'`, `pago='parcial'`: **Paula** (falta R$100) e **Sueli** (falta R$240)
  - **41 lançamentos** na `lancamento_financeiro`, categoria `'Servico'`
- Corrigiu Eleni: vencimento e pago_em → `2026-05-15` (era 2026-04-06)
- Soft-delete de 14 duplicatas antigas (imports TON/Cresol/InfinitePay anteriores)

### Totais finais — RECEITAS MAIO
| Item | Valor |
|---|---|
| Total bruto recebido | R$ 14.063,00 |
| Taxas (TON + InfinitePay) | R$ 333,40 |
| Líquido | R$ 13.729,60 |
| Lançamentos no sistema | 41 (inclui Eleni R$750 de abril) |

### Arquivos
- `FECHAMENTO MAIO\RECEBEDOR TRELLO\RECEBIMENTOS_TRELLO_MAIO_2026.csv`
- `FECHAMENTO MAIO\RECEBEDOR MAIO 2026 - COMPLETO.csv`
- `sql\49-trello-maio-2026.sql`

---

## ⏳ PRÓXIMO PASSO — DESPESAS

Objetivo: adicionar todas as despesas de maio para fechar o mês completo (DRE).

**Fonte**: extrato Cresol PDF em `FECHAMENTO MAIO\CRESOL\`

O que levantar:
- Contas fixas (aluguel, água, luz, internet, etc.)
- Compras de peças / fornecedores
- Salários / pró-labore
- Taxas de maquininha (TON já debitou automaticamente)
- Outras saídas do mês

Como inserir: `lancamento_financeiro` com `tipo='despesa'`, categoria adequada, conta Cresol.

---

## Pendente (anterior a 31/05)
- `sql/48`: soft-delete de 9 não-peças do estoque (aspirador WAP, carregador iPhone, fritadeira, etc.)
- OS entregues mas não pagas — Toni vai informar a lista depois

---

# Como retomar este projeto (Toni)

## 🔁 Pra continuar a conversa onde paramos

Abre o **Claude Code** no terminal da pasta Desktop e roda:

```
claude --continue
```

Retoma esta conversa exata com todo histórico.

Se quiser escolher de uma lista de conversas anteriores:

```
claude --resume
```

## 📂 Onde está tudo

| O que | Onde |
|---|---|
| Histórico das conversas (auto-salvo, JSONL) | `C:\Users\Toni-PC\.claude\projects\C--Users-Toni-PC-Desktop\*.jsonl` |
| Memória de longo prazo (carregada toda sessão) | `C:\Users\Toni-PC\.claude\projects\C--Users-Toni-PC-Desktop\memory\` |
| Sistema IdeMaq (código React + Supabase) | `C:\Users\Toni-PC\projetos\idemaq` |
| SQLs gerados de importação | `C:\Users\Toni-PC\projetos\idemaq\sql\20*..42*` |
| Scripts geradores | `C:\Users\Toni-PC\projetos\idemaq\scripts\gerar-sql-*.mjs` |
| Relatórios JSON paralelos | `C:\Users\Toni-PC\projetos\idemaq\relatorios\` |
| Dados-fonte (Bling + Trello + bancos + maquininhas) | `C:\Users\Toni-PC\projetos\idemaq\Base de dados clientes Bling\` |

## ✅ Status do projeto (25/05/2026)

### 🆕 Sessão 25/05/2026 — Sistema de favoritos + organização ML

**Estoque com favoritos** (deployed):
- Coluna `peca.favorito` (boolean) + índice
- Botão ⭐ no NovaPecaModal e PecaDetalheModal (toggle 1-clique)
- Lista ordenada favorito DESC, nome ASC
- Estrela aparece na listagem Estoque desktop + mobile
- SQLs aplicados: `sql/44` (schema), `sql/45` (38 já existentes favoritadas), `sql/46` (239 novas via ON CONFLICT), `sql/47` (corrige duplicata A20062301 + 10 peças faltantes)
- **Total atual: ~286 favoritas**
- ⚠️ **Pendente**: rodar `sql/48-remover-nao-pecas-do-estoque.sql` (soft-delete de 9 não-peças que entraram por engano: aspirador WAP, carregador iPhone, fritadeira, gabinete gamer, headset, SSD, cabo fone, espuma, borracha Razer)

**Pasta `RELATORIO OUTRAS LOJAS/COMPRAS ML/` reorganizada**:
- `PJ/` — 447 XMLs (CNPJ destinatário) + relatórios cruzar com bling
- `PF/` — 62 XMLs (CPF destinatário) + relatórios cruzar com bling
- `_EVENTOS_NFE/` — 2 XMLs de cancelamento de nota (não compras)
- `CRUZAMENTO ESTOQUE/` — relatórios do cruzamento de notas vs catálogo

**Cruzamento ML × Bling × Estoque** feito (resultado em `COMPRAS ML/CRUZAMENTO ESTOQUE/`):
- 561 itens-peça das NFes ML (469 PJ + ~50 PF)
- Pareou 207 com estoque existente
- 239 peças únicas novas inseridas como favoritas
- 6 pares "compra sem nota ↔ nota sem compra" via Bling
- Revisão PJ pós-insert: 496 ocorrências já no estoque (497 favoritas), só 13 faltavam (10 cadastradas via sql/47, 3 ignoradas — ferramentas)

**OS — botão "Pular para…"** (deployed):
- Footer (desktop) e FooterMobile ganham menu dropdown entre Voltar/Avançar
- Permite ir direto pra qualquer etapa (não só ±1)
- Regras de negócio continuam (concluir só com pagamento+entrega, teste_final precisa limpeza/manutenção, etc)

**Outras mudanças**:
- Settings.json: modelo padrão fixo em `claude-sonnet-4-6` (afeta também ferramentas externas como Open Designer que chamam o CLI)

### 🏁 PROJETO FINALIZADO — TUDO EM PRODUÇÃO

- **Banco Supabase**: todos os 42 SQLs aplicados (sql/20 a sql/42)
- **Código**: commitado e pushed pra GitHub (commit `feat(financeiro): importação massiva Bling+Cresol+maquininhas + dedup automática`)
- **Vercel**: deploy automático após push (idemaq.vercel.app)
- **Hook `useFinanceiro`**: lê de `vw_lancamentos_validos` (exclui duplicatas automaticamente)

### Importações completas
- **Bling financeiro**: 680 receitas + 1235 despesas (sql/20)
- **Cresol 1ª conta** (358510-7): 988 transações (sql/26a, 26b)
- **Cresol 2ª conta** (40990-1): 1255 transações (sql/24a, 24b, 24c)
- **InfinitePay** (maquininha): 362 transações (sql/21 + correção sql/25)
- **Ton Black** (maquininha): 20 vendas + 20 taxas (sql/27)
- **OS Bling retroativas**: 535 OS + 1687 itens (sql/22a-d)
- **Trello enriquecimento**: já feito pelo sql/12 original (no-op pro sql/23a-b)

### Cruzamento e DRE
- 772 duplicatas marcadas em `lancamento_duplicata` (sql/29 + 31 + 32 + 35)
- Views `vw_dre_real`, `vw_dre_mensal`, `vw_lancamentos_validos` criadas
- Hook integrado pra UI mostrar dados limpos automaticamente

### Gaps fechados
- 21 OS sem cliente → atribuídas ao "Consumidor Final" (sql/41)
- 30 OS sem valor → marcadas `[REVISAR-VALOR]` em observacoes (revisão manual)
- 0 lançamentos sem categoria (100% categorizado)

### Balanço final
| Métrica | Bruto | Líquido (sem dup) |
|---|---:|---:|
| Receitas | R$ 799.011 | **R$ 572.003** |
| Despesas | R$ 765.015 | **R$ 579.450** |
| Resultado | +R$ 33.995 | **-R$ 7.447** (≈break-even) |

- Receita média: R$ 20.4k/mês (bate meta!)
- Despesa média: R$ 20.7k/mês
- Cobertura: 28 meses (jan/2024 → mai/2026)

## ⏳ Trabalhos opcionais futuros

| Tarefa | Prioridade | Esforço |
|---|---|---|
| Verificar deploy Vercel funcionou (abrir /financeiro) | 🟢 5 min | check rápido |
| Campanha reativação dos 235 clientes contatáveis | 🟡 ROI alto | 1-2h no WhatsApp |
| Preencher 30 OS `[REVISAR-VALOR]` manualmente | 🔵 baixo | aos poucos |
| NFe entrada → estoque (91 XMLs) | ⚪ futuro | projeto separado |
| Integrar `vw_dre_real` nos Relatórios (módulo IA) | ⚪ futuro | refator pequeno |

## 🔌 Conexão Supabase

- URL: https://yfbbruxqfzgetapbvrgd.supabase.co
- Publishable key (anon, só leitura, bate RLS): `sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP`
- Service role: tem só no Vercel (.env.local não existe localmente)
- Pra rodar SQLs: Dashboard → SQL Editor (paste + Run)

## 🧠 Convenções importantes aprendidas

- **SQL grande (>100KB) é truncado pelo Supabase Editor** — dividir em chunks <85KB
- **TEMP TABLES não persistem entre statements** no Editor (cada `;` pode ser auto-commit). Usar tabelas regulares + DROP no fim
- **DO $$ blocks** garantem execução como single statement (não truncado)
- **`valor_total` em `os_item` é generated column** — não INSERT
- **EXTRACT(DAY FROM date - date) quebra** — subtração de dates já retorna integer
- **Trello card IDs têm 2 formatos**: 24-hex (full, no sql/12 original) e 8-char (shortLink, no sql/22) — coexistem no DB
- **"modo auto" do Toni** = bypass-permissions do Claude Code (Shift+Tab), não "trabalhe sozinho"
- **Toni é daltônico Deutan, não-técnico** — explicações visuais e simples em PT-BR
- **Git push pra `main` requer autorização explícita** pelo auto-classifier; Toni roda manualmente

## ⚠️ Se algo der errado e quiser reverter importação

Cada conjunto é identificável pelas tags. Pra reverter:

```sql
-- Reverter Cresol 2ª:
UPDATE lancamento_financeiro SET deleted_at = now() WHERE descricao LIKE 'CRESOL2-%';

-- Reverter Bling financeiro:
UPDATE lancamento_financeiro SET deleted_at = now() WHERE descricao LIKE 'BLING-REC:%' OR descricao LIKE 'BLING-PAG:%';

-- Reverter OS Bling (cuidado: alguns enriqueceram OS Trello existentes):
UPDATE os SET deleted_at = now() WHERE observacoes LIKE '%BLING-PEDIDO:%' AND observacoes NOT LIKE '%TRELLO-CARD:%';

-- Etc.
```

Detalhes completos em `C:\Users\Toni-PC\projetos\idemaq\relatorios\IMPORTACAO-BLING-CRESOL-README.md`.
