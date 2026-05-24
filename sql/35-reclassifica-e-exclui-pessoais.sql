-- sql/35-reclassifica-e-exclui-pessoais.sql
-- Refina categorias do Cresol baseado no perfil dos destinatários (informado por Toni).
-- Marca os pessoais/fatura cartão como "excluir do DRE" via lancamento_duplicata
-- com auto-referência (id_principal = id_duplicata + cenario='EXCLUIR-DRE-*').

-- ────────── PARTE 1: reclassificação de categorias ──────────
-- Pra cada destinatário do PIX, atualiza pra categoria correta

UPDATE lancamento_financeiro SET categoria='Salários'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND descricao ILIKE '%THIAGO FERREIRA%';

UPDATE lancamento_financeiro SET categoria='Compras de fornecedores'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND (descricao ILIKE '%DUFRIO%' OR descricao ILIKE '%REFRIGERACAO DUFRIO%');

UPDATE lancamento_financeiro SET categoria='Impostos sobre vendas'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND (descricao ILIKE '%RECEITA FEDERAL%' OR descricao ILIKE '%MINISTERIO DA FAZENDA%');

UPDATE lancamento_financeiro SET categoria='Manutenção predial'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND descricao ILIKE '%GILVANE MELO%';

UPDATE lancamento_financeiro SET categoria='Compras de fornecedores'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND descricao ILIKE '%BRAZA BANK%';

UPDATE lancamento_financeiro SET categoria='Serviços contábeis'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND descricao ILIKE '%DANILO HENRIQUE%';

UPDATE lancamento_financeiro SET categoria='Internet'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND descricao ILIKE '%MELHORNET%';

UPDATE lancamento_financeiro SET categoria='Salários'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND (descricao ILIKE '%ALESSANDRO DA SILVA M%' OR descricao ILIKE '%GUILHERME DE OLIVEIRA%');

UPDATE lancamento_financeiro SET categoria='Água'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND descricao ILIKE '%SANESUL%';

UPDATE lancamento_financeiro SET categoria='Manutenção de veículos'
WHERE tipo='despesa' AND categoria='PIX enviado'
  AND descricao ILIKE '%CAIXA ECONOMICA%';

-- ────────── PARTE 2: marca pessoais pra EXCLUIR DO DRE ──────────
-- Permite auto-referência: id_principal = id_duplicata (pseudo-marcador)

INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
SELECT id, id, 'EXCLUIR-DRE-FATURA-CARTAO', 0
FROM lancamento_financeiro
WHERE descricao ILIKE '%MERCADO PAGO INSTITUI%'
  AND tipo='despesa'
  AND deleted_at IS NULL
ON CONFLICT (id_duplicata) DO NOTHING;

INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
SELECT id, id, 'EXCLUIR-DRE-INTRA-CONTA', 0
FROM lancamento_financeiro
WHERE descricao ILIKE '%DES: ANTONIO FABRICIO DA S%'
  AND tipo='despesa'
  AND deleted_at IS NULL
ON CONFLICT (id_duplicata) DO NOTHING;

INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
SELECT id, id, 'EXCLUIR-DRE-DOACAO-PESSOAL', 0
FROM lancamento_financeiro
WHERE (descricao ILIKE '%COMUNIDADE EVANGELICA%'
    OR descricao ILIKE '%FED NACIONAL COMUNIDA%')
  AND tipo='despesa'
  AND deleted_at IS NULL
ON CONFLICT (id_duplicata) DO NOTHING;

INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
SELECT id, id, 'EXCLUIR-DRE-CONJUGE', 0
FROM lancamento_financeiro
WHERE descricao ILIKE '%RAFAELA GARCIA%'
  AND tipo='despesa'
  AND deleted_at IS NULL
ON CONFLICT (id_duplicata) DO NOTHING;

-- ────────── RESULTADO ──────────

-- 1. Categorias após reclassificação (top 20)
SELECT
  COALESCE(categoria, '(sem categoria)') AS categoria,
  COUNT(*) AS qtd,
  SUM(valor) AS soma
FROM vw_dre_real
WHERE tipo='despesa'
GROUP BY 1
ORDER BY soma DESC
LIMIT 20;

-- 2. Novo balanço DRE (sem pessoais)
SELECT
  SUM(receita) AS receita_total,
  SUM(despesa) AS despesa_total,
  SUM(lucro) AS lucro_total,
  COUNT(*) AS meses_cobertos,
  ROUND(SUM(receita)::numeric / NULLIF(COUNT(*), 0), 2) AS receita_media_mes,
  ROUND(SUM(despesa)::numeric / NULLIF(COUNT(*), 0), 2) AS despesa_media_mes,
  ROUND(SUM(lucro)::numeric / NULLIF(COUNT(*), 0), 2) AS lucro_medio_mes
FROM vw_dre_mensal;
