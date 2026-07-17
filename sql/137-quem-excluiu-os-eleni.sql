-- 137-quem-excluiu-os-eleni.sql
-- SÓ LEITURA. Identifica quem excluiu as OS #1657 e #1666 (Eleni Sordi Maier).

SELECT id, nome, email, papel
FROM usuarios
WHERE id = 'ac0b828e-56c9-481a-b692-184ed556c18d';
