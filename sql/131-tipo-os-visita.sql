-- 131-tipo-os-visita.sql
-- Novo tipo de OS: "Visita" — serviço feito na casa do cliente (sem Coleta e
-- sem Entrega, porque a máquina nunca sai da residência).
--
-- Fluxo (definido com o Toni): Agenda → Diagnóstico → Orçamento → Conserto
-- (no local) → Teste → A receber → Concluído. Reaproveita as etapas que já
-- existem no enum os_etapa (aguardando_agendamento, diagnostico, orcamento,
-- em_oficina, teste_final, pagamento, concluido) — NÃO precisa mexer nesse enum.
--
-- Só falta adicionar o VALOR 'visita' ao enum os_tipo.
--
-- RODAR NO SQL EDITOR DO SUPABASE (uma vez). Idempotente.

ALTER TYPE os_tipo ADD VALUE IF NOT EXISTS 'visita';

-- Conferir:
-- SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
--   WHERE t.typname = 'os_tipo' ORDER BY e.enumsortorder;
