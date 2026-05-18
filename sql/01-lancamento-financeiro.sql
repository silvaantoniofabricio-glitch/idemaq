-- =========================================================================
-- IDEMAQ — Schema Parte 2 — Tabela `lancamento_financeiro`
-- Data: 18/05/2026
-- Aplicar via Supabase SQL Editor (Toni cola amanhã)
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. ENUMS
-- =========================================================================

CREATE TYPE lancamento_tipo AS ENUM ('receita', 'despesa');

CREATE TYPE lancamento_status AS ENUM ('pendente', 'pago', 'vencido', 'cancelado');

CREATE TYPE lancamento_natureza AS ENUM ('avulso', 'parcelado', 'recorrente');

CREATE TYPE forma_pagamento AS ENUM (
  'pix',
  'dinheiro',
  'debito',
  'credito_1x',
  'credito_parcelado',
  'link_pagamento',
  'boleto',
  'transferencia',
  'a_prazo'
);

-- =========================================================================
-- 2. TABELA `categoria_financeira` (categorias configuráveis)
-- =========================================================================

CREATE TABLE categoria_financeira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo lancamento_tipo NOT NULL,
  icone text,  -- nome do Tabler Icon
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,

  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

CREATE INDEX idx_categoria_financeira_tipo ON categoria_financeira(tipo) WHERE deleted_at IS NULL;

-- Categorias iniciais (espelham planejamento)
INSERT INTO categoria_financeira (nome, tipo, icone, ordem) VALUES
  ('Limpeza', 'receita', 'ti-droplet', 1),
  ('Manutenção', 'receita', 'ti-tool', 2),
  ('Peças', 'receita', 'ti-settings', 3),
  ('Venda de máquinas', 'receita', 'ti-shopping-cart', 4),
  ('Taxa diagnóstico', 'receita', 'ti-stethoscope', 5),
  ('Outros (receita)', 'receita', 'ti-coin', 99),

  ('Funcionários', 'despesa', 'ti-users', 1),
  ('Peças (compra)', 'despesa', 'ti-package', 2),
  ('Tráfego pago', 'despesa', 'ti-megaphone', 3),
  ('Impostos', 'despesa', 'ti-receipt-tax', 4),
  ('Financiamento', 'despesa', 'ti-credit-card', 5),
  ('Luz/água/internet', 'despesa', 'ti-bolt', 6),
  ('Combustível', 'despesa', 'ti-gas-station', 7),
  ('Ferramentas', 'despesa', 'ti-screwdriver', 8),
  ('Materiais de limpeza', 'despesa', 'ti-spray', 9),
  ('Outros (despesa)', 'despesa', 'ti-receipt', 99);

-- =========================================================================
-- 3. TABELA `conta_bancaria`
-- =========================================================================

CREATE TABLE conta_bancaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,         -- "Cresol", "Bradesco PJ", etc
  tipo text,                  -- 'banco', 'cartao', 'maquininha'
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

-- Contas iniciais (do prompt original)
INSERT INTO conta_bancaria (nome, tipo) VALUES
  ('Cresol', 'banco'),
  ('Bradesco', 'banco'),
  ('Mercado Pago', 'banco'),
  ('Elo Grafite', 'cartao'),
  ('Bradesco Visa', 'cartao'),
  ('Mercado Pago Cartão', 'cartao'),
  ('Bradesco PJ', 'cartao'),
  ('Cresol Cartão', 'cartao'),
  ('Nubank PJ', 'cartao'),
  ('Inter', 'cartao'),
  ('InfinitePay', 'maquininha'),
  ('Ton Black', 'maquininha');

-- =========================================================================
-- 4. TABELA `lancamento_financeiro`
-- =========================================================================

CREATE TABLE lancamento_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classificação
  tipo lancamento_tipo NOT NULL,
  natureza lancamento_natureza NOT NULL DEFAULT 'avulso',
  status lancamento_status NOT NULL DEFAULT 'pendente',

  -- Categoria e conta
  categoria_id uuid REFERENCES categoria_financeira(id),
  conta_id uuid REFERENCES conta_bancaria(id),

  -- Valores
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  valor_pago numeric(12,2) DEFAULT 0,

  -- Datas
  data_vencimento date NOT NULL,
  data_pagamento date,

  -- Descrição
  descricao text NOT NULL,
  observacoes text,

  -- Pagamento detalhado
  forma_pagamento forma_pagamento,

  -- Parcelamento (quando natureza = 'parcelado')
  parcelamento_id uuid,                  -- agrupa parcelas da mesma compra
  parcela_numero integer,                -- 1, 2, 3...
  parcelas_total integer,                -- ex: 12 parcelas

  -- Recorrência (quando natureza = 'recorrente')
  recorrencia_id uuid,                   -- agrupa lançamentos recorrentes
  recorrencia_dia integer,               -- dia do mês (1-31)

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

-- Índices
CREATE INDEX idx_lanc_tipo_status ON lancamento_financeiro(tipo, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_lanc_vencimento ON lancamento_financeiro(data_vencimento) WHERE deleted_at IS NULL;
CREATE INDEX idx_lanc_pagamento ON lancamento_financeiro(data_pagamento) WHERE deleted_at IS NULL;
CREATE INDEX idx_lanc_categoria ON lancamento_financeiro(categoria_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lanc_os ON lancamento_financeiro(os_id) WHERE os_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_lanc_parcelamento ON lancamento_financeiro(parcelamento_id) WHERE parcelamento_id IS NOT NULL;
CREATE INDEX idx_lanc_recorrencia ON lancamento_financeiro(recorrencia_id) WHERE recorrencia_id IS NOT NULL;

-- =========================================================================
-- 5. TRIGGER de auditoria (padrão Idemaq)
-- =========================================================================

CREATE TRIGGER tg_lanc_audit
  BEFORE INSERT OR UPDATE ON lancamento_financeiro
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

CREATE TRIGGER tg_cat_fin_audit
  BEFORE INSERT OR UPDATE ON categoria_financeira
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

CREATE TRIGGER tg_conta_audit
  BEFORE INSERT OR UPDATE ON conta_bancaria
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 6. RLS — Row Level Security
-- =========================================================================

ALTER TABLE lancamento_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_financeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_bancaria ENABLE ROW LEVEL SECURITY;

-- Só o dono enxerga e modifica lançamentos financeiros
CREATE POLICY lanc_dono_only ON lancamento_financeiro
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

CREATE POLICY cat_fin_dono_only ON categoria_financeira
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

CREATE POLICY conta_dono_only ON conta_bancaria
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

COMMIT;

-- =========================================================================
-- NOTAS:
-- 1. Tabela `parcelamento` separada NÃO criada — usar `parcelamento_id` como
--    agrupador. Pode evoluir depois se necessário.
-- 2. Recorrência idem — `recorrencia_id` agrupa, dia mensal em `recorrencia_dia`.
-- 3. Vínculo com OS é OPCIONAL. Lançamentos manuais (lavanderia paga conta de
--    luz) podem ter `os_id = NULL`.
-- 4. Dependências (criar antes se não existirem):
--      - function tg_set_audit()  — usada por outras tabelas Idemaq
--      - function is_dono()        — usada em RLS de outras tabelas Idemaq
--    Se as RLS quebrarem por falta de is_dono(), comentar as 3 POLICIES e
--    recriar depois que a função existir.
-- =========================================================================
