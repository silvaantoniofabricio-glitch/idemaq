-- =========================================================================
-- IDEMAQ — Schema Parte 2 — `lancamento_financeiro` + `conta_bancaria`
-- Atualizado 19/05/2026 pra refletir o schema simplificado consumido por
-- src/hooks/useFinanceiro.js. Versão anterior (18/05) usava FK pra
-- categoria_financeira + enums de status/natureza/parcelamento/recorrencia;
-- a UI evoluiu pra:
--   - categoria text livre (sugestões hardcoded no hook)
--   - status derivado de pago_em IS NULL
--   - taxa_pct por lançamento (taxa da maquininha)
--   - tipo text simples ('receita'|'despesa')
--   - forma_pagamento text livre (convenção: pix/dinheiro/debito/
--     credito_1x/credito_parcelado/link_pagamento/boleto/transferencia/a_prazo)
-- Recorrência e parcelamento ficam pra tabela separada futura.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. TABELA `conta_bancaria`
-- =========================================================================

CREATE TABLE IF NOT EXISTS conta_bancaria (
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

CREATE INDEX IF NOT EXISTS idx_conta_bancaria_ativo ON conta_bancaria(ativo) WHERE deleted_at IS NULL;

-- Contas iniciais (do plano original)
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
  ('Ton Black', 'maquininha')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 2. TABELA `lancamento_financeiro` (schema simplificado)
-- =========================================================================

CREATE TABLE IF NOT EXISTS lancamento_financeiro (
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

  -- Forma de pagamento (text livre — convenção de enum)
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_lanc_tipo       ON lancamento_financeiro(tipo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lanc_vencimento ON lancamento_financeiro(vencimento) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lanc_pago_em    ON lancamento_financeiro(pago_em) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lanc_conta      ON lancamento_financeiro(conta_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lanc_os         ON lancamento_financeiro(os_id) WHERE os_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lanc_categoria  ON lancamento_financeiro(categoria) WHERE deleted_at IS NULL;

-- =========================================================================
-- 3. TRIGGER de auditoria (padrão Idemaq)
-- =========================================================================

DROP TRIGGER IF EXISTS tg_lanc_audit  ON lancamento_financeiro;
DROP TRIGGER IF EXISTS tg_conta_audit ON conta_bancaria;

CREATE TRIGGER tg_lanc_audit
  BEFORE INSERT OR UPDATE ON lancamento_financeiro
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

CREATE TRIGGER tg_conta_audit
  BEFORE INSERT OR UPDATE ON conta_bancaria
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 4. RLS — Row Level Security (admin/dono only)
-- =========================================================================

ALTER TABLE lancamento_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE conta_bancaria        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lanc_dono_only  ON lancamento_financeiro;
DROP POLICY IF EXISTS conta_dono_only ON conta_bancaria;

CREATE POLICY lanc_dono_only ON lancamento_financeiro
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

CREATE POLICY conta_dono_only ON conta_bancaria
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

-- =========================================================================
-- 5. REALTIME (opcional — pra UI ouvir mudanças do hook)
-- =========================================================================
-- Habilita publicação realtime — testar via Supabase Dashboard depois.
-- ALTER PUBLICATION supabase_realtime ADD TABLE lancamento_financeiro;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conta_bancaria;

COMMIT;

-- =========================================================================
-- NOTAS / DEPENDÊNCIAS:
-- 1. Recorrência / parcelamento fora de escopo do schema simplificado.
--    Quando vier, criar tabela separada `lancamento_recorrencia` /
--    `lancamento_parcelamento` que agrupa lançamentos individuais.
-- 2. Categoria virou text livre — sem tabela `categoria_financeira`.
--    Sugestões pra UI são exportadas em `CATEGORIAS_SUGESTAO` no hook.
-- 3. Vínculo com OS é OPCIONAL. Lançamentos manuais (conta de luz, salário)
--    têm `os_id = NULL`.
-- 4. Status é derivado: pago_em IS NULL → aberto · NOT NULL → pago.
-- 5. Funções esperadas no banco (criar antes se não existirem):
--      - function tg_set_audit() — usada por outras tabelas Idemaq
--      - function is_dono()      — usada em RLS de outras tabelas Idemaq
--    Se as RLS quebrarem por falta de is_dono(), comentar as 2 POLICIES e
--    recriar depois que a função existir.
-- 6. Taxa da maquininha: ao confirmar pagamento numa OS via cartão/link,
--    o front pode gerar 2 lançamentos: receita bruta + despesa
--    automática em D+1 útil (helper `calcularD1Util` em utils/financeiro.js).
-- =========================================================================
