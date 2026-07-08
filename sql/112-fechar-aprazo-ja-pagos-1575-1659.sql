-- 112-fechar-aprazo-ja-pagos-1575-1659.sql
-- Fecha 2 lançamentos "a prazo" que ficaram abertos mesmo já tendo sido
-- pagos (bug: confirmar pagamento na OS insere um lançamento novo mas não
-- fecha o "a prazo" pendente que já existia pra mesma OS).
--
-- OS #1575: aberto 75b277e2-2f45-4d57-a8f6-0e65a2b34c3e (R$520, venc 01/07)
--           <-> pago  ecfdeef2-89ec-45ea-bf03-7b86a05c1087 (pix, pago em 01/07)
-- OS #1659: aberto c8ac7910-31a2-4da7-9f64-04c01f6fd460 (R$280, venc 01/07)
--           <-> pago  5c1bf243-e385-4e1e-87ad-6250d16608db (pix, pago em 01/07)
--
-- Usa o mesmo mecanismo de `lancamento_duplicata` (sql/29) — não deleta nada,
-- só marca o "a prazo" como duplicata do pagamento real. A view
-- vw_lancamentos_validos passa a escondê-lo automaticamente.

INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
VALUES
  ('75b277e2-2f45-4d57-a8f6-0e65a2b34c3e', 'ecfdeef2-89ec-45ea-bf03-7b86a05c1087', 'OS-APRAZO-JA-PAGO', 0),
  ('c8ac7910-31a2-4da7-9f64-04c01f6fd460', '5c1bf243-e385-4e1e-87ad-6250d16608db', 'OS-APRAZO-JA-PAGO', 0)
ON CONFLICT (id_duplicata) DO NOTHING;

-- Conferir depois: deve devolver 0 linhas (os dois sumiram do "A receber")
SELECT id, os_id, valor, vencimento, descricao
FROM vw_lancamentos_validos
WHERE id IN ('75b277e2-2f45-4d57-a8f6-0e65a2b34c3e', 'c8ac7910-31a2-4da7-9f64-04c01f6fd460');
