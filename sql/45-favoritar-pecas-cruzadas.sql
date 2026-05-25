-- 45-favoritar-pecas-cruzadas.sql
-- Marca como favorito as 39 peças do estoque que tiveram compras
-- identificadas nas NFes do Mercado Livre (cruzamento RELATORIO OUTRAS LOJAS).

UPDATE peca
SET favorito = true
WHERE sku IN ('41029933', '41015623', '41021539', 'W10897149', '41030929', '41015125', '41026360', 'W10791633', '32217110000', '7122107', '584500', '32216110000', 'W10632302', 'W11364875', '41003447', '326000516', '119504', 'W10606115', '6201', 'W11300676', '49', '41037167', 'JO-1245', '5688', '2433', '2382', '41015631', '7112136', 'W10602056', 'W11112652', 'W10647948', '47447810000', '7121114', '41046335', 'W11299805', 'W11300675', '7112108', '32216210000', 'W10355594')
  AND deleted_at IS NULL;

-- Verificação
SELECT COUNT(*) AS total_favoritados FROM peca WHERE favorito = true;
