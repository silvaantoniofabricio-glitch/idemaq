import React, { useState } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, NowCard, Group, TextArea, MOBILE, PALETA,
} from '../../_shared/PrimitivasMobile';

const TESTES_PADRAO = [
  { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'droplet' },
  { id: 'saida_agua',    label: 'Saída de água',    icon: 'droplet-off' },
  { id: 'agitacao',      label: 'Agitação',         icon: 'refresh' },
  { id: 'centrifugacao', label: 'Centrifugação',    icon: 'rotate-clockwise' },
  { id: 'painel',        label: 'Painel / botões',  icon: 'device-laptop' },
];

const RESULTADO_THEMES = {
  ok: {
    icon: 'check',
    label: 'OK',
    bg:    PALETA.greenBg,
    fg:    PALETA.greenStrong,
    bd:    '#7DC09F',
  },
  defeito: {
    icon: 'alert-triangle',
    label: 'Defeito',
    bg:    PALETA.redBg,
    fg:    PALETA.redStrong,
    bd:    '#E89B9B',
  },
  barulho: {
    icon: 'volume',
    label: 'Barulho',
    bg:    PALETA.yellowBg,
    fg:    PALETA.yellowStrong,
    bd:    '#E5BD3E',
  },
};

const SegOption = ({ kind, selected, onClick }) => {
  const { T } = useTheme();
  const th = RESULTADO_THEMES[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: MOBILE.segHeight,
        borderRadius: 10,
        border: `1px solid ${selected ? th.bd : T.border}`,
        background: selected ? th.bg : T.card,
        color: selected ? th.fg : T.textPrimary,
        fontSize: 13, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}
    >
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
    borderRadius: MOBILE.radiusCard, padding: 12,
    display: 'flex', flexDirection: 'column', gap: 10,
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 14.5, fontWeight: 600, color: T.textPrimary,
    }}>
      <TI name={teste.icon} size={18} color={PALETA.blueStrong} />
      {teste.label}
    </div>
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
    }}>
      {(['ok', 'defeito', 'barulho']).map(k => (
        <SegOption
          key={k}
          kind={k}
          selected={valor === k}
          onClick={() => onChange(valor === k ? null : k)}
        />
      ))}
    </div>
  </div>
  );
};

const AcaoRecebido = ({ os, onUpdateOS }) => {
  const [resultados, setResultados] = useState(os?.preDiagnostico || {});
  const [obs, setObs] = useState(os?.preDiagnosticoObs || '');

  const setResultado = (testeId, valor) => {
    const next = { ...resultados, [testeId]: valor };
    setResultados(next);
    onUpdateOS?.({ action: 'set_pre_diagnostico', resultados: next });
  };

  const setObservacao = (v) => {
    setObs(v);
    onUpdateOS?.({ action: 'set_pre_diagnostico_obs', obs: v });
  };

  const testes = os?.testesPreDiagnostico?.length
    ? os.testesPreDiagnostico
    : TESTES_PADRAO;

  return (
    <div style={{
      padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <NowCard
        icon="clipboard-check"
        titulo="pré-diagnóstico"
        descricao={<>Teste cada função e marque <b>OK</b>, <b>Defeito</b> ou <b>Barulho</b>.</>}
      />

      {testes.map(t => (
        <TesteCard
          key={t.id}
          teste={t}
          valor={resultados[t.id]}
          onChange={(v) => setResultado(t.id, v)}
        />
      ))}

      <Group label="Observações do pré-diagnóstico">
        <TextArea
          icon="message-2"
          placeholder="Ex: máquina chegou com o cabo arrancado, painel arranhado…"
          value={obs}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </Group>
    </div>
  );
};

export default AcaoRecebido;
