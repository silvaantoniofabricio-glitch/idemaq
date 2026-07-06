-- =============================================================================
-- sql/113 — Reconstruir os_historico com base nos dados existentes hoje
--
-- Estratégia:
--   · Sequência de etapas por tipo usa os valores REAIS do banco (DB-side)
--   · Atribuição de funcionario_id por papel: logistica=Alessandro,
--     oficina=Guilherme, dono=Toni
--   · Timestamp: criado_em da OS + intervalo de 12h por etapa (aprox.)
--   · Não sobrescreve entradas reais — só insere o que está faltando
--   · observacao = 'reconstruido' marca esses registros como estimados
--
-- RODAR UMA VEZ. Idempotente (NOT EXISTS garante sem duplicatas).
-- =============================================================================

WITH

-- ── Usuários por papel ─────────────────────────────────────────────────────
u AS (
  SELECT id, papel FROM usuarios WHERE ativo = true
),
u_logistica AS (SELECT id FROM u WHERE papel = 'logistica' LIMIT 1),
u_oficina   AS (SELECT id FROM u WHERE papel = 'oficina'   LIMIT 1),
u_dono      AS (SELECT id FROM u WHERE papel = 'dono'      LIMIT 1),

-- ── Sequência de etapas por tipo (valores DB) ──────────────────────────────
-- papel_resp: quem é responsável por CHEGAR nessa etapa
seq(tipo, etapa, ord, papel_resp) AS (VALUES
  -- atendimento
  ('atendimento', 'aguardando_agendamento', 1,  'logistica'),
  ('atendimento', 'agendamento',            2,  'logistica'),
  ('atendimento', 'recebido',               3,  'oficina'),
  ('atendimento', 'diagnostico',            4,  'oficina'),
  ('atendimento', 'orcamento',              5,  'oficina'),
  ('atendimento', 'em_oficina',             6,  'oficina'),
  ('atendimento', 'teste_final',            7,  'oficina'),
  ('atendimento', 'entrega',                8,  'logistica'),
  ('atendimento', 'pagamento',              9,  'dono'),
  ('atendimento', 'concluido',             10,  'dono'),
  -- fabricacao
  ('fabricacao',  'diagnostico',            1,  'oficina'),
  ('fabricacao',  'em_oficina',             2,  'oficina'),
  ('fabricacao',  'teste_final',            3,  'oficina'),
  ('fabricacao',  'concluido',              4,  'dono'),
  -- venda
  ('venda',       'agendamento',            1,  'logistica'),
  ('venda',       'entrega',                2,  'logistica'),
  ('venda',       'pagamento',              3,  'dono'),
  ('venda',       'concluido',              4,  'dono')
),

-- ── Para cada OS, descobrir até qual ord ela chegou ────────────────────────
-- OS recusadas: tratamos como tendo chegado até 'recebido' (ord=3)
-- OS que não batem com nenhuma etapa da seq são ignoradas
os_ord AS (
  SELECT
    o.id     AS os_id,
    o.tipo,
    o.criado_em,
    o.etapa  AS etapa_atual,
    COALESCE(s.ord,
      CASE WHEN o.etapa = 'recusado' AND o.tipo = 'atendimento'
           THEN 3   -- recebido → recusado saiu daqui
           ELSE NULL
      END
    ) AS etapa_ord_max
  FROM os o
  LEFT JOIN seq s ON s.tipo = o.tipo AND s.etapa = o.etapa
  WHERE o.deleted_at IS NULL
),

-- ── Todas as etapas que cada OS deveria ter passado ────────────────────────
etapas_esperadas AS (
  SELECT
    oo.os_id,
    oo.tipo,
    oo.criado_em,
    s.etapa,
    s.ord,
    s.papel_resp,
    -- Distribui o tempo: criado_em + (ord * 12h)
    -- Limitamos a agora para não criar datas no futuro
    LEAST(
      NOW(),
      oo.criado_em + ((s.ord - 1) * INTERVAL '12 hours')
    ) AS data_aprox
  FROM os_ord oo
  JOIN seq s ON s.tipo = oo.tipo AND s.ord <= oo.etapa_ord_max
  WHERE oo.etapa_ord_max IS NOT NULL
),

-- ── Monta payload: etapa_de = etapa anterior na sequência ─────────────────
payload AS (
  SELECT
    ee.os_id,
    (SELECT s2.etapa FROM seq s2
     WHERE s2.tipo = ee.tipo AND s2.ord = ee.ord - 1) AS etapa_de,
    ee.etapa    AS etapa_para,
    ee.data_aprox AS data,
    CASE ee.papel_resp
      WHEN 'logistica' THEN (SELECT id FROM u_logistica)
      WHEN 'oficina'   THEN (SELECT id FROM u_oficina)
      WHEN 'dono'      THEN (SELECT id FROM u_dono)
    END AS funcionario_id,
    'reconstruido' AS observacao
  FROM etapas_esperadas ee
  -- Só insere o que não existe ainda
  WHERE NOT EXISTS (
    SELECT 1 FROM os_historico h
    WHERE h.os_id = ee.os_id
      AND h.etapa_para = ee.etapa
  )
)

INSERT INTO os_historico (os_id, etapa_de, etapa_para, data, funcionario_id, observacao)
SELECT os_id, etapa_de, etapa_para, data, funcionario_id, observacao
FROM payload
ORDER BY os_id, data;

-- Verificar resultado:
-- SELECT COUNT(*) FROM os_historico WHERE observacao = 'reconstruido';
-- SELECT COUNT(*) FROM os_historico WHERE observacao IS DISTINCT FROM 'reconstruido';
