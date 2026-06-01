-- Move 4 lancamentos de combustivel da empresa pra PF (estavam erradamente classificados PJ).
-- Foram pagos com cartoes do Toni (Elo Grafite + Inter) mas o abastecimento foi pessoal.
-- Total: R$ 190 (50 + 20 + 20 + 100). Equivalentes adicionados em src/data/controleFinanceiroPF.js (Toni).

BEGIN;

UPDATE lancamento_financeiro
   SET deleted_at = now(),
       excluido_por = auth.uid()
 WHERE deleted_at IS NULL
   AND descricao IN (
     'FAT-ELO-GRAFITE-MAIO:Mano Auto Posto 03/04',
     'FAT-ELO-GRAFITE-MAIO:Portal Auto Posto 10/04',
     'FAT-INTER-MAIO:Mano Auto Posto 05/05',
     'FAT-INTER-MAIO:Mano Auto Posto 03/05'
   );

COMMIT;

-- Verificacao
SELECT descricao, valor, deleted_at IS NOT NULL AS removido
  FROM lancamento_financeiro
 WHERE descricao IN (
   'FAT-ELO-GRAFITE-MAIO:Mano Auto Posto 03/04',
   'FAT-ELO-GRAFITE-MAIO:Portal Auto Posto 10/04',
   'FAT-INTER-MAIO:Mano Auto Posto 05/05',
   'FAT-INTER-MAIO:Mano Auto Posto 03/05'
 );
