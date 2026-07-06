// src/components/osDetalhe/acoes/AcaoEntregaHIG.jsx
// Etapa Entrega — Atlassian Design (reescrito 28/05/2026).
//
// Dispatcher de 2 fases:
//
// Fase 1 — Aguardando agendar (FormAgendarEntrega):
//   1. Dia (chips scroll horizontal)
//   2. Periodo (segmented Manha/Tarde/Noite)
//   3. Horario (grid 4 cols)
//   4. Observacoes (textarea)
//   5. CTA Agendar dd/mm · HH:MM (com Cancelar quando reagendando)
//
// Fase 2 — Entrega agendada (EntregaAgendada):
//   1. Countdown ate a entrega (accent azul + barra de progresso)
//   2. Acoes rapidas (WhatsApp + Abrir rota)
//   3. Foto da entrega (upload com action sheet camera/galeria)
//   4. CTAs Reagendar + Confirmar (cor varia se ja paga -> Concluir OS,
//      senao -> ir pra Pagamento)
//
// Persiste:
//   · os.pre_diagnostico.entrega.data (ISO string)
//   · os.pre_diagnostico.foto_entrega (FOTO_STORAGE_MARKER)
//   · os.pre_diagnostico.entrega.realizada_em (ISO no confirmar)
//   · os.observacoes (debounce no textarea)

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { estaPagaTotal } from '../../../utils/osHelpers'
import {
  uploadFotoEntrega, removerFotoEntrega, resolverFotoUrl, FOTO_STORAGE_MARKER,
} from '../../../utils/osStorage'
import { useAutorCheck } from '../../../hooks/useAutorCheck'
import { useToast } from '../../ui'
import {
  AtlPanel, AtlButton, AtlListRow, AtlDayChip, AtlSegmented, AtlTimeChip,
  ATL_FONT, atlSurfaceSunken,
} from './_AtlassianUI'

// ─── Helpers ──────────────────────────────────────────────────────────────
const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const PERIODOS = [
  { id: 'manha', label: 'Manhã', ini: 6,  fim: 12 },
  { id: 'tarde', label: 'Tarde', ini: 12, fim: 18 },
  { id: 'noite', label: 'Noite', ini: 18, fim: 22 },
]

function proxNDias(n = 14) {
  const out = []
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje); d.setDate(d.getDate() + i)
    out.push({ iso: d.toISOString().slice(0, 10), dia: d.getDate(), dow: DOW[d.getDay()] })
  }
  return out
}
function horariosDoPeriodo(periodoId) {
  const p = PERIODOS.find(x => x.id === periodoId) || PERIODOS[1]
  const out = []
  for (let h = p.ini; h < p.fim; h++)
    for (let m = 0; m < 60; m += 15)
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  return out
}
function fmtBR(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
function fmtDataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso); if (isNaN(d)) return iso
  return d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function detectarPeriodo(hora) {
  if (!hora) return 'tarde'
  const h = parseInt(hora.split(':')[0], 10)
  if (h < 12) return 'manha'
  if (h < 18) return 'tarde'
  return 'noite'
}

// ═══════════════════════════════════════════════════════════════════════════
// Fase 1 — Form de agendar
// ═══════════════════════════════════════════════════════════════════════════
function FormAgendarEntrega({ os, onUpdateOS, onCancelar }) {
  const { T, dark } = useTheme()
  const notify = useToast()

  const entregaSalva = os?.pre_diagnostico?.entrega || {}
  const dataAgendada = entregaSalva.data || null
  const dataIso  = dataAgendada ? dataAgendada.slice(0, 10) : null
  const dataHora = dataAgendada ? dataAgendada.slice(11, 16) : null

  const dias = useMemo(() => proxNDias(14), [])
  const [diaSel, setDiaSel]      = useState(dataIso || dias[1]?.iso || dias[0]?.iso)
  const [periodoSel, setPeriodo] = useState(detectarPeriodo(dataHora))
  const [horaSel, setHoraSel]    = useState(dataHora || null)
  const [obs, setObs]            = useState(os?.observacoes || '')
  const horarios = useMemo(() => horariosDoPeriodo(periodoSel), [periodoSel])
  const reagendando = !!dataIso
  const podeAgendar = !!diaSel && !!horaSel

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
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12, fontFamily: ATL_FONT, padding: '0 0 12px',
    }}>
      {/* 1. Dia */}
      <AtlPanel T={T} dark={dark} title="Dia" footer="Próximos 14 dias.">
        <div style={{
          display: 'flex', gap: 6, padding: '12px 14px',
          overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          <style>{`div::-webkit-scrollbar{display:none}`}</style>
          {dias.map(d => (
            <AtlDayChip key={d.iso} T={T} dark={dark}
              dia={d.dia} dow={d.dow}
              selected={d.iso === diaSel}
              onClick={() => setDiaSel(d.iso)} />
          ))}
        </div>
      </AtlPanel>

      {/* 2. Periodo */}
      <AtlPanel T={T} dark={dark} title="Período">
        <div style={{ padding: 10 }}>
          <AtlSegmented T={T} dark={dark}
            options={PERIODOS}
            value={periodoSel}
            onChange={(v) => { setPeriodo(v); setHoraSel(null) }} />
        </div>
      </AtlPanel>

      {/* 3. Horario */}
      <AtlPanel
        T={T} dark={dark}
        title="Horário"
        count={horarios.length}
        footer="Escolha o horário disponível.">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6, padding: 12,
        }}>
          {horarios.map(h => (
            <AtlTimeChip key={h} T={T} dark={dark}
              label={h}
              selected={h === horaSel}
              onClick={() => setHoraSel(h)} />
          ))}
        </div>
      </AtlPanel>

      {/* 4. Observacoes */}
      <AtlPanel T={T} dark={dark}
        title="Observações"
        footer="Visível em todas as etapas. Ex: levar a capa, entregar no portão.">
        <div style={{ padding: '10px 14px' }}>
          <textarea
            placeholder="Ex: entregar pela manhã, prédio 2º andar…"
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px', borderRadius: 3,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
              color: T.textPrimary, fontSize: 13, fontFamily: ATL_FONT,
              outline: 'none', resize: 'vertical',
              letterSpacing: '-0.005em', lineHeight: 1.45,
            }}
          />
        </div>
      </AtlPanel>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {onCancelar && (
          <AtlButton T={T} dark={dark} variant="default" onClick={onCancelar}>
            {reagendando ? 'Cancelar' : 'Voltar'}
          </AtlButton>
        )}
        <div style={{ flex: 1 }}>
          <AtlButton
            T={T} dark={dark}
            variant="primary"
            fullWidth
            disabled={!podeAgendar}
            icon="calendar-check"
            onClick={agendar}>
            {ctaLabel}
          </AtlButton>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Fase 2 — Entrega agendada
// ═══════════════════════════════════════════════════════════════════════════
function EntregaAgendada({ os, admin, onUpdateOS, onMoverOS, onReagendar }) {
  const { T, dark } = useTheme()
  const { carimbo } = useAutorCheck()
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)

  const jaPaga = estaPagaTotal(os)
  // OS de orçamento recusado: ao confirmar a entrega (devolução da máquina),
  // o card sai do Kanban (oculta_no_kanban) em vez de ir pra Pagamento/Concluído.
  const ehRecusada = !!os?.recusada || os?.pre_diagnostico?.orcamento_status === 'recusado'
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
  const dataISO = alvo ? alvo.toISOString().slice(0, 10) : null
  const horaStr = alvo ? `${String(alvo.getHours()).padStart(2, '0')}:${String(alvo.getMinutes()).padStart(2, '0')}` : null
  const coletaLabel = alvo ? `${fmtBR(dataISO)} · ${horaStr}` : 'Sem horário'

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
  const [confirmSheet, setConfirmSheet] = useState(null) // null | 'entrega' | 'remover'
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

  async function removerFotoConfirmado() {
    setConfirmSheet(null)
    if (fotoNoStorage) await removerFotoEntrega(os.id)
    setFotoUrl(null); setNoStorage(false)
    const { foto_entrega, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
    notify('ok', 'Foto removida')
  }

  function confirmarEntregaConfirmado() {
    setConfirmSheet(null)
    const patch = {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        // realizada_por: quem confirmou a entrega (pontuação por desempenho)
        entrega: { ...entregaSalva, realizada_em: new Date().toISOString(), realizada_por: carimbo() },
      },
    }
    // Recusada: máquina devolvida → some do Kanban (fica visível em busca/relatórios).
    if (ehRecusada) patch.oculta_no_kanban = true
    onUpdateOS?.(os.numero, patch)
    const destino = ehRecusada ? 'recusado' : (jaPaga ? 'concluido' : 'pagamento')
    const proxima = ETAPAS_TODOS.find(e => e.id === destino || e.match?.[os.tipo] === destino)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  function confirmarEntrega() {
    if (!admin && !fotoNoStorage && !fotoUrl) {
      notify('erro', 'Tire a foto da entrega antes de confirmar.')
      return
    }
    setConfirmSheet('entrega')
  }

  const podeConfirmar = admin || fotoNoStorage || !!fotoUrl

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12, fontFamily: ATL_FONT, padding: '0 0 12px',
    }}>

      {/* 1. Countdown (ou aviso de não agendada) */}
      {alvo ? (
        <AtlPanel T={T} dark={dark} title="Entrega agendada" accent={azul}>
          <div style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{
                fontSize: 36, fontWeight: 700, color: azul,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em',
                lineHeight: 1, fontFamily: ATL_FONT,
              }}>{bigLabel}</span>
              {unitLabel && (
                <span style={{ fontSize: 14, color: T.textMuted }}>{unitLabel}</span>
              )}
            </div>
            <div style={{
              fontSize: 12.5, color: T.textMuted, marginTop: 4,
              letterSpacing: '-0.005em',
            }}>
              <strong style={{ color: T.textPrimary, fontWeight: 600 }}>{coletaLabel}</strong>
            </div>
            <div style={{
              height: 4, marginTop: 10,
              background: dark ? 'rgba(255,255,255,0.08)' : '#E5E5EA',
              borderRadius: 3, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: azul, borderRadius: 3,
                transition: 'width .3s',
              }} />
            </div>
          </div>
        </AtlPanel>
      ) : (
        <AtlPanel T={T} dark={dark} title="Entrega" accent={azul}>
          <AtlListRow T={T} dark={dark}
            first
            icon="calendar-plus" iconCor={azul}
            label="Agendar entrega"
            subtitle="Opcional — você pode marcar como entregue direto abaixo."
            onClick={onReagendar}
          />
        </AtlPanel>
      )}

      {/* 2. Acoes rapidas */}
      <AtlPanel T={T} dark={dark} title="Ações rápidas">
        <AtlListRow T={T} dark={dark}
          first
          icon="brand-whatsapp" iconCor={verde}
          label={`Avisar ${primeiroNome}`}
          subtitle={os?.fone || 'Sem telefone cadastrado'}
          disabled={!os?.fone}
          onClick={abrirWhatsApp}
        />
        <AtlListRow T={T} dark={dark}
          icon="map-pin" iconCor={azul}
          label="Abrir rota"
          subtitle={os?.endereco || 'Sem endereço cadastrado'}
          disabled={!os?.endereco}
          onClick={abrirRota}
        />
      </AtlPanel>

      {/* 3. Foto da entrega */}
      <AtlPanel
        T={T} dark={dark}
        title="Foto da entrega"
        footer={admin
          ? 'Opcional para administrador.'
          : 'Obrigatória — comprova devolução em bom estado.'}>
        <div style={{ padding: '10px 14px' }}>
          <FotoSlotAtl
            T={T} dark={dark}
            label="Entrega"
            url={fotoUrl}
            uploading={uploading}
            onPick={() => setEscolha(true)}
            onRemove={() => setConfirmSheet('remover')}
          />
        </div>
        <input ref={inputCam} type="file" accept="image/*" capture="environment"
          onChange={e => escolherFoto(e.target.files?.[0])} style={{ display: 'none' }} />
        <input ref={inputGal} type="file" accept="image/*"
          onChange={e => escolherFoto(e.target.files?.[0])} style={{ display: 'none' }} />
      </AtlPanel>

      {/* Action sheets */}
      {escolha && (
        <ActionSheetAtl T={T} dark={dark}
          onClose={() => setEscolha(false)}
          actions={[
            { label: 'Tirar foto', onClick: () => { inputCam.current?.click(); setEscolha(false) } },
            { label: 'Escolher dos arquivos', onClick: () => { inputGal.current?.click(); setEscolha(false) } },
          ]} />
      )}
      {confirmSheet === 'remover' && (
        <ActionSheetAtl T={T} dark={dark}
          onClose={() => setConfirmSheet(null)}
          actions={[
            { label: 'Remover foto', destructive: true, onClick: removerFotoConfirmado },
          ]} />
      )}
      {confirmSheet === 'entrega' && (
        <ActionSheetAtl T={T} dark={dark}
          onClose={() => setConfirmSheet(null)}
          actions={[
            {
              label: ehRecusada
                ? 'Confirmar entrega · Sair do Kanban'
                : (jaPaga ? 'Confirmar entrega · Concluir OS' : 'Confirmar entrega · Ir para A receber'),
              onClick: confirmarEntregaConfirmado,
            },
          ]} />
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <AtlButton T={T} dark={dark}
          variant="default"
          icon="calendar-event"
          onClick={onReagendar}>
          {alvo ? 'Reagendar' : 'Agendar'}
        </AtlButton>
        <div style={{ flex: 1 }}>
          <AtlButton
            T={T} dark={dark}
            variant="primary"
            fullWidth
            disabled={!podeConfirmar}
            icon={ehRecusada ? 'truck-return' : 'check'}
            onClick={confirmarEntrega}>
            {ehRecusada ? 'Entregue' : (jaPaga ? 'Entregue · Concluir OS' : 'Entregue · A receber')}
          </AtlButton>
        </div>
      </div>
    </div>
  )
}

// ─── Foto slot Atlassian ──────────────────────────────────────────────────
function FotoSlotAtl({ T, dark, label, url, uploading, onPick, onRemove }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      position: 'relative',
      borderRadius: 4, overflow: 'hidden',
      border: `1px ${url ? 'solid' : 'dashed'} ${T.border}`,
      background: url ? '#000' : (dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC'),
      aspectRatio: '16 / 9',
    }}>
      {url ? (
        <>
          <img src={url} alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={onRemove}
            aria-label="Remover foto"
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 28, height: 28, borderRadius: 4,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
          <span style={{
            position: 'absolute', bottom: 6, left: 8,
            fontSize: 11, fontWeight: 500,
            color: '#fff', background: 'rgba(0,0,0,0.55)',
            padding: '2px 8px', borderRadius: 3,
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
            color: azul, fontFamily: ATL_FONT,
            cursor: uploading ? 'wait' : 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <i className={`ti ${uploading ? 'ti-loader-2' : 'ti-camera-plus'}`}
             style={{ fontSize: 22 }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {uploading ? 'Enviando…' : label}
          </span>
        </button>
      )}
    </div>
  )
}

// ─── Action sheet Atlassian (iOS-like bottom sheet) ──────────────────────
function ActionSheetAtl({ T, dark, onClose, actions }) {
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 8,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 4, overflow: 'hidden',
        }}>
          {actions.map((a, i) => (
            <React.Fragment key={i}>
              <button onClick={a.onClick}
                style={{
                  width: '100%', minHeight: 48,
                  padding: 12, border: 'none', background: 'transparent',
                  fontSize: 14, fontFamily: ATL_FONT,
                  color: a.destructive ? vermelho : azul,
                  fontWeight: 500, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  letterSpacing: '-0.005em',
                }}>{a.label}</button>
              {i < actions.length - 1 && (
                <div style={{ height: 1, background: T.border }} />
              )}
            </React.Fragment>
          ))}
        </div>
        <button onClick={onClose}
          style={{
            minHeight: 48, borderRadius: 4,
            background: T.card, border: `1px solid ${T.border}`,
            cursor: 'pointer',
            fontSize: 14, fontWeight: 600, fontFamily: ATL_FONT,
            color: T.textPrimary, letterSpacing: '-0.005em',
            WebkitTapHighlightColor: 'transparent',
          }}>Cancelar</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Dispatcher
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoEntregaHIG({ os, admin, onUpdateOS, onMoverOS }) {
  // editando = mostrando o form de agendar. Fora disso, mostra sempre a tela
  // de entrega (com o botão "Entregue" sempre visível). O agendamento é opcional.
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <FormAgendarEntrega
        os={os}
        onUpdateOS={onUpdateOS}
        onCancelar={() => setEditando(false)}
      />
    )
  }

  return (
    <EntregaAgendada
      os={os} admin={admin}
      onUpdateOS={onUpdateOS}
      onMoverOS={onMoverOS}
      onReagendar={() => setEditando(true)}
    />
  )
}
