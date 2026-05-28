// src/components/osDetalhe/acoes/AcaoColetaHIG.jsx
// Etapa Coleta (agendado) — Apple HIG dedicado.
// O técnico está a caminho ou acabou de chegar no cliente para buscar a máquina.
// Mesma profundidade de acabamento do AcaoAgendamentoHIG:
//   · Countdown largeTitle até o horário de coleta
//   · Lista iOS: WhatsApp + abrir rota
//   · FieldRows para modelo e nº de série
//   · 2 slots de foto (etiqueta + estado geral) com ActionSheet
//   · CTA 50pt "Confirmar coleta"
//
// Persiste:
//   · os.modelo_equipamento / os.numero_serie
//   · os.pre_diagnostico.foto_coleta_1 / foto_coleta_2

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_COLOR, HIG_FONT, HIG_FONT_MONO, HIG_SIZE,
  higType, higFilledButton, higInsetCard,
} from '../../../theme-hig'
import {
  uploadFotoOS, resolverFotoUrl, removerFotoOS, FOTO_STORAGE_MARKER,
} from '../../../utils/osStorage'

// ─── Helpers de data ──────────────────────────────────────────────────────
const fmtBR = (iso) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ─── HIGSection ───────────────────────────────────────────────────────────
function HIGSection({ T, dark, title, children, footer }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{
        ...higType('footnote'),
        color: T.textMuted,
        textTransform: 'uppercase',
        padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
        letterSpacing: 0.5,
      }}>
        {title}
      </div>
      <div style={higInsetCard(T, dark)}>
        {children}
      </div>
      {footer && (
        <div style={{
          ...higType('footnote'),
          color: T.textMuted,
          padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0`,
        }}>
          {footer}
        </div>
      )}
    </section>
  )
}

// ─── Separator interno ────────────────────────────────────────────────────
function Sep({ T, indent = HIG_SPACE.md }) {
  return (
    <div style={{
      height: 0.5,
      background: T.border,
      marginLeft: indent,
    }} />
  )
}

// ─── List Row (com chevron) ───────────────────────────────────────────────
function ListRow({ T, dark, icon, iconColor, label, subtitle, onClick, disabled, separator }) {
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
            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
            background: iconColor + '22', color: iconColor,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name={icon} size={16} color={iconColor} />
          </span>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...higType('body'), color: T.textPrimary }}>{label}</div>
          {subtitle && (
            <div style={{
              ...higType('footnote'), color: T.textMuted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {subtitle}
            </div>
          )}
        </div>
        <TI name="chevron-right" size={14} color={T.textDim} />
      </button>
      {separator && (
        <Sep T={T} indent={HIG_SPACE.md + 30 + HIG_SPACE.sm} />
      )}
    </>
  )
}

// ─── Field Row (label esq + input dir) ───────────────────────────────────
function FieldRow({ T, dark, label, value, onChange, placeholder, mono, separator }) {
  return (
    <>
      <div style={{
        minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
      }}>
        <span style={{
          ...higType('body'), color: T.textPrimary, minWidth: 110, flexShrink: 0,
        }}>
          {label}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
      {separator && <Sep T={T} />}
    </>
  )
}

// ─── Slot de foto ─────────────────────────────────────────────────────────
function FotoSlot({ T, dark, label, url, uploading, onPick, onRemove }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: HIG_RADIUS.card, overflow: 'hidden',
      border: `1px ${url ? 'solid' : 'dashed'} ${T.border}`,
      background: url ? '#000' : T.bg,
      aspectRatio: '4 / 3',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <>
          <img src={url} alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={onRemove}
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
          }}>
            {label}
          </span>
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
          <TI name={uploading ? 'loader-2' : 'camera-plus'} size={22} color={HIG_COLOR.tintIdemaq} />
          <span style={{ ...higType('subheadline'), fontWeight: 500, color: HIG_COLOR.tintIdemaq }}>
            {uploading ? 'Enviando…' : label}
          </span>
        </button>
      )}
    </div>
  )
}

// ─── iOS Action Sheet ─────────────────────────────────────────────────────
function ActionSheet({ T, dark, onClose, actions }) {
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
        <button onClick={onClose}
          style={{
            minHeight: 56, borderRadius: HIG_RADIUS.sheet,
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

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoColetaHIG({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()

  // ── Countdown ────────────────────────────────────────────────────────────
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

  const { bigLabel, unitLabel, subLabel, pct, atrasado } = useMemo(() => {
    if (!alvo) return { bigLabel: '—', unitLabel: '', subLabel: 'Sem horário', pct: 0, atrasado: false }
    const dataISO = alvo.toISOString().slice(0, 10)
    const horaStr = `${String(alvo.getHours()).padStart(2, '0')}:${String(alvo.getMinutes()).padStart(2, '0')}`
    const dow = DOW[alvo.getDay()]
    const subL = `${dow} ${fmtBR(dataISO)} · ${horaStr}`
    const deltaMs = alvo.getTime() - agora.getTime()
    if (deltaMs <= 0) {
      return { bigLabel: 'agora', unitLabel: '', subLabel: subL, pct: 100, atrasado: deltaMs < -300_000 }
    }
    const min = Math.floor(deltaMs / 60_000)
    const h = Math.floor(min / 60), m = min % 60
    const big = h >= 1 ? `${h}h` : `${m}min`
    const unit = h >= 1 ? `${m}min` : ''
    const totalMs = Math.max(deltaMs, 48 * 60 * 60_000)
    const pctVal = Math.max(5, Math.min(95, 100 - (deltaMs / totalMs) * 100))
    return { bigLabel: big, unitLabel: unit, subLabel: subL, pct: pctVal, atrasado: false }
  }, [alvo, agora])

  const countdownColor = atrasado ? HIG_COLOR.red : HIG_COLOR.tintIdemaq

  // ── Cliente ───────────────────────────────────────────────────────────────
  const clienteStr = typeof os?.cliente === 'string'
    ? os.cliente
    : (os?.cliente?.nome || '')
  const primeiroNome = clienteStr.split(' ')[0] || 'Cliente'

  // ── Ações externas ────────────────────────────────────────────────────────
  function abrirWhatsApp() {
    const fone = (os?.fone || '').replace(/\D/g, '')
    if (!fone) return
    const num = fone.startsWith('55') ? fone : '55' + fone
    window.location.href = `whatsapp://send?phone=${num}`
  }
  function abrirRota() {
    if (!os?.endereco) return
    const q = encodeURIComponent(os.endereco)
    const ua = navigator.userAgent || ''
    if (/Android/i.test(ua)) window.location.href = `geo:0,0?q=${q}`
    else if (/iPhone|iPad|iPod/i.test(ua)) window.location.href = `maps://?q=${q}`
    else window.location.href = `https://www.google.com/maps/search/?api=1&query=${q}`
  }

  // ── Equipamento ───────────────────────────────────────────────────────────
  const [modelo, setModelo] = useState(os?.modelo_equipamento || os?.modelo || '')
  const [serie, setSerie] = useState(os?.numero_serie || os?.serie || '')

  // Auto-save modelo/série com debounce
  useEffect(() => {
    const t = setTimeout(() => {
      const patch = {}
      if (modelo !== (os?.modelo_equipamento || os?.modelo || '')) patch.modelo_equipamento = modelo
      if (serie  !== (os?.numero_serie || os?.serie || ''))         patch.numero_serie = serie
      if (Object.keys(patch).length) onUpdateOS?.(os.numero, patch)
    }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo, serie])

  // ── Fotos ─────────────────────────────────────────────────────────────────
  const [foto1Url, setFoto1Url] = useState(null)
  const [foto2Url, setFoto2Url] = useState(null)
  const [up1, setUp1] = useState(false)
  const [up2, setUp2] = useState(false)
  const [escolhaSlot, setEscolhaSlot] = useState(null)
  const inputCam1 = useRef(null)
  const inputGal1 = useRef(null)
  const inputCam2 = useRef(null)
  const inputGal2 = useRef(null)

  useEffect(() => {
    let canc = false
    ;(async () => {
      const u1 = await resolverFotoUrl(
        os?.pre_diagnostico?.foto_coleta_1 || os?.pre_diagnostico?.foto_coleta || null,
        os?.id, 'coleta_1',
      )
      const u2 = await resolverFotoUrl(
        os?.pre_diagnostico?.foto_coleta_2 || null,
        os?.id, 'coleta_2',
      )
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

  async function removerFoto(slot) {
    if (!window.confirm('Remover esta foto?')) return
    const tipo = slot === 1 ? 'coleta_1' : 'coleta_2'
    await removerFotoOS(os.id, tipo)
    if (slot === 1) setFoto1Url(null)
    else setFoto2Url(null)
    const key = `foto_coleta_${slot}`
    const { [key]: _, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
  }

  // ── Observações de coleta ─────────────────────────────────────────────────
  const [obs, setObs] = useState(os?.observacoes || '')
  useEffect(() => { setObs(os?.observacoes || '') }, [os?.observacoes])
  useEffect(() => {
    if (obs === (os?.observacoes || '')) return
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs])

  // ── CTA ───────────────────────────────────────────────────────────────────
  // Pode confirmar se tiver ao menos modelo OU uma foto
  const temIdentificacao = !!(modelo || foto1Url || foto2Url)
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    setSalvando(true)
    const patch = {}
    if (modelo !== (os?.modelo_equipamento || os?.modelo || '')) patch.modelo_equipamento = modelo
    if (serie  !== (os?.numero_serie || os?.serie || ''))         patch.numero_serie = serie
    if (obs !== (os?.observacoes || ''))                           patch.observacoes = obs
    if (Object.keys(patch).length) await onUpdateOS?.(os.numero, patch)
    setSalvando(false)
    onMoverOS?.(os.numero, 'recebido')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: HIG_SPACE.lg,
      fontFamily: HIG_FONT,
      padding: `0 0 ${HIG_SPACE.md}px`,
    }}>

      {/* ── Countdown: tempo até a coleta ─────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Coleta agendada">
        <div style={{ padding: HIG_SPACE.md }}>
          {/* Número grande + unidade */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: HIG_SPACE.xs }}>
            <span style={{
              ...higType('largeTitle'),
              color: atrasado ? HIG_COLOR.red : T.textPrimary,
              fontFamily: HIG_FONT,
            }}>
              {bigLabel}
            </span>
            {unitLabel && (
              <span style={{ ...higType('callout'), color: T.textMuted }}>
                {unitLabel}
              </span>
            )}
            {atrasado && (
              <span style={{
                ...higType('caption1'),
                color: HIG_COLOR.red,
                background: 'rgba(255,59,48,0.12)',
                padding: '2px 8px', borderRadius: 6,
                fontWeight: 600, marginLeft: 4,
              }}>
                em atraso
              </span>
            )}
          </div>

          {/* Data e hora por extenso */}
          <div style={{
            ...higType('subheadline'),
            color: T.textMuted, marginTop: HIG_SPACE.xxs,
          }}>
            <strong style={{ color: T.textPrimary, fontWeight: 600 }}>{subLabel}</strong>
          </div>

          {/* Barra de progresso de chegada */}
          <div style={{
            height: 4, marginTop: HIG_SPACE.sm,
            background: dark ? 'rgba(255,255,255,0.10)' : '#E5E5EA',
            borderRadius: 999, overflow: 'hidden',
          }}>
            <span style={{
              display: 'block', height: '100%', width: `${pct}%`,
              background: countdownColor,
              borderRadius: 999, transition: 'width .3s',
            }} />
          </div>
        </div>
      </HIGSection>

      {/* ── Ações rápidas: WhatsApp + Rota ───────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Ações">
        <ListRow T={T} dark={dark}
          icon="brand-whatsapp" iconColor="#34C759"
          label={`Avisar ${primeiroNome}`}
          subtitle={os?.fone || 'Sem telefone cadastrado'}
          disabled={!os?.fone}
          onClick={abrirWhatsApp}
          separator
        />
        <ListRow T={T} dark={dark}
          icon="map-pin" iconColor={HIG_COLOR.tintIdemaq}
          label="Abrir rota"
          subtitle={os?.endereco || 'Sem endereço cadastrado'}
          disabled={!os?.endereco}
          onClick={abrirRota}
        />
      </HIGSection>

      {/* ── Identificação do equipamento ──────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Equipamento"
        footer="Preencha ao chegar. Modelo libera o botão de confirmar.">
        <FieldRow T={T} dark={dark}
          label="Modelo"
          placeholder="Ex: BWK11A, LSP11"
          value={modelo}
          onChange={setModelo}
          separator
        />
        <FieldRow T={T} dark={dark}
          label="Nº de série"
          placeholder="Ex: BR-2024-00887"
          value={serie}
          onChange={setSerie}
          mono
        />
      </HIGSection>

      {/* ── Fotos (etiqueta + estado) ─────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Fotos da coleta"
        footer="Registre a etiqueta e o estado da máquina antes de sair.">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: HIG_SPACE.xs,
          padding: HIG_SPACE.sm,
        }}>
          <FotoSlot T={T} dark={dark}
            label="Etiqueta"
            url={foto1Url}
            uploading={up1}
            onPick={() => setEscolhaSlot(1)}
            onRemove={() => removerFoto(1)}
          />
          <FotoSlot T={T} dark={dark}
            label="Estado geral"
            url={foto2Url}
            uploading={up2}
            onPick={() => setEscolhaSlot(2)}
            onRemove={() => removerFoto(2)}
          />
        </div>
        {/* Inputs ocultos para câmera e galeria */}
        <input ref={inputCam1} type="file" accept="image/*" capture="environment"
          onChange={(e) => escolherFoto(e.target.files?.[0], 1)} style={{ display: 'none' }} />
        <input ref={inputGal1} type="file" accept="image/*"
          onChange={(e) => escolherFoto(e.target.files?.[0], 1)} style={{ display: 'none' }} />
        <input ref={inputCam2} type="file" accept="image/*" capture="environment"
          onChange={(e) => escolherFoto(e.target.files?.[0], 2)} style={{ display: 'none' }} />
        <input ref={inputGal2} type="file" accept="image/*"
          onChange={(e) => escolherFoto(e.target.files?.[0], 2)} style={{ display: 'none' }} />
      </HIGSection>

      {/* ── Observações ──────────────────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Observações"
        footer="Visível em todas as etapas. Ex: chegou sem capa, mangueira solta.">
        <div style={{ padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px` }}>
          <textarea
            placeholder="Ex: cliente informou que parou de lavar semana passada, sem barulho anormal…"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: `${HIG_SPACE.xs}px ${HIG_SPACE.sm}px`,
              borderRadius: HIG_RADIUS.small,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.04)' : HIG_COLOR.gray6,
              color: T.textPrimary,
              ...higType('subheadline'),
              fontFamily: HIG_FONT,
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </HIGSection>

      {/* ── CTA: Confirmar coleta ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={confirmar}
        disabled={!temIdentificacao || salvando}
        style={{
          ...higFilledButton(T, dark),
          width: '100%',
          background: temIdentificacao
            ? HIG_COLOR.tintIdemaq
            : (dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray5),
          color: temIdentificacao ? '#FFFFFF' : T.textDim,
          opacity: salvando ? 0.6 : 1,
          cursor: (temIdentificacao && !salvando) ? 'pointer' : 'not-allowed',
        }}
      >
        <TI name={salvando ? 'loader-2' : 'home-import'} size={18} />
        {salvando ? 'Salvando…' : temIdentificacao ? 'Confirmar coleta' : 'Informe o modelo ou tire uma foto'}
      </button>

      {/* ActionSheet — escolher câmera ou galeria */}
      {escolhaSlot && (
        <ActionSheet T={T} dark={dark}
          onClose={() => setEscolhaSlot(null)}
          actions={[
            {
              label: 'Tirar foto',
              onClick: () => {
                ;(escolhaSlot === 1 ? inputCam1 : inputCam2).current?.click()
                setEscolhaSlot(null)
              },
            },
            {
              label: 'Escolher da galeria',
              onClick: () => {
                ;(escolhaSlot === 1 ? inputGal1 : inputGal2).current?.click()
                setEscolhaSlot(null)
              },
            },
          ]}
        />
      )}

    </div>
  )
}
