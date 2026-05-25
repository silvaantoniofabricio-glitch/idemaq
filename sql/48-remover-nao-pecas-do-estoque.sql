-- 48-remover-nao-pecas-do-estoque.sql
-- Soft-delete de itens que NÃO são peças de reposição (foram cadastrados por engano
-- via NFe com NCM 84xx/85xx, mas são equipamentos completos / acessórios).

UPDATE peca
SET deleted_at = now()
WHERE sku IN (
  'M-11183',         -- Aspirador De Pó E Água Wap Gtw 10
  'MF-0010',         -- Borracha Tape Lateral Pe Mouse Razer Deathadder
  'Cabo para fone KZ', -- Cabo Kz Tipo C Sem Mic Para Fones
  '50882',           -- Carregador Turbo iPhone Baseus 20w
  '144',             -- Disco Sólido Interno Western Digital 1TB
  '299408',          -- Fritadeira Air Fry OVEN BFR2100P
  '44443',           -- Gabinete Gamer TGT Skylancer V2
  '1840083',         -- Headset Gamer Havit Gamenote H2002d
  '1013'             -- Espuma condutiva
)
AND deleted_at IS NULL;

-- Verificação
SELECT COUNT(*) AS removidos FROM peca
WHERE sku IN ('M-11183','MF-0010','Cabo para fone KZ','50882','144','299408','44443','1840083','1013')
  AND deleted_at IS NOT NULL;

SELECT COUNT(*) AS total_favoritos_ativos
FROM peca WHERE favorito = true AND deleted_at IS NULL;
