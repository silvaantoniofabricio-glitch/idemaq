-- 181-esconder-recusados-ja-convertidos.sql
-- "Converter em Fabricação" (uma das 4 decisões da etapa Recusado) cria uma
-- OS nova e preserva a original recusada — mas até agora ela ficava presa
-- no Kanban pra sempre, mesmo já tendo destino decidido (as outras 3 opções
-- já tiravam a OS do Recusado). O código foi corrigido pra próximas
-- conversões (AcaoRecusada.jsx já marca oculta_no_kanban=true).
--
-- Esse script corrige as que já foram convertidas antes do fix: acha OS
-- recusadas que são "origem" de uma OS de Fabricação (os_origem_id) e
-- marca oculta_no_kanban=true nelas. A OS continua existindo, só some do
-- Kanban (visível via busca/Vendas/relatórios).

-- 1) Diagnóstico — quais recusadas já foram convertidas e ainda aparecem no Kanban.
SELECT
  origem.numero AS os_recusada,
  origem.cliente_id,
  derivada.numero AS os_fabricacao_criada,
  origem.oculta_no_kanban
FROM os origem
JOIN os derivada ON derivada.os_origem_id = origem.id AND derivada.tipo = 'fabricacao'
WHERE origem.etapa = 'recusado'
  AND origem.deleted_at IS NULL;

-- 2) Corrige — esconde do Kanban as recusadas já convertidas.
UPDATE os origem
SET oculta_no_kanban = true
FROM os derivada
WHERE derivada.os_origem_id = origem.id
  AND derivada.tipo = 'fabricacao'
  AND origem.etapa = 'recusado'
  AND origem.deleted_at IS NULL;

-- 3) Confirma quantas foram escondidas.
SELECT count(*) AS total_escondidas
FROM os
WHERE etapa = 'recusado' AND oculta_no_kanban = true;
