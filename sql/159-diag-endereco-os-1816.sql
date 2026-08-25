-- 159-diag-endereco-os-1816.sql
-- SÓ LEITURA. Confere o endereço gravado na OS #1816 vs os endereços
-- cadastrados na cliente (Ana Carla) — talvez o certo já esteja lá.

SELECT o.numero, o.endereco AS endereco_da_os, o.cliente_id
FROM os o
WHERE o.numero = 1816;

SELECT c.id, c.nome, c.endereco, c.endereco2, c.endereco3
FROM cliente c
JOIN os o ON o.cliente_id = c.id
WHERE o.numero = 1816;
