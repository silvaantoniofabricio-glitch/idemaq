-- ============================================================
-- DIAGNÓSTICO: clientes com telefone embutido no campo nome
-- Não altera nada — só mostra o que seria feito
-- Rodar ANTES do sql/78 para revisar
-- ============================================================

WITH analise AS (
  SELECT
    id,
    nome                                            AS nome_original,
    telefone                                        AS fone_original,

    -- Extrai primeiro telefone do nome (ordem de prioridade):
    -- 1. Internacional: 55 + 10-11 dígitos (ex: 556784568534)
    -- 2. Formato BR padrão: (DD) NNNNN-NNNN ou variações
    -- 3. Bare 8-9 dígitos sem código de área
    COALESCE(
      (regexp_match(nome, '55[0-9]{10,11}'))[1],
      (regexp_match(nome, '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}'))[1],
      (regexp_match(nome, '(^|[^0-9])([0-9]{8,9})([^0-9]|$)'))[2]
    )                                               AS fone_no_nome,

    -- Nome limpo: remove internacional → formatado → bare 8-9 dígitos
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
    )                                               AS nome_pre_limpo,

    (nome ~* '[a-záàãâéèêíìîóòõôúùûç]')            AS tem_letras

  FROM cliente
  WHERE deleted_at IS NULL
    AND nome ~ '\d{7,}'
),
com_nome_limpo AS (
  SELECT
    *,
    -- Remove separadores nas pontas que sobram após extrair o fone
    regexp_replace(
      regexp_replace(nome_pre_limpo, '\s*[/\-,]\s*$', ''),
      '^\s*[/\-,]\s*', ''
    ) AS nome_limpo
  FROM analise
),
-- Normaliza fones para comparação: remove não-dígitos + strip prefixo 55 internacional
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
      WHEN length(regexp_replace(COALESCE(fone_original, ''), '\D', '', 'g')) BETWEEN 12 AND 13
        AND regexp_replace(COALESCE(fone_original, ''), '\D', '', 'g') LIKE '55%'
      THEN substr(regexp_replace(fone_original, '\D', '', 'g'), 3)
      ELSE regexp_replace(COALESCE(fone_original, ''), '\D', '', 'g')
    END AS fone_orig_norm
  FROM com_nome_limpo
),
casos AS (
  SELECT
    *,
    CASE
      WHEN NOT tem_letras                   THEN 'IGNORAR — só número, manter nome como está'
      WHEN fone_no_nome IS NULL             THEN 'IGNORAR — padrão não detectado (revisar manualmente)'
      WHEN fone_orig_norm = ''              THEN 'MOVER — telefone vai para campo telefone (estava vazio)'
      WHEN fone_nome_norm = fone_orig_norm  THEN 'LIMPAR — mesmo número, só remove do nome'
      ELSE                                       'SECUNDÁRIO — número diferente, vai para telefone2'
    END AS acao
  FROM norm
)
SELECT
  id,
  nome_original,
  nome_limpo,
  fone_original,
  fone_no_nome,
  acao
FROM casos
ORDER BY acao, nome_original;
