-- 210 — O BANCO cria a máquina quando uma OS de Fabricação é concluída.
-- Antes isso dependia do front disparar criarMaquinaAoConcluir() (useOS.js);
-- aba com versão antiga ou outro caminho de conclusão deixava a máquina sem
-- entrar no estoque (OS #1945 e #1987). Agora é à prova de front.
-- O front continua chamando criarMaquinaAoConcluirFabricacao(), que é
-- idempotente por os.maquina_criada — ao ver a flag true devolve "ja_criada".
-- custo_compra = os.valor_total (mesma regra do front) — Toni ajusta depois.
-- Rollback: DROP TRIGGER trg_os_fabricacao_cria_maquina ON os;

CREATE OR REPLACE FUNCTION public.os_fabricacao_cria_maquina()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_custo_itens numeric;
BEGIN
  IF NEW.tipo = 'fabricacao'
     AND NEW.etapa = 'concluido'
     AND OLD.etapa IS DISTINCT FROM 'concluido'
     AND COALESCE(NEW.maquina_criada, false) = false THEN

    SELECT COALESCE(SUM(
             oi.quantidade * CASE WHEN oi.peca_id IS NULL
                                  THEN COALESCE(oi.valor_unitario, 0)
                                  ELSE COALESCE(p.custo_medio, p.custo_atual, 0) END
           ), 0)
      INTO v_custo_itens
      FROM os_item oi
      LEFT JOIN peca p ON p.id = oi.peca_id
     WHERE oi.os_id = NEW.id AND oi.categoria = 'peca' AND oi.deleted_at IS NULL;

    INSERT INTO maquina (modelo, marca, estado, custo_compra, custo_itens, custo_servico, preco_venda, observacoes)
    VALUES (NEW.modelo_equipamento, NEW.marca_equipamento, 'disponivel',
            COALESCE(NEW.valor_total, 0), v_custo_itens, 0, 0,
            'Gerada automaticamente pela OS #' || NEW.numero || ' (Fabricação).');

    UPDATE os SET maquina_criada = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_os_fabricacao_cria_maquina ON os;
CREATE TRIGGER trg_os_fabricacao_cria_maquina
  AFTER UPDATE OF etapa ON os
  FOR EACH ROW EXECUTE FUNCTION public.os_fabricacao_cria_maquina();
