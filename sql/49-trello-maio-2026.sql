BEGIN;

INSERT INTO cliente (nome,telefone,observacoes) VALUES
  ('Eleni Sordi Maier 67 9977-2525','67 9977-2525','Importado Trello Maio 2026'),
  ('Maria do CÃ©u 67 9977-6008','67 9977-6008','Importado Trello Maio 2026'),
  ('Sandra de Oliveira dos Santos 67 9944-0882','67 9944-0882','Importado Trello Maio 2026'),
  ('GIVAS 67 9984-7840','67 9984-7840','Importado Trello Maio 2026'),
  ('Aline Gabriela 67 9168-9090','67 9168-9090','Importado Trello Maio 2026'),
  ('Eunice 67 9977-1997','67 9977-1997','Importado Trello Maio 2026'),
  ('Larissa Rockenbach 67 9828-5464','67 9828-5464','Importado Trello Maio 2026'),
  ('Fernanda 67 9606-6563','67 9606-6563','Importado Trello Maio 2026'),
  ('Deolinda 67 8448-3316','67 8448-3316','Importado Trello Maio 2026'),
  ('Juscilene Rodrigues  67 9865-1427','67 9865-1427','Importado Trello Maio 2026'),
  ('Fernando Sturnich 67 9906-2950','67 9906-2950','Importado Trello Maio 2026'),
  ('Amanda 67 9290-0473','67 9290-0473','Importado Trello Maio 2026'),
  ('Diana 67 9901-6240','67 9901-6240','Importado Trello Maio 2026'),
  ('Carina Martins 67 9904-7036','67 9904-7036','Importado Trello Maio 2026'),
  ('Valter 67 9960-9488','67 9960-9488','Importado Trello Maio 2026'),
  ('Rhany 67 9110-2886','67 9110-2886','Importado Trello Maio 2026'),
  ('priscila claudia leite 67 9942-8969','67 9942-8969','Importado Trello Maio 2026'),
  ('Hayara Trindade 67 9690-8484','67 9690-8484','Importado Trello Maio 2026'),
  ('MaurÃ­cio Eduardo Hermes 45 9111-3258','45 9111-3258','Importado Trello Maio 2026'),
  ('Jorge Sena 67 9913-2977','67 9913-2977','Importado Trello Maio 2026'),
  ('VICK MANU 67 9977-5993','67 9977-5993','Importado Trello Maio 2026'),
  ('Solange 67 9659-9557','67 9659-9557','Importado Trello Maio 2026'),
  ('Juliana Santana 67 9833-2181','67 9833-2181','Importado Trello Maio 2026'),
  ('CÃ©lia Binda 67 9988-3453','67 9988-3453','Importado Trello Maio 2026'),
  ('Angela 67 9936-3250','67 9936-3250','Importado Trello Maio 2026'),
  ('Sueli Da Silva Carvalho 67 8445-4372','67 8445-4372','Importado Trello Maio 2026'),
  ('Cintia Cristina Da Silva 67 8474-1224','67 8474-1224','Importado Trello Maio 2026'),
  ('Nelci 67 8413-8887','67 8413-8887','Importado Trello Maio 2026'),
  ('Solange 67 9994-9703','67 9994-9703','Importado Trello Maio 2026'),
  ('Raul 67 8119-7482','67 8119-7482','Importado Trello Maio 2026'),
  ('Hellen 67 9919-1133','67 9919-1133','Importado Trello Maio 2026'),
  ('Ilario 67 999771330','67 99977-1330','Importado Trello Maio 2026'),
  ('Paula 67 9283-3141','67 9283-3141','Importado Trello Maio 2026'),
  ('67 9692-8525','67 9692-8525','Importado Trello Maio 2026')
ON CONFLICT DO NOTHING;

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799772525' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',750.00,750.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799772525 | Alameda dos ResedÃ¡s 308 Residencial Green Park','2026-04-06 12:00:00+00','2026-04-06'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799772525%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799776008' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',100.00,100.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799776008 | troca da mangueira do pressostato, foi roÃ­do por ratos','2026-05-04 12:00:00+00','2026-05-04'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799776008%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT NULL,'atendimento','concluido',245.00,245.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:MarliaFreireMarques6799799009 | verificar suporte do cesto','2026-05-05 12:00:00+00','2026-05-05'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:MarliaFreireMarques6799799009%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799440882' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',560.00,560.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799440882 | Agitador quebrado e limpeza 560','2026-05-05 12:00:00+00','2026-05-05'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799440882%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799847840' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',645.00,645.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799847840 | ','2026-05-05 12:00:00+00','2026-05-05'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799847840%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6791689090' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',450.00,450.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6791689090 | mangueira de saida e rolamentos do motos 285','2026-05-05 12:00:00+00','2026-05-05'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6791689090%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799771997' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',195.00,195.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799771997 | ','2026-05-06 12:00:00+00','2026-05-06'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799771997%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6798285464' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',535.00,535.00,'total'::os_pagamento_status,'link_pagamento',
  'TRELLO-MAIO-2026:6798285464 | manutenÃ§Ã£o da placa, eletrobomba, rolamentos do mecanismo e limpeza 535','2026-05-07 12:00:00+00','2026-05-07'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6798285464%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6796066563' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',305.00,305.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6796066563 | troca do atuador e 4 pezinhos 305 e limepza','2026-05-07 12:00:00+00','2026-05-07'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796066563%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6784483316' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',420.00,420.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6784483316 | troca do capacitor e limpeza 420','2026-05-07 12:00:00+00','2026-05-07'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784483316%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6798651427' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',245.00,245.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6798651427 | troca do atuador 245','2026-05-07 12:00:00+00','2026-05-07'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6798651427%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799062950' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',28.00,28.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799062950 | ','2026-05-08 12:00:00+00','2026-05-08'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799062950%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6792900473' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',185.00,185.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6792900473 | ','2026-05-12 12:00:00+00','2026-05-12'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6792900473%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799016240' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',650.00,650.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6799016240 | ','2026-05-12 12:00:00+00','2026-05-12'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799016240%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799047036' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',640.00,640.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6799047036 | Troca do mecanismo, retentor, rolamentos, correia, polia e limpeza 650','2026-05-12 12:00:00+00','2026-05-12'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799047036%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799609488' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',350.00,185.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799609488 | 350 pix 15-5 (um pix de 185 e outro de 165)','2026-05-14 12:00:00+00','2026-05-14'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799609488%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6791102886' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',285.00,285.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6791102886 | bomba e valvula 285','2026-05-14 12:00:00+00','2026-05-14'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6791102886%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799428969' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',185.00,185.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799428969 | limpeza','2026-05-15 12:00:00+00','2026-05-15'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799428969%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6796908484' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',280.00,280.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6796908484 | ','2026-05-16 12:00:00+00','2026-05-16'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796908484%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%4591113258' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',685.00,685.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:4591113258 | revisao e limpeza 685','2026-05-18 12:00:00+00','2026-05-18'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:4591113258%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799132977' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',430.00,430.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6799132977 | limpeza e troca do pressostato 430','2026-05-18 12:00:00+00','2026-05-18'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799132977%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799775993' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',250.00,250.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799775993 | ','2026-05-20 12:00:00+00','2026-05-20'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799775993%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6796599557' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',400.00,400.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6796599557 | mangueira furada, rolamento do motor e limepeza 415','2026-05-20 12:00:00+00','2026-05-20'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796599557%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6798332181' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',85.00,85.00,'total'::os_pagamento_status,'credito_1x',
  'TRELLO-MAIO-2026:6798332181 | trocar correia','2026-05-21 12:00:00+00','2026-05-21'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6798332181%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799883453' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',270.00,270.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6799883453 | ','2026-05-21 12:00:00+00','2026-05-21'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799883453%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799363250' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',185.00,185.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6799363250 | botÃ£o ruim e limpeza','2026-05-21 12:00:00+00','2026-05-21'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799363250%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6784454372' AND deleted_at IS NULL LIMIT 1),'atendimento','pagamento',385.00,145.00,'parcial'::os_pagamento_status,'dinheiro',
  'TRELLO-MAIO-2026:6784454372 | troca da placa','2026-05-23 12:00:00+00',NULL
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784454372%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6784741224' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',450.00,450.00,'total'::os_pagamento_status,'dinheiro',
  'TRELLO-MAIO-2026:6784741224 | mangueira de saida, atuador 285 e limpeza 165','2026-05-23 12:00:00+00','2026-05-23'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784741224%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6784138887' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',655.00,655.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6784138887 | troca do mecanismo e limpeza','2026-05-23 12:00:00+00','2026-05-23'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784138887%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799949703' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',390.00,390.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799949703 | troca da valvula e limpeza 390 reais pix','2026-05-25 12:00:00+00','2026-05-25'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799949703%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT NULL,'atendimento','concluido',435.00,435.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:Lorival | verificar valvula e limpeza 295 + 165','2026-05-26 12:00:00+00','2026-05-26'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:Lorival%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6781197482' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',195.00,195.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6781197482 | manutenÃ§Ã£o da placa','2026-05-26 12:00:00+00','2026-05-26'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6781197482%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799191133' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',360.00,360.00,'total'::os_pagamento_status,'credito_parcelado',
  'TRELLO-MAIO-2026:6799191133 | manutenÃ§Ã£o elÃ©trica e troca dos rolamentos do mecanismo e limpeza','2026-05-28 12:00:00+00','2026-05-28'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799191133%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%67999771330' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',635.00,635.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:67999771330 | revisÃ£o e limpeza','2026-05-29 12:00:00+00','2026-05-29'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:67999771330%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6796599557' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',185.00,185.00,'total'::os_pagamento_status,'credito_1x',
  'TRELLO-MAIO-2026:6796599557 | ','2026-05-29 12:00:00+00','2026-05-29'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796599557%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6792833141' AND deleted_at IS NULL LIMIT 1),'atendimento','pagamento',355.00,255.00,'parcial'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6792833141 | troca da valvula e limpeza','2026-05-31 12:00:00+00',NULL
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6792833141%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT NULL,'atendimento','concluido',400.00,400.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:GleisyCavallini | troca da placa de potencia','2026-05-31 12:00:00+00','2026-05-31'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:GleisyCavallini%' AND deleted_at IS NULL);

INSERT INTO os (cliente_id,tipo,etapa,valor_total,valor_pago,pago,forma_pagamento,observacoes,criado_em,data_conclusao)
SELECT (SELECT id FROM cliente WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6796928525' AND deleted_at IS NULL LIMIT 1),'atendimento','concluido',600.00,600.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6796928525 | ','2026-05-31 12:00:00+00','2026-05-31'
WHERE NOT EXISTS(SELECT 1 FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796928525%' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',750.00,'Servico','Eleni Sordi Maier 67 9977-2525',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-04-06','2026-04-06',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799772525%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799772525%' AND vencimento='2026-04-06' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',100.00,'Servico','Maria do CÃ©u 67 9977-6008',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-04','2026-05-04',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799776008%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799776008%' AND vencimento='2026-05-04' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',245.00,'Servico','MarÃ­lia Freire Marques â€ª67Â 9979â€‘9009â€¬',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-05','2026-05-05',5.38,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:MarliaFreireMarques6799799009%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%MarliaFreireMarques6799799009%' AND vencimento='2026-05-05' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',560.00,'Servico','Sandra de Oliveira dos Santos 67 9944-0882',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-05','2026-05-05',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799440882%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799440882%' AND vencimento='2026-05-05' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',645.00,'Servico','GIVAS 67 9984-7840',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-05','2026-05-05',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799847840%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799847840%' AND vencimento='2026-05-05' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',450.00,'Servico','Aline Gabriela 67 9168-9090',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-05','2026-05-05',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6791689090%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6791689090%' AND vencimento='2026-05-05' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',195.00,'Servico','Eunice 67 9977-1997',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-06','2026-05-06',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799771997%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799771997%' AND vencimento='2026-05-06' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',535.00,'Servico','Larissa Rockenbach 67 9828-5464',(SELECT id FROM conta_bancaria WHERE nome='InfinitePay' LIMIT 1),'2026-05-07','2026-05-07',4.2,'link_pagamento',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6798285464%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6798285464%' AND vencimento='2026-05-07' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',305.00,'Servico','Fernanda 67 9606-6563',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-07','2026-05-07',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796066563%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6796066563%' AND vencimento='2026-05-07' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',420.00,'Servico','Deolinda 67 8448-3316',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-07','2026-05-07',6.11,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784483316%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6784483316%' AND vencimento='2026-05-07' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',245.00,'Servico','Juscilene Rodrigues  67 9865-1427',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-07','2026-05-07',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6798651427%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6798651427%' AND vencimento='2026-05-07' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',28.00,'Servico','Fernando Sturnich 67 9906-2950',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-08','2026-05-08',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799062950%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799062950%' AND vencimento='2026-05-08' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',185.00,'Servico','Amanda 67 9290-0473',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-12','2026-05-12',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6792900473%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6792900473%' AND vencimento='2026-05-12' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',650.00,'Servico','Diana 67 9901-6240',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-12','2026-05-12',6.109,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799016240%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799016240%' AND vencimento='2026-05-12' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',640.00,'Servico','Carina Martins 67 9904-7036',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-12','2026-05-12',6.841,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799047036%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799047036%' AND vencimento='2026-05-12' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',185.00,'Servico','Valter 67 9960-9488',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-14','2026-05-14',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799609488%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799609488%' AND vencimento='2026-05-14' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',285.00,'Servico','Rhany 67 9110-2886',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-14','2026-05-14',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6791102886%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6791102886%' AND vencimento='2026-05-14' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',165.00,'Servico','Valter 67 9960-9488',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-15','2026-05-15',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799609488%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799609488%' AND vencimento='2026-05-15' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',185.00,'Servico','priscila claudia leite 67 9942-8969',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-15','2026-05-15',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799428969%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799428969%' AND vencimento='2026-05-15' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',280.00,'Servico','Hayara Trindade 67 9690-8484',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-16','2026-05-16',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796908484%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6796908484%' AND vencimento='2026-05-16' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',685.00,'Servico','MaurÃ­cio Eduardo Hermes 45 9111-3258',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-18','2026-05-18',6.109,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:4591113258%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%4591113258%' AND vencimento='2026-05-18' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',430.00,'Servico','Jorge Sena 67 9913-2977',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-18','2026-05-18',6.109,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799132977%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799132977%' AND vencimento='2026-05-18' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',250.00,'Servico','VICK MANU 67 9977-5993',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-20','2026-05-20',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799775993%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799775993%' AND vencimento='2026-05-20' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',400.00,'Servico','Solange 67 9659-9557',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-20','2026-05-20',5.38,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796599557%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6796599557%' AND vencimento='2026-05-20' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',85.00,'Servico','Juliana Santana 67 9833-2181',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-21','2026-05-21',3.141,'credito_1x',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6798332181%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6798332181%' AND vencimento='2026-05-21' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',270.00,'Servico','CÃ©lia Binda 67 9988-3453',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-21','2026-05-21',6.111,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799883453%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799883453%' AND vencimento='2026-05-21' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',185.00,'Servico','Angela 67 9936-3250',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-21','2026-05-21',6.459,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799363250%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799363250%' AND vencimento='2026-05-21' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',145.00,'Servico','Sueli Da Silva Carvalho 67 8445-4372',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-23','2026-05-23',0,'dinheiro',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784454372%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6784454372%' AND vencimento='2026-05-23' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',450.00,'Servico','Cintia Cristina Da Silva 67 8474-1224',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-23','2026-05-23',0,'dinheiro',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784741224%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6784741224%' AND vencimento='2026-05-23' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',655.00,'Servico','Nelci 67 8413-8887',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-23','2026-05-23',6.11,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784138887%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6784138887%' AND vencimento='2026-05-23' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',390.00,'Servico','Solange 67 9994-9703',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-25','2026-05-25',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799949703%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799949703%' AND vencimento='2026-05-25' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',435.00,'Servico','Lorival',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-26','2026-05-26',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:Lorival%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%Lorival%' AND vencimento='2026-05-26' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',195.00,'Servico','Raul 67 8119-7482',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-26','2026-05-26',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6781197482%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6781197482%' AND vencimento='2026-05-26' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',360.00,'Servico','Hellen 67 9919-1133',(SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),'2026-05-28','2026-05-28',6.111,'credito_parcelado',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799191133%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6799191133%' AND vencimento='2026-05-28' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',635.00,'Servico','Ilario 67 999771330',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-29','2026-05-29',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:67999771330%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%67999771330%' AND vencimento='2026-05-29' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',185.00,'Servico','Solange Gomes Cliente 67 9659-9557',(SELECT id FROM conta_bancaria WHERE nome='InfinitePay' LIMIT 1),'2026-05-29','2026-05-29',3.146,'credito_1x',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796599557%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6796599557%' AND vencimento='2026-05-29' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',255.00,'Servico','Paula 67 9283-3141',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-31','2026-05-31',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6792833141%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6792833141%' AND vencimento='2026-05-31' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',400.00,'Servico','Gleisy Cavallini',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-31','2026-05-31',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:GleisyCavallini%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%GleisyCavallini%' AND vencimento='2026-05-31' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',600.00,'Servico','67 9692-8525',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-05-31','2026-05-31',0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796928525%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%6796928525%' AND vencimento='2026-05-31' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',100.00,'Servico','Paula 67 9283-3141 - saldo restante',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-06-30',NULL,0,'pix',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6792833141%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%Paula%saldo%' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo,valor,categoria,descricao,conta_id,vencimento,pago_em,taxa_pct,forma_pagamento,os_id)
SELECT 'receita',240.00,'Servico','Sueli Da Silva Carvalho 67 8445-4372 - saldo restante',(SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),'2026-06-30',NULL,0,'dinheiro',(SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6784454372%' AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao ILIKE '%Sueli%saldo%' AND deleted_at IS NULL);

COMMIT;

SELECT COUNT(*) AS os_maio FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026%' AND deleted_at IS NULL;
SELECT COUNT(*) AS lanc_maio, ROUND(SUM(valor),2) AS total FROM lancamento_financeiro WHERE categoria='Servico' AND vencimento>='2026-05-01' AND deleted_at IS NULL;
