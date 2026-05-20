// idemaq-src/components/layout/Sidebar.jsx
// Sidebar desktop com 2 modos:
//   - LIVRE: slot 56px (fina). Hover expande a interna pra 210px em OVERLAY (não empurra).
//   - FIXA:  slot 210px (cheia). A interna ocupa o slot — EMPURRA o conteúdo.
// Botão de pino alterna entre os modos (persistido em localStorage).
// User-block hospeda tema + sair (Topbar foi removido).

import React, { useMemo, useState, useEffect } from 'react'
import { P } from '../../theme'
import { MENUS } from '../../utils/osData'
import { isAdmin } from '../../utils/osHelpers'
import NavItem from './NavItem'

const MENUS_ADMIN_ONLY = ['financeiro', 'relatorios', 'configuracoes']
const PIN_KEY = 'idemaq.sidebar.pinned'
const SLOT_W = 56
const FULL_W = 210

export default function Sidebar({ pagina, setPagina, user, sair, T, dark, toggleTheme }) {
  const initials = user?.email?.substring(0, 2).toUpperCase() || 'US'

  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem(PIN_KEY) === '1' } catch { return false }
  })
  const [hovered, setHovered] = useState(false)
  const expanded = pinned || hovered

  useEffect(() => {
    try { localStorage.setItem(PIN_KEY, pinned ? '1' : '0') } catch { /* noop */ }
  }, [pinned])

  const menusVisiveis = useMemo(() => {
    if (isAdmin(user)) return MENUS
    return MENUS.filter(m => !MENUS_ADMIN_ONLY.includes(m.id))
  }, [user])

  const userBlockBtn = {
    width: 28, height: 28, borderRadius: 6,
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }

  // Slot empurra conteúdo quando fixo (210px); fica fino (56px) quando livre.
  const slotW = pinned ? FULL_W : SLOT_W
  // Interna ocupa todo o slot quando fixa; faz overlay até 210px quando livre+hover.
  const innerW = expanded ? FULL_W : SLOT_W
  // Sombra/overlay só quando livre+hover (não fixo).
  const showOverlayShadow = hovered && !pinned

  return (
    <div style={{
      width: slotW, minWidth: slotW, flexShrink: 0,
      position: 'relative', zIndex: 20,
      transition: 'width .15s ease',
    }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: innerW,
          background: T.sbBg,
          display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${T.border}`,
          transition: 'width .15s ease',
          overflow: 'hidden',
          boxShadow: showOverlayShadow ? (dark ? '0 8px 24px rgba(0,0,0,.4)' : '0 8px 24px rgba(0,0,0,.12)') : 'none',
        }}
      >
        {/* Header / logo */}
        <div style={{
          height: 56, padding: '0 12px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center',
          justifyContent: expanded ? 'space-between' : 'center',
          flexShrink: 0, gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
            <div style={{
              width: 28, height: 28,
              background: `linear-gradient(135deg,${P.blue},#3a7bbf)`,
              borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="ti ti-tool" style={{ fontSize: 14, color: '#fff' }} aria-hidden="true" />
            </div>
            {expanded && (
              <div>
                <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 15, letterSpacing: '-.3px', whiteSpace: 'nowrap' }}>Idemaq</div>
                <div style={{ color: T.textDim, fontSize: 9, letterSpacing: '.5px', textTransform: 'uppercase' }}>Gestão</div>
              </div>
            )}
          </div>
          {expanded && (
            <button onClick={() => setPinned(p => !p)}
              title={pinned ? 'Soltar menu (volta a recolher no hover)' : 'Fixar menu aberto'}
              style={{
                background: 'transparent', border: 'none',
                color: pinned ? (dark ? P.blue : P.blueDark) : T.textMuted,
                cursor: 'pointer', fontSize: 14, padding: 4, flexShrink: 0, lineHeight: 1,
                borderRadius: 5,
              }}
              aria-label={pinned ? 'Soltar menu' : 'Fixar menu'}>
              <i className={`ti ${pinned ? 'ti-pinned' : 'ti-pin'}`} style={{ fontSize: 15 }} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: '6px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {expanded && (
            <div style={{
              padding: '10px 14px 4px', fontSize: 10, color: T.textDim,
              textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600,
            }}>Principal</div>
          )}
          <div style={{ padding: '0 6px' }}>
            {menusVisiveis.filter(m => m.section === 'principal').map(m =>
              <NavItem key={m.id} m={m} active={pagina === m.id} onClick={() => setPagina(m.id)} collapsed={!expanded} T={T} dark={dark} />
            )}
          </div>
          <div style={{ padding: '0 6px' }}>
            {menusVisiveis.filter(m => m.section === 'operacao').map(m =>
              <NavItem key={m.id} m={m} active={pagina === m.id} onClick={() => setPagina(m.id)} collapsed={!expanded} T={T} dark={dark} />
            )}
          </div>
        </div>

        {/* User block — avatar + (tema | sair). Layout horizontal expandido, vertical colapsado. */}
        <div style={{
          padding: expanded ? '10px 12px' : '8px 6px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: expanded ? 'row' : 'column',
          alignItems: 'center',
          gap: expanded ? 9 : 6,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: `linear-gradient(135deg,${P.blue},#3a7bbf)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>{initials}</div>
          {expanded && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12, color: T.textSecondary, fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{user?.email || 'Usuário'}</div>
              <div style={{ fontSize: 10, color: T.textMuted }}>{isAdmin(user) ? 'Administrador' : 'Funcionário'}</div>
            </div>
          )}
          <button onClick={toggleTheme} title={dark ? 'Modo claro' : 'Modo escuro'} aria-label="Alternar tema"
            style={userBlockBtn}>
            <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 14, color: dark ? P.yellow : T.textMuted }} aria-hidden="true" />
          </button>
          <button onClick={sair} title="Sair" aria-label="Sair" style={userBlockBtn}>
            <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
