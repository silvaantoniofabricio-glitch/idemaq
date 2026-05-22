// src/components/osDetalhe/HeaderMobile.jsx
// Header do OSDetalhe em mobile — reestruturado pra uso de polegar.
//
// Pilha vertical (top → bottom):
//   1. Top bar compacto 52px:  ✕  ·  OS #NNN + tipo  ·  🕓badge ⋮
//   2. Hero do equipamento:    foto 88x88 + nome cliente grande + equipamento/série + linha contato/endereço
//   3. Chips de status (só relevantes): atraso · vence hoje · pago · parcial · ag.peça · garantia · recusada
//   4. Timeline horizontal scrollable
//   5. Abas (Etapa · Relatório · Pagamento) — 48px touch target
//
// Decisões mobile-first:
//   • Foto cresce de 64→88 (anchor visual + tap area boa)
//   • Hover do desktop substituído por botões sempre visíveis (camera + lixeira)
//   • Fontes maiores (nome 18px, equipamento 13px) — desktop usa 17/12
//   • Wrap dos badges contido numa linha rolável horizontal (não empurra footer pra fora)
//   • Endereço fica chip clicável de 1 linha (não quebra layout)

import React, { useState, useRef, useEffect } from 'react'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { corEtapa } from '../../utils/colors'
import {
  estaPagaTotal, estaPagaParcial,
  calcStatusPrazo, diasPrazo,
} from '../../utils/osHelpers'
import {
  uploadFotoColeta, removerFotoColeta, resolverFotoUrl, FOTO_STORAGE_MARKER,
} from '../../utils/osStorage'
import { useToast } from '../ui'
import Timeline from './Timeline'
import FotoAmpliadaModal from './FotoAmpliadaModal'
import FormClienteEdit from './FormClienteEdit'
import FormEquipamentoEdit from './FormEquipamentoEdit'

const ABAS = [
  { id: 'etapa',     label: 'Etapa',     icon: 'ti-checkup-list' },
  { id: 'relatorio', label: 'Relatório', icon: 'ti-report' },
  { id: 'pagamento', label: 'Pagamento', icon: 'ti-cash-banknote' },
]

export default function HeaderMobile({
  T, dark, os, admin,
  aba, setAba,
  onShowHistorico, onClose,
  onUpdateOS, onExcluir,
  onRefetchOS,
}) {
  const cor = (d, c) => dark ? d : c
  const config = TIPOS_OS[os.tipo]
  const tipoCor = corEtapa(config.cor, dark)
  const azul = cor(P.blue, P.blueDark)
  const notify = useToast()

  // === Foto ===
  const fotoRef = os.pre_diagnostico?.foto || os.foto || null
  const [fotoUrl, setFotoUrl] = useState(null)
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputFotoRef = useRef(null)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const url = await resolverFotoUrl(fotoRef, os.id)
      if (!cancelado) setFotoUrl(url)
    }
    if (fotoRef) carregar()
    else setFotoUrl(null)
    return () => { cancelado = true }
  }, [fotoRef, os.id])

  async function escolherFoto(file) {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      notify('erro', 'Selecione uma imagem (JPG/PNG).')
      return
    }
    setUploading(true)
    const res = await uploadFotoColeta(os.id, file)
    setUploading(false)
    if (!res.ok) { notify('erro', `Falha ao enviar foto: ${res.error}`); return }
    setFotoUrl(res.url)
    onUpdateOS?.(os.numero, {
      pre_diagnostico: { ...(os.pre_diagnostico || {}), foto: FOTO_STORAGE_MARKER },
    })
    notify('ok', 'Foto adicionada')
  }
  function clicarFoto() {
    if (uploading) return
    if (fotoUrl) setFotoAmpliada(true)
    else inputFotoRef.current?.click()
  }
  async function removerFoto(e) {
    e?.stopPropagation()
    if (!window.confirm('Remover a foto da coleta?')) return
    const res = await removerFotoColeta(os.id)
    if (!res.ok) { notify('erro', `Falha ao remover: ${res.error}`); return }
    setFotoUrl(null)
    const { foto, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
    notify('ok', 'Foto removida')
  }
  function trocarFoto(e) {
    e?.stopPropagation()
    inputFotoRef.current?.click()
  }

  // === Dropdown "Mais ações" ===
  const [menuAberto, setMenuAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  useEffect(() => {
    if (!menuAberto) return
    function onDocClick(e) {
      if (!e.target.closest('[data-mais-acoes-mobile]')) setMenuAberto(false)
    }
    function onEsc(e) {
      if (e.key === 'Escape') { e.stopPropagation(); setMenuAberto(false) }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('touchstart', onDocClick)
    document.addEventListener('keydown', onEsc, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
      document.removeEventListener('keydown', onEsc, true)
    }
  }, [menuAberto])

  async function copiarNumero() {
    setMenuAberto(false)
    try {
      await navigator.clipboard.writeText(String(os.numero))
      notify('ok', `OS #${os.numero} copiada`)
    } catch { notify('erro', 'Não consegui copiar') }
  }
  async function excluirOS() {
    if (excluindo) return
    setMenuAberto(false)
    if (!window.confirm(
      `Excluir OS #${os.numero}?\n\nCliente: ${os.cliente || '—'}\n` +
      `A OS some do Kanban mas fica no banco (soft-delete).`
    )) return
    setExcluindo(true)
    try {
      await onExcluir?.(os.numero)
      onClose?.()
    } finally { setExcluindo(false) }
  }

  // === Modais inline ===
  const [modalCliente, setModalCliente] = useState(false)
  const [modalEquipamento, setModalEquipamento] = useState(false)
  function abrirCadastroCliente() {
    if (!os?.cliente_id) { notify('info', 'Esta OS não tem cliente vinculado'); return }
    setModalCliente(true)
  }
  function abrirCadastroEquipamento() { setModalEquipamento(true) }
  function abrirWhatsApp(fone) {
    const digits = (fone || '').replace(/\D/g, '')
    if (!digits) return
    const numero = digits.startsWith('55') ? digits : '55' + digits
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = `intent://send?phone=${numero}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.whatsapp.w4b;end`
    } else {
      window.location.href = `whatsapp://send?phone=${numero}`
    }
  }
  function abrirMapa(endereco) {
    if (!endereco) return
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`,
      '_blank', 'noopener,noreferrer')
  }

  const isRecusado = os.etapa === 'recusado'
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)
  const historicoCount = (os.historico || []).length
  const equipamentoLabel = [os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento

  // Quais chips mostrar (só os úteis pra mobile — economiza linha)
  const chips = []
  if (os.garantia) chips.push({ k: 'garantia', cor: azul, bg: cor('#0d2035', '#e6f1fb'), icon: 'ti-shield-check', label: 'Garantia' })
  if (pagoTotal) chips.push({ k: 'pago', cor: cor(P.green, P.greenDark), bg: cor('#0f2a15', '#e8f5ec'), icon: 'ti-check', label: 'Pago' })
  if (pagoParcial) chips.push({ k: 'parcial', cor: cor(P.yellow, P.yellowDark), bg: cor('#2a2000', '#fdf6dc'), label: 'Parcial' })
  if (!isRecusado && status === 'vencido') chips.push({ k: 'atraso', cor: cor(P.red, P.redDark), bg: cor('#2a1515', '#fde8e8'), icon: 'ti-alert-circle', label: `${Math.abs(dias)}d atraso` })
  if (status === 'hoje') chips.push({ k: 'hoje', cor: cor(P.yellow, P.yellowDark), bg: cor('#2a2000', '#fdf6dc'), icon: 'ti-clock', label: 'Vence hoje' })
  if (status === 'amanha') chips.push({ k: 'amanha', cor: cor(P.yellow, P.yellowDark), bg: cor('#2a2000', '#fdf6dc'), icon: 'ti-clock', label: 'Amanhã' })
  if (isRecusado) chips.push({ k: 'recusada', cor: cor(P.red, P.redDark), bg: cor('#2a1515', '#fde8e8'), icon: 'ti-x', label: 'Recusada' })
  if (os.aguardando_peca) chips.push({ k: 'agpeca', cor: '#ff9800', bg: cor('#3a2200', '#fff4e0'), icon: 'ti-package', label: 'Ag. peça' })

  return (
    <div style={{
      flexShrink: 0,
      background: T.card,
      borderBottom: `1px solid ${T.border}`,
    }}>
      {/* ===== 1. TOP BAR 52px — fixa pro topo do bottom-sheet ===== */}
      <div style={{
        height: 52,
        padding: '0 8px 0 4px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <BotaoIcone T={T} icon="ti-x" onClick={onClose} label="Fechar" />

        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          overflow: 'hidden',
        }}>
          <span style={{
            fontSize: 15, fontWeight: 700, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}>OS #{os.numero}</span>
          <span style={{
            padding: '3px 8px', borderRadius: 5,
            background: tipoCor + '22', color: tipoCor,
            fontSize: 10.5, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            textTransform: 'uppercase', letterSpacing: '.3px',
            whiteSpace: 'nowrap',
          }}>
            <i className={`ti ${config.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
            {config.label}
          </span>
        </div>

        <BotaoIcone T={T} icon="ti-history" onClick={onShowHistorico} label="Histórico"
          badge={historicoCount > 0 ? (historicoCount > 99 ? '99+' : historicoCount) : null}
          badgeCor={azul}
        />

        <div data-mais-acoes-mobile style={{ position: 'relative' }}>
          <BotaoIcone T={T} icon="ti-dots-vertical"
            onClick={() => setMenuAberto(v => !v)} label="Mais ações"
            ativo={menuAberto} corAtivo={azul}
          />
          {menuAberto && (
            <div role="menu" style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
              background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: 6, minWidth: 220,
              boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
            }}>
              <MenuItem T={T} icon="ti-copy" onClick={copiarNumero}>
                Copiar nº da OS
              </MenuItem>
              {admin && (
                <>
                  <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
                  <MenuItem T={T} icon="ti-trash" danger
                    onClick={excluirOS} disabled={excluindo}>
                    {excluindo ? 'Excluindo…' : 'Excluir OS'}
                  </MenuItem>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== 2. HERO — foto + nome cliente + equipamento + contato ===== */}
      <div style={{
        padding: '4px 14px 12px',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        {/* Foto */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={clicarFoto}
            style={{
              width: 88, height: 88,
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: fotoUrl
                ? `url(${fotoUrl}) center/cover no-repeat`
                : 'linear-gradient(135deg, #2c4257, #3a5a7a)',
              cursor: 'pointer',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.12)',
            }}
          >
            {!fotoUrl && (
              <div style={{ textAlign: 'center', color: '#9ec2e6' }}>
                <i className="ti ti-camera-plus" style={{ fontSize: 26, display: 'block' }} aria-hidden="true" />
                <span style={{ fontSize: 9.5, fontWeight: 600, marginTop: 2, display: 'block' }}>FOTO</span>
              </div>
            )}
            {fotoUrl && (
              <div style={{
                position: 'absolute', bottom: 4, right: 4,
                width: 22, height: 22, borderRadius: 6,
                background: 'rgba(0,0,0,0.75)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <i className="ti ti-arrows-maximize" style={{ fontSize: 12 }} aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Botão trocar/excluir abaixo da foto (mobile precisa de tap, não hover) */}
          {fotoUrl && (
            <div style={{
              display: 'flex', gap: 4, marginTop: 6,
              justifyContent: 'center',
            }}>
              <button type="button" onClick={trocarFoto} disabled={uploading}
                title="Trocar foto"
                style={{
                  width: 36, height: 28, borderRadius: 6,
                  background: T.cardAlt, color: T.textSecondary,
                  border: `1px solid ${T.border}`, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}>
                <i className={`ti ${uploading ? 'ti-loader-2' : 'ti-camera'}`} style={{ fontSize: 13 }} aria-hidden="true" />
              </button>
              <button type="button" onClick={removerFoto}
                title="Remover foto"
                style={{
                  width: 36, height: 28, borderRadius: 6,
                  background: T.cardAlt, color: cor(P.red, P.redDark),
                  border: `1px solid ${T.border}`, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}>
                <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
              </button>
            </div>
          )}

          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment"
            onChange={(e) => escolherFoto(e.target.files?.[0])}
            style={{ display: 'none' }} />
        </div>

        {/* Bloco info */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Nome cliente */}
          <button
            onClick={abrirCadastroCliente}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 0, margin: 0, textAlign: 'left',
              fontSize: 18, fontWeight: 700, lineHeight: 1.2,
              color: os.cliente ? T.textPrimary : T.textMuted,
              fontStyle: os.cliente ? 'normal' : 'italic',
              fontFamily: 'inherit',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {os.cliente || 'Cliente não definido'}
            </span>
            <i className="ti ti-edit" style={{ fontSize: 12, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />
          </button>

          {/* Equipamento */}
          <button
            onClick={abrirCadastroEquipamento}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 0, margin: 0, textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: T.textSecondary,
              fontFamily: 'inherit',
              overflow: 'hidden',
            }}
          >
            <i className="ti ti-device-washing-machine"
              style={{ fontSize: 14, color: azul, flexShrink: 0 }} aria-hidden="true" />
            {equipamentoLabel ? (
              <span style={{
                fontWeight: 600, color: T.textPrimary,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{equipamentoLabel}</span>
            ) : (
              <span style={{ color: T.textMuted, fontStyle: 'italic' }}>
                Adicionar equipamento
              </span>
            )}
            {os.serie && (
              <span style={{
                color: T.textMuted, fontSize: 11,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                flexShrink: 0,
              }}>· {os.serie}</span>
            )}
          </button>

          {/* Defeito como linha discreta */}
          {os.defeito && (
            <div style={{
              fontSize: 12, color: T.textMuted, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              <i className="ti ti-tool" style={{ fontSize: 11, marginRight: 4, opacity: 0.7 }} aria-hidden="true" />
              {os.defeito}
            </div>
          )}

          {/* Linha de contato: WhatsApp + Maps em botões com hit area boa */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {os.fone && (
              <ChipAcao T={T} azul={azul} icon="ti-brand-whatsapp"
                onClick={() => abrirWhatsApp(os.fone)}>
                {os.fone}
              </ChipAcao>
            )}
            {os.endereco && (
              <ChipAcao T={T} azul={azul} icon="ti-map-pin"
                onClick={() => abrirMapa(os.endereco)}
                truncar>
                {os.endereco}
              </ChipAcao>
            )}
          </div>
        </div>
      </div>

      {/* ===== 3. CHIPS DE STATUS (linha rolável horizontal) ===== */}
      {chips.length > 0 && (
        <div className="idemaq-no-scrollbar" style={{
          display: 'flex', gap: 6, padding: '0 14px 12px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {chips.map(c => (
            <span key={c.k} style={{
              padding: '4px 10px', borderRadius: 14,
              background: c.bg, color: c.cor,
              border: `1px solid ${c.cor}33`,
              fontSize: 11, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {c.icon && <i className={`ti ${c.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />}
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* ===== 4. TIMELINE — só se não recusada ===== */}
      {!isRecusado && (
        <div style={{
          padding: '10px 14px 10px',
          borderTop: `1px solid ${T.border}`,
          background: T.cardAlt,
        }}>
          <Timeline T={T} dark={dark} os={os} config={config} admin={admin} mobile={true} />
        </div>
      )}

      {/* ===== 5. ABAS — 48px touch target ===== */}
      <div style={{
        display: 'flex',
        borderTop: `1px solid ${T.border}`,
        background: T.card,
      }}>
        {ABAS.map(a => {
          const ativo = aba === a.id
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              style={{
                flex: 1,
                minHeight: 48,
                padding: '0 8px',
                border: 'none',
                borderBottom: `2px solid ${ativo ? azul : 'transparent'}`,
                background: ativo ? (dark ? 'rgba(91,155,213,0.08)' : 'rgba(91,155,213,0.06)') : 'transparent',
                color: ativo ? azul : T.textMuted,
                fontSize: 13, fontWeight: ativo ? 700 : 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'border-color .12s, color .12s, background .12s',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
              {a.label}
            </button>
          )
        })}
      </div>

      {/* Modais sobrepostos */}
      {fotoAmpliada && fotoUrl && (
        <FotoAmpliadaModal
          src={fotoUrl}
          alt={`Foto da OS #${os.numero}`}
          onClose={() => setFotoAmpliada(false)}
        />
      )}
      {modalCliente && (
        <FormClienteEdit
          T={T} dark={dark} mobile={true}
          os={os}
          onClose={() => setModalCliente(false)}
          onSalvarOk={() => onRefetchOS?.()}
        />
      )}
      {modalEquipamento && (
        <FormEquipamentoEdit
          T={T} dark={dark} mobile={true}
          os={os}
          onClose={() => setModalEquipamento(false)}
          onUpdateOS={onUpdateOS}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function BotaoIcone({ T, icon, onClick, label, badge, badgeCor, ativo, corAtivo }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        position: 'relative',
        width: 40, height: 40, borderRadius: 10,
        background: ativo ? (corAtivo + '15') : 'transparent',
        border: 'none', cursor: 'pointer',
        color: ativo ? corAtivo : T.textSecondary,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, color .12s',
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 19 }} aria-hidden="true" />
      {badge != null && (
        <span style={{
          position: 'absolute', top: 4, right: 4,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 8,
          background: badgeCor, color: '#fff',
          fontSize: 9.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, border: `1.5px solid ${T.card}`,
          fontVariantNumeric: 'tabular-nums',
        }}>{badge}</span>
      )}
    </button>
  )
}

function ChipAcao({ T, azul, icon, children, onClick, truncar }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 14,
        background: T.cardAlt, color: T.textSecondary,
        border: `1px solid ${T.border}`,
        fontSize: 11.5, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
        minHeight: 28,
        WebkitTapHighlightColor: 'transparent',
        ...(truncar ? {
          maxWidth: '100%',
          overflow: 'hidden',
        } : {}),
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 13, color: azul, flexShrink: 0 }} aria-hidden="true" />
      <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{children}</span>
    </button>
  )
}

function MenuItem({ T, icon, onClick, disabled, danger, children }) {
  const corBase = danger ? '#c04242' : T.textPrimary
  return (
    <button role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '11px 12px', borderRadius: 7,
        background: 'transparent', border: 'none', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        color: corBase, fontFamily: 'inherit',
        fontSize: 13.5, fontWeight: 600,
        WebkitTapHighlightColor: 'transparent',
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 16, color: corBase, flexShrink: 0 }} aria-hidden="true" />
      <span style={{ flex: 1 }}>{children}</span>
    </button>
  )
}
