# Contexto UI — Componentes disponíveis (`src/components/ui`)

> Leia quando for construir ou editar qualquer tela. Regras de tema e paleta estão em `CLAUDE.md §6`.

---

## Componentes

- **`Card`** — container padrão com `idemaq-card`. Props: `T`, `dark`, `padding`, `radius`, `accent` (borda lateral colorida), `hover`.
- **`SubCard`** — card secundário (background `cardAlt`). Usar dentro de outro Card.
- **`Button`** — 4 variantes: `primary` (gradient azul) · `secondary` · `ghost` · `danger`. Tamanhos `sm`/`md`/`lg`. Props `iconLeft`/`iconRight`.
- **`Badge`** — variantes semânticas (`azul`/`amarelo`/`vermelho`/`verde`/`neutro`) ou cores livres.
- **`StatusBadge`** — status pré-definidos: `vencido`, `hoje`, `amanha`, `2dias`, `esgotado`, `critico`, `baixo`, `atrasada`, `pago`.
- **`CountBadge`** — numérico pequeno (azul ou vermelho).
- **`Modal`** + **`ModalHeader`** — overlay padrão (ESC + click-fora fecham). Mobile: bottom sheet.
- **`Tabs`** — segmented control (`segmented` ou `underline`). Padrão "ativo = azul".
- **`ChipToggle`** — chip filtro on/off (sempre azul ativo).
- **`Input`**, **`Select`**, **`Textarea`** — form fields com label opcional + ícone. Foco em azul.
- **`EmptyState`** — ícone + título + descrição + ação opcional. Use em listas vazias.
- **`PageHeader`** — título grande + subtítulo + stats inline + ações à direita. Use no topo de toda página.
- **`SectionHeader`** + **`SectionAction`** — cabeçalho de seção (label uppercase) dentro de Card.
- **`Sparkline`** — mini gráfico inline SVG (área + linha).
- **`DeltaPill`** — pill ↗ +12% verde / ↘ -3% vermelho.
- **`ToastProvider`** + **`useToast()`** — `notify('ok'|'erro'|'info', 'mensagem')`. Some em 3.2s.

## Regras de uso

- Nunca crie variações de Card/Button/Badge — se faltar variante, peça aprovação pra adicionar ao componente base.
- Não use `<select>`/`<input>`/`<button>` cru — sempre via `<Select>`/`<Input>`/`<Button>`.
- Não use styled-components, Tailwind, CSS Modules. Padrão: `style={{}}` inline + `className="idemaq-card"` + `global.css`.
