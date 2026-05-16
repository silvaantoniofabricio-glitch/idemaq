# Redesign do formulário de Nova OS — 16/05/2026

## 📁 O que tem nesse pacote

Apenas **1 arquivo** pra você substituir:

```
src/_legacy/desktopKanbanModals.jsx
```

Substitua o arquivo atual pelo que veio nesse pacote.

## 🚀 Como aplicar

1. Copie `desktopKanbanModals.jsx` para `C:\Users\Toni-PC\projetos\idemaq\src\_legacy\desktopKanbanModals.jsx` (substituindo o existente)
2. No terminal, dentro da pasta do projeto:
   ```
   git add .
   git commit -m "feat(NovaOS): redesign formulário de Atendimento + cadastro completo de cliente"
   git push origin main
   ```
3. Espera ~30 segundos e abre https://idemaq.vercel.app pra testar
4. Login → Kanban → botão "+ Nova OS"

## ✅ O que mudou

### Passo 1 — Escolha do tipo
- **Ordem dos cards:** Atendimento → Venda → Fabricação (antes era Atendimento → Fabricação → Venda)
- Ícone maior (24px) com fundo colorido em destaque
- Estado "Selecionado" com texto explícito embaixo (✓ Selecionado)
- Botão "Continuar" no rodapé (antes era "Próximo")

### Passo 2 — Atendimento (REDESENHADO)
- **Único obrigatório:** Cliente
- **Removido:** campos Prioridade e Responsável (responsável fica registrado no histórico automaticamente)
- **Cliente:** card destacado com nome + telefone + "X endereços cadastrados"
- **NOVO — Endereço da coleta:** radio entre os endereços cadastrados do cliente. Endereço 1 vem pré-selecionado com badge "PRINCIPAL".
- **NOVO — Equipamento opcional em 4 campos (2 colunas):**
  - Tipo (dropdown: Máquina de Lavar / Lava e Seca / Tanquinho / Micro-ondas)
  - Marca (dropdown: Brastemp / Electrolux / Consul / Outros)
  - Modelo (texto livre)
  - Nº de série (texto livre)
- Quando Marca = "Outros", aparece campo extra "Nome da marca"
- **Defeito relatado:** opcional (antes era obrigatório)
- **Status no header:** mostra em tempo real o que falta preencher (ex: "selecione um cliente")

### Passo 2 — Venda
- Mantém estrutura antiga, mas agora também tem **radio de endereços** (puxa os endereços do cliente comprador)
- Botão "+ Cadastrar agora" abre o cadastro COMPLETO de cliente

### Passo 2 — Fabricação
- Mantém estrutura antiga
- Agora o campo "Descrição" foi trocado por **Tipo (dropdown)** + Descrição/estado inicial
- Campo Responsável removido (consistente com a regra: histórico cuida disso)

### NOVO — Sub-modal "Novo cliente" (cadastro completo)
Abre quando clica em "+ Cadastrar novo cliente" dentro da Nova OS.

**Campos:**
- **Dados pessoais:** Nome*, CPF/CNPJ, E-mail
- **Contato:** Telefone principal* (com indicador WhatsApp), Telefone secundário
- **Endereço 1*** + botão "Adicionar outro endereço" (recolhido por padrão)
  - Ao clicar, abre Endereço 2; ao clicar de novo, abre Endereço 3
  - Cada endereço extra tem botão "Remover"
  - Limite: 3 endereços (botão "Adicionar" some quando chega no limite)

**Obrigatórios:** Nome, Telefone, Endereço 1 (3 campos)

Quando cadastra, já volta selecionado no formulário de OS.

## 🛡 O que NÃO foi tocado

- `OSDetalhe` (modal de detalhe da OS) — **100% idêntico ao original**, verificado por diff
- `ModalBase`, `BannerFinalizada`, `FormSecao`, `DetCard`, `Linha`, `DetMini`, `SubBox` — preservados
- Outros arquivos do projeto — nada mais foi modificado
- Mocks do `osData.js` — não tocados (a adaptação `endereco → enderecos[]` acontece localmente dentro do modal, via função `adaptarClientesMock`)

## ⚙️ Comportamento técnico

- **Salvar ainda é mock**: ao clicar "Criar OS", mostra `alert()` e fecha (igual antes). O `INSERT` no Supabase é Módulo 02 do roadmap, em sessão futura.
- **Mocks de cliente adaptados localmente**: o `CLIENTES_MOCK` original só tem `endereco: string`. Pra simular múltiplos endereços, o modal converte em `enderecos: [endereco]` ao carregar. Quando você cadastra um cliente novo no formulário, ele entra na lista local com `enderecos: []` real.
- **Tema dark/light**: tudo via prop `T` e `dark` — nenhuma cor hardcoded.
- **Paleta Deutan respeitada**: azul `#5B9BD5` para ativo/principal, vermelho `#FF6B6B` para obrigatório, amarelo `#FFD966` para o info banner da Fabricação.
- **Ícones Tabler** em tudo.

## 🐛 Se algo quebrar

- **Tela branca após substituir** → confira o console do navegador (F12). Manda o erro pra próxima sessão.
- **Botão "Criar OS" não habilita** → confira se selecionou um cliente. No Atendimento, é o único obrigatório.
- **Endereços não aparecem ao escolher cliente** → o `CLIENTES_MOCK` (em `src/utils/osData.js`) hoje tem só um `endereco` por cliente. O modal já adapta isso pra um array com 1 endereço. Se cadastrar um cliente novo pelo modal, ele entra com até 3 endereços reais.
- **Voltar 1 versão** se precisar:
  ```
  git revert HEAD
  git push origin main
  ```

## ✅ Checklist do CLAUDE.md cumprido

- [x] Sem cor hardcoded — tudo via T.* / P.* / helpers
- [x] Ícones Tabler (`ti ti-nome`)
- [x] Filtros/seleção sempre azul quando ativo
- [x] Não tocou em `_legacy/` fora do escopo aprovado (apenas o NovaOSModal e o novo NovoClienteModalCompleto)
- [x] Não adicionou dependências
- [x] Não fez "melhorias" não pedidas (Fabricação e Venda preservados como estavam, só ajustes mínimos)
- [x] Sintaxe JSX validada — chaves, parênteses e colchetes balanceados (0/0/0)
- [x] OSDetalhe preservado 100% (diff de 0 linhas)
