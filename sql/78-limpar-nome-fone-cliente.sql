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

    (regexp_match(nome,
      '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}'
    ))[1]                                        AS fone_no_nome,

    TRIM(BOTH E' -,/\t' FROM
      regexp_replace(
        regexp_replace(
          regexp_replace(nome,
            '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}', '', 'g'
          ),
          '[/\-,]+\s*$|^\s*[/\-,]+', '', 'g'
        ),
        '\s{2,}', ' ', 'g'
      )
    )                                            AS nome_limpo,

    (nome ~* '[a-záàãâéèêíìîóòõôúùûç]')         AS tem_letras

  FROM cliente
  WHERE deleted_at IS NULL
    AND nome ~ '\d{7,}'
),
casos AS (
  SELECT
    id,
    nome_limpo,
    fone_no_nome,
    telefone,
    CASE
      WHEN NOT tem_letras                                          THEN 'ignorar'
      WHEN fone_no_nome IS NULL                                    THEN 'ignorar'
      WHEN telefone IS NULL OR telefone = ''                       THEN 'mover'
      WHEN regexp_replace(fone_no_nome, '\D', '', 'g')
           = regexp_replace(telefone, '\D', '', 'g')               THEN 'limpar'
      ELSE                                                              'secundario'
    END AS acao
  FROM analise
)
UPDATE cliente c
SET
  nome = CASE
           WHEN casos.acao = 'ignorar' THEN c.nome   -- mantém exato
           ELSE casos.nome_limpo                      -- nome sem fone
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

-- Resumo do que foi alterado
SELECT
  acao,
  count(*) AS total
FROM (
  WITH analise AS (
    SELECT
      id,
      nome,
      telefone,
      (regexp_match(nome,
        '\(?\d{2}\)?[\s.\-]*\d{4,5}[\s.\-]?\d{4}'
      ))[1]                                        AS fone_no_nome,
      (nome ~* '[a-záàãâéèêíìîóòõôúùûç]')         AS tem_letras
    FROM cliente
    WHERE deleted_at IS NULL
      AND nome ~ '\d{7,}'
  )
  SELECT
    CASE
      WHEN NOT tem_letras                                        THEN 'ignorar'
      WHEN fone_no_nome IS NULL                                  THEN 'ignorar'
      WHEN telefone IS NULL OR telefone = ''                     THEN 'mover → telefone'
      WHEN regexp_replace(fone_no_nome, '\D', '', 'g')
           = regexp_replace(telefone, '\D', '', 'g')             THEN 'limpar nome'
      ELSE                                                            'secundario → telefone2'
    END AS acao
  FROM analise
) t
GROUP BY acao
ORDER BY acao;
