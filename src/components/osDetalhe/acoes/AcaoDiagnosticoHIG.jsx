// src/components/osDetalhe/acoes/AcaoDiagnosticoHIG.jsx
// Etapa Diagnostico — Atlassian Design (reescrito 28/05/2026).
//
// Estrutura:
//   1. Relato do cliente — texto da OS (so leitura, accent amarela)
//   2. Resumo da avaliacao — naoLiga + vazamentos + 4 testes vindos do recebido
//   3. Causa identificada — textarea + autocomplete (localStorage)
//   4. Componentes afetados — busca + grupos accordion + itens Troca/Manutencao
//   5. CTA Concluir diagnostico
//
// Persiste:
//   · os.pre_diagnostico.causa_diagnostico
//   · os.pre_diagnostico.componentes_marcados
//      { [grupoId]: { [itemId]: 'troca' | 'manutencao' } }
//   · localStorage idemaq:diagnostico:causas_historico (autocomplete)
//
// Nome do arquivo permanece *HIG por compat com imports do EtapaTab.

import React, { useState, useMemo, useEffect } from 'react'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import { CATEGORIAS_PECA, GRUPOS_CATEGORIA } from '../../../utils/categoriasPeca'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import {
  AtlPanel, AtlButton, ATL_FONT, atlHover, atlSurfaceSunken,
} from './_AtlassianUI'

// ─── Dados ────────────────────────────────────────────────────────────────
const ICON_MAP = {
  motor:      'engine',
  agua:       'droplet',
  eletrico:   'bolt',
  estrutura:  'tool',
  acabamento: 'package',
  outros:     'puzzle',
}

const GRUPOS = Object.entries(GRUPOS_CATEGORIA).map(([id, g]) => ({
  id,
  label: g.label,
  icon: ICON_MAP[id] || 'tool',
  itens: CATEGORIAS_PECA.filter(c => c.grupo === id).map(c => ({ id: c.id, label: c.label })),
}))

// Cores dos resultados dos testes (do Recebido)
const RES_COR = {
  ok:      'green',
  defeito: 'red',
  barulho: 'yellow',
}
const RES_LABEL = {
  ok: 'OK', defeito: 'Defeito', barulho: 'Barulho', na: 'N/A',
}
const RES_ICON = {
  ok: 'check', defeito: 'alert-triangle', barulho: 'volume', na: 'minus',
}


// Migracao formato antigo (array → objeto)
function normalizeMarcados(raw) {
  const out = {}
  for (const [grupoId, val] of Object.entries(raw || {})) {
    if (Array.isArray(val))
      out[grupoId] = Object.fromEntries(val.map(id => [id, 'troca']))
    else if (val && typeof val === 'object')
      out[grupoId] = val
    else
      out[grupoId] = {}
  }
  return out
}

// ─── Resumo: row de info (icone tintado + label + sub) ────────────────────
function ResumoRow({ T, dark, icon, iconCor, label, sub, first }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderTop: first ? 'none' : `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 4,
        background: iconCor + '22', color: iconCor,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: T.textPrimary,
          letterSpacing: '-0.005em',
        }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Resumo: row de teste com badge ───────────────────────────────────────
function TesteResumoRow({ T, dark, teste, first }) {
  const cor = corEtapa(RES_COR[teste.valor] || 'blue', dark)
  return (
    <div style={{
      padding: '10px 14px',
      borderTop: first ? 'none' : `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 4,
        background: cor + '22', color: cor,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={`ti ti-${RES_ICON[teste.valor] || 'minus'}`}
           style={{ fontSize: 14 }} aria-hidden="true" />
      </div>
      <span style={{ flex: 1, fontSize: 13, color: T.textPrimary }}>
        {teste.label || teste.id}
      </span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 3,
        background: cor + '22', color: cor,
        fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.005em',
      }}>
        <i className={`ti ti-${RES_ICON[teste.valor]}`} style={{ fontSize: 11 }} aria-hidden="true" />
        {RES_LABEL[teste.valor] || teste.valor}
      </span>
    </div>
  )
}

// ─── Grupo accordion header ───────────────────────────────────────────────
function GrupoHeader({ T, dark, grupo, marcadosCount, open, onToggle, first }) {
  const [hover, setHover] = useState(false)
  const azul = corEtapa('blue', dark)
  const ativo = marcadosCount > 0
  return (
    <button type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderTop: first ? 'none' : `1px solid ${T.border}`,
        background: hover ? atlHover(dark) : (open ? atlSurfaceSunken(dark) : 'transparent'),
        border: 'none', cursor: 'pointer', fontFamily: ATL_FONT,
        display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s',
      }}>
      <div style={{
        width: 28, height: 28, borderRadius: 4,
        background: ativo ? azul + '22' : (dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7'),
        color: ativo ? azul : T.textMuted,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'background .15s',
      }}>
        <i className={`ti ti-${grupo.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
      </div>
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 600,
        color: T.textPrimary, letterSpacing: '-0.005em',
      }}>{grupo.label}</span>
      {ativo && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: azul, background: azul + '22',
          padding: '2px 7px', borderRadius: 99,
          fontVariantNumeric: 'tabular-nums',
        }}>{marcadosCount}</span>
      )}
      <i className="ti ti-chevron-right" style={{
        fontSize: 13, color: T.textDim, flexShrink: 0,
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform .2s',
      }} aria-hidden="true" />
    </button>
  )
}

// ─── Item row com Troca/Manutencao ────────────────────────────────────────
function ItemRow({ T, dark, item, acao, onSetAcao }) {
  const vermelho = corEtapa('red', dark)
  const amarelo  = corEtapa('yellow', dark)
  const trocaOn = acao === 'troca'
  const manutOn = acao === 'manutencao'

  return (
    <div style={{
      padding: '8px 14px',
      borderTop: `1px solid ${T.border}`,
      background: acao ? (dark ? 'rgba(91,155,213,0.04)' : 'rgba(91,155,213,0.03)') : 'transparent',
      display: 'flex', alignItems: 'center', gap: 8,
      transition: 'background .12s',
    }}>
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 13, color: T.textPrimary,
        fontWeight: acao ? 600 : 500,
        letterSpacing: '-0.005em',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{item.label}</span>

      <button type="button"
        onClick={() => onSetAcao(trocaOn ? null : 'troca')}
        style={{
          height: 28, padding: '0 10px',
          borderRadius: 3,
          border: `1px solid ${trocaOn ? vermelho : T.border}`,
          background: trocaOn ? vermelho + '22' : 'transparent',
          color: trocaOn ? vermelho : T.textMuted,
          fontSize: 12, fontWeight: trocaOn ? 600 : 500,
          fontFamily: ATL_FONT, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          letterSpacing: '-0.005em', flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
          transition: 'background .12s, border-color .12s',
        }}>
        <i className="ti ti-replace" style={{ fontSize: 12 }} aria-hidden="true" />
        Troca
      </button>

      <button type="button"
        onClick={() => onSetAcao(manutOn ? null : 'manutencao')}
        style={{
          height: 28, padding: '0 10px',
          borderRadius: 3,
          border: `1px solid ${manutOn ? amarelo : T.border}`,
          background: manutOn ? amarelo + '22' : 'transparent',
          color: manutOn ? amarelo : T.textMuted,
          fontSize: 12, fontWeight: manutOn ? 600 : 500,
          fontFamily: ATL_FONT, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          letterSpacing: '-0.005em', flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
          transition: 'background .12s, border-color .12s',
        }}>
        <i className="ti ti-tool" style={{ fontSize: 12 }} aria-hidden="true" />
        Manut.
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoDiagnosticoHIG({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()
  const azul = corEtapa('blue', dark)

  // ── Estado ───────────────────────────────────────────────────────────────
  const preDiag = os?.pre_diagnostico || {}
  const [obs, setObs]                   = useState(os?.observacoes || '')
  const [marcadosPorGrupo, setMarcados] = useState(() => normalizeMarcados(preDiag.componentes_marcados))
  const [grupoAberto, setGrupoAberto]   = useState(null)
  const [busca, setBusca]               = useState('')
  const [salvando, setSalvando]         = useState(false)

  useEffect(() => {
    setObs(os?.observacoes || '')
    setMarcados(normalizeMarcados(os?.pre_diagnostico?.componentes_marcados))
  }, [os?.id])

  useEffect(() => {
    if (obs === (os?.observacoes || '')) return
    const t = setTimeout(() => onUpdateOS?.(os.numero, { observacoes: obs }), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs])

  // ── Testes da avaliacao anterior ─────────────────────────────────────────
  const { itens: chkRecebido } = useChecklistEtapa(os.id, 'recebido')
  const testesComResultado = useMemo(
    () => (chkRecebido || []).filter(t => t.valor && t.valor !== 'na'),
    [chkRecebido]
  )
  const naoLiga    = !!preDiag.equipamento_nao_liga
  const vazamentos = preDiag.vazamentos || {}
  const locaisVaz  = [
    vazamentos.entrada  && 'Entrada',
    vazamentos.agitacao && 'Agitação',
    vazamentos.saida    && 'Saída',
  ].filter(Boolean)

  // ── Autosave componentes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!os?.id) return
    const salvoServ = normalizeMarcados(os?.pre_diagnostico?.componentes_marcados)
    if (JSON.stringify(salvoServ) === JSON.stringify(marcadosPorGrupo)) return
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, {
        pre_diagnostico: { ...preDiag, componentes_marcados: marcadosPorGrupo },
      })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcadosPorGrupo, os?.id])

  // ── CTA ──────────────────────────────────────────────────────────────────
  const totalMarcados = Object.values(marcadosPorGrupo).reduce(
    (s, obj) => s + Object.keys(obj || {}).length, 0
  )
  const podeConcluir = totalMarcados > 0

  async function concluir() {
    if (!podeConcluir) return
    setSalvando(true)
    if (obs !== (os?.observacoes || '')) onUpdateOS?.(os.numero, { observacoes: obs })
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...preDiag,
        componentes_marcados: marcadosPorGrupo,
      },
    })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'orcamento')
    setSalvando(false)
    if (proxima) onMoverOS?.(os.numero, proxima.id)
  }

  const relatoCliente = (os?.defeito || '').trim()
  const ctaLabel = salvando ? 'Salvando…'
    : totalMarcados === 0 ? 'Marque pelo menos 1 componente'
    : 'Concluir diagnóstico'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12,
      fontFamily: ATL_FONT,
      padding: '0 0 12px',
    }}>

      {/* 1. Relato do cliente */}
      <AtlPanel T={T} dark={dark} title="Relato do cliente" accent="#FFCC00">
        {relatoCliente ? (
          <div style={{
            padding: '12px 14px',
            fontSize: 13.5, color: T.textPrimary,
            lineHeight: 1.5, letterSpacing: '-0.005em',
            whiteSpace: 'pre-wrap',
          }}>{relatoCliente}</div>
        ) : (
          <div style={{
            padding: 14, display: 'flex', alignItems: 'center', gap: 8,
            color: T.textMuted,
          }}>
            <i className="ti ti-message-off" style={{ fontSize: 15 }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontStyle: 'italic' }}>
              Sem relato na abertura da OS.
            </span>
          </div>
        )}
      </AtlPanel>

      {/* 2. Resumo da avaliacao */}
      {(naoLiga || locaisVaz.length > 0 || testesComResultado.length > 0) && (
        <AtlPanel T={T} dark={dark} title="Resumo da avaliação">
          {naoLiga && (
            <ResumoRow T={T} dark={dark}
              first
              icon="bolt-off" iconCor={azul}
              label="Equipamento não liga"
              sub={preDiag.motivo_nao_liga || undefined}
            />
          )}
          {locaisVaz.length > 0 && (
            <ResumoRow T={T} dark={dark}
              first={!naoLiga}
              icon="droplet" iconCor={azul}
              label="Vazamento detectado"
              sub={locaisVaz.join(' · ')}
            />
          )}
          {testesComResultado.map((t, i) => (
            <TesteResumoRow
              key={t.id}
              T={T} dark={dark}
              teste={t}
              first={!naoLiga && locaisVaz.length === 0 && i === 0}
            />
          ))}
        </AtlPanel>
      )}

      {/* 3. Observações Internas */}
      <AtlPanel T={T} dark={dark} title="Observações Internas"
        footer="Visível e editável em todas as etapas da OS.">
        <div style={{ padding: '10px 14px' }}>
          <textarea
            placeholder="Ex: Rolamento do tambor desgastado, correia rompida…"
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px',
              borderRadius: 3,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
              color: T.textPrimary,
              fontSize: 13, fontFamily: ATL_FONT,
              outline: 'none', resize: 'vertical',
              letterSpacing: '-0.005em', lineHeight: 1.45,
            }}
          />
        </div>
      </AtlPanel>

      {/* 4. Componentes afetados */}
      <AtlPanel T={T} dark={dark}
        title="Componentes afetados"
        count={totalMarcados > 0 ? totalMarcados : undefined}
        footer={totalMarcados > 0
          ? `${totalMarcados} ${totalMarcados === 1 ? 'componente marcado' : 'componentes marcados'}.`
          : 'Selecione pelo menos 1 componente para concluir.'}>

        {/* Busca */}
        <div style={{
          padding: '8px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-search" style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar componente…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', fontSize: 13, color: T.textPrimary,
              fontFamily: ATL_FONT, letterSpacing: '-0.005em',
            }}
          />
          {busca && (
            <button type="button" onClick={() => setBusca('')}
              style={{
                border: 'none', background: 'transparent',
                cursor: 'pointer', color: T.textMuted, padding: 0,
                display: 'inline-flex', alignItems: 'center', flexShrink: 0,
              }}>
              <i className="ti ti-x" style={{ fontSize: 13 }} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Grupos */}
        {(() => {
          const buscaAtiva = busca.trim().length > 0
          const queryLower = semAcento(busca.trim())

          const gruposVisiveis = GRUPOS.map(grupo => {
            const marcados = marcadosPorGrupo[grupo.id] || {}
            const itensMatch = buscaAtiva
              ? grupo.itens.filter(i => semAcento(i.label).includes(queryLower))
              : grupo.itens
            const skipPorBusca = buscaAtiva && itensMatch.length === 0
            const open = buscaAtiva || grupoAberto === grupo.id
            return { grupo, marcados, itensMatch, skipPorBusca, open }
          }).filter(x => !x.skipPorBusca)

          if (buscaAtiva && gruposVisiveis.length === 0) {
            return (
              <div style={{
                padding: 14, display: 'flex', alignItems: 'center', gap: 8,
                color: T.textMuted,
              }}>
                <i className="ti ti-search-off" style={{ fontSize: 14 }} aria-hidden="true" />
                <span style={{ fontSize: 13, fontStyle: 'italic' }}>
                  Nenhum componente encontrado.
                </span>
              </div>
            )
          }

          return gruposVisiveis.map(({ grupo, marcados, itensMatch, open }, idx) => (
            <React.Fragment key={grupo.id}>
              <GrupoHeader
                T={T} dark={dark}
                grupo={grupo}
                marcadosCount={Object.keys(marcados).length}
                open={open}
                first={idx === 0}
                onToggle={() => {
                  if (buscaAtiva) return
                  setGrupoAberto(open ? null : grupo.id)
                }}
              />
              {open && (
                <div>
                  {itensMatch.map(item => (
                    <ItemRow
                      key={item.id}
                      T={T} dark={dark}
                      item={item}
                      acao={marcados[item.id]}
                      onSetAcao={(acao) => {
                        setMarcados(prev => {
                          const atual = { ...(prev[grupo.id] || {}) }
                          if (!acao) delete atual[item.id]
                          else atual[item.id] = acao
                          return { ...prev, [grupo.id]: atual }
                        })
                      }}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          ))
        })()}
      </AtlPanel>

      {/* 5. CTA */}
      <AtlButton
        T={T} dark={dark}
        variant="primary"
        fullWidth
        disabled={!podeConcluir || salvando}
        icon={salvando ? 'loader-2' : 'arrow-right'}
        onClick={concluir}>
        {ctaLabel}
      </AtlButton>

    </div>
  )
}
