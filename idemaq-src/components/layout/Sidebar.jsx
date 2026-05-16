// idemaq-src/components/layout/Sidebar.jsx
// Sidebar desktop com 2 seções (Principal / Operação), botão de collapse e user block embaixo.

import React from 'react'
import { P } from '../../theme'
import { MENUS } from '../../utils/osData'
import NavItem from './NavItem'

export default function Sidebar({ pagina, setPagina, user, sair, collapsed, setCollapsed, T, dark }) {
  const initials = user?.email?.substring(0, 2).toUpperCase() || 'US'
  const w = collapsed ? 56 : 210
  return (
    <div style={{
      width: w, minWidth: w,
      background: T.sbBg,
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
      borderRight: `1px solid ${T.border}`,
      transition: 'width .2s ease',
      overflow: 'hidden',
    }}>
      {/* Header / logo */}
      <div style={{
        height: 56, padding: '0 12px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        flexShrink: 0, gap: 8,
      }}>
        {!collapsed && (
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
            <div>
              <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 15, letterSpacing: '-.3px', whiteSpace: 'nowrap' }}>Idemaq</div>
              <div style={{ color: T.textDim, fontSize: 9, letterSpacing: '.5px', textTransform: 'uppercase' }}>Gestão</div>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'transparent', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 18, padding: 4, flexShrink: 0, lineHeight: 1 }}
          aria-label="Recolher menu">☰</button>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '6px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && (
          <div style={{
            padding: '10px 14px 4px', fontSize: 10, color: T.textDim,
            textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600,
          }}>Principal</div>
        )}
        <div style={{ padding: '0 6px' }}>
          {MENUS.filter(m => m.section === 'principal').map(m =>
            <NavItem key={m.id} m={m} active={pagina === m.id} onClick={() => setPagina(m.id)} collapsed={collapsed} T={T} dark={dark} />
          )}
        </div>
        {!collapsed && (
          <div style={{
            padding: '10px 14px 4px', fontSize: 10, color: T.textDim,
            textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600,
          }}>Operação</div>
        )}
        <div style={{ padding: '0 6px' }}>
          {MENUS.filter(m => m.section === 'operacao').map(m =>
            <NavItem key={m.id} m={m} active={pagina === m.id} onClick={() => setPagina(m.id)} collapsed={collapsed} T={T} dark={dark} />
          )}
        </div>
      </div>

      {/* User block */}
      <div style={{
        padding: collapsed ? '10px 6px' : '12px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `linear-gradient(135deg,${P.blue},#3a7bbf)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>{initials}</div>
        {!collapsed && (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12, color: T.textSecondary, fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{user?.email || 'Usuário'}</div>
              <div style={{ fontSize: 10, color: T.textMuted }}>Administrador</div>
            </div>
            <button onClick={sair}
              style={{ background: 'transparent', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 4, borderRadius: 5, flexShrink: 0 }}
              aria-label="Sair">
              <i className="ti ti-logout" style={{ fontSize: 15 }} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
