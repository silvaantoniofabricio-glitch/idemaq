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

export default function AcaoRecebido({ os, onMoverOS }) {
  const { itens: chkItens, observacoes: chkObs, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'recebido');

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  );
  const [obs, setObs] = useState('');
  const [hidratado, setHidratado] = useState(false);
  const [salvando, setSalvando] = useState(false);

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
    return TESTES.map(t => ({
      id: t.id, label: t.label,
      checked: testes[t.id] === 'ok',
      valor: testes[t.id] || null,
    }));
  }

  // Auto-save: salva o checklist sempre que `testes` ou `obs` mudam,
  // com debounce de 500ms. Garante que dados nao sao perdidos se o
  // user fechar a OS antes de clicar "Avancar".
  useEffect(() => {
    if (!hidratado) return;  // Espera hidratar antes de salvar
    const t = setTimeout(() => {
      salvarChk(serializarChecklist(), obs || null);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testes, obs, hidratado]);

  async function avancar() {
    setSalvando(true);
    await salvarChk(serializarChecklist(), obs || null);
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico');
    setSalvando(false);
    if (proxima) onMoverOS(os.numero, proxima.id);
  }

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null);

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

      {/* SUB-BLOCO 2: Checklist de testes (4 funções com OK/Defeito/Barulho) */}
      <SubBloco T={T} dark={dark} icon="clipboard-check" label="Testes de funcionamento" color="blue">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TESTES.map(t => (
            <TesteCard key={t.id}
              teste={t}
              valor={testes[t.id]}
              onChange={(v) => setResultado(t.id, v)} />
          ))}
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
        disabled={!todosPreenchidos || salvando}
        style={{
          minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none',
          background: todosPreenchidos ? PALETA.yellow : T.cardAlt,
          color: todosPreenchidos ? '#0a0a0d' : T.textDim,
          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
          cursor: (todosPreenchidos && !salvando) ? 'pointer' : 'not-allowed',
          opacity: (todosPreenchidos && !salvando) ? 1 : 0.55,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <TI name="arrow-right" size={14} />
        {salvando ? 'Salvando…'
          : todosPreenchidos ? 'Avançar pro Diagnóstico'
          : `Preencha os ${TESTES.length} testes`}
      </button>
    </div>
  );
}
