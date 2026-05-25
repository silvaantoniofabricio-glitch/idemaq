import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, NowCard, Group, Input, TextArea, BtnMobile, PALETA, Pill,
} from '../../_shared/PrimitivasMobile';
import { CATEGORIAS_PECA, GRUPOS_CATEGORIA } from '../../../utils/categoriasPeca';

// Deriva grupos e itens das categorias do estoque — única fonte da verdade
const ICON_MAP = {
  motor:     'engine',
  agua:      'droplet',
  eletrico:  'bolt',
  estrutura: 'tool',
  acabamento: 'package',
  outros:    'puzzle',
};

const GRUPOS_PADRAO = Object.entries(GRUPOS_CATEGORIA).map(([id, g]) => ({
  id,
  label: g.label,
  icon: ICON_MAP[id] || 'tool',
  total: CATEGORIAS_PECA.filter(c => c.grupo === id).length,
}));

const ITENS_PADRAO = Object.fromEntries(
  Object.keys(GRUPOS_CATEGORIA).map(grupoId => [
    grupoId,
    CATEGORIAS_PECA.filter(c => c.grupo === grupoId).map(c => ({ id: c.id, label: c.label })),
  ])
);

const PRE_TONES = {
  ok:      { tone: 'green',  icon: 'check' },
  defeito: { tone: 'red',    icon: 'alert-triangle' },
  barulho: { tone: 'yellow', icon: 'volume' },
};

const ChecklistPill = ({ grupo, marcados, aberto, onClick }) => {
  const { T } = useTheme();
  return (
    <button type="button" onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${aberto ? PALETA.blue : T.border}`,
        borderRadius: 12, padding: '10px 12px', minHeight: 60,
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center', gap: 4,
        cursor: 'pointer', textAlign: 'left',
        boxShadow: aberto ? `0 0 0 2px ${PALETA.blueBg}` : 'none',
        transition: 'box-shadow .12s, border-color .12s',
      }}>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 600, color: T.textPrimary,
      }}>
        <TI name={grupo.icon} size={16} color={PALETA.blueStrong} />
        {grupo.label}
      </span>
      <span style={{
        fontSize: 11, letterSpacing: '.04em',
        color: marcados > 0 ? PALETA.blueStrong : T.textMuted,
        fontWeight: marcados > 0 ? 700 : 500,
      }}>
        {marcados} / {grupo.total} {marcados > 0 ? 'marcados' : ''}
      </span>
    </button>
  );
};

const ItensDoGrupo = ({ itens, marcados, onToggle }) => {
  const { T } = useTheme();
  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 12, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {itens.map((it, idx) => {
        const ativo = marcados.includes(it.id);
        return (
          <button key={it.id} type="button" onClick={() => onToggle(it.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', fontSize: 14, border: 'none',
              background: ativo ? PALETA.blueBg : T.card,
              borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
              cursor: 'pointer', width: '100%', textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              border: `1.5px solid ${ativo ? PALETA.blueStrong : '#D1D5DB'}`,
              background: ativo ? PALETA.blue : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}>
              {ativo && <TI name="check" size={14} />}
            </span>
            <span style={{
              flex: 1, color: ativo ? PALETA.blueStrong : T.textPrimary,
              fontWeight: ativo ? 600 : 500,
            }}>{it.label}</span>
            {it.acao && (
              <span style={{
                fontSize: 11, color: ativo ? PALETA.blueStrong : T.textMuted,
                fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
              }}>{it.acao}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};


const AcaoDiagnostico = ({ os, onUpdateOS }) => {
  const { T } = useTheme();
  const [causa, setCausa] = useState(os?.diagnostico?.causa || '');
  const [busca, setBusca] = useState('');
  const [grupoAberto, setGrupoAberto] = useState(null);

  const grupos = os?.checklistGrupos || GRUPOS_PADRAO;
  const marcadosPorGrupo = os?.checklistMarcados || {};
  const preDiag = os?.preDiagnostico || {};
  const testesComResultado = Object.entries(preDiag);

  const itensAtuais = useMemo(() => {
    if (!grupoAberto) return [];
    const base = os?.itensPorGrupo?.[grupoAberto] || ITENS_PADRAO[grupoAberto] || [];
    if (!busca.trim()) return base;
    const q = busca.toLowerCase();
    return base.filter(i => i.label.toLowerCase().includes(q));
  }, [grupoAberto, busca, os?.itensPorGrupo]);

  const toggleItem = (itemId) => onUpdateOS?.({
    action: 'toggle_checklist_item', grupo: grupoAberto, item: itemId,
  });

  const updateCausa = (v) => {
    setCausa(v);
    onUpdateOS?.({ action: 'set_causa', causa: v });
  };

  const totalMarcados = Object.values(marcadosPorGrupo).reduce(
    (s, arr) => s + (arr?.length || 0), 0
  );
  const podeConcluir = causa.trim().length > 0 && totalMarcados > 0;

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <NowCard icon="stethoscope" titulo="diagnóstico técnico"
               descricao="Descreva a causa e marque os itens que precisam de manutenção ou troca." />

      {testesComResultado.length > 0 && (
        <div className="idemaq-card" style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 11, color: T.textMuted, fontWeight: 700,
            letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TI name="clipboard-check" size={13} color={PALETA.blueStrong} />
              PRÉ-DIAGNÓSTICO
            </span>
            {os?.preDiagnosticoHaMin && (
              <span style={{
                color: T.textMuted, fontWeight: 500,
                textTransform: 'none', letterSpacing: 0,
              }}>há {os.preDiagnosticoHaMin}min</span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {testesComResultado.map(([testeId, resultado]) => {
              const meta = PRE_TONES[resultado] || PRE_TONES.ok;
              const testeLabel = os?.testesPreDiagnostico?.find(
                t => t.id === testeId
              )?.label || testeId;
              return (
                <Pill key={testeId} tone={meta.tone} icon={meta.icon}>
                  {testeLabel}
                </Pill>
              );
            })}
          </div>
        </div>
      )}

      <Group label={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <TI name="message-2" size={13} color={PALETA.blueStrong} />
          CAUSA IDENTIFICADA
        </span>
      )}>
        <TextArea placeholder="Ex: Rolamento do tambor desgastado, correia rompida…"
                  value={causa} onChange={(e) => updateCausa(e.target.value)} />
      </Group>

      <Group label={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <TI name="list-check" size={13} color={PALETA.blueStrong} />
          CHECKLIST DE COMPONENTES
        </span>
      )}>
        <Input icon="search" placeholder="Buscar componente…"
               value={busca} onChange={(e) => setBusca(e.target.value)} />

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4,
        }}>
          {grupos.map(g => (
            <ChecklistPill key={g.id} grupo={g}
              marcados={(marcadosPorGrupo[g.id] || []).length}
              aberto={grupoAberto === g.id}
              onClick={() => setGrupoAberto(grupoAberto === g.id ? null : g.id)} />
          ))}
        </div>

        {grupoAberto && itensAtuais.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <ItensDoGrupo itens={itensAtuais}
              marcados={marcadosPorGrupo[grupoAberto] || []}
              onToggle={toggleItem} />
          </div>
        )}

        {grupoAberto && itensAtuais.length === 0 && (
          <div style={{
            background: T.card, border: `1px dashed ${T.border}`,
            borderRadius: 12, padding: 14, textAlign: 'center',
            fontSize: 13, color: T.textMuted,
          }}>Nenhum item encontrado nesse grupo.</div>
        )}

        <BtnMobile variant="yellow" icon="check" disabled={!podeConcluir}
          onClick={() => onUpdateOS?.({ action: 'concluir_diagnostico', causa })}
          style={{ marginTop: 6 }}>
          Concluir diagnóstico
        </BtnMobile>
      </Group>
    </div>
  );
};

export default AcaoDiagnostico;
