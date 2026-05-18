-- sql/seed-os-teste.sql
-- Popula o banco com 5 OS de teste pra desenvolvimento (Módulo 00c · Lote 1).
--
-- ⚠️ ANTES DE RODAR:
-- 1. Abrir o SQL Editor: https://yfbbruxqfzgetapbvrgd.supabase.co/project/_/sql
-- 2. Rodar PRIMEIRO o bloco "Pegar UUIDs" abaixo pra anotar os IDs reais
-- 3. Substituir TODOS os placeholders <UUID_*> abaixo pelos valores anotados
-- 4. Rodar o bloco "BEGIN ... COMMIT" inteiro de uma vez
-- 5. Anotar os UUIDs e numeros retornados pelos INSERT (pra rodar o bloco
--    de itens da OS 4 logo depois)

-- ============================================================================
-- BLOCO 1 — PEGAR UUIDs REAIS (rodar primeiro, anotar resultado)
-- ============================================================================

-- SELECT 'CLIENTES' as tipo, id, nome FROM cliente WHERE deleted_at IS NULL ORDER BY nome;
-- SELECT 'USUARIOS' as tipo, id, apelido, papel FROM usuarios WHERE ativo = true ORDER BY papel;

-- ============================================================================
-- BLOCO 2 — INSERIR AS 5 OS (substituir <UUID_*> antes de rodar)
-- ============================================================================

BEGIN;

-- ⚠️ SUBSTITUIR pelos UUIDs reais:
-- <UUID_CLIENTE_1> = primeiro cliente da lista (ex: Ana Reis)
-- <UUID_CLIENTE_2> = segundo cliente
-- <UUID_CLIENTE_3> = terceiro cliente
-- <UUID_USUARIO_TONI>       = papel=dono
-- <UUID_USUARIO_ALESSANDRO> = papel=logistica
-- <UUID_USUARIO_GUILHERME>  = papel=oficina

-- OS 1: Atendimento em Recebido
INSERT INTO os (cliente_id, tipo, etapa, marca_equipamento, modelo_equipamento, defeito_relatado, data_agendamento, criado_por)
VALUES (
  '<UUID_CLIENTE_1>', 'atendimento', 'recebido',
  'Brastemp', 'BWK11A', 'Não centrifuga, faz barulho na entrada de água',
  NOW() - INTERVAL '5 days',
  '<UUID_USUARIO_ALESSANDRO>'
)
RETURNING id, numero;

-- OS 2: Atendimento em Diagnóstico
INSERT INTO os (cliente_id, tipo, etapa, marca_equipamento, modelo_equipamento, defeito_relatado, data_agendamento, criado_por)
VALUES (
  '<UUID_CLIENTE_2>', 'atendimento', 'diagnostico',
  'Consul', 'CWF10', 'Não esquenta água',
  NOW() - INTERVAL '3 days',
  '<UUID_USUARIO_ALESSANDRO>'
)
RETURNING id, numero;

-- OS 3: Atendimento em Em oficina
INSERT INTO os (cliente_id, tipo, etapa, marca_equipamento, modelo_equipamento, defeito_relatado, data_agendamento, criado_por)
VALUES (
  '<UUID_CLIENTE_3>', 'atendimento', 'em_oficina',
  'Electrolux', 'LTR12', 'Trava no enxágue',
  NOW() - INTERVAL '7 days',
  '<UUID_USUARIO_GUILHERME>'
)
RETURNING id, numero;

-- OS 4: Atendimento em Orçamento (com valor)
INSERT INTO os (cliente_id, tipo, etapa, marca_equipamento, modelo_equipamento, defeito_relatado, data_agendamento, valor_total, criado_por)
VALUES (
  '<UUID_CLIENTE_1>', 'atendimento', 'orcamento',
  'Brastemp', 'BWL11', 'Vazamento na base',
  NOW() - INTERVAL '4 days',
  385.00,
  '<UUID_USUARIO_GUILHERME>'
)
RETURNING id, numero;

-- OS 5: Fabricação em Em oficina (sem cliente — máquina pra estoque)
INSERT INTO os (cliente_id, tipo, etapa, marca_equipamento, modelo_equipamento, defeito_relatado, data_agendamento, criado_por)
VALUES (
  NULL, 'fabricacao', 'em_oficina',
  'Consul', 'CWC14', 'Máquina pra reforma e revenda',
  NOW() - INTERVAL '10 days',
  '<UUID_USUARIO_TONI>'
)
RETURNING id, numero;

COMMIT;

-- ============================================================================
-- BLOCO 3 — INSERIR ITENS NA OS 4 (rodar depois, com o UUID anotado)
-- ============================================================================

-- ⚠️ Substituir <UUID_OS_4> pelo UUID retornado pelo INSERT da OS 4 acima

-- INSERT INTO os_item (os_id, tipo, nome, qtd, valor_unitario, valor_total) VALUES
-- ('<UUID_OS_4>', 'servico', 'Limpeza completa',         1, 185.00, 185.00),
-- ('<UUID_OS_4>', 'peca',    'Mangueira de vazão',       1,  45.00,  45.00),
-- ('<UUID_OS_4>', 'servico', 'Manutenção do timer',      1, 155.00, 155.00);

-- ============================================================================
-- BLOCO 4 — VERIFICAR (rodar depois pra confirmar)
-- ============================================================================

-- SELECT id, numero, tipo, etapa, criado_em FROM os WHERE deleted_at IS NULL ORDER BY criado_em DESC;
-- SELECT * FROM os_item WHERE deleted_at IS NULL ORDER BY criado_em DESC LIMIT 10;
-- SELECT * FROM os_historico ORDER BY criado_em DESC LIMIT 10;
