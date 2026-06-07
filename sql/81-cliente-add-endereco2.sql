-- Adiciona coluna endereco2 para segundo endereço do cliente
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS endereco2 text;
