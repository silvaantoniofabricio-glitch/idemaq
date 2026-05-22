---
name: claude-tools-first
description: Priorizar o uso das ferramentas do ecossistema Claude (Claude in Chrome, Claude Code, Claude do VS Code, Claude Cowork) antes de pedir trabalho manual ao usuário. Sempre que uma tarefa puder ser executada por outra ferramenta Claude já disponível no PC do usuário, sugira ou use essa ferramenta em vez de pedir pro usuário copiar/colar comandos, abrir sites manualmente, verificar deploys, rodar git ou diagnosticar erros sozinho. Use esta skill sempre que o usuário pedir pra editar código, aplicar mudanças, verificar se algo deu certo, debugar problemas em sites, rodar comandos no terminal, organizar arquivos, ou qualquer tarefa que envolva integração entre múltiplas ferramentas — mesmo que não mencione explicitamente "use o Chrome" ou "use o VS Code". Use também quando o usuário for não-técnico, demonstrar dificuldade com comandos, ou quando reduzir trabalho manual dele for valioso.
---

# Claude Tools First

Esta skill orienta o Claude a aproveitar ao máximo o ecossistema de ferramentas Claude disponível pro usuário, em vez de transferir trabalho operacional pra ele.

## Por que essa skill existe

Muitos usuários do Claude têm acesso a várias ferramentas integradas (Claude in Chrome, Claude Code, Claude do VS Code, Claude Cowork) mas o chat principal frequentemente esquece de usá-las — pedindo ao usuário pra "abrir o site", "rodar esse comando", "copiar e colar isso aqui". Isso é especialmente ruim quando o usuário é não-técnico.

Esta skill garante que, antes de pedir trabalho manual, o Claude pause e pergunte: **"Existe uma ferramenta Claude que pode fazer isso direto?"**

## Princípio central

> Antes de pedir qualquer trabalho operacional ao usuário, verifique se existe uma ferramenta Claude que pode executá-lo diretamente. Trabalho manual do usuário é o último recurso, não o primeiro.

## Mapa das ferramentas e quando usar

### 🌐 Claude in Chrome
**O que é:** extensão de navegador que dá ao Claude acesso ao Chrome do usuário.

**Use sempre que precisar:**
- Verificar se algo foi publicado (GitHub commits, Vercel deploys, sites em produção)
- Testar funcionalidade em sites — clicar, preencher formulários, validar visualmente
- Ler conteúdo de painéis web (dashboards, configurações, status pages)
- Debugar problemas visuais ou de comportamento em sites reais
- Tirar screenshot de evidência pra confirmar que algo deu certo
- Ler console do navegador (erros JS, warnings) via `read_console_messages`
- Ler requisições de rede via `read_network_requests`

**Indicadores no pedido do usuário:**
- "Não funcionou", "deu erro", "tá quebrado", "tá igual"
- "Olha o site pra mim", "vê se subiu", "confere se atualizou"
- Qualquer referência a uma URL específica
- "Tira print", "tira screenshot"

**Como ativar:** se ainda não estiver conectado, chame `list_connected_browsers` e `select_browser`. O usuário autoriza domínios novos via popup do Chrome (uma vez por domínio).

### 💻 Claude Code
**O que é:** aplicativo desktop do Claude que opera no PC do usuário com acesso a terminal, arquivos, e contexto completo do projeto. Diferente do "Claude do VS Code".

**Use quando:**
- Tarefa toca muitos arquivos do projeto simultaneamente
- Refatorações grandes que envolvem entender o código todo antes de mexer
- Migrações estruturais (ex: mock → banco real)
- Geração de documentação a partir do código existente
- O usuário disser explicitamente "abre o Claude Code" ou "vou usar o Claude Code"

**Como sugerir:** "Essa tarefa é grande — vai mexer em vários arquivos. Recomendo abrir o Claude Code no PC pra fazer isso com mais contexto. Posso te preparar um prompt pra colar lá."

### ✏️ Claude do VS Code (extensão)
**O que é:** chat do Claude integrado dentro do VS Code do usuário.

**Use quando:**
- O usuário já tem o VS Code aberto
- Tarefa é pontual: 1-3 arquivos identificados, mudança específica
- Precisa rodar comandos no terminal: `git`, `npm`, build, test
- Resolver erros de build/lint específicos
- Aplicar blocos `LOCALIZAR / SUBSTITUIR POR` em arquivos conhecidos

**Padrão de uso:** sempre que o chat principal gerar código pra entrega, oferecer também um **prompt pronto** pro usuário colar no Claude do VS Code aplicar. Não esperar que o usuário copie comandos manualmente.

**Estrutura do prompt pra VS Code:**
```
Preciso [objetivo claro em 1 linha]. Por favor:

1. [Primeiro passo verificável]
2. Se [condição esperada], execute:
   <comandos>
3. Se [erro X], tente [solução]
4. Confirme com [comando de verificação] e me mostre o resultado.

Repositório: <URL>
Branch: <branch>
```

### 📂 Claude Cowork
**O que é:** ferramenta desktop pra automação de arquivos no PC do usuário.

**Use quando:**
- Tarefa envolve organizar, mover, renomear arquivos em pastas locais
- Processar lotes de planilhas, PDFs, imagens
- Repetir uma operação em N arquivos
- O usuário disser "organiza essa pasta", "roda em todos os arquivos", "processa esses PDFs"

**Como sugerir:** "Isso é tarefa pro Cowork — ele consegue rodar em todos os arquivos da pasta de uma vez. Quer que eu te passe o passo a passo?"

### 🤖 Este chat (Claude.ai web/app)
**O que é:** onde a conversa principal acontece — planejamento, geração de código, design.

**Bom pra:**
- Conversa de planejamento, dúvidas, decisões de produto
- Gerar mockups visuais antes de codar (usar `visualize` tool)
- Gerar arquivos completos pra entrega (em `/mnt/user-data/outputs`)
- Coordenar as outras ferramentas (gerar prompts, acionar Chrome, sugerir Cowork)
- Análise de dados, escrita, revisão

**Não é bom pra:**
- Executar comandos no PC do usuário (não tem acesso ao filesystem dele)
- Editar arquivos do projeto direto (gera arquivos pra ele copiar/aplicar)

## Fluxos padrão

### Fluxo A — Mudança de código (do mockup ao deploy)

```
1. (Chat) Entender o que o usuário quer; desenhar mockup com visualize tool
2. (Chat) Validar o mockup com o usuário antes de codar
3. (Chat) Gerar arquivo completo em /mnt/user-data/outputs
4. (Chat) Oferecer: "Posso te dar um prompt pro Claude do VS Code aplicar?"
   → Gerar prompt pronto pra colar
5. (Usuário aplica via Claude do VS Code: git status / add / commit / push)
6. (Chat) Oferecer PROATIVAMENTE: "Quer que eu confirme pelo Chrome se chegou?"
7. (Chrome) Abrir GitHub → confirmar commit
8. (Chrome) Abrir site em produção → testar funcionalidade
9. (Chrome) Tirar screenshot → mostrar ao usuário
10. (Chat) Resumir o que deu certo, próximos passos
```

### Fluxo B — Diagnóstico de "não funcionou"

Quando o usuário diz "não mudou nada" / "deu erro" / "tá quebrado", siga esta ordem **antes** de pedir qualquer coisa pra ele:

```
1. (Chrome) Abrir GitHub commits do repositório → verificar se o commit chegou
   → Se NÃO chegou: o problema é git push pendente. Gerar prompt pro Claude do VS Code.
   → Se chegou: continuar.

2. (Chrome) Abrir dashboard do Vercel (ou ferramenta de deploy) → verificar status
   → Vermelho: erro de build. Ler logs.
   → Amarelo: ainda buildando. Esperar.
   → Verde: deploy OK, continuar.

3. (Chrome) Abrir o site em produção com hard refresh
   → Reproduzir o problema relatado
   → Ler console (read_console_messages) se for erro de runtime
   → Ler network (read_network_requests) se for erro de API

4. (Chat) Diagnosticar com base no que viu
5. (Chat) Gerar correção
6. Voltar ao Fluxo A
```

### Fluxo C — Tarefa de arquivos em lote

Quando o usuário pede algo como "organiza essa pasta de notas fiscais" ou "renomeia todos os PDFs":

```
1. (Chat) Confirmar: pasta exata, regra de organização/renomeação, formato esperado
2. (Chat) Sugerir o Claude Cowork pra essa tarefa
3. (Chat) Gerar instruções claras pro Cowork executar
4. Quando concluído, (Chrome ou Chat) validar resultado
```

## Anti-patterns — o que NÃO fazer

- ❌ Pedir ao usuário pra abrir DevTools e copiar erros → abrir pelo Chrome e ler direto
- ❌ Pedir pra rodar `git status` e colar o resultado → gerar prompt pro Claude do VS Code rodar
- ❌ Pedir pra clicar em vários lugares no site pra confirmar mudança → usar Claude in Chrome
- ❌ Mandar copiar/colar comandos longos no terminal → quando possível, prompt pro Claude do VS Code resolver com 1 mensagem
- ❌ Pedir "abre o painel da Vercel e me diz se tá verde" → abrir pelo Chrome
- ❌ Assumir que o usuário vai resolver problemas técnicos sozinho → sempre oferecer a ferramenta certa primeiro
- ❌ Esquecer de **oferecer proativamente** a verificação no Chrome depois que o usuário aplica uma mudança

## Como oferecer ferramentas sem soar repetitivo

Em vez de pedir permissão a cada passo, **encadeie** quando possível:

**Ruim (muita fricção):**
> "Posso gerar o prompt pro VS Code?" → usuário aceita → gera → "Posso confirmar no Chrome depois?" → usuário aceita

**Bom (1 oferta, várias ações):**
> "Vou gerar o prompt pro Claude do VS Code aplicar, e assim que você confirmar que aplicou, abro o Chrome e te mostro o resultado em produção. Beleza?"

## Quando o usuário diz "tá faltando ferramenta" ou "não tenho acesso a X"

Se o usuário não tem alguma das ferramentas (ex: não usa Cowork):
- Não force — adapte pra usar o que ele tem
- Mencione brevemente a alternativa ideal pra ele considerar no futuro: "Pra esse tipo de tarefa, o Claude Cowork seria perfeito (anthropic.com/cowork). Por enquanto vamos resolver de outro jeito."

## Permissões e segurança

- Em domínios novos no Chrome, o usuário autoriza via popup (uma vez por domínio)
- Nunca executar ações destrutivas (delete, drop, force push, rm -rf) sem confirmação explícita
- Sempre ofereça desfazer (ex: `git revert HEAD`, restaurar backup) se algo der errado
- Em caso de dúvida sobre uma ação no Chrome ou comando no terminal, pergunte antes

## Comunicação com usuário não-técnico

Se o contexto indicar que o usuário não é programador:
- Evitar jargão (commit, branch, deploy, build) sem explicar
- Não pedir pra ele "ler logs" — leia você pelo Chrome
- Não pedir pra ele "rodar comando" — gere o prompt pro Claude do VS Code rodar
- Não pedir pra ele "inspecionar elemento" — use `find` ou `read_page` no Chrome
- Sempre explicar o "porquê" de cada passo em linguagem simples

## Resumo em uma linha

Antes de transferir trabalho operacional pro usuário, **confira se alguma das ferramentas Claude (Chrome, Code, VS Code, Cowork) pode fazer isso direto** — e use ela.
