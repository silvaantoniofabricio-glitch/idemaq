// src/components/osDetalhe/acoes/AcaoAgendamentoM3.jsx
// Versao Material Design 3 (Google) da etapa Agendamento.
// Usa os tokens de src/theme-m3.js: spacing 4/8/12/16/24, tipografia
// Title/Body/Label, shape full (pills) pra botoes, filter chips pra dia/hora,
// elevation suave em cards.

import React, { useState, useMemo, useEffect } from 'react'
import { useTheme } from '../../../theme'
import { TI, PALETA } from '../../_shared/PrimitivasMobile'
import {
  M3_SPACE, M3_SHAPE, M3_SIZE, M3_ELEVATION,
  m3Type, m3FilledButton, m3FilterChip, m3OutlinedCard, m3TextButton,
} from '../../../theme-m3'
import { uploadFotoOS, resolverFotoUrl, removerFotoOS, FOTO_STORAGE_MARKER } from '../../../utils/osStorage'

const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const PERIODOS = [
  { id: 'manha', label: 'Manhã', icon: 'sunrise', ini: 6, fim: 12 },
  { id: 'tarde', label: 'Tarde', icon: 'sun', ini: 12, fim: 18 },
  { id: 'noite', label: 'Noite', icon: 'moon', ini: 18, fim: 22 },
]
const proxNDias = (n = 14) => {
  const dias = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje)
    d.setDate(d.getDate() + i)
    dias.push({
      iso: d.toISOString().slice(0, 10),
      dia: d.getDate(),
      dow: DOW[d.getDay()],
      isHoje: i === 0,
    })
  }
  return dias
}
const horariosDoPeriodo = (periodoId) => {
  const p = PERIODOS.find(x => x.id === periodoId) || PERIODOS[1]
  const out = []
  for (let h = p.ini; h < p.fim; h++) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return out
}
const fmtBR = (iso) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ─── M3 Card outlined com header (Section) ────────────────────────────────
function M3Section({ T, dark, icon, title, action, children }) {
  return (
    <section style={m3OutlinedCard(T, dark)}>
      <header style={{
        padding: `${M3_SPACE.sm}px ${M3_SPACE.md}px`,
        display: 'flex', alignItems: 'center', gap: M3_SPACE.sm,
        borderBottom: `1px solid ${T.border}`,
      }}>
        {icon && (
          <TI name={icon} size={18} color={PALETA.blueStrong} />
        )}
        <h3 style={{
          ...m3Type('titleSmall'),
          margin: 0, color: T.textPrimary, flex: 1,
        }}>{title}</h3>
        {action}
      </header>
      <div style={{ padding: M3_SPACE.md }}>{children}</div>
    </section>
  )
}

// ─── Chip de dia (M3 Filter Chip variant) — 56x56 pra fit DOW+dia ─────────
function M3DayChip({ T, dark, dia, dow, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: '0 0 auto', width: 56, height: 56,
        borderRadius: M3_SHAPE.medium,
        border: `1px solid ${selected ? PALETA.blue : T.border}`,
        background: selected
          ? (dark ? 'rgba(91,155,213,0.22)' : '#E3F2FD')
          : T.bg,
        color: selected ? PALETA.blueStrong : T.textPrimary,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        cursor: 'pointer', fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .15s, border-color .15s',
      }}>
      <span style={{
        ...m3Type('labelSmall'),
        color: selected ? PALETA.blueStrong : T.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>{dow}</span>
      <span style={{
        ...m3Type('titleMedium'),
        color: selected ? PALETA.blueStrong : T.textPrimary,
        lineHeight: '20px',
      }}>{dia}</span>
    </button>
  )
}

// ─── Segmented buttons (M3) pra Periodo ───────────────────────────────────
function M3SegmentedPeriodos({ T, dark, periodos, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      borderRadius: M3_SHAPE.full,
      border: `1px solid ${T.border}`,
      overflow: 'hidden',
    }}>
      {periodos.map((p, i) => {
        const sel = p.id === value
        return (
          <button key={p.id} type="button" onClick={() => onChange(p.id)}
            style={{
              flex: 1, minHeight: M3_SIZE.buttonHeight,
              padding: `0 ${M3_SPACE.sm}px`,
              border: 'none',
              borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
              background: sel
                ? (dark ? 'rgba(91,155,213,0.22)' : '#E3F2FD')
                : 'transparent',
              color: sel ? PALETA.blueStrong : T.textPrimary,
              ...m3Type('labelLarge'),
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              WebkitTapHighlightColor: 'transparent',
            }}>
            {sel && <TI name="check" size={16} color={PALETA.blueStrong} />}
            <TI name={p.icon} size={16}
              color={sel ? PALETA.blueStrong : T.textMuted} />
            <span>{p.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Time chip (M3 Filter Chip) ───────────────────────────────────────────
function M3TimeChip({ T, dark, label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        ...m3FilterChip(T, dark, { selected }),
        minHeight: M3_SIZE.chipHeight,
        fontFamily: 'ui-monospace,monospace',
        padding: 0,
      }}>
      {selected && <TI name="check" size={14} color={PALETA.blueStrong} />}
      <span>{label}</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Fase 1 — Aguardando agendar (form)
// ═══════════════════════════════════════════════════════════════════════════
function AgAgendaM3({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()
  const dias = useMemo(() => proxNDias(14), [])
  const dataInicial = os?.data_agendamento?.slice(0, 10) || os?.coleta?.data || dias[1]?.iso
  const horaInicial = os?.data_agendamento?.slice(11, 16) || os?.coleta?.hora || null
  const [diaSel, setDiaSel] = useState(dataInicial)
  const [periodoSel, setPeriodoSel] = useState(os?.coleta?.periodo || (
    horaInicial && parseInt(horaInicial, 10) < 12 ? 'manha'
    : horaInicial && parseInt(horaInicial, 10) < 18 ? 'tarde'
    : horaInicial ? 'noite' : 'tarde'
  ))
  const [horaSel, setHoraSel] = useState(horaInicial)
  const horarios = useMemo(() => horariosDoPeriodo(periodoSel), [periodoSel])
  const podeConfirmar = !!diaSel && !!horaSel

  const confirmar = async () => {
    if (!podeConfirmar) return
    const iso = new Date(`${diaSel}T${horaSel}:00-04:00`).toISOString()
    await onUpdateOS?.(os.numero, { data_agendamento: iso })
    onMoverOS?.(os.numero, 'agendamento')
  }

  const ctaLabel = podeConfirmar ? `Confirmar · ${fmtBR(diaSel)} ${horaSel}` : 'Escolha dia e hora'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: M3_SPACE.sm }}>
      {/* DIA */}
      <M3Section T={T} dark={dark} icon="calendar" title="Dia">
        <div style={{
          display: 'flex', gap: M3_SPACE.xs, overflowX: 'auto',
          margin: `0 -${M3_SPACE.md}px`, padding: `0 ${M3_SPACE.md}px`,
          scrollbarWidth: 'none',
        }}>
          {dias.map(d => (
            <M3DayChip key={d.iso} T={T} dark={dark}
              dia={d.dia} dow={d.dow}
              selected={d.iso === diaSel}
              onClick={() => setDiaSel(d.iso)} />
          ))}
        </div>
      </M3Section>

      {/* PERIODO */}
      <M3Section T={T} dark={dark} icon="clock" title="Período">
        <M3SegmentedPeriodos T={T} dark={dark}
          periodos={PERIODOS} value={periodoSel} onChange={setPeriodoSel} />
      </M3Section>

      {/* HORARIO */}
      <M3Section T={T} dark={dark} icon="clock-hour-4" title={`Horário · ${horarios.length} opções`}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: M3_SPACE.xs,
        }}>
          {horarios.map(h => (
            <M3TimeChip key={h} T={T} dark={dark}
              label={h}
              selected={h === horaSel}
              onClick={() => setHoraSel(h)} />
          ))}
        </div>
      </M3Section>

      {/* CTA — Filled button M3 (pill) */}
      <button onClick={confirmar} disabled={!podeConfirmar}
        style={{
          ...m3FilledButton(T, dark),
          opacity: podeConfirmar ? 1 : 0.38,
          cursor: podeConfirmar ? 'pointer' : 'not-allowed',
          boxShadow: podeConfirmar ? M3_ELEVATION[1] : 'none',
        }}>
        <TI name="calendar-check" size={18} />
        {ctaLabel}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Fase 2 — Agendado (countdown + atalhos + identificacao)
// ═══════════════════════════════════════════════════════════════════════════
function AgendadoM3({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const alvo = useMemo(() => {
    const iso = os?.data_agendamento
    if (!iso) return null
    const d = new Date(iso)
    return isNaN(d) ? null : d
  }, [os?.data_agendamento])

  const dataISO = alvo ? alvo.toISOString().slice(0, 10) : null
  const horaStr = alvo ? `${String(alvo.getHours()).padStart(2, '0')}:${String(alvo.getMinutes()).padStart(2, '0')}` : null

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

  const coletaLabel = alvo ? `${fmtBR(dataISO)} · ${horaStr}` : 'Sem horário definido'
  const clienteStr = typeof os?.cliente === 'string' ? os.cliente : (os?.cliente?.nome || '')
  const primeiroNome = clienteStr.split(' ')[0] || 'Cliente'

  const abrirWhatsApp = () => {
    const fone = (os?.fone || '').replace(/\D/g, '')
    if (!fone) return
    const num = fone.startsWith('55') ? fone : '55' + fone
    window.location.href = `whatsapp://send?phone=${num}`
  }
  const abrirRota = () => {
    if (!os?.endereco) return
    const q = encodeURIComponent(os.endereco)
    const ua = navigator.userAgent || ''
    if (/Android/i.test(ua)) window.location.href = `geo:0,0?q=${q}`
    else if (/iPhone|iPad|iPod/i.test(ua)) window.location.href = `maps://?q=${q}`
    else window.location.href = `https://www.google.com/maps/search/?api=1&query=${q}`
  }

  // IdentificacaoMaquina state
  const [modelo, setModelo] = useState(os?.modelo || '')
  const [serie, setSerie] = useState(os?.serie || '')
  const ref1 = pre => pre?.foto_coleta_1 || pre?.foto_coleta || null
  const ref2 = pre => pre?.foto_coleta_2 || null
  const [foto1Url, setFoto1Url] = useState(null)
  const [foto2Url, setFoto2Url] = useState(null)
  const [up1, setUp1] = useState(false)
  const [up2, setUp2] = useState(false)
  const inputCam1 = React.useRef(null)
  const inputGal1 = React.useRef(null)
  const inputCam2 = React.useRef(null)
  const inputGal2 = React.useRef(null)
  const [escolhaSlot, setEscolhaSlot] = useState(null)

  useEffect(() => {
    let canc = false
    ;(async () => {
      const u1 = await resolverFotoUrl(ref1(os?.pre_diagnostico), os?.id, 'coleta_1')
      const u2 = await resolverFotoUrl(ref2(os?.pre_diagnostico), os?.id, 'coleta_2')
      if (!canc) { setFoto1Url(u1); setFoto2Url(u2) }
    })()
    return () => { canc = true }
  }, [os?.id, os?.pre_diagnostico])

  async function escolherFoto(file, slot) {
    if (!file?.type?.startsWith('image/')) return
    const setUp = slot === 1 ? setUp1 : setUp2
    setUp(true)
    const tipo = slot === 1 ? 'coleta_1' : 'coleta_2'
    const res = await uploadFotoOS(os.id, file, tipo)
    setUp(false)
    if (!res.ok) return
    if (slot === 1) setFoto1Url(res.url)
    else setFoto2Url(res.url)
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        [`foto_coleta_${slot}`]: FOTO_STORAGE_MARKER,
      },
    })
  }
  async function removerFotoSlot(slot) {
    if (!window.confirm('Remover esta foto?')) return
    const tipo = slot === 1 ? 'coleta_1' : 'coleta_2'
    await removerFotoOS(os.id, tipo)
    if (slot === 1) setFoto1Url(null); else setFoto2Url(null)
    const key = `foto_coleta_${slot}`
    const { [key]: _, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
  }

  const temIdent = !!(modelo || foto1Url || foto2Url)
  function confirmar() {
    const patch = {}
    if (modelo !== (os?.modelo || '')) patch.modelo_equipamento = modelo
    if (serie !== (os?.serie || '')) patch.numero_serie = serie
    if (Object.keys(patch).length) onUpdateOS?.(os.numero, patch)
    onMoverOS?.(os.numero, 'recebido')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: M3_SPACE.sm }}>
      {/* Countdown card */}
      <M3Section T={T} dark={dark} icon="clock" title="Coleta em">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: M3_SPACE.xs }}>
          <span style={{
            ...m3Type('displaySmall'),
            color: T.textPrimary,
            fontFamily: 'ui-monospace,monospace',
          }}>{bigLabel}</span>
          {unitLabel && (
            <span style={{ ...m3Type('bodyMedium'), color: T.textMuted }}>{unitLabel}</span>
          )}
        </div>
        <div style={{
          ...m3Type('bodyMedium'),
          color: T.textMuted, marginTop: M3_SPACE.xs,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <TI name="calendar-event" size={16} />
          <strong style={{ color: T.textPrimary, fontWeight: 500 }}>{coletaLabel}</strong>
        </div>
        <div style={{
          height: 6, marginTop: M3_SPACE.sm,
          background: dark ? 'rgba(255,255,255,0.10)' : '#E5E7EB',
          borderRadius: M3_SHAPE.full, overflow: 'hidden',
        }}>
          <span style={{
            display: 'block', height: '100%', width: `${pct}%`,
            background: PALETA.blue,
            borderRadius: M3_SHAPE.full, transition: 'width .3s',
          }}/>
        </div>
      </M3Section>

      {/* Atalhos: WhatsApp + Rota (M3 outlined cards clickaveis) */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: M3_SPACE.xs,
      }}>
        <button onClick={abrirWhatsApp} disabled={!os?.fone}
          style={{
            ...m3OutlinedCard(T, dark),
            padding: M3_SPACE.sm,
            display: 'flex', alignItems: 'center', gap: M3_SPACE.sm,
            cursor: os?.fone ? 'pointer' : 'not-allowed',
            opacity: os?.fone ? 1 : 0.38,
            textAlign: 'left', fontFamily: 'inherit',
            minHeight: 56,
          }}>
          <span style={{
            width: 40, height: 40, borderRadius: M3_SHAPE.full,
            background: dark ? 'rgba(46,125,94,0.20)' : '#E8F8EC',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name="brand-whatsapp" size={20} color="#25D366" />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{
              display: 'block', ...m3Type('labelSmall'),
              color: T.textMuted,
            }}>Confirmar com</span>
            <span style={{
              display: 'block', ...m3Type('titleSmall'),
              color: T.textPrimary, marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{primeiroNome}</span>
          </span>
        </button>

        <button onClick={abrirRota} disabled={!os?.endereco}
          style={{
            ...m3OutlinedCard(T, dark),
            padding: M3_SPACE.sm,
            display: 'flex', alignItems: 'center', gap: M3_SPACE.sm,
            cursor: os?.endereco ? 'pointer' : 'not-allowed',
            opacity: os?.endereco ? 1 : 0.38,
            textAlign: 'left', fontFamily: 'inherit',
            minHeight: 56,
          }}>
          <span style={{
            width: 40, height: 40, borderRadius: M3_SHAPE.full,
            background: dark ? 'rgba(91,155,213,0.20)' : '#E3F2FD',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name="map-pin" size={20} color={PALETA.blueStrong} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{
              display: 'block', ...m3Type('labelSmall'),
              color: T.textMuted,
            }}>Abrir</span>
            <span style={{
              display: 'block', ...m3Type('titleSmall'),
              color: T.textPrimary, marginTop: 2,
            }}>Rota</span>
          </span>
        </button>
      </div>

      {/* Dados do equipamento */}
      <M3Section T={T} dark={dark} icon="device-laptop" title="Dados do equipamento">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: M3_SPACE.sm }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ ...m3Type('labelMedium'), color: T.textMuted }}>Modelo</span>
            <input value={modelo} onChange={e => setModelo(e.target.value)}
              placeholder="Ex: BWK11A"
              style={{
                ...m3Type('bodyLarge'),
                width: '100%', boxSizing: 'border-box',
                padding: `${M3_SPACE.xs}px ${M3_SPACE.sm}px`,
                borderRadius: M3_SHAPE.small,
                border: `1px solid ${T.border}`,
                background: T.bg, color: T.textPrimary,
                outline: 'none', fontFamily: 'inherit',
                minWidth: 0,
              }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ ...m3Type('labelMedium'), color: T.textMuted }}>Nº de série</span>
            <input value={serie} onChange={e => setSerie(e.target.value)}
              placeholder="BR-2024-887"
              style={{
                ...m3Type('bodyLarge'),
                width: '100%', boxSizing: 'border-box',
                padding: `${M3_SPACE.xs}px ${M3_SPACE.sm}px`,
                borderRadius: M3_SHAPE.small,
                border: `1px solid ${T.border}`,
                background: T.bg, color: T.textPrimary,
                outline: 'none',
                fontFamily: 'ui-monospace,monospace',
                minWidth: 0,
              }} />
          </label>
        </div>
      </M3Section>

      {/* Fotos */}
      <M3Section T={T} dark={dark} icon="camera" title="Fotos do equipamento">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: M3_SPACE.xs }}>
          <FotoSlotM3 T={T} dark={dark} label="Etiqueta"
            url={foto1Url} uploading={up1}
            onPick={() => setEscolhaSlot(1)}
            onRemove={() => removerFotoSlot(1)} />
          <FotoSlotM3 T={T} dark={dark} label="Estado"
            url={foto2Url} uploading={up2}
            onPick={() => setEscolhaSlot(2)}
            onRemove={() => removerFotoSlot(2)} />
        </div>
        <input ref={inputCam1} type="file" accept="image/*" capture="environment"
          onChange={(e) => escolherFoto(e.target.files?.[0], 1)} style={{ display: 'none' }} />
        <input ref={inputGal1} type="file" accept="image/*"
          onChange={(e) => escolherFoto(e.target.files?.[0], 1)} style={{ display: 'none' }} />
        <input ref={inputCam2} type="file" accept="image/*" capture="environment"
          onChange={(e) => escolherFoto(e.target.files?.[0], 2)} style={{ display: 'none' }} />
        <input ref={inputGal2} type="file" accept="image/*"
          onChange={(e) => escolherFoto(e.target.files?.[0], 2)} style={{ display: 'none' }} />
      </M3Section>

      {escolhaSlot && (
        <EscolhaFotoSheetM3 T={T} dark={dark}
          onClose={() => setEscolhaSlot(null)}
          onCamera={() => {
            ;(escolhaSlot === 1 ? inputCam1 : inputCam2).current?.click()
            setEscolhaSlot(null)
          }}
          onGaleria={() => {
            ;(escolhaSlot === 1 ? inputGal1 : inputGal2).current?.click()
            setEscolhaSlot(null)
          }} />
      )}

      {/* CTA Filled */}
      <button onClick={confirmar} disabled={!temIdent}
        style={{
          ...m3FilledButton(T, dark),
          opacity: temIdent ? 1 : 0.38,
          cursor: temIdent ? 'pointer' : 'not-allowed',
          boxShadow: temIdent ? M3_ELEVATION[1] : 'none',
        }}>
        <TI name="package-import" size={18} />
        Confirmar recebimento
      </button>
    </div>
  )
}

function FotoSlotM3({ T, dark, label, url, uploading, onPick, onRemove }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: M3_SHAPE.medium, overflow: 'hidden',
      border: `1px ${url ? 'solid' : 'dashed'} ${T.border}`,
      background: url ? '#000' : T.bg,
      aspectRatio: '4 / 3', minHeight: 80,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <>
          <img src={url} alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={onRemove} title="Remover"
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 32, height: 32, borderRadius: M3_SHAPE.full,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <TI name="x" size={16} />
          </button>
          <span style={{
            position: 'absolute', bottom: 6, left: 8,
            ...m3Type('labelSmall'),
            color: '#fff', background: 'rgba(0,0,0,0.55)',
            padding: '2px 8px', borderRadius: M3_SHAPE.small,
          }}>{label}</span>
        </>
      ) : (
        <button type="button" onClick={onPick} disabled={uploading}
          style={{
            width: '100%', height: '100%',
            background: 'transparent', border: 'none',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            color: PALETA.blueStrong, fontFamily: 'inherit',
            cursor: uploading ? 'wait' : 'pointer',
          }}>
          <TI name={uploading ? 'loader-2' : 'camera-plus'} size={24} />
          <span style={{ ...m3Type('labelMedium') }}>
            {uploading ? 'Enviando…' : label}
          </span>
        </button>
      )}
    </div>
  )
}

function EscolhaFotoSheetM3({ T, dark, onClose, onCamera, onGaleria }) {
  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: T.card,
          borderRadius: `${M3_SHAPE.extraLarge}px ${M3_SHAPE.extraLarge}px 0 0`,
          padding: `${M3_SPACE.sm}px ${M3_SPACE.md}px calc(env(safe-area-inset-bottom, 0px) + ${M3_SPACE.md}px)`,
          boxShadow: M3_ELEVATION[3],
          display: 'flex', flexDirection: 'column', gap: M3_SPACE.sm,
        }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: M3_SPACE.xxs }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: T.border }} />
        </div>
        <h3 style={{
          ...m3Type('titleMedium'),
          margin: 0, color: T.textPrimary,
          textAlign: 'center', marginBottom: M3_SPACE.xxs,
        }}>Adicionar foto</h3>
        <button onClick={onCamera} style={sheetItemM3(T, dark)}>
          <TI name="camera" size={22} color={PALETA.blueStrong} />
          <div style={{ flex: 1 }}>
            <div style={{ ...m3Type('titleSmall'), color: T.textPrimary }}>Tirar foto</div>
            <div style={{ ...m3Type('bodySmall'), color: T.textMuted }}>Abre a câmera</div>
          </div>
        </button>
        <button onClick={onGaleria} style={sheetItemM3(T, dark)}>
          <TI name="photo" size={22} color={PALETA.blueStrong} />
          <div style={{ flex: 1 }}>
            <div style={{ ...m3Type('titleSmall'), color: T.textPrimary }}>Escolher dos arquivos</div>
            <div style={{ ...m3Type('bodySmall'), color: T.textMuted }}>Galeria do celular</div>
          </div>
        </button>
        <button onClick={onClose} style={m3TextButton(T, dark)}>Cancelar</button>
      </div>
    </div>
  )
}

function sheetItemM3(T, dark) {
  return {
    display: 'flex', alignItems: 'center', gap: M3_SPACE.sm,
    padding: M3_SPACE.md, borderRadius: M3_SHAPE.medium,
    background: dark ? 'rgba(255,255,255,0.04)' : T.cardAlt,
    border: `1px solid ${T.border}`,
    cursor: 'pointer', fontFamily: 'inherit',
    textAlign: 'left', minHeight: 56,
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────
export default function AcaoAgendamentoM3({ os, onUpdateOS, onMoverOS }) {
  if (os?.etapa === 'agendado') {
    return <AgendadoM3 os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />
  }
  return <AgAgendaM3 os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />
}
