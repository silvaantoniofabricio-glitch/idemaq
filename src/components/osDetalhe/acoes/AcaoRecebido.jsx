// src/components/osDetalhe/acoes/AcaoRecebido.jsx
// Pré-diagnóstico de recebimento (Avaliação): registra estado inicial da
// máquina antes de enviar pro diagnóstico. Persiste via checklist_etapa.
// V2: padrão Orçamento/Agenda — HeaderFlat + SubBloco com cards compactos.

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, NowCard, Group, TextArea, BtnMobile, MOBILE, PALETA,
} from '../../_shared/PrimitivasMobile';
import { ETAPAS_TODOS } from '../../../utils/osData';
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa';

// ─── Sub-card compacto (igual ao da Agenda/Coleta V2) ─────────────────────
function SubBloco({ T, dark, icon, label, color = 'blue', children }) {
  const colorMap = {
    blue:   { fg: PALETA.blueStrong,   bg: dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg },
    yellow: { fg: PALETA.yellowStrong, bg: dark ? 'rgba(255,217,102,0.18)' : PALETA.yellowBg },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
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
      </div>
      <div style={{ padding: '10px 12px' }}>{children}</div>
    </div>
  );
}

const TESTES = [
  { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'droplet' },
  { id: 'saida_agua',    label: 'Saída de água',    icon: 'droplet-off' },
  { id: 'agitacao',      label: 'Agitação',         icon: 'refresh' },
  { id: 'centrifugacao', label: 'Centrifugação',    icon: 'rotate-clockwise' },
];

const RESULTADO_THEMES = {
  ok:      { icon: 'check',           label: 'OK',      bg: PALETA.greenBg,  fg: PALETA.greenStrong,  bd: '#7DC09F' },
  defeito: { icon: 'alert-triangle',  label: 'Defeito', bg: PALETA.redBg,    fg: PALETA.redStrong,    bd: '#E89B9B' },
  barulho: { icon: 'volume',          label: 'Barulho', bg: PALETA.yellowBg, fg: PALETA.yellowStrong, bd: '#E5BD3E' },
};

const SegOption = ({ kind, selected, onClick, compact }) => {
  const { T } = useTheme();
  const th = RESULTADO_THEMES[kind];
  return (
    <button type="button" onClick={onClick}
      title={th.label}
      style={{
        minHeight: 38, borderRadius: 8,
        padding: compact ? '0 4px' : '0 8px',
        border: `1px solid ${selected ? th.bd : T.border}`,
        background: selected ? th.bg : T.card,
        color: selected ? th.fg : T.textPrimary,
        fontSize: 12, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
        fontFamily: 'inherit',
        overflow: 'hidden', minWidth: 0,
    }}>
      <TI name={th.icon} size={14} color={selected ? th.fg : T.textMuted} />
      {/* Label do botão só aparece quando há espaço (>= 60px) */}
      {!compact && <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{th.label}</span>}
    </button>
  );
};

const TesteCard = ({ teste, valor, onChange }) => {
  const { T } = useTheme();
  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radiusCard, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {/* Label à esquerda — flex compartilhado com botões */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
        flex: '1 1 100px', minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        <TI name={teste.icon} size={16} color={PALETA.blueStrong} />
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{teste.label}</span>
      </div>
      {/* 3 botões: flex 2 — ganha mais espaço que a label, mas ambos
          compartilham quando estreito. minmax garante que os botões
          encolhem juntos sem estourar. */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 4, flex: '2 1 180px', minWidth: 0,
      }}>
        {(['ok', 'defeito', 'barulho']).map(k => (
          <SegOption key={k} kind={k}
            selected={valor === k}
            onClick={() => onChange(valor === k ? null : k)} />
        ))}
      </div>
    </div>
  );
};

export default function AcaoRecebido({ os, onMoverOS, onUpdateOS }) {
  const { itens: chkItens, observacoes: chkObs, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'recebido');

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  );
  const [obs, setObs] = useState('');
  const [naoLiga, setNaoLiga] = useState(false);
  const [motivoNaoLiga, setMotivoNaoLiga] = useState('');
  const [vazamentos, setVazamentos] = useState({ entrada: false, saida: false, agitacao: false });
  const [hidratado, setHidratado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Hidrata flags do pre_diagnostico jsonb (equipamento_nao_liga + motivo + vazamentos)
  useEffect(() => {
    setNaoLiga(!!os?.pre_diagnostico?.equipamento_nao_liga);
    setMotivoNaoLiga(os?.pre_diagnostico?.motivo_nao_liga || '');
    setVazamentos({
      entrada:  !!os?.pre_diagnostico?.vazamentos?.entrada,
      saida:    !!os?.pre_diagnostico?.vazamentos?.saida,
      agitacao: !!os?.pre_diagnostico?.vazamentos?.agitacao,
    });
  }, [os?.id, os?.pre_diagnostico?.equipamento_nao_liga, os?.pre_diagnostico?.motivo_nao_liga, os?.pre_diagnostico?.vazamentos]);

  useEffect(() => {
    if (loadingChk || hidratado) return;
    const novoTestes = TESTES.reduce((acc, t) => {
      const found = chkItens.find(i => i.id === t.id);
      return { ...acc, [t.id]: found?.valor ?? null };
    }, {});
    setTestes(novoTestes);
    setObs(chkObs || '');
    setHidratado(true);
  }, [loadingChk, chkItens, chkObs, hidratado]);

  function setResultado(testeId, valor) {
    setTestes(prev => ({ ...prev, [testeId]: valor }));
  }

  function serializarChecklist() {
    // Se equipamento nao liga, todos viram 'na' (nao foi possivel testar)
    return TESTES.map(t => ({
      id: t.id, label: t.label,
      checked: naoLiga ? false : testes[t.id] === 'ok',
      valor: naoLiga ? 'na' : (testes[t.id] || null),
    }));
  }

  // Auto-save dos testes (debounce 500ms)
  useEffect(() => {
    if (!hidratado) return;
    const t = setTimeout(() => {
      salvarChk(serializarChecklist(), obs || null);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testes, obs, naoLiga, hidratado]);

  // Persiste flags em pre_diagnostico (naoLiga + motivo + vazamentos) — debounce 500ms
  useEffect(() => {
    if (!hidratado) return;
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, {
        pre_diagnostico: {
          ...(os.pre_diagnostico || {}),
          equipamento_nao_liga: naoLiga,
          motivo_nao_liga: naoLiga ? motivoNaoLiga : null,
          vazamentos: vazamentos,
        },
      });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naoLiga, motivoNaoLiga, vazamentos, hidratado]);

  async function avancar() {
    setSalvando(true);
    await salvarChk(serializarChecklist(), obs || null);
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico');
    setSalvando(false);
    if (proxima) onMoverOS(os.numero, proxima.id);
  }

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null);
  // Pode avançar se: equipamento nao liga (qualquer estado) OU todos testes preenchidos
  const podeAvancar = naoLiga || todosPreenchidos;

  const { T, dark } = useTheme();
  const relatoCliente = os?.defeito || '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* SUB-BLOCO 1: Relato do cliente — texto livre vindo da abertura da OS */}
      <SubBloco T={T} dark={dark} icon="user" label="Relato do cliente" color="blue">
        {relatoCliente ? (
          <div style={{
            fontSize: 13, color: T.textPrimary, lineHeight: 1.4,
            borderLeft: `3px solid ${PALETA.yellowStrong}`, paddingLeft: 10,
          }}>
            {relatoCliente}
          </div>
        ) : (
          <div style={{
            fontSize: 12, color: T.textMuted, fontStyle: 'italic',
          }}>
            Sem relato registrado na abertura da OS.
          </div>
        )}
      </SubBloco>

      {/* SUB-BLOCO 2: Checklist de testes — com toggle "nao liga" no topo */}
      <SubBloco T={T} dark={dark} icon="clipboard-check" label="Testes de funcionamento" color="blue">
        {/* Toggle "Equipamento não liga" */}
        <button type="button" onClick={() => setNaoLiga(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 7, marginBottom: 8,
            background: naoLiga
              ? (dark ? 'rgba(192,66,66,0.18)' : '#FDECEC')
              : (dark ? 'rgba(255,255,255,0.03)' : T.cardAlt),
            border: `1px solid ${naoLiga ? (dark ? 'rgba(192,66,66,0.40)' : '#E89B9B') : T.border}`,
            cursor: 'pointer', fontFamily: 'inherit', width: '100%',
            textAlign: 'left', WebkitTapHighlightColor: 'transparent',
          }}>
          <span style={{
            width: 36, height: 20, borderRadius: 999, flexShrink: 0,
            background: naoLiga ? (dark ? '#FF8888' : PALETA.redStrong) : T.border,
            position: 'relative',
            transition: 'background .15s',
          }}>
            <span style={{
              position: 'absolute',
              top: 2, left: naoLiga ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff',
              transition: 'left .15s',
              boxShadow: '0 1px 3px rgba(0,0,0,.3)',
            }} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: naoLiga ? (dark ? '#FF8888' : PALETA.redStrong) : T.textPrimary,
            }}>
              ⚡ Equipamento não liga
            </div>
            {!naoLiga && (
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                Ative se a máquina não tem energia / pula os 4 testes
              </div>
            )}
          </div>
        </button>

        {/* Textarea "O que aconteceu?" — só aparece quando naoLiga */}
        {naoLiga && (
          <textarea
            placeholder="O que aconteceu? Ex: cabo de força arrancado, fonte queimada, painel sem reação…"
            value={motivoNaoLiga}
            onChange={(e) => setMotivoNaoLiga(e.target.value)}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.bg, color: T.textPrimary,
              fontSize: 12.5, fontFamily: 'inherit',
              outline: 'none', resize: 'vertical',
              marginBottom: 8,
            }}
          />
        )}

        {/* Testes — disabled quando naoLiga */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          opacity: naoLiga ? 0.4 : 1,
          pointerEvents: naoLiga ? 'none' : 'auto',
        }}>
          {TESTES.map(t => (
            <TesteCard key={t.id}
              teste={t}
              valor={naoLiga ? null : testes[t.id]}
              onChange={(v) => setResultado(t.id, v)} />
          ))}
        </div>

        {/* Vazamentos — sub-secao dentro do bloco. Marque onde vazou.
            Nenhum marcado = sem vazamento (OK). */}
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: `1px dashed ${T.border}`,
          opacity: naoLiga ? 0.4 : 1,
          pointerEvents: naoLiga ? 'none' : 'auto',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10.5, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.04em',
            marginBottom: 6,
          }}>
            <TI name="droplet" size={11} color={PALETA.blueStrong} />
            Vazamentos · marque onde estiver vazando
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
          }}>
            {[
              { id: 'entrada',  label: 'Entrada',  icon: 'droplet' },
              { id: 'saida',    label: 'Saída',    icon: 'droplet-off' },
              { id: 'agitacao', label: 'Agitação', icon: 'refresh' },
            ].map(v => {
              const ativo = vazamentos[v.id];
              return (
                <button key={v.id} type="button"
                  onClick={() => setVazamentos(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
                  style={{
                    minHeight: 32, padding: '0 8px', borderRadius: 7,
                    background: ativo
                      ? (dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg)
                      : T.bg,
                    border: `1px solid ${ativo ? PALETA.blueStrong : T.border}`,
                    color: ativo ? (dark ? PALETA.blue : PALETA.blueStrong) : T.textPrimary,
                    fontSize: 11.5, fontWeight: ativo ? 700 : 500,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer', fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  <TI name={v.icon} size={12} />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </SubBloco>

      {/* SUB-BLOCO 3: Observações */}
      <SubBloco T={T} dark={dark} icon="message-2" label="Observações" color="blue">
        <textarea
          placeholder="Ex: máquina chegou com cabo arrancado, painel arranhado…"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px', borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.bg, color: T.textPrimary,
            fontSize: 12.5, fontFamily: 'inherit',
            outline: 'none', resize: 'vertical',
          }}
        />
      </SubBloco>

      {/* CTA compacto amarelo — avança pro Diagnóstico */}
      <button onClick={avancar}
        disabled={!podeAvancar || salvando}
        style={{
          minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none',
          background: podeAvancar ? PALETA.yellow : T.cardAlt,
          color: podeAvancar ? '#0a0a0d' : T.textDim,
          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
          cursor: (podeAvancar && !salvando) ? 'pointer' : 'not-allowed',
          opacity: (podeAvancar && !salvando) ? 1 : 0.55,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <TI name="arrow-right" size={14} />
        {salvando ? 'Salvando…'
          : naoLiga ? 'Avançar pro Diagnóstico'
          : podeAvancar ? 'Avançar pro Diagnóstico'
          : `Preencha os ${TESTES.length} testes`}
      </button>
    </div>
  );
}
