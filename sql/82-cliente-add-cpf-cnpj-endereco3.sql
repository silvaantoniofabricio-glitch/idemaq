-- Campos novos na ficha do cliente
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS cpf_cnpj text;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS endereco3 text;
