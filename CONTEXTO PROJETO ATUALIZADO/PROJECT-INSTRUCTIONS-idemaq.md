# 📋 PROJECT INSTRUCTIONS — IDEMAQ (atualizadas em 16/05/2026)

Cole este bloco no FINAL das suas Project Instructions atuais (Settings → Project → Edit instructions), substituindo qualquer bloco antigo de "uso de ferramentas".

A lógica genérica de "qual ferramenta Claude usar pra cada tarefa" já está coberta pela skill `claude-tools-first` (que você instalou separadamente). Aqui ficam só os detalhes específicos do IDEMAQ.

---

## 🏭 CONTEXTO DE FERRAMENTAS DO IDEMAQ

### URLs e referências do projeto
- **Produção:** https://idemaq.vercel.app
- **GitHub:** https://github.com/silvaantoniofabricio-glitch/idemaq (branch principal: `main`)
- **Supabase:** https://yfbbruxqfzgetapbvrgd.supabase.co (região sa-east-1, São Paulo)
- **Pasta local no PC do dono:** `C:\Users\Toni-PC\projetos\idemaq`
- **Deploy:** automático via Vercel a cada `git push origin main` (~30 segundos)

### Fluxo padrão de mudança de código (passo a passo)

Quando o dono pedir mudanças no código, siga sempre essa ordem:

1. **(Aqui no chat)** Conversa de design → mockup com `visualize` tool → aprovação
2. **(Aqui no chat)** Gerar arquivo completo em `/mnt/user-data/outputs/` OU gerar prompt pro Claude Code aplicar
3. **(Aqui no chat)** Oferecer prompt pronto pro Claude do VS Code ou Claude Code aplicar (NÃO esperar que o dono rode git manualmente)
4. **(Claude do VS Code ou Claude Code)** Dono cola o prompt → roda `git status` → `git add .` → `git commit` → `git push origin main`
5. **(Claude in Chrome — proativo)** Confirmar que commit chegou em `github.com/silvaantoniofabricio-glitch/idemaq/commits/main`
6. **(Claude in Chrome)** Abrir `idemaq.vercel.app`, fazer hard refresh, testar funcionalidade
7. **(Claude in Chrome)** Tirar screenshot da evidência pra mostrar ao dono

### Diagnóstico de "não funcionou" no IDEMAQ

Erro mais comum: dono substitui arquivo local mas esquece de fazer `git push`. Sempre comece verificando isso.

Ordem padrão:
1. Chrome → `github.com/silvaantoniofabricio-glitch/idemaq/commits/main` → último commit é o que o dono fez?
   - **NÃO:** problema é git push pendente. Gerar prompt pro Claude do VS Code ou Claude Code.
   - **SIM:** continuar.
2. Chrome → painel Vercel do projeto → status do deploy (verde/amarelo/vermelho)
3. Chrome → `idemaq.vercel.app` com hard refresh → reproduzir o problema
4. Chrome → `read_console_messages` se for erro de runtime
5. Chrome → `read_network_requests` se for erro de API/Supabase

### Prompts prontos pro Claude do VS Code

**Modelo padrão de prompt pra dar ao dono:**
```
Preciso enviar minhas alterações locais pro GitHub. Por favor:

1. Rode `git status` e me mostre o resultado pra confirmar quais arquivos foram modificados.

2. Se confirmar as modificações esperadas, execute na sequência:
   git add .
   git commit -m "<mensagem descritiva>"
   git push origin main

3. Se algum comando der erro, me mostre o erro completo e tente resolver:
   - "please tell me who you are" → me pergunte nome e email pra configurar git config
   - "rejected" ou "non-fast-forward" → rode git pull --rebase origin main primeiro
   - "permission denied" → me avise

4. Depois do push bem-sucedido, confirme com `git log -1 --oneline`.

Repositório: https://github.com/silvaantoniofabricio-glitch/idemaq
Branch: main
```

### Como Toni trabalha (workflow paralelo via Claude Code) — atualizado 17/05/2026

**Setup principal**: Toni hoje edita e constrói o projeto **principalmente via terminais do Claude Code rodando localmente**, e não via Claude do chat web. Isso muda o que faz sentido sugerir/oferecer:

- **Múltiplos terminais em paralelo**: Toni mantém **vários terminais abertos simultaneamente** (1 por página/feature que está construindo). Isso permite que ele trabalhe em features independentes em paralelo, sem misturar contextos. **7 terminais configurados (17/05/2026)**: `Painel Idemaq`, `OS Idemaq`, `Clientes Idemaq`, `Logistica Idemaq`, `Estoque Idemaq`, `Financeiro Idemaq`, `Relatorios Idemaq`.
- **Atalhos no Desktop**: cada terminal é um `.lnk` salvo no Desktop. Cada atalho aponta pra `cmd /c start "" wt.exe --title "Nome" -d "C:\Users\Toni-PC\projetos\idemaq" powershell -NoExit -Command "$env:IDEMAQ_TERMINAL = '<area>'; ...banner ciano...; claude"` — abre Windows Terminal com nome próprio, **seta env var `IDEMAQ_TERMINAL`**, mostra banner ciano com o foco e roda `claude`.
- **Identificar terminal atual**: Claude Code pode rodar `echo $env:IDEMAQ_TERMINAL` (PowerShell) ou checar via Bash pra saber qual terminal está usando. Lista completa dos focos no `CLAUDE.md` seção "Terminais dedicados" e na memória `project_terminais_dedicados`.
- **Tudo dentro da pasta do projeto**: todos os terminais rodam em `C:\Users\Toni-PC\projetos\idemaq`. Cada terminal é uma sessão isolada do Claude Code mas todos veem o mesmo working tree (git status compartilhado).
- **Pasta de contexto**: existe uma pasta `CONTEXTO PROJETO ATUALIZADO/` na raiz do projeto que contém os 5 docs canônicos (`CLAUDE.md`, `Instruções do Projeto.md`, `Plano de Criacao.md`, `PROJECT-INSTRUCTIONS-idemaq.md`, `SKILL.md`). Esses arquivos são **atualizados conforme Toni pede** ao final de cada bloco de trabalho relevante — qualquer sessão futura tem o estado mais recente do projeto carregado a partir dali. O `CLAUDE.md` da raiz é uma cópia sincronizada com o da pasta (o Claude Code só lê o da raiz automaticamente).

**Implicações práticas pra sessões Claude Code**:
- Toni pode estar trabalhando outra feature em terminal paralelo — antes de mexer em arquivos compartilhados (App.jsx, osData.js, theme.js, índices), checar `git status` primeiro pra ver se há mudanças não relacionadas em curso, e evitar conflito.
- Ao final de uma feature/bloco importante, **oferecer atualizar `CONTEXTO PROJETO ATUALIZADO/`** (o user pede explicitamente também, mas é melhor a sessão lembrar antes que ele precise).
- Commit e push são feitos diretamente pelo Claude Code da própria sessão (não precisa gerar prompt pro VS Code separado como era no fluxo antigo de chat web).

### Sobre o dono (Toni)

- **Não é programador.** Evitar jargão sem explicar.
- **Daltônico Deutan.** Toda decisão visual precisa respeitar a paleta (já documentada no CLAUDE.md do projeto).
- **Prefere visual e simples.** Use a `visualize` tool pra desenhar antes de codar.
- **Mil "nãos" por um "sim".** Nunca implemente funcionalidade não pedida.

### Anti-patterns específicos do IDEMAQ

- ❌ Mexer em `src/_legacy/` sem aprovação explícita do dono (regra no CLAUDE.md)
- ❌ Usar cor hardcoded — sempre via `T.*`, `P.*` ou helpers
- ❌ Pedir pro dono "abre o terminal e roda git status" — gere prompt pro Claude do VS Code ou Claude Code
- ❌ Pedir pro dono "abre o site e me diz se mudou" — abra pelo Chrome
- ❌ Pedir pro dono "olha o console do navegador" — leia pelo Chrome via `read_console_messages`
- ❌ Esquecer de oferecer proativamente verificação no Chrome após cada deploy

---

## 🆕 DECISÕES DE PRODUTO — NOVA OS (atualizadas 16/05/2026)

Decisões tomadas em conversa com o dono e refletidas no formulário de Nova OS. Respeitar estas decisões em futuras alterações.

### Formato do formulário

- **Sem Passo 1 de escolha de tipo.** O modal abre direto no formulário, com tipo padrão **Atendimento**
- **Botão sutil de tipo no header** (logo abaixo do título "Nova ordem de serviço") permite trocar entre Atendimento / Venda / Fabricação via dropdown
- Ordem dos tipos no dropdown sempre: **Atendimento → Venda → Fabricação**
- Cada tipo tem cor própria: Atendimento (azul `P.blue`), Venda (azul claro `P.blueLight` / `#B8CCE4`), Fabricação (amarelo `P.yellow`)
- Dropdown deve incluir aviso sutil: "Trocar o tipo pode pedir campos diferentes"

### Campos do formulário de Atendimento

**Único campo obrigatório:** Cliente

**Cliente:**
- Busca por nome ou telefone
- Botão "+ Cadastrar novo cliente" abre sub-modal completo
- Quando selecionado, mostra card destacado azul com nome + telefone + qtd. de endereços + botão Trocar
- Se cliente tem >1 endereço, mostrar radio com os endereços cadastrados (Endereço 1 com badge "PRINCIPAL" pré-selecionado)

**Equipamento (opcional, dono preenche depois quando máquina chegar):**
- **Tipo:** dropdown com Máquina de Lavar / Lava e Seca / Tanquinho / Micro-ondas
- **"Máquina de Lavar" sempre pré-selecionado por padrão** (item mais comum)
- **Marca:** dropdown com Brastemp / Electrolux / Consul / Outros
- Quando Marca = "Outros", revelar campo texto "Nome da marca"
- **Modelo:** texto livre
- **Nº de série:** texto livre

**Defeito relatado:** opcional, textarea

**Agendamento da coleta:** Data + Hora (opcionais)
- Banner azul informativo: "Sem data marcada? A OS abre como Aguardando agendamento"

**Observações:** opcional, textarea

### Sub-modal de cadastro completo de cliente

**Obrigatórios:** Nome, Telefone principal, Endereço 1
**Opcionais:** CPF/CNPJ, E-mail, Telefone secundário, Endereços 2 e 3

- Botão "+ Adicionar outro endereço" inicia recolhido — abre Endereço 2 ao clicar, depois Endereço 3
- Limite máximo: 3 endereços (botão "Adicionar" some no limite)
- Cada endereço extra tem botão Remover individual
- Validação Google Maps Places no campo de endereço (planejado, ainda não implementado)
- Telefone principal mostra indicador "WhatsApp principal" (badge azul abaixo do campo)

### Foto da máquina — NÃO entra na criação da OS

**Decisão importante:** Foto NÃO é capturada no formulário de Nova OS.

**Por quê:** Quando a OS é criada, a máquina ainda está na casa do cliente — não há como fotografar. A foto será capturada em **etapa futura do fluxo** (provavelmente Coleta ou Recebido).

**Regra de negócio futura:** OS de Atendimento ou Fabricação só pode sair da zona Externa (Aguardando agendamento, Agendamento) pra zona Interna (Recebido, Diagnóstico, Em oficina, Teste final) se tiver pelo menos 1 foto anexada.

### Padrões visuais

- Tudo no padrão dark mode com prop `T` (sem cor hardcoded)
- Paleta Deutan: `#5B9BD5` azul, `#FFD966` amarelo, `#FF6B6B` vermelho, `#B8CCE4` azul claro
- Ícones Tabler (`ti ti-nome`)
- Ícone de seção colorido em azul `P.blue` como âncora visual
- Asterisco vermelho pequeno `*` indica obrigatório
- Texto "opcional" em cinza claro indica opcional
- Status no header em tempo real: ex "selecione um cliente" → "pronto para criar"

### O que NÃO existe (ainda) no formulário

- ❌ Campo "Prioridade" (Normal/Urgente) — removido após decisão do dono
- ❌ Campo "Responsável pela coleta" — quem fizer o trabalho fica registrado automaticamente no histórico da OS (regra: sem responsável fixo por OS, só por etapa)
- ❌ Campo de foto na criação — virá em etapa posterior do fluxo
- ❌ Salvar no Supabase — atualmente só `alert()` mock. Conectar ao banco é tarefa do Módulo 02 do roadmap.

---

**Fim do bloco IDEMAQ-específico.**

A lógica genérica de uso de ferramentas Claude (Chrome, Code, VS Code, Cowork) está na skill `claude-tools-first` que carrega automaticamente.
