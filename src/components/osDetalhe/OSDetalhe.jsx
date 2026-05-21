// src/components/osDetalhe/OSDetalhe.jsx
// Modal centralizado de detalhe da OS (substitui o OSDrawer lateral no desktop).
// Largura 780px no desktop, full-screen bottom-sheet no mobile.
//
// Estrutura:
//   ┌──────────────────────────────────────────┐
//   │ Header (badges, OS#, cliente, timeline,  │
//   │         3 abas, ícone histórico)         │
//   ├──────────────────────────────────────────┤
//   │ Conteúdo scrollável da aba ativa         │
//   ├──────────────────────────────────────────┤
//   │ Footer (Voltar / Avançar etapa)          │
//   └──────────────────────────────────────────┘
//
// PR1: shell completo + abas como placeholders. PR2/PR3 preenchem conteúdo.

import React, { useState, useEffect, useRef } from 'react'
import { isAdmin } from '../../utils/osHelpers'
import Header from './Header'
import Footer from './Footer'
import HistoricoPanel from './HistoricoPanel'
import RelatorioTab from './tabs/RelatorioTab'
import PagamentoTab from './tabs/PagamentoTab'
import EtapaTab from './tabs/EtapaTab'

// Ordem das abas pra navegação por swipe horizontal (mobile).
// Bate com `ABAS` em Header.jsx — manter sincronizado.
const ABAS_ORDEM = ['etapa', 'relatorio', 'pagamento']

// Threshold em pixels: distância mínima horizontal pra considerar swipe.
// Se o usuário arrastar menos que isso, OU se o movimento for predominante
// vertical (= scroll normal), nada acontece.
const SWIPE_THRESHOLD = 60

// Aba inicial conforme a etapa atual da OS.
// Etapa é a aba default — é onde a ação acontece pra etapa corrente.
// Pagamento aparece como default só na etapa de Pagamento (onde a ação É receber).
// Concluído/Recusado abrem em Relatório (não tem ação, só contexto).
function abaInicial(etapa) {
  if (etapa === 'pagamento') return 'pagamento'
  if (etapa === 'concluido' || etapa === 'recusado') return 'relatorio'
  return 'etapa'
}

export default function OSDetalhe({
  T, dark,
  os, user, osBase, usuarios,
  onClose,
  onToggleAgPeca,
  onAbrirOS,
  onMoverOS,
  onUpdateOS,
  onExcluir,
  onRefetchOS,
  mobile = false,
}) {
  const admin = isAdmin(user)
  const [aba, setAba] = useState(() => abaInicial(os.etapa))
  const [showHistorico, setShowHistorico] = useState(false)

  // ─── Swipe horizontal entre abas (só mobile) ────────────────────────────
  // Touch events nativos — sem dependência. Detecta gesto horizontal e troca
  // de aba se o delta-x > threshold. Movimento vertical (scroll normal) NÃO
  // é interceptado (compara |dx| vs |dy|).
  const touchRef = useRef(null)
  function trocarAba(direcao) {
    const idx = ABAS_ORDEM.indexOf(aba)
    if (idx < 0) return
    const proxIdx = idx + direcao
    if (proxIdx < 0 || proxIdx >= ABAS_ORDEM.length) return
    setAba(ABAS_ORDEM[proxIdx])
  }
  function onTouchStart(e) {
    if (!mobile) return
    const t = e.touches[0]
    touchRef.current = { x0: t.clientX, y0: t.clientY, swiping: null }
  }
  function onTouchMove(e) {
    if (!mobile || !touchRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchRef.current.x0
    const dy = t.clientY - touchRef.current.y0
    // Define o eixo dominante no primeiro movimento significativo (> 10px).
    // Uma vez definido, mantém — evita que swipe horizontal vire scroll vertical no meio.
    if (touchRef.current.swiping == null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      touchRef.current.swiping = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
  }
  function onTouchEnd(e) {
    if (!mobile || !touchRef.current) return
    const ref = touchRef.current
    touchRef.current = null
    if (ref.swiping !== 'h') return
    const t = e.changedTouches[0]
    const dx = t.clientX - ref.x0
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    trocarAba(dx < 0 ? +1 : -1) // arrastou pra esquerda (dx<0) = aba seguinte
  }

  // ESC fecha o modal (ignorado se o painel de histórico estiver aberto — ele tem seu próprio listener)
  useEffect(() => {
    function fn(e) {
      if (e.key === 'Escape' && !showHistorico) onClose()
    }
    document.addEventListener('keydown', fn)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fn)
      document.body.style.overflow = prev
    }
  }, [onClose, showHistorico])

  // Props comuns repassados às abas.
  const tabProps = {
    T, dark, os, user, osBase, usuarios, admin,
    onAbrirOS, onToggleAgPeca, onMoverOS, onUpdateOS,
    setAba, // pra ações poderem redirecionar entre abas (ex: Orçamento → Pagamento)
    mobile,
  }

  return (
    <>
      {/* Overlay + container central */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: mobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: mobile ? 0 : '2rem',
          animation: 'os-detalhe-fade .15s ease-out',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="idemaq-card"
          style={{
            background: T.card,
            color: T.textPrimary,
            borderRadius: mobile ? '16px 16px 0 0' : 14,
            width: '100%',
            maxWidth: mobile ? '100%' : 780,
            maxHeight: mobile ? '92vh' : 'calc(100vh - 4rem)',
            border: `1px solid ${T.border}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'os-detalhe-in .2s ease-out',
          }}
        >
          <Header
            T={T} dark={dark} os={os} admin={admin}
            aba={aba} setAba={setAba}
            onShowHistorico={() => setShowHistorico(true)}
            onClose={onClose}
            onUpdateOS={onUpdateOS}
            onExcluir={onExcluir}
            onRefetchOS={onRefetchOS}
            mobile={mobile}
          />

          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              flex: 1, overflowY: 'auto',
              background: T.bg,
              touchAction: 'pan-y', // permite scroll vertical, browser não tenta scroll-x
            }}
          >
            {aba === 'etapa'     && <EtapaTab {...tabProps} />}
            {aba === 'relatorio' && <RelatorioTab {...tabProps} />}
            {aba === 'pagamento' && <PagamentoTab {...tabProps} />}
          </div>

          <Footer
            T={T} dark={dark} os={os} admin={admin}
            onMoverOS={onMoverOS}
          />
        </div>

        <style>{`
          @keyframes os-detalhe-fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes os-detalhe-in   { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        `}</style>
      </div>

      {/* Painel de histórico (sobreposto, z-index maior) */}
      {showHistorico && (
        <HistoricoPanel
          T={T} dark={dark} os={os} mobile={mobile}
          onClose={() => setShowHistorico(false)}
        />
      )}
    </>
  )
}
