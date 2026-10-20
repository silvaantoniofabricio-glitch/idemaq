-- Limpeza: soft-delete de 19 OS duplicadas (Trello antigo) +
-- 4 OS lixo [REVISAR-VALOR] sem par + corrige valor_pago do Valter.
-- Cada DELETE mantém a versão TRELLO-MAIO-2026 (a que entrou no fechamento).

BEGIN;

-- 19 duplicatas (tem versao TRELLO-MAIO-2026 do mesmo cliente)
UPDATE os SET deleted_at = now() WHERE id IN (
  'bc319c3d-ba9d-44f2-b9c2-2274bb394551', -- Mauricio Hermes (TRELLO-CARD 12/05) → fica 18/05
  'c132ecad-d15b-42b8-9f64-467e277fc70d', -- Nelci (TRELLO-CARD 19/05) → fica 23/05
  'd6878c0f-0296-48f2-bf10-60b9797695a0', -- Sueli em_oficina 19/05 → fica parcial 23/05
  '941913ed-ecd9-4dd1-be8f-230e1ce13c10', -- Deolinda 06/05 → fica 07/05
  '5bebcf59-c01f-4737-9a66-819ef5aca273', -- Cintia diagnostico 20/05 → fica 23/05
  '6a1e1c0d-82c7-4b65-a66e-1154bdb8fdbe', -- Paula entrega 28/05 → fica parcial 31/05
  '79e59cf0-ed0b-498c-b500-153678cb1944', -- Solange pagamento 27/05 → fica 20/05
  '5fcc6e61-1759-4dcf-a46d-720b3efbb247', -- Gleisy em_oficina 28/05 → fica 31/05
  '8bc3e481-47b1-46e7-a405-cc0ce5a15e57', -- Juliana agendamento 29/05 → fica 21/05
  '49a436cd-76c1-47a0-898b-b3b744de1009', -- Juscilene 04/05 → fica 07/05
  '2e2219cd-5214-43ee-9256-1f547bbbfe79', -- Diana recebido 14/05 → fica 12/05
  '0ad7cfb6-1b7e-4658-8233-34b022207da0', -- Jorge Sena 14/05 nao pago → fica 18/05
  'ecd055d2-2370-4010-9501-30a66a50d698', -- Hellen em_oficina 28/05 → fica concluida 28/05
  'b0b3bc51-fcd5-4fb2-8953-c04908f2d89b', -- Hellen diagnostico 21/05 → fica concluida 28/05
  'e4fe1885-2a90-4cb1-aeb8-12ee0efa0b81', -- Angela em_oficina 19/05 → fica 21/05
  '808a9696-2613-42f9-a3cf-63be3d475e7b', -- Priscila pagamento 14/05 → fica 15/05
  'c057b8cc-2f55-4967-8714-3f365aa0dd1b', -- Valter pagamento 14/05 → fica concluida 14/05
  'b3430d0b-1c84-451d-9338-4058625b991c', -- VICK MANU pagamento 20/05 → fica concluida 20/05
  '023d6a31-8862-4621-8d4b-eae47ed0ba0e'  -- Ilario pagamento 29/05 → fica concluida 29/05
);

-- 4 lixos Trello antigo [REVISAR-VALOR] sem par e sem fechamento financeiro
UPDATE os SET deleted_at = now() WHERE id IN (
  '814a3196-720c-4252-871b-63aadbc885fd', -- Jussara orcamento 0.00
  '174fb490-7ccf-4461-afdd-3b73531ec7df', -- Silveira aguardando 0.00
  'a2a6e48f-c002-42ea-97fc-5e772c638b95', -- Efraim diagnostico 0.00
  '91c12230-3d09-4dd3-9666-0318ec23e133'  -- Luciana Nunes agendamento 0.00
);

-- Corrige Valter: 350 total pago via 2 pix (185 + 165), nao 185
UPDATE os
SET valor_pago = 350.00
WHERE id = '400ef7f1-6526-40bc-804b-1260be04bf48';

COMMIT;

-- Verificacao: deve mostrar 38 OS (36 concluidas + 2 parciais)
SELECT etapa, pago, COUNT(*), SUM(valor_total) as total
FROM os
WHERE criado_em >= '2026-05-01T03:00:00Z'
  AND criado_em < '2026-06-01T03:00:00Z'
  AND deleted_at IS NULL
  AND observacoes ILIKE '%TRELLO-MAIO-2026%'
GROUP BY etapa, pago
ORDER BY etapa;
