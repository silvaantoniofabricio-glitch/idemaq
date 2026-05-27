// src/components/osDetalhe/acoes/AcaoOficina.jsx
// Etapa "Em oficina" (Conserto) — padrão V2 SubBloco.
//
// REGRAS (contexto-os.md §230-238):
//  - 2 lados: Limpeza e Manutenção (executam SIMULTANEOS)
//  - Cada lado tem 3 etapas: Desmontagem · Serviço · Montagem
//  - Desmontagem e Montagem sao COMPARTILHADAS (mesma maquina fisica) —
//    marcar num lado marca no outro
//  - Limpeza ativa se orcamento tem item com /limpeza/i no nome
//  - Manutencao ativa se orcamento tem item NAO-limpeza
//  - Servico da Manutencao = checklist dos componentes marcados no Diagnostico
//  - Anti-erro: pra Montagem liberar, o servico do OUTRO lado precisa estar 100%
//  - Banner vermelho se OS volta do Teste com `os.teste_falhas`
//
// PERSISTENCIA:
//  - os.oficina_execucao (jsonb): { desmontagem, montagem, limpeza_serv, manut_serv }
//  - os.limpeza / os.manutencao: 'pendente' | 'andamento' | 'concluido'

import React, { useMemo } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, NowCard, BtnMobile, MOBILE, PALETA, Pill,
} from '../../_shared/PrimitivasMobile';
import { useOSItens } from '../../../hooks/useOSItens';
import { CATEGORIA_POR_ID } from '../../../utils/categoriasPeca';
import { ETAPAS_TODOS } from '../../../utils/osData';

// ─── Checks de etapa unica (Desmontagem / Limpeza / Montagem) ─────────────
// Cada etapa eh UM check so. So a Manutencao tem sub-itens (peças do diagnostico).
const CHECKS_DESMONTAGEM = [{ id: 'feito', label: 'Desmontagem feita' }];
const CHECKS_LIMPEZA     = [{ id: 'feito', label: 'Limpeza feita' }];
const CHECKS_MONTAGEM    = [{ id: 'feito', label: 'Montagem feita' }];

// ─── SubBloco compacto (mesmo padrão V2) ──────────────────────────────────
function SubBloco({ T, dark, icon, label, color = 'blue', children, action }) {
  const colorMap = {
    blue:   { fg: PALETA.blueStrong,   bg: dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg },
    yellow: { fg: PALETA.yellowStrong, bg: dark ? 'rgba(255,217,102,0.18)' : PALETA.yellowBg },
    green:  { fg: PALETA.greenStrong,  bg: dark ? 'rgba(46,125,94,0.18)' : PALETA.greenBg },
    red:    { fg: PALETA.redStrong,    bg: dark ? 'rgba(192,66,66,0.18)' : PALETA.redBg },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{
        padding: '3px 6px 3px 8px',
        background: dark ? 'rgba(255,255,255,0.03)' : T.cardAlt,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          background: c.bg, color: c.fg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TI name={icon} size={11} />
        </span>
        <span style={{
          flex: 1, fontSize: 11, fontWeight: 700, color: T.textPrimary,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>{label}</span>
        {action}
      </div>
      <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

// ─── Linha de check ───────────────────────────────────────────────────────
function CheckRow({ T, dark, label, checked, disabled, onToggle, prefix, badge }) {
  return (
    <button type="button" onClick={disabled ? undefined : onToggle} disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 7px', fontSize: 11.5, border: 'none',
        background: checked
          ? (dark ? 'rgba(46,125,94,0.12)' : (PALETA.greenBg + '88'))
          : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        width: '100%', textAlign: 'left',
        fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <span style={{
        width: 15, height: 15, borderRadius: 3, flexShrink: 0,
        border: `1.5px solid ${checked ? PALETA.greenStrong : '#D1D5DB'}`,
        background: checked ? PALETA.greenStrong : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
      }}>
        {checked && <TI name="check" size={10} />}
      </span>
      {prefix && (
        <span style={{
          fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
          flexShrink: 0,
          background: prefix.bg, color: prefix.fg,
          textTransform: 'uppercase', letterSpacing: '.03em',
        }}>{prefix.label}</span>
      )}
      <span style={{
        flex: 1, minWidth: 0,
        color: checked ? T.textMuted : T.textPrimary,
        fontWeight: 500,
        textDecoration: checked ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</span>
      {badge}
    </button>
  );
}

// ─── Mini-secao dentro do card (Desmontagem / Servico / Montagem) ─────────
// Se a secao so tem 1 check, o proprio header eh o toggle (mais compacto).
// Se tem N checks (caso da Manutencao), header + lista de sub-itens.
function SecaoChecklist({ T, dark, titulo, icon, checks, valores, onToggle, bloqueada, bloqueioMsg, sync, sempreLista }) {
  const total = checks.length;
  const feitos = checks.filter(c => valores[c.id]).length;
  const tudoOk = total > 0 && feitos === total;
  // single-mode: 1 check unico onde o header EH o toggle. Pra Manutencao
  // forcamos lista mesmo com 1 item, pra mostrar o label da peca.
  const isSingle = total === 1 && !sempreLista;

  const headerBg = tudoOk
    ? (dark ? 'rgba(46,125,94,0.18)' : PALETA.greenBg)
    : (dark ? 'rgba(255,255,255,0.03)' : T.cardAlt);

  const headerContent = (
    <>
      {isSingle ? (
        <span style={{
          width: 15, height: 15, borderRadius: 3, flexShrink: 0,
          border: `1.5px solid ${tudoOk ? PALETA.greenStrong : '#D1D5DB'}`,
          background: tudoOk ? PALETA.greenStrong : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          {tudoOk && <TI name="check" size={10} />}
        </span>
      ) : (
        <TI name={icon} size={12} color={tudoOk ? PALETA.greenStrong : T.textMuted} />
      )}
      <span style={{
        flex: 1, fontSize: 11, fontWeight: 700,
        color: tudoOk ? PALETA.greenStrong : T.textPrimary,
        textTransform: 'uppercase', letterSpacing: '.04em',
        textDecoration: (isSingle && tudoOk) ? 'line-through' : 'none',
      }}>{titulo}</span>
      {sync && (
        <span title="Sincronizado entre Limpeza e Manutenção"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 9, color: T.textMuted, fontWeight: 600,
          }}>
          <TI name="arrows-left-right" size={10} />
        </span>
      )}
      {!isSingle && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: tudoOk ? PALETA.greenStrong : T.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {feitos}/{total}
        </span>
      )}
    </>
  );

  return (
    <div style={{
      border: `1px solid ${T.border}`,
      borderRadius: 8, overflow: 'hidden',
      background: T.bg,
    }}>
      {isSingle ? (
        <button type="button"
          onClick={bloqueada ? undefined : () => onToggle(checks[0].id)}
          disabled={bloqueada}
          style={{
            width: '100%', textAlign: 'left',
            padding: '7px 9px', fontFamily: 'inherit',
            background: headerBg, border: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: bloqueada ? 'not-allowed' : 'pointer',
            opacity: bloqueada ? 0.55 : 1,
            WebkitTapHighlightColor: 'transparent',
          }}>
          {headerContent}
        </button>
      ) : (
        <div style={{
          padding: '6px 10px', background: headerBg,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {headerContent}
        </div>
      )}

      {bloqueada && isSingle && bloqueioMsg && (
        <div style={{
          padding: '6px 9px', fontSize: 10.5, color: PALETA.yellowStrong,
          background: dark ? 'rgba(255,217,102,0.10)' : PALETA.yellowBg,
          borderTop: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <TI name="lock" size={11} />
          {bloqueioMsg}
        </div>
      )}

      {!isSingle && bloqueada && (
        <div style={{
          padding: '8px 10px', fontSize: 11.5, color: PALETA.yellowStrong,
          background: dark ? 'rgba(255,217,102,0.10)' : PALETA.yellowBg,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <TI name="lock" size={12} />
          {bloqueioMsg || 'Bloqueado'}
        </div>
      )}

      {!isSingle && (
        checks.length === 0 ? (
          <div style={{
            padding: '10px', fontSize: 11.5, color: T.textMuted,
            textAlign: 'center', fontStyle: 'italic',
          }}>
            Sem itens nesse passo
          </div>
        ) : (
          checks.map((c, i) => (
            <div key={c.id} style={{
              borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
            }}>
              <CheckRow T={T} dark={dark}
                label={c.label}
                prefix={c.prefix}
                checked={!!valores[c.id]}
                disabled={bloqueada}
                onToggle={() => onToggle(c.id)} />
            </div>
          ))
        )
      )}
    </div>
  );
}

// ─── Status badge do lado (Limpeza/Manutenção) ────────────────────────────
// Bolinha compacta pra caber no header quando os 2 cards ficam lado a lado.
function StatusBolinha({ status }) {
  const map = {
    pendente:  { color: '#9CA3AF', title: 'Pendente' },
    andamento: { color: PALETA.yellowStrong, title: 'Em andamento' },
    concluido: { color: PALETA.greenStrong,  title: 'Concluído' },
  };
  const m = map[status] || map.pendente;
  return (
    <span title={m.title}
      style={{
        width: 10, height: 10, borderRadius: 99,
        background: m.color, flexShrink: 0,
        boxShadow: status === 'andamento' ? `0 0 0 2px ${m.color}33` : 'none',
      }} />
  );
}

// ─── Card de um lado (Limpeza ou Manutenção) ──────────────────────────────
function CardLado({
  T, dark, titulo, icon, color, status,
  desmCheck, servCheck, montCheck,  // checklists
  desmVal, servVal, montVal,        // valores atuais (objs)
  onToggleDesm, onToggleServ, onToggleMont,
  outroServDone, outroLabel,
}) {
  const desmDone = desmCheck.every(c => desmVal[c.id]);
  const servDone = servCheck.length > 0 && servCheck.every(c => servVal[c.id]);
  // Mont bloqueada se: desmontagem nao ok OU servico desse lado nao ok
  // OU servico do OUTRO lado nao ok (anti-erro)
  let montBloqueio = null;
  if (!desmDone)         montBloqueio = 'Conclua a desmontagem primeiro';
  else if (!servDone)    montBloqueio = `Conclua ${titulo.toLowerCase()} primeiro`;
  else if (!outroServDone) montBloqueio = `Aguardando ${outroLabel}`;

  return (
    <SubBloco T={T} dark={dark} icon={icon} label={titulo} color={color}
      action={<StatusBolinha status={status} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SecaoChecklist T={T} dark={dark}
          titulo="Desmontagem" icon="tools-off"
          checks={desmCheck} valores={desmVal} onToggle={onToggleDesm}
          sync />
        <SecaoChecklist T={T} dark={dark}
          titulo={titulo === 'Limpeza' ? 'Limpeza' : 'Manutenção'}
          icon={titulo === 'Limpeza' ? 'droplet' : 'tool'}
          checks={servCheck} valores={servVal} onToggle={onToggleServ}
          sempreLista={titulo === 'Manutenção'} />
        <SecaoChecklist T={T} dark={dark}
          titulo="Montagem" icon="tools"
          checks={montCheck} valores={montVal} onToggle={onToggleMont}
          bloqueada={!!montBloqueio} bloqueioMsg={montBloqueio}
          sync />
      </div>
    </SubBloco>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────
const AcaoOficina = ({ os, onUpdateOS, onMoverOS, onAbrirAba }) => {
  const { T, dark } = useTheme();
  const { itens } = useOSItens(os?.id);

  // Detecta quais lados estao ativos baseado nos itens do orcamento
  const temLimpeza = useMemo(
    () => (itens || []).some(it => /limpeza/i.test(it.nome || '')),
    [itens]
  );
  const temManutencao = useMemo(
    () => (itens || []).some(it => !/limpeza/i.test(it.nome || '')),
    [itens]
  );

  // Derivar checklist da Manutencao a partir do diagnostico
  // componentes_marcados: { grupoId: { itemId: 'troca'|'manutencao' } }
  const manutChecks = useMemo(() => {
    const marcados = os?.pre_diagnostico?.componentes_marcados || {};
    const out = [];
    for (const [grupoId, itens] of Object.entries(marcados)) {
      if (!itens || typeof itens !== 'object') continue;
      // Compat: se vier array antigo, trata como 'troca'
      const pares = Array.isArray(itens)
        ? itens.map(id => [id, 'troca'])
        : Object.entries(itens);
      for (const [itemId, acao] of pares) {
        const cat = CATEGORIA_POR_ID[itemId];
        const label = cat?.label || itemId;
        out.push({
          id: itemId,
          label,
          prefix: acao === 'manutencao'
            ? { label: 'Manut.', fg: PALETA.yellowStrong, bg: dark ? 'rgba(255,217,102,0.18)' : PALETA.yellowBg }
            : { label: 'Troca',  fg: PALETA.redStrong,    bg: dark ? 'rgba(192,66,66,0.18)'   : PALETA.redBg },
        });
      }
    }
    return out;
  }, [os?.pre_diagnostico?.componentes_marcados, dark]);

  // Estado atual da execucao
  const exec = os?.oficina_execucao || {};
  const desmVal = exec.desmontagem || {};
  const montVal = exec.montagem || {};
  const limpVal = exec.limpeza_serv || {};
  const manutVal = exec.manut_serv || {};

  // Falhas vindas do Teste final (banner vermelho)
  const falhas = Array.isArray(os?.teste_falhas) ? os.teste_falhas : [];

  // ─── Persistencia ───
  function persistExec(novoExec) {
    // Recalcula status dos lados
    const desmOk = CHECKS_DESMONTAGEM.every(c => novoExec.desmontagem?.[c.id]);
    const montOk = CHECKS_MONTAGEM.every(c => novoExec.montagem?.[c.id]);
    const limpServOk = CHECKS_LIMPEZA.every(c => novoExec.limpeza_serv?.[c.id]);
    const manutServOk = manutChecks.length > 0
      && manutChecks.every(c => novoExec.manut_serv?.[c.id]);

    const statusLado = (ativo, servOk) => {
      if (!ativo) return os?.[ativo] || 'pendente';
      const algumCheck = desmOk || servOk || montOk;
      if (desmOk && servOk && montOk) return 'concluido';
      if (algumCheck) return 'andamento';
      return 'pendente';
    };

    const patch = { oficina_execucao: novoExec };
    if (temLimpeza)    patch.limpeza    = statusLado(true, limpServOk);
    if (temManutencao) patch.manutencao = statusLado(true, manutServOk);

    onUpdateOS?.(os.numero, patch);
  }

  const toggleEm = (secao) => (chaveId) => {
    const atual = exec[secao] || {};
    const novo = { ...atual };
    if (novo[chaveId]) delete novo[chaveId];
    else novo[chaveId] = true;
    persistExec({ ...exec, [secao]: novo });
  };

  // Servicos dos dois lados (pra anti-erro da Montagem)
  const limpServDone = !temLimpeza
    || CHECKS_LIMPEZA.every(c => limpVal[c.id]);
  const manutServDone = !temManutencao
    || (manutChecks.length > 0 && manutChecks.every(c => manutVal[c.id]));

  const desmDone = CHECKS_DESMONTAGEM.every(c => desmVal[c.id]);
  const montDone = CHECKS_MONTAGEM.every(c => montVal[c.id]);
  const tudoDone = desmDone && limpServDone && manutServDone && montDone;

  // Aviso: diagnostico vazio mas tem manutencao no orcamento
  const semDiagnostico = temManutencao && manutChecks.length === 0;

  function concluirOficina() {
    if (!tudoDone) return;
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'teste_final');
    if (proxima) onMoverOS?.(os.numero, proxima.id);
  }

  // Gate: orcamento fechado? (apos todos os hooks, pra nao violar regras)
  const orcamentoFechado =
    os?.orcamento_status === 'confirmado' || (itens || []).length > 0;
  if (!orcamentoFechado) {
    return <BloqueioOrcamento T={T} dark={dark} os={os} itens={itens} onAbrirAba={onAbrirAba} />;
  }

  // Resumo do diagnostico pro topo
  const relatoCliente = os?.defeito || '';
  const causaDiag = os?.pre_diagnostico?.causa_diagnostico || '';
  const temResumo = relatoCliente || causaDiag || manutChecks.length > 0;

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Resumo do diagnostico */}
      {temResumo && (
        <SubBloco T={T} dark={dark} icon="stethoscope"
          label="Resumo do diagnóstico" color="blue">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {relatoCliente && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: T.textMuted,
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginBottom: 3,
                }}>Relato do cliente</div>
                <div style={{
                  fontSize: 12.5, color: T.textPrimary, lineHeight: 1.4,
                  borderLeft: `3px solid ${PALETA.yellowStrong}`, paddingLeft: 8,
                }}>{relatoCliente}</div>
              </div>
            )}
            {causaDiag && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: T.textMuted,
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginBottom: 3,
                }}>Causa identificada</div>
                <div style={{
                  fontSize: 12.5, color: T.textPrimary, lineHeight: 1.4,
                  borderLeft: `3px solid ${PALETA.blueStrong}`, paddingLeft: 8,
                }}>{causaDiag}</div>
              </div>
            )}
            {manutChecks.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: T.textMuted,
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginBottom: 4,
                }}>Componentes marcados · {manutChecks.length}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {manutChecks.map(c => (
                    <span key={c.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, padding: '3px 7px', borderRadius: 999,
                      background: c.prefix.bg, color: c.prefix.fg,
                      border: `1px solid ${c.prefix.fg}33`, fontWeight: 600,
                    }}>
                      <b style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em' }}>
                        {c.prefix.label.toUpperCase()}
                      </b>
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SubBloco>
      )}

      {/* Banner de falhas vindas do Teste final */}
      {falhas.length > 0 && (
        <SubBloco T={T} dark={dark} icon="alert-triangle"
          label="Falhas do teste final — corrigir" color="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {falhas.map((f, i) => (
              <div key={i} style={{
                fontSize: 12.5, color: T.textPrimary,
                borderLeft: `3px solid ${PALETA.redStrong}`, paddingLeft: 8,
              }}>
                {typeof f === 'string' ? f : (f.label || f.descricao || JSON.stringify(f))}
              </div>
            ))}
          </div>
        </SubBloco>
      )}

      {/* Aviso: tem manutencao mas diagnostico vazio */}
      {semDiagnostico && (
        <SubBloco T={T} dark={dark} icon="info-circle"
          label="Diagnóstico vazio" color="yellow">
          <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.4 }}>
            O orçamento tem itens de manutenção mas o diagnóstico não tem
            componentes marcados — volte e marque os componentes pra gerar o
            checklist de serviço.
          </div>
        </SubBloco>
      )}

      {/* Cards Limpeza + Manutencao lado a lado (2 colunas) */}
      {(temLimpeza || temManutencao) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: (temLimpeza && temManutencao) ? '1fr 1fr' : '1fr',
          gap: 8,
          alignItems: 'start',
        }}>
          {temLimpeza && (
            <CardLado T={T} dark={dark}
              titulo="Limpeza" icon="droplet" color="blue"
              status={os?.limpeza || 'pendente'}
              desmCheck={CHECKS_DESMONTAGEM} desmVal={desmVal}
              servCheck={CHECKS_LIMPEZA} servVal={limpVal}
              montCheck={CHECKS_MONTAGEM} montVal={montVal}
              onToggleDesm={toggleEm('desmontagem')}
              onToggleServ={toggleEm('limpeza_serv')}
              onToggleMont={toggleEm('montagem')}
              outroServDone={manutServDone}
              outroLabel="Manutenção" />
          )}
          {temManutencao && (
            <CardLado T={T} dark={dark}
              titulo="Manutenção" icon="tool" color="yellow"
              status={os?.manutencao || 'pendente'}
              desmCheck={CHECKS_DESMONTAGEM} desmVal={desmVal}
              servCheck={manutChecks} servVal={manutVal}
              montCheck={CHECKS_MONTAGEM} montVal={montVal}
              onToggleDesm={toggleEm('desmontagem')}
              onToggleServ={toggleEm('manut_serv')}
              onToggleMont={toggleEm('montagem')}
              outroServDone={limpServDone}
              outroLabel="Limpeza" />
          )}
        </div>
      )}

      {/* Caso raro: orcamento sem item identificavel */}
      {!temLimpeza && !temManutencao && (
        <SubBloco T={T} dark={dark} icon="info-circle"
          label="Orçamento sem itens" color="yellow">
          <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.4 }}>
            Adicione itens no orçamento pra liberar o conserto.
          </div>
        </SubBloco>
      )}

      {/* CTA: avancar pro Teste final */}
      <BtnMobile
        variant={tudoDone ? 'yellow' : 'ghost'}
        icon={tudoDone ? 'check' : 'lock'}
        disabled={!tudoDone}
        onClick={concluirOficina}
      >
        {tudoDone ? 'Concluir conserto · ir pro Teste final' : 'Conclua todas as etapas pra avançar'}
      </BtnMobile>
    </div>
  );
};

// ─── Tela quando orcamento ainda nao foi fechado ──────────────────────────
const ETAPAS_SEQ = [
  { id: 'recebido',    label: 'Pré-diagnóstico' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'orcamento',   label: 'Orçamento' },
  { id: 'oficina',     label: 'Conserto' },
];

function BloqueioOrcamento({ T, dark, os, itens, onAbrirAba }) {
  const statusOf = (etapaId) => {
    if (etapaId === 'oficina') return 'now-blocked';
    if (etapaId === 'orcamento' && !(itens || []).length) return 'miss';
    return 'done';
  };

  const metaOf = (etapaId) => {
    if (etapaId === 'recebido') {
      const n = Object.keys(os?.pre_diagnostico || {}).filter(k => k !== 'checklist').length;
      return n ? 'feito' : 'feito';
    }
    if (etapaId === 'diagnostico') {
      const marc = os?.pre_diagnostico?.componentes_marcados || {};
      const n = Object.values(marc).reduce((s, o) => s + Object.keys(o || {}).length, 0);
      return n ? `${n} componentes marcados` : 'feito';
    }
    if (etapaId === 'orcamento') {
      const n = (itens || []).length;
      return n ? `${n} itens cadastrados` : 'Pendente · sem itens cadastrados';
    }
    if (etapaId === 'oficina') return 'vai liberar quando o orçamento for fechado';
    return null;
  };

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <NowCard
        icon="tool"
        titulo="em oficina"
        descricao="Antes de executar, você precisa fechar o orçamento."
      />
      <div className="idemaq-card" style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: MOBILE.radiusCard, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: T.textMuted, fontWeight: 700,
          letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          <TI name="alert-triangle" size={14} color={PALETA.yellowStrong} />
          ETAPA ANTERIOR PENDENTE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ETAPAS_SEQ.map((step, idx) => {
            const status = statusOf(step.id);
            const meta = metaOf(step.id);
            const isLast = idx === ETAPAS_SEQ.length - 1;
            const palette = {
              done: { bg: PALETA.greenBg, fg: PALETA.greenStrong, bd: '#7DC09F' },
              miss: { bg: PALETA.yellow,  fg: PALETA.yellowStrong, bd: '#E5BD3E' },
              'now-blocked': { bg: '#F1F3F6', fg: T.textMuted, bd: '#D1D5DB' },
            }[status];
            const connColor = status === 'done' ? PALETA.greenStrong
                            : status === 'miss' ? PALETA.yellow : T.border;
            return (
              <div key={step.id} style={{ display: 'flex', gap: 12, padding: '8px 0', position: 'relative' }}>
                {!isLast && (
                  <span style={{
                    position: 'absolute', left: 13, top: 32, bottom: -8,
                    width: 2, background: connColor, zIndex: 1,
                  }} />
                )}
                <span style={{
                  width: 28, height: 28, borderRadius: 99,
                  background: palette.bg, color: palette.fg,
                  border: `2px ${status === 'now-blocked' ? 'dashed' : 'solid'} ${palette.bd}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0, zIndex: 2,
                  fontFamily: 'ui-monospace,monospace',
                }}>
                  {status === 'done' ? <TI name="check" size={14} /> : (idx + 1)}
                </span>
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: status === 'now-blocked' ? T.textMuted : T.textPrimary,
                  }}>
                    {step.label}{step.id === 'oficina' && ' · você está aqui'}
                  </div>
                  {meta && (
                    <div style={{
                      fontSize: 11.5, marginTop: 2,
                      color: status === 'miss' ? PALETA.yellowStrong : T.textMuted,
                      fontWeight: status === 'miss' ? 600 : 500,
                    }}>
                      {status === 'miss' && <b style={{ fontWeight: 700 }}>Pendente</b>}
                      {status === 'miss' && meta.replace(/^Pendente · /, ' · ')}
                      {status !== 'miss' && meta}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <BtnMobile variant="yellow" icon="arrow-back-up"
          onClick={() => onAbrirAba?.('pagamento')}>
          Voltar pro Orçamento
        </BtnMobile>
      </div>
    </div>
  );
}

export default AcaoOficina;
