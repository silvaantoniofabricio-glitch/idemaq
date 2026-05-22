-- ============================================================================
-- Corrige etapas de OS importadas do Trello que mudaram de mapeamento (v1 → v2)
-- Gerado em 2026-05-21 por scripts/importar-os-trello.mjs
--
-- Por que: na primeira leva do sql/12 o mapeamento de "A RECEBER" era
-- 'recebido', mas o Toni revisou para 'pagamento'. Esse UPDATE corrige as
-- OS que ja foram inseridas com o mapeamento antigo, identificadas pelo tag
-- TRELLO-CARD:<id> nas observacoes. Idempotente — so atualiza se ainda
-- estiver na etapa antiga.
-- ============================================================================

-- A RECEBER: recebido → pagamento  (13 OS)
UPDATE os
   SET etapa = 'pagamento'::os_etapa
 WHERE deleted_at IS NULL
   AND etapa = 'recebido'::os_etapa
   AND observacoes IN (
    'TRELLO-CARD:6a08846b47b579ddcf7b4a22',
    'TRELLO-CARD:6a06091db6d74149db8662e9',
    'TRELLO-CARD:6a060867748f5d53fd13407d',
    'TRELLO-CARD:6a0607925152ac9133df3915',
    'TRELLO-CARD:6a037be9e30b19e07d964376',
    'TRELLO-CARD:6a037bc3ad45b9c0b21c28bb',
    'TRELLO-CARD:69d429e3e25219c54aa478be',
    'TRELLO-CARD:69d10428e41d4d0212611df3',
    'TRELLO-CARD:69a97893d0278a64c91eb567',
    'TRELLO-CARD:69a5c5ea89cfa830a99ed467',
    'TRELLO-CARD:692ed53557ba2f0b37d9dfec',
    'TRELLO-CARD:6859416e59f359dfb6c995cf',
    'TRELLO-CARD:67c8410f9235eb565fa2e27a'
   );

-- Conferencia:
-- SELECT etapa, COUNT(*) FROM os WHERE observacoes LIKE 'TRELLO-CARD:%' GROUP BY etapa;
