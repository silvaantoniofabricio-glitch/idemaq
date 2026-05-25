// idemaq-src/components/layout/BottomNav.jsx
//
// Bottom Navigation (21/05/2026 — refator pra acomodar TODAS as páginas).
// - 4 botões fixos + 1 botão "Mais" (5º slot) que abre bottom sheet com EXTRAS
// - Sair vive dentro do "Mais" pra liberar slot pra navegação real
// - Touch target 56px+
// - Active state com pill background azul/light
//
// Antes: 5 slots fixos, 4 páginas do dono ficavam escondidas (Clientes,
// Logística, Relatórios, Configurações). Agora todas são acessíveis.

import React, { useState, useEffect } from 'react'
import { P } from '../../theme'
import {
  MENUS,
  MENUS_MOBILE_DONO, MENUS_MOBILE_DONO_EXTRA,
  MENUS_MOBILE_FUNC, MENUS_MOBILE_FUNC_EXTRA,
} from '../../utils/osData'
import { isAdmin } from '../../utils/osHelpers'
import { corHero } from '../../utils/colors'

export default function BottomNav({ pagina, setPagina, sair, user, T, dark, toggleTheme }) {
  const admin = isAdmin(user)
  const idsFixos  = admin ? MENUS_MOBILE_DONO       : MENUS_MOBILE_FUNC
  const idsExtras = admin ? MENUS_MOBILE_DONO_EXTRA : MENUS_MOBILE_FUNC_EXTRA

  const itemsFixos  = idsFixos.map(id => MENUS.find(m => m.id === id)).filter(Boolean)
  const itemsExtras = idsExtras.map(id => MENUS.find(m => m.id === id)).filter(Boolean)

  const activeClr = dark ? P.blue : P.blueDark
  const activeBg  = dark ? '#1a3a5c' : '#e6f1fb'

  const [maisAberto, setMaisAberto] = useState(false)
  // Quando o user navega via Mais, fecha o sheet
  function navegar(id) {
    setPagina(id)
    setMaisAberto(false)
  }
  // Se "Mais" contém a página ativa, o botão Mais fica destacado
  const paginaAtivaNoMais = itemsExtras.some(m => m.id === pagina)

  return (
    <>
      <nav style={{
        background: dark ? 'rgba(22,22,26,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        display: 'flex',
        zIndex: 100,
        height: 52,
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: dark ? '0 -2px 16px rgba(0,0,0,0.35)' : '0 -1px 12px rgba(0,0,0,0.06)',
      }}>
        {itemsFixos.map(m => {
          const ativo = pagina === m.id
          return (
            <BotaoNav key={m.id}
              m={m} ativo={ativo}
              T={T} activeClr={activeClr} activeBg={activeBg}
              onClick={() => setPagina(m.id)}
            />
          )
        })}
        <BotaoNav
          m={{ id: 'mais', label: 'Mais', icon: 'ti-dots' }}
          ativo={maisAberto || paginaAtivaNoMais}
          T={T} activeClr={activeClr} activeBg={activeBg}
          onClick={() => setMaisAberto(true)}
        />
      </nav>

      {maisAberto && (
        <MaisSheet
          T={T} dark={dark}
          itensExtras={itemsExtras}
          paginaAtiva={pagina}
          onNavegar={navegar}
          onSair={() => { setMaisAberto(false); sair() }}
          onClose={() => setMaisAberto(false)}
          onToggleTheme={toggleTheme}
        />
      )}
    </>
  )
}

function BotaoNav({ m, ativo, T, activeClr, activeBg, onClick }) {
  return (
    <button onClick={onClick}
      aria-label={m.label}
      style={{
        flex: 1, position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 1, padding: '4px 2px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: ativo ? activeClr : T.textMuted,
        fontFamily: 'inherit',
        transition: 'color .15s',
      }}>
      {ativo && (
        <div style={{
          position: 'absolute', top: 5,
          width: 38, height: 24, borderRadius: 12,
          background: activeBg,
          zIndex: 0,
        }} />
      )}
      <i className={`ti ${m.icon}`}
         style={{
           fontSize: 18, position: 'relative', zIndex: 1,
           transition: 'transform .15s',
           transform: ativo ? 'translateY(-1px) scale(1.08)' : 'none',
         }} aria-hidden="true" />
      <span style={{
        fontSize: 9.5, fontWeight: ativo ? 700 : 500,
        position: 'relative', zIndex: 1,
        letterSpacing: '0.01em',
      }}>{m.label}</span>
    </button>
  )
}

// ─── Bottom sheet "Mais" ───────────────────────────────────────────────────
function MaisSheet({ T, dark, itensExtras, paginaAtiva, onNavegar, onSair, onClose, onToggleTheme }) {
  const azul = dark ? P.blue : P.blueDark
  const vermelho = dark ? P.red : P.redDark

  // Animação enter/exit
  const [montado, setMontado] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setMontado(true))
    function onEsc(e) { if (e.key === 'Escape') fechar() }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function fechar() {
    setMontado(false)
    setTimeout(onClose, 180)
  }

  return (
    <div
      onClick={fechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        opacity: montado ? 1 : 0,
        transition: 'opacity .18s ease-out',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: T.card,
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
          transform: montado ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .24s cubic-bezier(.2,.8,.2,1)',
        }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border }} />
        </div>

        {/* Header */}
        <div style={{
          padding: '6px 16px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: corHero(dark) }}>
            Mais opções
          </div>
          <button onClick={fechar} aria-label="Fechar"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: T.cardAlt, border: `1px solid ${T.border}`,
              color: T.textPrimary, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="ti ti-x" style={{ fontSize: 18 }} aria-hidden="true" />
          </button>
        </div>

        {/* Grid de páginas */}
        <div style={{
          padding: '4px 12px 12px',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        }}>
          {itensExtras.map(m => {
            const ativo = paginaAtiva === m.id
            return (
              <button key={m.id} onClick={() => onNavegar(m.id)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '14px 8px', minHeight: 84,
                  borderRadius: 14,
                  background: ativo ? `${azul}18` : T.cardAlt,
                  border: `1px solid ${ativo ? azul : T.border}`,
                  color: ativo ? azul : T.textPrimary,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <i className={`ti ${m.icon}`} style={{ fontSize: 24 }} aria-hidden="true" />
                <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.15 }}>
                  {m.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tema + Sair — separado abaixo */}
        <div style={{
          borderTop: `1px solid ${T.border}`,
          padding: '12px 12px 4px',
          display: 'flex', gap: 8,
        }}>
          {onToggleTheme && (
            <button onClick={onToggleTheme}
              aria-label={dark ? 'Modo claro' : 'Modo escuro'}
              title={dark ? 'Modo claro' : 'Modo escuro'}
              style={{
                flex: '0 0 48px', padding: '12px',
                borderRadius: 12, minHeight: 48,
                background: 'transparent',
                border: `1px solid ${T.border}`,
                color: T.textPrimary,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 18 }} aria-hidden="true" />
            </button>
          )}
          <button onClick={onSair}
            style={{
              flex: 1, padding: '12px 16px',
              borderRadius: 12, minHeight: 48,
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: vermelho, fontWeight: 600, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <i className="ti ti-logout" style={{ fontSize: 18 }} aria-hidden="true" />
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
