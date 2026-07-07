-- =============================================================================
-- sql/114 — Unificar Avaliação + Diagnóstico (06/07/2026)
--
-- A etapa 'recebido' (Avaliação) foi aposentada: mesma pessoa, mesma bancada,
-- mesma sessão de trabalho que o Diagnóstico. O Kanban agora tem uma coluna
-- só ('diagnostico') com os dois formulários (testes + componentes).
--
-- O que este script faz:
--   · Move toda OS parada em 'recebido' para 'diagnostico'
--
-- O que ele NÃO faz (de propósito):
--   · os_historico fica intacto (append-only — registros antigos de 'recebido'
--     são traduzidos pra 'Diagnóstico' na UI pelo dbEtapaToUI)
--   · O valor 'recebido' continua existindo no enum os_etapa (inofensivo,
--     referenciado pelo histórico)
--   · pre_diagnostico.checklist.recebido mantém a chave 'recebido' (compat)
--
-- RODAR UMA VEZ no SQL Editor do Supabase. Idempotente.
-- =============================================================================

UPDATE os
SET etapa = 'diagnostico'
WHERE etapa = 'recebido';

-- Verificar (deve retornar 0):
-- SELECT COUNT(*) FROM os WHERE etapa = 'recebido';
