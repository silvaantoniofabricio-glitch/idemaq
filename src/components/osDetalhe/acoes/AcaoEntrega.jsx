// src/components/osDetalhe/acoes/AcaoEntrega.jsx
// Etapa Entrega — padrao V2 SubBloco (espelho do AcaoAgendamento).
//
//   Fase 1 — AGUARDANDO AGENDAR
//     Form Dia/Periodo/Horario + Observacoes + CTA agendar.
//     Salva em os.entrega_data + os.entrega_responsavel + os.entrega_observacoes.
//
//   Fase 2 — ENTREGA AGENDADA
//     Countdown ate a entrega + 2 atalhos (WhatsApp + Rota) + Foto obrigatoria
//     + CTAs confirmar/reagendar.
//     Ao confirmar: vai pra Pagamento (ou direto Concluido se ja paga).

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useTheme } from '../../../theme'
import { TI, PALETA } from '../../_shared/PrimitivasMobile'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { estaPagaTotal } from '../../../utils/osHelpers'
import {
  uploadFotoEntrega, removerFotoEntrega, resolverFotoUrl, FOTO_STORAGE_MARKER,
} from '../../../utils/osStorage'
import { useToast } from '../../ui'

// ─── Wrapper flat (mesmo do AcaoAgendamento V2) ───────────────────────────
function HeaderFlat({ children, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {children}
    </div>
  )
}

// ─── SubBloco compacto (mesmo padrao V2 do AcaoAgendamento) ───────────────
function SubBloco({ T, dark, icon, label, color = 'blue', children, action }) {
  const colorMap = {
    blue:   { fg: PALETA.blueStrong,   bg: dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg },
    yellow: { fg: PALETA.yellowStrong, bg: dark ? 'rgba(255,217,102,0.18)' : PALETA.yellowBg },
    green:  { fg: PALETA.greenStrong,  bg: dark ? 'rgba(46,125,94,0.18)' : PALETA.greenBg },
    red:    { fg: PALETA.redStrong,    bg: dark ? 'rgba(192,66,66,0.18)' : PALETA.redBg },
  }
  const c = colorMap[color] || colorMap.blue
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
  )
}

// ─── Helpers (mesmos do AcaoAgendamento) ──────────────────────────────────
const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const PERIODOS = [
  { id: 'manha', label: 'Manhã', icon: 'sunrise', ini: 6,  fim: 12 },
  { id: 'tarde', label: 'Tarde', icon: 'sun',     ini: 12, fim: 18 },
  { id: 'noite', label: 'Noite', icon: 'moon',    ini: 18, fim: 22 },
]
const proxNDias = (n = 14) => {
  const out = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje); d.setDate(d.getDate() + i)
    out.push({ iso: d.toISOString().slice(0, 10), dia: d.getDate(), dow: DOW[d.getDay()], isHoje: i === 0 })
  }
  return out
}
const horariosDoPeriodo = (id) => {
  const p = PERIODOS.find(x => x.id === id) || PERIODOS[1]
  const out = []
  for (let h = p.ini; h < p.fim; h++) {
    for (let m = 0; m < 60; m += 15) out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return out
}
const detectarPeriodo = (hora) => {
  if (!hora) return 'tarde'
  const h = parseInt(hora.split(':')[0], 10)
  if (h < 12) return 'manha'
  if (h < 18) return 'tarde'
  return 'noite'
}
const fmtBR = (iso) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
const fmtDataHora = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 1 — Aguardando agendar entrega (form)
// ═══════════════════════════════════════════════════════════════════════════
function FormAgendar({ os, user, usuarios, onUpdateOS, onCancelar }) {
  const { T, dark } = useTheme()
  const notify = useToast()
  const lista = usuarios || []
  const meuApelido = lista.find(u => u.id === user?.id)?.apelido || 'Você'

  // Le de pre_diagnostico.entrega (jsonb que persiste). Observacoes UNIFICADAS
  // no campo global os.observacoes (compartilhado entre todas as etapas).
  const entregaSalva = os?.pre_diagnostico?.entrega || {}
  const dataAgendada = entregaSalva.data || os.entrega_data || null

  const dias = useMemo(() => proxNDias(14), [])
  const dataIso = dataAgendada ? dataAgendada.slice(0, 10) : null
  const dataHora = dataAgendada ? dataAgendada.slice(11, 16) : null

  const [diaSel, setDiaSel] = useState(dataIso || dias[1]?.iso || dias[0]?.iso)
  const [periodoSel, setPeriodoSel] = useState(detectarPeriodo(dataHora))
  const [horaSel, setHoraSel] = useState(dataHora || null)
  const [obs, setObs] = useState(os?.observacoes || '')

  // Re-sincroniza obs quando outras etapas alterarem (ex: auto-add da Capa)
  useEffect(() => { setObs(os?.observacoes || '') }, [os?.observacoes])

  const horarios = useMemo(() => horariosDoPeriodo(periodoSel), [periodoSel])
  const podeAgendar = !!diaSel && !!horaSel
  const reagendando = !!dataIso

  function agendar() {
    if (!podeAgendar) {
      notify('erro', 'Escolha o dia e o horário da entrega')
      return
    }
    const iso = `${diaSel}T${horaSel}:00`
    onUpdateOS?.(os.numero, {
      observacoes: obs,
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        entrega: {
          ...entregaSalva,
          data: iso,
          responsavel: user?.id || null,
        },
      },
    })
    notify('ok', `Entrega agendada para ${fmtDataHora(iso)}`)
  }

  const ctaLabel = podeAgendar
    ? (reagendando ? `Salvar ${fmtBR(diaSel)} · ${horaSel}` : `Agendar ${fmtBR(diaSel)} · ${horaSel}`)
    : 'Escolha dia e hora'

  return (
    <HeaderFlat>
      {/* DIA */}
      <SubBloco T={T} dark={dark} icon="calendar" label="Dia · próximos 14 dias" color="blue">
        <div style={{
          display: 'flex', gap: 4, overflowX: 'auto',
          margin: '0 -12px', padding: '0 12px', scrollbarWidth: 'none',
        }} className="idemaq-no-scrollbar">
          {dias.map(d => {
            const sel = d.iso === diaSel
            return (
              <button key={d.iso} onClick={() => setDiaSel(d.iso)}
                style={{
                  flex: '0 0 auto', width: 44, height: 44,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '4px 0', borderRadius: 8,
                  background: sel ? PALETA.blue : T.bg,
                  border: `1px solid ${sel ? PALETA.blueStrong : T.border}`,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: sel ? 'rgba(255,255,255,.85)' : T.textMuted,
                  textTransform: 'uppercase', letterSpacing: '.06em',
                  lineHeight: 1,
                }}>{d.dow}</span>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  color: sel ? '#fff' : T.textPrimary,
                  marginTop: 1, lineHeight: 1,
                }}>{d.dia}</span>
              </button>
            )
          })}
        </div>
      </SubBloco>

      {/* PERÍODO */}
      <SubBloco T={T} dark={dark} icon="clock" label="Período" color="blue">
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODOS.map(p => {
            const sel = p.id === periodoSel
            return (
              <button key={p.id} onClick={() => setPeriodoSel(p.id)}
                style={{
                  flex: 1, minHeight: 32, padding: '0 6px', borderRadius: 7,
                  background: sel ? (dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg) : T.bg,
                  border: `1px solid ${sel ? PALETA.blueLight : T.border}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600,
                  color: sel ? PALETA.blueStrong : T.textMuted,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <TI name={p.icon} size={12} color={sel ? PALETA.blueStrong : '#9CA3AF'} />
                <span>{p.label}</span>
                <span style={{
                  fontSize: 9.5, color: '#9CA3AF',
                  fontFamily: 'ui-monospace,monospace',
                }}>{p.ini}–{p.fim}</span>
              </button>
            )
          })}
        </div>
      </SubBloco>

      {/* HORÁRIO */}
      <SubBloco T={T} dark={dark} icon="clock-hour-4" label="Horário · 15 em 15 min" color="blue">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
          {horarios.map(h => {
            const sel = h === horaSel
            return (
              <button key={h} onClick={() => setHoraSel(h)}
                style={{
                  minHeight: 26, borderRadius: 5,
                  background: sel ? PALETA.blue : T.bg,
                  border: `1px solid ${sel ? PALETA.blueStrong : T.border}`,
                  color: sel ? '#fff' : T.textPrimary,
                  fontSize: 11.5, fontWeight: 600,
                  fontFamily: 'ui-monospace,monospace',
                  cursor: 'pointer', padding: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}>{h}</button>
            )
          })}
        </div>
      </SubBloco>

      {/* OBSERVAÇÕES */}
      <SubBloco T={T} dark={dark} icon="message-2" label="Observações · opcional" color="blue"
        action={<span style={{
          fontSize: 10, color: T.textMuted, fontWeight: 600,
        }}>resp. <b style={{ color: T.textPrimary }}>{meuApelido}</b></span>}>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex: entregar pela manhã, prédio 2º andar…"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '7px 9px', borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.bg, color: T.textPrimary,
            fontSize: 12.5, fontFamily: 'inherit',
            outline: 'none', resize: 'vertical', minHeight: 50,
          }}
        />
      </SubBloco>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {reagendando && onCancelar && (
          <button onClick={onCancelar}
            style={{
              minHeight: 36, padding: '0 14px', borderRadius: 8,
              background: T.cardAlt, color: T.textMuted,
              border: `1px solid ${T.border}`,
              fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
              cursor: 'pointer',
            }}>
            Cancelar
          </button>
        )}
        <button onClick={agendar} disabled={!podeAgendar}
          style={{
            flex: 1, minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none',
            background: podeAgendar ? PALETA.yellow : T.cardAlt,
            color: podeAgendar ? '#0a0a0d' : T.textDim,
            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
            cursor: podeAgendar ? 'pointer' : 'not-allowed',
            opacity: podeAgendar ? 1 : 0.55,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <TI name="calendar-check" size={14} />
          {ctaLabel}
        </button>
      </div>
    </HeaderFlat>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 2 — Entrega agendada (countdown + atalhos + foto + CTAs)
// ═══════════════════════════════════════════════════════════════════════════
function ResumoAgendada({ os, user, usuarios, admin, onUpdateOS, onMoverOS, onReagendar }) {
  const { T, dark } = useTheme()
  const notify = useToast()
  const lista = usuarios || []
  const jaPaga = estaPagaTotal(os)

  // Countdown
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const entregaSalva = os?.pre_diagnostico?.entrega || {}
  const entregaData = entregaSalva.data || os.entrega_data || null
  const respAgendado = entregaSalva.responsavel || os.entrega_responsavel || null
  // Observacoes vem do campo global os.observacoes (unificado).
  const obsAgendada = os?.observacoes || ''

  const alvo = useMemo(() => {
    if (!entregaData) return null
    const d = new Date(entregaData)
    return isNaN(d) ? null : d
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
  const respApelido = (lista.find(u => u.id === respAgendado)?.apelido)
    || (lista.find(u => u.id === respAgendado)?.nome) || respAgendado

  // Cliente / nome
  const clienteStr = typeof os?.cliente === 'string' ? os.cliente : (os?.cliente?.nome || '')
  const primeiroNome = clienteStr.split(' ')[0] || 'Cliente'

  // ─── Foto da entrega ──────────────────────────────────────────────────────
  const salvoEntrega = os.pre_diagnostico?.foto_entrega || null
  const [fotoEntregaUrl, setFotoEntregaUrl] = useState(null)
  const [fotoEntregaNoStorage, setFotoEntregaNoStorage] = useState(salvoEntrega === FOTO_STORAGE_MARKER)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const inputFotoRef = useRef(null)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const url = await resolverFotoUrl(salvoEntrega, os.id, 'entrega')
      if (!cancelado) setFotoEntregaUrl(url)
    }
    if (salvoEntrega) carregar()
    else setFotoEntregaUrl(null)
    return () => { cancelado = true }
  }, [salvoEntrega, os.id])

  async function escolherFotoEntrega(file) {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      notify('erro', 'Selecione uma imagem (JPG/PNG).')
      return
    }
    setUploadingFoto(true)
    const res = await uploadFotoEntrega(os.id, file)
    setUploadingFoto(false)
    if (!res.ok) {
      notify('erro', `Falha ao enviar foto: ${res.error}`)
      return
    }
    setFotoEntregaUrl(res.url)
    setFotoEntregaNoStorage(true)
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        foto_entrega: FOTO_STORAGE_MARKER,
      },
    })
    notify('ok', 'Foto da entrega adicionada')
  }

  async function removerFoto() {
    if (!window.confirm('Remover a foto da entrega?')) return
    if (fotoEntregaNoStorage) await removerFotoEntrega(os.id)
    setFotoEntregaUrl(null)
    setFotoEntregaNoStorage(false)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
    const { foto_entrega, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
    notify('ok', 'Foto da entrega removida')
  }

  // Acoes
  const abrirWhatsApp = () => {
    const fone = (os?.fone || '').replace(/\D/g, '')
    if (!fone) { notify('erro', 'Cliente sem telefone cadastrado'); return }
    const num = fone.startsWith('55') ? fone : '55' + fone
    const texto = `Olá ${clienteStr || ''}! 👋

A entrega da sua OS #${os.numero} (${[os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento || ''}) está agendada pra:

📅 ${entregaLabel}

${obsAgendada ? `Obs: ${obsAgendada}\n\n` : ''}Qualquer coisa me avisa pra reagendar. Até lá!`
    const url = `send?phone=${num}&text=${encodeURIComponent(texto)}`
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = `intent://${url}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.whatsapp.w4b;end`
    } else {
      window.location.href = `whatsapp://${url}`
    }
  }

  const abrirRota = () => {
    if (!os?.endereco) return
    const q = encodeURIComponent(os.endereco)
    const ua = navigator.userAgent || ''
    if (/Android/i.test(ua)) {
      window.location.href = `geo:0,0?q=${q}`
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      window.location.href = `maps://?q=${q}`
    } else {
      window.location.href = `https://www.google.com/maps/search/?api=1&query=${q}`
    }
  }

  function confirmarEntrega() {
    if (!admin && !fotoEntregaNoStorage && !fotoEntregaUrl) {
      notify('erro', 'Tire a foto da entrega antes de confirmar — comprova devolução em bom estado.')
      inputFotoRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!window.confirm(jaPaga
      ? 'Confirmar entrega? A OS vai direto pra Concluído (já paga).'
      : 'Confirmar entrega? A OS vai pra Pagamento.')) return

    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        entrega: {
          ...entregaSalva,
          realizada_em: new Date().toISOString(),
        },
      },
    })
    const destino = jaPaga ? 'concluido' : 'pagamento'
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === destino)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  const podeConfirmar = admin || fotoEntregaNoStorage || !!fotoEntregaUrl

  return (
    <HeaderFlat>
      {/* Countdown */}
      <SubBloco T={T} dark={dark} icon="truck-delivery" label="Entrega em" color="blue"
        action={respApelido && (
          <span style={{
            fontSize: 10, color: T.textMuted, fontWeight: 600,
          }}>por <b style={{ color: T.textPrimary }}>{respApelido}</b></span>
        )}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 26, fontWeight: 700, color: T.textPrimary,
            letterSpacing: '-.02em', lineHeight: 1,
            fontFamily: 'ui-monospace,monospace',
          }}>{bigLabel}</span>
          {unitLabel && <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{unitLabel}</span>}
        </div>
        <div style={{
          fontSize: 12, color: T.textMuted, marginTop: 5,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <TI name="calendar-event" size={12} />
          <b style={{ color: T.textPrimary, fontWeight: 600 }}>{entregaLabel}</b>
        </div>
        <div style={{
          height: 4, marginTop: 6,
          background: dark ? 'rgba(255,255,255,0.10)' : '#E5E7EB',
          borderRadius: 99, overflow: 'hidden',
        }}>
          <span style={{
            display: 'block', height: '100%', width: `${pct}%`,
            background: 'linear-gradient(90deg,#5B9BD5,#4A86C0)',
            borderRadius: 99, transition: 'width .3s',
          }}/>
        </div>
      </SubBloco>

      {/* Observacoes — destaque amarelo quando houver, pra tecnico nao esquecer
          do que precisa levar (capa, mangueira, etc) */}
      {obsAgendada && (
        <SubBloco T={T} dark={dark} icon="alert-circle"
          label="Atenção · observações da OS" color="yellow"
          action={<span style={{
            fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: PALETA.yellowStrong, color: '#fff',
            textTransform: 'uppercase', letterSpacing: '.05em',
          }}>NÃO ESQUECER</span>}>
          <div style={{
            fontSize: 13, color: T.textPrimary, lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
          }}>{obsAgendada}</div>
        </SubBloco>
      )}

      {/* 2 atalhos: WhatsApp + Rota */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={abrirWhatsApp}
          disabled={!os?.fone}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '6px 10px', minHeight: 40,
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: os?.fone ? 'pointer' : 'not-allowed',
            opacity: os?.fone ? 1 : 0.5,
            textAlign: 'left', fontFamily: 'inherit',
          }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: dark ? 'rgba(46,125,94,0.20)' : '#E8F8EC',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><TI name="brand-whatsapp" size={14} color="#25D366" /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{
              display: 'block', fontSize: 9.5, color: T.textMuted,
              fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
              lineHeight: 1,
            }}>Avisar</span>
            <span style={{
              display: 'block', fontSize: 12, color: T.textPrimary,
              fontWeight: 600, marginTop: 2, lineHeight: 1.1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{primeiroNome}</span>
          </span>
        </button>

        <button onClick={abrirRota}
          disabled={!os?.endereco}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '6px 10px', minHeight: 40,
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: os?.endereco ? 'pointer' : 'not-allowed',
            opacity: os?.endereco ? 1 : 0.5,
            textAlign: 'left', fontFamily: 'inherit',
          }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg,
            color: dark ? PALETA.blue : PALETA.blueStrong,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><TI name="map-pin" size={14} /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{
              display: 'block', fontSize: 9.5, color: T.textMuted,
              fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
              lineHeight: 1,
            }}>Abrir</span>
            <span style={{
              display: 'block', fontSize: 12, color: T.textPrimary,
              fontWeight: 600, marginTop: 2, lineHeight: 1.1,
            }}>Rota</span>
          </span>
        </button>
      </div>

      {/* Foto da entrega — obrigatoria pra funcionario, opcional pra admin */}
      <SubBloco T={T} dark={dark} icon={fotoEntregaUrl ? 'camera-check' : 'camera'}
        label={`Foto da entrega · ${admin ? 'opcional' : 'obrigatória'}`}
        color={fotoEntregaUrl ? 'green' : 'yellow'}>
        <input
          ref={inputFotoRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => escolherFotoEntrega(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
        {fotoEntregaUrl ? (
          <div style={{
            position: 'relative',
            border: `1px solid ${T.border}`,
            borderRadius: 8, overflow: 'hidden',
            maxWidth: 280,
          }}>
            <img src={fotoEntregaUrl} alt="Foto da entrega"
              style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 200, objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', top: 6, right: 6,
              display: 'flex', gap: 4,
            }}>
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                disabled={uploadingFoto}
                title={uploadingFoto ? 'Enviando...' : 'Trocar foto'}
                style={{
                  width: 26, height: 26, borderRadius: 5,
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  border: 'none', cursor: uploadingFoto ? 'wait' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <TI name={uploadingFoto ? 'loader-2' : 'camera'} size={12} />
              </button>
              <button
                type="button"
                onClick={removerFoto}
                title="Remover foto"
                style={{
                  width: 26, height: 26, borderRadius: 5,
                  background: 'rgba(192,66,66,0.85)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <TI name="x" size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            disabled={uploadingFoto}
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 8,
              border: `1.5px dashed ${PALETA.yellowStrong}`,
              background: dark ? 'rgba(255,217,102,0.08)' : '#FFFAEB',
              color: PALETA.yellowStrong,
              fontSize: 12.5, fontWeight: 700,
              cursor: uploadingFoto ? 'wait' : 'pointer',
              opacity: uploadingFoto ? 0.6 : 1,
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
            <TI name={uploadingFoto ? 'loader-2' : 'camera-plus'} size={16} />
            {uploadingFoto ? 'Enviando foto...' : 'Tirar foto da entrega'}
          </button>
        )}
      </SubBloco>

      {/* CTAs principais */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onReagendar}
          style={{
            minHeight: 36, padding: '0 12px', borderRadius: 8,
            background: T.cardAlt, color: T.textPrimary,
            border: `1px solid ${T.border}`,
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
          <TI name="calendar-event" size={13} />
          Reagendar
        </button>
        <button onClick={confirmarEntrega}
          style={{
            flex: 1, minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none',
            background: jaPaga ? PALETA.greenStrong : PALETA.yellow,
            color: jaPaga ? '#fff' : '#0a0a0d',
            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer',
            opacity: podeConfirmar ? 1 : 0.5,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <TI name="check" size={14} />
          {jaPaga ? 'Confirmar · concluir OS' : 'Confirmar · ir pra Pagamento'}
        </button>
      </div>
    </HeaderFlat>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal — decide qual fase mostrar
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoEntrega({ os, user, usuarios, admin, onUpdateOS, onMoverOS }) {
  const [editando, setEditando] = useState(false)
  // Le de pre_diagnostico.entrega (jsonb) com fallback pros antigos top-level
  const dataAgendada = os?.pre_diagnostico?.entrega?.data || os.entrega_data || null
  const emFase2 = !!dataAgendada && !editando

  if (emFase2) {
    return (
      <ResumoAgendada
        os={os} user={user} usuarios={usuarios} admin={admin}
        onUpdateOS={onUpdateOS} onMoverOS={onMoverOS}
        onReagendar={() => setEditando(true)}
      />
    )
  }

  return (
    <FormAgendar
      os={os} user={user} usuarios={usuarios}
      onUpdateOS={onUpdateOS}
      onCancelar={dataAgendada ? () => setEditando(false) : null}
    />
  )
}
