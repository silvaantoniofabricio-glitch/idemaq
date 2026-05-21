// idemaq-src/components/layout/BottomNav.jsx
import React from 'react'
import { P } from '../../theme'
import { MENUS, MENUS_MOBILE } from '../../utils/osData'
import { isAdmin } from '../../utils/osHelpers'

// Itens visíveis só pro dono (mesma lista da Sidebar)
const MENUS_ADMIN_ONLY = ['financeiro', 'relatorios', 'configuracoes', 'vendas']

export default function BottomNav({ pagina, setPagina, sair, user, T, dark }) {
  const idsPermitidos = isAdmin(user)
    ? MENUS_MOBILE
    : MENUS_MOBILE.filter(id => !MENUS_ADMIN_ONLY.includes(id))
  const items = MENUS.filter(m => idsPermitidos.includes(m.id))
  const activeClr = dark ? P.blue : P.blueDark
  return (
    <div style={{
      background: T.card, borderTop: `1px solid ${T.border}`,
      display: 'flex', zIndex: 100, height: 60,
      flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {items.map(m => (
        <button key={m.id} onClick={() => setPagina(m.id)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: pagina === m.id ? activeClr : T.textMuted, position: 'relative',
          }}>
          <i className={`ti ${m.icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
          <span style={{ fontSize: 9, fontWeight: 600 }}>{m.label}</span>
          {m.badge && (
            <span style={{
              position: 'absolute', top: 6, right: 'calc(50% - 14px)',
              background: P.red, color: '#fff', fontSize: 8, fontWeight: 700,
              borderRadius: 10, padding: '1px 4px', minWidth: 14, textAlign: 'center',
            }}>{m.badge}</span>
          )}
        </button>
      ))}
      <button onClick={sair}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.textMuted,
        }}>
        <i className="ti ti-logout" style={{ fontSize: 20 }} aria-hidden="true" />
        <span style={{ fontSize: 9, fontWeight: 600 }}>Sair</span>
      </button>
    </div>
  )
}
