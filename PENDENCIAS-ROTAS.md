# PENDÊNCIAS — Interseções entre terminais

> Arquivo coringa pra anotar TODOs que **dependem de outro terminal/área**.
> Cada item: o que falta · onde · por quê · quem destrava.

---

## Baixa automática de estoque ao concluir OS

- **De onde sai o gatilho**: ao mover OS pra etapa `Concluído` (terminal `os`).
- **O que precisa**: pra cada item da OS com `tipo = 'item'`, decrementar
  `peca.qtd_atual` pela quantidade usada e registrar movimentação no histórico.
- **Onde aplicar**:
  - Front: hook do terminal `os` que chama uma função `baixarEstoqueDaOS(osId)`
    exposta pelo `usePecas` (ainda não existe).
  - **Alternativa preferível**: trigger SQL `on insert/update os_historico when
    etapa='Concluído'` faz o `UPDATE peca SET qtd_atual = qtd_atual - X` e
    insere em `peca_movimentacao`. Mantém a regra no banco (não some se um
    cliente esquecer de chamar a função).
- **Cuidados**:
  - Não dar baixa de novo se a OS voltar pra Concluído por drag duplicado
    (idempotência — checar movimentação prévia ou flag `baixa_aplicada` na OS).
  - OS de garantia (`garantia=true`) também dá baixa? **Sim** — peça saiu do
    estoque, independente de cobrar do cliente.
  - Itens com `tipo = 'servico'` ou `'taxa'` **não** mexem no estoque.
- **Tabela nova necessária**: `peca_movimentacao` (peca_id, delta, tipo,
  os_id, responsavel, data, obs). Hoje o histórico mostrado em
  `PecaDetalheModal` é mock.
- **TODO no código**: comentado em
  `src/components/estoque/PecaDetalheModal.jsx` (função `PecaDetalheModal`,
  bloco TODO acima de `sectionLabel`).
- **Destrava com**: terminal `os` definir contrato do hook de conclusão.
  Ver `CONTEXTO PROJETO ATUALIZADO/contexto-os.md` e `contexto-estoque.md` §9.

---

## (futuro) Ajuste manual de estoque

- Botão "Ajustar estoque" no `PecaDetalheModal` ainda só dispara toast.
- Depende de: tabela `peca_movimentacao` (mesma da baixa automática) +
  modal de ajuste (entrada manual, ajuste positivo/negativo com motivo).
- Sem dependência cross-terminal — fica dentro do `estoque` quando voltar.

---

## ~~Conversão Recusada → Fabricação perde o cliente_id~~ ✅ RESOLVIDO 2026-05-19

- **Decisão tomada**: Recusada → Fabricação agora cria **OS nova** (em vez de mutar a original) via `criarOSDerivada` (`src/utils/osDerivada.js`).
- **Como**: a OS recusada original **mantém** o `cliente_id`; a Fabricação nova herda só marca/modelo/defeito + grava `os_origem_id` apontando pra recusada.
- **Trade-off novo (menor)**: os itens do orçamento da recusada NÃO são copiados pra Fabricação. Refurbish geralmente parte do zero (peças diferentes), então tá ok — se quiser, copiar manualmente. Registrado no contexto-os.md §9.
- **Atenção**: precisa que a constraint do banco permita `os_origem_id` setado sem `garantia=true`. Se a constraint for estrita "os_origem_id ⇒ garantia=true", a inserção vai dar erro — nesse caso, alterar a constraint pra "garantia=true ⇒ os_origem_id" (one-way) ou adicionar coluna `os_origem_recusada_id` separada.

---

## `observacoes` na tabela `os` não persiste

- **Onde**: tentativas espalhadas (`AcaoRecusada.cobrarTaxa`, possivelmente
  outros pontos) que passam `observacoes` pro `onUpdateOS`.
- **O que acontece hoje**: `normalizePatchOS()` em `src/utils/osPatch.js` não tem
  `observacoes` na `COLUNAS_SAFE` — campo vai pro `skipped[]` e fica só em
  memória. Refresh ou Realtime apaga.
- **Pra fechar**: ou adicionar coluna `observacoes text` na tabela `os` +
  incluir em `COLUNAS_SAFE`, ou remover as tentativas de salvar `observacoes`
  do código. Ver `CONTEXTO PROJETO ATUALIZADO/contexto-os.md` §2 (próximos
  passos #1 menciona adicionar colunas pendentes).
- **Destrava com**: dono confirmar criar a coluna.
