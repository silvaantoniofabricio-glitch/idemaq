// src/components/osDetalhe/acoes/AcaoRecebidoHIG.jsx
// Etapa Avaliacao (recebido) — Atlassian Design (reescrito 28/05/2026).
//
// Estrutura:
//   1. Relato do cliente — quote display com accent amarela (so leitura)
//   2. Testes de funcionamento — toggle 'equipamento nao liga' +
//      4 test rows com chips OK/Defeito/Barulho
//   3. Vazamentos — 3 toggle cards (Entrada / Agitacao / Saida)
//   4. Observacoes — textarea
//   5. CTA Avancar pro Diagnostico
//
// Persiste:
//   · useChecklistEtapa(os.id, 'recebido') -> resultados dos 4 testes
//   · os.pre_diagnostico.{equipamento_nao_liga, motivo_nao_liga, vazamentos}
//   · os.observacoes
//
// Nome do arquivo permanece *HIG por compat com imports do EtapaTab.

import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import {
  AtlPanel, AtlButton, ATL_FONT, atlHover, atlSurfaceSunken,
} from './_AtlassianUI'


// ─── Dados por tipo de equipamento ────────────────────────────────────────
const TESTES_POR_EQUIP = {
  lavadora: [
    { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'droplet' },
    { id: 'saida_agua',    label: 'Saída de água',    icon: 'droplet-off' },
    { id: 'agitacao',      label: 'Agitação',         icon: 'refresh' },
    { id: 'centrifugacao', label: 'Centrifugação',    icon: 'rotate-clockwise' },
  ],
  microondas: [
    { id: 'aquecimento',  label: 'Aquecimento',       icon: 'flame' },
    { id: 'prato',        label: 'Prato giratório',   icon: 'rotate-clockwise' },
    { id: 'temporizador', label: 'Temporizador',      icon: 'clock' },
    { id: 'potencia',     label: 'Troca de potência', icon: 'adjustments' },
  ],
  lava_loucas: [
    { id: 'entrada_agua', label: 'Entrada de água',       icon: 'droplet' },
    { id: 'saida_agua',   label: 'Saída de água',         icon: 'droplet-off' },
    { id: 'lavagem',      label: 'Lavagem',               icon: 'sparkles' },
    { id: 'aquecimento',  label: 'Aquecimento / secagem', icon: 'flame' },
  ],
  outros: [
    { id: 'liga',        label: 'Liga normalmente', icon: 'power' },
    { id: 'funciona',    label: 'Funciona',         icon: 'check' },
    { id: 'sem_barulho', label: 'Sem barulho',      icon: 'volume-off' },
    { id: 'visual',      label: 'Aparência geral',  icon: 'eye' },
  ],
}

// Vazamentos: só lavadora e lava-louças têm água externa
const VAZAMENTOS_POR_EQUIP = {
  lavadora: [
    { id: 'entrada',  label: 'Entrada',  icon: 'droplet' },
    { id: 'agitacao', label: 'Agitação', icon: 'refresh' },
    { id: 'saida',    label: 'Saída',    icon: 'droplet-off' },
  ],
  microondas: [],
  lava_loucas: [
    { id: 'porta',     label: 'Porta',      icon: 'door' },
    { id: 'base',      label: 'Base',       icon: 'layout-bottom-bar' },
    { id: 'mangueira', label: 'Mangueiras', icon: 'ripple' },
  ],
  outros: [],
}

// Atlassian usa nomes neutros — mapeamento de cores via corEtapa do projeto
const OPCOES = [
  { id: 'ok',      label: 'OK',       icon: 'check',          corKey: 'green'  },
  { id: 'defeito', label: 'Defeito',  icon: 'alert-triangle', corKey: 'red'    },
  { id: 'barulho', label: 'Barulho',  icon: 'volume',         corKey: 'yellow' },
]

// ─── Atlassian Toggle Switch ──────────────────────────────────────────────
function AtlSwitch({ on, onChange, T, dark }) {
  const azul = corEtapa('blue', dark)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 32, height: 18, borderRadius: 9,
        border: 'none', padding: 2, flexShrink: 0,
        background: on ? azul : (dark ? 'rgba(255,255,255,0.12)' : '#DFE1E6'),
        cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'background .15s',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}>
      <span style={{
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(9,30,66,0.25)',
      }} />
    </button>
  )
}

// ─── Test row Atlassian ───────────────────────────────────────────────────
// Layout em 2 linhas no mobile: cabecalho (icone + label + valor selecionado)
// e abaixo a row de 3 chips OK/Defeito/Barulho usando toda a largura.
function TestRow({ T, dark, teste, value, onChange, first }) {
  const opSel = OPCOES.find(o => o.id === value)
  return (
    <div style={{
      padding: '10px 14px',
      borderTop: first ? 'none' : `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 4,
          background: opSel
            ? corEtapa(opSel.corKey, dark) + '22'
            : (dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7'),
          color: opSel
            ? corEtapa(opSel.corKey, dark)
            : T.textMuted,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'background .15s',
        }}>
          <i className={`ti ti-${teste.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
        </div>

        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500,
          color: T.textPrimary, letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{teste.label}</span>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {OPCOES.map(op => {
          const cor = corEtapa(op.corKey, dark)
          const sel = value === op.id
          return (
            <button key={op.id} type="button"
              onClick={() => onChange(sel ? null : op.id)}
              style={{
                flex: 1, height: 30,
                borderRadius: 3,
                border: `1px solid ${sel ? cor : T.border}`,
                background: sel ? cor + '22' : 'transparent',
                color: sel ? cor : T.textMuted,
                cursor: 'pointer', fontFamily: ATL_FONT,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 12, fontWeight: sel ? 600 : 500,
                letterSpacing: '-0.005em',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background .12s, border-color .12s',
              }}>
              <i className={`ti ti-${op.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
              {op.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vazamento card Atlassian ─────────────────────────────────────────────
function VazamentoCard({ T, dark, vaza, on, onClick }) {
  const azul = corEtapa('blue', dark)
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: '1 1 0', minHeight: 48,
        borderRadius: 4,
        border: `1px solid ${on ? azul : T.border}`,
        background: on
          ? (dark ? 'rgba(91,155,213,0.12)' : 'rgba(91,155,213,0.08)')
          : (dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC'),
        cursor: 'pointer', fontFamily: ATL_FONT,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      <i className={`ti ti-${vaza.icon}`}
         style={{ fontSize: 17, color: on ? azul : T.textMuted }}
         aria-hidden="true" />
      <span style={{
        fontSize: 11.5, fontWeight: on ? 600 : 500,
        color: on ? azul : T.textMuted,
        letterSpacing: '-0.005em',
      }}>
        {vaza.label}
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoRecebidoHIG({ os, onMoverOS, onUpdateOS }) {
  const { T, dark } = useTheme()
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)

  // Checklists dinâmicos por tipo de equipamento
  const tipoEquip = os.tipoEquipamento || 'lavadora'
  const TESTES = TESTES_POR_EQUIP[tipoEquip] || TESTES_POR_EQUIP.lavadora
  const VAZAMENTOS = VAZAMENTOS_POR_EQUIP[tipoEquip] || []

  const { itens: chkItens, loading: loadingChk } =
    useChecklistEtapa(os.id, 'recebido')

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [obs, setObs]                = useState(os?.observacoes || '')
  const [naoLiga, setNaoLiga]        = useState(false)
  const [motivoNaoLiga, setMotivo]   = useState('')
  const [vazamentos, setVazamentos]  = useState(
    () => VAZAMENTOS.reduce((acc, v) => ({ ...acc, [v.id]: false }), {})
  )
  const [hidratado, setHidratado]    = useState(false)
  const [salvando, setSalvando]      = useState(false)

  // Sempre lê o pre_diagnostico mais fresco (evita closures stale nos timeouts).
  const osRef = useRef(os)
  osRef.current = os

  useEffect(() => {
    setNaoLiga(!!os?.pre_diagnostico?.equipamento_nao_liga)
    setMotivo(os?.pre_diagnostico?.motivo_nao_liga || '')
    const vazStore = os?.pre_diagnostico?.vazamentos || {}
    setVazamentos(
      (VAZAMENTOS_POR_EQUIP[tipoEquip] || [])
        .reduce((acc, v) => ({ ...acc, [v.id]: !!vazStore[v.id] }), {})
    )
  }, [os?.id, tipoEquip,
    os?.pre_diagnostico?.equipamento_nao_liga,
    os?.pre_diagnostico?.motivo_nao_liga,
    os?.pre_diagnostico?.vazamentos])

  // Reset dos checklists quando o tipo de equipamento muda durante a sessão
  const prevTipoRef = useRef(null)
  useEffect(() => {
    if (prevTipoRef.current === null) { prevTipoRef.current = tipoEquip; return }
    if (prevTipoRef.current === tipoEquip) return
    prevTipoRef.current = tipoEquip
    const t = TESTES_POR_EQUIP[tipoEquip] || TESTES_POR_EQUIP.lavadora
    const v = VAZAMENTOS_POR_EQUIP[tipoEquip] || []
    setTestes(t.reduce((acc, x) => ({ ...acc, [x.id]: null }), {}))
    setVazamentos(v.reduce((acc, x) => ({ ...acc, [x.id]: false }), {}))
    setHidratado(false)
  }, [tipoEquip])

  useEffect(() => {
    if (loadingChk || hidratado) return
    const novo = TESTES.reduce((acc, t) => {
      const found = chkItens.find(i => i.id === t.id)
      return { ...acc, [t.id]: found?.valor ?? null }
    }, {})
    setTestes(novo)
    setObs(os?.observacoes || '')
    setHidratado(true)
  }, [loadingChk, chkItens, hidratado, os?.observacoes])

  useEffect(() => {
    if (hidratado) setObs(os?.observacoes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.observacoes])

  // Monta os itens do checklist a partir do estado dos testes.
  function montarItensTestes(novoTestes, novoNaoLiga) {
    return TESTES.map(t => ({
      id: t.id, label: t.label,
      checked: novoNaoLiga ? false : novoTestes[t.id] === 'ok',
      valor:   novoNaoLiga ? 'na'  : (novoTestes[t.id] || null),
    }))
  }

  // Salva os testes pelo MESMO caminho dos outros campos (onUpdateOS), pra tudo
  // viver no mesmo pre_diagnostico em memória e nada se sobrescrever.
  function salvarTestes(novoTestes, novoNaoLiga) {
    const base = osRef.current?.pre_diagnostico || {}
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...base,
        checklist: {
          ...(base.checklist || {}),
          recebido: { itens: montarItensTestes(novoTestes, novoNaoLiga), observacoes: null },
        },
      },
    })
  }

  function setResultado(testeId, valor) {
    const novoTestes = { ...testes, [testeId]: valor }
    setTestes(novoTestes)
    salvarTestes(novoTestes, naoLiga)
  }

  function toggleNaoLiga() {
    const novo = !naoLiga
    setNaoLiga(novo)
    salvarTestes(testes, novo)
  }

  useEffect(() => {
    if (!hidratado || obs === (os?.observacoes || '')) return
    const t = setTimeout(() => onUpdateOS?.(os.numero, { observacoes: obs }), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs, hidratado])

  useEffect(() => {
    if (!hidratado) return
    const t = setTimeout(() => {
      const base = osRef.current?.pre_diagnostico || {}
      onUpdateOS?.(os.numero, {
        pre_diagnostico: {
          ...base,
          equipamento_nao_liga: naoLiga,
          motivo_nao_liga:      naoLiga ? motivoNaoLiga : null,
          vazamentos,
          causa_diagnostico:    causa.trim() || null,
        },
      })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naoLiga, motivoNaoLiga, vazamentos, causa, hidratado])

  async function avancar() {
    setSalvando(true)
    if (obs !== (os?.observacoes || '')) onUpdateOS?.(os.numero, { observacoes: obs })
    // Escrita única: testes + campos da avaliação no mesmo pre_diagnostico.
    const base = osRef.current?.pre_diagnostico || {}
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...base,
        checklist: {
          ...(base.checklist || {}),
          recebido: { itens: montarItensTestes(testes, naoLiga), observacoes: null },
        },
        equipamento_nao_liga: naoLiga,
        motivo_nao_liga:      naoLiga ? motivoNaoLiga : null,
        vazamentos,
      },
    })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico')
    setSalvando(false)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null)
  const podeAvancar      = naoLiga || todosPreenchidos
  const preenchidos      = TESTES.filter(t => testes[t.id] != null).length
  const relatoCliente    = (os?.defeito || '').trim()
  const temVazamento     = Object.values(vazamentos).some(Boolean)
  const temSecaoVazamentos = VAZAMENTOS.length > 0

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
          }}>
            {relatoCliente}
          </div>
        ) : (
          <div style={{
            padding: '14px',
            display: 'flex', alignItems: 'center', gap: 8,
            color: T.textMuted,
          }}>
            <i className="ti ti-message-off" style={{ fontSize: 15 }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontStyle: 'italic' }}>
              Sem relato na abertura da OS.
            </span>
          </div>
        )}
      </AtlPanel>

      {/* 2. Testes de funcionamento */}
      <AtlPanel
        T={T} dark={dark}
        title="Testes de funcionamento"
        footer={
          naoLiga
            ? 'Testes pulados — equipamento sem energia.'
            : `${preenchidos} de ${TESTES.length} avaliados.`
        }>
        {/* Toggle equipamento nao liga */}
        <div style={{
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            background: naoLiga ? azul + '22' : amarelo + '22',
            color: naoLiga ? azul : amarelo,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-bolt-off" style={{ fontSize: 14 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.textPrimary,
              letterSpacing: '-0.005em',
            }}>Equipamento não liga</div>
            <div style={{
              fontSize: 11.5, color: naoLiga ? azul : T.textMuted,
              marginTop: 1,
            }}>{naoLiga ? 'Ativo · testes desabilitados' : 'Ativar pula os 4 testes'}</div>
          </div>
          <AtlSwitch T={T} dark={dark} on={naoLiga} onChange={toggleNaoLiga} />
        </div>

        {/* Motivo (so quando naoLiga) */}
        {naoLiga && (
          <div style={{
            padding: '10px 14px',
            borderTop: `1px solid ${T.border}`,
            background: atlSurfaceSunken(dark),
          }}>
            <textarea
              placeholder="O que aconteceu? Ex: cabo arrancado, fonte queimada, painel sem reação…"
              value={motivoNaoLiga}
              onChange={e => setMotivo(e.target.value)}
              rows={2}
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
        )}

        {/* 4 testes */}
        <div style={{
          borderTop: `1px solid ${T.border}`,
          opacity: naoLiga ? 0.4 : 1,
          pointerEvents: naoLiga ? 'none' : 'auto',
          transition: 'opacity .2s',
        }}>
          {TESTES.map((t, i) => (
            <TestRow
              key={t.id}
              T={T} dark={dark}
              teste={t}
              value={testes[t.id]}
              onChange={(v) => setResultado(t.id, v)}
              first={i === 0}
            />
          ))}
        </div>
      </AtlPanel>

      {/* 3. Vazamentos — só para lavadora e lava-louças */}
      {temSecaoVazamentos && (
        <AtlPanel
          T={T} dark={dark}
          title="Vazamentos"
          footer={temVazamento ? 'Registrado — será incluído no diagnóstico.' : 'Toque pra marcar onde está vazando.'}>
          <div style={{
            padding: '10px 14px',
            display: 'flex', gap: 6,
            opacity: naoLiga ? 0.4 : 1,
            pointerEvents: naoLiga ? 'none' : 'auto',
          }}>
            {VAZAMENTOS.map(v => (
              <VazamentoCard
                key={v.id}
                T={T} dark={dark}
                vaza={v}
                on={!!vazamentos[v.id]}
                onClick={() => setVazamentos(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
              />
            ))}
          </div>
        </AtlPanel>
      )}

      {/* 4. Observações Internas */}
      <AtlPanel
        T={T} dark={dark}
        title="Observações Internas"
        footer="Visível e editável em todas as etapas da OS.">
        <div style={{ padding: '10px 14px' }}>
          <textarea
            placeholder="Ex: máquina chegou com cabo arrancado, painel arranhado…"
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

      {/* 5. CTA */}
      <AtlButton
        T={T} dark={dark}
        variant="primary"
        fullWidth
        disabled={!podeAvancar || salvando}
        icon={salvando ? 'loader-2' : 'arrow-right'}
        onClick={avancar}>
        {salvando
          ? 'Salvando…'
          : podeAvancar
            ? 'Avançar pro Diagnóstico'
            : `Avalie os ${TESTES.length} testes para continuar`}
      </AtlButton>

    </div>
  )
}
