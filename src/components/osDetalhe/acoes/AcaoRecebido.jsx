// src/components/osDetalhe/acoes/AcaoRecebido.jsx
// Pré-diagnóstico de recebimento: registra estado inicial da máquina antes
// de enviar pro diagnóstico. Persiste via checklist_etapa (etapa='recebido').
// UI mobile-first: cards de teste com SegOption (OK/Defeito/Barulho).

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, NowCard, Group, TextArea, BtnMobile, MOBILE, PALETA,
} from '../../_shared/PrimitivasMobile';
import { ETAPAS_TODOS } from '../../../utils/osData';
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa';

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

const SegOption = ({ kind, selected, onClick }) => {
  const { T } = useTheme();
  const th = RESULTADO_THEMES[kind];
  return (
    <button type="button" onClick={onClick} style={{
      height: MOBILE.segHeight, borderRadius: 10,
      border: `1px solid ${selected ? th.bd : T.border}`,
      background: selected ? th.bg : T.card,
      color: selected ? th.fg : T.textPrimary,
      fontSize: 13, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      transition: 'background .12s, border-color .12s',
      fontFamily: 'inherit',
    }}>
      <TI name={th.icon} size={15} color={selected ? th.fg : T.textMuted} />
      {th.label}
    </button>
  );
};

const TesteCard = ({ teste, valor, onChange }) => {
  const { T } = useTheme();
  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radiusCard, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Label à esquerda */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 14, fontWeight: 600, color: T.textPrimary,
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        <TI name={teste.icon} size={17} color={PALETA.blueStrong} />
        {teste.label}
      </div>
      {/* 3 botões à direita, mesma altura, fixos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, flexShrink: 0, width: 270 }}>
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

  async function avancar() {
    setSalvando(true);
    await salvarChk(serializarChecklist(), obs || null);
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico');
    setSalvando(false);
    if (proxima) onMoverOS(os.numero, proxima.id);
  }

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null);

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <NowCard
        icon="clipboard-check"
        titulo="pré-diagnóstico"
        descricao={<>Teste cada função e marque <b>OK</b>, <b>Defeito</b> ou <b>Barulho</b>.</>}
      />

      {TESTES.map(t => (
        <TesteCard key={t.id}
          teste={t}
          valor={testes[t.id]}
          onChange={(v) => setResultado(t.id, v)} />
      ))}

      <Group label={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <TI name="message-2" size={13} color={PALETA.blueStrong} />
          OBSERVAÇÕES
        </span>
      )}>
        <TextArea
          placeholder="Ex: máquina chegou com cabo arrancado, painel arranhado…"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </Group>

      <BtnMobile variant="blue" icon="arrow-right"
        disabled={!todosPreenchidos || salvando}
        onClick={avancar}>
        {salvando ? 'Salvando…' : todosPreenchidos
          ? 'Salvar e ir para Diagnóstico'
          : `Preencha os ${TESTES.length} testes`}
      </BtnMobile>
    </div>
  );
}
