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
  ok:      { tone: 'green',   icon: 'check' },
  defeito: { tone: 'red',     icon: 'alert-triangle' },
  barulho: { tone: 'yellow',  icon: 'volume' },
  na:      { tone: 'neutral', icon: 'minus' },
};

// Divide array em pares (2 colunas). Pra expandir lista embaixo da LINHA
// que tem o grupo ativo, em vez de embaixo de toda a grid.
function chunkPairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

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
const GrupoChip = ({ T, dark, grupo, marcados, aberto, onClick }) => {
  // Fundo escuro com tint azul quando aberto (em vez do PALETA.blueBg claro)
  const bgAberto = dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg;
  const fgAtivo = dark ? PALETA.blue : PALETA.blueStrong;
  return (
    <button type="button" onClick={onClick}
      style={{
        background: aberto ? bgAberto : T.bg,
        border: `1px solid ${aberto ? PALETA.blueStrong : T.border}`,
        borderRadius: 8, padding: '7px 9px', minHeight: 48,
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center', gap: 2,
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 600, color: aberto ? fgAtivo : T.textPrimary,
      }}>
        <TI name={grupo.icon} size={13} color={aberto ? fgAtivo : T.textMuted} />
        {grupo.label}
      </span>
      <span style={{
        fontSize: 10, color: marcados > 0 ? fgAtivo : T.textMuted,
        fontWeight: marcados > 0 ? 700 : 500,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {marcados}/{grupo.total}{marcados > 0 ? ' marcados' : ''}
      </span>
    </button>
  );
};

// ─── Botão de ação (Troca / Manutenção) ───────────────────────────────────
const AcaoBtn = ({ T, dark, ativo, tone, icon, label, onClick }) => {
  // tone: 'red' (Troca) | 'yellow' (Manutenção)
  const palette = tone === 'red'
    ? { fg: PALETA.redStrong,    bgOn: dark ? 'rgba(192,66,66,0.22)'   : PALETA.redBg,    bdOn: PALETA.redStrong }
    : { fg: PALETA.yellowStrong, bgOn: dark ? 'rgba(255,217,102,0.22)' : PALETA.yellowBg, bdOn: '#E5BD3E' };
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: 1, minWidth: 0, padding: '5px 6px',
        borderRadius: 6,
        border: `1px solid ${ativo ? palette.bdOn : T.border}`,
        background: ativo ? palette.bgOn : 'transparent',
        color: ativo ? palette.fg : T.textMuted,
        fontSize: 11, fontWeight: ativo ? 700 : 500, fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
      <TI name={icon} size={11} />
      {label}
    </button>
  );
};

// ─── Lista de itens do grupo aberto (com Troca/Manutenção por item) ──────
const ItensDoGrupo = ({ T, dark, itens, marcados, onSetAcao }) => (
  <div style={{
    background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: 8, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  }}>
    {itens.map((it, idx) => {
      const acao = marcados[it.id]; // 'troca' | 'manutencao' | undefined
      const ativo = !!acao;
      return (
        <div key={it.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px',
            background: ativo
              ? (dark ? 'rgba(91,155,213,0.10)' : (PALETA.blueBg + '55'))
              : 'transparent',
            borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
          }}>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 12.5,
            color: ativo ? T.textPrimary : T.textPrimary,
            fontWeight: ativo ? 600 : 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{it.label}</span>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <AcaoBtn T={T} dark={dark} tone="red" icon="replace"
              ativo={acao === 'troca'} label="Troca"
              onClick={() => onSetAcao(it.id, acao === 'troca' ? null : 'troca')} />
            <AcaoBtn T={T} dark={dark} tone="yellow" icon="tool"
              ativo={acao === 'manutencao'} label="Manut."
              onClick={() => onSetAcao(it.id, acao === 'manutencao' ? null : 'manutencao')} />
          </div>
        </div>
      );
    })}
  </div>
);

// Migra estado antigo (array de ids) pro novo (objeto { id: 'troca' })
function normalizeMarcados(raw) {
  const out = {};
  for (const [grupoId, val] of Object.entries(raw || {})) {
    if (Array.isArray(val)) {
      out[grupoId] = Object.fromEntries(val.map(id => [id, 'troca']));
    } else if (val && typeof val === 'object') {
      out[grupoId] = val;
    } else {
      out[grupoId] = {};
    }
  }
  return out;
}

const AcaoDiagnostico = ({ os, onUpdateOS, onMoverOS }) => {
  const { T, dark } = useTheme();

  // Hidrata estado de pre_diagnostico.causa + componentes_marcados
  const preDiagSalvo = os?.pre_diagnostico || {};
  const [causa, setCausa] = useState(preDiagSalvo.causa_diagnostico || '');
  const [marcadosPorGrupo, setMarcadosPorGrupo] = useState(
    normalizeMarcados(preDiagSalvo.componentes_marcados)
  );
  const [busca, setBusca] = useState('');
  const [grupoAberto, setGrupoAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Re-sincroniza se a OS mudar (Realtime)
  useEffect(() => {
    setCausa(os?.pre_diagnostico?.causa_diagnostico || '');
    setMarcadosPorGrupo(normalizeMarcados(os?.pre_diagnostico?.componentes_marcados));
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

  const setAcaoItem = (itemId, acao) => {
    setMarcadosPorGrupo(prev => {
      const atual = { ...(prev[grupoAberto] || {}) };
      if (acao === null || acao === undefined) {
        delete atual[itemId];
      } else {
        atual[itemId] = acao;
      }
      return { ...prev, [grupoAberto]: atual };
    });
  };

  const totalMarcados = Object.values(marcadosPorGrupo).reduce(
    (s, obj) => s + Object.keys(obj || {}).length, 0
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
          Se equipamento não liga, mostra pill especial + motivo. */}
      <SubBloco T={T} dark={dark} icon="clipboard-check" label="Resumo da avaliação" color="blue">
        {os?.pre_diagnostico?.equipamento_nao_liga && (
          <div style={{ marginBottom: 8 }}>
            <Pill tone="red" icon="bolt-off">
              ⚡ Equipamento não liga
            </Pill>
            {os?.pre_diagnostico?.motivo_nao_liga && (
              <div style={{
                marginTop: 6, fontSize: 12, color: T.textPrimary,
                lineHeight: 1.4, borderLeft: `3px solid ${PALETA.redStrong}`,
                paddingLeft: 10,
              }}>
                {os.pre_diagnostico.motivo_nao_liga}
              </div>
            )}
          </div>
        )}

        {/* Vazamentos detectados */}
        {(() => {
          const vaz = os?.pre_diagnostico?.vazamentos || {};
          const locais = []
          if (vaz.entrada)  locais.push('Entrada')
          if (vaz.agitacao) locais.push('Agitação')
          if (vaz.saida)    locais.push('Saída')
          if (locais.length === 0) return null
          return (
            <div style={{ marginBottom: 8 }}>
              <Pill tone="yellow" icon="droplet">
                💧 Vazamento · {locais.join(', ')}
              </Pill>
            </div>
          )
        })()}
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
        ) : !os?.pre_diagnostico?.equipamento_nao_liga ? (
          <div style={{
            fontSize: 12, color: T.textMuted, fontStyle: 'italic',
          }}>
            Nenhum teste registrado na etapa de Avaliação.
          </div>
        ) : null}
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

        {/* Grupos agrupados em linhas de 2. A lista do grupo aberto
            aparece logo abaixo da LINHA dele (não no fim). */}
        {chunkPairs(grupos).map((par, rowIdx) => {
          const rowContemAberto = par.some(g => g.id === grupoAberto);
          return (
            <React.Fragment key={rowIdx}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                marginTop: rowIdx === 0 ? 0 : 6,
              }}>
                {par.map(g => (
                  <GrupoChip key={g.id} T={T} dark={dark} grupo={g}
                    marcados={Object.keys(marcadosPorGrupo[g.id] || {}).length}
                    aberto={grupoAberto === g.id}
                    onClick={() => setGrupoAberto(grupoAberto === g.id ? null : g.id)} />
                ))}
              </div>
              {rowContemAberto && itensAtuais.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <ItensDoGrupo T={T} dark={dark} itens={itensAtuais}
                    marcados={marcadosPorGrupo[grupoAberto] || {}}
                    onSetAcao={setAcaoItem} />
                </div>
              )}
              {rowContemAberto && itensAtuais.length === 0 && (
                <div style={{
                  marginTop: 6,
                  background: T.bg, border: `1px dashed ${T.border}`,
                  borderRadius: 8, padding: 12, textAlign: 'center',
                  fontSize: 12, color: T.textMuted,
                }}>Nenhum item encontrado nesse grupo.</div>
              )}
            </React.Fragment>
          );
        })}
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
