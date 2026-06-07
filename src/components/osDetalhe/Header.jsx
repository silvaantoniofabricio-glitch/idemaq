// src/components/osDetalhe/Header.jsx
// Header do OSDetalhe — layout idêntico ao mobile (07/06/2026).
// Linhas:
//  1. X · OS# · etapa-badge | histórico-badge · ⋯-dropdown
//  2. Nome cliente + fone + ícone WhatsApp
//  3. Endereço (click copia · ícone Maps abre Google Maps)
//  4. Equipamento (marca · modelo · S/N)
//  5. 3 abas (Etapa · Resumo · A receber)

import React, { useState, useEffect } from 'react'
import { P } from '../../theme'
import { ETAPAS_TODOS } from '../../utils/osData'
import { calcStatusPrazo, diasPrazo } from '../../utils/osHelpers'
import { useToast } from '../ui'
import FormClienteEdit from './FormClienteEdit'
import FormEquipamentoEdit from './FormEquipamentoEdit'

const ABAS = [
  { id: 'etapa',     label: 'Etapa',     icon: 'ti-checkup-list' },
  { id: 'relatorio', label: 'Resumo',    icon: 'ti-report' },
  { id: 'pagamento', label: 'A receber', icon: 'ti-cash-banknote' },
]

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace'

// ── Badge de etapa ────────────────────────────────────────────────────────────
function resolverEtapaLabel(os) {
  if (!os?.etapa) return 'Etapa'
  const uni = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === os.etapa)
  return uni?.curto || uni?.label || os.etapaLabel || os.etapa
}

function badgeTone(os, status) {
  if (status === 'vencido') return 'red'
  if (status === 'hoje' || status === 'amanha') return 'yellow'
  const e = os?.etapa
  if (['diagnostico', 'orcamento', 'oficina', 'em_oficina'].includes(e)) return 'yellow'
  if (e === 'concluido' || e === 'entrega' || e === 'entregue') return 'green'
  if (e === 'recusado') return 'red'
  return 'blue'
}

const BADGE_BG_DARK  = { blue: 'rgba(91,155,213,0.18)', yellow: 'rgba(255,217,102,0.18)', red: 'rgba(192,66,66,0.18)', green: 'rgba(46,125,94,0.18)' }
const BADGE_BG_LIGHT = { blue: '#E3F2FD', yellow: '#FFF8DC', red: '#FDE8E8', green: '#E8F5EC' }
const BADGE_FG_DARK  = { blue: '#5B9BD5', yellow: '#FFD966', red: '#FF8888', green: '#7FCEA8' }
const BADGE_FG_LIGHT = { blue: '#1565C0', yellow: '#7A5900', red: '#c04242', green: '#2e7d5e' }

export default function Header({
  T, dark, os, admin,
  aba, setAba,
  onShowHistorico, onClose,
  onUpdateOS, onExcluir, onDuplicar,
  onRefetchOS,
  mobile = false,
}) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  const notify = useToast()

  // ── Dropdown "Mais ações" ─────────────────────────────────────────────────
  const [menuAberto, setMenuAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [duplicando, setDuplicando] = useState(false)
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

  async function duplicarOSHandler() {
    if (duplicando || !onDuplicar) return
    setMenuAberto(false)
    setDuplicando(true)
    try {
      const res = await onDuplicar(os)
      if (res?.error) throw res.error
      notify('ok', `OS #${res?.numero} criada como duplicata`)
    } catch (e) {
      notify('erro', `Erro ao duplicar: ${e?.message || 'desconhecido'}`)
    } finally {
      setDuplicando(false)
    }
  }

  async function copiarNumero() {
    setMenuAberto(false)
    try {
      await navigator.clipboard.writeText(String(os.numero))
      notify('ok', `OS #${os.numero} copiada`)
    } catch {
      notify('erro', 'Não consegui copiar')
    }
  }

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

  // ── Modais de edição ──────────────────────────────────────────────────────
  const [modalCliente, setModalCliente] = useState(false)
  const [modalEquipamento, setModalEquipamento] = useState(false)
  function abrirCadastroCliente() {
    if (!os?.cliente_id) { notify('info', 'Esta OS não tem cliente vinculado'); return }
    setModalCliente(true)
  }
  function abrirCadastroEquipamento() { setModalEquipamento(true) }

  // ── Ações de contato ──────────────────────────────────────────────────────
  function abrirWhatsApp(fone) {
    const digits = (fone || '').replace(/\D/g, '')
    if (!digits) return
    const numero = digits.startsWith('55') ? digits : '55' + digits
    window.location.href = `whatsapp://send?phone=${numero}`
  }
  function abrirMapa(endereco) {
    if (!endereco) return
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`,
      '_blank', 'noopener,noreferrer'
    )
  }
  async function copiarFone() {
    if (!os.fone) return
    try { await navigator.clipboard.writeText(os.fone); notify('ok', 'Telefone copiado') }
    catch { notify('erro', 'Não consegui copiar') }
  }
  async function copiarEndereco() {
    if (!os.endereco) return
    try { await navigator.clipboard.writeText(os.endereco); notify('ok', 'Endereço copiado') }
    catch { notify('erro', 'Não consegui copiar') }
  }

  // ── Etapa badge ───────────────────────────────────────────────────────────
  const status       = calcStatusPrazo(os.prazo, os.etapa)
  const dias         = diasPrazo(os.prazo)
  const etapaLabel   = resolverEtapaLabel(os)
  const tone         = badgeTone(os, status)
  const badgeText    = status === 'vencido'
    ? `${etapaLabel} · ${Math.abs(dias)}d atr.`
    : etapaLabel
  const badgeBg = dark ? BADGE_BG_DARK[tone] : BADGE_BG_LIGHT[tone]
  const badgeFg = dark ? BADGE_FG_DARK[tone] : BADGE_FG_LIGHT[tone]

  const historicoCount = (os.historico || []).length
  const equipamentoLabel = [os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento

  return (
    <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.border}` }}>

      {/* ── Linha 1: X · OS# · badge | histórico · ⋯ ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 8px', gap: 8, minHeight: 56,
      }}>
        {/* Esquerda: X + OS# + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              border: 'none', background: 'transparent',
              color: T.textPrimary, width: 40, height: 40, borderRadius: 999,
              cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 22 }} aria-hidden="true" />
          </button>
          <span style={{
            fontFamily: MONO,
            fontSize: 12, fontWeight: 600, color: T.textMuted,
            letterSpacing: '.04em', flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            OS #{os?.numero}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            minHeight: 24, padding: '0 10px', borderRadius: 999,
            background: badgeBg, color: badgeFg,
            fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {badgeText}
          </span>
        </div>

        {/* Direita: histórico + ⋯ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={onShowHistorico}
            title={`Histórico (${historicoCount} ${historicoCount === 1 ? 'evento' : 'eventos'})`}
            aria-label="Ver histórico"
            style={{
              position: 'relative',
              background: dark ? 'rgba(91,155,213,0.18)' : '#E3F2FD',
              color: azul,
              border: 'none', borderRadius: 999,
              width: 40, height: 40,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-history" style={{ fontSize: 18 }} aria-hidden="true" />
            {historicoCount > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -3,
                background: azul, color: '#fff',
                fontSize: 9, fontWeight: 700,
                borderRadius: 99, padding: '1px 4px',
                minWidth: 15, textAlign: 'center', lineHeight: 1.4,
              }}>{historicoCount > 99 ? '99+' : historicoCount}</span>
            )}
          </button>

          <div data-mais-acoes style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuAberto(v => !v)}
              title="Mais ações" aria-label="Mais ações"
              aria-expanded={menuAberto}
              style={{
                border: 'none',
                background: menuAberto ? (dark ? 'rgba(91,155,213,0.18)' : '#E3F2FD') : 'transparent',
                color: menuAberto ? azul : T.textPrimary,
                width: 40, height: 40, borderRadius: 999,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .12s, color .12s',
              }}
            >
              <i className="ti ti-dots-vertical" style={{ fontSize: 20 }} aria-hidden="true" />
            </button>
            {menuAberto && (
              <div role="menu" style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
                background: T.cardAlt || T.card, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: 5, minWidth: 200,
                boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.12)',
              }}>
                <MenuItem T={T} icon="ti-copy" onClick={copiarNumero}>
                  Copiar nº da OS
                </MenuItem>
                {onDuplicar && (
                  <MenuItem T={T} icon="ti-copy-plus" onClick={duplicarOSHandler} disabled={duplicando}>
                    {duplicando ? 'Duplicando…' : 'Duplicar OS'}
                  </MenuItem>
                )}
                {onUpdateOS && (
                  <MenuItem T={T}
                    icon={os.oculta_no_kanban ? 'ti-eye' : 'ti-eye-off'}
                    onClick={async () => {
                      try {
                        await onUpdateOS(os.numero, { oculta_no_kanban: !os.oculta_no_kanban })
                        notify('ok', os.oculta_no_kanban
                          ? `OS #${os.numero} voltou pro Kanban`
                          : `OS #${os.numero} retirada do Kanban (continua em Vendas)`)
                        setMenuAberto(false)
                      } catch (e) { notify('erro', `Erro: ${e?.message || 'desconhecido'}`) }
                    }}>
                    {os.oculta_no_kanban ? 'Voltar pro Kanban' : 'Retirar do Kanban'}
                  </MenuItem>
                )}
                {admin && (
                  <>
                    <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
                    <MenuItem T={T} icon="ti-trash" danger onClick={excluirOS} disabled={excluindo}>
                      {excluindo ? 'Excluindo…' : 'Excluir OS'}
                    </MenuItem>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Linha 2: nome do cliente + fone + WhatsApp ── */}
      <NomeCliente T={T} azul={azul}
        nome={os.cliente}
        fone={os.fone}
        onNomeClick={abrirCadastroCliente}
        onWhats={() => abrirWhatsApp(os.fone)}
        onCopiarFone={copiarFone}
      />

      {/* ── Linha 3: endereço com copy + Maps ── */}
      <LinhaEndereco T={T} azul={azul}
        endereco={os.endereco}
        onMapa={() => abrirMapa(os.endereco)}
        onCopiar={copiarEndereco}
      />

      {/* ── Linha 4: equipamento ── */}
      <LinhaEquipamento T={T} azul={azul}
        equipamento={equipamentoLabel}
        serie={os.serie}
        defeito={os.defeito}
        onClick={abrirCadastroEquipamento}
      />

      {/* ── Linha 5: abas ── */}
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
                flex: 1, padding: '11px 8px',
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
              }}
            >
              <i className={`ti ${a.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
              {a.label}
            </button>
          )
        })}
      </div>

      {/* ── Modais ── */}
      {modalCliente && (
        <FormClienteEdit
          T={T} dark={dark} mobile={mobile}
          os={os}
          onClose={() => setModalCliente(false)}
          onSalvarOk={() => onRefetchOS?.()}
        />
      )}
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

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function NomeCliente({ T, azul, nome, fone, onNomeClick, onWhats, onCopiarFone }) {
  const [hoverNome, setHoverNome] = useState(false)
  const [hoverFone, setHoverFone] = useState(false)
  const vazio = !nome
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px 0', minWidth: 0 }}>
      {/* Nome */}
      <div
        onClick={onNomeClick}
        onMouseEnter={() => setHoverNome(true)}
        onMouseLeave={() => setHoverNome(false)}
        title="Abrir cadastro do cliente"
        style={{
          flex: 1, minWidth: 0,
          fontSize: 17, fontWeight: 700, lineHeight: 1.2,
          color: vazio ? T.textMuted : (hoverNome ? azul : T.textPrimary),
          fontStyle: vazio ? 'italic' : 'normal',
          cursor: 'pointer', transition: 'color .12s',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {nome || 'Cliente não definido'}
      </div>
      {/* Fone + WA */}
      {fone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span
            onClick={onCopiarFone}
            onMouseEnter={() => setHoverFone(true)}
            onMouseLeave={() => setHoverFone(false)}
            title="Copiar número"
            style={{
              fontFamily: MONO, fontSize: 11.5, fontWeight: 600,
              color: hoverFone ? azul : T.textMuted,
              cursor: 'pointer', transition: 'color .12s',
              userSelect: 'none',
            }}
          >
            {fone}
          </span>
          <span
            onClick={onWhats}
            title="Abrir conversa no WhatsApp"
            style={{ cursor: 'pointer', lineHeight: 0, display: 'inline-flex' }}
          >
            <i className="ti ti-brand-whatsapp" style={{ fontSize: 16, color: '#25D366' }} aria-hidden="true" />
          </span>
        </div>
      )}
    </div>
  )
}

function LinhaEndereco({ T, azul, endereco, onMapa, onCopiar }) {
  const [hoverEnd, setHoverEnd] = useState(false)
  const [hoverMapa, setHoverMapa] = useState(false)
  const endResumido = endereco ? endereco.split('—')[0].trim() : null
  if (!endResumido) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '3px 16px 0', gap: 5, minWidth: 0,
    }}>
      <i className="ti ti-map-pin"
        style={{ fontSize: 12, flexShrink: 0, color: T.textDim }}
        aria-hidden="true" />
      <span
        onClick={onCopiar}
        onMouseEnter={() => setHoverEnd(true)}
        onMouseLeave={() => setHoverEnd(false)}
        title="Copiar endereço"
        style={{
          flex: 1, minWidth: 0,
          fontSize: 12, color: hoverEnd ? azul : T.textMuted,
          cursor: 'pointer', transition: 'color .12s',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {endResumido}
      </span>
      <span
        onClick={onMapa}
        onMouseEnter={() => setHoverMapa(true)}
        onMouseLeave={() => setHoverMapa(false)}
        title="Abrir no Google Maps"
        style={{ cursor: 'pointer', lineHeight: 0, display: 'inline-flex', flexShrink: 0 }}
      >
        <i className="ti ti-map-2"
          style={{ fontSize: 14, color: hoverMapa ? azul : T.textDim, transition: 'color .12s' }}
          aria-hidden="true" />
      </span>
    </div>
  )
}

function LinhaEquipamento({ T, azul, equipamento, serie, defeito, onClick }) {
  const [hover, setHover] = useState(false)
  const vazio = !equipamento
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      padding: '3px 16px 12px',
      fontSize: 12, color: T.textSecondary,
    }}>
      <i className="ti ti-device-washing-machine"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title="Abrir cadastro do equipamento"
        style={{ fontSize: 13, color: azul, flexShrink: 0, cursor: 'pointer' }}
        aria-hidden="true" />
      {vazio ? (
        <span
          onClick={onClick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title="Abrir cadastro do equipamento"
          style={{ color: hover ? azul : T.textMuted, fontStyle: 'italic', cursor: 'pointer', transition: 'color .12s' }}
        >
          Equipamento não preenchido — clique pra adicionar
        </span>
      ) : (
        <strong
          onClick={onClick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title="Abrir cadastro do equipamento"
          style={{ color: hover ? azul : T.textPrimary, fontWeight: 700, cursor: 'pointer', transition: 'color .12s' }}
        >
          {equipamento}
        </strong>
      )}
      {!vazio && serie && (
        <span style={{
          color: T.textMuted, fontSize: 10.5,
          fontFamily: MONO,
        }}>S/N {serie}</span>
      )}
      {!vazio && defeito && (
        <>
          <span style={{ color: '#4a4a50', opacity: 0.7 }} aria-hidden="true">·</span>
          <span style={{ color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '0 1 auto' }}>
            {defeito}
          </span>
        </>
      )}
    </div>
  )
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
