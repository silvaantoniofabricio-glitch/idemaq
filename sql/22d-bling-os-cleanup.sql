-- sql/22d-bling-os-cleanup.sql
-- PARTE 6/6: dropa as staging tables. Os dados em os/os_item ficam permanentes.

DROP TABLE IF EXISTS _bling_match;
DROP TABLE IF EXISTS _bling_item;
DROP TABLE IF EXISTS _bling_pedido;

SELECT 'Staging tables dropadas. Importação Bling concluída.' AS status;