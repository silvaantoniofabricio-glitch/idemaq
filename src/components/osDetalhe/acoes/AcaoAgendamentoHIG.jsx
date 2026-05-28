// src/components/osDetalhe/acoes/AcaoAgendamentoHIG.jsx
// Versao Apple HIG (Human Interface Guidelines) da etapa Agendamento.
// Usa tokens de src/theme-hig.js: SF font, inset grouped list, segmented
// control iOS, tap target 44pt, type ramp HIG, bordered prominent button.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from '../../../theme'
import { TI, PALETA } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT, HIG_FONT_MONO,
  higType, higFilledButton, higInsetCard, higPlainButton, higTintedButton,
} from '../../../theme-hig'
import { uploadFotoOS, resolverFotoUrl, removerFotoOS, FOTO_STORAGE_MARKER } from '../../../utils/osStorage'

const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const PERIODOS = [
  { id: 'manha', label: 'Manhã', ini: 6, fim: 12 },
  { id: 'tarde', label: 'Tarde', ini: 12, fim: 18 },
  { id: 'noite', label: 'Noite', ini: 18, fim: 22 },
]
const proxNDias = (n = 14) => {
  const dias = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje); d.setDate(d.getDate() + i)
    dias.push({ iso: d.toISOString().slice(0, 10), dia: d.getDate(), dow: DOW[d.getDay()] })
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

// ─── HIG Section (titulo footnote uppercase + inset card embaixo) ─────────
function HIGSection({ T, dark, title, children, footer }) {
  return (
    <section>
      <div style={{
        ...higType('footnote'),
        color: T.textMuted,
        textTransform: 'uppercase',
        padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
        letterSpacing: 0.5,
      }}>{title}</div>
      <div style={higInsetCard(T, dark)}>{children}</div>
      {footer && (
        <div style={{
          ...higType('footnote'),
          color: T.textMuted,
          padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0`,
        }}>{footer}</div>
      )}
    </section>
  )
}

// ─── iOS Segmented Control ────────────────────────────────────────────────
function HIGSegmented({ T, dark, options, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: dark ? 'rgba(118,118,128,0.24)' : '#E9E9EB',
      borderRadius: 9,
      padding: 2,
      gap: 0,
    }}>
      {options.map(o => {
        const sel = o.id === value
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            style={{
              flex: 1, minHeight: 32,
              border: 'none',
              borderRadius: 7,
              background: sel ? (dark ? '#636366' : '#FFFFFF') : 'transparent',
              color: T.textPrimary,
              ...higType('subheadline'),
              fontWeight: sel ? 600 : 400,
              cursor: 'pointer',
              boxShadow: sel ? '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)' : 'none',
              transition: 'background .15s',
              WebkitTapHighlightColor: 'transparent',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Chip de dia (calendario horizontal) ──────────────────────────────────
function HIGDayChip({ T, dark, dia, dow, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: '0 0 auto', width: 56, height: 64,
        borderRadius: HIG_RADIUS.card,
        border: 'none',
        background: selected ? HIG_COLOR.tintIdemaq : 'transparent',
        color: selected ? '#FFFFFF' : T.textPrimary,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .15s',
      }}>
      <span style={{
        ...higType('caption2'),
        color: selected ? 'rgba(255,255,255,0.8)' : T.textMuted,
        textTransform: 'uppercase',
      }}>{dow}</span>
      <span style={{
        ...higType('title2'),
        color: selected ? '#FFFFFF' : T.textPrimary,
        fontWeight: 500,
      }}>{dia}</span>
    </button>
  )
}

// ─── Chip de horario (estilo Calendar app slot) ───────────────────────────
function HIGTimeChip({ T, dark, label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        minHeight: 36, padding: '0 12px',
        borderRadius: HIG_RADIUS.card,
        border: selected ? 'none' : `1px solid ${T.border}`,
        background: selected ? HIG_COLOR.tintIdemaq : 'transparent',
        color: selected ? '#FFFFFF' : T.textPrimary,
        ...higType('subheadline'),
        fontWeight: selected ? 600 : 500,
        fontFamily: HIG_FONT_MONO,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .15s',
      }}>{label}</button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Fase 1 — Aguardando agendar (form)
// ═══════════════════════════════════════════════════════════════════════════
function AgAgendaHIG({ os, onUpdateOS, onMoverOS }) {
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

  const ctaLabel = podeConfirmar ? `Confirmar ${fmtBR(diaSel)} · ${horaSel}` : 'Escolha dia e hora'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: HIG_SPACE.lg,
      fontFamily: HIG_FONT,
    }}>
      {/* DIA */}
      <HIGSection T={T} dark={dark} title="Dia">
        <div style={{
          display: 'flex', gap: 0, overflowX: 'auto',
          padding: HIG_SPACE.xs, scrollbarWidth: 'none',
        }}>
          {dias.map(d => (
            <HIGDayChip key={d.iso} T={T} dark={dark}
              dia={d.dia} dow={d.dow}
              selected={d.iso === diaSel}
              onClick={() => setDiaSel(d.iso)} />
          ))}
        </div>
      </HIGSection>

      {/* PERIODO — iOS Segmented Control */}
      <HIGSection T={T} dark={dark} title="Período">
        <div style={{ padding: HIG_SPACE.sm }}>
          <HIGSegmented T={T} dark={dark}
            options={PERIODOS} value={periodoSel} onChange={setPeriodoSel} />
        </div>
      </HIGSection>

      {/* HORARIO */}
      <HIGSection T={T} dark={dark} title={`Horário · ${horarios.length} opções`}
        footer="Escolha o horário disponível">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: HIG_SPACE.xs,
          padding: HIG_SPACE.sm,
        }}>
          {horarios.map(h => (
            <HIGTimeChip key={h} T={T} dark={dark}
              label={h}
              selected={h === horaSel}
              onClick={() => setHoraSel(h)} />
          ))}
        </div>
      </HIGSection>

      {/* CTA — Bordered Prominent */}
      <button onClick={confirmar} disabled={!podeConfirmar}
        style={{
          ...higFilledButton(T, dark),
          opacity: podeConfirmar ? 1 : 0.3,
          cursor: podeConfirmar ? 'pointer' : 'not-allowed',
          marginTop: HIG_SPACE.xs,
        }}>
        {ctaLabel}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Fase 2 — Agendado (countdown + identificacao)
// ═══════════════════════════════════════════════════════════════════════════
function AgendadoHIG({ os, onUpdateOS, onMoverOS }) {
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

  const [modelo, setModelo] = useState(os?.modelo || '')
  const [serie, setSerie] = useState(os?.serie || '')
  const ref1 = pre => pre?.foto_coleta_1 || pre?.foto_coleta || null
  const ref2 = pre => pre?.foto_coleta_2 || null
  const [foto1Url, setFoto1Url] = useState(null)
  const [foto2Url, setFoto2Url] = useState(null)
  const [up1, setUp1] = useState(false)
  const [up2, setUp2] = useState(false)
  const inputCam1 = useRef(null)
  const inputGal1 = useRef(null)
  const inputCam2 = useRef(null)
  const inputGal2 = useRef(null)
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
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: HIG_SPACE.lg,
      fontFamily: HIG_FONT,
    }}>
      {/* Countdown card */}
      <HIGSection T={T} dark={dark} title="Coleta">
        <div style={{ padding: HIG_SPACE.md }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: HIG_SPACE.xs }}>
            <span style={{
              ...higType('largeTitle'),
              color: T.textPrimary,
              fontFamily: HIG_FONT,
            }}>{bigLabel}</span>
            {unitLabel && (
              <span style={{ ...higType('callout'), color: T.textMuted }}>{unitLabel}</span>
            )}
          </div>
          <div style={{
            ...higType('subheadline'),
            color: T.textMuted, marginTop: HIG_SPACE.xs,
          }}>
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
            }}/>
          </div>
        </div>
      </HIGSection>

      {/* Lista iOS: WhatsApp + Rota */}
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

      {/* Dados do equipamento — list rows com input */}
      <HIGSection T={T} dark={dark} title="Equipamento">
        <HIGFieldRow T={T} dark={dark}
          label="Modelo" placeholder="Ex: BWK11A"
          value={modelo} onChange={setModelo}
          separator />
        <HIGFieldRow T={T} dark={dark}
          label="Nº de série" placeholder="BR-2024-887"
          value={serie} onChange={setSerie}
          mono />
      </HIGSection>

      {/* Fotos */}
      <HIGSection T={T} dark={dark} title="Fotos">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: HIG_SPACE.xs,
          padding: HIG_SPACE.sm,
        }}>
          <FotoSlotHIG T={T} dark={dark} label="Etiqueta"
            url={foto1Url} uploading={up1}
            onPick={() => setEscolhaSlot(1)}
            onRemove={() => removerFotoSlot(1)} />
          <FotoSlotHIG T={T} dark={dark} label="Estado"
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
      </HIGSection>

      {escolhaSlot && (
        <ActionSheetHIG T={T} dark={dark}
          onClose={() => setEscolhaSlot(null)}
          actions={[
            {
              label: 'Tirar foto', onClick: () => {
                ;(escolhaSlot === 1 ? inputCam1 : inputCam2).current?.click()
                setEscolhaSlot(null)
              },
            },
            {
              label: 'Escolher dos arquivos', onClick: () => {
                ;(escolhaSlot === 1 ? inputGal1 : inputGal2).current?.click()
                setEscolhaSlot(null)
              },
            },
          ]} />
      )}

      {/* CTA */}
      <button onClick={confirmar} disabled={!temIdent}
        style={{
          ...higFilledButton(T, dark),
          opacity: temIdent ? 1 : 0.3,
          cursor: temIdent ? 'pointer' : 'not-allowed',
          marginTop: HIG_SPACE.xs,
        }}>
        Confirmar recebimento
      </button>
    </div>
  )
}

// ─── HIG List Row (com chevron > tipico iOS) ──────────────────────────────
function HIGListRow({ T, dark, icon, iconColor, label, subtitle, onClick, disabled, separator }) {
  return (
    <>
      <button type="button" onClick={onClick} disabled={disabled}
        style={{
          width: '100%', minHeight: HIG_SIZE.listRow,
          padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
          border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          textAlign: 'left', fontFamily: HIG_FONT,
          WebkitTapHighlightColor: 'transparent',
        }}>
        {icon && (
          <span style={{
            width: 28, height: 28, borderRadius: 6,
            background: iconColor + '22', color: iconColor,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <TI name={icon} size={16} />
          </span>
        )}
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
        <div style={{
          height: 0.5, background: T.border,
          marginLeft: HIG_SPACE.md + 28 + HIG_SPACE.sm,
        }} />
      )}
    </>
  )
}

// ─── HIG Field Row (label esquerda, input direita) ────────────────────────
function HIGFieldRow({ T, dark, label, value, onChange, placeholder, mono, separator }) {
  return (
    <>
      <div style={{
        minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
      }}>
        <span style={{
          ...higType('body'), color: T.textPrimary,
          minWidth: 110,
        }}>{label}</span>
        <input
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, minWidth: 0,
            border: 'none', background: 'transparent', outline: 'none',
            ...higType('body'),
            color: T.textPrimary,
            textAlign: 'right',
            fontFamily: mono ? HIG_FONT_MONO : HIG_FONT,
          }}
        />
      </div>
      {separator && (
        <div style={{ height: 0.5, background: T.border, marginLeft: HIG_SPACE.md }} />
      )}
    </>
  )
}

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
          <img src={url} alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={onRemove} title="Remover"
            style={{
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
            ...higType('caption2'),
            color: '#fff', background: 'rgba(0,0,0,0.55)',
            padding: '2px 8px', borderRadius: 6,
            backdropFilter: 'blur(4px)',
          }}>{label}</span>
        </>
      ) : (
        <button type="button" onClick={onPick} disabled={uploading}
          style={{
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

// ─── iOS Action Sheet ─────────────────────────────────────────────────────
function ActionSheetHIG({ T, dark, onClose, actions }) {
  const _mdb = useRef(false)
  return (
    <div
      onMouseDown={(e) => { _mdb.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && _mdb.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: HIG_SPACE.xs,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${HIG_SPACE.xs}px)`,
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500,
          display: 'flex', flexDirection: 'column', gap: HIG_SPACE.xs,
        }}>
        {/* Action list — bg branco com bordas arredondadas, separators */}
        <div style={{
          background: dark ? '#1C1C1E' : '#FFFFFF',
          borderRadius: HIG_RADIUS.sheet, overflow: 'hidden',
        }}>
          {actions.map((a, i) => (
            <React.Fragment key={i}>
              <button onClick={a.onClick}
                style={{
                  width: '100%', minHeight: 56,
                  padding: HIG_SPACE.sm,
                  border: 'none', background: 'transparent',
                  ...higType('body'),
                  color: a.destructive ? HIG_COLOR.red : HIG_COLOR.tintIdemaq,
                  fontWeight: 400,
                  cursor: 'pointer', fontFamily: HIG_FONT,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                {a.label}
              </button>
              {i < actions.length - 1 && (
                <div style={{ height: 0.5, background: T.border }} />
              )}
            </React.Fragment>
          ))}
        </div>
        {/* Cancel button — separado, gap 8 */}
        <button onClick={onClose}
          style={{
            minHeight: 56,
            borderRadius: HIG_RADIUS.sheet,
            background: dark ? '#1C1C1E' : '#FFFFFF',
            border: 'none', cursor: 'pointer',
            ...higType('headline'),
            color: HIG_COLOR.tintIdemaq, fontFamily: HIG_FONT,
            WebkitTapHighlightColor: 'transparent',
          }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────
export default function AcaoAgendamentoHIG({ os, onUpdateOS, onMoverOS }) {
  if (os?.etapa === 'agendado') {
    return <AgendadoHIG os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />
  }
  return <AgAgendaHIG os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />
}
