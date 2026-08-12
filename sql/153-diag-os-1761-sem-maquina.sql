-- 153-diag-os-1761-sem-maquina.sql
-- SÓ LEITURA. A OS #1761 (Fabricação, Gesiel) concluiu mas não gerou
-- máquina no estoque. Precisa ver se a automação rodou (maquina_criada)
-- e se existe alguma máquina "órfã" com o modelo dela.

SELECT
  id, numero, tipo, etapa, deleted_at, maquina_criada, itens_baixados,
  cliente_id, marca_equipamento, modelo_equipamento, valor_total,
  criado_em, data_conclusao
FROM os
WHERE numero = 1761;

-- Existe máquina no estoque com marca/modelo parecido?
SELECT id, modelo, marca, estado, custo_compra, custo_itens, observacoes, criado_em
FROM maquina
WHERE modelo ILIKE '%BWK12%' OR marca ILIKE '%BRASTEMP%'
ORDER BY criado_em DESC
LIMIT 10;
