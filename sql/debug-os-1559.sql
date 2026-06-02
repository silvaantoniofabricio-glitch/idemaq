-- Debug OS 1559 (Jose Daniel) — saber por que aparece em maio em vez de junho.

SELECT id, numero, tipo, etapa,
       criado_em       AS abertura,
       data_conclusao,
       atualizado_em
  FROM os
 WHERE numero = 1559;

-- Historico completo (ordem cronologica)
SELECT h.data, h.etapa_de, h.etapa_para, h.funcionario_id
  FROM os_historico h
  JOIN os o ON o.id = h.os_id
 WHERE o.numero = 1559
 ORDER BY h.data ASC;
