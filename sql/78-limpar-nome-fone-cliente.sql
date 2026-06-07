-- ============================================================
-- LIMPEZA: extrai telefone embutido no campo nome dos clientes
-- Rodar só após revisar o diagnóstico do sql/77
--
-- Regras aplicadas:
--   1. nome contém APENAS número → IGNORAR (não altera nada)
--   2. campo telefone está VAZIO → move fone do nome para telefone
--   3. fone no nome == fone no campo telefone → só limpa o nome
--   4. fone no nome != fone no campo telefone → fone vai para telefone2
-- ============================================================

-- Passo 1: adicionar coluna telefone2 (sem erro se já existir)
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS telefone2 text;

-- Passo 2: aplicar atualizações
WITH analise AS (
  SELECT
    id,
    nome,
    telefone,

    COALESCE(
      (regexp_match(nome, '55[0-9]{10,11}'))[1],
      (regexp_match(nome, '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}'))[1],
      (regexp_match(nome, '(^|[^0-9])([0-9]{8,9})([^0-9]|$)'))[2]
    ) AS fone_no_nome,

    TRIM(BOTH E' -,/\t' FROM
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(nome,
              '55[0-9]{10,11}', '', 'g'),
            '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}', '', 'g'),
          '[0-9]{8,9}', '', 'g'),
        '\s{2,}', ' ', 'g'
      )
    ) AS nome_pre_limpo,

    (nome ~* '[a-záàãâéèêíìîóòõôúùûç]') AS tem_letras

  FROM cliente
  WHERE deleted_at IS NULL
    AND nome ~ '\d{7,}'
),
com_nome_limpo AS (
  SELECT
    *,
    regexp_replace(
      regexp_replace(nome_pre_limpo, '\s*[/\-,]\s*$', ''),
      '^\s*[/\-,]\s*', ''
    ) AS nome_limpo
  FROM analise
),
norm AS (
  SELECT
    *,
    CASE
      WHEN length(regexp_replace(COALESCE(fone_no_nome, ''), '\D', '', 'g')) BETWEEN 12 AND 13
        AND regexp_replace(COALESCE(fone_no_nome, ''), '\D', '', 'g') LIKE '55%'
      THEN substr(regexp_replace(fone_no_nome, '\D', '', 'g'), 3)
      ELSE regexp_replace(COALESCE(fone_no_nome, ''), '\D', '', 'g')
    END AS fone_nome_norm,
    CASE
      WHEN length(regexp_replace(COALESCE(telefone, ''), '\D', '', 'g')) BETWEEN 12 AND 13
        AND regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') LIKE '55%'
      THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
      ELSE regexp_replace(COALESCE(telefone, ''), '\D', '', 'g')
    END AS fone_orig_norm
  FROM com_nome_limpo
),
casos AS (
  SELECT
    id,
    nome_limpo,
    fone_no_nome,
    telefone,
    CASE
      WHEN NOT tem_letras                   THEN 'ignorar'
      WHEN fone_no_nome IS NULL             THEN 'ignorar'
      WHEN fone_orig_norm = ''              THEN 'mover'
      WHEN fone_nome_norm = fone_orig_norm  THEN 'limpar'
      ELSE                                       'secundario'
    END AS acao
  FROM norm
)
UPDATE cliente c
SET
  nome = CASE
           WHEN casos.acao = 'ignorar' THEN c.nome
           ELSE casos.nome_limpo
         END,

  telefone = CASE
               WHEN casos.acao = 'mover' THEN casos.fone_no_nome
               ELSE c.telefone
             END,

  telefone2 = CASE
                WHEN casos.acao = 'secundario' THEN casos.fone_no_nome
                ELSE c.telefone2
              END
FROM casos
WHERE c.id = casos.id;

-- Resumo final
WITH analise AS (
  SELECT
    id, nome, telefone,
    COALESCE(
      (regexp_match(nome, '55[0-9]{10,11}'))[1],
      (regexp_match(nome, '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}'))[1],
      (regexp_match(nome, '(^|[^0-9])([0-9]{8,9})([^0-9]|$)'))[2]
    ) AS fone_no_nome,
    (nome ~* '[a-záàãâéèêíìîóòõôúùûç]') AS tem_letras
  FROM cliente
  WHERE deleted_at IS NULL AND nome ~ '\d{7,}'
),
norm AS (
  SELECT *,
    CASE WHEN length(regexp_replace(COALESCE(fone_no_nome,''),'\D','','g')) BETWEEN 12 AND 13
              AND regexp_replace(COALESCE(fone_no_nome,''),'\D','','g') LIKE '55%'
         THEN substr(regexp_replace(fone_no_nome,'\D','','g'),3)
         ELSE regexp_replace(COALESCE(fone_no_nome,''),'\D','','g') END AS fone_nome_norm,
    CASE WHEN length(regexp_replace(COALESCE(telefone,''),'\D','','g')) BETWEEN 12 AND 13
              AND regexp_replace(COALESCE(telefone,''),'\D','','g') LIKE '55%'
         THEN substr(regexp_replace(telefone,'\D','','g'),3)
         ELSE regexp_replace(COALESCE(telefone,''),'\D','','g') END AS fone_orig_norm
  FROM analise
)
SELECT
  CASE
    WHEN NOT tem_letras                   THEN 'ignorado (só número)'
    WHEN fone_no_nome IS NULL             THEN 'ignorado (padrão não detectado)'
    WHEN fone_orig_norm = ''              THEN 'movido → telefone'
    WHEN fone_nome_norm = fone_orig_norm  THEN 'nome limpo'
    ELSE                                       'secundario → telefone2'
  END AS acao,
  count(*) AS total
FROM norm
GROUP BY 1
ORDER BY 1;
