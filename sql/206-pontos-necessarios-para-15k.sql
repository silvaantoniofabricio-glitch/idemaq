-- =============================================================================
-- sql/206 — Quantas OS entregues (entrada em Entrega/A receber/Concluído) são
-- necessárias pra faturar R$ 15 mil (independente de ter recebido) e quantos
-- PONTOS essas OS geram, com a tabela de pesos nova (08/10/2026) — mesma
-- regra do calcularPontosOS (pontuacao.js), reproduzida em SQL.
-- Sem garantia real (garantia = true). Só leitura, não altera nada.
-- =============================================================================

WITH primeira AS (
  SELECT h.os_id, MIN(h.data) AS entrou
  FROM os_historico h
  WHERE h.etapa_para IN ('entrega', 'pagamento', 'concluido')
  GROUP BY h.os_id
),
base AS (
  SELECT o.id, o.tipo_equipamento, o.pre_diagnostico AS pd,
         COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0) AS valor,
         p.entrou
  FROM primeira p
  JOIN os o ON o.id = p.os_id
  WHERE o.deleted_at IS NULL
    AND o.garantia IS NOT TRUE
    AND p.entrou >= '2026-07-01' AND p.entrou < '2026-10-01'
),
pts AS (
  SELECT
    b.id, b.valor, b.entrou,
    (b.tipo_equipamento = 'lava_seca') AS ls,
    (b.pd->'coleta_confirmada'->>'apelido' IS NOT NULL) AS f_coleta,
    (
      jsonb_array_length(COALESCE(b.pd#>'{checklist,recebido,itens}', '[]'::jsonb)) > 0
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(b.pd#>'{checklist,recebido,itens}', '[]'::jsonb)) i
        WHERE (i->>'valor') IS NULL)
      AND EXISTS (
        SELECT 1 FROM jsonb_each(COALESCE(b.pd->'componentes_marcados', '{}'::jsonb)) g
        WHERE jsonb_typeof(g.value) IN ('object', 'array')
          AND g.value NOT IN ('{}'::jsonb, '[]'::jsonb))
      AND (
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(b.pd#>'{checklist,recebido,itens}', '[]'::jsonb)) i
          WHERE i->'autor'->>'apelido' IS NOT NULL)
        OR EXISTS (
          SELECT 1 FROM jsonb_each(COALESCE(b.pd->'componentes_autores', '{}'::jsonb)) a
          WHERE a.value->>'apelido' IS NOT NULL)
      )
    ) AS f_diag,
    (b.pd#>'{oficina,execucao,desmontagem,feito}'->>'apelido' IS NOT NULL) AS f_desm,
    (b.pd#>'{oficina,execucao,montagem,feito}'->>'apelido' IS NOT NULL) AS f_mont,
    (COALESCE((b.pd#>>'{oficina,tem_limpeza}')::boolean, false)
      AND b.pd#>'{oficina,execucao,limpeza_serv,feito}'->>'apelido' IS NOT NULL) AS f_limp,
    (SELECT COUNT(*) FROM jsonb_each(COALESCE(b.pd#>'{oficina,execucao,manut_serv}', '{}'::jsonb)) m
      WHERE m.value->>'apelido' IS NOT NULL) AS n_manut,
    (
      EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(b.pd#>'{checklist,teste_final,itens}', '[]'::jsonb)) i
              WHERE i->>'id' LIKE 'teste:%')
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(b.pd#>'{checklist,teste_final,itens}', '[]'::jsonb)) i
              WHERE i->>'id' LIKE 'teste:%' AND (i->>'valor') IS NULL)
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(b.pd#>'{checklist,teste_final,itens}', '[]'::jsonb)) i
              WHERE i->>'id' LIKE 'teste:%' AND i->'autor'->>'apelido' IS NOT NULL)
    ) AS f_teste,
    (
      EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(b.pd#>'{checklist,teste_final,itens}', '[]'::jsonb)) i
              WHERE i->>'id' LIKE 'acab:%')
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(b.pd#>'{checklist,teste_final,itens}', '[]'::jsonb)) i
              WHERE i->>'id' LIKE 'acab:%' AND COALESCE((i->>'checked')::boolean, false) = false)
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(b.pd#>'{checklist,teste_final,itens}', '[]'::jsonb)) i
              WHERE i->>'id' LIKE 'acab:%' AND i->'autor'->>'apelido' IS NOT NULL)
    ) AS f_acab,
    (b.pd->'entrega'->'realizada_por'->>'apelido' IS NOT NULL) AS f_entrega
  FROM base b
),
total AS (
  SELECT
    id, valor, entrou,
    (CASE WHEN f_coleta THEN 6 ELSE 0 END)
    + (CASE WHEN f_diag THEN 3 ELSE 0 END)
    + (CASE WHEN f_desm THEN (CASE WHEN ls THEN 12 ELSE 6 END) ELSE 0 END)
    + (CASE WHEN f_mont THEN (CASE WHEN ls THEN 10 ELSE 5 END) ELSE 0 END)
    + (CASE WHEN f_limp THEN (CASE WHEN ls THEN 20 ELSE 10 END) ELSE 0 END)
    + n_manut * 3
    + (CASE WHEN f_teste THEN 2 ELSE 0 END)
    + (CASE WHEN f_acab THEN 5 ELSE 0 END)
    + (CASE WHEN f_entrega THEN 6 ELSE 0 END) AS pontos
  FROM pts
)
SELECT
  to_char(date_trunc('month', entrou), 'YYYY-MM') AS mes,
  COUNT(*) AS os_entregues,
  ROUND(AVG(valor), 2) AS ticket_medio,
  CEIL(15000 / NULLIF(AVG(valor), 0)) AS os_para_15k,
  ROUND(AVG(pontos), 1) AS pontos_medios_por_os,
  ROUND(CEIL(15000 / NULLIF(AVG(valor), 0)) * AVG(pontos)) AS pontos_para_15k
FROM total
GROUP BY 1
ORDER BY 1;
