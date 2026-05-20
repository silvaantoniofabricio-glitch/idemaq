-- =========================================================================
-- IDEMAQ — Schema Parte 2 — Módulo Relógio de Ponto
-- Data: 20/05/2026
-- Status: VERSIONADO — aplicar no Supabase SQL Editor (rodar inteiro).
--
-- ESCOPO:
--   2 tabelas pro módulo Ponto:
--     - `ponto_registro`     → uma linha por batida (entrada/almoço/saída)
--     - `jornada_funcionario`→ agregado diário (1 linha por funcionário/dia)
--
--   Sistema atende apenas os 2 funcionários (Alessandro/Guilherme).
--   Dono (Toni) NÃO bate ponto, mas vê tudo (relatório em Relatórios).
--
-- DEPENDÊNCIAS (devem existir antes de aplicar):
--   - tabela `usuarios` (com coluna `id uuid PK`)
--   - function `tg_set_audit()`   — preenche criado_em/por + atualizado_em/por
--   - function `is_dono()`        — retorna true se auth.uid() é o dono
--   - function `papel_atual()`    — retorna 'dono'|'logistica'|'oficina'
--
-- Se alguma dependência faltar, comentar a seção de RLS e recriar depois.
--
-- AÇÃO PRA TONI: copiar este arquivo INTEIRO no Supabase SQL Editor e rodar.
--                Depois, o terminal `ponto` liga a UI nas tabelas reais.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. ENUMs
-- =========================================================================

DO $$ BEGIN
  CREATE TYPE ponto_tipo AS ENUM (
    'entrada',       -- chegou pra trabalhar
    'saida_almoco',  -- saiu pro almoço
    'volta_almoco',  -- voltou do almoço
    'saida'          -- bateu fim de expediente
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE jornada_status AS ENUM (
    'presente',
    'falta',
    'falta_justificada',
    'feriado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 2. TABELA `ponto_registro`
-- =========================================================================
-- Cada batida é uma linha. Não tem update — batida é fato histórico.
-- Ajustes manuais pelo dono criam nova linha com observacao + ajuste do
-- registro antigo (soft-delete). Funcionário não edita nem deleta.

CREATE TABLE IF NOT EXISTS ponto_registro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  funcionario_id uuid NOT NULL REFERENCES usuarios(id),
  tipo ponto_tipo NOT NULL,

  bateu_em timestamptz NOT NULL DEFAULT now(),

  -- Geolocalização — OBRIGATÓRIA na regra de negócio, mas nullable no banco
  -- pra permitir ajuste manual do dono (caso de batida esquecida).
  lat numeric(10,7),
  lng numeric(10,7),
  endereco_aproximado text,

  -- Observação livre (ajustes manuais, justificativas)
  observacao text,

  -- Auditoria padrão Idemaq
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_ponto_funcionario_data
  ON ponto_registro(funcionario_id, bateu_em DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ponto_bateu_em
  ON ponto_registro(bateu_em DESC) WHERE deleted_at IS NULL;

-- =========================================================================
-- 3. TABELA `jornada_funcionario`
-- =========================================================================
-- Agregado diário derivado de `ponto_registro`. Pode ser preenchido por
-- trigger ao bater saída, por cronjob noturno (falta automática) ou por
-- ajuste manual do dono.
--
-- UNIQUE (funcionario_id, dia) → uma linha por funcionário por dia.

CREATE TABLE IF NOT EXISTS jornada_funcionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  funcionario_id uuid NOT NULL REFERENCES usuarios(id),
  dia date NOT NULL,

  -- Timestamps das 4 batidas (podem ser nulos se faltou alguma)
  entrada timestamptz,
  saida_almoco timestamptz,
  volta_almoco timestamptz,
  saida timestamptz,

  -- Totalizadores em `interval` (suporta horas negativas no saldo)
  total_horas_trabalhadas interval DEFAULT '0'::interval,
  total_horas_almoco interval DEFAULT '0'::interval,
  saldo_horas interval DEFAULT '0'::interval,  -- vs jornada padrão 8h

  status jornada_status NOT NULL DEFAULT 'presente',

  observacao text,

  -- Auditoria padrão Idemaq
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id),

  -- 1 linha por funcionário/dia
  CONSTRAINT jornada_funcionario_dia_unico UNIQUE (funcionario_id, dia)
);

CREATE INDEX IF NOT EXISTS idx_jornada_func_dia
  ON jornada_funcionario(funcionario_id, dia DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jornada_status
  ON jornada_funcionario(status) WHERE deleted_at IS NULL;

-- =========================================================================
-- 4. TRIGGERs de auditoria (padrão Idemaq)
-- =========================================================================

DROP TRIGGER IF EXISTS tg_ponto_registro_audit ON ponto_registro;
CREATE TRIGGER tg_ponto_registro_audit
  BEFORE INSERT OR UPDATE ON ponto_registro
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

DROP TRIGGER IF EXISTS tg_jornada_funcionario_audit ON jornada_funcionario;
CREATE TRIGGER tg_jornada_funcionario_audit
  BEFORE INSERT OR UPDATE ON jornada_funcionario
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 5. RLS — Row Level Security
-- =========================================================================
-- Regra: funcionário só vê (e cria) os PRÓPRIOS registros.
--        Dono vê e edita tudo.

ALTER TABLE ponto_registro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ponto_registro_select_proprio ON ponto_registro;
CREATE POLICY ponto_registro_select_proprio ON ponto_registro
  FOR SELECT USING (
    is_dono() OR funcionario_id = auth.uid()
  );

DROP POLICY IF EXISTS ponto_registro_insert_proprio ON ponto_registro;
CREATE POLICY ponto_registro_insert_proprio ON ponto_registro
  FOR INSERT WITH CHECK (
    is_dono() OR funcionario_id = auth.uid()
  );

-- Update/delete: só dono (ajustes manuais auditados).
DROP POLICY IF EXISTS ponto_registro_modify_dono ON ponto_registro;
CREATE POLICY ponto_registro_modify_dono ON ponto_registro
  FOR UPDATE USING (is_dono()) WITH CHECK (is_dono());

DROP POLICY IF EXISTS ponto_registro_delete_dono ON ponto_registro;
CREATE POLICY ponto_registro_delete_dono ON ponto_registro
  FOR DELETE USING (is_dono());

ALTER TABLE jornada_funcionario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jornada_select_proprio ON jornada_funcionario;
CREATE POLICY jornada_select_proprio ON jornada_funcionario
  FOR SELECT USING (
    is_dono() OR funcionario_id = auth.uid()
  );

-- Insert/update/delete: só dono. Agregado é mantido por trigger/cronjob/dono.
DROP POLICY IF EXISTS jornada_modify_dono ON jornada_funcionario;
CREATE POLICY jornada_modify_dono ON jornada_funcionario
  FOR ALL USING (is_dono()) WITH CHECK (is_dono());

COMMIT;

-- =========================================================================
-- NOTAS:
-- 1. Tipos da batida usam `saida_almoco` / `volta_almoco` (não almoco_inicio
--    / almoco_fim). É a nomenclatura escolhida em 20/05/2026 — mais clara
--    pro funcionário ("saiu pra almoçar" / "voltou do almoço").
--
-- 2. `bateu_em` é o timestamp da batida (gravado pelo servidor via DEFAULT
--    now()). Front NÃO envia esse campo — confiamos no relógio do banco
--    pra evitar batida retroativa por manipulação do cliente.
--
-- 3. `lat`/`lng` ficam nullable no schema mas a regra de negócio do front
--    EXIGE geolocalização. Se Navigator API negar, o front bloqueia a
--    batida. Nullable só pra permitir ajuste manual do dono.
--
-- 4. `jornada_funcionario` é o agregado pronto pra relatório. Por
--    enquanto, o hook `usePonto` calcula no client a partir de
--    `ponto_registro`. Futuro: trigger ao bater `saida` consolida a linha.
--
-- 5. Falta automática (cronjob 23h): inserir linha em jornada_funcionario
--    com status='falta' se não houver `ponto_registro` daquele dia útil
--    do funcionário. Considera feriados de Naviraí/MS.
--
-- 6. Banco de horas = SUM(saldo_horas) ao longo do tempo. Jornada padrão
--    8h/dia (configurável futuro em outra tabela `config_jornada`).
-- =========================================================================
