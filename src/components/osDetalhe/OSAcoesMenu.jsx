// src/components/osDetalhe/OSAcoesMenu.jsx
// Menu "⋮ Mais ações" de uma OS — extraído do Header.jsx pra ser o MESMO menu
// tanto no header do OSDetalhe quanto no card do Kanban (⋮ no hover do card).
//
// Sempre via portal + position:fixed calculada a partir do próprio botão —
// funciona tanto ancorado no Header (sem transform) quanto no KanbanCard
// (que tem transform no hover, o que quebraria position:absolute normal).

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { P } from '../../theme'
import { useToast } from '../ui'
import { useUsuarios } from '../../hooks/useUsuarios'
import { enviarOSParaRoteiro } from '../../utils/roteiroEnvio'
import MandarRoteiroDialog from '../roteiro/MandarRoteiroDialog'
import RelatorioPontuacaoModal from './RelatorioPontuacaoModal'
import CustoMargemModal from './CustoMargemModal'

const MENU_W = 210

export default function OSAcoesMenu({
  T, dark, mobile, os, admin,
  onUpdateOS, onExcluir, onDuplicar,
  variant = 'header', // 'header' (botão 40px, dropdown inline) | 'card' (botão 22px, sempre portal)
  onOpenChange,
  onClose,
}) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  const notify = useToast()
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  // Em "A receber" o mesmo campo (data_agendamento) vira data de cobrança,
  // não de entrega — só muda o rótulo/ícone do menu.
  const ehPagamento = os?.etapa === 'pagamento'

  const [menuAberto, setMenuAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [duplicando, setDuplicando] = useState(false)
  const [prazoModo, setPrazoModo]     = useState(false)
  const [prazoVal, setPrazoVal]       = useState('')
  const [entregaModo, setEntregaModo] = useState(false)
  const [entregaData, setEntregaData] = useState('')
  const [entregaHora, setEntregaHora] = useState('')

  const { usuarios, apelidoDe } = useUsuarios()
  const funcionarios = usuarios.filter(u => u.papel !== 'dono')
  const [roteiroModo, setRoteiroModo] = useState(false)
  const [roteiroDia, setRoteiroDia]   = useState('hoje')
  const [roteiroPrioridade, setRoteiroPrioridade] = useState(false)
  const [enviandoRot, setEnviandoRot] = useState(false)
  const [roteiroDialog, setRoteiroDialog] = useState(null)

  const [modalPontuacao, setModalPontuacao] = useState(false)
  const [modalCustoMargem, setModalCustoMargem] = useState(false)

  function fecharMenu() { setMenuAberto(false); onOpenChange?.(false) }

  function abrirMenu() {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)) })
    setMenuAberto(true)
    onOpenChange?.(true)
  }

  // Depois de medir a altura real do menu, reabre pra cima se estourar a tela.
  useLayoutEffect(() => {
    if (!menuAberto || !menuRef.current || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const h = menuRef.current.getBoundingClientRect().height
    if (r.bottom + 4 + h > window.innerHeight - 8) {
      setPos(p => p ? { ...p, top: Math.max(8, r.top - h - 4) } : p)
    }
  }, [menuAberto, roteiroModo, entregaModo, prazoModo])

  useEffect(() => {
    if (!menuAberto) return
    function onDocClick(e) {
      if (!e.target.closest('[data-os-acoes-menu]')) fecharMenu()
    }
    function onEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); fecharMenu() } }
    function onScroll() { fecharMenu() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc, true)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc, true)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuAberto])
  useEffect(() => { if (!menuAberto) { setPrazoModo(false); setRoteiroModo(false); setEntregaModo(false) } }, [menuAberto])

  async function enviarRoteiro(responsavelId, texto) {
    if (enviandoRot) return
    setEnviandoRot(true)
    try {
      const dia = roteiroDia === 'amanha'
        ? (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d })()
        : undefined
      const diaIso = dia
        ? dia.toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')
        : undefined
      const r = await enviarOSParaRoteiro({ os, responsavelId, dia: diaIso, texto, apelidoDe, urgente: roteiroPrioridade })
      const quando = roteiroDia === 'amanha' ? 'amanhã' : 'hoje'
      if (r.error) { notify('erro', `Erro: ${r.error.message || 'desconhecido'}`) }
      else if (r.jaExiste) { notify('erro', `OS #${os.numero} já está no roteiro de ${r.responsavelNome || 'alguém'} (${quando})`) }
      else { notify('ok', `OS #${os.numero} → roteiro de ${apelidoDe(responsavelId)} · ${quando}${roteiroPrioridade ? ' · prioridade' : ''}`) }
      setRoteiroModo(false)
      fecharMenu()
      setRoteiroPrioridade(false)
    } finally {
      setEnviandoRot(false)
    }
  }

  function prazoParaInput(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d)) return ''
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
  }
  function abrirPrazo() {
    setPrazoVal(prazoParaInput(os.prazo))
    setPrazoModo(true)
  }
  async function salvarPrazo() {
    const novo = prazoVal ? `${prazoVal}T12:00:00.000Z` : null
    try {
      await onUpdateOS?.(os.numero, { prazo: novo })
      notify('ok', novo ? 'Prazo definido' : 'Prazo removido')
      setPrazoModo(false)
      fecharMenu()
    } catch (e) { notify('erro', `Erro: ${e?.message || 'desconhecido'}`) }
  }

  function abrirEntrega() {
    const iso = os?.data_agendamento
    setEntregaData(iso ? iso.slice(0, 10) : '')
    setEntregaHora(iso ? iso.slice(11, 16) : '')
    setEntregaModo(true)
  }
  async function salvarEntrega() {
    if (!entregaData) { notify('erro', 'Selecione uma data'); return }
    const hora = entregaHora || '08:00'
    const iso = `${entregaData}T${hora}:00.000Z`
    try {
      await onUpdateOS?.(os.numero, { data_agendamento: iso })
      notify('ok', ehPagamento ? 'Cobrança agendada' : 'Entrega agendada')
      setEntregaModo(false)
      fecharMenu()
    } catch (e) { notify('erro', `Erro: ${e?.message || 'desconhecido'}`) }
  }
  async function limparEntrega() {
    try {
      await onUpdateOS?.(os.numero, { data_agendamento: null })
      notify('ok', 'Agendamento removido')
      setEntregaModo(false)
      fecharMenu()
    } catch (e) { notify('erro', `Erro: ${e?.message || 'desconhecido'}`) }
  }

  async function duplicarOSHandler() {
    if (duplicando || !onDuplicar) return
    fecharMenu()
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
    fecharMenu()
    try {
      await navigator.clipboard.writeText(String(os.numero))
      notify('ok', `OS #${os.numero} copiada`)
    } catch {
      notify('erro', 'Não consegui copiar')
    }
  }

  async function excluirOS() {
    if (excluindo) return
    fecharMenu()
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

  const btnStyle = variant === 'card'
    ? {
        width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
        border: `1px solid ${T.border}`, background: T.card, color: azul,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }
    : {
        border: 'none',
        background: menuAberto ? (dark ? 'rgba(91,155,213,0.18)' : '#E3F2FD') : 'transparent',
        color: menuAberto ? azul : T.textPrimary,
        width: 40, height: 40, borderRadius: 999,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .12s, color .12s',
      }

  return (
    <div data-os-acoes-menu style={{ position: variant === 'card' ? 'absolute' : 'relative', top: variant === 'card' ? 4 : undefined, right: variant === 'card' ? 4 : undefined }}
      onMouseDown={variant === 'card' ? e => e.stopPropagation() : undefined}
      onClick={variant === 'card' ? e => e.stopPropagation() : undefined}>
      <button
        ref={btnRef}
        onClick={() => (menuAberto ? fecharMenu() : abrirMenu())}
        title="Mais ações" aria-label="Mais ações" aria-expanded={menuAberto}
        style={btnStyle}
      >
        <i className="ti ti-dots-vertical" style={{ fontSize: variant === 'card' ? 14 : 20 }} aria-hidden="true" />
      </button>

      {menuAberto && pos && createPortal(
        <div data-os-acoes-menu ref={menuRef} role="menu" style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 4000,
          background: T.cardAlt || T.card, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: 5, width: MENU_W,
          boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          {roteiroModo ? (
            <div style={{ padding: 6 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: T.textMuted,
                textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 2px 8px',
              }}>Mandar pro roteiro de</div>
              {funcionarios.length === 0 && (
                <div style={{ padding: '4px 2px 8px', fontSize: 12, color: T.textMuted }}>Nenhum funcionário cadastrado.</div>
              )}
              {funcionarios.map(f => (
                <button key={f.id} onClick={() => { setRoteiroDialog({ funcionario: f }); setRoteiroModo(false); fecharMenu() }} disabled={enviandoRot}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 10px', marginBottom: 5, borderRadius: 7,
                    border: `1px solid ${T.border}`, background: 'transparent',
                    color: T.textPrimary, fontSize: 13, fontWeight: 600,
                    cursor: enviandoRot ? 'default' : 'pointer', fontFamily: 'inherit',
                    opacity: enviandoRot ? 0.6 : 1,
                  }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: (f.cor || azul) + '33', color: f.cor || azul,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>{(f.nome || '?').slice(0, 2).toUpperCase()}</span>
                  {f.nome}
                </button>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                {[['hoje', 'Hoje'], ['amanha', 'Amanhã']].map(([v, lbl]) => (
                  <button key={v} onClick={() => setRoteiroDia(v)}
                    style={{
                      flex: 1, padding: '7px 8px', borderRadius: 7,
                      border: `1px solid ${roteiroDia === v ? azul : T.border}`,
                      background: roteiroDia === v ? (dark ? 'rgba(91,155,213,0.16)' : '#eef5fc') : 'transparent',
                      color: roteiroDia === v ? azul : T.textMuted,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{lbl}</button>
                ))}
              </div>
              <button onClick={() => setRoteiroPrioridade(v => !v)}
                style={{
                  width: '100%', marginTop: 6, padding: '7px 8px', borderRadius: 7,
                  border: `1px solid ${roteiroPrioridade ? '#FF6B6B' : T.border}`,
                  background: roteiroPrioridade ? (dark ? 'rgba(255,107,107,0.14)' : '#fdecec') : 'transparent',
                  color: roteiroPrioridade ? '#FF6B6B' : T.textMuted,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <i className="ti ti-flag-3" style={{ fontSize: 13 }} aria-hidden="true" />
                Prioridade
              </button>
              <button onClick={() => setRoteiroModo(false)}
                style={{
                  width: '100%', marginTop: 8, padding: '7px 10px', borderRadius: 7,
                  border: `1px solid ${T.border}`, background: 'transparent',
                  color: T.textMuted, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Voltar</button>
            </div>
          ) : entregaModo ? (
            <div style={{ padding: 6 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: T.textMuted,
                textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 2px 6px',
              }}>{ehPagamento ? 'Agendar cobrança' : 'Agendar entrega'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="date"
                  value={entregaData}
                  autoFocus
                  onChange={e => setEntregaData(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 10px', borderRadius: 7,
                    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                    fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit',
                    colorScheme: dark ? 'dark' : 'light',
                  }}
                />
                <input
                  type="time"
                  value={entregaHora}
                  onChange={e => setEntregaHora(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 10px', borderRadius: 7,
                    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                    fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit',
                    colorScheme: dark ? 'dark' : 'light',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={salvarEntrega}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none',
                    background: azul, color: '#fff', fontSize: 12.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Salvar</button>
                {os.data_agendamento && (
                  <button onClick={limparEntrega}
                    style={{
                      padding: '8px 10px', borderRadius: 7,
                      border: `1px solid ${T.border}`, background: 'transparent',
                      color: cor(P.red, P.redDark), fontSize: 12.5, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>Limpar</button>
                )}
                <button onClick={() => setEntregaModo(false)}
                  style={{
                    padding: '8px 10px', borderRadius: 7,
                    border: `1px solid ${T.border}`, background: 'transparent',
                    color: T.textMuted, fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Voltar</button>
              </div>
            </div>
          ) : prazoModo ? (
            <div style={{ padding: 6 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: T.textMuted,
                textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 2px 6px',
              }}>Prazo da OS</div>
              <input
                type="date"
                value={prazoVal}
                autoFocus
                onChange={e => setPrazoVal(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 10px', borderRadius: 7,
                  border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                  fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'inherit',
                  colorScheme: dark ? 'dark' : 'light',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={salvarPrazo}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none',
                    background: azul, color: '#fff', fontSize: 12.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Salvar</button>
                {os.prazo && (
                  <button onClick={() => { setPrazoVal('') }}
                    title="Limpar prazo"
                    style={{
                      padding: '8px 10px', borderRadius: 7,
                      border: `1px solid ${T.border}`, background: 'transparent',
                      color: cor(P.red, P.redDark), fontSize: 12.5, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>Limpar</button>
                )}
                <button onClick={() => setPrazoModo(false)}
                  style={{
                    padding: '8px 10px', borderRadius: 7,
                    border: `1px solid ${T.border}`, background: 'transparent',
                    color: T.textMuted, fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Voltar</button>
              </div>
            </div>
          ) : (
            <>
              <MenuItem T={T} icon="ti-copy" onClick={copiarNumero}>
                Copiar nº da OS
              </MenuItem>
              {admin && (
                <MenuItem T={T} icon="ti-trophy" onClick={() => { setModalPontuacao(true); fecharMenu() }}>
                  Relatório de Pontuação
                </MenuItem>
              )}
              {admin && (
                <MenuItem T={T} icon="ti-report-money" onClick={() => { setModalCustoMargem(true); fecharMenu() }}>
                  Custo e margem das peças
                </MenuItem>
              )}
              {admin && funcionarios.length > 0 && (
                <MenuItem T={T} icon="ti-checklist" onClick={() => setRoteiroModo(true)}>
                  Mandar pro roteiro
                </MenuItem>
              )}
              {onUpdateOS && (
                <MenuItem T={T} icon="ti-calendar-clock" onClick={abrirPrazo}>
                  {os.prazo ? 'Alterar prazo' : 'Definir prazo'}
                </MenuItem>
              )}
              {onUpdateOS && (
                <MenuItem T={T} icon={ehPagamento ? 'ti-calendar-dollar' : 'ti-truck-delivery'} onClick={abrirEntrega}>
                  {os.data_agendamento
                    ? (ehPagamento ? 'Reagendar cobrança' : 'Reagendar entrega')
                    : (ehPagamento ? 'Agendar cobrança' : 'Agendar entrega')}
                </MenuItem>
              )}
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
                      fecharMenu()
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
            </>
          )}
        </div>,
        document.body
      )}

      {modalPontuacao && (
        <RelatorioPontuacaoModal T={T} dark={dark} mobile={mobile} os={os} onClose={() => setModalPontuacao(false)} />
      )}
      {modalCustoMargem && (
        <CustoMargemModal T={T} dark={dark} mobile={mobile} os={os} onClose={() => setModalCustoMargem(false)} />
      )}
      {roteiroDialog && (
        <MandarRoteiroDialog
          T={T} dark={dark} os={os}
          funcionario={roteiroDialog.funcionario} diaKey={roteiroDia}
          onConfirm={(texto) => { enviarRoteiro(roteiroDialog.funcionario.id, texto); setRoteiroDialog(null) }}
          onClose={() => setRoteiroDialog(null)}
        />
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
