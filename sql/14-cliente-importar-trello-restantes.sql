-- ============================================================================
-- Importacao dos clientes do Trello que ficaram de fora do sql/11
-- Gerado em 2026-05-21 por scripts/importar-clientes-trello-restantes.mjs
--
-- 3 buckets agrupados (dedupe entre eles por telefone normalizado):
--   B (21) — só telefone (nome = telefone literal; revisar depois)
--   C (4) — telefone extraido do Card Name via regex
--   R (44) — cards de revisao (Aguardando/Leeds/etc), só cliente (OS não)
--
-- Total candidatos: 69
-- Match: anti-join por telefone normalizado >= 8 digitos.
-- Idempotente. Mesmo padrao do sql/11 (CTE WITH stg AS (VALUES ...)).
-- ============================================================================

INSERT INTO cliente (nome, telefone, endereco, observacoes)
WITH stg(nome, telefone, tel_norm, endereco, obs) AS (
  VALUES
    ('+55 67 8422-2416'::text, '+55 67 8422-2416'::text, '556784222416'::text, 'Av. Pantanal, 895 - Centro, Naviraí - MS, 79950-000, Brasil'::text, 'Trello — sem nome (revisar)'::text),
    ('45 9852-7386', '45 9852-7386', '4598527386', 'R. Benígno Pinheiro Cavalcante, 17 - Jardim Paraiso, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 8135-9346', '67 8135-9346', '6781359346', 'R. André Rodrigues da Silva, 463 - BNH, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 8415-7197', '67 8415-7197', '6784157197', 'R. Itália, 520 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 8421-5186', '67 8421-5186', '6784215186', 'Rua Bodoquena, 716, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 8456-8534', '67 8456-8534', '6784568534', 'R. Alcídes Alves Corrêa, 51 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 8462-6153', '67 8462-6153', '6784626153', 'Alameda das Jades, 119, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 8482-5244', '67 8482-5244', '6784825244', 'R. Irene Bazzo Rigonato, 409 - Vila João de Barros, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9241-0768', '67 9241-0768', '6792410768', 'R. Manacá, 865 - Portal Residence, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9244-1725', '67 9244-1725', '6792441725', 'Rua Bunji Tadano, 22 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9294-0709', '67 9294-0709', '6792940709', 'R. Tupis, 207 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9344-8897', '67 9344-8897', '6793448897', 'R. Hilda, 490 - Conj. Hab. Boa Vista, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9650-3992', '67 9650-3992', '6796503992', 'R. Jeane K García, 31 - Conj. Hab. Harry Amorim Costa, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9697-7376', '67 9697-7376', '6796977376', NULL, 'Trello — tel extraído do nome do card'),
    ('67 9836-5248', '67 9836-5248', '6798365248', 'R. Azaléias, 71 - Res. Sol Nascente, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9837-1888', '67 9837-1888', '6798371888', 'Rua Alamanda, 93 - Portal Residence, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9847-8867', '67 9847-8867', '6798478867', 'Rua Valmir Galvão de Souza, 1271, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9917-9107', '67 9917-9107', '6799179107', 'Distrito Verde', 'Trello — sem nome (revisar)'),
    ('67 9961-0873', '67 9961-0873', '6799610873', 'R. Manoel Alves da Silva, 112 - Vila Nova, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 9977-2710', '67 9977-2710', '6799772710', 'R. Hélio, 546 - Res. Morumbi, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('67 99951-0518', '67 99951-0518', '67999510518', 'Rua Porto Esperanca, 480', 'Trello — sem nome (revisar)'),
    ('67998758278‬', '67998758278‬', '67998758278', 'R. Joaquim das Neves Norte, 815 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — sem nome (revisar)'),
    ('Alexsandro', '67 9675-5246', '6796755246', 'Alameda dos Pinheiros, 164 - Royal Park Residence, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Alice Martins', '67 9681-9195', '6796819195', 'R. Idelfonso Silva Azevedo, 672 - Jardim Progresso, Naviraí - MS, 79950-000, Brasil', 'Trello — Máquinas pra venda (revisar)'),
    ('Aline', '67 9883-5106', '6798835106', NULL, 'Trello — tel extraído do nome do card'),
    ('Amauri Pereira', '67 9940-1797', '6799401797', '', 'Trello — Aguardando (revisar)'),
    ('Andreza Sato', '67 9691-1399', '6796911399', '', 'Trello — Leeds Limpeza (revisar)'),
    ('Andrielle', '67 8448-6409', '6784486409', 'Rua Saville Leyco Tacada, 359 - Vila Nova, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Angelica Aparecida da Silva flor', '67 9867-8257', '6798678257', 'R. Marcos Euripedes da Silva, 408 - Jardim Paraiso, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Bruno Daniel', '67 9686-8415', '6796868415', NULL, 'Trello — tel extraído do nome do card'),
    ('Carlinhos', '67 9914-5860', '6799145860', 'R. Fortaleza, 149 - Centro, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Claudia nunes', '67 9977-1636', '6799771636', '', 'Trello — Leeds Limpeza (revisar)'),
    ('Claudineia Lima', '67 9817-8543', '6798178543', 'R. Laurentino Pires de Arruda, 76 - Jardim Progresso, Naviraí - MS, 79949-532, Brasil', 'Trello — Aguardando (revisar)'),
    ('Cleu Cavalcante', '67 9849-1158', '6798491158', 'R. Clemente Gonçalves, 49 - BNH, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Daiane Bello', '67 9950-6327', '6799506327', 'Alameda Rio Solimões, 635 - Chácara de Recreio Recanto do Bosque, Naviraí - MS, 79950-000, Brasil', 'Trello — Leeds Limpeza (revisar)'),
    ('Daiane Dalcico', '67 9634-3861', '6796343861', 'R. Cerejeira, 85 - Jardim Oásis, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Dona Nadir', '67 93500-9558', '67935009558', 'R. Júlio Soares de Souza Filho, 398 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Dourival', '67 9903-0758', '6799030758', 'fazenda', 'Trello — Aguardando (revisar)'),
    ('Eliza', '67 9607-6084', '6796076084', 'R. Trevo, 441 - Res. Sol Nascente, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Elizabeth Bressa', '67 9812-1834', '6798121834', 'R. Fortaleza, 132 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — Lançados no ERP (revisar)'),
    ('Elizangela', '67 8125-5014', '6781255014', '', 'Trello — Leeds Limpeza (revisar)'),
    ('Elizângela', '67 9904-9827', '6799049827', 'R. Celeste, 125 - Res. Sol Nascente, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Estefany Nogueira', '67 9663-0183', '6796630183', 'Alameda das Turquesas, 355, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Fabiano Strada', '67 9908-3946', '6799083946', 'R. Antônio Frazão, 118 - Jardim Paraíso, Naviraí - MS, 79950-000, Brasil', 'Trello — Máquinas pra venda (revisar)'),
    ('Fabricia', '67 8100-4483', '6781004483', 'R. Clementina Foletto, 116 - Parque Beija Flor, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Gabriel', '67 9808-0680', '6798080680', 'R. João José Rodrigues, 329 - Jardim Paraíso IV, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Giovanni', '67 9277-6963', '6792776963', 'R. Gardênia, 707 - Res. Oasis II, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Helio', '67 9973-5304', '6799735304', 'Av. Jateí, 208 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — Leeds Limpeza (revisar)'),
    ('Janaina Jacomeli', '67 9977-1390', '6799771390', 'Alameda das Imbuias, 53 - Royal Park Residence, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Joao', '41 9669-1408', '4196691408', NULL, 'Trello — tel extraído do nome do card'),
    ('João Paulo', '67 8105-8825', '6781058825', 'R. Gurucaia, 116 - Res. Ipe, Naviraí - MS, 79950-000, Brasil', 'Trello — Leeds Limpeza (revisar)'),
    ('Josiane', '67 9897-4106', '6798974106', '', 'Trello — Leeds Limpeza (revisar)'),
    ('Lucineia Fazenda Perdigão', '67981207424', '67981207424', '', 'Trello — Aguardando (revisar)'),
    ('Lucyane Fiaux', '67 9841-1994', '6798411994', 'R. Jeane K García, 42 - Conj. Hab. Harry Amorim Costa, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Marinalva Gomes De Lima', '67 9900-8451', '6799008451', 'Fazenda', 'Trello — Aguardando (revisar)'),
    ('Neia Garcia', '67 9256-6126', '6792566126', 'Edifício união apto 801', 'Trello — Aguardando (revisar)'),
    ('Neide Garcia', '67 9928-2716', '6799282716', 'Av. Ponta Porã, 871 - Jardim Alvorada, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Paula Fernanda soley nascimento 9629-3841', '67 9629-3841', '6796293841', 'R. Pará, 357 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Priscila bom fim', '67 9953-4691', '6799534691', 'R. Botocudos, 523B - Centro, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Renato PS', '67 9844-4454', '6798444454', 'Alameda Londrina, 624 - Eco Park Residence, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Rita', '67 8132-1946', '6781321946', 'R. Belarminio Francisca Umburanas, 428 - Jardim Progresso, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Rose', '67 9675-8082', '6796758082', 'R. Almerindo de Souza Lima, 132 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Simone Braga', '67 9821-7688', '6798217688', '', 'Trello — Aguardando (revisar)'),
    ('Sol', '67 9261-7945', '6792617945', '', 'Trello — Aguardando (revisar)'),
    ('Sueli Souza', '67 9815-9553', '6798159553', 'R. Jequitibá, 183 - Res. Ipe, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)'),
    ('Tais  Emanuele', '67 8119-3849', '6781193849', 'Rua Baltazar Rocha n 914', 'Trello — Aguardando (revisar)'),
    ('Todynho', '67 9989-8283', '6799898283', '', 'Trello — Aguardando (revisar)'),
    ('Vani 9693-2087', '9693-2087', '96932087', '', 'Trello — Aguardando (revisar)'),
    ('Vitória', '67 9881-0742', '6798810742', 'Av. Pantanal, 945 - Jardim Vale Encantado, Naviraí - MS, 79950-000, Brasil', 'Trello — Aguardando (revisar)')
)
SELECT s.nome, s.telefone, s.endereco, s.obs
FROM stg s
WHERE NOT EXISTS (
  SELECT 1 FROM cliente c
  WHERE c.deleted_at IS NULL
    AND LENGTH(COALESCE(s.tel_norm, '')) >= 8
    AND regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') = s.tel_norm
);

-- Conferencia:
-- SELECT COUNT(*) FROM cliente WHERE observacoes LIKE 'Trello — %';
-- SELECT COUNT(*) FROM cliente WHERE deleted_at IS NULL;
-- Revisao dos "nome = telefone":
-- SELECT id, nome, telefone FROM cliente
--  WHERE observacoes = 'Trello — sem nome (revisar)' ORDER BY nome;
