-- 47-revisao-pj-corrigir-faltantes.sql
-- Aplica correções da revisão PJ:
-- 1) Unifica duplicata do agitador A20062301 (mantém SKU 41045248 original, deleta duplicata "inferior elect led 13")
-- 2) Insere 10 peças genuínas que ficaram faltando como favoritas
--    (excluindo 3 ferramentas: Karcher HD 585, Soprador Philco PST01, Esmerilhadeira BTA800 - não são peças de reposição)

BEGIN;

-- =========================================================================
-- 1) Duplicata: agitador A20062301
-- =========================================================================
-- A original (SKU 41045248) é o código de fábrica Electrolux — manter
-- A duplicata foi criada pelo INSERT do sql/46 — soft-delete
UPDATE peca
SET favorito = true
WHERE sku = '41045248';

UPDATE peca
SET deleted_at = now()
WHERE sku = 'inferior elect led 13';

-- =========================================================================
-- 2) Insere 10 peças genuínas faltantes (todas como favoritas)
-- =========================================================================
INSERT INTO peca (nome, sku, descricao, categoria, favorito, qtd_atual, qtd_minima)
VALUES
  ('Botao Centrifuga Roupas Arno Classic Ncra Original',                 'MLB991296017',   'Botao Centrifuga Roupas Arno Classic Ncra Original',                  'botao',     true, 0, 1),
  ('Eixo Tripe Lava e Seca para Lavadora Electrolux',                    'ETLSE',          'Eixo Tripe Lava e Seca para Lavadora Electrolux',                     'outros',    true, 0, 1),
  ('PLACA CONTROLADORA DIGITAL DE PROCESSO COMPATIVEL LR LCA12 V2 BIV',  'CP-3641533',     'PLACA CONTROLADORA DIGITAL DE PROCESSO COMPATIVEL LR LCA12 V2 BIV',   'placa',     true, 0, 1),
  ('RETENTOR DA LAVADORA LAVA E SECA SAMSUNG DC620008A',                 '100259400',      'RETENTOR DA LAVADORA LAVA E SECA SAMSUNG DC620008A',                  'retentor',  true, 0, 1),
  ('Kit 2 Amortecedores Do Cesto Lava E Seca Samsung Original',          '016172 (2)',     'Kit 2 Amortecedores Do Cesto Lava E Seca Samsung Original',           'outros',    true, 0, 1),
  ('Mecanismo Brastemp Consul Eixo Longo',                               '3097',           'Mecanismo Brastemp Consul Eixo Longo',                                'mecanismo', true, 0, 1),
  ('RETENTOR CONSUL / BRASTEMP ELETRONICA BWQ SABO',                     '100217401',      'RETENTOR CONSUL / BRASTEMP ELETRONICA BWQ SABO',                      'retentor',  true, 0, 1),
  ('3 Salva Tanque Brastemp E Consul Com 3 Cola Fixa Tudo',              'MLB5446499595',  '3 Salva Tanque Brastemp E Consul Com 3 Cola Fixa Tudo',               'tampa',     true, 0, 1),
  ('Kit 10 Jogo De Cames Completo Para Consul/ Brastemp',                'MLB5097097020',  'Kit 10 Jogo De Cames Completo Para Consul/ Brastemp',                 'mecanismo', true, 0, 1),
  ('DISPOSITIVO TRAVA PORTA LAVADORA ELECTROLUX LSP11 LSP08 LFE11 220V ORIG', '12147',     'DISPOSITIVO TRAVA PORTA LAVADORA ELECTROLUX LSP11 LSP08 LFE11 220V ORIG', 'outros', true, 0, 1)
ON CONFLICT (sku) DO UPDATE SET
  favorito = true,
  deleted_at = NULL;

COMMIT;

-- Verificação
SELECT COUNT(*) AS total_favoritos FROM peca WHERE favorito = true AND deleted_at IS NULL;
SELECT sku, nome, favorito, deleted_at FROM peca WHERE sku IN ('41045248','inferior elect led 13');
