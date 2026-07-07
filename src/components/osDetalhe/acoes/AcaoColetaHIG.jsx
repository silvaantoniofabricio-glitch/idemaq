// src/components/osDetalhe/acoes/AcaoColetaHIG.jsx
// Etapa Coleta — Atlassian Design (reescrito 28/05/2026).
//
// O técnico está a caminho ou acabou de chegar no cliente. Estrutura:
//   1. Banner countdown ate a coleta (panel destaque azul)
//   2. Acoes rapidas — WhatsApp + Abrir rota (list rows)
//   3. Equipamento — modelo + nº de serie (field rows inline)
//   4. Fotos da coleta — FotosColetaSection (com IA auto-fill da etiqueta)
//   5. Observacoes — textarea
//   6. CTA Confirmar coleta
//
// Persiste:
//   · os.modelo_equipamento / os.numero_serie (debounce 600ms)
//   · os.pre_diagnostico.foto_coleta_1 / foto_coleta_2 (via FotosColetaSection)
//   · os.observacoes
//
// O nome do arquivo permanece *HIG por compat com imports — o conteudo agora
// e Atlassian. EtapaTab continua importando AcaoColetaHIG.

import React, { useState, useEffect, useMemo } from 'react'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import FotosColetaSection from '../FotosColetaSection'
import { useAutorCheck } from '../../../hooks/useAutorCheck'
import {
  AtlPanel, AtlButton, AtlListRow, AtlFieldRow,
  ATL_FONT, atlSurfaceSunken,
} from './_AtlassianUI'

// ─── Helpers de data ──────────────────────────────────────────────────────
const fmtBR = (iso) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ═══════════════════════════════════════════════════════════════════════════
// Card de countdown (Coleta agendada)
// ═══════════════════════════════════════════════════════════════════════════
function AtlCountdownCard({ T, dark, os }) {
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
    if (!alvo) return { bigLabel: '—', unitLabel: '', subLabel: 'Sem horário agendado', pct: 0, atrasado: false }
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

  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  const cor = atrasado ? vermelho : azul

  return (
    <AtlPanel T={T} dark={dark} title="Coleta agendada" accent={cor}>
      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 36, fontWeight: 700, color: cor,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em',
            lineHeight: 1, fontFamily: ATL_FONT,
          }}>
            {bigLabel}
          </span>
          {unitLabel && (
            <span style={{ fontSize: 14, color: T.textMuted }}>
              {unitLabel}
            </span>
          )}
          {atrasado && (
            <span style={{
              fontSize: 11, color: vermelho,
              background: vermelho + '22',
              padding: '2px 8px', borderRadius: 3,
              fontWeight: 600, marginLeft: 4,
              letterSpacing: '-0.005em',
            }}>
              em atraso
            </span>
          )}
        </div>

        <div style={{
          fontSize: 12.5, color: T.textMuted, marginTop: 4,
          letterSpacing: '-0.005em',
        }}>
          <strong style={{ color: T.textPrimary, fontWeight: 600 }}>{subLabel}</strong>
        </div>

        <div style={{
          height: 4, marginTop: 10,
          background: dark ? 'rgba(255,255,255,0.08)' : '#E5E5EA',
          borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: cor, borderRadius: 3,
            transition: 'width .3s',
          }} />
        </div>
      </div>
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoColetaHIG({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()
  const { carimbo } = useAutorCheck()
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)

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

  // ── Observações ───────────────────────────────────────────────────────────
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

  // ── Detecta foto ja existente pra habilitar CTA ──────────────────────────
  const temFoto = !!(
    os?.pre_diagnostico?.foto_coleta_1
    || os?.pre_diagnostico?.foto_coleta_2
    || os?.pre_diagnostico?.foto_coleta
  )

  // ── CTA ───────────────────────────────────────────────────────────────────
  const temIdentificacao = !!(modelo || temFoto)
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    setSalvando(true)
    const patch = {}
    if (modelo !== (os?.modelo_equipamento || os?.modelo || '')) patch.modelo_equipamento = modelo
    if (serie  !== (os?.numero_serie || os?.serie || ''))         patch.numero_serie = serie
    if (obs !== (os?.observacoes || ''))                           patch.observacoes = obs
    // Autoria: quem confirmou a coleta + quando (pontuação por desempenho)
    patch.pre_diagnostico = {
      ...(os.pre_diagnostico || {}),
      coleta_confirmada: carimbo(),
    }
    await onUpdateOS?.(os.numero, patch)
    setSalvando(false)
    onMoverOS?.(os.numero, 'diagnostico')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12,
      fontFamily: ATL_FONT,
      padding: '0 0 12px',
    }}>

      {/* 1. Countdown */}
      <AtlCountdownCard T={T} dark={dark} os={os} />

      {/* 2. Acoes rapidas */}
      <AtlPanel T={T} dark={dark} title="Ações rápidas">
        <AtlListRow T={T} dark={dark}
          first
          icon="brand-whatsapp"
          iconCor={verde}
          label={`Avisar ${primeiroNome}`}
          subtitle={os?.fone || 'Sem telefone cadastrado'}
          disabled={!os?.fone}
          onClick={abrirWhatsApp}
        />
        <AtlListRow T={T} dark={dark}
          icon="map-pin"
          iconCor={azul}
          label="Abrir rota"
          subtitle={os?.endereco || 'Sem endereço cadastrado'}
          disabled={!os?.endereco}
          onClick={abrirRota}
        />
      </AtlPanel>

      {/* 3. Equipamento */}
      <AtlPanel T={T} dark={dark} title="Equipamento"
        footer="Preencha ao chegar. Modelo ou foto liberam o botão de confirmar.">
        <AtlFieldRow T={T} dark={dark}
          first
          label="Modelo"
          placeholder="Ex: BWK11A, LSP11"
          value={modelo}
          onChange={setModelo}
        />
        <AtlFieldRow T={T} dark={dark}
          label="Nº de série"
          placeholder="Ex: BR-2024-00887"
          value={serie}
          onChange={setSerie}
          mono
        />
      </AtlPanel>

      {/* 4. Fotos — usa FotosColetaSection (com IA auto-fill da etiqueta) */}
      <FotosColetaSection
        T={T} dark={dark}
        os={os}
        onUpdateOS={onUpdateOS}
        onCamposExtraidos={(campos) => {
          // IA leu a etiqueta — preenche so campos vazios
          if (campos.modelo && !modelo) setModelo(campos.modelo)
          if (campos.serie && !serie) setSerie(campos.serie)
        }}
      />

      {/* 5. Observacoes */}
      <AtlPanel T={T} dark={dark} title="Observações"
        footer="Visível em todas as etapas. Ex: chegou sem capa, mangueira solta.">
        <div style={{ padding: '10px 14px' }}>
          <textarea
            placeholder="Ex: cliente informou que parou de lavar semana passada, sem barulho anormal…"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px',
              borderRadius: 3,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              color: T.textPrimary,
              fontSize: 13, fontFamily: ATL_FONT,
              outline: 'none', resize: 'vertical',
              letterSpacing: '-0.005em',
              lineHeight: 1.45,
            }}
          />
        </div>
      </AtlPanel>

      {/* 6. CTA Confirmar coleta */}
      <AtlButton
        T={T} dark={dark}
        variant="primary"
        fullWidth
        disabled={!temIdentificacao || salvando}
        icon={salvando ? 'loader-2' : 'home-import'}
        onClick={confirmar}>
        {salvando
          ? 'Salvando…'
          : temIdentificacao
            ? 'Confirmar coleta'
            : 'Informe o modelo ou tire uma foto'}
      </AtlButton>
    </div>
  )
}
