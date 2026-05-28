// src/components/osDetalhe/acoes/AcaoEntregaHIG.jsx
// Entrega — Apple HIG, padrão idêntico ao AcaoAgendamentoHIG.
//
// Fase 1 — Aguardando agendar:
//   Dia (chips scroll) · Período (segmented) · Horário (grid) · Observações
// Fase 2 — Entrega agendada:
//   Countdown + barra · Ações (WhatsApp · Rota) · Foto da entrega · CTAs

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT, HIG_FONT_MONO,
  higType, higFilledButton, higInsetCard,
} from '../../../theme-hig'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { estaPagaTotal } from '../../../utils/osHelpers'
import {
  uploadFotoEntrega, removerFotoEntrega, resolverFotoUrl, FOTO_STORAGE_MARKER,
} from '../../../utils/osStorage'
import { useToast } from '../../ui'

// ─── Helpers de data/hora — idênticos ao Agenda ───────────────────────────────
const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const PERIODOS = [
  { id: 'manha', label: 'Manhã', ini: 6,  fim: 12 },
  { id: 'tarde', label: 'Tarde', ini: 12, fim: 18 },
  { id: 'noite', label: 'Noite', ini: 18, fim: 22 },
]
const proxNDias = (n = 14) => {
  const dias = []
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje); d.setDate(d.getDate() + i)
    dias.push({ iso: d.toISOString().slice(0, 10), dia: d.getDate(), dow: DOW[d.getDay()] })
  }
  return dias
}
const horariosDoPeriodo = (periodoId) => {
  const p = PERIODOS.find(x => x.id === periodoId) || PERIODOS[1]
  const out = []
  for (let h = p.ini; h < p.fim; h++)
    for (let m = 0; m < 60; m += 15)
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  return out
}
const fmtBR = (iso) => { if (!iso) return ''; const [, m, d] = iso.split('-'); return `${d}/${m}` }
const fmtDataHora = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso); if (isNaN(d)) return iso
  return d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const detectarPeriodo = (hora) => {
  if (!hora) return 'tarde'
  const h = parseInt(hora.split(':')[0], 10)
  if (h < 12) return 'manha'; if (h < 18) return 'tarde'; return 'noite'
}

// ─── HIGSection — idêntico ao Agenda ─────────────────────────────────────────
function HIGSection({ T, dark, title, children, footer }) {
  return (
    <section>
      <div style={{
        ...higType('footnote'), color: T.textMuted, textTransform: 'uppercase',
        padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`, letterSpacing: 0.5,
      }}>{title}</div>
      <div style={higInsetCard(T, dark)}>{children}</div>
      {footer && (
        <div style={{
          ...higType('footnote'), color: T.textMuted,
          padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0`,
        }}>{footer}</div>
      )}
    </section>
  )
}

// ─── iOS Segmented Control — idêntico ao Agenda ───────────────────────────────
function HIGSegmented({ T, dark, options, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: dark ? 'rgba(118,118,128,0.24)' : '#E9E9EB',
      borderRadius: 9, padding: 2, gap: 0,
    }}>
      {options.map(o => {
        const sel = o.id === value
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)} style={{
            flex: 1, minHeight: 32, border: 'none', borderRadius: 7,
            background: sel ? (dark ? '#636366' : '#FFFFFF') : 'transparent',
            color: T.textPrimary,
            ...higType('subheadline'), fontWeight: sel ? 600 : 400,
            cursor: 'pointer',
            boxShadow: sel ? '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)' : 'none',
            transition: 'background .15s', WebkitTapHighlightColor: 'transparent',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

// ─── Chip de dia — idêntico ao Agenda ────────────────────────────────────────
function HIGDayChip({ T, dark, dia, dow, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: '0 0 auto', width: 56, height: 64,
      borderRadius: HIG_RADIUS.card, border: 'none',
      background: selected ? HIG_COLOR.tintIdemaq : 'transparent',
      color: selected ? '#FFFFFF' : T.textPrimary,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 2,
      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      transition: 'background .15s',
    }}>
      <span style={{ ...higType('caption2'), color: selected ? 'rgba(255,255,255,0.8)' : T.textMuted, textTransform: 'uppercase' }}>{dow}</span>
      <span style={{ ...higType('title2'), color: selected ? '#FFFFFF' : T.textPrimary, fontWeight: 500 }}>{dia}</span>
    </button>
  )
}

// ─── Chip de horário — idêntico ao Agenda ────────────────────────────────────
function HIGTimeChip({ T, dark, label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      minHeight: 36, padding: '0 12px',
      borderRadius: HIG_RADIUS.card,
      border: selected ? 'none' : `1px solid ${T.border}`,
      background: selected ? HIG_COLOR.tintIdemaq : 'transparent',
      color: selected ? '#FFFFFF' : T.textPrimary,
      ...higType('subheadline'), fontWeight: selected ? 600 : 500,
      fontFamily: HIG_FONT_MONO,
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      WebkitTapHighlightColor: 'transparent', transition: 'background .15s',
    }}>{label}</button>
  )
}

// ─── List Row — idêntico ao Agenda ───────────────────────────────────────────
function HIGListRow({ T, dark, icon, iconColor, label, subtitle, onClick, disabled, separator }) {
  return (
    <>
      <button type="button" onClick={onClick} disabled={disabled} style={{
        width: '100%', minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        textAlign: 'left', fontFamily: HIG_FONT,
        WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: iconColor + '22', color: iconColor,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <TI name={icon} size={16} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...higType('body'), color: T.textPrimary }}>{label}</div>
          {subtitle && (
            <div style={{
              ...higType('footnote'), color: T.textMuted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{subtitle}</div>
          )}
        </div>
        <TI name="chevron-right" size={14} color={T.textDim} />
      </button>
      {separator && (
        <div style={{ height: 0.5, background: T.border, marginLeft: HIG_SPACE.md + 28 + HIG_SPACE.sm }} />
      )}
    </>
  )
}

// ─── Foto slot — idêntico ao Agenda ──────────────────────────────────────────
function FotoSlotHIG({ T, dark, label, url, uploading, onPick, onRemove }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: HIG_RADIUS.card, overflow: 'hidden',
      border: `1px ${url ? 'solid' : 'dashed'} ${T.border}`,
      background: url ? '#000' : T.bg,
      aspectRatio: '4 / 3', minHeight: 80,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <>
          <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={onRemove} title="Remover" style={{
            position: 'absolute', top: 6, right: 6,
            width: 28, height: 28, borderRadius: 999,
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name="x" size={14} />
          </button>
          <span style={{
            position: 'absolute', bottom: 6, left: 8,
            ...higType('caption2'), color: '#fff',
            background: 'rgba(0,0,0,0.55)', padding: '2px 8px', borderRadius: 6,
            backdropFilter: 'blur(4px)',
          }}>{label}</span>
        </>
      ) : (
        <button type="button" onClick={onPick} disabled={uploading} style={{
          width: '100%', height: '100%',
          background: 'transparent', border: 'none',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          color: HIG_COLOR.tintIdemaq, fontFamily: HIG_FONT,
          cursor: uploading ? 'wait' : 'pointer',
        }}>
          <TI name={uploading ? 'loader-2' : 'camera-plus'} size={22} />
          <span style={{ ...higType('subheadline'), fontWeight: 500 }}>
            {uploading ? 'Enviando…' : label}
          </span>
        </button>
      )}
    </div>
  )
}

// ─── Action Sheet — idêntico ao Agenda ───────────────────────────────────────
function ActionSheetHIG({ T, dark, onClose, actions }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: HIG_SPACE.xs,
      paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${HIG_SPACE.xs}px)`,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 500,
        display: 'flex', flexDirection: 'column', gap: HIG_SPACE.xs,
      }}>
        <div style={{ background: dark ? '#1C1C1E' : '#FFFFFF', borderRadius: HIG_RADIUS.sheet, overflow: 'hidden' }}>
          {actions.map((a, i) => (
            <React.Fragment key={i}>
              <button onClick={a.onClick} style={{
                width: '100%', minHeight: 56, padding: HIG_SPACE.sm,
                border: 'none', background: 'transparent',
                ...higType('body'),
                color: a.destructive ? HIG_COLOR.red : HIG_COLOR.tintIdemaq,
                fontWeight: 400, cursor: 'pointer', fontFamily: HIG_FONT,
                WebkitTapHighlightColor: 'transparent',
              }}>{a.label}</button>
              {i < actions.length - 1 && <div style={{ height: 0.5, background: T.border }} />}
            </React.Fragment>
          ))}
        </div>
        <button onClick={onClose} style={{
          minHeight: 56, borderRadius: HIG_RADIUS.sheet,
          background: dark ? '#1C1C1E' : '#FFFFFF',
          border: 'none', cursor: 'pointer',
          ...higType('headline'), color: HIG_COLOR.tintIdemaq, fontFamily: HIG_FONT,
          WebkitTapHighlightColor: 'transparent',
        }}>Cancelar</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fase 1 — Form agendar entrega
// ═══════════════════════════════════════════════════════════════════════════════
function FormAgendarEntrega({ os, onUpdateOS, onCancelar }) {
  const { T, dark } = useTheme()
  const notify = useToast()

  const entregaSalva = os?.pre_diagnostico?.entrega || {}
  const dataAgendada = entregaSalva.data || null
  const dataIso  = dataAgendada ? dataAgendada.slice(0, 10) : null
  const dataHora = dataAgendada ? dataAgendada.slice(11, 16) : null

  const dias = useMemo(() => proxNDias(14), [])
  const [diaSel, setDiaSel]       = useState(dataIso || dias[1]?.iso || dias[0]?.iso)
  const [periodoSel, setPeriodo]  = useState(detectarPeriodo(dataHora))
  const [horaSel, setHoraSel]     = useState(dataHora || null)
  const [obs, setObs]             = useState(os?.observacoes || '')
  const horarios = useMemo(() => horariosDoPeriodo(periodoSel), [periodoSel])
  const reagendando = !!dataIso
  const podeAgendar = !!diaSel && !!horaSel

  // Re-sincroniza obs quando outra etapa alterar
  useEffect(() => { setObs(os?.observacoes || '') }, [os?.observacoes])

  function agendar() {
    if (!podeAgendar) { notify('erro', 'Escolha o dia e o horário da entrega'); return }
    const iso = `${diaSel}T${horaSel}:00`
    onUpdateOS?.(os.numero, {
      observacoes: obs,
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        entrega: { ...entregaSalva, data: iso },
      },
    })
    notify('ok', `Entrega agendada para ${fmtDataHora(iso)}`)
  }

  const ctaLabel = podeAgendar
    ? (reagendando ? `Salvar ${fmtBR(diaSel)} · ${horaSel}` : `Agendar ${fmtBR(diaSel)} · ${horaSel}`)
    : 'Escolha dia e hora'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg, fontFamily: HIG_FONT }}>

      {/* DIA */}
      <HIGSection T={T} dark={dark} title="Dia">
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', padding: HIG_SPACE.xs, scrollbarWidth: 'none' }}>
          {dias.map(d => (
            <HIGDayChip key={d.iso} T={T} dark={dark}
              dia={d.dia} dow={d.dow}
              selected={d.iso === diaSel}
              onClick={() => setDiaSel(d.iso)} />
          ))}
        </div>
      </HIGSection>

      {/* PERÍODO */}
      <HIGSection T={T} dark={dark} title="Período">
        <div style={{ padding: HIG_SPACE.sm }}>
          <HIGSegmented T={T} dark={dark}
            options={PERIODOS} value={periodoSel} onChange={setPeriodo} />
        </div>
      </HIGSection>

      {/* HORÁRIO */}
      <HIGSection T={T} dark={dark} title={`Horário · ${horarios.length} opções`}
        footer="Escolha o horário disponível">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: HIG_SPACE.xs, padding: HIG_SPACE.sm }}>
          {horarios.map(h => (
            <HIGTimeChip key={h} T={T} dark={dark}
              label={h} selected={h === horaSel}
              onClick={() => setHoraSel(h)} />
          ))}
        </div>
      </HIGSection>

      {/* OBSERVAÇÕES */}
      <HIGSection T={T} dark={dark} title="Observações"
        footer="Visível em todas as etapas. Ex: levar a capa, entregar no portão.">
        <div style={{ padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px` }}>
          <textarea
            placeholder="Ex: entregar pela manhã, prédio 2º andar…"
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: `${HIG_SPACE.xs}px ${HIG_SPACE.sm}px`,
              borderRadius: HIG_RADIUS.small,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.04)' : HIG_COLOR.gray6,
              color: T.textPrimary,
              ...higType('subheadline'), fontFamily: HIG_FONT,
              outline: 'none', resize: 'vertical',
            }}
          />
        </div>
      </HIGSection>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: HIG_SPACE.sm }}>
        {reagendando && onCancelar && (
          <button onClick={onCancelar} style={{
            minHeight: HIG_SIZE.button, padding: `0 ${HIG_SPACE.md}px`,
            borderRadius: HIG_RADIUS.card,
            background: dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray5,
            color: T.textPrimary, border: 'none',
            ...higType('headline'), cursor: 'pointer', fontFamily: HIG_FONT,
            WebkitTapHighlightColor: 'transparent',
          }}>Cancelar</button>
        )}
        <button onClick={agendar} disabled={!podeAgendar} style={{
          ...higFilledButton(T, dark),
          flex: 1,
          opacity: podeAgendar ? 1 : 0.3,
          cursor: podeAgendar ? 'pointer' : 'not-allowed',
        }}>
          <TI name="calendar-check" size={18} />
          {ctaLabel}
        </button>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fase 2 — Entrega agendada (countdown + ações + foto + CTAs)
// ═══════════════════════════════════════════════════════════════════════════════
function EntregaAgendadaHIG({ os, admin, onUpdateOS, onMoverOS, onReagendar }) {
  const { T, dark } = useTheme()
  const notify = useToast()

  const jaPaga = estaPagaTotal(os)
  const entregaSalva = os?.pre_diagnostico?.entrega || {}
  const entregaData = entregaSalva.data || null
  const obsGlobal = os?.observacoes || ''

  const clienteStr = typeof os?.cliente === 'string' ? os.cliente : (os?.cliente?.nome || '')
  const primeiroNome = clienteStr.split(' ')[0] || 'Cliente'

  // Countdown
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const alvo = useMemo(() => {
    if (!entregaData) return null
    const d = new Date(entregaData); return isNaN(d) ? null : d
  }, [entregaData])

  const { bigLabel, unitLabel, pct } = useMemo(() => {
    if (!alvo) return { bigLabel: '—', unitLabel: '', pct: 0 }
    const deltaMs = alvo.getTime() - agora.getTime()
    if (deltaMs <= 0) return { bigLabel: 'agora', unitLabel: '', pct: 100 }
    const min = Math.floor(deltaMs / 60_000)
    const h = Math.floor(min / 60), m = min % 60
    const big = h >= 1 ? `${h}h` : `${m}min`
    const unit = h >= 1 ? `${m}min` : ''
    const totalMs = Math.max(deltaMs, 48 * 60 * 60_000)
    const pctVal = Math.max(5, Math.min(95, 100 - (deltaMs / totalMs) * 100))
    return { bigLabel: big, unitLabel: unit, pct: pctVal }
  }, [alvo, agora])

  const entregaLabel = alvo ? fmtDataHora(entregaData) : 'Sem horário definido'
  const dataISO = alvo ? alvo.toISOString().slice(0, 10) : null
  const horaStr = alvo ? `${String(alvo.getHours()).padStart(2, '0')}:${String(alvo.getMinutes()).padStart(2, '0')}` : null
  const coletaLabel = alvo ? `${fmtBR(dataISO)} · ${horaStr}` : 'Sem horário'

  // WhatsApp
  const abrirWhatsApp = () => {
    const fone = (os?.fone || '').replace(/\D/g, '')
    if (!fone) { notify('erro', 'Cliente sem telefone cadastrado'); return }
    const num = fone.startsWith('55') ? fone : '55' + fone
    const equip = [os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento || ''
    const texto = `Olá ${clienteStr || ''}! 👋\n\nA entrega da sua OS #${os.numero}${equip ? ` (${equip})` : ''} está agendada para:\n\n📅 ${entregaLabel}\n\n${obsGlobal ? `Obs: ${obsGlobal}\n\n` : ''}Qualquer coisa me avisa para reagendar. Até lá!`
    const url = `send?phone=${num}&text=${encodeURIComponent(texto)}`
    if (/Android/i.test(navigator.userAgent))
      window.location.href = `intent://${url}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.whatsapp.w4b;end`
    else
      window.location.href = `whatsapp://${url}`
  }

  const abrirRota = () => {
    if (!os?.endereco) return
    const q = encodeURIComponent(os.endereco)
    const ua = navigator.userAgent || ''
    if (/Android/i.test(ua)) window.location.href = `geo:0,0?q=${q}`
    else if (/iPhone|iPad|iPod/i.test(ua)) window.location.href = `maps://?q=${q}`
    else window.location.href = `https://www.google.com/maps/search/?api=1&query=${q}`
  }

  // Foto da entrega
  const salvoEntrega = os.pre_diagnostico?.foto_entrega || null
  const [fotoUrl, setFotoUrl]         = useState(null)
  const [fotoNoStorage, setNoStorage] = useState(salvoEntrega === FOTO_STORAGE_MARKER)
  const [uploading, setUploading]     = useState(false)
  const [escolha, setEscolha]         = useState(false)
  const inputCam = useRef(null)
  const inputGal = useRef(null)

  useEffect(() => {
    let canc = false
    ;(async () => {
      const url = await resolverFotoUrl(salvoEntrega, os.id, 'entrega')
      if (!canc) setFotoUrl(url)
    })()
    return () => { canc = true }
  }, [salvoEntrega, os.id])

  async function escolherFoto(file) {
    if (!file?.type?.startsWith('image/')) return
    setUploading(true)
    const res = await uploadFotoEntrega(os.id, file)
    setUploading(false)
    if (!res.ok) { notify('erro', `Falha ao enviar foto: ${res.error}`); return }
    setFotoUrl(res.url); setNoStorage(true)
    onUpdateOS?.(os.numero, {
      pre_diagnostico: { ...(os.pre_diagnostico || {}), foto_entrega: FOTO_STORAGE_MARKER },
    })
    notify('ok', 'Foto da entrega adicionada')
  }

  async function removerFoto() {
    if (!window.confirm('Remover a foto da entrega?')) return
    if (fotoNoStorage) await removerFotoEntrega(os.id)
    setFotoUrl(null); setNoStorage(false)
    const { foto_entrega, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
    notify('ok', 'Foto removida')
  }

  // Confirmar entrega
  function confirmarEntrega() {
    if (!admin && !fotoNoStorage && !fotoUrl) {
      notify('erro', 'Tire a foto da entrega antes de confirmar.')
      return
    }
    if (!window.confirm(jaPaga
      ? 'Confirmar entrega? A OS vai direto para Concluído (já paga).'
      : 'Confirmar entrega? A OS vai para Pagamento.')) return

    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        entrega: { ...entregaSalva, realizada_em: new Date().toISOString() },
      },
    })
    const destino = jaPaga ? 'concluido' : 'pagamento'
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === destino)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  const podeConfirmar = admin || fotoNoStorage || !!fotoUrl

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg, fontFamily: HIG_FONT }}>

      {/* Countdown — idêntico ao Coleta */}
      <HIGSection T={T} dark={dark} title="Entrega">
        <div style={{ padding: HIG_SPACE.md }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: HIG_SPACE.xs }}>
            <span style={{ ...higType('largeTitle'), color: T.textPrimary, fontFamily: HIG_FONT }}>
              {bigLabel}
            </span>
            {unitLabel && <span style={{ ...higType('callout'), color: T.textMuted }}>{unitLabel}</span>}
          </div>
          <div style={{ ...higType('subheadline'), color: T.textMuted, marginTop: HIG_SPACE.xs }}>
            <strong style={{ color: T.textPrimary, fontWeight: 600 }}>{coletaLabel}</strong>
          </div>
          <div style={{
            height: 4, marginTop: HIG_SPACE.sm,
            background: dark ? 'rgba(255,255,255,0.10)' : '#E5E5EA',
            borderRadius: 999, overflow: 'hidden',
          }}>
            <span style={{
              display: 'block', height: '100%', width: `${pct}%`,
              background: HIG_COLOR.tintIdemaq,
              borderRadius: 999, transition: 'width .3s',
            }} />
          </div>
        </div>
      </HIGSection>

      {/* Ações — WhatsApp + Rota */}
      <HIGSection T={T} dark={dark} title="Ações">
        <HIGListRow T={T} dark={dark}
          icon="brand-whatsapp" iconColor="#34C759"
          label={`Avisar ${primeiroNome}`}
          subtitle={os?.fone || 'Sem telefone'}
          disabled={!os?.fone}
          onClick={abrirWhatsApp}
          separator />
        <HIGListRow T={T} dark={dark}
          icon="map-pin" iconColor={HIG_COLOR.tintIdemaq}
          label="Abrir rota"
          subtitle={os?.endereco || 'Sem endereço'}
          disabled={!os?.endereco}
          onClick={abrirRota} />
      </HIGSection>

      {/* Foto da entrega */}
      <HIGSection T={T} dark={dark} title="Foto da entrega"
        footer={admin ? 'Opcional para administrador' : 'Obrigatória — comprova devolução em bom estado'}>
        <div style={{ padding: HIG_SPACE.sm }}>
          <FotoSlotHIG T={T} dark={dark}
            label="Entrega"
            url={fotoUrl} uploading={uploading}
            onPick={() => setEscolha(true)}
            onRemove={removerFoto} />
        </div>
        <input ref={inputCam} type="file" accept="image/*" capture="environment"
          onChange={e => escolherFoto(e.target.files?.[0])} style={{ display: 'none' }} />
        <input ref={inputGal} type="file" accept="image/*"
          onChange={e => escolherFoto(e.target.files?.[0])} style={{ display: 'none' }} />
      </HIGSection>

      {escolha && (
        <ActionSheetHIG T={T} dark={dark}
          onClose={() => setEscolha(false)}
          actions={[
            { label: 'Tirar foto', onClick: () => { inputCam.current?.click(); setEscolha(false) } },
            { label: 'Escolher dos arquivos', onClick: () => { inputGal.current?.click(); setEscolha(false) } },
          ]} />
      )}

      {/* CTAs: Reagendar + Confirmar */}
      <div style={{ display: 'flex', gap: HIG_SPACE.sm }}>
        <button onClick={onReagendar} style={{
          minHeight: HIG_SIZE.button, padding: `0 ${HIG_SPACE.md}px`,
          borderRadius: HIG_RADIUS.card,
          background: dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray5,
          color: T.textPrimary, border: 'none',
          ...higType('headline'), cursor: 'pointer', fontFamily: HIG_FONT,
          WebkitTapHighlightColor: 'transparent',
          display: 'inline-flex', alignItems: 'center', gap: HIG_SPACE.xs,
        }}>
          <TI name="calendar-event" size={16} />
          Reagendar
        </button>
        <button onClick={confirmarEntrega} style={{
          ...higFilledButton(T, dark),
          flex: 1,
          opacity: podeConfirmar ? 1 : 0.4,
          cursor: podeConfirmar ? 'pointer' : 'not-allowed',
        }}>
          <TI name="check" size={18} />
          {jaPaga ? 'Confirmar · Concluir OS' : 'Confirmar · Pagamento'}
        </button>
      </div>

    </div>
  )
}

// ─── Dispatcher — decide fase ─────────────────────────────────────────────────
export default function AcaoEntregaHIG({ os, user, usuarios, admin, onUpdateOS, onMoverOS }) {
  const [editando, setEditando] = useState(false)
  const dataAgendada = os?.pre_diagnostico?.entrega?.data || null
  const emFase2 = !!dataAgendada && !editando

  if (emFase2) {
    return (
      <EntregaAgendadaHIG
        os={os} admin={admin}
        onUpdateOS={onUpdateOS} onMoverOS={onMoverOS}
        onReagendar={() => setEditando(true)}
      />
    )
  }

  return (
    <FormAgendarEntrega
      os={os}
      onUpdateOS={onUpdateOS}
      onCancelar={dataAgendada ? () => setEditando(false) : null}
    />
  )
}
