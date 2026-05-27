// src/components/osDetalhe/acoes/AcaoDiagnostico.jsx
// Etapa Diagnóstico — V2 com padrão Orçamento/Agenda/Recebido.
// 3 sub-blocos: Pré-diagnóstico (resumo) + Causa identificada + Checklist
// de componentes. CTA amarelo "Concluir diagnóstico" avança pra Orçamento.

import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, Input, PALETA, Pill,
} from '../../_shared/PrimitivasMobile';
import { CATEGORIAS_PECA, GRUPOS_CATEGORIA } from '../../../utils/categoriasPeca';
import { ETAPAS_TODOS } from '../../../utils/osData';
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa';

// Deriva grupos e itens das categorias do estoque
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

// ─── SubBloco compacto (mesmo padrão V2 das outras etapas) ────────────────
function SubBloco({ T, dark, icon, label, color = 'blue', children, action }) {
  const colorMap = {
    blue:   { fg: PALETA.blueStrong,   bg: dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg },
    yellow: { fg: PALETA.yellowStrong, bg: dark ? 'rgba(255,217,102,0.18)' : PALETA.yellowBg },
    green:  { fg: PALETA.greenStrong,  bg: dark ? 'rgba(46,125,94,0.18)' : PALETA.greenBg },
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
        {action}
      </div>
      <div style={{ padding: '10px 12px' }}>{children}</div>
    </div>
  );
}

// ─── Pill compacta de grupo (Motor, Água, Elétrico...) ────────────────────
const GrupoChip = ({ T, grupo, marcados, aberto, onClick }) => (
  <button type="button" onClick={onClick}
    style={{
      background: aberto ? PALETA.blueBg : T.bg,
      border: `1px solid ${aberto ? PALETA.blueStrong : T.border}`,
      borderRadius: 8, padding: '7px 9px', minHeight: 48,
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center', gap: 2,
      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      WebkitTapHighlightColor: 'transparent',
    }}>
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600, color: aberto ? PALETA.blueStrong : T.textPrimary,
    }}>
      <TI name={grupo.icon} size={13} color={aberto ? PALETA.blueStrong : T.textMuted} />
      {grupo.label}
    </span>
    <span style={{
      fontSize: 10, color: marcados > 0 ? PALETA.blueStrong : T.textMuted,
      fontWeight: marcados > 0 ? 700 : 500,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {marcados}/{grupo.total}{marcados > 0 ? ' marcados' : ''}
    </span>
  </button>
);

// ─── Lista de itens do grupo aberto ───────────────────────────────────────
const ItensDoGrupo = ({ T, itens, marcados, onToggle }) => (
  <div style={{
    background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: 8, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  }}>
    {itens.map((it, idx) => {
      const ativo = marcados.includes(it.id);
      return (
        <button key={it.id} type="button" onClick={() => onToggle(it.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', fontSize: 13, border: 'none',
            background: ativo ? (PALETA.blueBg + '88') : 'transparent',
            borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
            cursor: 'pointer', width: '100%', textAlign: 'left',
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4,
            border: `1.5px solid ${ativo ? PALETA.blueStrong : '#D1D5DB'}`,
            background: ativo ? PALETA.blue : 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
          }}>
            {ativo && <TI name="check" size={12} />}
          </span>
          <span style={{
            flex: 1, color: ativo ? PALETA.blueStrong : T.textPrimary,
            fontWeight: ativo ? 600 : 500,
          }}>{it.label}</span>
        </button>
      );
    })}
  </div>
);

const AcaoDiagnostico = ({ os, onUpdateOS, onMoverOS }) => {
  const { T, dark } = useTheme();

  // Hidrata estado de pre_diagnostico.causa + componentes_marcados
  const preDiagSalvo = os?.pre_diagnostico || {};
  const [causa, setCausa] = useState(preDiagSalvo.causa_diagnostico || '');
  const [marcadosPorGrupo, setMarcadosPorGrupo] = useState(
    preDiagSalvo.componentes_marcados || {}
  );
  const [busca, setBusca] = useState('');
  const [grupoAberto, setGrupoAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Re-sincroniza se a OS mudar (Realtime)
  useEffect(() => {
    setCausa(os?.pre_diagnostico?.causa_diagnostico || '');
    setMarcadosPorGrupo(os?.pre_diagnostico?.componentes_marcados || {});
  }, [os?.id]);

  // Resumo dos testes do Pré-diagnóstico (vem do checklist_etapa='recebido')
  const { itens: chkRecebido } = useChecklistEtapa(os.id, 'recebido');
  const testesComResultado = useMemo(
    () => (chkRecebido || []).filter(t => t.valor),
    [chkRecebido]
  );

  const grupos = GRUPOS_PADRAO;
  const itensAtuais = useMemo(() => {
    if (!grupoAberto) return [];
    const base = ITENS_PADRAO[grupoAberto] || [];
    if (!busca.trim()) return base;
    const q = busca.toLowerCase();
    return base.filter(i => i.label.toLowerCase().includes(q));
  }, [grupoAberto, busca]);

  const toggleItem = (itemId) => {
    setMarcadosPorGrupo(prev => {
      const atual = prev[grupoAberto] || [];
      const novo = atual.includes(itemId)
        ? atual.filter(x => x !== itemId)
        : [...atual, itemId];
      return { ...prev, [grupoAberto]: novo };
    });
  };

  const totalMarcados = Object.values(marcadosPorGrupo).reduce(
    (s, arr) => s + (arr?.length || 0), 0
  );
  const podeConcluir = causa.trim().length > 0 && totalMarcados > 0;

  // Persist causa via onBlur (debounce simples)
  const persistCausa = () => {
    if (causa === (preDiagSalvo.causa_diagnostico || '')) return;
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        causa_diagnostico: causa,
      },
    });
  };

  async function concluir() {
    if (!podeConcluir) return;
    setSalvando(true);
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        causa_diagnostico: causa,
        componentes_marcados: marcadosPorGrupo,
      },
    });
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'orcamento');
    setSalvando(false);
    if (proxima) onMoverOS?.(os.numero, proxima.id);
  }

  const relatoCliente = os?.defeito || '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* SUB-BLOCO 1: Relato do cliente */}
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

      {/* SUB-BLOCO 2: Resumo da avaliação — sempre visível.
          Se vazio, mostra placeholder pedindo pra voltar e preencher. */}
      <SubBloco T={T} dark={dark} icon="clipboard-check" label="Resumo da avaliação" color="blue">
        {testesComResultado.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {testesComResultado.map(t => {
              const meta = PRE_TONES[t.valor] || PRE_TONES.ok;
              return (
                <Pill key={t.id} tone={meta.tone} icon={meta.icon}>
                  {t.label || t.id}
                </Pill>
              );
            })}
          </div>
        ) : (
          <div style={{
            fontSize: 12, color: T.textMuted, fontStyle: 'italic',
          }}>
            Nenhum teste registrado na etapa de Avaliação.
          </div>
        )}
      </SubBloco>

      {/* SUB-BLOCO 2: Causa identificada */}
      <SubBloco T={T} dark={dark} icon="message-2" label="Causa identificada" color="blue">
        <textarea
          placeholder="Ex: Rolamento do tambor desgastado, correia rompida…"
          value={causa}
          onChange={(e) => setCausa(e.target.value)}
          onBlur={persistCausa}
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

      {/* SUB-BLOCO 3: Checklist de componentes */}
      <SubBloco T={T} dark={dark} icon="list-check" label="Checklist de componentes" color="blue">
        {/* Busca */}
        <input
          type="search" placeholder="Buscar componente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 10px', borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.bg, color: T.textPrimary,
            fontSize: 12.5, fontFamily: 'inherit',
            outline: 'none', marginBottom: 8,
          }}
        />

        {/* Grid de grupos */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
        }}>
          {grupos.map(g => (
            <GrupoChip key={g.id} T={T} grupo={g}
              marcados={(marcadosPorGrupo[g.id] || []).length}
              aberto={grupoAberto === g.id}
              onClick={() => setGrupoAberto(grupoAberto === g.id ? null : g.id)} />
          ))}
        </div>

        {/* Lista de itens do grupo aberto */}
        {grupoAberto && itensAtuais.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <ItensDoGrupo T={T} itens={itensAtuais}
              marcados={marcadosPorGrupo[grupoAberto] || []}
              onToggle={toggleItem} />
          </div>
        )}
        {grupoAberto && itensAtuais.length === 0 && (
          <div style={{
            marginTop: 8,
            background: T.bg, border: `1px dashed ${T.border}`,
            borderRadius: 8, padding: 12, textAlign: 'center',
            fontSize: 12, color: T.textMuted,
          }}>Nenhum item encontrado nesse grupo.</div>
        )}
      </SubBloco>

      {/* CTA amarelo — concluir diagnóstico → Orçamento */}
      <button onClick={concluir}
        disabled={!podeConcluir || salvando}
        style={{
          minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none',
          background: podeConcluir ? PALETA.yellow : T.cardAlt,
          color: podeConcluir ? '#0a0a0d' : T.textDim,
          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
          cursor: (podeConcluir && !salvando) ? 'pointer' : 'not-allowed',
          opacity: (podeConcluir && !salvando) ? 1 : 0.55,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <TI name="check" size={14} />
        {salvando ? 'Salvando…'
          : !causa.trim() ? 'Descreva a causa identificada'
          : totalMarcados === 0 ? 'Marque pelo menos 1 componente'
          : 'Concluir diagnóstico · ir pro Orçamento'}
      </button>
    </div>
  );
};

export default AcaoDiagnostico;
