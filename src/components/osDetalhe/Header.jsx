// src/components/osDetalhe/Header.jsx
// Header do OSDetalhe — redesenhado 18/05/2026 (foto da máquina + nome cliente em destaque).
// Linhas:
//  1. badges (tipo + OS# + status) à esquerda · ícones (histórico+badge, ⋯, X) à direita
//  2. FOTO 72x72 + bloco info (nome cliente big, contato pequeno, equipamento)
//  3. Timeline compacta (com border-top sutil)
//  4. 3 abas (Etapa · Resumo · Pagamento)
//
// Foto lê de os.pre_diagnostico.foto (marker 'storage' OU base64 legacy).
// Click no placeholder vazio abre input file pra escolher imagem. Click numa
// foto existente abre FotoAmpliadaModal. Storage privado em idemaq-privado/
// os/{id}/coleta.jpg — signed URL gerada on-demand.

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

export default function Header({
  T, dark, os, admin,
  aba, setAba,
  onShowHistorico, onClose,
  onUpdateOS, onExcluir,
  onRefetchOS,
  mobile = false,
}) {
  const cor = (d, c) => dark ? d : c
  const config = TIPOS_OS[os.tipo]
  const tipoCor = corEtapa(config.cor, dark)
  const azul = cor(P.blue, P.blueDark)
  const notify = useToast()

  // === Foto ===
  // `fotoRef` é o que está salvo no banco ('storage' marker OU base64 legacy).
  // `fotoUrl` é a URL exibível (signed URL do Storage OU base64 inline).
  const fotoRef = os.pre_diagnostico?.foto || os.foto || null
  const [fotoUrl, setFotoUrl] = useState(null)
  const [fotoAmpliada, setFotoAmpliada] = useState(false)
  const [fotoHover, setFotoHover] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputFotoRef = useRef(null)

  // Resolve URL exibível ao montar/trocar a foto
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

  // === Dropdown "Mais ações" ===
  const [menuAberto, setMenuAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  useEffect(() => {
    if (!menuAberto) return
    function onDocClick(e) {
      if (!e.target.closest('[data-mais-acoes]')) setMenuAberto(false)
    }
    function onEsc(e) {
      if (e.key === 'Escape') { e.stopPropagation(); setMenuAberto(false) }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc, true)
    }
  }, [menuAberto])

  async function copiarNumero() {
    setMenuAberto(false)
    try {
      await navigator.clipboard.writeText(String(os.numero))
      notify('ok', `OS #${os.numero} copiada`)
    } catch {
      notify('erro', 'Não consegui copiar')
    }
  }

  // Soft-delete delegado pro Kanban (que faz optimistic remove + rollback).
  // O Header só fecha o modal — o filter local do osList já faz a OS sumir
  // instantaneamente sem depender do Realtime.
  async function excluirOS() {
    if (excluindo) return
    setMenuAberto(false)
    if (!window.confirm(
      `Excluir OS #${os.numero}?\n\n` +
      `Cliente: ${os.cliente || '—'}\n` +
      `A OS some do Kanban mas fica no banco (soft-delete). ` +
      `Pra restaurar, precisa de SQL no Supabase.`
    )) return
    setExcluindo(true)
    try {
      await onExcluir?.(os.numero)
      onClose?.()
    } finally {
      setExcluindo(false)
    }
  }

  async function escolherFoto(file) {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      notify('erro', 'Selecione uma imagem (JPG/PNG).')
      return
    }
    setUploading(true)
    const res = await uploadFotoColeta(os.id, file)
    setUploading(false)
    if (!res.ok) {
      notify('erro', `Falha ao enviar foto: ${res.error}`)
      return
    }
    setFotoUrl(res.url)
    // Persiste marker 'storage' (URL é gerada on-demand via resolverFotoUrl)
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
    if (!res.ok) {
      notify('erro', `Falha ao remover: ${res.error}`)
      return
    }
    setFotoUrl(null)
    // Limpa o marker no banco (mantém o resto do pre_diagnostico)
    const { foto, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
    notify('ok', 'Foto removida')
  }

  function trocarFoto(e) {
    e?.stopPropagation()
    inputFotoRef.current?.click()
  }

  // === Modais de edição inline (cliente + equipamento) ===
  const [modalCliente, setModalCliente] = useState(false)
  const [modalEquipamento, setModalEquipamento] = useState(false)
  function abrirCadastroCliente() {
    if (!os?.cliente_id) {
      notify('info', 'Esta OS não tem cliente vinculado')
      return
    }
    setModalCliente(true)
  }
  function abrirCadastroEquipamento() {
    setModalEquipamento(true)
  }
  function abrirWhatsApp(fone) {
    const digits = (fone || '').replace(/\D/g, '')
    if (!digits) return
    const numero = digits.startsWith('55') ? digits : '55' + digits
    window.location.href = `whatsapp://send?phone=${numero}`
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

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: `1px solid ${T.border}`,
    }}>
      {/* === LINHA 1 — badges + ícones === */}
      <div style={{
        padding: '13px 20px 6px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {/* Tipo */}
          <span style={{
            padding: '3px 9px', borderRadius: 6,
            background: tipoCor + '22', color: tipoCor,
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
            textTransform: 'uppercase', letterSpacing: '.3px',
          }}>
            <i className={`ti ${config.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
            {config.label}
          </span>
          <span style={{
            fontSize: 15, fontWeight: 700, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}>OS #{os.numero}</span>

          {os.garantia && (
            <Pill cor={azul} bg={cor('#0d2035', '#e6f1fb')}>
              <i className="ti ti-shield-check" style={{ fontSize: 11 }} aria-hidden="true" /> Garantia
            </Pill>
          )}
          {pagoTotal && (
            <Pill cor={cor(P.green, P.greenDark)} bg={cor('#0f2a15', '#e8f5ec')}>
              <i className="ti ti-check" style={{ fontSize: 11 }} aria-hidden="true" /> Pago
            </Pill>
          )}
          {pagoParcial && (
            <Pill cor={cor(P.yellow, P.yellowDark)} bg={cor('#2a2000', '#fdf6dc')}>Parcial</Pill>
          )}
          {!isRecusado && status === 'vencido' && (
            <Pill cor={cor(P.red, P.redDark)} bg={cor('#2a1515', '#fde8e8')}>
              {Math.abs(dias)}d atraso
            </Pill>
          )}
          {status === 'hoje' && (
            <Pill cor={cor(P.yellow, P.yellowDark)} bg={cor('#2a2000', '#fdf6dc')}>Vence hoje</Pill>
          )}
          {status === 'amanha' && (
            <Pill cor={cor(P.yellow, P.yellowDark)} bg={cor('#2a2000', '#fdf6dc')}>Vence amanhã</Pill>
          )}
          {isRecusado && (
            <Pill cor={cor(P.red, P.redDark)} bg={cor('#2a1515', '#fde8e8')}>Recusada</Pill>
          )}
          {os.aguardando_peca && (
            <Pill cor="#ff9800" bg={cor('#3a2200', '#fff4e0')}>
              <i className="ti ti-package" style={{ fontSize: 11 }} aria-hidden="true" /> Ag. peça
            </Pill>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={onShowHistorico}
            title={`Histórico (${historicoCount} ${historicoCount === 1 ? 'evento' : 'eventos'})`}
            aria-label="Ver histórico"
            style={{
              position: 'relative',
              background: 'transparent', border: `1px solid ${T.border}`,
              cursor: 'pointer',
              color: T.textSecondary, padding: '6px 8px', borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="ti ti-history" style={{ fontSize: 16 }} aria-hidden="true" />
            {historicoCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 8,
                background: azul, color: '#fff',
                fontSize: 9.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, border: `1.5px solid ${T.card}`,
                fontVariantNumeric: 'tabular-nums',
              }}>{historicoCount > 99 ? '99+' : historicoCount}</span>
            )}
          </button>
          <div data-mais-acoes style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuAberto(v => !v)}
              title="Mais ações" aria-label="Mais ações"
              aria-expanded={menuAberto}
              style={{
                background: menuAberto ? cor('#0d2035', '#e6f1fb') : 'transparent',
                border: `1px solid ${menuAberto ? azul : T.border}`,
                cursor: 'pointer',
                color: menuAberto ? azul : T.textSecondary,
                padding: '6px 8px', borderRadius: 6,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .12s, border-color .12s, color .12s',
              }}>
              <i className="ti ti-dots-vertical" style={{ fontSize: 16 }} aria-hidden="true" />
            </button>
            {menuAberto && (
              <div role="menu" style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
                background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: 5, minWidth: 200,
                boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.12)',
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
          <button
            onClick={onClose} aria-label="Fechar"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.textMuted, padding: '6px 6px', borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* === LINHA 2 — Foto + bloco info === */}
      <div style={{
        padding: '8px 20px 14px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {/* Foto */}
        <div
          onClick={clicarFoto}
          onMouseEnter={() => setFotoHover(true)}
          onMouseLeave={() => setFotoHover(false)}
          title={fotoUrl ? 'Ver foto ampliada' : 'Adicionar foto'}
          style={{
            position: 'relative',
            width: 64, height: 64, flexShrink: 0,
            borderRadius: 8,
            border: `1px solid ${fotoHover ? azul : T.border}`,
            background: fotoUrl
              ? `url(${fotoUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, #2c4257, #3a5a7a)',
            cursor: 'pointer',
            transition: 'border-color .15s',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {!fotoUrl && (
            <i className={`ti ${fotoHover ? 'ti-camera-plus' : 'ti-photo'}`}
              style={{ fontSize: 24, color: '#5B9BD5', opacity: 0.6 }}
              aria-hidden="true" />
          )}
          {fotoUrl && (
            <>
              {/* Ícone "ampliar" no canto inferior — sempre visível */}
              <div style={{
                position: 'absolute', bottom: 4, right: 4,
                width: 18, height: 18, borderRadius: 4,
                background: 'rgba(0,0,0,0.7)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <i className="ti ti-arrows-maximize" style={{ fontSize: 10 }} aria-hidden="true" />
              </div>

              {/* Botões trocar / excluir — só no hover */}
              {fotoHover && (
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  display: 'flex', gap: 3,
                }}>
                  <button
                    type="button"
                    onClick={trocarFoto}
                    disabled={uploading}
                    title={uploading ? 'Enviando...' : 'Trocar foto'}
                    style={{
                      width: 22, height: 22, borderRadius: 4,
                      background: 'rgba(0,0,0,0.75)', color: '#fff',
                      border: 'none', cursor: uploading ? 'wait' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}>
                    <i className={`ti ${uploading ? 'ti-loader-2' : 'ti-camera'}`} style={{ fontSize: 12 }} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={removerFoto}
                    title="Remover foto"
                    style={{
                      width: 22, height: 22, borderRadius: 4,
                      background: 'rgba(192,66,66,0.85)', color: '#fff',
                      border: 'none', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}>
                    <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}

          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => escolherFoto(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
        </div>

        {/* Bloco info */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0,
        }}>
          {/* Linha 1 — Nome cliente em destaque */}
          <NomeCliente T={T} azul={azul}
            nome={os.cliente}
            onClick={abrirCadastroCliente}
          />

          {/* Linha 2 — Equipamento + fone (fundidos) */}
          <LinhaEquipamento T={T} azul={azul}
            equipamento={equipamentoLabel}
            serie={os.serie}
            defeito={os.defeito}
            fone={os.fone}
            onClick={abrirCadastroEquipamento}
            onWhats={() => abrirWhatsApp(os.fone)}
          />

          {/* Linha 3 — Endereço */}
          <LinhaEndereco T={T} azul={azul}
            endereco={os.endereco}
            onClick={() => abrirMapa(os.endereco)}
          />
        </div>
      </div>

      {/* === LINHA 3 — Timeline (com border-top) === */}
      {!isRecusado && (
        <div style={{
          padding: '14px 20px 14px',
          borderTop: `1px solid ${T.border}`,
        }}>
          <Timeline T={T} dark={dark} os={os} config={config} admin={admin} mobile={mobile} />
        </div>
      )}

      {/* === LINHA 4 — Abas === */}
      <div style={{
        display: 'flex', padding: '0 8px', marginTop: 4,
        borderTop: `1px solid ${T.border}`,
      }}>
        {ABAS.map(a => {
          const ativo = aba === a.id
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              style={{
                flex: 1,
                padding: '11px 8px',
                border: 'none',
                borderBottom: `2px solid ${ativo ? azul : 'transparent'}`,
                background: 'transparent',
                color: ativo ? azul : T.textMuted,
                fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'border-color .12s, color .12s',
                fontFamily: 'inherit',
                marginTop: -1,
              }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
              {a.label}
            </button>
          )
        })}
      </div>

      {/* Modal de foto ampliada */}
      {fotoAmpliada && fotoUrl && (
        <FotoAmpliadaModal
          src={fotoUrl}
          alt={`Foto da OS #${os.numero}`}
          onClose={() => setFotoAmpliada(false)}
        />
      )}

      {/* Modal de edição do cliente vinculado */}
      {modalCliente && (
        <FormClienteEdit
          T={T} dark={dark} mobile={mobile}
          os={os}
          onClose={() => setModalCliente(false)}
          onSalvarOk={() => onRefetchOS?.()}
        />
      )}

      {/* Modal de edição do equipamento da OS */}
      {modalEquipamento && (
        <FormEquipamentoEdit
          T={T} dark={dark} mobile={mobile}
          os={os}
          onClose={() => setModalEquipamento(false)}
          onUpdateOS={onUpdateOS}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
function Pill({ cor, bg, children }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5,
      background: bg, color: cor, border: `1px solid ${cor}33`,
      fontSize: 10.5, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function NomeCliente({ T, azul, nome, onClick }) {
  const [hover, setHover] = useState(false)
  const vazio = !nome
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Abrir cadastro do cliente"
      style={{
        fontSize: 17, fontWeight: 700, lineHeight: 1.2,
        color: vazio ? T.textMuted : (hover ? azul : T.textPrimary),
        fontStyle: vazio ? 'italic' : 'normal',
        cursor: 'pointer', transition: 'color .12s',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      {nome || 'Cliente não definido'}
    </div>
  )
}

function LinhaEquipamento({ T, azul, equipamento, serie, defeito, fone, onClick, onWhats }) {
  const [hover, setHover] = useState(false)
  const vazio = !equipamento
  return (
    <div
      style={{
        marginTop: 4,
        fontSize: 12, color: T.textSecondary,
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      }}
    >
      <i className="ti ti-device-washing-machine"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title="Abrir cadastro do equipamento"
        style={{
          fontSize: 13, color: azul, flexShrink: 0,
          cursor: 'pointer',
        }} aria-hidden="true" />

      {/* Equipamento (ou placeholder) */}
      {vazio ? (
        <span
          onClick={onClick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title="Abrir cadastro do equipamento"
          style={{
            color: hover ? azul : T.textMuted,
            fontStyle: 'italic',
            cursor: 'pointer', transition: 'color .12s',
          }}>
          Equipamento não preenchido — clique pra adicionar
        </span>
      ) : (
        <strong
          onClick={onClick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title="Abrir cadastro do equipamento"
          style={{
            color: hover ? azul : T.textPrimary,
            fontWeight: 700,
            cursor: 'pointer', transition: 'color .12s',
          }}>
          {equipamento}
        </strong>
      )}

      {/* S/N e defeito só fazem sentido quando tem equipamento */}
      {!vazio && serie && (
        <span style={{
          color: T.textMuted, fontSize: 10.5,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}>S/N {serie}</span>
      )}
      {!vazio && defeito && (
        <>
          <SeparadorPonto />
          <span style={{
            color: T.textMuted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            minWidth: 0, flex: '0 1 auto',
          }}>
            {defeito}
          </span>
        </>
      )}

      {/* Telefone aparece SEMPRE quando existir — independente do equipamento.
          Antes ficava dentro do else do "vazio" e sumia quando OS nao tinha
          equipamento cadastrado. */}
      {fone && (
        <>
          <SeparadorPonto />
          <ChunkClicavel T={T} azul={azul}
            icon="ti-phone" texto={fone}
            onClick={onWhats} title="Abrir conversa no WhatsApp"
          />
        </>
      )}
    </div>
  )
}

function LinhaEndereco({ T, azul, endereco, onClick }) {
  const [hover, setHover] = useState(false)
  if (!endereco) return null
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Abrir no Google Maps"
      style={{
        marginTop: 3,
        fontSize: 11.5,
        color: hover ? azul : T.textMuted,
        display: 'flex', alignItems: 'center', gap: 5,
        cursor: 'pointer', transition: 'color .12s',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      <i className="ti ti-map-pin"
        style={{
          fontSize: 11, flexShrink: 0, opacity: 0.7,
          color: hover ? azul : T.textDim,
          transition: 'color .12s',
        }} aria-hidden="true" />
      <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{endereco}</span>
    </div>
  )
}

function ChunkClicavel({ T, azul, icon, texto, onClick, title, truncar }) {
  const [hover, setHover] = useState(false)
  return (
    <span
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        color: hover && onClick ? azul : 'inherit',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'color .12s',
        ...(truncar ? {
          maxWidth: 260,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        } : {}),
      }}
    >
      <i className={`ti ${icon}`}
        style={{
          fontSize: 11,
          color: hover && onClick ? azul : T.textDim,
          flexShrink: 0,
          transition: 'color .12s',
        }} aria-hidden="true" />
      <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{texto}</span>
    </span>
  )
}

function SeparadorPonto() {
  return <span style={{ color: '#4a4a50', opacity: 0.7 }} aria-hidden="true">·</span>
}

function MenuItem({ T, icon, onClick, disabled, danger, children }) {
  const [hover, setHover] = useState(false)
  const corBase = danger ? '#c04242' : T.textPrimary
  return (
    <button role="menuitem"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', padding: '8px 10px', borderRadius: 6,
        background: hover && !disabled
          ? (danger ? 'rgba(192,66,66,0.10)' : T.bg)
          : 'transparent',
        border: 'none', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 9,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        color: corBase, fontFamily: 'inherit',
        fontSize: 12.5, fontWeight: 500,
        transition: 'background .12s',
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 15, color: corBase, flexShrink: 0 }} aria-hidden="true" />
      <span style={{ flex: 1 }}>{children}</span>
    </button>
  )
}
