-- 182-trocar-endereco-os-1829-para-endereco2.sql
-- OS #1829 (Amanda) tá com o endereço 1 dela — a entrega precisa ir pro
-- endereço 2, que já está cadastrado na cliente. Troca o endereço da OS.

-- 1) Diagnóstico — confere os dois antes de trocar.
SELECT
  o.numero,
  o.endereco AS endereco_atual_da_os,
  c.endereco AS endereco_1_cliente,
  c.endereco2 AS endereco_2_cliente
FROM os o
JOIN cliente c ON c.id = o.cliente_id
WHERE o.numero = 1829;

-- 2) Troca — copia o endereço 2 da cliente pra OS #1829.
UPDATE os o
SET endereco = c.endereco2
FROM cliente c
WHERE c.id = o.cliente_id
  AND o.numero = 1829
  AND c.endereco2 IS NOT NULL;

-- 3) Confirma.
SELECT numero, endereco FROM os WHERE numero = 1829;
