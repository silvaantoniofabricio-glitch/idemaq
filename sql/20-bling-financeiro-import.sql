-- ============================================================
-- sql/20-bling-financeiro-import.sql
-- Importa contas_receber + contas_pagar do Bling em lancamento_financeiro.
-- Idempotente: cada lançamento tem tag "BLING-REC:<ID>" ou "BLING-PAG:<ID>"
-- no campo descricao; INSERT só roda WHERE NOT EXISTS.
--
-- Total: 680 receitas + 1235 despesas
-- Soma: R$ 213019.58 (rec) + R$ 203084.34 (pag)
-- ============================================================

BEGIN;

-- 1. Garante que a conta "Caixa Bling" existe
INSERT INTO conta_bancaria (nome, tipo)
SELECT 'Caixa Bling', 'banco'
WHERE NOT EXISTS (SELECT 1 FROM conta_bancaria WHERE nome = 'Caixa Bling');

-- ============================================================
-- 2. INSERT contas a receber (680)
-- ============================================================
-- CONTAS A RECEBER — batch 1/4 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'receita',
    630.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841846 Agmar Gobato Ferrari',
    '2024-11-19'::date,
    '2024-11-19'::date,
    'pix'
  ),
  (
    'receita',
    680.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841855 Leonardo Kazuto Seko',
    '2024-11-05'::date,
    '2024-11-05'::date,
    'pix'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841865 Karina Dias Durval',
    '2024-11-04'::date,
    '2024-11-04'::date,
    'pix'
  ),
  (
    'receita',
    600.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841873 Iracema Marques',
    '2024-11-06'::date,
    '2024-11-06'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841881 Ercilia Felix Gaspar',
    '2024-11-06'::date,
    '2024-11-06'::date,
    'pix'
  ),
  (
    'receita',
    60.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841894 Fabiane Arruda Pittas',
    '2024-11-07'::date,
    '2024-11-07'::date,
    'pix'
  ),
  (
    'receita',
    130.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841902 Cliente W 67 8404-8926',
    '2024-11-08'::date,
    '2024-11-08'::date,
    'pix'
  ),
  (
    'receita',
    200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841911 Antonio do Vale Camelo',
    '2024-11-07'::date,
    '2024-11-07'::date,
    'pix'
  ),
  (
    'receita',
    200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841924 Claudinei Pereira Silva',
    '2024-11-07'::date,
    '2024-11-07'::date,
    'pix'
  ),
  (
    'receita',
    210.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841934 Maria Clara de Lisboa Santos',
    '2024-11-11'::date,
    '2024-11-11'::date,
    'pix'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841948 Marcio Aparecido de Araujo',
    '2024-11-14'::date,
    '2024-11-14'::date,
    'pix'
  ),
  (
    'receita',
    550.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841959 Sueli Santos',
    '2024-11-14'::date,
    '2024-11-14'::date,
    'pix'
  ),
  (
    'receita',
    85.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841972 Keli Patricia N Bogaz',
    '2024-11-16'::date,
    '2024-11-16'::date,
    'pix'
  ),
  (
    'receita',
    155.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653841983 Nair Peron Lepre',
    '2024-11-19'::date,
    '2024-11-19'::date,
    'pix'
  ),
  (
    'receita',
    325.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842005 Reber Coutinho Capile',
    '2024-11-19'::date,
    '2024-11-19'::date,
    'pix'
  ),
  (
    'receita',
    190.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842028 Cliente W 67 9615-4474',
    '2024-11-01'::date,
    '2024-11-01'::date,
    'credito_1x'
  ),
  (
    'receita',
    368.98::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842050 Gelton',
    '2024-11-05'::date,
    '2024-11-05'::date,
    'credito_1x'
  ),
  (
    'receita',
    450.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842073 Claudinei Pereira Silva',
    '2024-11-07'::date,
    '2024-11-07'::date,
    'credito_1x'
  ),
  (
    'receita',
    274.37::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842085 Nelson',
    '2024-11-07'::date,
    '2024-11-07'::date,
    'credito_1x'
  ),
  (
    'receita',
    560.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842109 André',
    '2024-11-07'::date,
    '2024-11-07'::date,
    'credito_1x'
  ),
  (
    'receita',
    184.02::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842127 67 9978-0056',
    '2024-11-08'::date,
    '2024-11-08'::date,
    'credito_1x'
  ),
  (
    'receita',
    330.68::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842145 Elizaneth Bressa',
    '2024-11-19'::date,
    '2024-11-19'::date,
    'credito_1x'
  ),
  (
    'receita',
    930.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842161 ADEMAR DA SILVA SANTOS-HOTEL',
    '2024-11-25'::date,
    '2024-11-25'::date,
    'pix'
  ),
  (
    'receita',
    190.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842176 Cliente w 556784568534',
    '2024-11-21'::date,
    '2024-12-02'::date,
    'pix'
  ),
  (
    'receita',
    240.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842183 Rozimeire de Souza',
    '2024-11-22'::date,
    '2024-11-22'::date,
    'pix'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842193 Raquel',
    '2024-11-26'::date,
    '2024-11-26'::date,
    'pix'
  ),
  (
    'receita',
    345.08::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842201 Eliane Sturnich',
    '2024-11-16'::date,
    '2024-11-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    355.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653842211 Ruth Ferreira',
    '2024-11-18'::date,
    '2024-11-18'::date,
    'pix'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21653869631 Antonio do Vale Camelo',
    '2024-12-07'::date,
    '2024-12-09'::date,
    NULL
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330239 67 9831-6694',
    '2024-10-01'::date,
    '2024-10-01'::date,
    'pix'
  ),
  (
    'receita',
    190.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330249 67 9629-8560',
    '2024-10-02'::date,
    '2024-10-02'::date,
    'pix'
  ),
  (
    'receita',
    205.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330260 67 9977-1390',
    '2024-10-02'::date,
    '2024-10-02'::date,
    'pix'
  ),
  (
    'receita',
    380.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330268 67 9977-1296',
    '2024-10-03'::date,
    '2024-10-03'::date,
    'pix'
  ),
  (
    'receita',
    300.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330274 Sebastiao',
    '2024-10-04'::date,
    '2024-10-04'::date,
    'pix'
  ),
  (
    'receita',
    462.15::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330282 Florindo',
    '2024-10-05'::date,
    '2024-10-05'::date,
    'credito_1x'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330288 Antonio Fazenda Três Irmaos',
    '2024-10-07'::date,
    '2024-10-07'::date,
    'pix'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330294 44 9168-8435',
    '2024-10-05'::date,
    '2024-10-05'::date,
    'pix'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330300 21 99690-4761',
    '2024-10-07'::date,
    '2024-10-07'::date,
    'pix'
  ),
  (
    'receita',
    200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330306 67 9884-6812',
    '2024-10-07'::date,
    '2024-10-07'::date,
    'pix'
  ),
  (
    'receita',
    270.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330314 67 9821-2779',
    '2024-10-08'::date,
    '2024-10-08'::date,
    'pix'
  ),
  (
    'receita',
    80.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330321 67 9959-5984',
    '2024-10-08'::date,
    '2024-10-08'::date,
    'pix'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330326 Elizângela',
    '2024-10-08'::date,
    '2024-10-08'::date,
    'pix'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330334 9673-8421',
    '2024-10-09'::date,
    '2024-10-09'::date,
    'pix'
  ),
  (
    'receita',
    640.11::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330343 67 9977-1265',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    325.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330353 André Gava',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'pix'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330361 67 9226-9375',
    '2024-10-12'::date,
    '2024-10-12'::date,
    'pix'
  ),
  (
    'receita',
    174.33::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330374 67 8479-2651',
    '2024-10-12'::date,
    '2024-10-12'::date,
    'credito_1x'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330386 67984412695',
    '2024-10-12'::date,
    '2024-10-12'::date,
    'pix'
  ),
  (
    'receita',
    600.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330399 67 9907-5211',
    '2024-10-12'::date,
    '2024-10-12'::date,
    'pix'
  ),
  (
    'receita',
    130.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330410 67 9996-5866',
    '2024-10-14'::date,
    '2024-10-14'::date,
    'pix'
  ),
  (
    'receita',
    135.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330419 aline gabriela',
    '2024-10-14'::date,
    '2024-10-14'::date,
    'pix'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330426 Junão',
    '2024-10-15'::date,
    '2024-10-15'::date,
    'pix'
  ),
  (
    'receita',
    690.65::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330436 67 9658-9676',
    '2024-10-16'::date,
    '2024-10-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    693.23::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330443 67 9680-5129',
    '2024-10-16'::date,
    '2024-10-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    130.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330452 67 9913-1216',
    '2024-10-16'::date,
    '2024-10-16'::date,
    'pix'
  ),
  (
    'receita',
    390.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330457 67 9698-4488',
    '2024-10-19'::date,
    '2024-10-19'::date,
    'pix'
  ),
  (
    'receita',
    220.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330464 Evanir',
    '2024-10-21'::date,
    '2024-10-21'::date,
    'pix'
  ),
  (
    'receita',
    370.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330475 67 9823-4035',
    '2024-10-23'::date,
    '2024-10-23'::date,
    'pix'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330486 6799423050',
    '2024-10-23'::date,
    '2024-10-23'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330496 terezinha',
    '2024-10-24'::date,
    '2024-10-24'::date,
    'pix'
  ),
  (
    'receita',
    264.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330507 67 9253-9863',
    '2024-10-25'::date,
    '2024-10-25'::date,
    'credito_1x'
  ),
  (
    'receita',
    200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21663330520 67 9837-1888',
    '2024-10-31'::date,
    '2024-10-31'::date,
    'pix'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21669705851 Regina Limpeza de Lavadora',
    '2024-11-28'::date,
    '2024-11-28'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21682256685 67 9837-1888',
    '2024-11-29'::date,
    '2024-11-29'::date,
    'pix'
  ),
  (
    'receita',
    550.00::numeric,
    'Outros',
    'BLING-REC:21691168512 Kassiane Ref. a ordem de serviço nº 6',
    '2024-12-02'::date,
    '2024-12-01'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    549.40::numeric,
    'Vendas de produtos',
    'BLING-REC:21691177058 Maria Venda de Lavadora',
    '2024-12-22'::date,
    '2024-12-01'::date,
    'credito_1x'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21703734641 Maria Cecilia Sanches Ref. a ordem de serviço nº 8',
    '2024-12-03'::date,
    '2024-12-02'::date,
    'pix'
  ),
  (
    'receita',
    289.94::numeric,
    'Vendas de serviços',
    'BLING-REC:21729004135 Eder Storari Ref. a ordem de serviço nº 7',
    '2024-12-03'::date,
    '2024-12-04'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    60.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729022916 Lucilda Cliente Ref. a ordem de serviço nº 13',
    '2024-12-05'::date,
    '2024-12-03'::date,
    'pix'
  ),
  (
    'receita',
    179.99::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148221 67 9123-5762',
    '2024-09-01'::date,
    '2024-09-01'::date,
    'pix'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148226 67 9930-0352',
    '2024-09-03'::date,
    '2024-09-03'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148232 67 9977-9812',
    '2024-09-02'::date,
    '2024-09-02'::date,
    'pix'
  ),
  (
    'receita',
    120.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148239 Luiz Cesar',
    '2024-09-03'::date,
    '2024-09-03'::date,
    'pix'
  ),
  (
    'receita',
    300.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148244 Ednalva Cliente',
    '2024-09-08'::date,
    '2024-09-08'::date,
    'pix'
  ),
  (
    'receita',
    370.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148249 67 9918-8747',
    '2024-09-05'::date,
    '2024-09-05'::date,
    'pix'
  ),
  (
    'receita',
    697.12::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148254 67 9338-1127',
    '2024-09-06'::date,
    '2024-09-06'::date,
    'pix'
  ),
  (
    'receita',
    120.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148261 6784410834',
    '2024-09-05'::date,
    '2024-09-05'::date,
    'pix'
  ),
  (
    'receita',
    600.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148266 44 9809-0813',
    '2024-09-09'::date,
    '2024-09-09'::date,
    'pix'
  ),
  (
    'receita',
    100.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148271 44999359435',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'pix'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148276 Célia',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148281 danal',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'pix'
  ),
  (
    'receita',
    50.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148286 silvio',
    '2024-09-11'::date,
    '2024-09-11'::date,
    'pix'
  ),
  (
    'receita',
    540.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148291 18 99701-9204',
    '2024-09-13'::date,
    '2024-09-13'::date,
    'pix'
  ),
  (
    'receita',
    100.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148296 67 9959-5984',
    '2024-09-12'::date,
    '2024-09-12'::date,
    'pix'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148304 45 9954-0136',
    '2024-09-13'::date,
    '2024-09-13'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148310 Giancarla Baraldi',
    '2024-09-13'::date,
    '2024-09-13'::date,
    'pix'
  ),
  (
    'receita',
    80.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148316 67 8403-1007',
    '2024-09-13'::date,
    '2024-09-13'::date,
    'pix'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148321 Fran Moreno',
    '2024-09-15'::date,
    '2024-09-15'::date,
    'pix'
  ),
  (
    'receita',
    200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148327 67 8447-7691',
    '2024-09-17'::date,
    '2024-09-17'::date,
    'pix'
  ),
  (
    'receita',
    25.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148333 -',
    '2024-09-17'::date,
    '2024-09-17'::date,
    'pix'
  ),
  (
    'receita',
    500.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148339 Junão',
    '2024-09-17'::date,
    '2024-09-17'::date,
    'pix'
  ),
  (
    'receita',
    660.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148344 Greyce Zezak',
    '2024-09-17'::date,
    '2024-09-17'::date,
    'pix'
  ),
  (
    'receita',
    630.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148349 67 8111-7893',
    '2024-09-18'::date,
    '2024-09-18'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148354 67 8136-2023',
    '2024-09-18'::date,
    '2024-09-18'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148361 6796164225',
    '2024-09-19'::date,
    '2024-09-19'::date,
    'pix'
  ),
  (
    'receita',
    200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148367 Eliete',
    '2024-09-18'::date,
    '2024-09-18'::date,
    'pix'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148372 67 9648-9731',
    '2024-09-18'::date,
    '2024-09-18'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148377 67 9609-9979',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148383 Beatriz firmino',
    '2024-09-23'::date,
    '2024-09-23'::date,
    'pix'
  ),
  (
    'receita',
    80.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148388 Elizângela',
    '2024-09-23'::date,
    '2024-09-23'::date,
    'pix'
  ),
  (
    'receita',
    290.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148393 Isabela Bressa',
    '2024-09-25'::date,
    '2024-09-25'::date,
    'pix'
  ),
  (
    'receita',
    580.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148399 67 9643-1581',
    '2024-09-27'::date,
    '2024-09-27'::date,
    'pix'
  ),
  (
    'receita',
    600.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21729148406 sem nome',
    '2024-09-28'::date,
    '2024-09-28'::date,
    'pix'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21738121176 Janaina Ref. a ordem de serviço nº 14',
    '2024-12-20'::date,
    '2024-12-23'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    340.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21743784158 Rosalina Souza Ref. a ordem de serviço nº 5',
    '2024-12-01'::date,
    '2024-12-06'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    240.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21743864143 Marta Ernega Ref. a ordem de serviço nº 1 | Cheque',
    '2025-02-06'::date,
    '2025-02-13'::date,
    'cheque'
  ),
  (
    'receita',
    240.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21743864152 Marta Ernega Ref. a ordem de serviço nº 1 | Cheque',
    '2025-01-06'::date,
    '2025-01-10'::date,
    'cheque'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21745117247 Valquimir Barbosa Candido Ref. a ordem de serviço nº 15',
    '2024-12-07'::date,
    '2024-12-06'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21753261090 Mary Gabrielly Ref. a ordem de serviço nº 17',
    '2024-12-09'::date,
    '2024-12-07'::date,
    'pix'
  ),
  (
    'receita',
    399.12::numeric,
    'Vendas de serviços',
    'BLING-REC:21768558760 Marcos Ref. a ordem de serviço nº 3',
    '2024-11-30'::date,
    '2024-12-13'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    430.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21768564966 Nilson Jesus Lopes Ref. a ordem de serviço nº 4',
    '2024-11-29'::date,
    '2024-12-09'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    330.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21768579070 João Ferreira Ref. a ordem de serviço nº 16',
    '2024-12-07'::date,
    '2024-12-09'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    315.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21776312694 Luzia Valério Ref. a ordem de serviço nº 18 | PIX',
    '2025-01-07'::date,
    '2025-01-07'::date,
    'pix'
  ),
  (
    'receita',
    430.98::numeric,
    'Vendas de serviços',
    'BLING-REC:21776312704 Luzia Valério Ref. a ordem de serviço nº 18 | Cartão',
    '2025-01-10'::date,
    '2024-12-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    102.17::numeric,
    'Vendas de serviços',
    'BLING-REC:21776506568 Edneide Ribeiro Ref. a ordem de serviço nº 20 | Automatico no Infinity',
    '2024-11-11'::date,
    '2024-11-11'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    102.17::numeric,
    'Vendas de serviços',
    'BLING-REC:21776506573 Edneide Ribeiro Ref. a ordem de serviço nº 20 | Automatico no Infinity',
    '2024-12-09'::date,
    '2024-12-09'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    102.17::numeric,
    'Vendas de serviços',
    'BLING-REC:21776506579 Edneide Ribeiro Ref. a ordem de serviço nº 20 | Automatico no Infinity',
    '2025-01-08'::date,
    '2025-01-08'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    102.17::numeric,
    'Vendas de serviços',
    'BLING-REC:21776506585 Edneide Ribeiro Ref. a ordem de serviço nº 20 | Automatico no Infinity',
    '2025-02-07'::date,
    '2025-02-07'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    102.17::numeric,
    'Vendas de serviços',
    'BLING-REC:21776506590 Edneide Ribeiro Ref. a ordem de serviço nº 20 | Automatico no Infinity',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21778759432 Karen Evellin Ref. a ordem de serviço nº 19 | PIX',
    '2024-12-09'::date,
    '2024-12-09'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    120.00::numeric,
    'Outros',
    'BLING-REC:21786443928 Cleuza Ref. a ordem de serviço nº 24',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    120.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21786443940 Cleuza Ref. a ordem de serviço nº 24',
    '2025-01-10'::date,
    '2025-01-04'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    400.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21797116567 Astolfo Ref. a ordem de serviço nº 25',
    '2024-12-12'::date,
    '2024-12-12'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    339.29::numeric,
    'Vendas de serviços',
    'BLING-REC:21797124884 Bisteca Ref. a ordem de serviço nº 26',
    '2024-12-12'::date,
    '2024-12-13'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    210.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21797156016 Maria Lisboa',
    '2024-12-20'::date,
    '2025-01-09'::date,
    'pix'
  ),
  (
    'receita',
    450.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21809564901 Juscelina Ref. a ordem de serviço nº 27',
    '2024-12-20'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21828107587 Thayna Ref. a ordem de serviço nº 28',
    '2024-12-16'::date,
    '2024-12-16'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    700.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21828845363 Diego Pachega Ref. ao pedido de venda nº 59',
    '2024-12-16'::date,
    '2024-12-16'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    550.00::numeric,
    'Vendas de produtos',
    'BLING-REC:21829666720 Rodrigo Ref. ao pedido de venda nº 60',
    '2024-12-16'::date,
    '2024-12-16'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    309.60::numeric,
    'Vendas de serviços',
    'BLING-REC:21838908310 Bruno Bravo Ref. ao pedido de venda nº 62',
    '2024-12-17'::date,
    '2024-12-17'::date,
    'credito_1x'
  ),
  (
    'receita',
    80.00::numeric,
    'Vendas de mercadorias',
    'BLING-REC:21838908454 Bruno Bravo Ref. ao pedido de venda nº 61',
    '2024-12-17'::date,
    '2024-12-17'::date,
    'credito_1x'
  ),
  (
    'receita',
    690.00::numeric,
    'Vendas de produtos',
    'BLING-REC:21839560092 Carol Souza Ref. ao pedido de venda nº 63',
    '2024-12-17'::date,
    '2024-12-17'::date,
    'pix'
  ),
  (
    'receita',
    390.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21855188535 Helder Ref. a ordem de serviço nº 30',
    '2024-12-16'::date,
    '2024-12-19'::date,
    'pix'
  ),
  (
    'receita',
    493.70::numeric,
    'Vendas de serviços',
    'BLING-REC:21880873617 Rose Ref. a ordem de serviço nº 23',
    '2024-12-03'::date,
    '2024-12-23'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:21901270129 Eliana magazine Ref. ao pedido de venda nº 66',
    '2024-12-27'::date,
    '2024-12-28'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    1200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22015784065 José Roseni Ref. ao pedido de venda nº 70',
    '2025-01-04'::date,
    '2025-01-04'::date,
    'dinheiro'
  ),
  (
    'receita',
    494.50::numeric,
    'Vendas de serviços',
    'BLING-REC:22018173384 Ana Carolina Diniz Ref. ao pedido de venda nº 69',
    '2025-01-04'::date,
    '2025-01-04'::date,
    'credito_1x'
  ),
  (
    'receita',
    660.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22018392733 William Ref. ao pedido de venda nº 72',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'pix'
  ),
  (
    'receita',
    120.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22018957287 Izabel Ref. ao pedido de venda nº 78',
    '2025-01-13'::date,
    '2025-01-13'::date,
    'pix'
  ),
  (
    'receita',
    410.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22019142101 Roseni Ref. ao pedido de venda nº 74',
    '2025-02-05'::date,
    '2025-02-05'::date,
    'pix'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22019177987 Claudia Gomes Ref. ao pedido de venda nº 79',
    '2025-01-13'::date,
    '2025-01-13'::date,
    'pix'
  ),
  (
    'receita',
    556.65::numeric,
    'Vendas de serviços',
    'BLING-REC:22019222159 Maria Rita Cassiano Ref. ao pedido de venda nº 80',
    '2025-01-09'::date,
    '2025-01-09'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    385.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22023674033 Dhane Ref. ao pedido de venda nº 75',
    '2025-01-14'::date,
    '2025-01-14'::date,
    'pix'
  ),
  (
    'receita',
    565.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22023701312 Luiz Nantes Ref. ao pedido de venda nº 73',
    '2025-01-09'::date,
    '2025-01-09'::date,
    'pix'
  ),
  (
    'receita',
    515.70::numeric,
    'Vendas de serviços',
    'BLING-REC:22043227159 Janete Rocha Ref. ao pedido de venda nº 81',
    '2025-01-17'::date,
    '2025-01-17'::date,
    'credito_1x'
  ),
  (
    'receita',
    355.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22043255721 Ana Paula Ref. ao pedido de venda nº 82',
    '2025-01-17'::date,
    '2025-01-17'::date,
    'pix'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22043265243 Sirley Ref. ao pedido de venda nº 76',
    '2025-01-16'::date,
    '2025-01-16'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    460.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22043577504 Flávio Rodrigues Ref. ao pedido de venda nº 68',
    '2025-01-06'::date,
    '2025-01-06'::date,
    'pix'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22043599267 Rozimeire de Souza Ref. ao pedido de venda nº 83',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'pix'
  ),
  (
    'receita',
    419.18::numeric,
    'Vendas de serviços',
    'BLING-REC:22045891294 Nelci Ref. ao pedido de venda nº 84',
    '2025-01-09'::date,
    '2025-01-09'::date,
    'credito_1x'
  ),
  (
    'receita',
    360.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22083855222 Fabiana Ref. ao pedido de venda nº 86',
    '2025-01-09'::date,
    '2025-01-09'::date,
    'dinheiro'
  ),
  (
    'receita',
    95.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22083893973 Paula Carvalho Viana Ref. ao pedido de venda nº 87',
    '2025-01-07'::date,
    '2025-01-07'::date,
    'pix'
  ),
  (
    'receita',
    200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22083929238 Maria Camargo Ref. ao pedido de venda nº 88',
    '2025-01-22'::date,
    '2025-01-22'::date,
    'dinheiro'
  ),
  (
    'receita',
    270.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22084081688 Luiz Nantes Ref. ao pedido de venda nº 89',
    '2025-01-23'::date,
    '2025-01-25'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    35.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22091172533 Rozimeire de Souza Ref. ao pedido de venda nº 92',
    '2025-01-23'::date,
    '2025-01-23'::date,
    'pix'
  ),
  (
    'receita',
    35.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22091201647 Elizângela Ref. ao pedido de venda nº 93',
    '2025-01-23'::date,
    '2025-01-23'::date,
    'pix'
  ),
  (
    'receita',
    35.00::numeric,
    'Vendas de produtos',
    'BLING-REC:22091212257 Sirley Ref. ao pedido de venda nº 94',
    '2025-01-23'::date,
    '2025-01-23'::date,
    'pix'
  ),
  (
    'receita',
    465.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22093833515 Sandra Denega Ref. ao pedido de venda nº 85',
    '2025-01-24'::date,
    '2025-01-24'::date,
    'pix'
  ),
  (
    'receita',
    930.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22094700184 Maria De Fátima Nunes Ref. ao pedido de venda nº 95',
    '2025-01-25'::date,
    '2025-01-25'::date,
    'pix'
  ),
  (
    'receita',
    780.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22124079515 Ezequiel FRANCISCO DE BRI Ref. ao pedido de venda nº 98',
    '2025-01-28'::date,
    '2025-01-28'::date,
    'pix'
  ),
  (
    'receita',
    380.48::numeric,
    'Vendas de serviços',
    'BLING-REC:22124112594 Solanja Nunes Correa Ref. ao pedido de venda nº 96',
    '2025-01-29'::date,
    '2025-01-29'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    501.60::numeric,
    'Vendas de produtos',
    'BLING-REC:22124254077 Consumidor Final Ref. ao pedido de venda nº 99',
    '2025-01-22'::date,
    '2025-01-22'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    800.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22131984681 Valdirene Ref. ao pedido de venda nº 91',
    '2025-01-29'::date,
    '2025-01-29'::date,
    'pix'
  ),
  (
    'receita',
    260.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22136545231 Maristela Ref. ao pedido de venda nº 90',
    '2025-01-29'::date,
    '2025-01-29'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    358.01::numeric,
    'Vendas de serviços',
    'BLING-REC:22186461274 Fabíola Ref. ao pedido de venda nº 102',
    '2025-02-05'::date,
    '2025-02-07'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    306.87::numeric,
    'Vendas de serviços',
    'BLING-REC:22186477911 Roseli Maria Ref. ao pedido de venda nº 101',
    '2025-02-05'::date,
    '2025-02-05'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    437.43::numeric,
    'Vendas de serviços',
    'BLING-REC:22191451034 Joselda Ref. ao pedido de venda nº 100',
    '2025-02-05'::date,
    '2025-02-05'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    285.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22210463054 Michelle Ref. ao pedido de venda nº 108',
    '2025-02-05'::date,
    '2025-02-05'::date,
    'pix'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de produtos',
    'BLING-REC:22210582309 Alisson Magalhaes De Sousa Ref. ao pedido de venda nº 109',
    '2025-02-07'::date,
    '2025-02-07'::date,
    'pix'
  ),
  (
    'receita',
    145.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22213924539 Ney Ref. ao pedido de venda nº 110',
    '2025-02-06'::date,
    '2025-02-06'::date,
    'pix'
  ),
  (
    'receita',
    215.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22213941988 Reginaldo Ref. ao pedido de venda nº 103',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    260.37::numeric,
    'Vendas de serviços',
    'BLING-REC:22213971774 Amauri Ref. ao pedido de venda nº 111',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    80.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22215260558 Roseni Ref. ao pedido de venda nº 112',
    '2025-02-05'::date,
    '2025-02-05'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    355.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22215285972 María Aparecida Ferro Ref. ao pedido de venda nº 105',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'pix'
  ),
  (
    'receita',
    217.60::numeric,
    'Vendas de serviços',
    'BLING-REC:22215333358 Isabela Bressa Ref. ao pedido de venda nº 113',
    '2025-02-07'::date,
    '2025-02-07'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    395.21::numeric,
    'Vendas de serviços',
    'BLING-REC:22232151947 Rafael Valentim Ref. ao pedido de venda nº 104',
    '2025-02-11'::date,
    '2025-02-11'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    135.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22232168517 Iranildo Ref. ao pedido de venda nº 116',
    '2025-02-11'::date,
    '2025-02-11'::date,
    'dinheiro'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22237627337 Eliete Ref. ao pedido de venda nº 114',
    '2025-02-12'::date,
    '2025-02-13'::date,
    'dinheiro'
  ),
  (
    'receita',
    50.00::numeric,
    'Vendas de produtos',
    'BLING-REC:22239797967 Vanessa Ref. ao pedido de venda nº 117',
    '2025-02-13'::date,
    '2025-02-13'::date,
    'pix'
  ),
  (
    'receita',
    85.00::numeric,
    'Vendas de mercadorias',
    'BLING-REC:22239828660 Rodrigo Ref. ao pedido de venda nº 118',
    '2025-02-13'::date,
    '2025-02-13'::date,
    'pix'
  ),
  (
    'receita',
    380.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22248753762 Dalva Ref. ao pedido de venda nº 119',
    '2025-02-14'::date,
    '2025-02-14'::date,
    'pix'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22273673711 Thais Ref. ao pedido de venda nº 115',
    '2025-02-18'::date,
    '2025-02-18'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22273673713 Thais Ref. ao pedido de venda nº 115',
    '2025-03-18'::date,
    '2025-03-18'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    95.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22273673715 Thais Ref. ao pedido de venda nº 115',
    '2025-04-18'::date,
    '2025-03-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    423.83::numeric,
    'Vendas de serviços',
    'BLING-REC:22273709944 Paula Carvalho Viana Ref. ao pedido de venda nº 121',
    '2025-02-17'::date,
    '2025-02-17'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    270.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22274709674 Cristiane Fernandes Ref. ao pedido de venda nº 123',
    '2025-01-16'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    420.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22274729436 Elenir Ref. ao pedido de venda nº 107',
    '2025-09-27'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    550.00::numeric,
    'Vendas de produtos',
    'BLING-REC:22281634762 Gustavo Henrique Ref. ao pedido de venda nº 124',
    '2025-02-19'::date,
    '2025-02-19'::date,
    'pix'
  ),
  (
    'receita',
    227.06::numeric,
    'Vendas de serviços',
    'BLING-REC:22282252598 Jenny Ref. ao pedido de venda nº 122',
    '2025-02-19'::date,
    '2025-02-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    190.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22344490963 Suzana Santos Ref. ao pedido de venda nº 128',
    '2025-02-28'::date,
    '2025-02-28'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    205.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22344679363 Fabiana Rua Janice Terezinha San Martins 136 Ref. ao pedido de venda nº 129',
    '2025-02-27'::date,
    '2025-02-27'::date,
    'dinheiro'
  ),
  (
    'receita',
    270.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22344919292 Josicleia Ref. ao pedido de venda nº 130',
    '2025-02-27'::date,
    '2025-02-27'::date,
    'pix'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22344989786 ADEMAR DA SILVA SANTOS-HOTEL Ref. ao pedido de venda nº 131',
    '2025-02-25'::date,
    '2025-02-28'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22345518981 Ana Fernandes Ref. ao pedido de venda nº 127',
    '2025-02-28'::date,
    '2025-02-28'::date,
    'pix'
  ),
  (
    'receita',
    240.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22345627036 Leninha Ref. ao pedido de venda nº 132',
    '2025-02-25'::date,
    '2025-02-25'::date,
    'pix'
  ),
  (
    'receita',
    245.99::numeric,
    'Vendas de serviços',
    'BLING-REC:22372819961 Perrone Ref. ao pedido de venda nº 120',
    '2025-02-19'::date,
    '2025-02-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    358.63::numeric,
    'Vendas de serviços',
    'BLING-REC:22372838595 Sol Ref. ao pedido de venda nº 126',
    '2025-02-20'::date,
    '2025-02-21'::date,
    'credito_1x'
  ),
  (
    'receita',
    800.00::numeric,
    'Vendas de produtos',
    'BLING-REC:22372898712 Graciely da Silva Ramos Ref. ao pedido de venda nº 135',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'pix'
  ),
  (
    'receita',
    177.23::numeric,
    'Vendas de serviços',
    'BLING-REC:22415493782 Rosicler Ref. ao pedido de venda nº 138',
    '2025-03-07'::date,
    '2025-03-11'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22415537296 Lizandra Maggioni Ref. ao pedido de venda nº 139',
    '2025-03-10'::date,
    '2025-03-11'::date,
    'pix'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A RECEBER — batch 2/4 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22415622550 Ana Rua Antônio Frazão 68 Ref. ao pedido de venda nº 140',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'pix'
  ),
  (
    'receita',
    440.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22415666812 Mariane Ribeiro Ref. ao pedido de venda nº 137',
    '2025-03-08'::date,
    '2025-03-08'::date,
    'pix'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22531993762 Lorival Ref. ao pedido de venda nº 163',
    '2025-03-22'::date,
    '2025-03-22'::date,
    'pix'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22532007501 Thiago Ref. ao pedido de venda nº 160',
    '2025-03-25'::date,
    '2025-03-25'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22532030457 Rosa Ref. ao pedido de venda nº 154',
    '2025-09-13'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22532082498 Renan meneguelo Ref. ao pedido de venda nº 153',
    '2025-03-25'::date,
    '2025-04-07'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    399.86::numeric,
    'Vendas de serviços',
    'BLING-REC:22532102707 Nice Ref. ao pedido de venda nº 157',
    '2025-03-24'::date,
    '2025-03-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    260.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22532118765 Isabela Perez Ref. ao pedido de venda nº 150',
    '2025-03-21'::date,
    '2025-03-21'::date,
    'pix'
  ),
  (
    'receita',
    375.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22532202652 Eni Veiga Ref. ao pedido de venda nº 152',
    '2025-04-06'::date,
    '2025-04-08'::date,
    'dinheiro'
  ),
  (
    'receita',
    550.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22532443401 Davi Auto Pecas Ref. ao pedido de venda nº 164',
    '2025-03-20'::date,
    '2025-04-04'::date,
    'dinheiro'
  ),
  (
    'receita',
    179.76::numeric,
    'Vendas de serviços',
    'BLING-REC:22566811034 Rosimar Azambuja Ref. ao pedido de venda nº 168',
    '2025-03-19'::date,
    '2025-03-19'::date,
    'credito_1x'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22566853455 Valdirene Ref. ao pedido de venda nº 169',
    '2025-03-18'::date,
    '2025-03-18'::date,
    'pix'
  ),
  (
    'receita',
    545.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22566948363 Herondina Ref. ao pedido de venda nº 106',
    '2025-03-17'::date,
    '2025-03-17'::date,
    'pix'
  ),
  (
    'receita',
    660.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22567101263 Larissa Costa Ref. ao pedido de venda nº 170',
    '2025-03-01'::date,
    '2025-03-01'::date,
    'pix'
  ),
  (
    'receita',
    276.95::numeric,
    'Vendas de serviços',
    'BLING-REC:22567410069 Adriana Azambuja Ref. ao pedido de venda nº 171',
    '2025-03-03'::date,
    '2025-03-03'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22592815628 Adriana Rech Ref. ao pedido de venda nº 176',
    '2025-03-05'::date,
    '2025-03-05'::date,
    'pix'
  ),
  (
    'receita',
    697.43::numeric,
    'Vendas de serviços',
    'BLING-REC:22592838964 Kátia Lopes Personal Ref. ao pedido de venda nº 177',
    '2025-03-14'::date,
    '2025-03-14'::date,
    'credito_1x'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22607943677 Vanessa Ribeiro Ref. ao pedido de venda nº 179',
    '2025-03-05'::date,
    '2025-03-05'::date,
    'pix'
  ),
  (
    'receita',
    175.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22607967563 Mirian Ref. ao pedido de venda nº 133',
    '2025-03-05'::date,
    '2025-03-05'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22611768563 Maria Geromini Ref. ao pedido de venda nº 180',
    '2025-03-06'::date,
    '2025-03-06'::date,
    'dinheiro'
  ),
  (
    'receita',
    227.60::numeric,
    'Vendas de serviços',
    'BLING-REC:22611782416 Vanessa R. Samambaia, 184 Ref. ao pedido de venda nº 181',
    '2025-03-06'::date,
    '2025-03-06'::date,
    'credito_1x'
  ),
  (
    'receita',
    380.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22611929618 THANILA DELEVATTI TORRES ROSA Ref. ao pedido de venda nº 136',
    '2025-03-17'::date,
    '2025-03-17'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22611946466 Guedes Ref. ao pedido de venda nº 182',
    '2025-03-09'::date,
    '2025-03-09'::date,
    'pix'
  ),
  (
    'receita',
    655.00::numeric,
    'Vendas de produtos',
    'BLING-REC:22611970013 Weslley Souza Ref. ao pedido de venda nº 183',
    '2025-03-19'::date,
    '2025-03-19'::date,
    'pix'
  ),
  (
    'receita',
    479.75::numeric,
    'Vendas de serviços',
    'BLING-REC:22612043769 Renato Rodrigues Ref. ao pedido de venda nº 142',
    '2025-03-19'::date,
    '2025-03-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612135397 Maria Av. João Paulo II, 76 Ref. ao pedido de venda nº 184',
    '2025-03-12'::date,
    '2025-03-12'::date,
    'dinheiro'
  ),
  (
    'receita',
    451.19::numeric,
    'Vendas de serviços',
    'BLING-REC:22612154897 Josimar Ref. ao pedido de venda nº 144',
    '2025-03-17'::date,
    '2025-04-12'::date,
    'credito_1x'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612184770 Fernanda Barros Ref. ao pedido de venda nº 143',
    '2025-03-13'::date,
    '2025-04-07'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    465.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612277830 Edina Fogiatto Ref. ao pedido de venda nº 185',
    '2025-03-14'::date,
    '2025-03-14'::date,
    'pix'
  ),
  (
    'receita',
    179.76::numeric,
    'Vendas de serviços',
    'BLING-REC:22612351906 Fernando Douglas Ref. ao pedido de venda nº 187',
    '2025-03-17'::date,
    '2025-03-17'::date,
    'credito_1x'
  ),
  (
    'receita',
    440.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612556912 Marcos Dimas Da Silva Ref. ao pedido de venda nº 188',
    '2025-03-25'::date,
    '2025-03-25'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    750.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612563763 Kátia Talon Ref. ao pedido de venda nº 147',
    '2025-03-25'::date,
    '2025-03-25'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612587828 Marcia Dummer Buss Vi Ref. ao pedido de venda nº 189',
    '2025-03-18'::date,
    '2025-03-18'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612617920 Cida Ref. ao pedido de venda nº 146',
    '2025-03-19'::date,
    '2025-03-19'::date,
    'pix'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612639741 Nereide Ref. ao pedido de venda nº 190',
    '2025-04-07'::date,
    '2025-05-17'::date,
    'pix'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22612639748 Nereide Ref. ao pedido de venda nº 190',
    '2025-05-07'::date,
    '2025-12-08'::date,
    'pix'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22620159066 Dilene Ref. ao pedido de venda nº 148',
    '2025-03-19'::date,
    '2025-03-19'::date,
    'pix'
  ),
  (
    'receita',
    255.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22620187974 Clarisse Fernandes Ricieri Oliveira Ref. ao pedido de venda nº 151',
    '2025-03-18'::date,
    '2025-03-18'::date,
    'pix'
  ),
  (
    'receita',
    205.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22620281767 Giovanna Alves Rodrigues Ref. ao pedido de venda nº 191',
    '2025-04-19'::date,
    '2025-04-19'::date,
    'pix'
  ),
  (
    'receita',
    238.50::numeric,
    'Vendas de serviços',
    'BLING-REC:22622484526 Sara Ref. ao pedido de venda nº 192',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'credito_1x'
  ),
  (
    'receita',
    190.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22622767570 Priscila P. Munaretto Ref. ao pedido de venda nº 193',
    '2025-03-07'::date,
    '2025-04-07'::date,
    'pix'
  ),
  (
    'receita',
    770.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22622863624 Dalete Barbosa De Souza Ref. ao pedido de venda nº 149',
    '2025-03-29'::date,
    '2025-03-29'::date,
    'pix'
  ),
  (
    'receita',
    340.60::numeric,
    'Vendas de serviços',
    'BLING-REC:22622888679 Aline Carvalho Ref. ao pedido de venda nº 156',
    '2025-03-24'::date,
    '2025-03-24'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    220.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22623393430 Rodrigo 67 9810-5277 Ref. ao pedido de venda nº 194',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'dinheiro'
  ),
  (
    'receita',
    226.85::numeric,
    'Vendas de serviços',
    'BLING-REC:22624072538 Simoni Ref. ao pedido de venda nº 195',
    '2025-03-26'::date,
    '2025-03-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    389.60::numeric,
    'Vendas de serviços',
    'BLING-REC:22624153893 Fabíola 67 9820-6950 Ref. ao pedido de venda nº 162',
    '2025-03-27'::date,
    '2025-03-27'::date,
    'credito_1x'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22624201072 Márcia Diniz Ref. ao pedido de venda nº 159',
    '2025-03-27'::date,
    '2025-03-27'::date,
    'dinheiro'
  ),
  (
    'receita',
    240.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22624484560 Antonio Aprigio Ref. ao pedido de venda nº 155',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'pix'
  ),
  (
    'receita',
    403.68::numeric,
    'Vendas de serviços',
    'BLING-REC:22624518100 Aline Correia Ref. ao pedido de venda nº 197',
    '2025-03-29'::date,
    '2025-03-29'::date,
    'credito_1x'
  ),
  (
    'receita',
    342.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22624702529 Cidinha Ref. ao pedido de venda nº 165',
    '2025-04-08'::date,
    '2025-04-08'::date,
    'pix'
  ),
  (
    'receita',
    343.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22624702533 Cidinha Ref. ao pedido de venda nº 165',
    '2025-05-11'::date,
    '2025-05-11'::date,
    'pix'
  ),
  (
    'receita',
    500.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22624731860 Alcides Ref. ao pedido de venda nº 166',
    '2025-04-01'::date,
    '2025-04-01'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22624745403 Wesley 67 9681-9856 Ref. ao pedido de venda nº 198',
    '2025-03-29'::date,
    '2025-03-29'::date,
    'dinheiro'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22659479606 Rafael Bellucci Ref. ao pedido de venda nº 201',
    '2025-04-11'::date,
    '2025-04-11'::date,
    'pix'
  ),
  (
    'receita',
    120.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22663568449 Elizângela Ref. ao pedido de venda nº 205',
    '2025-04-20'::date,
    '2025-05-05'::date,
    'pix'
  ),
  (
    'receita',
    120.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22663568453 Elizângela Ref. ao pedido de venda nº 205',
    '2025-05-20'::date,
    '2025-04-04'::date,
    'pix'
  ),
  (
    'receita',
    530.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22663589848 Priscila Ref. ao pedido de venda nº 206',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'pix'
  ),
  (
    'receita',
    432.82::numeric,
    'Vendas de serviços',
    'BLING-REC:22663604952 Rosilene Martins Ref. ao pedido de venda nº 145',
    '2025-03-24'::date,
    '2025-03-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22663618181 Maria R. José Oliveira Gomes, 85 Ref. ao pedido de venda nº 207',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'dinheiro'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22663679761 Ana 44 9737-5950 Ref. ao pedido de venda nº 208',
    '2025-03-29'::date,
    '2025-03-29'::date,
    'pix'
  ),
  (
    'receita',
    700.00::numeric,
    'Vendas de produtos',
    'BLING-REC:22663714164 Vinicius Souza Ref. ao pedido de venda nº 209',
    '2025-03-22'::date,
    '2025-03-22'::date,
    'pix'
  ),
  (
    'receita',
    408.38::numeric,
    'Vendas de serviços',
    'BLING-REC:22663721687 Sueli Freitas Pereira Ref. ao pedido de venda nº 167',
    '2025-04-04'::date,
    '2025-04-04'::date,
    'credito_1x'
  ),
  (
    'receita',
    276.16::numeric,
    'Vendas de serviços',
    'BLING-REC:22663750531 Angélica Ref. ao pedido de venda nº 210',
    '2025-04-02'::date,
    '2025-04-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22762020084 Marize Ref. ao pedido de venda nº 234',
    '2025-04-26'::date,
    '2025-04-26'::date,
    'dinheiro'
  ),
  (
    'receita',
    385.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22762060103 Rodrigo do Kuramoto Ref. ao pedido de venda nº 233',
    '2025-04-28'::date,
    '2025-04-28'::date,
    'pix'
  ),
  (
    'receita',
    192.33::numeric,
    'Vendas de serviços',
    'BLING-REC:22762552141 Sebastião Lopes Da Silva Ref. ao pedido de venda nº 220',
    '2025-04-24'::date,
    '2025-04-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    245.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22762574266 Davi Ref. ao pedido de venda nº 223',
    '2025-04-24'::date,
    '2025-04-24'::date,
    'pix'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22762806915 Edna Perin Toral Ref. ao pedido de venda nº 235',
    '2025-04-25'::date,
    '2025-04-25'::date,
    'pix'
  ),
  (
    'receita',
    250.72::numeric,
    'Vendas de serviços',
    'BLING-REC:22762849600 Paula Garbelini Ref. ao pedido de venda nº 229',
    '2025-04-26'::date,
    '2025-04-26'::date,
    'credito_1x'
  ),
  (
    'receita',
    477.60::numeric,
    'Vendas de serviços',
    'BLING-REC:22762879072 Lucilene Dias de lima Ref. ao pedido de venda nº 226',
    '2025-04-25'::date,
    '2025-04-25'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22762916960 Josiane Ref. ao pedido de venda nº 221',
    '2025-04-22'::date,
    '2025-04-22'::date,
    'pix'
  ),
  (
    'receita',
    600.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22762930793 Douglas Ref. ao pedido de venda nº 228',
    '2025-04-25'::date,
    '2025-04-25'::date,
    'pix'
  ),
  (
    'receita',
    355.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22762989029 Silvana Mercado Bom Dia Ref. ao pedido de venda nº 232',
    '2025-04-25'::date,
    '2025-04-25'::date,
    'pix'
  ),
  (
    'receita',
    573.28::numeric,
    'Vendas de serviços',
    'BLING-REC:22791961291 Jefferson Ref. ao pedido de venda nº 217',
    '2025-04-30'::date,
    '2025-04-30'::date,
    'credito_1x'
  ),
  (
    'receita',
    423.10::numeric,
    'Vendas de serviços',
    'BLING-REC:22791986559 Ana Maria Batista Ref. ao pedido de venda nº 242',
    '2025-04-30'::date,
    '2025-04-30'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22792077652 Nilda Marques Ref. ao pedido de venda nº 245',
    '2025-04-30'::date,
    '2025-04-30'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22792114266 Jaqueline Kastro Ref. ao pedido de venda nº 243',
    '2025-04-30'::date,
    '2025-04-30'::date,
    'dinheiro'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22792126843 Maria Cunha Ref. ao pedido de venda nº 236',
    '2025-04-30'::date,
    '2025-04-30'::date,
    'pix'
  ),
  (
    'receita',
    215.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22792144185 Natalia Gazette Ref. ao pedido de venda nº 244',
    '2025-04-29'::date,
    '2025-04-29'::date,
    'pix'
  ),
  (
    'receita',
    435.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22792214435 Lays Luana Ref. ao pedido de venda nº 240',
    '2025-05-02'::date,
    '2025-05-02'::date,
    'pix'
  ),
  (
    'receita',
    500.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22844892501 Edna Benichio Ref. ao pedido de venda nº 218',
    '2025-05-08'::date,
    '2025-05-08'::date,
    'pix'
  ),
  (
    'receita',
    145.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22855597625 Paula Ref. ao pedido de venda nº 225',
    '2025-04-23'::date,
    '2025-04-23'::date,
    'pix'
  ),
  (
    'receita',
    120.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22855610093 Nathan Ref. ao pedido de venda nº 161',
    '2025-05-03'::date,
    '2025-05-03'::date,
    'dinheiro'
  ),
  (
    'receita',
    465.75::numeric,
    'Vendas de serviços',
    'BLING-REC:22855638503 Messias Barbosa Ref. ao pedido de venda nº 172',
    '2025-04-07'::date,
    '2025-04-07'::date,
    'credito_1x'
  ),
  (
    'receita',
    370.83::numeric,
    'Vendas de serviços',
    'BLING-REC:22855658226 Rafael Bellucci Ref. ao pedido de venda nº 203',
    '2025-04-16'::date,
    '2025-04-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    610.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22855708798 Anna do Lava Jato Ref. ao pedido de venda nº 212',
    '2025-04-21'::date,
    '2025-04-21'::date,
    'pix'
  ),
  (
    'receita',
    232.48::numeric,
    'Vendas de serviços',
    'BLING-REC:22855753480 Daniel Ref. ao pedido de venda nº 256',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    750.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22855766803 Vanda petry Ref. ao pedido de venda nº 200',
    '2025-04-14'::date,
    '2025-04-14'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22855780182 Fernanando Fono Ref. ao pedido de venda nº 257',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'pix'
  ),
  (
    'receita',
    165.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22855847777 Lucas Felix Ref. ao pedido de venda nº 258',
    '2025-04-12'::date,
    '2025-04-12'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22855897874 FERNANDA PIRES BACELAR Ref. ao pedido de venda nº 259',
    '2025-04-09'::date,
    '2025-04-09'::date,
    'pix'
  ),
  (
    'receita',
    708.79::numeric,
    'Vendas de serviços',
    'BLING-REC:22855911937 Ana Ref. ao pedido de venda nº 202',
    '2025-04-21'::date,
    '2025-04-21'::date,
    'credito_1x'
  ),
  (
    'receita',
    179.17::numeric,
    'Vendas de serviços',
    'BLING-REC:22855930338 Douglas Ribeiro Ref. ao pedido de venda nº 211',
    '2025-04-16'::date,
    '2025-04-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    260.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22855940186 Patriana Morais Ref. ao pedido de venda nº 204',
    '2025-04-22'::date,
    '2025-04-22'::date,
    'pix'
  ),
  (
    'receita',
    190.00::numeric,
    'Vendas de produtos',
    'BLING-REC:22856004378 Nilda Gentiluce Ref. ao pedido de venda nº 260',
    '2025-04-14'::date,
    '2025-04-14'::date,
    'pix'
  ),
  (
    'receita',
    355.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22856015781 néya Ref. ao pedido de venda nº 215',
    '2025-04-17'::date,
    '2025-04-17'::date,
    'pix'
  ),
  (
    'receita',
    350.14::numeric,
    'Vendas de serviços',
    'BLING-REC:22856037320 Rosaneide Ref. ao pedido de venda nº 216',
    '2025-04-21'::date,
    '2025-04-21'::date,
    'credito_1x'
  ),
  (
    'receita',
    265.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22856080472 Lucia Rodrigues Ref. ao pedido de venda nº 261',
    '2025-04-23'::date,
    '2025-04-23'::date,
    'dinheiro'
  ),
  (
    'receita',
    135.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22948539026 Paula 67 9869-3797 Ref. ao pedido de venda nº 274',
    '2025-05-21'::date,
    '2025-05-23'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22948552999 Geni Bóbbo Bortolusso Ref. ao pedido de venda nº 275',
    '2025-05-22'::date,
    '2025-05-22'::date,
    'dinheiro'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22948565991 Eliana Ref. ao pedido de venda nº 276',
    '2025-05-21'::date,
    '2025-05-22'::date,
    'pix'
  ),
  (
    'receita',
    333.38::numeric,
    'Vendas de serviços',
    'BLING-REC:22948590733 Josué César Ref. ao pedido de venda nº 277',
    '2025-05-22'::date,
    '2025-05-22'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    335.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22948597851 Fernando Toldos Vitória Ref. ao pedido de venda nº 270',
    '2025-05-17'::date,
    '2025-05-17'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22948642360 Jura Ref. ao pedido de venda nº 271',
    '2025-05-17'::date,
    '2025-05-17'::date,
    'dinheiro'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:22948653110 Paulo Henrique de Góis Silva Ref. ao pedido de venda nº 278',
    '2025-05-19'::date,
    '2025-05-19'::date,
    'pix'
  ),
  (
    'receita',
    330.11::numeric,
    'Vendas de serviços',
    'BLING-REC:23027456692 Neimar Vitor Ref. ao pedido de venda nº 247',
    '2025-05-09'::date,
    '2025-05-09'::date,
    'credito_1x'
  ),
  (
    'receita',
    340.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027476723 Ana Lúcia da Silva negro Ref. ao pedido de venda nº 246',
    '2025-05-06'::date,
    '2025-05-06'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027492081 Eliane Arenas Ref. ao pedido de venda nº 248',
    '2025-05-07'::date,
    '2025-05-07'::date,
    'dinheiro'
  ),
  (
    'receita',
    353.36::numeric,
    'Vendas de serviços',
    'BLING-REC:23027504873 Alessandro Ravanhani Ref. ao pedido de venda nº 249',
    '2025-05-09'::date,
    '2025-05-09'::date,
    'credito_1x'
  ),
  (
    'receita',
    405.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027542776 Sueli Prudêncio Ref. ao pedido de venda nº 251',
    '2025-05-08'::date,
    '2025-05-08'::date,
    'pix'
  ),
  (
    'receita',
    265.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027693303 Fernando Luiz da Silva Ref. ao pedido de venda nº 252',
    '2025-05-06'::date,
    '2025-05-06'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027713979 Layne Mantovani Ref. ao pedido de venda nº 253',
    '2025-05-07'::date,
    '2025-05-07'::date,
    'pix'
  ),
  (
    'receita',
    181.33::numeric,
    'Vendas de serviços',
    'BLING-REC:23027713982 Layne Mantovani Ref. ao pedido de venda nº 253',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    450.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027731078 Vicente Ref. ao pedido de venda nº 254',
    '2025-05-14'::date,
    '2025-05-14'::date,
    'dinheiro'
  ),
  (
    'receita',
    300.42::numeric,
    'Vendas de serviços',
    'BLING-REC:23027753346 Robson Marques Ref. ao pedido de venda nº 255',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027777587 Sidineia Rodrigues dos Santos Cardoso Ref. ao pedido de venda nº 262',
    '2025-05-15'::date,
    '2025-05-15'::date,
    'pix'
  ),
  (
    'receita',
    125.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027794656 Neia Ref. ao pedido de venda nº 263',
    '2025-05-19'::date,
    '2025-05-19'::date,
    'pix'
  ),
  (
    'receita',
    100.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027794666 Neia Ref. ao pedido de venda nº 263',
    '2025-05-29'::date,
    '2025-05-29'::date,
    'pix'
  ),
  (
    'receita',
    421.30::numeric,
    'Vendas de serviços',
    'BLING-REC:23027837229 Dimas de Oliveira Ref. ao pedido de venda nº 264',
    '2025-05-15'::date,
    '2025-05-15'::date,
    'credito_1x'
  ),
  (
    'receita',
    660.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027895730 Tadeu Ref. ao pedido de venda nº 265',
    '2025-05-30'::date,
    '2025-05-30'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    399.86::numeric,
    'Vendas de serviços',
    'BLING-REC:23027905562 Lucélia Ref. ao pedido de venda nº 266',
    '2025-05-16'::date,
    '2025-05-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    633.42::numeric,
    'Vendas de serviços',
    'BLING-REC:23027924124 Maraiza Ref. ao pedido de venda nº 267',
    '2025-05-17'::date,
    '2025-05-17'::date,
    'credito_1x'
  ),
  (
    'receita',
    220.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027939495 Fabiana Rejane da Silva Ref. ao pedido de venda nº 269',
    '2025-05-16'::date,
    '2025-05-16'::date,
    'pix'
  ),
  (
    'receita',
    220.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027939500 Fabiana Rejane da Silva Ref. ao pedido de venda nº 269',
    '2025-05-28'::date,
    '2025-05-28'::date,
    'pix'
  ),
  (
    'receita',
    360.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027946807 Wilma Nogueira Marques Ref. ao pedido de venda nº 272',
    '2025-05-26'::date,
    '2025-05-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    322.99::numeric,
    'Vendas de serviços',
    'BLING-REC:23027966479 Jessica Fernanda Ref. ao pedido de venda nº 273',
    '2025-05-24'::date,
    '2025-05-24'::date,
    'pix'
  ),
  (
    'receita',
    300.42::numeric,
    'Vendas de serviços',
    'BLING-REC:23027979171 Florindo Ref. ao pedido de venda nº 279',
    '2025-05-30'::date,
    '2025-05-30'::date,
    'credito_1x'
  ),
  (
    'receita',
    35.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23027989248 Florindo Ref. ao pedido de venda nº 287',
    '2025-06-09'::date,
    '2025-07-28'::date,
    'pix'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23028014247 Adriana Ref. ao pedido de venda nº 281',
    '2025-05-29'::date,
    '2025-05-29'::date,
    'dinheiro'
  ),
  (
    'receita',
    320.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23028031993 Claudiney Ref. ao pedido de venda nº 282',
    '2025-05-31'::date,
    '2025-05-31'::date,
    'pix'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23035033259 Bisteca Ref. ao pedido de venda nº 288',
    '2025-05-31'::date,
    '2025-06-05'::date,
    'credito_1x'
  ),
  (
    'receita',
    460.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23035049161 Shirley do Administrativo (Stara) Ref. ao pedido de venda nº 125 | BOLETO',
    '2025-05-31'::date,
    '2025-05-31'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    305.11::numeric,
    'Vendas de serviços',
    'BLING-REC:23035109482 Eliza Ref. ao pedido de venda nº 199',
    '2025-05-14'::date,
    '2025-05-14'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23035220086 Vanderleia da Silva Lima Ref. ao pedido de venda nº 214',
    '2025-05-08'::date,
    '2025-05-08'::date,
    'pix'
  ),
  (
    'receita',
    92.45::numeric,
    'Vendas de serviços',
    'BLING-REC:23035220091 Vanderleia da Silva Lima Ref. ao pedido de venda nº 214',
    '2025-05-14'::date,
    '2025-05-14'::date,
    'credito_1x'
  ),
  (
    'receita',
    237.28::numeric,
    'Vendas de serviços',
    'BLING-REC:23035867982 Mateus Ref. ao pedido de venda nº 219',
    '2025-05-06'::date,
    '2025-05-06'::date,
    'credito_1x'
  ),
  (
    'receita',
    366.13::numeric,
    'Vendas de serviços',
    'BLING-REC:23035969598 Carlinhos Ref. ao pedido de venda nº 224',
    '2025-05-02'::date,
    '2025-05-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    100.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23035969605 Carlinhos Ref. ao pedido de venda nº 224',
    '2025-05-02'::date,
    '2025-05-02'::date,
    'pix'
  ),
  (
    'receita',
    285.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23036047179 Cleonice Ref. ao pedido de venda nº 227',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'pix'
  ),
  (
    'receita',
    488.20::numeric,
    'Vendas de serviços',
    'BLING-REC:23036193962 Vilma Brito Ref. ao pedido de venda nº 230',
    '2025-05-12'::date,
    '2025-05-12'::date,
    'credito_1x'
  ),
  (
    'receita',
    345.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23049365129 Ivani Almeida Ref. ao pedido de venda nº 290',
    '2025-06-04'::date,
    '2025-06-04'::date,
    'pix'
  ),
  (
    'receita',
    135.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23054288615 Cris Ref. ao pedido de venda nº 291',
    '2025-05-22'::date,
    '2025-05-22'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    210.76::numeric,
    'Vendas de serviços',
    'BLING-REC:23054317062 Ivanil Ref. ao pedido de venda nº 238',
    '2025-05-05'::date,
    '2025-05-05'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    511.65::numeric,
    'Vendas de serviços',
    'BLING-REC:23054444091 Maria Aparecida Marques caires Ref. ao pedido de venda nº 239',
    '2025-05-03'::date,
    '2025-05-03'::date,
    'credito_1x'
  ),
  (
    'receita',
    283.83::numeric,
    'Vendas de serviços',
    'BLING-REC:23054551132 Sonia Braga Maria Ref. ao pedido de venda nº 241',
    '2025-05-06'::date,
    '2025-05-06'::date,
    'credito_1x'
  ),
  (
    'receita',
    113.42::numeric,
    'Vendas de serviços',
    'BLING-REC:23054551135 Sonia Braga Maria Ref. ao pedido de venda nº 241',
    '2025-05-06'::date,
    '2025-05-06'::date,
    'credito_1x'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23054572688 Valdinei Ref. ao pedido de venda nº 292',
    '2025-04-23'::date,
    '2025-04-23'::date,
    'pix'
  ),
  (
    'receita',
    803.41::numeric,
    'Vendas de serviços',
    'BLING-REC:23054595951 Jorge Ref. ao pedido de venda nº 293',
    '2025-04-23'::date,
    '2025-04-23'::date,
    'credito_1x'
  ),
  (
    'receita',
    465.75::numeric,
    'Vendas de serviços',
    'BLING-REC:23054614765 Junior Bressa Ref. ao pedido de venda nº 294',
    '2025-04-23'::date,
    '2025-04-23'::date,
    'credito_1x'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23060411627 Bisteca Ref. ao pedido de venda nº 295',
    '2025-06-05'::date,
    '2025-06-05'::date,
    'pix'
  ),
  (
    'receita',
    335.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23063100759 SUZANA Ref. ao pedido de venda nº 296',
    '2025-04-29'::date,
    '2025-04-29'::date,
    'pix'
  ),
  (
    'receita',
    535.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23063357436 Valdineia Ref. ao pedido de venda nº 297',
    '2025-05-05'::date,
    '2025-05-05'::date,
    'pix'
  ),
  (
    'receita',
    135.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23063675108 Gleyson renys Aquino Ref. ao pedido de venda nº 298',
    '2025-05-08'::date,
    '2025-05-08'::date,
    'pix'
  ),
  (
    'receita',
    145.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23064173087 Carol 999772055 Ref. ao pedido de venda nº 299',
    '2025-05-02'::date,
    '2025-05-02'::date,
    'dinheiro'
  ),
  (
    'receita',
    380.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23094531702 Reinaldo Ref. ao pedido de venda nº 141',
    '2025-06-07'::date,
    '2025-06-07'::date,
    'pix'
  ),
  (
    'receita',
    135.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23094558961 Sebastiao Ref. ao pedido de venda nº 300',
    '2025-05-06'::date,
    '2025-05-06'::date,
    'pix'
  ),
  (
    'receita',
    370.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23094585409 Cassia Hakamada Ref. ao pedido de venda nº 301',
    '2025-05-09'::date,
    '2025-05-09'::date,
    'pix'
  ),
  (
    'receita',
    214.32::numeric,
    'Vendas de serviços',
    'BLING-REC:23094622884 Emília vilhalva Ref. ao pedido de venda nº 302',
    '2025-05-14'::date,
    '2025-05-14'::date,
    'credito_1x'
  ),
  (
    'receita',
    85.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23094644365 Patrícia Ribeiro Ref. ao pedido de venda nº 303',
    '2025-05-07'::date,
    '2025-05-07'::date,
    'pix'
  ),
  (
    'receita',
    175.03::numeric,
    'Vendas de serviços',
    'BLING-REC:23094885181 Sônia de Fátima Marsolla Aguiar Ref. ao pedido de venda nº 304',
    '2025-05-09'::date,
    '2025-05-09'::date,
    'credito_1x'
  ),
  (
    'receita',
    652.05::numeric,
    'Vendas de serviços',
    'BLING-REC:23094910371 Gorete Ref. ao pedido de venda nº 305',
    '2025-05-16'::date,
    '2025-05-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    320.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23094980566 Rosane B Carvalho Ref. ao pedido de venda nº 306',
    '2025-05-14'::date,
    '2025-06-17'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23095010838 Lourdes Elerbrock Ref. ao pedido de venda nº 307',
    '2025-05-14'::date,
    '2025-05-14'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23095163061 Maria Filomena Silva Chagas Ref. ao pedido de venda nº 308',
    '2025-05-27'::date,
    '2025-05-27'::date,
    'pix'
  ),
  (
    'receita',
    182.47::numeric,
    'Vendas de serviços',
    'BLING-REC:23095201835 Sonia Maria Ref. ao pedido de venda nº 309',
    '2025-05-16'::date,
    '2025-05-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    600.83::numeric,
    'Vendas de serviços',
    'BLING-REC:23110473349 Paula Celestino Ref. ao pedido de venda nº 310',
    '2025-05-23'::date,
    '2025-05-23'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23110534939 Ailton Rosa dos Santos Ref. ao pedido de venda nº 311',
    '2025-05-23'::date,
    '2025-05-23'::date,
    'pix'
  ),
  (
    'receita',
    29.59::numeric,
    'Vendas de serviços',
    'BLING-REC:23110642108 Fabiana Maria Soares Ref. ao pedido de venda nº 312',
    '2025-05-23'::date,
    '2025-05-23'::date,
    'credito_1x'
  ),
  (
    'receita',
    295.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23110747186 Samuel Barbosa Ref. ao pedido de venda nº 313',
    '2025-06-10'::date,
    '2025-06-12'::date,
    'pix'
  ),
  (
    'receita',
    295.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23110747189 Samuel Barbosa Ref. ao pedido de venda nº 313',
    '2025-09-12'::date,
    '2025-09-15'::date,
    'pix'
  ),
  (
    'receita',
    441.24::numeric,
    'Vendas de serviços',
    'BLING-REC:23111127695 Dário Bispo Ref. ao pedido de venda nº 314',
    '2025-05-23'::date,
    '2025-05-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23112860903 Fernando Tadashi Kamitani Ref. ao pedido de venda nº 316',
    '2025-05-23'::date,
    '2025-05-23'::date,
    'credito_1x'
  ),
  (
    'receita',
    594.26::numeric,
    'Vendas de serviços',
    'BLING-REC:23113014516 Alenita Ref. ao pedido de venda nº 317',
    '2025-06-02'::date,
    '2025-06-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23113078944 Lucas Araújo Ref. ao pedido de venda nº 318',
    '2025-06-20'::date,
    '2025-07-08'::date,
    'pix'
  ),
  (
    'receita',
    398.99::numeric,
    'Vendas de serviços',
    'BLING-REC:23113655864 Maurício Eduardo Hermes Ref. ao pedido de venda nº 319',
    '2025-05-27'::date,
    '2025-05-27'::date,
    'credito_1x'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23113681026 Renato Taxista Ref. ao pedido de venda nº 320',
    '2025-05-27'::date,
    '2025-05-27'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23113725168 Claudete Ref. ao pedido de venda nº 321',
    '2025-05-27'::date,
    '2025-05-27'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23113750243 Pamela Pimentel Ref. ao pedido de venda nº 322',
    '2025-05-28'::date,
    '2025-05-28'::date,
    'pix'
  ),
  (
    'receita',
    100.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23113772670 Roberta Viero Ref. ao pedido de venda nº 323',
    '2025-05-28'::date,
    '2025-06-17'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23113792633 Crislaine Ercilha Camilo Ref. ao pedido de venda nº 324',
    '2025-05-29'::date,
    '2025-05-29'::date,
    'pix'
  ),
  (
    'receita',
    258.18::numeric,
    'Vendas de serviços',
    'BLING-REC:23113860243 Rubhia Carla Lopes Albrecht Ref. ao pedido de venda nº 286',
    '2025-06-04'::date,
    '2025-06-04'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    490.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23113936394 Tathiana Christaldo Ref. ao pedido de venda nº 283',
    '2025-06-07'::date,
    '2025-06-07'::date,
    'pix'
  ),
  (
    'receita',
    385.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23113963360 Ricardo Silva de Moraes Ref. ao pedido de venda nº 284',
    '2025-06-04'::date,
    '2025-06-04'::date,
    'pix'
  ),
  (
    'receita',
    197.26::numeric,
    'Vendas de serviços',
    'BLING-REC:23114174159 Rubinho (Rubens Claudio) Ref. ao pedido de venda nº 326',
    '2025-06-04'::date,
    '2025-06-04'::date,
    'credito_1x'
  ),
  (
    'receita',
    221.33::numeric,
    'Vendas de serviços',
    'BLING-REC:23114174162 Rubinho (Rubens Claudio) Ref. ao pedido de venda nº 326',
    '2025-06-04'::date,
    '2025-06-04'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    405.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23114407864 Carla carolina de Souza Ref. ao pedido de venda nº 289',
    '2025-06-06'::date,
    '2025-06-06'::date,
    'pix'
  ),
  (
    'receita',
    704.10::numeric,
    'Vendas de serviços',
    'BLING-REC:23114459272 Sueli Santos Ref. ao pedido de venda nº 327',
    '2025-06-07'::date,
    '2025-06-07'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23114475995 Elisangela Ref. ao pedido de venda nº 328',
    '2025-06-06'::date,
    '2025-06-06'::date,
    'pix'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23114488553 Elinto galiano de oliveira Ref. ao pedido de venda nº 329',
    '2025-06-06'::date,
    '2025-06-06'::date,
    'dinheiro'
  ),
  (
    'receita',
    100.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23114830150 Silvio Amador Ref. ao pedido de venda nº 330',
    '2025-06-06'::date,
    '2025-06-06'::date,
    'pix'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23114846198 Paula Fernanda soley nascimento Ref. ao pedido de venda nº 331',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'dinheiro'
  ),
  (
    'receita',
    145.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23114955772 Astolfo Ref. ao pedido de venda nº 332',
    '2025-06-12'::date,
    '2025-07-28'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    147.39::numeric,
    'Vendas de serviços',
    'BLING-REC:23114972335 Glauciane Ref. ao pedido de venda nº 333',
    '2025-06-11'::date,
    '2025-06-11'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23114983268 Emeli Guarda Ref. ao pedido de venda nº 334',
    '2025-06-11'::date,
    '2025-06-11'::date,
    'pix'
  ),
  (
    'receita',
    30.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23114996180 Juliana Ramos Ferreira Ref. ao pedido de venda nº 335',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    500.00::numeric,
    'Vendas de produtos',
    'BLING-REC:23115002599 Leandro Dalbao Ref. ao pedido de venda nº 336',
    '2025-06-09'::date,
    '2025-06-09'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23115008232 Rita De Cassia Ref. ao pedido de venda nº 337',
    '2025-06-11'::date,
    '2025-06-11'::date,
    'pix'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23115013155 Crisely de Jesus bedette Ref. ao pedido de venda nº 338',
    '2025-06-11'::date,
    '2025-06-11'::date,
    'dinheiro'
  ),
  (
    'receita',
    220.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23115024062 Ana Paula da Silva Alves Ref. ao pedido de venda nº 339',
    '2025-06-11'::date,
    '2025-06-11'::date,
    'credito_1x'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23115057442 Mirian Ref. ao pedido de venda nº 213',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'pix'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A RECEBER — batch 3/4 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23120835851 Jeferson W. Turchiello Ref. ao pedido de venda nº 340',
    '2025-06-13'::date,
    '2025-06-13'::date,
    'pix'
  ),
  (
    'receita',
    705.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23141401880 Roberto Carabina Ref. ao pedido de venda nº 341',
    '2025-06-13'::date,
    '2025-06-13'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23141514764 Indyara kauanna pereira Santana Ref. ao pedido de venda nº 342',
    '2025-06-13'::date,
    '2025-06-16'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23141529414 Eliana Maria de Lima Ref. ao pedido de venda nº 343',
    '2025-06-13'::date,
    '2025-06-13'::date,
    'pix'
  ),
  (
    'receita',
    355.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23202470142 Maria Carolina Ref. ao pedido de venda nº 344',
    '2025-06-23'::date,
    '2025-06-27'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    445.93::numeric,
    'Vendas de serviços',
    'BLING-REC:23202568198 Bruna 67 9958-5380 Ref. ao pedido de venda nº 345',
    '2025-06-24'::date,
    '2025-06-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    330.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23202600766 William Ref. ao pedido de venda nº 349',
    '2025-06-24'::date,
    '2025-06-24'::date,
    'pix'
  ),
  (
    'receita',
    500.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23202620239 Tereza Gonzales Ref. ao pedido de venda nº 280',
    '2025-06-04'::date,
    '2025-06-13'::date,
    'pix'
  ),
  (
    'receita',
    175.03::numeric,
    'Vendas de serviços',
    'BLING-REC:23202700295 Rayane Góis Ref. ao pedido de venda nº 351',
    '2025-06-23'::date,
    '2025-06-23'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23202719903 Janaína 67 9977-7268 Ref. ao pedido de venda nº 352',
    '2025-06-19'::date,
    '2025-06-19'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23202744923 Rosilene Souza Ref. ao pedido de venda nº 353',
    '2025-06-18'::date,
    '2025-06-18'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23202763091 Deisy Silveira Cardoso Ref. ao pedido de venda nº 354',
    '2025-06-17'::date,
    '2025-06-17'::date,
    'pix'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23202787752 Rosângela Ref. ao pedido de venda nº 355',
    '2025-06-18'::date,
    '2025-06-18'::date,
    'dinheiro'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23203199715 Dagmar Ref. ao pedido de venda nº 356',
    '2025-06-18'::date,
    '2025-06-25'::date,
    'pix'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23203247467 Marlon Ref. ao pedido de venda nº 357',
    '2025-06-17'::date,
    '2025-06-17'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    95.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23203301838 Patrícia Munhoz Ref. ao pedido de venda nº 358',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'pix'
  ),
  (
    'receita',
    320.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23219451435 Elmo Dorneles Ref. ao pedido de venda nº 348',
    '2025-06-25'::date,
    '2025-06-26'::date,
    'dinheiro'
  ),
  (
    'receita',
    311.52::numeric,
    'Vendas de serviços',
    'BLING-REC:23219478039 Eliane Maurício da Silva Ref. ao pedido de venda nº 347',
    '2025-06-27'::date,
    '2025-06-27'::date,
    'credito_1x'
  ),
  (
    'receita',
    225.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23219488845 Tiago Nunes Ref. ao pedido de venda nº 346',
    '2025-06-26'::date,
    '2025-06-25'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23233999239 Osvaldo Kioso Ref. ao pedido de venda nº 359',
    '2025-06-26'::date,
    '2025-06-27'::date,
    'pix'
  ),
  (
    'receita',
    362.66::numeric,
    'Vendas de serviços',
    'BLING-REC:23234051649 Edmar falco Ref. ao pedido de venda nº 360',
    '2025-06-30'::date,
    '2025-07-08'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    630.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23234089268 Kawe Gabriel Ref. ao pedido de venda nº 361',
    '2025-06-25'::date,
    '2025-06-25'::date,
    'pix'
  ),
  (
    'receita',
    120.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23264985931 Fernando Toldos Vitória Ref. ao pedido de venda nº 362',
    '2025-07-02'::date,
    '2025-07-02'::date,
    'pix'
  ),
  (
    'receita',
    577.36::numeric,
    'Vendas de serviços',
    'BLING-REC:23265101069 Josenilda Ref. ao pedido de venda nº 363',
    '2025-06-17'::date,
    '2025-06-17'::date,
    'credito_1x'
  ),
  (
    'receita',
    234.70::numeric,
    'Vendas de serviços',
    'BLING-REC:23265135269 Carlos Batista Ref. ao pedido de venda nº 364',
    '2025-06-27'::date,
    '2025-06-27'::date,
    'credito_1x'
  ),
  (
    'receita',
    35.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23265156765 Fiama Ref. ao pedido de venda nº 365',
    '2025-06-24'::date,
    '2025-06-24'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23265171152 Fernanda Honório Ref. ao pedido de venda nº 366',
    '2025-06-27'::date,
    '2025-06-27'::date,
    'pix'
  ),
  (
    'receita',
    265.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23265195216 Josimary Batista Mariano Ref. ao pedido de venda nº 367',
    '2025-07-02'::date,
    '2025-07-02'::date,
    'dinheiro'
  ),
  (
    'receita',
    182.47::numeric,
    'Vendas de serviços',
    'BLING-REC:23265216647 Dayse Serra Ref. ao pedido de venda nº 368',
    '2025-07-02'::date,
    '2025-07-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    315.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23265239567 Renato PS Ref. ao pedido de venda nº 369',
    '2025-07-02'::date,
    '2025-07-02'::date,
    'dinheiro'
  ),
  (
    'receita',
    361.44::numeric,
    'Vendas de serviços',
    'BLING-REC:23265270312 Fabrícia M Dias Ref. ao pedido de venda nº 370',
    '2025-07-02'::date,
    '2025-07-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23265354713 Alenita Ref. ao pedido de venda nº 371',
    '2025-06-30'::date,
    '2025-06-30'::date,
    'pix'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23265404669 Karina Gerwin Ref. ao pedido de venda nº 372',
    '2025-07-08'::date,
    '2025-08-07'::date,
    'credito_1x'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23297882930 Simone da Silva Pereira Ref. ao pedido de venda nº 373',
    '2025-07-04'::date,
    '2025-07-08'::date,
    'pix'
  ),
  (
    'receita',
    704.10::numeric,
    'Vendas de serviços',
    'BLING-REC:23325445260 Osvaldo Kioso Ref. ao pedido de venda nº 374',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    173.68::numeric,
    'Vendas de serviços',
    'BLING-REC:23325479478 Fernanda Martinez Ref. ao pedido de venda nº 375',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    408.38::numeric,
    'Vendas de serviços',
    'BLING-REC:23325550719 Marcos Welbër de Ferreira e Honorato Ref. ao pedido de venda nº 376',
    '2025-07-10'::date,
    '2025-07-09'::date,
    'credito_1x'
  ),
  (
    'receita',
    175.03::numeric,
    'Vendas de serviços',
    'BLING-REC:23325588265 Marcos Paulo Ref. ao pedido de venda nº 377',
    '2025-07-04'::date,
    '2025-07-04'::date,
    'credito_1x'
  ),
  (
    'receita',
    485.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23325631649 Luciana alves Ref. ao pedido de venda nº 378',
    '2025-07-07'::date,
    '2025-07-07'::date,
    'pix'
  ),
  (
    'receita',
    1211.05::numeric,
    'Vendas de serviços',
    'BLING-REC:23325723622 Alessandra 67 9227-9652 Ref. ao pedido de venda nº 379',
    '2025-07-05'::date,
    '2025-07-05'::date,
    'credito_1x'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23325742142 Elton Lennon Ref. ao pedido de venda nº 380',
    '2025-07-08'::date,
    '2025-07-08'::date,
    'pix'
  ),
  (
    'receita',
    604.14::numeric,
    'Vendas de serviços',
    'BLING-REC:23325886578 Juliana Rangel Pessanha Ref. ao pedido de venda nº 381',
    '2025-07-07'::date,
    '2025-07-11'::date,
    'credito_1x'
  ),
  (
    'receita',
    175.03::numeric,
    'Vendas de serviços',
    'BLING-REC:23327396433 Gleikyane Maia Ref. ao pedido de venda nº 382',
    '2025-07-09'::date,
    '2025-07-09'::date,
    'credito_1x'
  ),
  (
    'receita',
    455.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23327404652 Beatriz Fermino Ref. ao pedido de venda nº 383',
    '2025-07-07'::date,
    '2025-07-07'::date,
    'pix'
  ),
  (
    'receita',
    262.86::numeric,
    'Vendas de serviços',
    'BLING-REC:23455071245 Cassia Calciolari Tonelli Ref. ao pedido de venda nº 384',
    '2025-07-28'::date,
    '2025-07-28'::date,
    'credito_1x'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23455107552 Michele Michele Araújo Ref. ao pedido de venda nº 385',
    '2025-09-12'::date,
    '2025-09-12'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    85.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23455264790 Bisteca Ref. ao pedido de venda nº 386',
    '2025-08-10'::date,
    '2025-09-02'::date,
    'pix'
  ),
  (
    'receita',
    137.19::numeric,
    'Vendas de serviços',
    'BLING-REC:23455299318 Guilherme Figueira Ref. ao pedido de venda nº 387',
    '2025-07-10'::date,
    '2025-09-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    345.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23455328925 Aldori Siveris Ref. ao pedido de venda nº 388',
    '2025-07-07'::date,
    '2025-10-31'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    179.17::numeric,
    'Vendas de serviços',
    'BLING-REC:23455347127 Jaqueline Sant’ Anna Ref. ao pedido de venda nº 389',
    '2025-07-24'::date,
    '2025-07-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    720.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23455486923 Odete Ref. ao pedido de venda nº 390',
    '2025-07-07'::date,
    '2025-07-18'::date,
    'pix'
  ),
  (
    'receita',
    1250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23455672326 Milena Ref. ao pedido de venda nº 391',
    '2025-07-26'::date,
    '2025-07-26'::date,
    'dinheiro'
  ),
  (
    'receita',
    659.47::numeric,
    'Vendas de serviços',
    'BLING-REC:23455786101 Maria 67 8435-7253 Ref. ao pedido de venda nº 392',
    '2025-07-17'::date,
    '2025-09-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    355.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23505008320 Thaís Moraes Ref. ao pedido de venda nº 285',
    '2025-07-21'::date,
    '2025-08-09'::date,
    'pix'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23505016449 Herondina Ref. ao pedido de venda nº 394',
    '2025-08-01'::date,
    '2025-09-17'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    145.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23505020313 Priscila P. Munaretto Ref. ao pedido de venda nº 395',
    '2025-07-14'::date,
    '2025-08-09'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    35.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23505024542 Ivone 67 9857-6033 Ref. ao pedido de venda nº 393',
    '2025-07-11'::date,
    '2025-07-11'::date,
    'pix'
  ),
  (
    'receita',
    464.71::numeric,
    'Vendas de serviços',
    'BLING-REC:23505137183 Ana Paula 67 9977-1854 Ref. ao pedido de venda nº 396',
    '2025-07-14'::date,
    '2025-07-14'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23515848049 Ana Paula Ribeiro Ref. ao pedido de venda nº 397',
    '2025-08-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    570.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23515888876 Estefany Nogueira Ref. ao pedido de venda nº 398',
    '2025-07-19'::date,
    '2025-07-19'::date,
    'pix'
  ),
  (
    'receita',
    182.32::numeric,
    'Vendas de serviços',
    'BLING-REC:23515938094 Jehnifer Ref. ao pedido de venda nº 399',
    '2025-07-11'::date,
    '2025-07-11'::date,
    'credito_1x'
  ),
  (
    'receita',
    60.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23515972743 Luana Ref. ao pedido de venda nº 400',
    '2025-07-11'::date,
    '2025-07-11'::date,
    'credito_1x'
  ),
  (
    'receita',
    455.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23516018185 Beatriz Fermino Ref. ao pedido de venda nº 401',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'pix'
  ),
  (
    'receita',
    400.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23516054257 Andresa lathiel Ref. ao pedido de venda nº 402',
    '2025-07-14'::date,
    '2025-07-14'::date,
    'pix'
  ),
  (
    'receita',
    380.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23516084124 Frais Ref. ao pedido de venda nº 403',
    '2025-07-14'::date,
    '2025-07-14'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23518118390 Lorena Ref. ao pedido de venda nº 404',
    '2025-07-17'::date,
    '2025-07-17'::date,
    'pix'
  ),
  (
    'receita',
    227.06::numeric,
    'Vendas de serviços',
    'BLING-REC:23518722582 TAIANA MATOS Ref. ao pedido de venda nº 405',
    '2025-07-11'::date,
    '2025-07-11'::date,
    'credito_1x'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23518743897 Luciana Guedes Ref. ao pedido de venda nº 406',
    '2025-07-12'::date,
    '2025-07-12'::date,
    'pix'
  ),
  (
    'receita',
    420.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23518785048 Frazão Ref. ao pedido de venda nº 407',
    '2025-07-15'::date,
    '2025-07-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    435.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23518853303 Thay Silva Ref. ao pedido de venda nº 408',
    '2025-07-19'::date,
    '2025-07-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    395.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23518910114 Suely Rocha Ref. ao pedido de venda nº 409',
    '2025-07-17'::date,
    '2025-07-17'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    385.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23518934886 Marlene Aquino Ref. ao pedido de venda nº 410',
    '2025-08-02'::date,
    '2025-08-02'::date,
    'dinheiro'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23518954179 Simone Lopes Cunha Ref. ao pedido de venda nº 411',
    '2025-07-16'::date,
    '2025-07-16'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    510.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519000068 Odair Ref. ao pedido de venda nº 412',
    '2025-07-21'::date,
    '2025-07-21'::date,
    'pix'
  ),
  (
    'receita',
    255.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519060557 Elizete Américo Ref. ao pedido de venda nº 413',
    '2025-07-22'::date,
    '2025-07-22'::date,
    'pix'
  ),
  (
    'receita',
    361.44::numeric,
    'Vendas de serviços',
    'BLING-REC:23519084946 Ilma Ref. ao pedido de venda nº 414',
    '2025-07-22'::date,
    '2025-07-22'::date,
    'credito_1x'
  ),
  (
    'receita',
    385.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519103643 Vanessa Ribeiro Ref. ao pedido de venda nº 415',
    '2025-07-25'::date,
    '2025-07-25'::date,
    'pix'
  ),
  (
    'receita',
    291.03::numeric,
    'Vendas de serviços',
    'BLING-REC:23519130423 Katia Eliandia Ref. ao pedido de venda nº 416',
    '2025-07-25'::date,
    '2025-07-25'::date,
    'credito_1x'
  ),
  (
    'receita',
    80.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519160041 Rosana Portugal Duarte Ref. ao pedido de venda nº 417',
    '2025-07-24'::date,
    '2025-07-24'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    700.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519377941 Andrielle Ref. ao pedido de venda nº 418',
    '2025-08-01'::date,
    '2025-09-28'::date,
    'pix'
  ),
  (
    'receita',
    85.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519411833 Ivaní Ref. ao pedido de venda nº 419',
    '2025-08-01'::date,
    '2025-08-01'::date,
    'dinheiro'
  ),
  (
    'receita',
    135.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519460035 Mariana Baptista Ref. ao pedido de venda nº 420',
    '2025-07-25'::date,
    '2025-08-18'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519483696 Rodrigo N Bonfim Ref. ao pedido de venda nº 421',
    '2025-07-29'::date,
    '2025-07-29'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    299.30::numeric,
    'Vendas de serviços',
    'BLING-REC:23519516830 Jose Lava Rápido Ref. ao pedido de venda nº 422',
    '2025-08-01'::date,
    '2025-08-11'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    264.48::numeric,
    'Vendas de serviços',
    'BLING-REC:23519545265 Lucas De Sá Ref. ao pedido de venda nº 423',
    '2025-08-04'::date,
    '2025-08-11'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    320.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519581471 Alessandra Lima Ref. ao pedido de venda nº 424',
    '2025-08-04'::date,
    '2025-08-04'::date,
    'pix'
  ),
  (
    'receita',
    622.46::numeric,
    'Vendas de serviços',
    'BLING-REC:23519649454 Jeruza Pereira Ref. ao pedido de venda nº 425',
    '2025-08-04'::date,
    '2025-08-04'::date,
    'credito_1x'
  ),
  (
    'receita',
    360.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519674183 Marcos 67 8178-6780 Ref. ao pedido de venda nº 426',
    '2025-08-04'::date,
    '2025-08-04'::date,
    'pix'
  ),
  (
    'receita',
    300.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519703898 MARIA APARECIDA Ref. ao pedido de venda nº 427',
    '2025-08-02'::date,
    '2025-08-09'::date,
    'pix'
  ),
  (
    'receita',
    175.03::numeric,
    'Vendas de serviços',
    'BLING-REC:23519721982 67 99951-0518 Ref. ao pedido de venda nº 428',
    '2025-07-25'::date,
    '2025-07-25'::date,
    'credito_1x'
  ),
  (
    'receita',
    335.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23519952109 Maria Elena Ref. ao pedido de venda nº 429',
    '2025-08-04'::date,
    '2025-09-03'::date,
    'dinheiro'
  ),
  (
    'receita',
    255.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23553919224 Karina Ferreira Ref. ao pedido de venda nº 430',
    '2025-08-08'::date,
    '2025-08-09'::date,
    'pix'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23553930948 Marcos Welbër de Ferreira e Honorato Ref. ao pedido de venda nº 431',
    '2025-08-07'::date,
    '2025-08-07'::date,
    'pix'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23553948205 Lenice Ref. ao pedido de venda nº 432',
    '2025-08-06'::date,
    '2025-08-06'::date,
    'pix'
  ),
  (
    'receita',
    265.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23553976096 Keizy Maria Ref. ao pedido de venda nº 433',
    '2025-08-06'::date,
    '2025-08-06'::date,
    'pix'
  ),
  (
    'receita',
    390.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23554025888 Dra. Rosangela Ref. ao pedido de venda nº 434',
    '2025-08-06'::date,
    '2025-08-06'::date,
    'pix'
  ),
  (
    'receita',
    365.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23554097312 Marcos Reginaldo Ref. ao pedido de venda nº 435',
    '2025-08-04'::date,
    '2025-08-04'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23554111037 Elizani Ref. ao pedido de venda nº 436',
    '2025-08-05'::date,
    '2025-08-05'::date,
    'pix'
  ),
  (
    'receita',
    320.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23554138021 Andreia Ref. ao pedido de venda nº 437',
    '2025-08-08'::date,
    '2025-08-08'::date,
    'pix'
  ),
  (
    'receita',
    125.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23554149805 Denise Ref. ao pedido de venda nº 438',
    '2025-08-06'::date,
    '2025-08-06'::date,
    'pix'
  ),
  (
    'receita',
    325.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23554802960 Lucas 67 9945-4534 Ref. ao pedido de venda nº 439',
    '2025-07-31'::date,
    '2025-07-31'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23727808876 João Ferreira Ref. ao pedido de venda nº 440',
    '2025-08-16'::date,
    '2025-08-16'::date,
    'dinheiro'
  ),
  (
    'receita',
    125.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23727827177 Patrícia Ribeiro Ref. ao pedido de venda nº 441',
    '2025-08-14'::date,
    '2025-08-14'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    145.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23727855228 Eliana Ref. ao pedido de venda nº 442',
    '2025-08-12'::date,
    '2025-08-12'::date,
    'pix'
  ),
  (
    'receita',
    125.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23728915684 Janaína 67 9977-7268 Ref. ao pedido de venda nº 443',
    '2025-08-27'::date,
    '2025-08-27'::date,
    'pix'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23728987033 Maria 67 8435-7253 Ref. ao pedido de venda nº 444',
    '2025-08-19'::date,
    '2025-08-19'::date,
    'dinheiro'
  ),
  (
    'receita',
    600.83::numeric,
    'Vendas de serviços',
    'BLING-REC:23729055340 Gabriel Leal Nagasava Ref. ao pedido de venda nº 445',
    '2025-07-14'::date,
    '2025-07-14'::date,
    'credito_1x'
  ),
  (
    'receita',
    385.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729094585 Marlene Aquino Ref. ao pedido de venda nº 446',
    '2025-08-02'::date,
    '2025-08-02'::date,
    'dinheiro'
  ),
  (
    'receita',
    320.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729210415 Andreia Ref. ao pedido de venda nº 447',
    '2025-08-08'::date,
    '2025-08-08'::date,
    'pix'
  ),
  (
    'receita',
    525.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729240390 45 9954-0136 Ref. ao pedido de venda nº 448',
    '2025-08-12'::date,
    '2025-09-06'::date,
    'pix'
  ),
  (
    'receita',
    492.85::numeric,
    'Vendas de serviços',
    'BLING-REC:23729283504 Lauriana cardoso Ref. ao pedido de venda nº 449',
    '2025-08-24'::date,
    '2025-08-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    410.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729370530 Adriane 67 9159-7824 Ref. ao pedido de venda nº 450',
    '2025-08-12'::date,
    '2025-08-12'::date,
    'credito_1x'
  ),
  (
    'receita',
    125.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729391557 Veronice Ref. ao pedido de venda nº 451',
    '2025-08-15'::date,
    '2025-08-15'::date,
    'pix'
  ),
  (
    'receita',
    125.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729391562 Veronice Ref. ao pedido de venda nº 451',
    '2025-09-12'::date,
    '2025-09-11'::date,
    'pix'
  ),
  (
    'receita',
    345.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729416823 Genilda Vanzella Ref. ao pedido de venda nº 452',
    '2025-08-14'::date,
    '2025-08-14'::date,
    'dinheiro'
  ),
  (
    'receita',
    345.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729428029 Crislaine Prates Ref. ao pedido de venda nº 453',
    '2025-08-28'::date,
    '2025-08-28'::date,
    'pix'
  ),
  (
    'receita',
    208.14::numeric,
    'Vendas de serviços',
    'BLING-REC:23729446389 67 8421-5186 Ref. ao pedido de venda nº 454',
    '2025-08-11'::date,
    '2025-08-11'::date,
    'credito_1x'
  ),
  (
    'receita',
    250.00::numeric,
    'Outros',
    'BLING-REC:23729470286 Eliane Márcia Da Silva Ref. ao pedido de venda nº 455',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'pix'
  ),
  (
    'receita',
    255.00::numeric,
    'Outros',
    'BLING-REC:23729470297 Eliane Márcia Da Silva Ref. ao pedido de venda nº 455',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'pix'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729480808 Henrique Pet Shop Ref. ao pedido de venda nº 456',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'pix'
  ),
  (
    'receita',
    490.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729648677 Rosenilda Torres Ref. ao pedido de venda nº 457',
    '2025-08-19'::date,
    '2025-08-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    402.18::numeric,
    'Vendas de serviços',
    'BLING-REC:23729662086 Adriane Ref. ao pedido de venda nº 458',
    '2025-08-19'::date,
    '2025-08-19'::date,
    'credito_1x'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23729679849 GATÃO LOPES Ref. ao pedido de venda nº 459',
    '2025-08-27'::date,
    '2025-08-27'::date,
    'dinheiro'
  ),
  (
    'receita',
    398.99::numeric,
    'Vendas de serviços',
    'BLING-REC:23735450150 Maria Aparecida 67 9925-3238 Ref. ao pedido de venda nº 460',
    '2025-08-19'::date,
    '2025-08-19'::date,
    'credito_1x'
  ),
  (
    'receita',
    650.93::numeric,
    'Vendas de serviços',
    'BLING-REC:23738906906 Nino Dos Santos Ref. ao pedido de venda nº 461',
    '2025-08-25'::date,
    '2025-09-02'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    525.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23738937422 Alessandra 67 9614-9942 Ref. ao pedido de venda nº 462',
    '2025-08-25'::date,
    '2025-08-25'::date,
    'pix'
  ),
  (
    'receita',
    400.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23738998759 Rodrigo Ortega Ref. ao pedido de venda nº 463',
    '2025-08-22'::date,
    '2025-08-22'::date,
    'pix'
  ),
  (
    'receita',
    474.25::numeric,
    'Vendas de serviços',
    'BLING-REC:23739027428 Leile Ref. ao pedido de venda nº 464',
    '2025-08-22'::date,
    '2025-09-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739035548 Sueli Barbosa Ref. ao pedido de venda nº 465',
    '2025-08-25'::date,
    '2025-08-25'::date,
    'pix'
  ),
  (
    'receita',
    245.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739128451 Léo Martins Ref. ao pedido de venda nº 466',
    '2025-08-21'::date,
    '2025-08-21'::date,
    'pix'
  ),
  (
    'receita',
    490.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739153500 Susi Ref. ao pedido de venda nº 467',
    '2025-08-28'::date,
    '2025-08-28'::date,
    'pix'
  ),
  (
    'receita',
    320.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739210399 léia sousa Ref. ao pedido de venda nº 468',
    '2025-08-29'::date,
    '2025-08-29'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739238074 Andrea Ângel Ref. ao pedido de venda nº 469',
    '2025-09-01'::date,
    '2025-09-01'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739246537 Maria Dutra Santi Ref. ao pedido de venda nº 470',
    '2025-08-27'::date,
    '2025-08-27'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739253769 Meire Ref. ao pedido de venda nº 471',
    '2025-08-27'::date,
    '2025-08-27'::date,
    'pix'
  ),
  (
    'receita',
    85.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739262231 Edna Perin Toral Ref. ao pedido de venda nº 472',
    '2025-09-01'::date,
    '2025-09-01'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739298221 Mery Cristina Ref. ao pedido de venda nº 473',
    '2025-08-15'::date,
    '2025-08-15'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23739298226 Mery Cristina Ref. ao pedido de venda nº 473',
    '2025-09-15'::date,
    '2025-09-24'::date,
    'pix'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23810652949 Mirian Ref. ao pedido de venda nº 474',
    '2025-09-08'::date,
    '2025-09-08'::date,
    'dinheiro'
  ),
  (
    'receita',
    403.69::numeric,
    'Vendas de serviços',
    'BLING-REC:23810675924 Marcos / Vanuza 67 9296-3831 / 84170036 Ref. ao pedido de venda nº 475',
    '2025-09-09'::date,
    '2025-09-09'::date,
    'credito_1x'
  ),
  (
    'receita',
    345.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23810687794 Thiago Raggioto Kopp Ref. ao pedido de venda nº 476',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23810708208 Ângelo Graciano Brancalea Ref. ao pedido de venda nº 477',
    '2025-09-09'::date,
    '2025-09-09'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    365.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23810720303 Juliano Ref. ao pedido de venda nº 478',
    '2025-09-05'::date,
    '2025-09-05'::date,
    'pix'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23810733500 Eliane Cristina dos Santos Ref. ao pedido de venda nº 479',
    '2025-09-05'::date,
    '2025-09-05'::date,
    'pix'
  ),
  (
    'receita',
    425.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23810756782 Lu Pereira Ref. ao pedido de venda nº 480',
    '2025-09-05'::date,
    '2025-09-05'::date,
    'dinheiro'
  ),
  (
    'receita',
    225.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23810770449 Maiara Brito Ref. ao pedido de venda nº 481',
    '2025-09-04'::date,
    '2025-09-04'::date,
    'pix'
  ),
  (
    'receita',
    300.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23815323563 Pastora Ivanir Ref. ao pedido de venda nº 483',
    '2025-09-10'::date,
    '2025-09-11'::date,
    'pix'
  ),
  (
    'receita',
    704.10::numeric,
    'Vendas de serviços',
    'BLING-REC:23815418421 Marlene Magalhães Ref. ao pedido de venda nº 484',
    '2025-09-08'::date,
    '2025-09-08'::date,
    'credito_1x'
  ),
  (
    'receita',
    240.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23816402602 Maria 67 9618-6078 Ref. ao pedido de venda nº 485',
    '2025-10-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    342.19::numeric,
    'Vendas de serviços',
    'BLING-REC:23824070551 Paula Celestino Ref. ao pedido de venda nº 482',
    '2025-09-04'::date,
    '2025-09-12'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    641.80::numeric,
    'Vendas de serviços',
    'BLING-REC:23861355393 Manoel Pereira Junior Ref. ao pedido de venda nº 487',
    '2025-09-13'::date,
    '2025-09-13'::date,
    'credito_1x'
  ),
  (
    'receita',
    399.86::numeric,
    'Vendas de serviços',
    'BLING-REC:23913907009 Kátia Talon Ref. ao pedido de venda nº 488',
    '2025-09-23'::date,
    '2025-09-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    490.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23914892460 Elaine Saraiva Ref. ao pedido de venda nº 489',
    '2025-09-20'::date,
    '2025-09-24'::date,
    'pix'
  ),
  (
    'receita',
    182.47::numeric,
    'Vendas de serviços',
    'BLING-REC:23914908494 Neide Ferreira Oliveira Ref. ao pedido de venda nº 490',
    '2025-09-16'::date,
    '2025-09-16'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23914952434 Anna Beatris Ref. ao pedido de venda nº 491',
    '2025-09-16'::date,
    '2025-09-16'::date,
    'pix'
  ),
  (
    'receita',
    545.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23915177732 Paula Fernanda soley nascimento Ref. ao pedido de venda nº 492',
    '2025-09-23'::date,
    '2025-09-23'::date,
    'dinheiro'
  ),
  (
    'receita',
    245.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23915224093 Aparecida Ferreira Ref. ao pedido de venda nº 493',
    '2025-09-12'::date,
    '2025-09-12'::date,
    'dinheiro'
  ),
  (
    'receita',
    165.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23915316706 Antônio kazuo sato Ref. ao pedido de venda nº 494',
    '2025-09-22'::date,
    '2025-09-22'::date,
    'dinheiro'
  ),
  (
    'receita',
    165.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23915316714 Antônio kazuo sato Ref. ao pedido de venda nº 494',
    '2025-10-22'::date,
    '2025-10-22'::date,
    'dinheiro'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23915316731 Antônio kazuo sato Ref. ao pedido de venda nº 494',
    '2025-11-22'::date,
    NULL::date,
    'dinheiro'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23915548739 Luciana Geromini Ref. ao pedido de venda nº 495',
    '2025-10-03'::date,
    '2025-10-09'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    704.10::numeric,
    'Vendas de serviços',
    'BLING-REC:23915652168 Marlene Magalhães Ref. ao pedido de venda nº 496',
    '2025-09-08'::date,
    '2025-09-08'::date,
    'credito_1x'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23915681029 Reginaldo Ref. ao pedido de venda nº 497',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:23915709489 DIEGO LORD Ref. ao pedido de venda nº 498',
    '2025-09-11'::date,
    '2025-09-11'::date,
    'pix'
  ),
  (
    'receita',
    464.71::numeric,
    'Vendas de serviços',
    'BLING-REC:23963850872 Regina Volpato 44 9119-2212 Ref. ao pedido de venda nº 499',
    '2025-10-01'::date,
    '2025-10-01'::date,
    'credito_1x'
  ),
  (
    'receita',
    200.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057736228 Marcos Dimas Da Silva Ref. ao pedido de venda nº 500',
    '2025-09-22'::date,
    '2025-09-22'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057736253 Marcos Dimas Da Silva Ref. ao pedido de venda nº 500',
    '2025-10-22'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057736263 Marcos Dimas Da Silva Ref. ao pedido de venda nº 500',
    '2025-11-21'::date,
    '2025-11-21'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    270.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057736275 Marcos Dimas Da Silva Ref. ao pedido de venda nº 500',
    '2025-12-21'::date,
    '2025-12-21'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    60.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057741207 Silvio Amador Ref. ao pedido de venda nº 501',
    '2025-10-08'::date,
    '2025-10-08'::date,
    'pix'
  ),
  (
    'receita',
    80.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057750421 Karina Gerwin Ref. ao pedido de venda nº 502',
    '2025-10-05'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    320.82::numeric,
    'Vendas de serviços',
    'BLING-REC:24057761076 Cassia Calciolari Tonelli Ref. ao pedido de venda nº 503',
    '2025-09-27'::date,
    '2025-10-20'::date,
    'credito_1x'
  ),
  (
    'receita',
    280.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057779136 Dayana Cantelli Ref. ao pedido de venda nº 504',
    '2025-09-20'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    422.46::numeric,
    'Vendas de serviços',
    'BLING-REC:24057796763 Joice Schott Ref. ao pedido de venda nº 505',
    '2025-09-27'::date,
    '2025-09-27'::date,
    'credito_1x'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057814411 Tuta Ref. ao pedido de venda nº 506',
    '2025-10-03'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    182.47::numeric,
    'Vendas de serviços',
    'BLING-REC:24057818917 Salete b andadre guerreiro Ref. ao pedido de venda nº 507',
    '2025-09-26'::date,
    '2025-09-30'::date,
    'credito_1x'
  ),
  (
    'receita',
    400.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057824534 Regiane Andrade Ref. ao pedido de venda nº 508',
    '2025-09-26'::date,
    '2025-09-26'::date,
    'pix'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24057829448 Gui Ref. ao pedido de venda nº 509',
    '2025-09-29'::date,
    '2025-09-29'::date,
    'dinheiro'
  ),
  (
    'receita',
    273.06::numeric,
    'Vendas de serviços',
    'BLING-REC:24057842742 Maria Trindade 67 9846-2234 Ref. ao pedido de venda nº 510',
    '2025-09-29'::date,
    '2025-09-29'::date,
    'credito_1x'
  ),
  (
    'receita',
    180.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24069527869 Juliana Marega 67 8445-6237 Ref. ao pedido de venda nº 511',
    '2025-10-13'::date,
    '2025-10-13'::date,
    'dinheiro'
  ),
  (
    'receita',
    275.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24069544227 Natalia Gazette Ref. ao pedido de venda nº 512',
    '2025-10-13'::date,
    '2025-10-13'::date,
    'pix'
  ),
  (
    'receita',
    253.48::numeric,
    'Vendas de serviços',
    'BLING-REC:24069570720 Dalvam 67 9105-5683 Ref. ao pedido de venda nº 513',
    '2025-10-13'::date,
    '2025-10-13'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107079051 Conceição 67 9875-7681 Ref. ao pedido de venda nº 514',
    '2025-10-17'::date,
    '2025-10-17'::date,
    'pix'
  ),
  (
    'receita',
    165.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107298425 Fabiano Castriani Ref. ao pedido de venda nº 515',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'pix'
  ),
  (
    'receita',
    403.69::numeric,
    'Vendas de serviços',
    'BLING-REC:24107316006 Marlene 67 9977-0412 Ref. ao pedido de venda nº 516',
    '2025-10-13'::date,
    '2025-10-13'::date,
    'credito_1x'
  ),
  (
    'receita',
    216.99::numeric,
    'Vendas de serviços',
    'BLING-REC:24107365483 Maria 67 8441-6070 Ref. ao pedido de venda nº 517',
    '2025-10-14'::date,
    '2025-10-14'::date,
    'credito_1x'
  ),
  (
    'receita',
    285.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107378961 Tatiana Rondó 18 98148-6289 Ref. ao pedido de venda nº 518',
    '2025-10-11'::date,
    '2025-10-11'::date,
    'pix'
  ),
  (
    'receita',
    60.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107388661 Marina 67 9293-3890 Ref. ao pedido de venda nº 519',
    '2025-10-09'::date,
    '2025-10-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    720.00::numeric,
    'Vendas de produtos',
    'BLING-REC:24107400616 Gismaire 67 9140-0273 Ref. ao pedido de venda nº 520',
    '2025-10-09'::date,
    '2025-10-09'::date,
    'pix'
  ),
  (
    'receita',
    246.43::numeric,
    'Vendas de serviços',
    'BLING-REC:24107534181 Marília Freire Marques ‪67 99979‑9009‬ Ref. ao pedido de venda nº 521',
    '2025-10-13'::date,
    '2025-10-13'::date,
    'credito_1x'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107551664 Fátima 67 9994-2674 Ref. ao pedido de venda nº 522',
    '2025-10-15'::date,
    '2025-10-15'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107567328 Francisco Linhares 67 9672-6846 Ref. ao pedido de venda nº 523',
    '2025-10-11'::date,
    '2025-10-11'::date,
    'pix'
  ),
  (
    'receita',
    570.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107611697 Mariana Baptista Ref. ao pedido de venda nº 524',
    '2025-10-09'::date,
    '2025-10-20'::date,
    'pix'
  ),
  (
    'receita',
    370.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107681586 Viviane Michelotto 67 9857-8881 Ref. ao pedido de venda nº 525',
    '2025-10-07'::date,
    '2025-10-19'::date,
    'pix'
  ),
  (
    'receita',
    150.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107702744 Helena Komesu 67 9925-4591 Ref. ao pedido de venda nº 526',
    '2025-10-09'::date,
    '2025-10-09'::date,
    'dinheiro'
  ),
  (
    'receita',
    310.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107720771 Jean Lucindo 67 9294-4151 Ref. ao pedido de venda nº 527',
    '2025-10-03'::date,
    '2025-10-03'::date,
    'pix'
  ),
  (
    'receita',
    30.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107781478 Diego Rodrigues 67 9956-8928 Ref. ao pedido de venda nº 529',
    '2025-10-02'::date,
    '2025-10-02'::date,
    'pix'
  ),
  (
    'receita',
    630.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107815740 Janaina Queiroz Ref. ao pedido de venda nº 530',
    '2025-10-10'::date,
    NULL::date,
    'credito_1x'
  ),
  (
    'receita',
    685.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107832615 Adriano GS Motores Ref. ao pedido de venda nº 531',
    '2025-10-21'::date,
    '2025-10-21'::date,
    'dinheiro'
  ),
  (
    'receita',
    85.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107847652 Sebastiao Ref. ao pedido de venda nº 532',
    '2025-10-15'::date,
    '2025-10-15'::date,
    'dinheiro'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A RECEBER — batch 4/4 (80 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107856019 Valdirene 67 9989-0904 Ref. ao pedido de venda nº 533',
    '2025-10-15'::date,
    '2025-10-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    50.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24107871000 William Ref. ao pedido de venda nº 534',
    '2025-10-14'::date,
    '2025-10-14'::date,
    'pix'
  ),
  (
    'receita',
    50.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24152284698 ADEMAR DA SILVA SANTOS-HOTEL Ref. ao pedido de venda nº 535',
    '2025-10-24'::date,
    '2025-10-24'::date,
    'pix'
  ),
  (
    'receita',
    460.02::numeric,
    'Vendas de serviços',
    'BLING-REC:24152336131 Adriana Azambuja Ref. ao pedido de venda nº 536',
    '2025-10-18'::date,
    '2025-10-18'::date,
    'credito_1x'
  ),
  (
    'receita',
    65.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24152457964 Vanderleia da Silva Lima Ref. ao pedido de venda nº 537',
    '2025-10-21'::date,
    '2025-11-11'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    500.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24152526978 Eleni Sordi Maier 67 9977-2525 Ref. ao pedido de venda nº 538',
    '2025-10-06'::date,
    '2025-10-06'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    492.87::numeric,
    'Vendas de serviços',
    'BLING-REC:24152579690 Valderice Volpato 67 9629-8960 Ref. ao pedido de venda nº 539',
    '2025-10-18'::date,
    '2025-10-18'::date,
    'credito_1x'
  ),
  (
    'receita',
    345.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24155033095 Patrícia Martins Vieira Ref. ao pedido de venda nº 540',
    '2025-11-07'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24155033116 Patrícia Martins Vieira Ref. ao pedido de venda nº 540',
    '2025-11-20'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24155759328 Isabel Cristina Vieira 67 9631-7753 Ref. ao pedido de venda nº 541',
    '2025-10-24'::date,
    '2025-10-24'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    265.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24155778137 Roseli Aparecida de Souza 67 9216-6209 Ref. ao pedido de venda nº 542',
    '2025-11-07'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24155821042 Juliana Rocha 67 9663-8939 Ref. ao pedido de venda nº 543',
    '2025-10-20'::date,
    '2025-11-01'::date,
    'pix'
  ),
  (
    'receita',
    345.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24155833610 Ariane 67 9820-0953 Ref. ao pedido de venda nº 544',
    '2025-10-23'::date,
    '2025-10-24'::date,
    'pix'
  ),
  (
    'receita',
    182.47::numeric,
    'Vendas de serviços',
    'BLING-REC:24211482970 Ana Maria 67 9913-7899 Ref. ao pedido de venda nº 545',
    '2025-10-31'::date,
    '2025-10-31'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24211506893 Walid Selem Ref. ao pedido de venda nº 546',
    '2025-10-31'::date,
    '2025-10-31'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    425.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24211731271 Serly Dummer Buss 66 8115-6263 Ref. ao pedido de venda nº 547',
    '2025-11-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    225.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24211746457 Janaina 67 9660-5311 Ref. ao pedido de venda nº 548',
    '2025-10-29'::date,
    '2025-10-29'::date,
    'pix'
  ),
  (
    'receita',
    297.57::numeric,
    'Vendas de serviços',
    'BLING-REC:24211879101 Ana Paula Marangueli 67 9615-2588 Ref. ao pedido de venda nº 549',
    '2025-10-31'::date,
    '2025-10-31'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    400.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24211913022 Ana ‪ ‪99864‑8522‬ Ref. ao pedido de venda nº 550',
    '2025-10-30'::date,
    '2025-11-04'::date,
    'pix'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24211947835 Sueli Gomes 67 9135-5609 Ref. ao pedido de venda nº 551',
    '2025-10-31'::date,
    '2025-10-31'::date,
    'pix'
  ),
  (
    'receita',
    323.89::numeric,
    'Vendas de serviços',
    'BLING-REC:24211960136 Dheyvison Primiani Ref. ao pedido de venda nº 552',
    '2025-10-29'::date,
    '2025-10-29'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24211985380 Vanda 67 9808-5707 Ref. ao pedido de venda nº 553',
    '2025-10-27'::date,
    '2025-10-27'::date,
    'dinheiro'
  ),
  (
    'receita',
    400.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24212010834 Dirceu Araujo 67 8407-8028 Ref. ao pedido de venda nº 554',
    '2025-10-25'::date,
    '2025-10-25'::date,
    'dinheiro'
  ),
  (
    'receita',
    413.81::numeric,
    'Vendas de serviços',
    'BLING-REC:24212120351 Lurdes 67 9988-2533 Ref. ao pedido de venda nº 555',
    '2025-10-25'::date,
    '2025-10-25'::date,
    'credito_1x'
  ),
  (
    'receita',
    413.81::numeric,
    'Vendas de serviços',
    'BLING-REC:24212272270 Mirian Nonato 67 9127-2489 Ref. ao pedido de venda nº 556',
    '2025-10-25'::date,
    '2025-10-25'::date,
    'credito_1x'
  ),
  (
    'receita',
    85.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24212318341 Edmar falco Ref. ao pedido de venda nº 557',
    '2025-10-25'::date,
    NULL::date,
    'credito_1x'
  ),
  (
    'receita',
    600.00::numeric,
    'Vendas de produtos',
    'BLING-REC:24248711045 Tatiana 67 8154-6176 Ref. ao pedido de venda nº 558',
    '2025-11-05'::date,
    '2025-11-05'::date,
    'pix'
  ),
  (
    'receita',
    345.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24248725045 Paula 67 9869-3797 Ref. ao pedido de venda nº 559',
    '2025-11-05'::date,
    '2025-11-05'::date,
    'pix'
  ),
  (
    'receita',
    179.48::numeric,
    'Vendas de serviços',
    'BLING-REC:24461835326 Pamela Reis Ref. ao pedido de venda nº 560',
    '2025-11-28'::date,
    '2025-11-28'::date,
    'pix'
  ),
  (
    'receita',
    375.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24461859844 Flavia Diniz Ref. ao pedido de venda nº 561',
    '2025-11-29'::date,
    '2025-11-29'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24461870202 Aline 67 9883-5106 Ref. ao pedido de venda nº 562',
    '2025-11-28'::date,
    '2025-11-28'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24461940096 Rosangela Soares 67 9879-7516 Ref. ao pedido de venda nº 563',
    '2025-11-28'::date,
    '2025-11-28'::date,
    'pix'
  ),
  (
    'receita',
    356.75::numeric,
    'Outros',
    'BLING-REC:24503763327 Sonia Botura 67 8409-4481 Ref. ao pedido de venda nº 564',
    '2025-12-02'::date,
    '2025-12-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24503777135 Junior 67 9656-4894 Ref. ao pedido de venda nº 565',
    '2025-12-02'::date,
    '2025-12-02'::date,
    'dinheiro'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24503797089 Jakerson Moreira - 67992410768‬ Ref. ao pedido de venda nº 566',
    '2025-12-02'::date,
    '2025-12-02'::date,
    'pix'
  ),
  (
    'receita',
    464.71::numeric,
    'Vendas de serviços',
    'BLING-REC:24503833627 Iara Vieira Ref. ao pedido de venda nº 567',
    '2025-12-02'::date,
    '2025-12-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    515.63::numeric,
    'Vendas de serviços',
    'BLING-REC:24503860184 Maria Irene Ref. ao pedido de venda nº 568',
    '2025-12-02'::date,
    '2025-12-02'::date,
    'credito_1x'
  ),
  (
    'receita',
    211.23::numeric,
    'Vendas de serviços',
    'BLING-REC:24503915326 Vani 67 9693-2087 Ref. ao pedido de venda nº 570',
    '2025-11-26'::date,
    '2025-11-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'receita',
    236.53::numeric,
    'Vendas de serviços',
    'BLING-REC:24521971596 Cris Marangueli 67 8483-0220 Ref. ao pedido de venda nº 571',
    '2025-12-04'::date,
    '2025-12-04'::date,
    'credito_1x'
  ),
  (
    'receita',
    135.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24567517792 Kátia Talon Ref. ao pedido de venda nº 573',
    '2025-12-03'::date,
    NULL::date,
    'pix'
  ),
  (
    'receita',
    160.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24567556711 Lucas Felix Ref. ao pedido de venda nº 574',
    '2025-11-21'::date,
    '2025-11-21'::date,
    'pix'
  ),
  (
    'receita',
    405.21::numeric,
    'Vendas de serviços',
    'BLING-REC:24581770102 Patriana Morais Ref. ao pedido de venda nº 575',
    '2025-11-10'::date,
    '2025-11-10'::date,
    'credito_1x'
  ),
  (
    'receita',
    290.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24592557756 Tiago Nunes Ref. ao pedido de venda nº 576',
    '2025-11-06'::date,
    '2025-11-06'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24592591216 Odair Ref. ao pedido de venda nº 577',
    '2025-11-24'::date,
    '2025-11-24'::date,
    'pix'
  ),
  (
    'receita',
    230.01::numeric,
    'Vendas de serviços',
    'BLING-REC:24592641278 Katia Eliandia Ref. ao pedido de venda nº 578',
    '2025-12-01'::date,
    '2025-12-03'::date,
    'credito_1x'
  ),
  (
    'receita',
    521.04::numeric,
    'Vendas de serviços',
    'BLING-REC:24592665573 Mirian Regina Frais Ref. ao pedido de venda nº 572',
    '2025-12-05'::date,
    '2025-12-05'::date,
    'credito_1x'
  ),
  (
    'receita',
    295.00::numeric,
    'Vendas de serviços',
    'BLING-REC:24826395693 Terezinha Tititi Modas Ref. ao pedido de venda nº 579',
    '2026-01-10'::date,
    NULL::date,
    'dinheiro'
  ),
  (
    'receita',
    480.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25159354405 Maria José Queiroz 67 9627-4314 Ref. ao pedido de venda nº 582',
    '2026-02-24'::date,
    '2026-02-24'::date,
    'credito_1x'
  ),
  (
    'receita',
    545.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25167757092 Graziela 67 9977-1167 Ref. ao pedido de venda nº 583',
    '2026-02-25'::date,
    NULL::date,
    'pix'
  ),
  (
    'receita',
    380.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25192454153 Kareca 67 9313-8909 Ref. ao pedido de venda nº 584',
    '2026-03-27'::date,
    NULL::date,
    'pix'
  ),
  (
    'receita',
    320.82::numeric,
    'Vendas de serviços',
    'BLING-REC:25192466132 67 8482-5244 Ref. ao pedido de venda nº 585',
    '2026-02-25'::date,
    '2026-02-25'::date,
    'credito_1x'
  ),
  (
    'receita',
    352.17::numeric,
    'Vendas de serviços',
    'BLING-REC:25192481166 Franciele 67 9806-4455 Ref. ao pedido de venda nº 586',
    '2026-02-24'::date,
    '2026-02-28'::date,
    'credito_1x'
  ),
  (
    'receita',
    210.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25192490565 Jussara 67 8204-7723 Ref. ao pedido de venda nº 587',
    '2026-02-24'::date,
    '2026-02-24'::date,
    'pix'
  ),
  (
    'receita',
    220.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25192496820 Camila Ferreira 67 9152-8025 Ref. ao pedido de venda nº 588',
    '2026-02-23'::date,
    '2026-02-23'::date,
    'pix'
  ),
  (
    'receita',
    323.89::numeric,
    'Vendas de serviços',
    'BLING-REC:25192507188 Denilza 67 9659-0479 Ref. ao pedido de venda nº 589',
    '2026-02-24'::date,
    '2026-02-24'::date,
    'dinheiro'
  ),
  (
    'receita',
    490.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25195463240 Amanda 67 9937-7875 Ref. ao pedido de venda nº 590',
    '2026-02-24'::date,
    '2026-02-24'::date,
    'pix'
  ),
  (
    'receita',
    544.51::numeric,
    'Vendas de serviços',
    'BLING-REC:25203447789 Lurdes 67 9253-2407 Ref. ao pedido de venda nº 591',
    '2026-02-23'::date,
    '2026-02-23'::date,
    'credito_1x'
  ),
  (
    'receita',
    230.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25203594356 Taina Silva Pereira 67 9875-4507 Ref. ao pedido de venda nº 592',
    '2026-02-02'::date,
    '2026-02-02'::date,
    'pix'
  ),
  (
    'receita',
    320.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25203635842 Maria Bazotti 67 9674-8832 Ref. ao pedido de venda nº 593',
    '2026-02-11'::date,
    '2026-02-11'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25203681929 Maria Jose 67 9836-1295 Ref. ao pedido de venda nº 594',
    '2026-02-07'::date,
    '2026-02-07'::date,
    'pix'
  ),
  (
    'receita',
    385.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25203725139 Hotel Villa Verde Ref. ao pedido de venda nº 580',
    '2026-01-15'::date,
    '2026-01-15'::date,
    'pix'
  ),
  (
    'receita',
    285.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25203764343 Hotel Villa Verde Ref. ao pedido de venda nº 581',
    '2026-02-13'::date,
    '2026-02-13'::date,
    'pix'
  ),
  (
    'receita',
    650.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25203927446 Valdirene 67 9989-0904 Ref. ao pedido de venda nº 595',
    '2026-02-20'::date,
    '2026-02-20'::date,
    'pix'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25330417081 Simone Nelvo 67 9642-4122 Ref. ao pedido de venda nº 598',
    '2026-03-13'::date,
    '2026-03-13'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25330543077 Gilson 67 9646-5601 Ref. ao pedido de venda nº 599',
    '2026-02-25'::date,
    '2026-02-25'::date,
    'dinheiro'
  ),
  (
    'receita',
    270.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25330553884 Gilson 67 9646-5601 Ref. ao pedido de venda nº 600',
    '2026-03-13'::date,
    '2026-03-13'::date,
    'dinheiro'
  ),
  (
    'receita',
    250.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25330618359 Lucas 67 9977-3315 Ref. ao pedido de venda nº 601',
    '2026-01-03'::date,
    '2026-03-12'::date,
    'pix'
  ),
  (
    'receita',
    245.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25330823332 Marcos Dimas Da Silva Ref. ao pedido de venda nº 602',
    '2026-03-07'::date,
    '2026-03-07'::date,
    'pix'
  ),
  (
    'receita',
    385.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25332999488 Mônica 67 8405-8977 Ref. ao pedido de venda nº 603',
    '2026-03-13'::date,
    '2026-03-13'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25333005997 Heidi Okabayashi 67 9879-2042 Ref. ao pedido de venda nº 604',
    '2026-03-12'::date,
    '2026-03-12'::date,
    'pix'
  ),
  (
    'receita',
    195.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25383144310 Mariana Campos Vaz 67 9145-4884 Ref. ao pedido de venda nº 605',
    '2026-03-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25383164209 Josi 67 9800-4268 Ref. ao pedido de venda nº 606',
    '2026-03-18'::date,
    '2026-03-18'::date,
    'pix'
  ),
  (
    'receita',
    350.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25383205030 Manoel Pereira Junior Ref. ao pedido de venda nº 607',
    '2026-03-12'::date,
    '2026-03-12'::date,
    'pix'
  ),
  (
    'receita',
    805.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25383314204 Luzia 67 9156-7820 Ref. ao pedido de venda nº 608',
    '2026-03-21'::date,
    '2026-03-21'::date,
    'pix'
  ),
  (
    'receita',
    260.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25456394665 Mariana Baptista Ref. ao pedido de venda nº 610',
    '2026-03-26'::date,
    '2026-03-26'::date,
    'pix'
  ),
  (
    'receita',
    370.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25456437318 Junior Marmoart 67 9859-6401 Ref. ao pedido de venda nº 611',
    '2026-03-23'::date,
    '2026-03-23'::date,
    'pix'
  ),
  (
    'receita',
    185.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25456460085 Maria Luzia 67 8468-8955 Ref. ao pedido de venda nº 612',
    '2026-03-26'::date,
    '2026-03-26'::date,
    'pix'
  ),
  (
    'receita',
    170.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25456480447 Cleodice 67 9696-6964 Ref. ao pedido de venda nº 613',
    '2026-03-20'::date,
    '2026-03-20'::date,
    'pix'
  ),
  (
    'receita',
    365.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25456515572 Cauã 67 9334-2835 Ref. ao pedido de venda nº 614',
    '2026-03-17'::date,
    '2026-03-17'::date,
    'pix'
  ),
  (
    'receita',
    585.00::numeric,
    'Vendas de serviços',
    'BLING-REC:25674827054 SANTUSSI & BARROS LTDA Ref. ao pedido de venda nº 615',
    '2026-04-28'::date,
    NULL::date,
    'pix'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- ============================================================
-- 3. INSERT contas a pagar (1235)
-- ============================================================
-- CONTAS A PAGAR — batch 1/7 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'despesa',
    76.85::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242391 Ministerio da Economia Pagamento do DAS - Nov 2024',
    '2024-12-20'::date,
    '2024-12-23'::date,
    'pix'
  ),
  (
    'despesa',
    79.38::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242396 Ministerio da Economia Pagamento do DAS - Dez 2024',
    '2025-01-20'::date,
    '2025-01-31'::date,
    'pix'
  ),
  (
    'despesa',
    81.90::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242398 Ministerio da Economia Pagamento do DAS - Jan 2025',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'pix'
  ),
  (
    'despesa',
    87.59::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242401 Ministerio da Economia Pagamento do DAS - Fev 2025',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'pix'
  ),
  (
    'despesa',
    88.13::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242405 Ministerio da Economia Pagamento do DAS - Mar 2025',
    '2025-04-22'::date,
    '2025-04-22'::date,
    'pix'
  ),
  (
    'despesa',
    88.99::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242407 Ministerio da Economia Pagamento do DAS - Abr 2025',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'pix'
  ),
  (
    'despesa',
    86.23::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242409 Ministerio da Economia Pagamento do DAS - Mai 2025',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'pix'
  ),
  (
    'despesa',
    95.57::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242412 Ministerio da Economia Pagamento do DAS - Jun 2025',
    '2025-07-21'::date,
    '2025-07-21'::date,
    'pix'
  ),
  (
    'despesa',
    86.51::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242415 Ministerio da Economia Pagamento do DAS - Jul 2025',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'pix'
  ),
  (
    'despesa',
    88.40::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242417 Ministerio da Economia Pagamento do DAS - Ago 2025',
    '2025-09-22'::date,
    '2025-09-22'::date,
    'pix'
  ),
  (
    'despesa',
    82.98::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21603242420 Ministerio da Economia Pagamento do DAS - Set 2025',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'pix'
  ),
  (
    'despesa',
    303.66::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21663349192 Mercado Livre # 2000006549923549',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    76.85::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21663405904 Ministerio da Economia Pagamento do DAS - Out 2024',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'pix'
  ),
  (
    'despesa',
    169.54::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693278614 Mercado Livre # 2000006742086323',
    '2024-12-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.73::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338077 Mercado Livre # 2000006742086323',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338083 Mercado Livre # 2000006742086323',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338086 Mercado Livre # 2000006742086323',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338091 Mercado Livre # 2000006742086323',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338095 Mercado Livre # 2000006742086323',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338105 Mercado Livre # 2000006742086323',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338110 Mercado Livre # 2000006742086323',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338117 Mercado Livre # 2000006742086323',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338122 Mercado Livre # 2000006742086323',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338127 Mercado Livre # 2000006742086323',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338132 Mercado Livre # 2000006742086323',
    '2025-11-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    101.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693338139 Mercado Livre # 2000006742086323',
    '2025-12-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    123.96::numeric,
    'Material de uso e consumo',
    'BLING-PAG:21693390747 Mercado Livre # 2000006717812417',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    14.30::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693409984 Mercado Livre # 2000006717812417',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693412536 Mercado Livre # 2000006717812417',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693415029 Mercado Livre # 2000006717812417',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693415033 Mercado Livre # 2000006717812417',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693415037 Mercado Livre # 2000006717812417',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693415043 Mercado Livre # 2000006717812417',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693415050 Mercado Livre # 2000006717812417',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693415054 Mercado Livre # 2000006717812417',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693415056 Mercado Livre # 2000006717812417',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693415059 Mercado Livre # 2000006717812417',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    207.00::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693473170 Mercado Livre # 2000006682378357 - UNIFORMES',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    178.27::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693481613 Mercado Livre # 2000009898226032',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    119.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693525635 Mercado Livre # 2000006636072231',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    244.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693549893 Mercado Livre # 2000009781145060',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    45.08::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693560199 Mercado Livre # 2000006636072231',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    38.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693618907 Mercado Livre # 2000006450500795',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    170.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693624984 Mercado Livre # 2000006413473087',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651495 Mercado Livre # 2000006360918489',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651499 Mercado Livre # 2000006360918489',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651502 Mercado Livre # 2000006360918489',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651508 Mercado Livre # 2000006360918489',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651510 Mercado Livre # 2000006360918489',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651515 Mercado Livre # 2000006360918489',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651520 Mercado Livre # 2000006360918489',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651525 Mercado Livre # 2000006360918489',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651528 Mercado Livre # 2000006360918489',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651531 Mercado Livre # 2000006360918489',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693651533 Mercado Livre # 2000006360918489',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    94.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693660093 Mercado Livre # 2000006350289147',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    31.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693664035 Mercado Livre # 2000006350289147',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    806.84::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693719123 Mercado Livre # 2000006264269043',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    203.22::numeric,
    'Material de escritório',
    'BLING-PAG:21693770663 Mercado Livre # 2000008804880232',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778219 Mercado Livre # 2000008804866060',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778223 Mercado Livre # 2000008804866060',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778226 Mercado Livre # 2000008804866060',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778231 Mercado Livre # 2000008804866060',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778236 Mercado Livre # 2000008804866060',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778244 Mercado Livre # 2000008804866060',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778251 Mercado Livre # 2000008804866060',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778257 Mercado Livre # 2000008804866060',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778259 Mercado Livre # 2000008804866060',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    59.62::numeric,
    'Material de escritório',
    'BLING-PAG:21693778262 Mercado Livre # 2000008804866060',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    52.48::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693789243 Mercado Livre # 2000008795295664',
    '2024-07-17'::date,
    '2024-07-17'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    51.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693797194 Mercado Livre # 2000006018154031',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693809993 Mercado Livre # 2000006018154031',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693809998 Mercado Livre # 2000006018154031',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693810000 Mercado Livre # 2000006018154031',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693810007 Mercado Livre # 2000006018154031',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693810011 Mercado Livre # 2000006018154031',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693810015 Mercado Livre # 2000006018154031',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693810018 Mercado Livre # 2000006018154031',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693810021 Mercado Livre # 2000006018154031',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693810026 Mercado Livre # 2000006018154031',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    6.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693810028 Mercado Livre # 2000006018154031',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    37.48::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693819611 Mercado Livre # 2000008610898682',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    37.48::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693819615 Mercado Livre # 2000008610898682',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    37.48::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693819617 Mercado Livre # 2000008610898682',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    37.48::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693819619 Mercado Livre # 2000008610898682',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    36.43::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693834896 Mercado Livre # 2000008523651988',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    36.43::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693834901 Mercado Livre # 2000008523651988',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    36.43::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693834904 Mercado Livre # 2000008523651988',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    36.43::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693834906 Mercado Livre # 2000008523651988',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    36.43::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693834911 Mercado Livre # 2000008523651988',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    36.43::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693834913 Mercado Livre # 2000008523651988',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    36.43::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693834915 Mercado Livre # 2000008523651988',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    36.43::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693834920 Mercado Livre # 2000008523651988',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693843193 Mercado Livre # 2000008795295664',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693843196 Mercado Livre # 2000008795295664',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693843198 Mercado Livre # 2000008795295664',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693843202 Mercado Livre # 2000008795295664',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693843208 Mercado Livre # 2000008795295664',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693843211 Mercado Livre # 2000008795295664',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    54.20::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693860653 Mercado Livre # 2000008338977734',
    '2024-06-10'::date,
    '2024-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896412 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-01-10'::date,
    '2024-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896416 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-02-10'::date,
    '2024-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896418 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-03-10'::date,
    '2024-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896424 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-04-10'::date,
    '2024-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896429 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-05-10'::date,
    '2024-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896434 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-06-10'::date,
    '2024-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896437 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896442 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896446 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21693896451 Refrilar Refrigeração Parcelamento divida com Refrilar',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952059 Dipebral Carrinho',
    '2024-01-10'::date,
    '2024-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952061 Dipebral Carrinho',
    '2024-02-10'::date,
    '2024-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952063 Dipebral Carrinho',
    '2024-03-10'::date,
    '2024-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952066 Dipebral Carrinho',
    '2024-04-10'::date,
    '2024-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952068 Dipebral Carrinho',
    '2024-05-10'::date,
    '2024-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952073 Dipebral Carrinho',
    '2024-06-10'::date,
    '2024-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952077 Dipebral Carrinho',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952080 Dipebral Carrinho',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952083 Dipebral Carrinho',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    43.34::numeric,
    'Despesas Operacionais',
    'BLING-PAG:21693952085 Dipebral Carrinho',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982359 Sertão Climatizador Ventisol',
    '2024-01-10'::date,
    '2024-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982364 Sertão Climatizador Ventisol',
    '2024-02-10'::date,
    '2024-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982368 Sertão Climatizador Ventisol',
    '2024-03-10'::date,
    '2024-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982371 Sertão Climatizador Ventisol',
    '2024-04-10'::date,
    '2024-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982377 Sertão Climatizador Ventisol',
    '2024-05-10'::date,
    '2024-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982382 Sertão Climatizador Ventisol',
    '2024-06-10'::date,
    '2024-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982390 Sertão Climatizador Ventisol',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982392 Sertão Climatizador Ventisol',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982396 Sertão Climatizador Ventisol',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.37::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21693982400 Sertão Climatizador Ventisol',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997361 Mercado Livre # 2000007141729648',
    '2024-01-10'::date,
    '2024-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997365 Mercado Livre # 2000007141729648',
    '2024-02-10'::date,
    '2024-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997373 Mercado Livre # 2000007141729648',
    '2024-03-10'::date,
    '2024-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997378 Mercado Livre # 2000007141729648',
    '2024-04-10'::date,
    '2024-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997384 Mercado Livre # 2000007141729648',
    '2024-05-10'::date,
    '2024-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997389 Mercado Livre # 2000007141729648',
    '2024-06-10'::date,
    '2024-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997397 Mercado Livre # 2000007141729648',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997402 Mercado Livre # 2000007141729648',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997409 Mercado Livre # 2000007141729648',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    91.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21693997416 Mercado Livre # 2000007141729648',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    32.26::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694021640 Mercado Livre # 2000008214814294',
    '2024-06-10'::date,
    '2024-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    32.26::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694021645 Mercado Livre # 2000008214814294',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    32.26::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694021647 Mercado Livre # 2000008214814294',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    32.26::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694021652 Mercado Livre # 2000008214814294',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    32.26::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694021654 Mercado Livre # 2000008214814294',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    32.26::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694021663 Mercado Livre # 2000008214814294',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    32.26::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694021666 Mercado Livre # 2000008214814294',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034168 Mercado Livre # 2000008305875712',
    '2024-06-10'::date,
    '2024-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034175 Mercado Livre # 2000008305875712',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034180 Mercado Livre # 2000008305875712',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034187 Mercado Livre # 2000008305875712',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034191 Mercado Livre # 2000008305875712',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034195 Mercado Livre # 2000008305875712',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034199 Mercado Livre # 2000008305875712',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034203 Mercado Livre # 2000008305875712',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034205 Mercado Livre # 2000008305875712',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.59::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694034208 Mercado Livre # 2000008305875712',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051036 Infinitepay Maquininha de Cartão',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051043 Infinitepay Maquininha de Cartão',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051052 Infinitepay Maquininha de Cartão',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051062 Infinitepay Maquininha de Cartão',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051069 Infinitepay Maquininha de Cartão',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051075 Infinitepay Maquininha de Cartão',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051079 Infinitepay Maquininha de Cartão',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051087 Infinitepay Maquininha de Cartão',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051091 Infinitepay Maquininha de Cartão',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051095 Infinitepay Maquininha de Cartão',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051100 Infinitepay Maquininha de Cartão',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.90::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694051105 Infinitepay Maquininha de Cartão',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093162 CPX DISTRIBUIDORA S.A Pneus montana',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093164 CPX DISTRIBUIDORA S.A Pneus montana',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093168 CPX DISTRIBUIDORA S.A Pneus montana',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093170 CPX DISTRIBUIDORA S.A Pneus montana',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093172 CPX DISTRIBUIDORA S.A Pneus montana',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093175 CPX DISTRIBUIDORA S.A Pneus montana',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093179 CPX DISTRIBUIDORA S.A Pneus montana',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093182 CPX DISTRIBUIDORA S.A Pneus montana',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093184 CPX DISTRIBUIDORA S.A Pneus montana',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093186 CPX DISTRIBUIDORA S.A Pneus montana',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093188 CPX DISTRIBUIDORA S.A Pneus montana',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    105.04::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694093190 CPX DISTRIBUIDORA S.A Pneus montana',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    37.47::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694530684 Ec Lojainterfrio',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    37.47::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694530688 Ec Lojainterfrio',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    37.47::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694530693 Ec Lojainterfrio',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    37.47::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694530699 Ec Lojainterfrio',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    187.74::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694540983 Matucho',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    187.74::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694540985 Matucho',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    187.74::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694540988 Matucho',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    96.66::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694559425 Hesley Alinhamento e Calora Montana',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    96.66::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694559436 Hesley Alinhamento e Calora Montana',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    96.66::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21694559441 Hesley Alinhamento e Calora Montana',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    70.33::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694565157 BCM',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    70.33::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694565161 BCM',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    70.33::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21694565164 BCM',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    100.00::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694591954 Incopama',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    100.00::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694591958 Incopama',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    100.00::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694591961 Incopama',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    100.00::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694591966 Incopama',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    100.00::numeric,
    'Equipamento para escritório',
    'BLING-PAG:21694591969 Incopama',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    75.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694598297 Amaral',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A PAGAR — batch 2/7 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'despesa',
    75.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694598299 Amaral',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    75.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21694598301 Amaral',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    27.99::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675906 Mercado Livre MeliMais',
    '2024-09-10'::date,
    '2024-09-10'::date,
    NULL
  ),
  (
    'despesa',
    27.99::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675908 Mercado Livre MeliMais',
    '2024-10-10'::date,
    '2024-10-10'::date,
    NULL
  ),
  (
    'despesa',
    27.99::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675910 Mercado Livre MeliMais',
    '2024-11-10'::date,
    '2024-11-10'::date,
    NULL
  ),
  (
    'despesa',
    27.99::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675914 Mercado Livre MeliMais',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    27.99::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675916 Mercado Livre MeliMais',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675922 Mercado Livre MeliMais',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675926 Mercado Livre MeliMais',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675928 Mercado Livre MeliMais',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675930 Mercado Livre MeliMais',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675932 Mercado Livre MeliMais',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675934 Mercado Livre MeliMais',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675936 Mercado Livre MeliMais',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21696675939 Mercado Livre MeliMais',
    '2025-11-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    58.95::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696679618 Casa dos Parafusos',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.95::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696679620 Casa dos Parafusos',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684800 Bradesco Anuidade',
    '2024-01-10'::date,
    '2024-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684802 Bradesco Anuidade',
    '2024-02-10'::date,
    '2024-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684805 Bradesco Anuidade',
    '2024-03-10'::date,
    '2024-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684807 Bradesco Anuidade',
    '2024-04-10'::date,
    '2024-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684810 Bradesco Anuidade',
    '2024-05-10'::date,
    '2024-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684813 Bradesco Anuidade',
    '2024-06-10'::date,
    '2024-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684815 Bradesco Anuidade',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684817 Bradesco Anuidade',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684819 Bradesco Anuidade',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684823 Bradesco Anuidade',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684825 Bradesco Anuidade',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    51.85::numeric,
    'Taxas pagas',
    'BLING-PAG:21696684827 Bradesco Anuidade',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    23.85::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696687825 Casa dos Parafusos',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    73.50::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696689945 Casa dos Parafusos',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    27.46::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696691253 Casa dos Parafusos',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    78.89::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696696465 Matucho',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    78.88::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696696468 Matucho',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    78.88::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696696470 Matucho',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    62.30::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696700806 Matucho',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    62.28::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696700809 Matucho',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    62.28::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696700811 Matucho',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    85.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696702480 BCM',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    85.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696702485 BCM',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    85.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696702489 BCM',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    128.72::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696734081 Matucho',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    128.72::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696734083 Matucho',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    128.72::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21696734090 Matucho',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    130.03::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696738074 Matucho',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    130.03::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696738076 Matucho',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    130.03::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696738078 Matucho',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    58.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696743354 Matucho',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    58.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696743356 Matucho',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    58.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696743358 Matucho',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.00::numeric,
    'Limpeza e manutenção',
    'BLING-PAG:21696746272 Santa catarina',
    '2024-10-02'::date,
    '2024-10-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    28.90::numeric,
    'Limpeza e manutenção',
    'BLING-PAG:21696752567 Dipebral',
    '2024-08-02'::date,
    '2024-08-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    28.90::numeric,
    'Limpeza e manutenção',
    'BLING-PAG:21696752569 Dipebral',
    '2024-09-02'::date,
    '2024-09-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    28.90::numeric,
    'Limpeza e manutenção',
    'BLING-PAG:21696752571 Dipebral',
    '2024-10-02'::date,
    '2024-10-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    28.90::numeric,
    'Limpeza e manutenção',
    'BLING-PAG:21696752573 Dipebral',
    '2024-11-02'::date,
    '2024-11-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    28.90::numeric,
    'Limpeza e manutenção',
    'BLING-PAG:21696752577 Dipebral',
    '2024-12-02'::date,
    '2024-12-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    35.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696759417 Eletrosam',
    '2024-11-02'::date,
    '2024-11-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    14.90::numeric,
    'Taxas pagas',
    'BLING-PAG:21696761269 Mercado Livre Uso do credito',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21696797785 Maria Cecilia Sanches Contabilidade',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21696797788 Maria Cecilia Sanches Contabilidade',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21696797790 Maria Cecilia Sanches Contabilidade',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21696797792 Maria Cecilia Sanches Contabilidade',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21696797794 Maria Cecilia Sanches Contabilidade',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'pix'
  ),
  (
    'despesa',
    49.90::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799644 Bradesco Tarifa Bradesco empresas',
    '2024-10-15'::date,
    '2024-10-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    49.90::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799646 Bradesco Tarifa Bradesco empresas',
    '2024-11-15'::date,
    '2024-11-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    49.90::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799648 Bradesco Tarifa Bradesco empresas',
    '2024-12-15'::date,
    '2024-12-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    49.90::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799650 Bradesco Tarifa Bradesco empresas',
    '2025-01-15'::date,
    '2025-01-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    49.90::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799652 Bradesco Tarifa Bradesco empresas',
    '2025-02-15'::date,
    '2025-02-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    49.90::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799654 Bradesco Tarifa Bradesco empresas',
    '2025-03-15'::date,
    '2025-03-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    49.90::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799656 Bradesco Tarifa Bradesco empresas',
    '2025-04-15'::date,
    '2025-04-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799658 Bradesco Tarifa Bradesco empresas',
    '2025-05-15'::date,
    '2025-05-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799660 Bradesco Tarifa Bradesco empresas',
    '2025-06-15'::date,
    '2025-06-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799662 Bradesco Tarifa Bradesco empresas',
    '2025-07-15'::date,
    '2025-07-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799664 Bradesco Tarifa Bradesco empresas',
    '2025-08-15'::date,
    '2025-08-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799666 Bradesco Tarifa Bradesco empresas',
    '2025-09-15'::date,
    '2025-09-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    52.60::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799668 Bradesco Tarifa Bradesco empresas',
    '2025-10-15'::date,
    '2025-10-15'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:21696799670 Bradesco Tarifa Bradesco empresas',
    '2025-11-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    261.22::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806738 Ministerio da Economia INSS FGTS',
    '2024-09-19'::date,
    '2024-09-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    429.85::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806740 Ministerio da Economia INSS FGTS',
    '2024-10-21'::date,
    '2024-10-21'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    261.22::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806742 Ministerio da Economia INSS FGTS',
    '2024-11-19'::date,
    '2024-11-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    350.53::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806744 Ministerio da Economia Esocial - INSS FGTS',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    367.46::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806747 Ministerio da Economia Esocial - INSS FGTS',
    '2025-01-20'::date,
    '2025-01-31'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    311.23::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806749 Ministerio da Economia Esocial - INSS FGTS',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    338.30::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806751 Ministerio da Economia Esocial - INSS FGTS',
    '2025-03-19'::date,
    '2025-03-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    340.16::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806754 Ministerio da Economia Esocial - INSS FGTS',
    '2025-04-22'::date,
    '2025-04-22'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    340.16::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806756 Ministerio da Economia Esocial - INSS FGTS',
    '2025-05-19'::date,
    '2025-05-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    335.47::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806759 Ministerio da Economia Esocial - INSS FGTS',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806762 Ministerio da Economia Esocial - INSS FGTS',
    '2025-07-21'::date,
    '2025-07-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    338.96::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806764 Ministerio da Economia Esocial - INSS FGTS',
    '2025-08-19'::date,
    '2025-08-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    340.74::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806766 Ministerio da Economia Esocial - INSS FGTS',
    '2025-09-19'::date,
    '2025-09-19'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    320.95::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806768 Ministerio da Economia Esocial - INSS FGTS',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:21696806770 Ministerio da Economia Esocial - INSS FGTS',
    '2025-11-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    1464.10::numeric,
    'Salários',
    'BLING-PAG:21696811257 THIAGO FERREIRA GONCALVES',
    '2024-07-05'::date,
    '2024-07-05'::date,
    'pix'
  ),
  (
    'despesa',
    1464.10::numeric,
    'Salários',
    'BLING-PAG:21696811259 THIAGO FERREIRA GONCALVES',
    '2024-08-05'::date,
    '2024-08-05'::date,
    'pix'
  ),
  (
    'despesa',
    1464.10::numeric,
    'Salários',
    'BLING-PAG:21696811261 THIAGO FERREIRA GONCALVES',
    '2024-09-05'::date,
    '2024-09-05'::date,
    'pix'
  ),
  (
    'despesa',
    1464.10::numeric,
    'Salários',
    'BLING-PAG:21696811263 THIAGO FERREIRA GONCALVES',
    '2024-10-07'::date,
    '2024-10-07'::date,
    'pix'
  ),
  (
    'despesa',
    1464.10::numeric,
    'Salários',
    'BLING-PAG:21696811265 THIAGO FERREIRA GONCALVES',
    '2024-11-05'::date,
    '2024-11-05'::date,
    'pix'
  ),
  (
    'despesa',
    1540.88::numeric,
    'Salários',
    'BLING-PAG:21696811268 THIAGO FERREIRA GONCALVES',
    '2024-12-05'::date,
    '2024-12-05'::date,
    'pix'
  ),
  (
    'despesa',
    1540.88::numeric,
    'Salários',
    'BLING-PAG:21696811270 THIAGO FERREIRA GONCALVES',
    '2025-01-06'::date,
    '2025-01-06'::date,
    'pix'
  ),
  (
    'despesa',
    1540.88::numeric,
    'Salários',
    'BLING-PAG:21696811272 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-02-05'::date,
    '2025-02-05'::date,
    'pix'
  ),
  (
    'despesa',
    1800.00::numeric,
    'Salários',
    'BLING-PAG:21696811274 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-03-05'::date,
    '2025-03-05'::date,
    'pix'
  ),
  (
    'despesa',
    1850.00::numeric,
    'Salários',
    'BLING-PAG:21696811276 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-04-07'::date,
    '2025-04-07'::date,
    'pix'
  ),
  (
    'despesa',
    1850.00::numeric,
    'Salários',
    'BLING-PAG:21696811278 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-05-05'::date,
    '2025-05-05'::date,
    'pix'
  ),
  (
    'despesa',
    2000.00::numeric,
    'Salários',
    'BLING-PAG:21696811280 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-06-05'::date,
    '2025-06-30'::date,
    'pix'
  ),
  (
    'despesa',
    2200.00::numeric,
    'Salários',
    'BLING-PAG:21696811282 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-07-07'::date,
    '2025-07-31'::date,
    'pix'
  ),
  (
    'despesa',
    2100.00::numeric,
    'Salários',
    'BLING-PAG:21696811285 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-08-31'::date,
    '2025-08-31'::date,
    'pix'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:21696811287 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-09-30'::date,
    '2025-09-30'::date,
    'pix'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:21696811289 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-10-31'::date,
    '2025-10-31'::date,
    'pix'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:21696811292 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-11-05'::date,
    '2025-11-05'::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21696831277 Ministerio da Economia DAS',
    '2024-07-20'::date,
    '2024-07-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21696831281 Ministerio da Economia DAS',
    '2024-08-20'::date,
    '2024-08-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21696831283 Ministerio da Economia DAS',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    83.19::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21696832934 Ministerio da Economia DAS',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844179 Mercado Livre',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844181 Mercado Livre',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844183 Mercado Livre',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844185 Mercado Livre',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844187 Mercado Livre',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844189 Mercado Livre',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844191 Mercado Livre',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844193 Mercado Livre',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844195 Mercado Livre',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    58.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696844197 Mercado Livre',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848553 Mercado Livre # 2000006450500795',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848555 Mercado Livre # 2000006450500795',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848557 Mercado Livre # 2000006450500795',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848559 Mercado Livre # 2000006450500795',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848561 Mercado Livre # 2000006450500795',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848563 Mercado Livre # 2000006450500795',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848565 Mercado Livre # 2000006450500795',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848567 Mercado Livre # 2000006450500795',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848569 Mercado Livre # 2000006450500795',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848571 Mercado Livre # 2000006450500795',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848573 Mercado Livre # 2000006450500795',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    40.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696848575 Mercado Livre # 2000006450500795',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    31.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696851008 Mercado Livre # 2000006350289147',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    31.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696851011 Mercado Livre # 2000006350289147',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    31.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696851013 Mercado Livre # 2000006350289147',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    31.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696851015 Mercado Livre # 2000006350289147',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    31.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696851017 Mercado Livre # 2000006350289147',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    31.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21696851019 Mercado Livre # 2000006350289147',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    374.50::numeric,
    'Salários',
    'BLING-PAG:21696869642 THIAGO FERREIRA GONCALVES Primeira Parcela do Decimo Terceiro',
    '2024-12-02'::date,
    '2024-12-02'::date,
    'pix'
  ),
  (
    'despesa',
    89.99::numeric,
    'Internet',
    'BLING-PAG:21738166932 FleetNet',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    109.95::numeric,
    'Internet',
    'BLING-PAG:21738166935 FleetNet',
    '2025-01-10'::date,
    '2025-01-27'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    109.78::numeric,
    'Internet',
    'BLING-PAG:21738166940 FleetNet Internet',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    109.78::numeric,
    'Internet',
    'BLING-PAG:21738166946 FleetNet Internet',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    89.99::numeric,
    'Internet',
    'BLING-PAG:21738166949 FleetNet Internet',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    89.99::numeric,
    'Internet',
    'BLING-PAG:21738166951 FleetNet Internet',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    89.99::numeric,
    'Internet',
    'BLING-PAG:21738166956 FleetNet Internet',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'pix'
  ),
  (
    'despesa',
    89.99::numeric,
    'Internet',
    'BLING-PAG:21738166959 FleetNet Internet',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    89.99::numeric,
    'Internet',
    'BLING-PAG:21738166961 FleetNet Internet',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    89.99::numeric,
    'Internet',
    'BLING-PAG:21738166963 FleetNet Internet',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:21738166965 FleetNet Internet',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    89.99::numeric,
    'Internet',
    'BLING-PAG:21738166968 FleetNet Internet',
    '2025-11-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076081 DANILO CONTABILIDADE Contabilidade',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076086 DANILO CONTABILIDADE Contabilidade',
    '2024-08-10'::date,
    '2024-08-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076091 DANILO CONTABILIDADE Contabilidade',
    '2024-09-10'::date,
    '2024-09-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076098 DANILO CONTABILIDADE Contabilidade',
    '2024-10-10'::date,
    '2024-10-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076102 DANILO CONTABILIDADE Contabilidade',
    '2024-11-10'::date,
    '2024-11-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076107 DANILO CONTABILIDADE Contabilidade',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076112 DANILO CONTABILIDADE Contabilidade',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076118 DANILO CONTABILIDADE Contabilidade',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076123 DANILO CONTABILIDADE Contabilidade',
    '2025-03-10'::date,
    '2025-03-12'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076128 DANILO CONTABILIDADE Contabilidade',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076133 DANILO CONTABILIDADE Contabilidade',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076141 DANILO CONTABILIDADE Contabilidade',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076146 DANILO CONTABILIDADE Contabilidade',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076150 DANILO CONTABILIDADE Contabilidade',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076157 DANILO CONTABILIDADE Contabilidade',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076166 DANILO CONTABILIDADE Contabilidade',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21756076171 DANILO CONTABILIDADE Contabilidade',
    '2025-11-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    154.36::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21756240295 Matucho',
    '2024-11-28'::date,
    '2024-11-28'::date,
    'pix'
  ),
  (
    'despesa',
    140.45::numeric,
    'Água',
    'BLING-PAG:21756832085 sanesul',
    '2024-11-02'::date,
    '2024-11-02'::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:21756832087 sanesul',
    '2024-12-02'::date,
    '2024-12-02'::date,
    'pix'
  ),
  (
    'despesa',
    110.35::numeric,
    'Água',
    'BLING-PAG:21756832091 sanesul',
    '2025-01-02'::date,
    '2025-01-31'::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:21756832094 sanesul Agua',
    '2025-02-02'::date,
    '2025-02-02'::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:21756832097 sanesul Agua',
    '2025-03-02'::date,
    '2025-03-02'::date,
    'pix'
  ),
  (
    'despesa',
    113.30::numeric,
    'Água',
    'BLING-PAG:21756832101 sanesul Agua',
    '2025-04-02'::date,
    '2025-04-02'::date,
    'pix'
  ),
  (
    'despesa',
    238.65::numeric,
    'Água',
    'BLING-PAG:21756832104 sanesul Agua',
    '2025-05-02'::date,
    '2025-05-02'::date,
    'pix'
  ),
  (
    'despesa',
    255.85::numeric,
    'Água',
    'BLING-PAG:21756832110 sanesul Agua',
    '2025-07-02'::date,
    '2025-07-10'::date,
    'pix'
  ),
  (
    'despesa',
    115.80::numeric,
    'Água',
    'BLING-PAG:21756832112 sanesul Agua',
    '2025-08-02'::date,
    '2025-08-02'::date,
    'pix'
  ),
  (
    'despesa',
    124.34::numeric,
    'Água',
    'BLING-PAG:21756832118 sanesul Agua',
    '2025-09-02'::date,
    '2025-09-02'::date,
    'pix'
  ),
  (
    'despesa',
    132.53::numeric,
    'Água',
    'BLING-PAG:21756832122 sanesul Agua',
    '2025-10-02'::date,
    '2025-10-02'::date,
    'pix'
  ),
  (
    'despesa',
    133.49::numeric,
    'Água',
    'BLING-PAG:21756832124 sanesul Agua',
    '2025-11-02'::date,
    '2025-11-02'::date,
    'pix'
  ),
  (
    'despesa',
    113.00::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615130 Energisa',
    '2024-07-10'::date,
    '2024-07-10'::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615137 Energisa Energia',
    '2024-09-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615143 Energisa Energia',
    '2024-10-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615148 Energisa Energia',
    '2024-11-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615154 Energisa',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'pix'
  ),
  (
    'despesa',
    208.00::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615164 Energisa',
    '2025-01-10'::date,
    '2025-01-31'::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615174 Energisa Energia',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615179 Energisa Energia',
    '2025-03-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615183 Energisa Energia',
    '2025-04-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615187 Energisa Energia',
    '2025-05-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615190 Energisa Energia',
    '2025-06-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615192 Energisa Energia',
    '2025-07-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615197 Energisa Energia',
    '2025-08-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    500.00::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615201 Energisa Energia',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615205 Energisa Energia',
    '2025-10-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21779615211 Energisa Energia',
    '2025-11-10'::date,
    NULL::date,
    'pix'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A PAGAR — batch 3/7 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'despesa',
    87.95::numeric,
    'Encargos da folha',
    'BLING-PAG:21879525767 Ministerio da Economia esocial - 13',
    '2024-12-23'::date,
    '2024-12-23'::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21881722794 Ministerio da Economia Pagamento do DAS - Out 2025',
    '2025-11-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606331 PRO PRONTO AUTO PECAS',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606335 PRO PRONTO AUTO PECAS',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606342 PRO PRONTO AUTO PECAS',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606348 PRO PRONTO AUTO PECAS',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606352 PRO PRONTO AUTO PECAS',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606354 PRO PRONTO AUTO PECAS',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606359 PRO PRONTO AUTO PECAS',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606370 PRO PRONTO AUTO PECAS',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    164.80::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893606379 PRO PRONTO AUTO PECAS',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    30.00::numeric,
    'Telefone',
    'BLING-PAG:21893612526 TIM',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616864 PRO PRONTO AUTO PECAS',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616868 PRO PRONTO AUTO PECAS',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616871 PRO PRONTO AUTO PECAS',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616878 PRO PRONTO AUTO PECAS',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616885 PRO PRONTO AUTO PECAS',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616892 PRO PRONTO AUTO PECAS',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616897 PRO PRONTO AUTO PECAS',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616904 PRO PRONTO AUTO PECAS',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    35.00::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893616913 PRO PRONTO AUTO PECAS',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    261.01::numeric,
    'Manutenção de veículos',
    'BLING-PAG:21893629756 KURAMOTO SERVICOS',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:21893679346 AUTO POSTO SENNA',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    50.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:21893687756 STEFANELLO JR AUTO PO',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    20.00::numeric,
    'Telefone',
    'BLING-PAG:21894161189 TIM',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    50.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:21894229817 AUTO POSTO SENNA',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21894243397 Mercado Livre # 2000006735481345',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.00::numeric,
    'Outros',
    'BLING-PAG:21894266262 Mercado Livre # 2000006717812417',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    162.02::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21894271360 Mercado Livre # 2000009956704706',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    80.95::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:21894277665 AUTO POSTO SENNA',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:21956207158 FleetNet Internet',
    '2025-12-10'::date,
    '2025-12-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:21956207161 DANILO CONTABILIDADE Contabilidade',
    '2025-12-10'::date,
    '2025-12-10'::date,
    'pix'
  ),
  (
    'despesa',
    133.49::numeric,
    'Água',
    'BLING-PAG:21956207163 sanesul Agua',
    '2025-12-02'::date,
    '2025-12-02'::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:21956207165 Energisa Energia',
    '2025-12-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:21956207168 Ministerio da Economia Pagamento do DAS - Nov 2025',
    '2025-12-22'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:21956207171 Mercado Livre MeliMais',
    '2025-12-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:21956207176 Bradesco Tarifa Bradesco empresas',
    '2025-12-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:21956207179 Ministerio da Economia Esocial - INSS FGTS',
    '2025-12-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:21956207181 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2025-12-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108687 Mercado Livre # 2000006549923549',
    '2024-12-10'::date,
    '2024-12-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108689 Mercado Livre # 2000006549923549',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108691 Mercado Livre # 2000006549923549',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108693 Mercado Livre # 2000006549923549',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108696 Mercado Livre # 2000006549923549',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108701 Mercado Livre # 2000006549923549',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108704 Mercado Livre # 2000006549923549',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108706 Mercado Livre # 2000006549923549',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108708 Mercado Livre # 2000006549923549',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    65.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999108710 Mercado Livre # 2000006549923549',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    299.76::numeric,
    'Juros pagos',
    'BLING-PAG:21999132609 Bradesco Encargos',
    '2024-12-03'::date,
    '2024-12-03'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187040 Bradesco',
    '2024-07-26'::date,
    '2024-07-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187043 Bradesco',
    '2024-08-26'::date,
    '2024-08-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187047 Bradesco',
    '2024-09-26'::date,
    '2024-09-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187052 Bradesco',
    '2024-10-26'::date,
    '2024-10-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    689.50::numeric,
    'Emprestimo',
    'BLING-PAG:21999187055 Bradesco',
    '2024-11-26'::date,
    '2024-11-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187057 Bradesco',
    '2024-12-26'::date,
    '2024-12-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    805.38::numeric,
    'Emprestimo',
    'BLING-PAG:21999187060 Bradesco',
    '2025-01-26'::date,
    '2025-01-29'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187063 Bradesco',
    '2025-02-26'::date,
    '2025-02-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187065 Bradesco',
    '2025-03-26'::date,
    '2025-03-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187068 Bradesco',
    '2025-04-26'::date,
    '2025-04-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187070 Bradesco',
    '2025-05-26'::date,
    '2025-05-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187072 Bradesco',
    '2025-06-26'::date,
    '2025-06-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187074 Bradesco',
    '2025-07-26'::date,
    '2025-07-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187078 Bradesco',
    '2025-08-26'::date,
    '2025-08-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187084 Bradesco',
    '2025-09-26'::date,
    '2025-09-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187087 Bradesco',
    '2025-10-26'::date,
    '2025-10-26'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187091 Bradesco',
    '2025-11-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187094 Bradesco',
    '2025-12-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187096 Bradesco',
    '2026-01-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187098 Bradesco',
    '2026-02-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187100 Bradesco',
    '2026-03-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187105 Bradesco',
    '2026-04-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187107 Bradesco',
    '2026-05-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187110 Bradesco',
    '2026-06-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187113 Bradesco',
    '2026-07-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187115 Bradesco',
    '2026-08-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187118 Bradesco',
    '2026-09-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187120 Bradesco',
    '2026-10-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187123 Bradesco',
    '2026-11-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187125 Bradesco',
    '2026-12-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187127 Bradesco',
    '2027-01-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187129 Bradesco',
    '2027-02-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187132 Bradesco',
    '2027-03-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187136 Bradesco',
    '2027-04-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187138 Bradesco',
    '2027-05-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    788.92::numeric,
    'Emprestimo',
    'BLING-PAG:21999187140 Bradesco',
    '2027-06-26'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:21999289450 Mano Auto Posto Ltda Conta Bradesco PJ',
    '2024-12-02'::date,
    '2024-12-02'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    320.00::numeric,
    'Outros',
    'BLING-PAG:21999308313 EZEQUIEL SANTANA SERV Motor Montana - Pix Bradesco PJ',
    '2024-12-04'::date,
    '2024-12-04'::date,
    'pix'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:21999326642 Mano Auto Posto Ltda Bradesco PJ',
    '2024-12-16'::date,
    '2024-12-16'::date,
    'pix'
  ),
  (
    'despesa',
    419.38::numeric,
    'Salários',
    'BLING-PAG:21999332522 THIAGO FERREIRA GONCALVES Segunda Parcela do Decimo Terceiro',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'pix'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363469 Canva',
    '2024-11-02'::date,
    '2024-11-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363471 Canva',
    '2024-12-02'::date,
    '2024-12-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363473 Canva',
    '2025-01-02'::date,
    '2025-01-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363479 Canva',
    '2025-02-02'::date,
    '2025-02-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363484 Canva',
    '2025-03-02'::date,
    '2025-03-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.16::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363487 Canva',
    '2025-04-02'::date,
    '2025-04-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363489 Canva',
    '2025-05-02'::date,
    '2025-05-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.16::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363491 Canva',
    '2025-06-02'::date,
    '2025-06-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363497 Canva',
    '2025-07-02'::date,
    '2025-07-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363499 Canva',
    '2025-08-02'::date,
    '2025-08-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363502 Canva',
    '2025-09-02'::date,
    '2025-09-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    24.24::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:21999363504 Canva',
    '2025-10-02'::date,
    '2025-10-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    14.90::numeric,
    'Taxas pagas',
    'BLING-PAG:21999394002 Mercado Livre Usa de crédito',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.45::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21999459460 Casa dos Parafusos',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    10.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:21999466598 Eletrosam',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:21999469700 AUTO POSTO SENNA',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    120.46::numeric,
    'Serviços de terceiros',
    'BLING-PAG:21999475190 OPENAI CHATGPT',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    4.50::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:21999478416 Casa dos Parafusos',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    208.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22043478746 Mercado Livre # 2000010493467182',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    53.50::numeric,
    'Outros',
    'BLING-PAG:22103742380 CONTEL',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    53.50::numeric,
    'Material de escritório',
    'BLING-PAG:22103742392 CONTEL',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    141.49::numeric,
    'Outros',
    'BLING-PAG:22103822034 KURAMOTO SERVICOS',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    141.49::numeric,
    'Material de escritório',
    'BLING-PAG:22103822039 KURAMOTO SERVICOS',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    141.49::numeric,
    'Material de escritório',
    'BLING-PAG:22103822044 KURAMOTO SERVICOS',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    141.49::numeric,
    'Material de escritório',
    'BLING-PAG:22103822048 KURAMOTO SERVICOS',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    141.49::numeric,
    'Material de escritório',
    'BLING-PAG:22103822050 KURAMOTO SERVICOS',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    141.49::numeric,
    'Equipamento para escritório',
    'BLING-PAG:22103822054 KURAMOTO SERVICOS',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Outros',
    'BLING-PAG:22103854065 Wellyntton Lucas Melcher',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Material de escritório',
    'BLING-PAG:22103854071 Wellyntton Lucas Melcher',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    200.00::numeric,
    'Material de escritório',
    'BLING-PAG:22103854075 Wellyntton Lucas Melcher',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    19.17::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22103865478 Casa dos Parafusos',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    78.88::numeric,
    'Software',
    'BLING-PAG:22104213212 TRELLO',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    106.88::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138477483 Mercado Livre # 2000010460522880',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    79.24::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138601415 Mercado Livre # 2000007009507193',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    81.21::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138635325 Mercado Livre # 2000010387729814',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    170.82::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138647514 Mercado Livre # 2000006960409587',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138653462 Mercado Livre # 2000006960409587',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138653466 Mercado Livre # 2000006960409587',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138653470 Mercado Livre # 2000006960409587',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138653472 Mercado Livre # 2000006960409587',
    '2025-04-22'::date,
    '2025-04-22'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138653477 Mercado Livre # 2000006960409587',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138653480 Mercado Livre # 2000006960409587',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138653483 Mercado Livre # 2000006960409587',
    '2025-07-21'::date,
    '2025-07-21'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138653486 Mercado Livre # 2000006960409587',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    80.77::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691520 TRELLO',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    78.71::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691523 TRELLO TRELLO',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691530 TRELLO TRELLO',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    74.31::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691532 TRELLO TRELLO',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    73.40::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691536 TRELLO TRELLO',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    73.11::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691538 TRELLO TRELLO',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    70.82::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691542 TRELLO TRELLO',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    71.68::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691549 TRELLO TRELLO',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691557 TRELLO TRELLO',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691565 TRELLO TRELLO',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691568 TRELLO TRELLO',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22138691570 TRELLO TRELLO',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    549.86::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138710919 Mercado Livre # 2000006907698969',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    16.78::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138724749 Mercado Livre # 2000006907698969',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    16.78::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138724752 Mercado Livre # 2000006907698969',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    16.78::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138724757 Mercado Livre # 2000006907698969',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    16.78::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138724762 Mercado Livre # 2000006907698969',
    '2025-04-22'::date,
    '2025-04-22'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    16.78::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22138724767 Mercado Livre # 2000006907698969',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    129.02::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:22138741740 OPENAI CHATGPT',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265907 Mercado Livre # 2000006508498781',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265913 Mercado Livre # 2000006508498781',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265919 Mercado Livre # 2000006508498781',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265926 Mercado Livre # 2000006508498781',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265935 Mercado Livre # 2000006508498781',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265942 Mercado Livre # 2000006508498781',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265946 Mercado Livre # 2000006508498781',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265955 Mercado Livre # 2000006508498781',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265962 Mercado Livre # 2000006508498781',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265970 Mercado Livre # 2000006508498781',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265974 Mercado Livre # 2000006508498781',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265976 Mercado Livre # 2000006508498781',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265978 Mercado Livre # 2000006508498781',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265984 Mercado Livre # 2000006508498781',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265987 Mercado Livre # 2000006508498781',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265989 Mercado Livre # 2000006508498781',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265993 Mercado Livre # 2000006508498781',
    '2026-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    87.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139265995 Mercado Livre # 2000006508498781',
    '2026-04-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277824 Mercado Livre # 2000006508498781',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277826 Mercado Livre # 2000006508498781',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277830 Mercado Livre # 2000006508498781',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277833 Mercado Livre # 2000006508498781',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277837 Mercado Livre # 2000006508498781',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277844 Mercado Livre # 2000006508498781',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277850 Mercado Livre # 2000006508498781',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277853 Mercado Livre # 2000006508498781',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277855 Mercado Livre # 2000006508498781',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277858 Mercado Livre # 2000006508498781',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277860 Mercado Livre # 2000006508498781',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.53::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139277864 Mercado Livre # 2000006508498781',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347301 Mercado Livre 2000006735481345',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347303 Mercado Livre 2000006735481345',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347305 Mercado Livre 2000006735481345',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347307 Mercado Livre 2000006735481345',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347309 Mercado Livre 2000006735481345',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347313 Mercado Livre 2000006735481345',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347315 Mercado Livre 2000006735481345',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347318 Mercado Livre 2000006735481345',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347320 Mercado Livre 2000006735481345',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347322 Mercado Livre 2000006735481345',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347326 Mercado Livre 2000006735481345',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139347330 Mercado Livre 2000006735481345',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445925 Mercado Livre # 2000006682378357',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445928 Mercado Livre # 2000006682378357',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445933 Mercado Livre # 2000006682378357',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445936 Mercado Livre # 2000006682378357',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445939 Mercado Livre # 2000006682378357',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A PAGAR — batch 4/7 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445943 Mercado Livre # 2000006682378357',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445945 Mercado Livre # 2000006682378357',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445949 Mercado Livre # 2000006682378357',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445951 Mercado Livre # 2000006682378357',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445955 Mercado Livre # 2000006682378357',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445959 Mercado Livre # 2000006682378357',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139445964 Mercado Livre # 2000006682378357',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522292 Mercado Livre # 2000006636072231',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522296 Mercado Livre # 2000006636072231',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522299 Mercado Livre # 2000006636072231',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522302 Mercado Livre # 2000006636072231',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522306 Mercado Livre # 2000006636072231',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522308 Mercado Livre # 2000006636072231',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522311 Mercado Livre # 2000006636072231',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522313 Mercado Livre # 2000006636072231',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522318 Mercado Livre # 2000006636072231',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522320 Mercado Livre # 2000006636072231',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522325 Mercado Livre # 2000006636072231',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139522329 Mercado Livre # 2000006636072231',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826924 Mercado Livre 2000006596600307',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826926 Mercado Livre 2000006596600307',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826931 Mercado Livre 2000006596600307',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826935 Mercado Livre 2000006596600307',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826938 Mercado Livre 2000006596600307',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826942 Mercado Livre 2000006596600307',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826945 Mercado Livre 2000006596600307',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826949 Mercado Livre 2000006596600307',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826957 Mercado Livre 2000006596600307',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826960 Mercado Livre 2000006596600307',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826964 Mercado Livre 2000006596600307',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826967 Mercado Livre 2000006596600307',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826971 Mercado Livre 2000006596600307',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826974 Mercado Livre 2000006596600307',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.59::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139826977 Mercado Livre 2000006596600307',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888816 Mercado Livre 2000006300563169',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888822 Mercado Livre 2000006300563169',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888824 Mercado Livre 2000006300563169',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888828 Mercado Livre 2000006300563169',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888831 Mercado Livre 2000006300563169',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888836 Mercado Livre 2000006300563169',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888842 Mercado Livre 2000006300563169',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888844 Mercado Livre 2000006300563169',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888848 Mercado Livre 2000006300563169',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888850 Mercado Livre 2000006300563169',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888852 Mercado Livre 2000006300563169',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888856 Mercado Livre 2000006300563169',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888859 Mercado Livre 2000006300563169',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    32.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139888863 Mercado Livre 2000006300563169',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969874 Mercado Livre 2000006264269043',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969878 Mercado Livre 2000006264269043',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969881 Mercado Livre 2000006264269043',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969883 Mercado Livre 2000006264269043',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969886 Mercado Livre 2000006264269043',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969888 Mercado Livre 2000006264269043',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969892 Mercado Livre 2000006264269043',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969896 Mercado Livre 2000006264269043',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969902 Mercado Livre 2000006264269043',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969904 Mercado Livre 2000006264269043',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139969908 Mercado Livre 2000006264269043',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990961 Mercado Livre 2000006224181133',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990967 Mercado Livre 2000006224181133',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990971 Mercado Livre 2000006224181133',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990973 Mercado Livre 2000006224181133',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990979 Mercado Livre 2000006224181133',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990982 Mercado Livre 2000006224181133',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990984 Mercado Livre 2000006224181133',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990987 Mercado Livre 2000006224181133',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.32::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22139990989 Mercado Livre 2000006224181133',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008421 Mercado Livre 2000009115538098',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008429 Mercado Livre 2000009115538098',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008437 Mercado Livre 2000009115538098',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008443 Mercado Livre 2000009115538098',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008448 Mercado Livre 2000009115538098',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008454 Mercado Livre 2000009115538098',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008458 Mercado Livre 2000009115538098',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008462 Mercado Livre 2000009115538098',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008467 Mercado Livre 2000009115538098',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008472 Mercado Livre 2000009115538098',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008477 Mercado Livre 2000009115538098',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.17::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140008484 Mercado Livre 2000009115538098',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.30::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140027456 Mercado Livre 2000009104436712',
    '2024-09-20'::date,
    '2024-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.30::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140027458 Mercado Livre 2000009104436712',
    '2024-10-20'::date,
    '2024-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.30::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140027461 Mercado Livre 2000009104436712',
    '2024-11-20'::date,
    '2024-11-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.30::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140027463 Mercado Livre 2000009104436712',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.30::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140027468 Mercado Livre 2000009104436712',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.30::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140027474 Mercado Livre 2000009104436712',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    48.63::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22140141995 Limpeel',
    '2024-12-20'::date,
    '2024-12-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    48.63::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22140141998 Limpeel',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    48.63::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22140142001 Limpeel',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    200.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22140200238 AUTO POSTO SENNA',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.71::numeric,
    'Juros pagos',
    'BLING-PAG:22140211974 Mercado Livre',
    '2025-01-20'::date,
    '2025-01-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    220.00::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:22140404885 Atualiza Midia Naviraí',
    '2025-01-02'::date,
    '2025-01-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    220.00::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:22140404891 Atualiza Midia Naviraí',
    '2025-02-02'::date,
    '2025-02-02'::date,
    'cartão_master_card_inter'
  ),
  (
    'despesa',
    169.54::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140451240 Mercado Livre 2000006742086323',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    34.50::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22140458032 Casa dos Parafusos',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    33.20::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140470608 Mercado Livre 2000010130332166',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    33.20::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140470613 Mercado Livre 2000010130332166',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    33.20::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140470620 Mercado Livre 2000010130332166',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    33.20::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140470626 Mercado Livre 2000010130332166',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    118.99::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140483184 Mercado Livre # 2000010121937670',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    27.99::numeric,
    'Fretes e seguros',
    'BLING-PAG:22140501679 Mercado Livre MELIMAIS',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    50.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22140506823 AUTO POSTO SENNA',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    10.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22140549439 MAQSOLDAS ROLAMENTOS',
    '2025-01-03'::date,
    '2025-01-03'::date,
    'pix'
  ),
  (
    'despesa',
    54.24::numeric,
    'Fretes e seguros',
    'BLING-PAG:22140568766 CRUZEIRO DO SUL',
    '2025-01-09'::date,
    '2025-01-09'::date,
    'pix'
  ),
  (
    'despesa',
    85.00::numeric,
    'Outros',
    'BLING-PAG:22140580627 VALTER JUVENAL DE OLIVEIRA ROLAMENTOS LAVA E SECA',
    '2025-01-09'::date,
    '2025-01-09'::date,
    'pix'
  ),
  (
    'despesa',
    80.00::numeric,
    'Diaria',
    'BLING-PAG:22140590215 GUILHERME DE OLIVEIRA DIARIA',
    '2025-01-09'::date,
    '2025-01-09'::date,
    'pix'
  ),
  (
    'despesa',
    126.57::numeric,
    'Juros pagos',
    'BLING-PAG:22140606183 Bradesco Cheque especial Bradesco Empresas',
    '2025-01-10'::date,
    '2025-01-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    20.00::numeric,
    'Telefone',
    'BLING-PAG:22140623161 TIM',
    '2025-01-13'::date,
    '2025-01-13'::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:22162553876 Ministerio da Economia Pagamento do DAS - Dez 2025',
    '2026-01-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:22162553879 Mercado Livre MeliMais',
    '2026-01-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:22162553881 Bradesco Tarifa Bradesco empresas',
    '2026-01-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:22162553883 Ministerio da Economia Esocial - INSS FGTS',
    '2026-01-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:22162553885 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-01-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:22162553888 FleetNet Internet',
    '2026-01-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:22162553890 DANILO CONTABILIDADE Contabilidade',
    '2026-01-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:22162553892 sanesul Agua',
    '2026-01-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:22162553894 Energisa Energia',
    '2026-01-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22162553896 TRELLO TRELLO',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22261566851 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-02-07'::date,
    '2025-02-07'::date,
    'dinheiro'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:22359619404 Ministerio da Economia Pagamento do DAS - Jan 2026',
    '2026-02-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:22359619407 Mercado Livre MeliMais',
    '2026-02-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:22359619409 Bradesco Tarifa Bradesco empresas',
    '2026-02-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:22359619411 Ministerio da Economia Esocial - INSS FGTS',
    '2026-02-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:22359619413 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-02-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:22359619415 FleetNet Internet',
    '2026-02-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:22359619417 DANILO CONTABILIDADE Contabilidade',
    '2026-02-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:22359619419 sanesul Agua',
    '2026-02-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:22359619423 Energisa Energia',
    '2026-02-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22359619425 TRELLO TRELLO',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22373259680 AUTO POSTO SENNA Combustivel',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    22.62::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22373264294 Casa dos Parafusos',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    35.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373588331 Mercado Livre # 2000007038270341',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    35.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373588334 Mercado Livre # 2000007038270341',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22373598855 AUTO POSTO SENNA Combustivel',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    8.07::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22373601418 Casa dos Parafusos',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    113.11::numeric,
    'Material de escritório',
    'BLING-PAG:22373618319 Matucho',
    '2025-02-10'::date,
    '2025-02-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    113.11::numeric,
    'Material de escritório',
    'BLING-PAG:22373618321 Matucho',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    113.11::numeric,
    'Material de escritório',
    'BLING-PAG:22373618325 Matucho',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    17.90::numeric,
    'Taxas pagas',
    'BLING-PAG:22373654517 Mercado Livre Uso de crédito mercado pago',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    112.46::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373658086 Mercado Livre # 2000010688798460',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22373660192 AUTO POSTO SENNA Combustivel',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    174.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373664082 Mercado Livre # 2000010610066908',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.34::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373670558 Mercado Livre # 2000007075534547',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.34::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373670560 Mercado Livre # 2000007075534547',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.34::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373670562 Mercado Livre # 2000007075534547',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.34::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373670564 Mercado Livre # 2000007075534547',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.34::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373670566 Mercado Livre # 2000007075534547',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.34::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373670568 Mercado Livre # 2000007075534547',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.34::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373670570 Mercado Livre # 2000007075534547',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.34::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373670572 Mercado Livre # 2000007075534547',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    22.45::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373678778 Mercado Livre # 2000007096156529',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    22.45::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373678782 Mercado Livre # 2000007096156529',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    22.45::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373678788 Mercado Livre # 2000007096156529',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    22.45::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373678794 Mercado Livre # 2000007096156529',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    359.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373683566 Mercado Livre # 2000007075534547',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.35::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373708408 Mercado Livre # 2000007057283855',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    322.05::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373714488 Mercado Livre # 2000007057283855',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    313.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373722564 Mercado Livre # 2000010482229616',
    '2025-02-20'::date,
    '2025-02-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    250.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22373989256 DuFrio',
    '2025-02-27'::date,
    '2025-02-27'::date,
    'pix'
  ),
  (
    'despesa',
    110.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22612107091 Marcio Aparecido de Araujo Compra de Lavadora',
    '2025-03-05'::date,
    '2025-03-05'::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:22626150813 Ministerio da Economia Pagamento do DAS - Fev 2026',
    '2026-03-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:22626150815 Mercado Livre MeliMais',
    '2026-03-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:22626150817 Bradesco Tarifa Bradesco empresas',
    '2026-03-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:22626150819 Ministerio da Economia Esocial - INSS FGTS',
    '2026-03-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:22626150822 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-03-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:22626150824 FleetNet Internet',
    '2026-03-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:22626150826 DANILO CONTABILIDADE Contabilidade',
    '2026-03-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:22626150829 sanesul Agua',
    '2026-03-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:22626150831 Energisa Energia',
    '2026-03-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22626150833 TRELLO TRELLO',
    '2026-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22667003970 AUTO POSTO SENNA',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22667005925 AUTO POSTO SENNA',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    255.67::numeric,
    'Juros pagos',
    'BLING-PAG:22667093715 Bradesco Juros de credito conta bradesco PF',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    18.72::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667110458 Mercado Livre # 2000010726842882',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.72::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667110461 Mercado Livre # 2000010726842882',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.72::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667110465 Mercado Livre # 2000010726842882',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.72::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667110467 Mercado Livre # 2000010726842882',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.72::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667110469 Mercado Livre # 2000010726842882',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.72::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667110471 Mercado Livre # 2000010726842882',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.72::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667110473 Mercado Livre # 2000010726842882',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.72::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667110475 Mercado Livre # 2000010726842882',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    208.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667115742 Mercado Livre # 2000010806213550',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120631 Mercado Livre # 2000010857963096',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120633 Mercado Livre # 2000010857963096',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120635 Mercado Livre # 2000010857963096',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120639 Mercado Livre # 2000010857963096',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120642 Mercado Livre # 2000010857963096',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120645 Mercado Livre # 2000010857963096',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120647 Mercado Livre # 2000010857963096',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120649 Mercado Livre # 2000010857963096',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120652 Mercado Livre # 2000010857963096',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120654 Mercado Livre # 2000010857963096',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    27.18::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667120656 Mercado Livre # 2000010857963096',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126596 Mercado Livre # 2000010883340024',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126600 Mercado Livre # 2000010883340024',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126604 Mercado Livre # 2000010883340024',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126607 Mercado Livre # 2000010883340024',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126611 Mercado Livre # 2000010883340024',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126613 Mercado Livre # 2000010883340024',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126615 Mercado Livre # 2000010883340024',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A PAGAR — batch 5/7 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126617 Mercado Livre # 2000010883340024',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126619 Mercado Livre # 2000010883340024',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    18.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667126621 Mercado Livre # 2000010883340024',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    111.51::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667132279 Mercado Livre # 2000010952490898',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135814 Mercado Livre # 2000010999617674',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135816 Mercado Livre # 2000010999617674',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135819 Mercado Livre # 2000010999617674',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135823 Mercado Livre # 2000010999617674',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135825 Mercado Livre # 2000010999617674',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135830 Mercado Livre # 2000010999617674',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135832 Mercado Livre # 2000010999617674',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135837 Mercado Livre # 2000010999617674',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135840 Mercado Livre # 2000010999617674',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135842 Mercado Livre # 2000010999617674',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    21.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22667135844 Mercado Livre # 2000010999617674',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    441.47::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:22667153710 FACEBOOK ADS PROPAGANDA DE LIMPEZA',
    '2025-03-20'::date,
    '2025-03-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22667336056 AUTO POSTO SENNA',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    80.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22667339165 AUTO POSTO SENNA',
    '2025-03-10'::date,
    '2025-03-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:22816884657 Ministerio da Economia Pagamento do DAS - Mar 2026',
    '2026-04-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:22816884659 Mercado Livre MeliMais',
    '2026-04-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:22816884661 Bradesco Tarifa Bradesco empresas',
    '2026-04-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:22816884663 Ministerio da Economia Esocial - INSS FGTS',
    '2026-04-20'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:22816884665 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-04-06'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:22816884667 FleetNet Internet',
    '2026-04-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:22816884669 DANILO CONTABILIDADE Contabilidade',
    '2026-04-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:22816884671 sanesul Agua',
    '2026-04-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:22816884674 Energisa Energia',
    '2026-04-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:22816884676 TRELLO TRELLO',
    '2026-04-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    14.90::numeric,
    'Taxas pagas',
    'BLING-PAG:22860451604 Mercado Livre limite de credito',
    '2025-04-16'::date,
    '2025-04-16'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    247.36::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:22860463923 FACEBOOK ADS PROPAGANDA DE LIMPEZA',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    164.03::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860476748 Mercado Livre # 2000011047831184',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    270.60::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860483626 Mercado Livre # 2000011057867358',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.41::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860489402 Mercado Livre # 2000011060945666',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.41::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860489404 Mercado Livre # 2000011060945666',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.41::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860489406 Mercado Livre # 2000011060945666',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.41::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860489408 Mercado Livre # 2000011060945666',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.41::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860489410 Mercado Livre # 2000011060945666',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.41::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860489412 Mercado Livre # 2000011060945666',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.41::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860489414 Mercado Livre # 2000011060945666',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.41::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860489418 Mercado Livre # 2000011060945666',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    58.81::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22860493635 Casa dos Parafusos',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22860498386 Limpeel 24,90',
    '2025-04-20'::date,
    '2025-04-20'::date,
    NULL
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22860501588 AUTO POSTO SENNA combustivel',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    327.35::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860504438 DuFrio',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    327.35::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860504440 DuFrio',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    327.35::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860504442 DuFrio',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22860506792 AUTO POSTO SENNA combustivel',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    317.39::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860518008 Mercado Livre # 2000007529027271',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530241 Mercado Livre # 2000007529027271',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530244 Mercado Livre # 2000007529027271',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530247 Mercado Livre # 2000007529027271',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530249 Mercado Livre # 2000007529027271',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530251 Mercado Livre # 2000007529027271',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530256 Mercado Livre # 2000007529027271',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530258 Mercado Livre # 2000007529027271',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530263 Mercado Livre # 2000007529027271',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530265 Mercado Livre # 2000007529027271',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860530267 Mercado Livre # 2000007529027271',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    29.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860538848 Mercado Livre # 2000011092888452',
    '2025-04-20'::date,
    '2025-04-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    29.94::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860538850 Mercado Livre # 2000011092888452',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    29.94::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860538852 Mercado Livre # 2000011092888452',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    29.94::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860538855 Mercado Livre # 2000011092888452',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    29.94::numeric,
    'Compras de fornecedores',
    'BLING-PAG:22860538858 Mercado Livre # 2000011092888452',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22860633503 AUTO POSTO SENNA combustivel',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22860635003 AUTO POSTO SENNA combustivel',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22860637398 AUTO POSTO SENNA combustivel',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22860639543 AUTO POSTO SENNA combustivel',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:22860641214 AUTO POSTO SENNA combustivel',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    79.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22860644038 Limpeel',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    21.50::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:22860661986 Casa dos Parafusos',
    '2025-04-10'::date,
    '2025-04-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:23028292942 Mercado Livre MeliMais',
    '2026-05-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:23028292947 Ministerio da Economia Esocial - INSS FGTS',
    '2026-05-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:23028292951 TRELLO TRELLO',
    '2026-05-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:23028292957 Bradesco Tarifa Bradesco empresas',
    '2026-05-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:23028292962 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-05-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:23028292967 sanesul Agua',
    '2026-05-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:23028292970 DANILO CONTABILIDADE Contabilidade',
    '2026-05-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:23028292974 FleetNet Internet',
    '2026-05-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:23028292981 Ministerio da Economia Pagamento do DAS - Abr 2026',
    '2026-05-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:23028292985 Energisa Energia',
    '2026-05-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    79.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23130421918 Limpeel',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    26.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23130426648 MAQSOLDAS',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    20.00::numeric,
    'Telefone',
    'BLING-PAG:23130431525 TIM',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    397.77::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:23130444185 MAQSOLDAS Facebook ADS',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    174.99::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130468869 Mercado Livre # 2000011399487648',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    88.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23130471518 Limpeel',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    22.25::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23130475560 Casa dos Parafusos',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    210.88::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130480651 Mercado Livre # 2000007810797083',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    113.79::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130486017 Mercado Livre # 2000011559936176',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130491591 Mercado Livre # 2000011600942878',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130491597 Mercado Livre # 2000011600942878',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130491599 Mercado Livre # 2000011600942878',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130491601 Mercado Livre # 2000011600942878',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130491605 Mercado Livre # 2000011600942878',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130491608 Mercado Livre # 2000011600942878',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130491610 Mercado Livre # 2000011600942878',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.25::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130491612 Mercado Livre # 2000011600942878',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    167.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130506216 Mercado Livre # 2000011365807750',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    44.40::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23130509449 Casa dos Parafusos # 2000011365807750',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    382.57::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23130513372 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    297.56::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130520300 Casa dos Parafusos # 2000011319414716',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.44::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130523784 Casa dos Parafusos # 2000007605937047',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.44::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130523793 Casa dos Parafusos # 2000007605937047',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.44::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130523795 Casa dos Parafusos # 2000007605937047',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.44::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130523798 Casa dos Parafusos # 2000007605937047',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    33.44::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130523801 Casa dos Parafusos # 2000007605937047',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    457.60::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130529556 Mercado Livre # 2000007605937047',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    150.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23130544324 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23130554656 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-05-10'::date,
    '2025-05-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    753.89::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130694629 DuFrio',
    '2025-05-14'::date,
    '2025-05-14'::date,
    'pix'
  ),
  (
    'despesa',
    552.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130698378 DuFrio',
    '2025-05-16'::date,
    '2025-05-16'::date,
    'pix'
  ),
  (
    'despesa',
    292.19::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130702769 DuFrio',
    '2025-05-22'::date,
    '2025-05-22'::date,
    'pix'
  ),
  (
    'despesa',
    250.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130718823 Gisele Compra de Lavadora',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'pix'
  ),
  (
    'despesa',
    80.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23130724154 Keli Patricia N Bogaz Compra de Lavadora',
    '2025-05-20'::date,
    '2025-05-20'::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:23299668096 TRELLO TRELLO',
    '2026-06-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:23299668101 Ministerio da Economia Pagamento do DAS - Mai 2026',
    '2026-06-22'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:23299668108 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-06-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:23299668111 Bradesco Tarifa Bradesco empresas',
    '2026-06-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:23299668114 Mercado Livre MeliMais',
    '2026-06-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:23299668119 Ministerio da Economia Esocial - INSS FGTS',
    '2026-06-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:23299668121 DANILO CONTABILIDADE Contabilidade',
    '2026-06-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:23299668124 Energisa Energia',
    '2026-06-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:23299668129 FleetNet Internet',
    '2026-06-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:23299668134 sanesul Agua',
    '2026-06-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    470.93::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342775060 DuFrio',
    '2025-06-03'::date,
    '2025-06-03'::date,
    'pix'
  ),
  (
    'despesa',
    62.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342781143 Eletro Garrincha Fornecedor',
    '2025-06-05'::date,
    '2025-06-05'::date,
    'pix'
  ),
  (
    'despesa',
    20.00::numeric,
    'Telefone',
    'BLING-PAG:23342785661 TIM',
    '2025-06-09'::date,
    '2025-06-09'::date,
    'pix'
  ),
  (
    'despesa',
    442.31::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342795617 DuFrio',
    '2025-06-11'::date,
    '2025-06-11'::date,
    'pix'
  ),
  (
    'despesa',
    157.00::numeric,
    'Devoluções de vendas',
    'BLING-PAG:23342812305 Marilda Acosta de Lima DEVOLUÇÃO',
    '2025-06-27'::date,
    '2025-06-27'::date,
    'pix'
  ),
  (
    'despesa',
    319.52::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:23342827065 FACEBOOK ADS',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850632 Mercado Livre # 2000011667483152',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850636 Mercado Livre # 2000011667483152',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850638 Mercado Livre # 2000011667483152',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850642 Mercado Livre # 2000011667483152',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850644 Mercado Livre # 2000011667483152',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850646 Mercado Livre # 2000011667483152',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850649 Mercado Livre # 2000011667483152',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850651 Mercado Livre # 2000011667483152',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850653 Mercado Livre # 2000011667483152',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850656 Mercado Livre # 2000011667483152',
    '2026-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850658 Mercado Livre # 2000011667483152',
    '2026-04-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.48::numeric,
    'Despesas Operacionais',
    'BLING-PAG:23342850660 Mercado Livre # 2000011667483152',
    '2026-05-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    447.91::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342859044 Mercado Livre # 2000007955011159',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    452.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342865939 Mercado Livre',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    139.56::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342870850 Mercado Livre # 2000011739666264',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.88::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342876448 Mercado Livre # 2000007998359097',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.88::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342876451 Mercado Livre # 2000007998359097',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.88::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342876453 Mercado Livre # 2000007998359097',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.88::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342876455 Mercado Livre # 2000007998359097',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    15.88::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342876457 Mercado Livre # 2000007998359097',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342883153 Mercado Livre # 2000011779590830',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342883155 Mercado Livre # 2000011779590830',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342883158 Mercado Livre # 2000011779590830',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.38::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342883160 Mercado Livre # 2000011779590830',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    157.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342886168 Mercado Livre # 2000011837723828',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    14.90::numeric,
    'Taxas pagas',
    'BLING-PAG:23342891412 Mercado Livre Uso de Crédito Mercado Pago',
    '2025-06-20'::date,
    '2025-06-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23342907211 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    386.33::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23342919597 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    84.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342923029 Limpeel',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    48.64::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342927973 Limpeel',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    48.64::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342927983 Limpeel',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    48.64::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342927987 Limpeel',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    83.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342930406 Casa dos Parafusos',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    49.98::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342934695 Limpeel',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    49.98::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342934697 Limpeel',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    49.98::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342934700 Limpeel',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    24.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342937435 Casa dos Parafusos',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    14.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342944587 MAQSOLDAS',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    100.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23342947638 Eletro Garrincha Fornecedor',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    30.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342950908 MAQSOLDAS',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    34.64::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23342952923 Casa dos Parafusos',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    50.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23342964625 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    50.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23342968832 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-06-10'::date,
    '2025-06-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:23512100874 Energisa Energia',
    '2026-07-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:23512100878 Mercado Livre MeliMais',
    '2026-07-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:23512100882 DANILO CONTABILIDADE Contabilidade',
    '2026-07-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:23512100886 Bradesco Tarifa Bradesco empresas',
    '2026-07-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:23512100890 FleetNet Internet',
    '2026-07-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:23512100895 TRELLO TRELLO',
    '2026-07-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:23512100898 sanesul Agua',
    '2026-07-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:23512100900 Ministerio da Economia Pagamento do DAS - Jun 2026',
    '2026-07-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:23512100903 Ministerio da Economia Esocial - INSS FGTS',
    '2026-07-20'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:23512100908 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-07-06'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762653 Bling ERP',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762656 Bling ERP',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762659 Bling ERP',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762665 Bling ERP',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762669 Bling ERP',
    '2025-11-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762671 Bling ERP',
    '2025-12-10'::date,
    '2025-12-10'::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762675 Bling ERP',
    '2026-01-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762679 Bling ERP',
    '2026-02-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762683 Bling ERP',
    '2026-03-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762687 Bling ERP',
    '2026-04-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762690 Bling ERP',
    '2026-05-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762692 Bling ERP',
    '2026-06-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23554762696 Bling ERP',
    '2026-07-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    373.28::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:23554854659 FACEBOOK ADS PROPAGANDA',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    100.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23554859449 AUTO POSTO SENNA COMBUSTIVEL',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    3.80::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23554876504 Casa dos Parafusos',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    49.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23554880346 Limpeel',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A PAGAR — batch 6/7 (200 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'despesa',
    300.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23554944676 AUTO POSTO SENNA combustivel',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    49.90::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23554949462 Limpeel',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    10.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23554952831 Eletro Garrincha Fornecedor',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    20.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23554957276 MAQSOLDAS',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    166.54::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23554968498 Casa dos Parafusos',
    '2025-07-10'::date,
    '2025-07-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    14.90::numeric,
    'Taxas pagas',
    'BLING-PAG:23554986444 Mercado Livre Uso do credito',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    92.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555004259 Mercado Livre # 2000011974555402',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555011687 Mercado Livre # 2000008231239211',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555011689 Mercado Livre # 2000008231239211',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555011692 Mercado Livre # 2000008231239211',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555011696 Mercado Livre # 2000008231239211',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555011698 Mercado Livre # 2000008231239211',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555011700 Mercado Livre # 2000008231239211',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    25.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555011703 Mercado Livre # 2000008231239211',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    133.35::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555016232 Mercado Livre # 2000012049983080',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.00::numeric,
    'Internet',
    'BLING-PAG:23555020435 TIM Internet Celular',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    63.77::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555025882 Mercado Livre # 2000012095924588',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    137.90::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555030665 Mercado Livre # 2000008375750651',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033906 Mercado Livre # 2000008375750651',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033909 Mercado Livre # 2000008375750651',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033911 Mercado Livre # 2000008375750651',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033915 Mercado Livre # 2000008375750651',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033917 Mercado Livre # 2000008375750651',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033920 Mercado Livre # 2000008375750651',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033924 Mercado Livre # 2000008375750651',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033928 Mercado Livre # 2000008375750651',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033933 Mercado Livre # 2000008375750651',
    '2026-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033936 Mercado Livre # 2000008375750651',
    '2026-04-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    23.62::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555033938 Mercado Livre # 2000008375750651',
    '2026-05-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    119.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555039355 Mercado Livre # 2000008386176157',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    175.98::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555044409 Mercado Livre # 2000012189377004',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    91.89::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23555049293 Mercado Livre # 2000012241074260',
    '2025-07-20'::date,
    '2025-07-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:23731073613 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-08-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:23731073619 DANILO CONTABILIDADE Contabilidade',
    '2026-08-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:23731073627 Bling ERP',
    '2026-08-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:23731073633 Ministerio da Economia Pagamento do DAS - Jul 2026',
    '2026-08-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:23731073639 FleetNet Internet',
    '2026-08-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:23731073647 Mercado Livre MeliMais',
    '2026-08-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:23731073650 Energisa Energia',
    '2026-08-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:23731073652 Bradesco Tarifa Bradesco empresas',
    '2026-08-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:23731073656 Ministerio da Economia Esocial - INSS FGTS',
    '2026-08-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:23731073658 sanesul Agua',
    '2026-08-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:23731073662 TRELLO TRELLO',
    '2026-08-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    74.25::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23785624142 Casa dos Parafusos',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    300.00::numeric,
    'Combustíveis e lubrificantes',
    'BLING-PAG:23785634811 AUTO POSTO SENNA combustivel',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    55.80::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23785644302 Casa dos Parafusos',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    14.90::numeric,
    'Juros pagos',
    'BLING-PAG:23785774377 Mercado Livre Uso de crédito',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    30.00::numeric,
    'Telefone',
    'BLING-PAG:23785785385 TIM',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    121.85::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785804104 Mercado Livre # 2000008787863787',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    177.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785817459 Mercado Livre # 2000012594648006',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785830913 Mercado Livre # 2000012596508662',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785830937 Mercado Livre # 2000012596508662',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785830949 Mercado Livre # 2000012596508662',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785830970 Mercado Livre # 2000012596508662',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785830988 Mercado Livre # 2000012596508662',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785831007 Mercado Livre # 2000012596508662',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785831022 Mercado Livre # 2000012596508662',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785831045 Mercado Livre # 2000012596508662',
    '2026-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    12.97::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23785831059 Mercado Livre # 2000012596508662',
    '2026-04-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    53.09::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787000490 Mercado Livre # 2000012534983018',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    53.94::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787010048 Mercado Livre # 2000012533887922',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    19.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787026437 Mercado Livre # 2000012534983018',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    19.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787026447 Mercado Livre # 2000012534983018',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    19.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787026457 Mercado Livre # 2000012534983018',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    19.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787026467 Mercado Livre # 2000012534983018',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    19.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787026474 Mercado Livre # 2000012534983018',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    19.49::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787026478 Mercado Livre # 2000012534983018',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    131.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787037358 Mercado Livre # 2000012413864738',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    148.70::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787045655 Mercado Livre # 2000012337170748',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    20.00::numeric,
    'Telefone',
    'BLING-PAG:23787057034 TIM',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    264.13::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787072401 Mercado Livre # 2000012303611538',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    286.45::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:23787126049 FACEBOOK ADS',
    '2025-08-10'::date,
    '2025-08-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    135.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23787373903 Limpeel',
    '2025-08-15'::date,
    '2025-08-15'::date,
    'pix'
  ),
  (
    'despesa',
    242.88::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787379070 DuFrio',
    '2025-08-15'::date,
    '2025-08-15'::date,
    'pix'
  ),
  (
    'despesa',
    150.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787387124 Daiane Dalcico compra de lavadora',
    '2025-08-20'::date,
    '2025-08-20'::date,
    'pix'
  ),
  (
    'despesa',
    500.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787495583 DuFrio',
    '2025-08-22'::date,
    '2025-08-22'::date,
    'pix'
  ),
  (
    'despesa',
    90.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:23787499906 Limpeel',
    '2025-08-25'::date,
    '2025-08-25'::date,
    'pix'
  ),
  (
    'despesa',
    18.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:23787505289 Cris SABÃO',
    '2025-08-26'::date,
    '2025-08-26'::date,
    'pix'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:24009480178 Ministerio da Economia Esocial - INSS FGTS',
    '2026-09-21'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:24009480185 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-09-08'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:24009480190 DANILO CONTABILIDADE Contabilidade',
    '2026-09-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:24009480198 sanesul Agua',
    '2026-09-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:24009480204 Bradesco Tarifa Bradesco empresas',
    '2026-09-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:24009480210 Mercado Livre MeliMais',
    '2026-09-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:24009480231 FleetNet Internet',
    '2026-09-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:24009480260 Energisa Energia',
    '2026-09-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:24009480269 Ministerio da Economia Pagamento do DAS - Ago 2026',
    '2026-09-21'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:24009480276 Bling ERP',
    '2026-09-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:24009480285 TRELLO TRELLO',
    '2026-09-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    88.32::numeric,
    'Juros pagos',
    'BLING-PAG:24057987692 Bradesco MULTA POR ATRASO',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    53.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24057993667 Casa dos Parafusos',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    53.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24057993674 Casa dos Parafusos',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    53.00::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24057993679 Casa dos Parafusos',
    '2025-11-10'::date,
    NULL::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    325.85::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:24058119976 FACEBOOK ADS PROPAGANDA',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    114.20::numeric,
    'Material de escritório',
    'BLING-PAG:24058140693 Mercado Livre ROUPAS',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.23::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058146368 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.23::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058146378 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.23::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058146390 Mercado Livre',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.23::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058146400 Mercado Livre',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.23::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058146406 Mercado Livre',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.23::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058146410 Mercado Livre',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.23::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058146416 Mercado Livre',
    '2026-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    26.23::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058146424 Mercado Livre',
    '2026-04-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    52.89::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058152653 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    284.70::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058156066 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    48.54::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058161912 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    40.50::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058164296 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169362 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169367 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169375 Mercado Livre',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169380 Mercado Livre',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169387 Mercado Livre',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169395 Mercado Livre',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169401 Mercado Livre',
    '2026-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169405 Mercado Livre',
    '2026-04-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169410 Mercado Livre',
    '2026-05-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169414 Mercado Livre',
    '2026-06-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169421 Mercado Livre',
    '2026-07-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    13.63::numeric,
    'Equipamento para escritório',
    'BLING-PAG:24058169430 Mercado Livre',
    '2026-08-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    33.95::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058173329 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    7.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058175333 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    7.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058175338 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    7.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058175341 Mercado Livre',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    7.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058175343 Mercado Livre',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    7.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058175348 Mercado Livre',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    7.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058175351 Mercado Livre',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    7.12::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058175353 Mercado Livre',
    '2026-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    37.90::numeric,
    'Limpeza e manutenção',
    'BLING-PAG:24058180733 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    163.99::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058184080 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    257.10::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058186526 Mercado Livre',
    '2025-09-20'::date,
    '2025-09-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    191.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058198930 Matucho',
    '2025-09-01'::date,
    '2025-09-01'::date,
    'pix'
  ),
  (
    'despesa',
    155.00::numeric,
    'Devoluções de vendas',
    'BLING-PAG:24058205430 Marilda Acosta de Lima DEVOLUÇÃO',
    '2025-09-02'::date,
    '2025-09-02'::date,
    'pix'
  ),
  (
    'despesa',
    529.56::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058209314 DuFrio',
    '2025-09-03'::date,
    '2025-09-03'::date,
    'pix'
  ),
  (
    'despesa',
    20.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058212087 COMAGRAN',
    '2025-09-05'::date,
    '2025-09-05'::date,
    'pix'
  ),
  (
    'despesa',
    908.42::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058234338 DuFrio',
    '2025-09-10'::date,
    '2025-09-10'::date,
    'pix'
  ),
  (
    'despesa',
    728.76::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24058247418 DuFrio',
    '2025-09-18'::date,
    '2025-09-18'::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:24230930671 Ministerio da Economia Pagamento do DAS - Set 2026',
    '2026-10-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:24230930688 Energisa Energia',
    '2026-10-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:24230930699 sanesul Agua',
    '2026-10-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:24230930715 DANILO CONTABILIDADE Contabilidade',
    '2026-10-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:24230930730 FleetNet Internet',
    '2026-10-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:24230930741 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-10-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:24230930751 TRELLO TRELLO',
    '2026-10-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:24230930759 Bling ERP',
    '2026-10-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:24230930769 Mercado Livre MeliMais',
    '2026-10-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:24230930781 Bradesco Tarifa Bradesco empresas',
    '2026-10-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:24230930790 Ministerio da Economia Esocial - INSS FGTS',
    '2026-10-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    334.41::numeric,
    'Propaganda e publicidade',
    'BLING-PAG:24393074069 FACEBOOK ADS',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    107.35::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393098933 Mercado Livre',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    66.80::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393104564 Casa dos Parafusos',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    57.25::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393108981 Casa dos Parafusos',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    57.25::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393108990 Casa dos Parafusos',
    '2025-11-10'::date,
    NULL::date,
    'cartão_elo_grafite'
  ),
  (
    'despesa',
    30.00::numeric,
    'Telefone',
    'BLING-PAG:24393144304 TIM',
    '2025-10-10'::date,
    '2025-10-10'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    45.80::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393148231 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    655.88::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393163603 Mercado Livre 6 COMPRAS DE EQUIPAMENTOS PARA MAQUINA DE LAVAR ALTA PRESSAO',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393167907 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393167915 Mercado Livre',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393167921 Mercado Livre',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393167925 Mercado Livre',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    17.00::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393167937 Mercado Livre',
    '2026-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    115.14::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393169635 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    76.89::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24393172615 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    10.04::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393174629 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    10.04::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393174648 Mercado Livre',
    '2025-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    10.04::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393174672 Mercado Livre',
    '2025-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    10.04::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393174684 Mercado Livre',
    '2026-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    47.30::numeric,
    'Compra de insumos e matéria prima',
    'BLING-PAG:24393175923 Mercado Livre',
    '2025-10-20'::date,
    '2025-10-20'::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    52.04::numeric,
    'Fretes e seguros',
    'BLING-PAG:24457477564 CRUZEIRO DO SUL',
    '2025-10-29'::date,
    '2025-10-29'::date,
    'pix'
  ),
  (
    'despesa',
    154.94::numeric,
    'Compras de fornecedores',
    'BLING-PAG:24457482580 Matucho',
    '2025-10-28'::date,
    '2025-10-28'::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:24485273438 FleetNet Internet',
    '2026-11-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:24485273452 Ministerio da Economia Esocial - INSS FGTS',
    '2026-11-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:24485273466 Bling ERP',
    '2026-11-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:24485273478 TRELLO TRELLO',
    '2026-11-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:24485273492 Mercado Livre MeliMais',
    '2026-11-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:24485273502 Bradesco Tarifa Bradesco empresas',
    '2026-11-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:24485273519 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-11-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:24485273523 Energisa Energia',
    '2026-11-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:24485273530 Ministerio da Economia Pagamento do DAS - Out 2026',
    '2026-11-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:24485273536 DANILO CONTABILIDADE Contabilidade',
    '2026-11-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:24485273548 sanesul Agua',
    '2026-11-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:24756671161 Ministerio da Economia Esocial - INSS FGTS',
    '2026-12-21'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:24756671170 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2026-12-07'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:24756671176 TRELLO TRELLO',
    '2026-12-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:24756671186 Mercado Livre MeliMais',
    '2026-12-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:24756671196 Bradesco Tarifa Bradesco empresas',
    '2026-12-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:24756671205 FleetNet Internet',
    '2026-12-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:24756671215 Bling ERP',
    '2026-12-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:24756671221 Ministerio da Economia Pagamento do DAS - Nov 2026',
    '2026-12-21'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:24756671227 Energisa Energia',
    '2026-12-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:24756671239 sanesul Agua',
    '2026-12-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:24756671249 DANILO CONTABILIDADE Contabilidade',
    '2026-12-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:24988972270 Mercado Livre MeliMais',
    '2027-01-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:24988972275 Energisa Energia',
    '2027-01-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:24988972280 TRELLO TRELLO',
    '2027-01-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:24988972287 Ministerio da Economia Pagamento do DAS - Dez 2026',
    '2027-01-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:24988972290 sanesul Agua',
    '2027-01-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:24988972296 DANILO CONTABILIDADE Contabilidade',
    '2027-01-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:24988972299 FleetNet Internet',
    '2027-01-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:24988972301 Bling ERP',
    '2027-01-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:24988972304 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2027-01-05'::date,
    NULL::date,
    'pix'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- CONTAS A PAGAR — batch 7/7 (35 linhas)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),
  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (
    VALUES
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:24988972308 Bradesco Tarifa Bradesco empresas',
    '2027-01-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:24988972314 Ministerio da Economia Esocial - INSS FGTS',
    '2027-01-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:25210546139 FleetNet Internet',
    '2027-02-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:25210546145 sanesul Agua',
    '2027-02-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:25210546151 Energisa Energia',
    '2027-02-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:25210546153 TRELLO TRELLO',
    '2027-02-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:25210546161 Bling ERP',
    '2027-02-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:25210546167 Ministerio da Economia Pagamento do DAS - Jan 2027',
    '2027-02-22'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:25210546180 DANILO CONTABILIDADE Contabilidade',
    '2027-02-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:25210546183 Ministerio da Economia Esocial - INSS FGTS',
    '2027-02-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:25210546188 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2027-02-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:25210546194 Mercado Livre MeliMais',
    '2027-02-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:25210546199 Bradesco Tarifa Bradesco empresas',
    '2027-02-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:25498276839 TRELLO TRELLO',
    '2027-03-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:25498276844 Bradesco Tarifa Bradesco empresas',
    '2027-03-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:25498276846 Ministerio da Economia Pagamento do DAS - Fev 2027',
    '2027-03-22'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:25498276851 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2027-03-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:25498276856 Ministerio da Economia Esocial - INSS FGTS',
    '2027-03-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:25498276860 Bling ERP',
    '2027-03-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:25498276865 sanesul Agua',
    '2027-03-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:25498276869 DANILO CONTABILIDADE Contabilidade',
    '2027-03-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:25498276879 FleetNet Internet',
    '2027-03-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:25498276893 Energisa Energia',
    '2027-03-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:25498276905 Mercado Livre MeliMais',
    '2027-03-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  ),
  (
    'despesa',
    113.83::numeric,
    'Água',
    'BLING-PAG:25723769319 sanesul Agua',
    '2027-04-02'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    341.06::numeric,
    'Encargos da folha',
    'BLING-PAG:25723769327 Ministerio da Economia Esocial - INSS FGTS',
    '2027-04-19'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    76.60::numeric,
    'Impostos sobre vendas',
    'BLING-PAG:25723769331 Ministerio da Economia Pagamento do DAS - Mar 2027',
    '2027-04-20'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    51.55::numeric,
    'Tarifa bancária',
    'BLING-PAG:25723769339 Bradesco Tarifa Bradesco empresas',
    '2027-04-15'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    55.00::numeric,
    'Software',
    'BLING-PAG:25723769344 Bling ERP',
    '2027-04-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    75.21::numeric,
    'Serviços de terceiros',
    'BLING-PAG:25723769355 TRELLO TRELLO',
    '2027-04-20'::date,
    NULL::date,
    'cartão_mercado_pago_visa'
  ),
  (
    'despesa',
    173.20::numeric,
    'Energia elétrica',
    'BLING-PAG:25723769364 Energisa Energia',
    '2027-04-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    2500.00::numeric,
    'Salários',
    'BLING-PAG:25723769391 THIAGO FERREIRA GONCALVES Salario Thiago',
    '2027-04-05'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    120.00::numeric,
    'Serviços contábeis',
    'BLING-PAG:25723769411 DANILO CONTABILIDADE Contabilidade',
    '2027-04-10'::date,
    NULL::date,
    'pix'
  ),
  (
    'despesa',
    119.98::numeric,
    'Internet',
    'BLING-PAG:25723769422 FleetNet Internet',
    '2027-04-10'::date,
    NULL::date,
    'conta_a_receber/pagar'
  ),
  (
    'despesa',
    24.90::numeric,
    'Fretes e seguros',
    'BLING-PAG:25723769435 Mercado Livre MeliMais',
    '2027-04-20'::date,
    NULL::date,
    'cartão_elo_empresarial_bradesco'
  )
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id
FROM novos n CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'
);

-- ============================================================
-- 4. Verificação
-- ============================================================
SELECT
  COUNT(*) FILTER (WHERE descricao LIKE 'BLING-REC:%') AS receitas_bling,
  COUNT(*) FILTER (WHERE descricao LIKE 'BLING-PAG:%') AS despesas_bling,
  SUM(valor) FILTER (WHERE descricao LIKE 'BLING-REC:%') AS soma_receitas,
  SUM(valor) FILTER (WHERE descricao LIKE 'BLING-PAG:%') AS soma_despesas
FROM lancamento_financeiro;

COMMIT;