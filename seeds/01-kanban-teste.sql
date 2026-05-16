-- ─────────────────────────────────────────────────────────────────────────────
-- SEED · Módulo 01 · Idemaq
-- 5 OS de teste distribuídas em etapas diferentes
-- Rodar no Supabase SQL Editor (Settings → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Clientes de teste ────────────────────────────────────────────────────────
INSERT INTO cliente (id, nome, telefone) VALUES
  ('11111111-0001-0000-0000-000000000001', 'Ana Reis',     '(67) 9 9911-1010'),
  ('11111111-0002-0000-0000-000000000001', 'João Costa',   '(67) 9 9922-2020'),
  ('11111111-0003-0000-0000-000000000001', 'Carlos Lima',  '(67) 9 9933-3030'),
  ('11111111-0004-0000-0000-000000000001', 'Marta Lopes',  '(67) 9 9944-4040'),
  ('11111111-0005-0000-0000-000000000001', 'Pedro Alves',  '(67) 9 9955-5050')
ON CONFLICT (id) DO NOTHING;

-- ── IDs fixos para as OS (usados nos historicos abaixo) ─────────────────────
-- OS 1: agendamento (atendimento) — coluna "Agendamento" no kanban
-- OS 2: diagnostico (atendimento)
-- OS 3: orcamento + recusada=true (atendimento) — para testar toggle recusado
-- OS 4: em_oficina (fabricacao) — limpeza OK, manutenção pendente (observacoes)
-- OS 5: concluido (atendimento, pago total) — mês atual

INSERT INTO os (
  id, tipo, etapa, cliente_id, valor_total, desconto,
  pago, valor_pago, forma_pagamento,
  garantia, os_origem_id, garantia_dias,
  recusada, aguardando_peca,
  prazo, data_conclusao
) VALUES

  -- OS 1: Ana Reis — agendamento (atendimento)
  (
    '22222222-0001-0000-0000-000000000001',
    'atendimento', 'agendamento',
    '11111111-0001-0000-0000-000000000001',
    0, 0,
    'nao', 0, NULL,
    false, NULL, 90,
    false, false,
    (NOW() + INTERVAL '2 days'), NULL
  ),

  -- OS 2: João Costa — diagnostico (atendimento)
  (
    '22222222-0002-0000-0000-000000000001',
    'atendimento', 'diagnostico',
    '11111111-0002-0000-0000-000000000001',
    0, 0,
    'nao', 0, NULL,
    false, NULL, 90,
    false, false,
    (NOW() + INTERVAL '1 day'), NULL
  ),

  -- OS 3: Carlos Lima — orcamento, recusada=true (atendimento)
  (
    '22222222-0003-0000-0000-000000000001',
    'atendimento', 'orcamento',
    '11111111-0003-0000-0000-000000000001',
    215, 0,
    'nao', 0, NULL,
    false, NULL, 90,
    true, false,
    (NOW() - INTERVAL '1 day'), NULL
  ),

  -- OS 4: Marta Lopes — em_oficina (fabricacao), aguardando peça
  (
    '22222222-0004-0000-0000-000000000001',
    'fabricacao', 'em_oficina',
    '11111111-0004-0000-0000-000000000001',
    380, 30,
    'nao', 0, NULL,
    false, NULL, 90,
    false, true,
    (NOW() + INTERVAL '3 days'), NULL
  ),

  -- OS 5: Pedro Alves — concluido (atendimento, pago PIX, garantia da OS 3)
  (
    '22222222-0005-0000-0000-000000000001',
    'atendimento', 'concluido',
    '11111111-0005-0000-0000-000000000001',
    420, 0,
    'total', 420, 'PIX',
    true, '22222222-0003-0000-0000-000000000001', 90,
    false, false,
    (NOW() - INTERVAL '5 days'), NOW()
  )

ON CONFLICT (id) DO NOTHING;

-- ── Histórico das OS ─────────────────────────────────────────────────────────
-- Tenta usar o primeiro usuário disponível como responsável.
-- Se a tabela usuarios estiver vazia, inserir um usuário antes de rodar este seed.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM usuarios WHERE deleted_at IS NULL ORDER BY criado_em LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário encontrado em usuarios. Insira usuários antes de rodar este seed.';
    RETURN;
  END IF;

  -- Historico OS 1: ag_agendamento → agendamento
  INSERT INTO os_historico (os_id, etapa_de, etapa_para, funcionario_id) VALUES
    ('22222222-0001-0000-0000-000000000001', NULL,            'aguardando_ag', v_user_id),
    ('22222222-0001-0000-0000-000000000001', 'aguardando_ag', 'agendamento',   v_user_id)
  ON CONFLICT DO NOTHING;

  -- Historico OS 2: ag_agendamento → agendamento → recebido → diagnostico
  INSERT INTO os_historico (os_id, etapa_de, etapa_para, funcionario_id) VALUES
    ('22222222-0002-0000-0000-000000000001', NULL,            'aguardando_ag', v_user_id),
    ('22222222-0002-0000-0000-000000000001', 'aguardando_ag', 'agendamento',   v_user_id),
    ('22222222-0002-0000-0000-000000000001', 'agendamento',   'recebido',      v_user_id),
    ('22222222-0002-0000-0000-000000000001', 'recebido',      'diagnostico',   v_user_id)
  ON CONFLICT DO NOTHING;

  -- Historico OS 3: ag_agendamento → agendamento → recebido → diagnostico → orcamento
  INSERT INTO os_historico (os_id, etapa_de, etapa_para, funcionario_id) VALUES
    ('22222222-0003-0000-0000-000000000001', NULL,            'aguardando_ag', v_user_id),
    ('22222222-0003-0000-0000-000000000001', 'aguardando_ag', 'agendamento',   v_user_id),
    ('22222222-0003-0000-0000-000000000001', 'agendamento',   'recebido',      v_user_id),
    ('22222222-0003-0000-0000-000000000001', 'recebido',      'diagnostico',   v_user_id),
    ('22222222-0003-0000-0000-000000000001', 'diagnostico',   'orcamento',     v_user_id)
  ON CONFLICT DO NOTHING;

  -- Historico OS 4: diagnostico → em_oficina (fabricacao)
  INSERT INTO os_historico (os_id, etapa_de, etapa_para, funcionario_id) VALUES
    ('22222222-0004-0000-0000-000000000001', NULL,          'diagnostico', v_user_id),
    ('22222222-0004-0000-0000-000000000001', 'diagnostico', 'em_oficina',  v_user_id)
  ON CONFLICT DO NOTHING;

  -- Historico OS 5: fluxo completo até concluido
  INSERT INTO os_historico (os_id, etapa_de, etapa_para, funcionario_id) VALUES
    ('22222222-0005-0000-0000-000000000001', NULL,            'aguardando_ag', v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'aguardando_ag', 'agendamento',   v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'agendamento',   'recebido',      v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'recebido',      'diagnostico',   v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'diagnostico',   'orcamento',     v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'orcamento',     'em_oficina',    v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'em_oficina',    'teste_final',   v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'teste_final',   'entrega',       v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'entrega',       'pagamento',     v_user_id),
    ('22222222-0005-0000-0000-000000000001', 'pagamento',     'concluido',     v_user_id)
  ON CONFLICT DO NOTHING;

END $$;
