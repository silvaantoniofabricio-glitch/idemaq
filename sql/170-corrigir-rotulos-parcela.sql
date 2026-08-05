-- Corrige os NUMEROS DE PARCELA escritos nas descricoes (so texto).
-- Nenhum valor, data ou categoria muda — e correcao de rotulo.
--
-- Origem do erro: em sessoes antigas, sql/62 (fatura Elo Grafite maio) e
-- sql/152 (Cresol Mastercard junho) registraram a parcela um numero abaixo
-- do que a fatura mostra. Conferido contra as faturas originais:
--   MAIO/FATURAS CARTOES/ELO_GRAFITE_raw.txt
--   JUNHO/FATURAS/CRESOL FOTOS DA FATURA/3.jpeg

BEGIN;

-- ── sql/62 — fatura Elo Grafite maio (prefixo FAT-ELO-GRAFITE-MAIO:) ──
UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:ML Autochave 8/12'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:ML Autochave 7/12' AND deleted_at IS NULL;

UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:ML 525003907 7/9'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:ML 525003907 6/9' AND deleted_at IS NULL;

UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:ML AFCCOMERC 7/9'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:ML AFCCOMERC 6/9' AND deleted_at IS NULL;

UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:JIM Wellynton (embreagem Montana) 6/10'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:JIM Wellynton (embreagem Montana) 5/10' AND deleted_at IS NULL;

UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:Deposito ST Catarina (reforma) 3/10'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:Deposito ST Catarina (reforma) 2/10' AND deleted_at IS NULL;

UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:EC DIMAKMAQUINA 3/6'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:EC DIMAKMAQUINA 2/6' AND deleted_at IS NULL;

UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:EC ML 11/02 3/6'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:EC ML 11/02 2/6' AND deleted_at IS NULL;

UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:Imperio da Construcao 3/6'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:Imperio da Construcao 2/6' AND deleted_at IS NULL;

UPDATE lancamento_financeiro SET descricao='FAT-ELO-GRAFITE-MAIO:EC ML 09/03 2/4'
 WHERE descricao='FAT-ELO-GRAFITE-MAIO:EC ML 09/03 1/4' AND deleted_at IS NULL;

-- ── sql/152 — Cresol Mastercard junho (prefixo FAT-CRESOL-MASTER-JUN:) ──
UPDATE lancamento_financeiro SET descricao='FAT-CRESOL-MASTER-JUN:Deposito ST Catarina 13/03 3/10'
 WHERE descricao='FAT-CRESOL-MASTER-JUN:Deposito ST Catarina 13/03 2/10' AND deleted_at IS NULL;

COMMIT;

-- Verificacao: series devem avancar de 1 em 1 entre os meses
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND (descricao ILIKE '%autochave%' OR descricao ILIKE '%imperio da constru%'
    OR descricao ILIKE '%deposito st catarina%' OR descricao ILIKE '%dimakmaquina%'
    OR descricao ILIKE '%afccomerc%' OR descricao ILIKE '%525003%'
    OR descricao ILIKE '%embreagem montana%')
ORDER BY regexp_replace(descricao, '^[A-Z0-9-]+:', ''), vencimento;
