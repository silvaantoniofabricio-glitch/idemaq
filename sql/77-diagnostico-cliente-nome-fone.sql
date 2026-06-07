-- ============================================================
-- DIAGNÓSTICO: clientes com telefone embutido no campo nome
-- Não altera nada — só mostra o que seria feito
-- Rodar ANTES do sql/78 para revisar
-- ============================================================

WITH analise AS (
  SELECT
    id,
    nome                                        AS nome_original,
    telefone                                    AS fone_original,

    -- Extrai primeiro telefone encontrado no nome
    (regexp_match(nome,
      '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}'
    ))[1]                                       AS fone_no_nome,

    -- Nome limpo: remove todos os padrões de fone + lixo de separação
    TRIM(BOTH E' -,/\t' FROM
      regexp_replace(
        regexp_replace(
          regexp_replace(nome,
            '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}', '', 'g'
          ),
          '[/\-,]+\s*$|^\s*[/\-,]+', '', 'g'   -- separadores nas pontas
        ),
        '\s{2,}', ' ', 'g'                       -- espaços duplos
      )
    )                                           AS nome_limpo,

    -- Tem pelo menos uma letra (= tem nome de verdade)?
    (nome ~* '[a-záàãâéèêíìîóòõôúùûç]')        AS tem_letras

  FROM cliente
  WHERE deleted_at IS NULL
    AND nome ~ '\d{7,}'   -- 7+ dígitos seguidos = indica telefone
),
casos AS (
  SELECT
    *,
    CASE
      WHEN NOT tem_letras
        THEN 'IGNORAR — só número, manter nome como está'
      WHEN fone_no_nome IS NULL
        THEN 'IGNORAR — padrão não detectado (revisar manualmente)'
      WHEN fone_original IS NULL OR fone_original = ''
        THEN 'MOVER — telefone vai para campo telefone (estava vazio)'
      WHEN regexp_replace(fone_no_nome, '\D', '', 'g')
           = regexp_replace(fone_original,  '\D', '', 'g')
        THEN 'LIMPAR — mesmo número, só remove do nome'
      ELSE
           'SECUNDÁRIO — número diferente, vai para telefone2'
    END AS acao
  FROM analise
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
