// src/components/osDetalhe/acoes/AcaoDiagnosticoHIG.jsx
// Etapa Diagnóstico — Avaliação + Diagnóstico UNIFICADOS (06/07/2026).
//
// Antes eram 2 colunas no Kanban (recebido → diagnostico); como é a mesma
// pessoa na mesma bancada, viraram UMA etapa. Esta tela reúne os dois forms:
//   1. Relato do cliente — texto da OS (só leitura, accent amarela)
//   2. Testes de funcionamento — toggle 'não liga' + 4 test rows OK/Defeito/Barulho
//   3. Vazamentos — toggle cards (só lavadora/lava-louças)
//   4. Componentes afetados — busca + grupos accordion + itens Troca/Manutenção
//   5. Observações internas — textarea
//   6. CTA Concluir diagnóstico → Orçamento
//
// Persiste (tudo em os.pre_diagnostico — chaves INALTERADAS pra compat com
// OS antigas e com o RelatorioTab):
//   · checklist.recebido.itens[]           (testes, com .autor carimbado)
//   · equipamento_nao_liga / motivo_nao_liga / vazamentos
//   · componentes_marcados  { [grupoId]: { [itemId]: 'troca'|'manutencao' } }
//   · componentes_autores   { [itemId]: { uid, em, apelido } }
//   · os.observacoes
//
// Nome do arquivo permanece *HIG por compat com imports do EtapaTab.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import { semAcento } from '../../../utils/fmt'
import { CATEGORIAS_PECA, GRUPOS_CATEGORIA } from '../../../utils/categoriasPeca'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useAutorCheck, fmtAutor } from '../../../hooks/useAutorCheck'
import {
  AtlPanel, AtlButton, ATL_FONT, atlHover, atlSurfaceSunken,
} from './_AtlassianUI'

// ═══════════════════════════════════════════════════════════════════════════
// Dados — TESTES (ex-Avaliação)
// ═══════════════════════════════════════════════════════════════════════════
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
// Lava e seca usa os mesmos testes da lavadora + secagem (mais um mecanismo)
TESTES_POR_EQUIP.lava_seca = [
  ...TESTES_POR_EQUIP.lavadora,
  { id: 'secagem', label: 'Secagem', icon: 'wind' },
]

// Vazamentos: só lavadora, lava-louças e lava-e-seca têm água externa
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
VAZAMENTOS_POR_EQUIP.lava_seca = VAZAMENTOS_POR_EQUIP.lavadora

const OPCOES = [
  { id: 'ok',      label: 'OK',       icon: 'check',          corKey: 'green'  },
  { id: 'defeito', label: 'Defeito',  icon: 'alert-triangle', corKey: 'red'    },
  { id: 'barulho', label: 'Barulho',  icon: 'volume',         corKey: 'yellow' },
]

// ═══════════════════════════════════════════════════════════════════════════
// Dados — COMPONENTES (ex-Diagnóstico)
// ═══════════════════════════════════════════════════════════════════════════
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

// Migração formato antigo (array → objeto)
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

// ═══════════════════════════════════════════════════════════════════════════
// Sub-componentes — testes
// ═══════════════════════════════════════════════════════════════════════════
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

function TestRow({ T, dark, teste, value, onChange, first, autor }) {
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

        {value && autor && (
          <span style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 500,
            flexShrink: 0, letterSpacing: '-0.003em', whiteSpace: 'nowrap',
          }}>{autor}</span>
        )}
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
// Sub-componentes — componentes afetados
// ═══════════════════════════════════════════════════════════════════════════
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

function ItemRow({ T, dark, item, acao, onSetAcao, autor }) {
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
        display: 'flex', flexDirection: 'column',
      }}>
        <span style={{
          fontSize: 13, color: T.textPrimary,
          fontWeight: acao ? 600 : 500,
          letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{item.label}</span>
        {acao && autor && (
          <span style={{
            fontSize: 10, color: T.textMuted, fontWeight: 500,
            letterSpacing: '-0.003em', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{autor}</span>
        )}
      </span>

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
  const { carimbo } = useAutorCheck()
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)

  // Checklists dinâmicos por tipo de equipamento
  const tipoEquip = os.tipoEquipamento || 'lavadora'
  const TESTES = TESTES_POR_EQUIP[tipoEquip] || TESTES_POR_EQUIP.lavadora
  const VAZAMENTOS = VAZAMENTOS_POR_EQUIP[tipoEquip] || []

  // Testes persistem na chave 'recebido' (compat com OS antigas + RelatorioTab)
  const { itens: chkItens, loading: loadingChk } =
    useChecklistEtapa(os.id, 'recebido')

  // ── Estado: testes (ex-Avaliação) ─────────────────────────────────────────
  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [naoLiga, setNaoLiga]       = useState(false)
  const [motivoNaoLiga, setMotivo]  = useState('')
  const [vazamentos, setVazamentos] = useState(
    () => VAZAMENTOS.reduce((acc, v) => ({ ...acc, [v.id]: false }), {})
  )
  const [hidratado, setHidratado]   = useState(false)

  // ── Estado: componentes (ex-Diagnóstico) ──────────────────────────────────
  const preDiag = os?.pre_diagnostico || {}
  const [obs, setObs]                   = useState(os?.observacoes || '')
  const [marcadosPorGrupo, setMarcados] = useState(() => normalizeMarcados(preDiag.componentes_marcados))
  // Autoria por componente: { [itemId]: { uid, em, apelido } }
  const [autores, setAutores]           = useState(() => preDiag.componentes_autores || {})
  const [grupoAberto, setGrupoAberto]   = useState(null)
  const [busca, setBusca]               = useState('')
  const [salvando, setSalvando]         = useState(false)

  // Sempre lê o pre_diagnostico mais fresco (evita closures stale nos timeouts).
  const osRef = useRef(os)
  osRef.current = os

  // ── Hidratação ────────────────────────────────────────────────────────────
  useEffect(() => {
    setObs(os?.observacoes || '')
    setMarcados(normalizeMarcados(os?.pre_diagnostico?.componentes_marcados))
    setAutores(os?.pre_diagnostico?.componentes_autores || {})
  }, [os?.id])

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

  // ── Persistência: testes ──────────────────────────────────────────────────
  // Autoria: quando o valor de um teste MUDA, carimba com o usuário logado;
  // quando não muda, preserva o autor anterior (não sobrescreve quem fez).
  function montarItensTestes(novoTestes, novoNaoLiga) {
    const anteriores = osRef.current?.pre_diagnostico?.checklist?.recebido?.itens || []
    return TESTES.map(t => {
      const antigo = anteriores.find(i => i.id === t.id)
      const valor  = novoNaoLiga ? 'na' : (novoTestes[t.id] || null)
      const mudou  = valor !== (antigo?.valor ?? null)
      const autor  = valor == null ? undefined : (mudou ? carimbo() : antigo?.autor)
      return {
        id: t.id, label: t.label,
        checked: novoNaoLiga ? false : novoTestes[t.id] === 'ok',
        valor,
        ...(autor ? { autor } : {}),
      }
    })
  }

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

  // ── Persistência: não liga / vazamentos (debounce) ────────────────────────
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
        },
      })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naoLiga, motivoNaoLiga, vazamentos, hidratado])

  // ── Persistência: observações (debounce) ──────────────────────────────────
  useEffect(() => {
    if (!hidratado || obs === (os?.observacoes || '')) return
    const t = setTimeout(() => onUpdateOS?.(os.numero, { observacoes: obs }), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs, hidratado])

  // ── Persistência: componentes (autosave debounce) ─────────────────────────
  useEffect(() => {
    if (!os?.id) return
    const salvoServ = normalizeMarcados(os?.pre_diagnostico?.componentes_marcados)
    if (JSON.stringify(salvoServ) === JSON.stringify(marcadosPorGrupo)) return
    const t = setTimeout(() => {
      const base = osRef.current?.pre_diagnostico || {}
      onUpdateOS?.(os.numero, {
        pre_diagnostico: {
          ...base,
          componentes_marcados: marcadosPorGrupo,
          componentes_autores: autores,
        },
      })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcadosPorGrupo, autores, os?.id])

  // ── CTA ───────────────────────────────────────────────────────────────────
  const todosPreenchidos = TESTES.every(t => testes[t.id] != null)
  const testesOk = naoLiga || todosPreenchidos
  const preenchidos = TESTES.filter(t => testes[t.id] != null).length
  const totalMarcados = Object.values(marcadosPorGrupo).reduce(
    (s, obj) => s + Object.keys(obj || {}).length, 0
  )
  const podeConcluir = testesOk && totalMarcados > 0

  async function concluir() {
    if (!podeConcluir) return
    setSalvando(true)
    // Escrita única: testes + campos da avaliação + componentes no mesmo pre_diagnostico.
    const base = osRef.current?.pre_diagnostico || {}
    onUpdateOS?.(os.numero, {
      ...(obs !== (os?.observacoes || '') ? { observacoes: obs } : {}),
      pre_diagnostico: {
        ...base,
        checklist: {
          ...(base.checklist || {}),
          recebido: { itens: montarItensTestes(testes, naoLiga), observacoes: null },
        },
        equipamento_nao_liga: naoLiga,
        motivo_nao_liga:      naoLiga ? motivoNaoLiga : null,
        vazamentos,
        componentes_marcados: marcadosPorGrupo,
        componentes_autores: autores,
      },
    })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'orcamento')
    setSalvando(false)
    if (proxima) onMoverOS?.(os.numero, proxima.id)
  }

  const relatoCliente = (os?.defeito || '').trim()
  const temVazamento = Object.values(vazamentos).some(Boolean)
  const temSecaoVazamentos = VAZAMENTOS.length > 0
  const ctaLabel = salvando ? 'Salvando…'
    : !testesOk ? `Avalie os ${TESTES.length} testes para continuar`
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
            }}>{naoLiga ? 'Ativo · testes desabilitados' : 'Ativar pula os testes'}</div>
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

        {/* Testes */}
        <div style={{
          borderTop: `1px solid ${T.border}`,
          opacity: naoLiga ? 0.4 : 1,
          pointerEvents: naoLiga ? 'none' : 'auto',
          transition: 'opacity .2s',
        }}>
          {TESTES.map((t, i) => {
            const salvo = (os?.pre_diagnostico?.checklist?.recebido?.itens || [])
              .find(x => x.id === t.id)
            return (
              <TestRow
                key={t.id}
                T={T} dark={dark}
                teste={t}
                value={testes[t.id]}
                autor={fmtAutor(salvo?.autor)}
                onChange={(v) => setResultado(t.id, v)}
                first={i === 0}
              />
            )
          })}
        </div>
      </AtlPanel>

      {/* 3. Vazamentos — só lavadora e lava-louças */}
      {temSecaoVazamentos && (
        <AtlPanel
          T={T} dark={dark}
          title="Vazamentos"
          footer={temVazamento ? 'Registrado — entra no relatório da OS.' : 'Toque pra marcar onde está vazando.'}>
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
                      autor={fmtAutor(autores[item.id])}
                      onSetAcao={(acao) => {
                        setMarcados(prev => {
                          const atual = { ...(prev[grupo.id] || {}) }
                          if (!acao) delete atual[item.id]
                          else atual[item.id] = acao
                          return { ...prev, [grupo.id]: atual }
                        })
                        setAutores(prev => {
                          const novo = { ...prev }
                          if (!acao) delete novo[item.id]
                          else novo[item.id] = carimbo()
                          return novo
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

      {/* 5. Observações Internas */}
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

      {/* 6. CTA */}
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
