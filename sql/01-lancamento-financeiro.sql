-- =========================================================================
-- IDEMAQ — Schema Parte 2 — `lancamento_financeiro` + `conta_bancaria`
-- Atualizado 19/05/2026 — MIGRAÇÃO FORÇADA + SEED
--
-- Histórico:
--   18/05/2026  v1 com FK pra categoria_financeira + enums (lancamento_tipo,
--               lancamento_status, lancamento_natureza, forma_pagamento).
--   19/05/2026  v2 simplifica: categoria text livre, status derivado de
--               pago_em IS NULL, taxa_pct por lançamento, sem enums de
--               natureza/parcelamento/recorrencia.
--
-- POR QUE DROPAR? O banco já recebeu v1 em produção (tabelas existem com o
-- schema antigo, mas zero linhas). O hook `useFinanceiro.js` consome v2.
-- A query do hook (`select id, tipo, vencimento, pago_em, taxa_pct, ...`)
-- falha com `42703 column "vencimento" does not exist` enquanto o schema
-- antigo estiver no lugar. Como a tabela está vazia, derrubar e recriar é
-- seguro e idempotente.
--
-- AÇÃO PRA TONI: copiar este arquivo INTEIRO no Supabase SQL Editor e
-- rodar. Depois, atualizar a página /financeiro — banner amarelo some.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 0. LIMPEZA do schema antigo (v1 — 18/05/2026)
-- =========================================================================
-- CASCADE derruba policies, triggers, índices e FKs dependentes.

DROP TABLE IF EXISTS lancamento_financeiro CASCADE;
DROP TABLE IF EXISTS categoria_financeira  CASCADE;
DROP TABLE IF EXISTS conta_bancaria        CASCADE;

DROP TYPE IF EXISTS lancamento_tipo;
DROP TYPE IF EXISTS lancamento_status;
DROP TYPE IF EXISTS lancamento_natureza;
DROP TYPE IF EXISTS forma_pagamento;

-- =========================================================================
-- 1. TABELA `conta_bancaria`
-- =========================================================================

CREATE TABLE conta_bancaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,         -- "Cresol", "Bradesco PJ", etc
  tipo text,                  -- 'banco' | 'cartao' | 'maquininha'
  bandeira text,              -- pra cartões/maquininhas
  saldo_atual numeric(12,2) DEFAULT 0,
  ativo boolean DEFAULT true,

  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

CREATE INDEX idx_conta_bancaria_ativo ON conta_bancaria(ativo) WHERE deleted_at IS NULL;

INSERT INTO conta_bancaria (nome, tipo) VALUES
  ('Cresol',              'banco'),
  ('Bradesco',            'banco'),
  ('Mercado Pago',        'banco'),
  ('Elo Grafite',         'cartao'),
  ('Bradesco Visa',       'cartao'),
  ('Mercado Pago Cartão', 'cartao'),
  ('Bradesco PJ',         'cartao'),
  ('Cresol Cartão',       'cartao'),
  ('Nubank PJ',           'cartao'),
  ('Inter',               'cartao'),
  ('InfinitePay',         'maquininha'),
  ('Ton Black',           'maquininha');

-- =========================================================================
-- 2. TABELA `lancamento_financeiro` (schema simplificado v2)
-- =========================================================================

CREATE TABLE lancamento_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classificação
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),

  -- Valores
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),

  -- Categoria (text livre — sugestões em CATEGORIAS_SUGESTAO do hook)
  categoria text,

  -- Descrição
  descricao text,

  -- Conta bancária (FK opcional)
  conta_id uuid REFERENCES conta_bancaria(id),

  -- Datas (status implícito: pago_em IS NULL = aberto)
  vencimento date NOT NULL,
  pago_em date,

  -- Taxa da maquininha (% sobre o valor — D+1 útil vira despesa automática)
  taxa_pct numeric(6,3) DEFAULT 0 CHECK (taxa_pct >= 0),

  -- Forma de pagamento (text livre — convenção de enum: pix/dinheiro/debito/
  -- credito_1x/credito_parcelado/link_pagamento/boleto/transferencia/a_prazo)
  forma_pagamento text,

  -- Vínculo com OS (quando aplicável)
  os_id uuid REFERENCES os(id),

  -- Auditoria padrão Idemaq
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

CREATE INDEX idx_lanc_tipo       ON lancamento_financeiro(tipo)       WHERE deleted_at IS NULL;
CREATE INDEX idx_lanc_vencimento ON lancamento_financeiro(vencimento) WHERE deleted_at IS NULL;
CREATE INDEX idx_lanc_pago_em    ON lancamento_financeiro(pago_em)    WHERE deleted_at IS NULL;
CREATE INDEX idx_lanc_conta      ON lancamento_financeiro(conta_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_lanc_os         ON lancamento_financeiro(os_id)      WHERE os_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_lanc_categoria  ON lancamento_financeiro(categoria)  WHERE deleted_at IS NULL;

-- =========================================================================
-- 3. TRIGGER de auditoria (padrão Idemaq)
-- =========================================================================

CREATE TRIGGER tg_lanc_audit
  BEFORE INSERT OR UPDATE ON lancamento_financeiro
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

CREATE TRIGGER tg_conta_audit
  BEFORE INSERT OR UPDATE ON conta_bancaria
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 4. RLS — admin/dono only
-- =========================================================================

ALTER TABLE lancamento_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_bancaria        ENABLE ROW LEVEL SECURITY;

CREATE POLICY lanc_dono_only ON lancamento_financeiro
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

CREATE POLICY conta_dono_only ON conta_bancaria
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

-- =========================================================================
-- 5. SEED — dados de teste pra validar a UI imediatamente após aplicar
-- =========================================================================
-- 8 lançamentos: 3 a receber (1 vencido, 2 futuros), 2 a pagar, 3 caixa.
-- Datas relativas a CURRENT_DATE pra não envelhecer o seed.

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT * FROM (VALUES
  -- A RECEBER (pago_em null)
  ('receita'::text, 480.00::numeric, 'Manutenção'::text,        'Paula Mendes — Manutenção + Limpeza (OS #241)'::text,
     (SELECT id FROM conta_bancaria WHERE nome = 'Bradesco' LIMIT 1),
     (CURRENT_DATE - INTERVAL '12 days')::date, NULL::date, 0::numeric, 'boleto'::text),
  ('receita',       330.00,         'Limpeza',          'Maria Silva — Limpeza combinada x2 (OS #243)',
     (SELECT id FROM conta_bancaria WHERE nome = 'InfinitePay' LIMIT 1),
     (CURRENT_DATE - INTERVAL '2 days')::date, NULL, 6.30, 'credito_parcelado'),
  ('receita',       415.00,         'Manutenção',       'Roberto Dias — Manutenção + mangueira (OS #248)',
     (SELECT id FROM conta_bancaria WHERE nome = 'InfinitePay' LIMIT 1),
     (CURRENT_DATE + INTERVAL '5 days')::date, NULL, 3.15, 'credito_1x'),

  -- A PAGAR (pago_em null)
  ('despesa',       1650.00,        'Funcionários',     'Salário Alessandro',
     (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' LIMIT 1),
     (CURRENT_DATE + INTERVAL '3 days')::date, NULL, 0, 'pix'),
  ('despesa',       820.00,         'Peças',            'Compra de peças ML',
     (SELECT id FROM conta_bancaria WHERE nome = 'Bradesco PJ' LIMIT 1),
     (CURRENT_DATE - INTERVAL '1 day')::date,  NULL, 0, 'boleto'),

  -- CAIXA (pago_em preenchido)
  ('receita',       185.00,         'Limpeza',          'OS #239 — Maria Silva',
     (SELECT id FROM conta_bancaria WHERE nome = 'Bradesco' LIMIT 1),
     (CURRENT_DATE - INTERVAL '1 day')::date,  (CURRENT_DATE - INTERVAL '1 day')::date, 0, 'pix'),
  ('receita',       650.00,         'Venda de máquina', 'Venda M-201 — Carlos Lima',
     (SELECT id FROM conta_bancaria WHERE nome = 'InfinitePay' LIMIT 1),
     (CURRENT_DATE - INTERVAL '4 days')::date, (CURRENT_DATE - INTERVAL '4 days')::date, 9.50, 'credito_parcelado'),
  ('despesa',       180.00,         'Combustível',      'Combustível semana',
     (SELECT id FROM conta_bancaria WHERE nome = 'Inter' LIMIT 1),
     (CURRENT_DATE - INTERVAL '1 day')::date,  (CURRENT_DATE - INTERVAL '1 day')::date, 0, 'credito_1x')
) AS seed(tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento);

COMMIT;

-- =========================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO (rodar abaixo separado pra conferir):
--   SELECT count(*) FROM conta_bancaria;          -- esperado: 12
--   SELECT count(*) FROM lancamento_financeiro;   -- esperado: 8
--   SELECT tipo, count(*) FROM lancamento_financeiro GROUP BY tipo;
-- =========================================================================

-- =========================================================================
-- NOTAS / DEPENDÊNCIAS:
-- 1. Recorrência / parcelamento fora de escopo do v2. Tabelas separadas
--    `lancamento_recorrencia` / `lancamento_parcelamento` virão depois.
-- 2. Categoria virou text livre — sem `categoria_financeira`.
--    Sugestões pra UI ficam em `CATEGORIAS_SUGESTAO` no hook.
-- 3. Vínculo com OS é opcional. Lançamentos manuais têm os_id = NULL.
-- 4. Status é derivado: pago_em IS NULL → aberto · NOT NULL → pago.
-- 5. Funções esperadas no banco:
--      - tg_set_audit()  — trigger comum
--      - is_dono()       — usada em RLS
--    Se as RLS quebrarem por falta de is_dono(), comentar as 2 POLICIES.
-- 6. Taxa da maquininha em D+1 útil: calcular via
--    `calcularD1Util` em src/utils/financeiro.js ao gerar despesa
--    automática vinculada à receita confirmada por cartão/link.
-- =========================================================================
