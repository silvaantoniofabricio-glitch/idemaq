# Estoque — Resumo da Noite de Processamento de NF-e

**Data do processamento**: 18/05/2026, 01:52:17
**Período coberto pelas NF-e**: 23/01/2024 → 16/05/2026

## 📊 Números

- **XMLs lidos**: 420
- **XMLs válidos** (com infNFe): 418
- **XMLs com erro**: 2 (são procEventoNFe — eventos como cancelamento; não trazem produtos)
- **Itens extraídos** (linha-a-linha das NF-e): 563
- **Peças únicas agrupadas** (por cProd ou nome): **459**
- **Total comprado no período**: **R$ 58,471.43**
- **SQL gerado**: 164 KB

## 🏷 Distribuição por categoria

Categoria classificada por regex no nome da peça, alinhada com `src/utils/categoriasPeca.js`.

| Categoria | Peças |
|---|---:|
| outros | 227 |
| mecanismo | 40 |
| rolamento | 37 |
| tampa | 21 |
| valvula | 21 |
| cesto | 16 |
| suspensao | 14 |
| pressostato | 13 |
| agitador | 9 |
| eletrobomba | 8 |
| polia | 7 |
| tirantes | 7 |
| capa | 6 |
| placa | 6 |
| termostato | 6 |
| mangueira | 5 |
| embreagem | 4 |
| motor | 3 |
| capacitor | 2 |
| correia | 2 |
| sensor | 2 |
| trava_porta | 2 |
| pe_nivelador | 1 |

> "outros" alto é esperado — pega itens genéricos (ferramentas, parafusos, materiais de oficina) que não são peças de máquina de lavar específicas.

## 🏢 Top 10 fornecedores (por nº de compras)

| # | Fornecedor | Itens |
|---|---|---:|
| 1 | GELMAQ COMERCIO DE PECAS E SERVICOS LTDA | 26 |
| 2 | L. A. MUEDRA BATONI LTDA. | 23 |
| 3 | GABAN COMERCIO DE UTILIDADES DOMESTICAS LTDA | 22 |
| 4 | BORCHERT BAUMGARTNER LTDA | 21 |
| 5 | WESLEY JOLLI COMERCIO DE COMPONENTES ELETRONICOS LTDA. | 20 |
| 6 | SELECAO DE PECAS LTDA | 17 |
| 7 | SCG COMERCIO DE UTILIDADES DOMESTICAS LTDA | 11 |
| 8 | SEVERTECH COMERCIO E SERVICOS LTDA | 11 |
| 9 | CLIMA CIA COMERCIO DE REFRIGERACAO E PECAS LTDA | 11 |
| 10 | D. M. YAMAMOTO LTDA | 10 |

## 💰 Top 10 fornecedores (por valor total comprado)

| # | Fornecedor | Total |
|---|---|---:|
| 1 | Ebazar.com.br. ltda | R$ 3,192.85 |
| 2 | GELMAQ COMERCIO DE PECAS E SERVICOS LTDA | R$ 2,855.21 |
| 3 | M3 COMERCIO DE PRODUTOS LTDA | R$ 2,294.15 |
| 4 | BORCHERT BAUMGARTNER LTDA | R$ 1,732.32 |
| 5 | L. A. MUEDRA BATONI LTDA. | R$ 1,657.75 |
| 6 | ROBERT NARCIZO MARINE 31271621894 | R$ 1,620.64 |
| 7 | GABAN COMERCIO DE UTILIDADES DOMESTICAS LTDA | R$ 1,481.08 |
| 8 | SELECAO DE PECAS LTDA | R$ 990,20 |
| 9 | Clima cia comercio de refrigeracao e pecas ltda | R$ 983,78 |
| 10 | AMC DE SOUZA MULTIMIDIAS | R$ 869,00 |

## 🔁 Top 10 peças mais compradas (frequência)

| # | Peça | Categoria | Compras |
|---|---|---|---:|
| 1 | AGRUPADOR RETENTOR ORIGINAL | rolamento | 8 |
| 2 | ROLAMENTO 6006 | rolamento | 8 |
| 3 | ROLAMENTO | rolamento | 6 |
| 4 | MECANISMO CJ | mecanismo | 5 |
| 5 | MECANISMO LAVADORA LONGO W11300816 | mecanismo | 5 |
| 6 | RETENTOR BRASTEMP | rolamento | 4 |
| 7 | Mecanismo Lavadora Brastemp Consul 8 A 12kg | mecanismo | 3 |
| 8 | Atuador De Freio 15kg Electrolux 64500661 Ltr15 110v | outros | 3 |
| 9 | Camisas Masculinas Polo De Alta Qualidade | outros | 3 |
| 10 | GRAXA BRANCA 20g BISNAGA | outros | 3 |

## 📁 Arquivos gerados

| Arquivo | O que contém |
|---|---|
| `relatorios/itens-extraidos.json` | Saída crua do parser (todas as linhas de NF-e + erros) |
| `relatorios/pecas-para-inserir.json` | Peças únicas agrupadas, com custos calculados |
| `relatorios/pecas-precisa-compatibilidade.json` | Mesmas peças + NCMs + variações de nome (pra Claude in Chrome pesquisar compatibilidade de modelos amanhã) |
| `relatorios/insert-pecas.sql` | **SQL pronto pra colar no Supabase** — `BEGIN/COMMIT`, 459 INSERTs |
| `logs/estoque-bloqueios.md` | Erros e XMLs com problema |

## ▶️ Próximos passos (manhã)

1. **Toni**: abrir o SQL Editor do Supabase, colar `relatorios/insert-pecas.sql` inteiro, rodar. Confirmar que `SELECT count(*) FROM peca` retornou 459.
2. **Toni**: revisar 10 peças aleatórias no Estoque → conferir que custo/categoria fazem sentido.
3. **Claude in Chrome**: abrir `relatorios/pecas-precisa-compatibilidade.json` e pesquisar marcas/modelos compatíveis de cada peça (sair com lista `{ pecaId, marca, modelos[] }` pra popular tabela `peca_compatibilidade` num próximo módulo).
4. **Refinar regex** de classificação: 49% caiu em "outros". Próxima iteração pode olhar a lista de "outros" e tirar de lá os que mereçam categoria própria (ex: borrachas de centrífuga, ferramentas em separado).

## 🧮 Como custos foram calculados

- **`custo_atual`** = última compra (mais recente pela `dhEmi` da NF-e)
- **`custo_medio`** = média aritmética de todas as compras
- **`custo_minimo`** / **`custo_maximo`** = mín/máx do histórico
- **`preco_venda`** = `custo_atual * 2.3` (markup 130% padrão, conforme prompt). Toni pode ajustar caso a caso depois.
- **`qtd_atual`** = `0` em todas. Toni define manualmente o que existe fisicamente no estoque.
- **`qtd_minima`** = `1` (default conservador).

## ⛔ Bloqueios encontrados

- 2 XMLs sem `infNFe` — todos são `*-procEventoNFe.xml` (eventos como CCe ou cancelamento; não têm produtos). Esperado.
- `$env:IDEMAQ_TERMINAL` veio vazio (não setado). Trabalho prosseguiu por contexto.
- `git pull --rebase` **pulado** intencionalmente: havia mudanças não-relacionadas (outros terminais) que dariam conflito.
- `.env.local` **não criado** — o fluxo final não insere direto no Supabase (gera SQL pra Toni colar). Service-role-key não foi necessário.
- `npm run build` **pulado** — não toquei em `src/`, só `scripts/` e `relatorios/`. O build não pode ter sido afetado.

## ✅ Checklist do prompt

- [x] `notas-xml/` lida (420 arquivos)
- [x] `relatorios/itens-extraidos.json`
- [x] `relatorios/pecas-para-inserir.json`
- [x] `relatorios/pecas-precisa-compatibilidade.json`
- [x] `relatorios/insert-pecas.sql`
- [x] `relatorios/estoque-noite-RESUMO.md` (este arquivo)
- [x] Commit (próximo passo)

— gerado por `scripts/gera-resumo.js`
