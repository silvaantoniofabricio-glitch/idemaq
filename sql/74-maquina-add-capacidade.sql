-- sql/74-maquina-add-capacidade.sql
-- A tabela `maquina` em produção foi criada por uma versão antiga do schema,
-- sem a coluna `capacidade` (erro: "Could not find the 'capacidade' column of
-- 'maquina' in the schema cache" ao cadastrar nova máquina).
-- Este script adiciona as colunas que faltam, alinhando com sql/12-maquina.sql.
-- Idempotente (ADD COLUMN IF NOT EXISTS). Rodar no Supabase SQL Editor.

ALTER TABLE maquina ADD COLUMN IF NOT EXISTS capacidade    text;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS marca         text;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS estado        text NOT NULL DEFAULT 'disponivel';
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS custo_compra  numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS custo_itens   numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS custo_servico numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS preco_venda   numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS observacoes   text;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS deleted_at    timestamptz;
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS criado_em     timestamptz NOT NULL DEFAULT now();
ALTER TABLE maquina ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

-- Força o PostgREST a recarregar o cache de schema (senão a coluna nova pode
-- continuar "invisível" por alguns segundos).
NOTIFY pgrst, 'reload schema';

-- Conferência: lista as colunas atuais da tabela
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'maquina'
ORDER BY ordinal_position;
