# Trecho para adicionar nas Instruções Mestras (idemaq-instrucoes-projeto.md)

Adicione esta seção **logo antes** do bloco "👨‍💻 INSTRUÇÕES DE TRABALHO PARA O CLAUDE":

---

## 🧰 FERRAMENTAS DO CLAUDE — QUANDO USAR CADA UMA

O dono usa várias ferramentas do Claude (Anthropic) no fluxo do projeto. Cada chat ou ação deve usar a ferramenta certa pra ganhar produtividade.

### Diferença entre Claude Code e extensão do Claude no VS Code

| Aspecto | **Claude Code** (CLI no terminal) | **Extensão do Claude no VS Code** |
|---|---|---|
| Modo de trabalho | Agente autônomo — recebe a tarefa e executa | Assistente — o dono dirige a edição |
| Bom pra | Tarefas grandes e contínuas (conectar módulo inteiro, refatorar muitos arquivos) | Edições pontuais acompanhadas linha a linha |
| Navega o projeto inteiro? | Sim, autonomamente | Mais focado no arquivo aberto |
| Roda comandos (`npm run dev`, `git`)? | Sim, com permissão | Não direto |
| Velocidade em módulos grandes | Muito mais rápido | Mais lento, mais manual |

**Regra prática**: módulo novo ou refatoração grande → **Claude Code**. Ajuste pequeno num trecho → extensão do VS Code.

### Mapa de uso por tipo de tarefa

| Tarefa | Ferramenta recomendada |
|---|---|
| Discutir decisões de negócio, brainstorm, planejar módulos | **Claude.ai** (web ou app desktop) |
| Gerar SQL, markdown, planos, documentos longos | **Claude.ai** (web ou app desktop) |
| Aplicar SQL no Supabase, automatizar painéis web | **Claude in Chrome** (extensão) |
| **Implementar módulo inteiro no código** (refatorar, conectar Supabase, criar features) | **Claude Code (CLI no terminal)** |
| Pequenas mudanças pontuais (1–3 trechos num arquivo) | Extensão do Claude no VS Code (ou Claude.ai gerando `.md` LOCALIZAR/SUBSTITUIR) |
| Testes visuais, screenshots, fluxos no navegador | **Claude in Chrome** |
| Organizar arquivos do computador fora do código | **Cowork** (beta, desktop) |

### Recomendação por módulo do projeto

| Módulo | Ferramentas sugeridas |
|---|---|
| **00b — Schema do Banco** ✅ concluído | Claude.ai (planejar + SQL) → Claude in Chrome (aplicar no Supabase) |
| **01 — Kanban de OS** | Claude.ai (decisões + plano) → **Claude Code** (implementar) → Claude in Chrome (testes visuais) |
| **02 — Formulário Nova OS** | Claude.ai (decisões) → **Claude Code** (implementar) |
| **03 — Fluxo da OS** | Claude.ai (decisões) → **Claude Code** (implementar) → Claude in Chrome (testes de drag-and-drop e estados) |
| **04 — Clientes** | **Claude Code** (CRUD direto, módulo pequeno) |
| **05 — Logística (Google Maps)** | Claude.ai (planejar integração Places API) → **Claude Code** (implementar) |
| **06 — Estoque** | Claude.ai (schema parte 2) → Claude in Chrome (SQL no Supabase) → **Claude Code** (UI) |
| **07 — Financeiro** | Claude.ai (schema parte 2 + DRE) → Claude in Chrome (SQL) → **Claude Code** (UI) |
| **08 — Relatórios com IA** | Claude.ai (prompts e prototipagem das análises) → **Claude Code** (integração) |
| **09 — Configurações** | **Claude Code** (formulários simples) |
| **10 — Automações n8n + Z-API** | Claude.ai (planejar webhooks) → Claude in Chrome (configurar n8n e Z-API no navegador) → **Claude Code** (endpoints no front) |
| **11 — Agente de reativação** | Claude.ai (prompts) → **Claude Code** (integração) |

### Regra geral

```
DISCUSSÃO E PLANEJAMENTO    →  Claude.ai (chat web/app)
GERAÇÃO DE SQL / MARKDOWN    →  Claude.ai (chat web/app)
APLICAR SQL NO SUPABASE      →  Claude in Chrome
IMPLEMENTAR MÓDULO INTEIRO   →  Claude Code (CLI no terminal)
AJUSTE PONTUAL EM 1 TRECHO   →  Extensão Claude no VS Code
TESTES VISUAIS NO NAVEGADOR  →  Claude in Chrome
```

### Fluxo padrão de um módulo novo

1. **Claude.ai (chat)**: discute as decisões pendentes, fecha o plano, escreve o prompt de implementação
2. **Claude Code (CLI)**: recebe o plano, lê o `App.jsx` atual, faz as alterações necessárias, roda `npm run dev`, valida, e faz `git push` quando aprovado
3. **Claude in Chrome**: testa visualmente o módulo no app deployado (idemaq.vercel.app), tira screenshots de bugs se houver
4. Se houver bugs pequenos: extensão do VS Code resolve pontualmente; bugs grandes voltam pro Claude Code

### O que cada Claude deve fazer

**Claude.ai (chat web/app):**
- Sempre lembrar o dono qual ferramenta usar pra cada tipo de tarefa
- No início de cada módulo novo, **avisar** qual combinação de ferramentas é a melhor
- Nunca tentar editar arquivos locais (não tem acesso direto ao disco do dono)
- Pode gerar `.md` com blocos LOCALIZAR/SUBSTITUIR pro Claude do VS Code aplicar
- Quando o trabalho exigir editar `App.jsx` (3.181+ linhas), recomendar migração pro **Claude Code (CLI)**

**Claude Code (CLI):**
- Edita o projeto inteiro com autonomia
- Roda `npm run dev`, valida sintaxe, vê erros
- Faz `git add` / `git commit` / `git push` quando autorizado
- Reporta progresso ao dono

**Extensão do Claude no VS Code:**
- Ajustes pontuais em arquivos abertos
- Refatorar trechos pequenos enquanto o dono acompanha

**Claude in Chrome:**
- Aplica SQL no Supabase via UI
- Faz testes visuais no app deployado
- Configura painéis externos (n8n, Z-API, Google Maps)
- Tira screenshots pra documentar bugs ou estado da UI

---
