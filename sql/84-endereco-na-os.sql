-- sql/84 — Adiciona coluna `endereco` na tabela `os`
-- Motivo: quando cliente tem 2+ endereços, o endereço selecionado na criação
-- da OS deve ser salvo na própria OS, não lido sempre do cliente.endereco.
-- Aplica em: Supabase SQL Editor → Run

ALTER TABLE os ADD COLUMN IF NOT EXISTS endereco text;

-- Índice não é necessário (campo de texto livre, não usado em WHERE/JOIN).
-- Nenhuma migração de dados: NULLs ficarão assim; o front faz fallback para
-- cliente.endereco quando os.endereco é NULL.
