-- =========================================================================
-- IDEMAQ — Schema Parte 2 — Tabela `rota`
-- Data: 19/05/2026
-- Status: VERSIONADO mas NÃO aplicado (rodada de fundação do módulo Logística).
--         Aplicar depois que o módulo sair do mock e a UI estiver validada.
--
-- ESCOPO:
--   Rota diária do Alessandro — agrupa coletas + entregas do dia, com sequência
--   manual e status por parada.
--
-- DECISÃO DE MODELAGEM (vs. contexto-logistica.md §3):
--   O contexto sugeria 2 tabelas (`rota` + `parada_rota`). Optamos por **uma
--   tabela só com `paradas jsonb`** porque:
--     1. MVP — paradas são manipuladas sempre em conjunto (drag-and-drop da
--        rota inteira), não consultadas individualmente em escala.
--     2. Schema das paradas ainda vai evoluir (foto, geocoding, observações,
--        timestamps de chegada) — jsonb evita migrações a cada ajuste.
--     3. Volume baixo: ~10-15 paradas/dia → 1 linha por dia, jsonb fica trivial.
--   Se algum dia precisar query individual por parada (relatório por OS, foto
--   por entrega, etc), promover pra tabela `parada_rota` separada.
--
-- DEPENDÊNCIAS (devem existir antes de aplicar):
--   - tabela `usuarios` (com coluna `id uuid PK`)
--   - function `tg_set_audit()`   — preenche criado_em/por + atualizado_em/por
--   - function `is_dono()`        — retorna true se auth.uid() é o dono
--   - function `papel_atual()`    — retorna 'dono'|'logistica'|'oficina'
--
-- Se alguma dependência faltar, comentar a seção de RLS e recriar depois.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. ENUM `rota_status`
-- =========================================================================

DO $$ BEGIN
  CREATE TYPE rota_status AS ENUM ('planejada', 'em_andamento', 'concluida', 'cancelada');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- 2. TABELA `rota`
-- =========================================================================
-- Uma linha por dia/motorista. Paradas vivem em `paradas` (jsonb).
--
-- Shape esperado de `paradas` (array de objetos):
--   [
--     {
--       "id": "uuid-local",            -- gerado no front, estável p/ React keys
--       "ordem": 1,                    -- sequência manual (1, 2, 3...)
--       "tipo": "coleta" | "entrega",
--       "os_id": "uuid-da-os",         -- FK lógico, sem constraint
--       "os_num": 247,                 -- denormalizado pra exibição rápida
--       "cliente_nome": "Ana Reis",
--       "cliente_fone": "(67) 9 9911-1010",
--       "endereco": "R. das Acácias, 412 — Naviraí/MS",
--       "lat": -23.0654,               -- futuro: vem do Google Places
--       "lng": -54.1898,
--       "horario_previsto": "08:30",
--       "horario_chegada": null,       -- preenchido ao concluir
--       "status": "pendente" | "em_andamento" | "concluida" | "pulada",
--       "foto_url": null,              -- futuro: Storage privado
--       "observacoes": null            -- código de entrada, andar, etc
--     }
--   ]
-- =========================================================================

CREATE TABLE rota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  data date NOT NULL,
  motorista_id uuid REFERENCES usuarios(id),

  -- Conteúdo
  paradas jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Status
  status rota_status NOT NULL DEFAULT 'planejada',

  -- Métricas (futuro — preencher conforme app evoluir)
  iniciada_em timestamptz,
  concluida_em timestamptz,
  km_total numeric(8,2),

  -- Observações livres do dia
  observacoes text,

  -- Auditoria padrão Idemaq
  criado_em timestamptz DEFAULT now(),
  criado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  atualizado_por uuid REFERENCES usuarios(id),
  deleted_at timestamptz,
  excluido_por uuid REFERENCES usuarios(id),

  -- Só pode existir uma rota ativa por motorista/dia
  CONSTRAINT rota_data_motorista_unico UNIQUE (data, motorista_id)
);

-- Índices
CREATE INDEX idx_rota_data ON rota(data DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_rota_motorista ON rota(motorista_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rota_status ON rota(status) WHERE deleted_at IS NULL;
-- GIN pra buscar por os_id dentro das paradas (relatórios, ficha do cliente)
CREATE INDEX idx_rota_paradas_gin ON rota USING gin (paradas jsonb_path_ops);

-- =========================================================================
-- 3. TRIGGER de auditoria (padrão Idemaq)
-- =========================================================================

CREATE TRIGGER tg_rota_audit
  BEFORE INSERT OR UPDATE ON rota
  FOR EACH ROW EXECUTE FUNCTION tg_set_audit();

-- =========================================================================
-- 4. RLS — Row Level Security
-- =========================================================================
-- Logística é visível pra dono + logística (Alessandro) + oficina (leitura).
-- Modificação restrita a dono + logística.

ALTER TABLE rota ENABLE ROW LEVEL SECURITY;

CREATE POLICY rota_select_todos ON rota
  FOR SELECT USING (
    is_dono() OR papel_atual() IN ('logistica', 'oficina')
  );

CREATE POLICY rota_modify_logistica ON rota
  FOR ALL USING (
    is_dono() OR papel_atual() = 'logistica'
  ) WITH CHECK (
    is_dono() OR papel_atual() = 'logistica'
  );

COMMIT;

-- =========================================================================
-- NOTAS:
-- 1. `paradas` é jsonb (não jsonb[]) — array fica DENTRO do jsonb único.
--    É o padrão Postgres pra arrays heterogêneos de objetos.
-- 2. `os_id` dentro de cada parada é referência lógica, sem FK formal — jsonb
--    não suporta. A integridade fica na aplicação (e em índice GIN p/ busca).
-- 3. Foto de coleta/entrega: por enquanto `foto_url` é só placeholder no jsonb.
--    Quando ligar com Supabase Storage, o caminho será:
--      idemaq-privado/os/{os_id}/coleta/{n}.jpg
--      idemaq-privado/os/{os_id}/entrega/{n}.jpg
-- 4. Regra de negócio (a aplicar na UI/back): OS de Atendimento/Fabricação só
--    pode sair de zona Externa → Interna se tiver ao menos 1 foto na coleta.
-- 5. Quando a tabela `parada_rota` for criada (se for), migrar `paradas` jsonb
--    pra linhas via INSERT ... SELECT jsonb_array_elements(paradas).
-- =========================================================================
