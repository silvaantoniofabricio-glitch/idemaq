---
name: skill-os-assistencia-tecnica
description: Fluxo completo de Ordem de Serviço (OS) para assistência técnica de eletrodomésticos, eletrônicos ou qualquer serviço técnico. Use quando o usuário precisar modelar, construir ou entender o fluxo de OS, kanban de atendimento, etapas de diagnóstico, orçamento, execução e entrega, regras de negócio de serviço técnico, ou qualquer sistema de gestão de ordens de serviço. Inclui os 3 tipos de OS, regras de montagem, pagamento misto e fluxo de garantia.
---

# Ordem de Serviço — Assistência Técnica

## 3 Tipos de OS

### Atendimento (equipamento do cliente)
```
Fluxo completo:
Ag. agendamento → Agendado → Recebido → Diagnóstico → Orçamento
→ Aprovado → Limpeza + Manutenção (simultâneos)
→ Finalizado → Teste final + Acabamento
→ Entregas → Agendado → Entregue
→ Pagamento → Concluído

Saída lateral em Orçamento:
→ Recusado → cobra taxa diagnóstico → devolve equipamento
→ Opção: converter para OS de Fabricação (se cliente quiser vender)
```

### Fabricação (equipamento para estoque)
```
Origens:
  a) Compra direta do equipamento
  b) Conversão de OS Recusada (cliente quer vender)
     → Diagnóstico pré-preenchido com dados da OS original

Fluxo:
Diagnóstico → Limpeza + Manutenção → Teste final
→ Equipamento entra no estoque com custo total
→ Itens usados saem do estoque automaticamente
→ OS vai para Concluído
```

### Venda (produto pronto)
```
Fluxo simplificado:
Agendamento → Entregue → Pagamento → Concluído

Exemplos: venda de equipamento reformado, acessório, capa
Comprador sempre vira cliente cadastrado
```

## Regras críticas

### Abertura de OS
- OS abre no **agendamento**, não no recebimento do equipamento
- Número sequencial único gerado automaticamente

### Etapas simultâneas (Limpeza + Manutenção)
```
Quando OS tem AMBAS as etapas:
  Montagem de limpeza    → só ativa quando LIMPEZA concluída 100%
  Montagem de manutenção → só ativa quando MANUTENÇÃO concluída 100%
  
  ↑ as duas etapas precisam estar completas
    antes de qualquer montagem começar
```

### Orçamento
- Editável até o momento do pagamento (mesmo durante a entrega)
- Pode adicionar itens a qualquer momento antes de pagar
- Desconto: campos R$ e % bidirecionais (um atualiza o outro)
- Geração de documento: WhatsApp, PDF, impressão

### Aprovação do orçamento
```
Estados: Editando → Enviado → Aprovado / Recusado

Ao enviar: bloqueia edição até cliente responder
Se precisar editar após envio: reabre edição + obriga reenvio
Registrar: por quem foi aprovado, data e hora
```

### Itens da OS
- Chamados de **"itens"** (não "peças") — cobre equipamentos, acessórios, materiais
- Tipos: serviço · item/produto · custo de fabricação
- Para OS de fabricação: itens viram **custo**, não receita

### Kanban
- OS some do Kanban **24 horas** após concluída
- Arquivamento automático no prazo configurado
- Cores por urgência: vermelho (atrasada), amarelo (próxima do prazo), normal

## Pré-diagnóstico (recebimento)
```
4 testes de entrada:
  Entrada de água: ok / defeito / barulho
  Saída de água:  ok / defeito / barulho
  Agitação:       ok / defeito / barulho
  Centrifugação:  ok / defeito / barulho

+ Observações livres
+ Foto obrigatória na coleta (com opção pular)
```

## Checklist por etapa
```
Limpeza:
  □ Desmontagem
  □ Limpeza do tambor
  □ Limpeza do gabinete
  □ Limpeza dos filtros
  □ Limpeza da bomba
  □ Montagem

Manutenção:
  □ Diagnóstico completo
  □ Substituição de peças
  □ Verificação elétrica
  □ Lubrificação
  □ Montagem

Teste final:
  □ Entrada de água
  □ Ciclo de lavagem
  □ Centrifugação
  □ Saída de água
  □ Verificação de ruídos
  □ Acabamento visual
```

## Teste final — registro de falha
```
Se falha detectada:
  Tipo: sujeira / defeito / ambos
  Descrição detalhada
  → retorna para etapa correspondente
  → novo teste após correção
```

## Pagamento
```
Formas aceitas: PIX · cartão · dinheiro · a prazo (combinado)
Pagamento misto: múltiplas formas na mesma OS

Para cartão:
  → selecionar maquininha (InfinitePay / Ton Black)
  → selecionar modalidade (débito / 1x a 12x)
  → taxa calculada automaticamente
  → valor líquido exibido

Link de pagamento:
  → sempre pela maquininha com prazo D+1
  → Ton Black link = 30 dias → não usar

A prazo:
  → data de vencimento obrigatória
  → vai para "Contas a receber" automaticamente
  → alertas de inadimplência configuráveis

Confirmar pagamento:
  → total lançado deve bater exatamente com total da OS
  → botão confirmar só libera quando valores batem
```

## Comprovante / documento
```
Gerado ao confirmar pagamento ou ao aprovar orçamento:
  Dados do cliente (nome, telefone, endereço, CPF se disponível)
  Dados do equipamento (marca, modelo, série)
  Lista de itens e serviços com valores
  Desconto se houver
  Total e forma de pagamento
  Campo de assinatura do cliente
  Texto de garantia
  
Formatos: WhatsApp (link) · PDF · Impressão
```

## Garantia
```
Prazo padrão configurável:
  Peças: 90 dias
  Serviço: 30 dias

Ao acionar garantia:
  → registrar tipo do problema
  → vincular OS nova à OS de origem
  → histórico completo disponível no cadastro do cliente
```

## Logística (coleta e entrega)
```
Rota diária:
  Coletas + entregas na mesma rota
  Sequência definida pelo operador
  
Para cada parada:
  Nome, endereço, telefone, horário
  Observações (código de entrada, andar, etc.)
  
Ao concluir coleta:
  → tirar foto do equipamento (obrigatório, com opção pular)
  → marcar coleta realizada
  
Ao concluir entrega:
  → marcar entrega realizada
  → foto opcional
```

## Clientes
```
Cadastro:
  Nome, telefone (WhatsApp), CPF (opcional)
  Até 3 endereços (com label: principal, trabalho, etc.)
  Observações de acesso (código, andar, campainha)
  Histórico completo de OS
  
Última atividade:
  Exibir tempo desde última OS
  Status: "2d · em andamento" ou "8m · sem OS ativa"
  Usado para disparar agente de reativação
```

## Kanban — 11 colunas
```
1. Aguardando agendamento
2. Agendado
3. Recebido
4. Diagnóstico
5. Orçamento
6. Limpeza
7. Manutenção
8. Finalizado
9. Entregas
10. Recusado
11. Concluído (some após 24h)
```

## Relatórios de OS
```
Volume por status e tipo
Tempo médio por etapa
Taxa de aprovação de orçamentos
Taxa de recusa + motivos
OS por marca/modelo de equipamento
Falhas no teste por tipo e frequência
Retornos de garantia + custo associado
Desempenho por técnico/funcionário
```
