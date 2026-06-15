// src/components/kanban/KanbanCard.jsx
// Card do Kanban — Apple HIG: elevação, tipografia SF, tags em pill.

import React from 'react'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { calcStatusPrazo, diasPrazo, estaPagaTotal, estaPagaParcial, totalAPagar, statusServicoSub, secoesOficinaVisiveis } from '../../utils/osHelpers'
import { corEtapa } from '../../utils/colors'
import SubStatus from './SubStatus'

export default function KanbanCard({
  os, T, dark,
  tipoCor,
  modoTodos = true,
  onClick,
  onCardMouseDown,
  shaking,
  admin = false,
  funcionarios = [],
  onMandarRoteiro,
}) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  const [hover, setHover]   = React.useState(false)
  const [menu, setMenu]     = React.useState(false)
  const [diaKey, setDiaKey] = React.useState('hoje')  // 'hoje' | 'amanha'
  const podeRoteiro = admin && funcionarios.length > 0 && !!onMandarRoteiro
  // Trava propagação pra o ⋮ não disparar arraste do card nem abrir a OS.
  const trava = e => { e.stopPropagation() }
  // Enquanto o ⋮ está visível, limpamos o canto sup. direito (prazo / "Nd aberto")
  // pra ele não ficar por cima do prazo.
  const cantoLimpo = podeRoteiro && (hover || menu)

  // Posição FIXA do menu — calculada NO CLIQUE a partir do próprio botão (evita
  // pegar elemento defasado) e guardada em estado. Fixed escapa do recorte
  // (overflow) da coluna. Abre pra cima quando o card está perto da base da tela.
  const MENU_W = 186, MENU_H = 158
  const [menuPos, setMenuPos] = React.useState(null)
  function toggleMenu(e) {
    trava(e)
    if (menu) { setMenu(false); return }
    const r = e.currentTarget.getBoundingClientRect()
    const abreCima = r.bottom + MENU_H > window.innerHeight - 8
    setMenuPos({
      left: Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)),
      top:  abreCima ? Math.max(8, r.top - MENU_H - 4) : r.bottom + 4,
    })
    setMenu(true)
  }
  // Fecha o menu ao clicar fora ou rolar.
  React.useEffect(() => {
    if (!menu) return
    function onDoc(e) { if (!e.target.closest('[data-card-roteiro]')) setMenu(false) }
    function onScroll() { setMenu(false) }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('scroll', onScroll, true) }
  }, [menu])
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const tipoCfg = TIPOS_OS[os.tipo]
  const corLinha = modoTodos ? corEtapa(tipoCfg.cor, dark) : tipoCor
  const dual = os.etapa === 'oficina'
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)
  const mostrarValor = os.valor > 0
  const semPrazo = os.etapa === 'concluido' || os.etapa === 'recusado' || !os.prazo

  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento

  // Prazo pill
  let prazoPillText = null
  let prazoPillStyle = null
  if (!semPrazo) {
    if (status === 'vencido') {
      prazoPillStyle = { background: cor('#3a0e0e', '#fff0f0'), color: cor('#ff7070', P.redDark) }
      prazoPillText = `${Math.abs(dias)}d atr.`
    } else if (status === 'hoje') {
      prazoPillStyle = { background: cor('#2e2204', '#fff8d8'), color: cor(P.yellow, P.yellowDark) }
      prazoPillText = 'Hoje'
    } else if (status === 'amanha') {
      prazoPillStyle = { background: cor('#2e2204', '#fff8d8'), color: cor(P.yellow, P.yellowDark) }
      prazoPillText = 'Amanhã'
    } else if (status === 'ok') {
      prazoPillStyle = { background: 'transparent', color: T.textMuted, padding: '1px 0' }
      prazoPillText = `${dias}d`
    }
  }

  const pill = (bg, fg) => ({
    padding: '2px 7px', borderRadius: 100,
    fontSize: 10, fontWeight: 600,
    background: bg, color: fg,
    display: 'inline-flex', alignItems: 'center', gap: 3,
    letterSpacing: '0.01em',
  })

  const cardStyle = dark
    ? { background: '#2a2a2d', borderLeft: `3px solid ${corLinha}` }
    : { background: '#ffffff', borderLeft: `3px solid ${corLinha}`, boxShadow: '0 1px 4px rgba(0,0,0,.07), 0 0 0 .5px rgba(0,0,0,.04)' }

  const temTags = os.garantia || pagoTotal || pagoParcial || os.aguardando_peca || (os.horasNaEtapa && os.horasNaEtapa > 24)

  return (
    <div onClick={onClick}
      data-num={os.numero}
      className={shaking ? 'idemaq-shake' : undefined}
      style={{
        ...cardStyle,
        position: 'relative',
        borderRadius: 11,
        padding: '10px 12px',
        cursor: 'grab',
        transition: 'box-shadow .18s, transform .15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        setHover(true)
        if (!dark) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.1), 0 0 0 .5px rgba(0,0,0,.05)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        setHover(false)
        if (!dark) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.07), 0 0 0 .5px rgba(0,0,0,.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing'; onCardMouseDown?.(os, e) }}
      onMouseUp={e => { e.currentTarget.style.cursor = 'grab' }}>

      {/* ⋮ Mandar pro roteiro — só dono, aparece no hover (organiza no desktop) */}
      {podeRoteiro && (hover || menu) && (
        <div data-card-roteiro style={{ position: 'absolute', top: 4, right: 4, zIndex: 6 }}
          onMouseDown={trava} onMouseUp={trava} onClick={trava}>
          <button
            aria-label="Mandar pro roteiro"
            title="Mandar pro roteiro"
            onMouseDown={trava}
            onClick={toggleMenu}
            style={{
              width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${T.border}`, background: T.card, color: azul,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="ti ti-dots-vertical" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
          {menu && menuPos && (
            <div onMouseDown={trava} onClick={trava} style={{
              position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 1000, width: MENU_W,
              background: T.cardAlt || T.card, border: `1px solid ${T.border}`, borderRadius: 8,
              padding: 6, boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 4px 16px rgba(0,0,0,0.14)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 4px 7px', fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                <i className="ti ti-checklist" style={{ fontSize: 12, color: azul }} aria-hidden="true" /> Mandar pro roteiro
              </div>
              {funcionarios.map(f => (
                <button key={f.id}
                  onClick={() => { onMandarRoteiro?.(os, f.id, diaKey); setMenu(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px', marginBottom: 4, borderRadius: 6,
                    border: 'none', background: 'transparent', color: T.textPrimary,
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f0f4ff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: (f.cor || azul) + '33', color: f.cor || azul, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{(f.nome || '?').slice(0, 2).toUpperCase()}</span>
                  {f.nome}
                </button>
              ))}
              <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                {[['hoje', 'Hoje'], ['amanha', 'Amanhã']].map(([v, lbl]) => (
                  <button key={v} onClick={() => setDiaKey(v)}
                    style={{
                      flex: 1, padding: '5px 6px', borderRadius: 6,
                      border: `1px solid ${diaKey === v ? azul : T.border}`,
                      background: diaKey === v ? (dark ? 'rgba(91,155,213,0.16)' : '#eef5fc') : 'transparent',
                      color: diaKey === v ? azul : T.textMuted,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{lbl}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 10, rowGap: 3, alignItems: 'baseline' }}>

        {/* Linha 1: tipo + número + dias aberto | prazo pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {modoTodos && (
            <i className={`ti ${tipoCfg.icon}`}
               style={{ fontSize: 11, color: corEtapa(tipoCfg.cor, dark), flexShrink: 0 }}
               aria-hidden="true" title={tipoCfg.label} />
          )}
          <span style={{
            fontSize: 10.5, fontWeight: 500, color: T.textMuted,
            fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em',
          }}>#{os.numero}</span>
          {!cantoLimpo && (() => {
            // Conta a partir da confirmação de coleta (entrada em 'recebido').
            // Para fabricação/venda sem recebido, usa a abertura da OS.
            const recebido = os.historico?.find(h => h.etapa === 'recebido')
            const base = recebido?.data || os.abertura
            if (!base) return null
            const dias = Math.floor((Date.now() - new Date(base).getTime()) / 86400000)
            if (dias < 0) return null
            return (
              <span title="Aberta há" style={{
                marginLeft: 'auto', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 2,
                fontSize: 10, color: T.textDim,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <i className="ti ti-clock" style={{ fontSize: 10 }} aria-hidden="true" />{dias}d</span>
            )
          })()}
        </div>
        {prazoPillText && !cantoLimpo ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1.5px 7px', borderRadius: 100,
            fontSize: 10, fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            justifySelf: 'end',
            ...prazoPillStyle,
          }}>
            <i className="ti ti-flag" style={{ fontSize: 10 }} aria-hidden="true" />{prazoPillText}</span>
        ) : <span />}

        {/* Linha 2: cliente | valor */}
        <div style={{
          fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          minWidth: 0, letterSpacing: '-0.01em',
        }}>{os.cliente}</div>
        {mostrarValor ? (
          <span style={{
            fontSize: 12.5, color: cor(P.blue, P.blueDark), fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            justifySelf: 'end',
          }}>R$ {(os.valor - (os.desconto || 0)).toLocaleString('pt-BR')}</span>
        ) : (
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 400, justifySelf: 'end' }}>—</span>
        )}

        {/* Linha 3: equipamento */}
        {linhaEquip && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 12, color: T.textSecondary,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {linhaEquip}
            {os.serie && (
              <span style={{
                color: T.textMuted,
                fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
                fontSize: 10.5, marginLeft: 6,
              }}>· {os.serie}</span>
            )}
          </div>
        )}

        {/* Linha 4: endereço */}
        {endResumido && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 11, color: T.textMuted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{endResumido}</div>
        )}

        {/* Linha 5: dual status oficina (Limp./Manut.). Visibilidade vem da
            DETECÇÃO REAL de serviços/peças (os._temLimp/_temManut, enriquecido no
            Kanban) — não mostra "Limp." em OS sem limpeza.
            Manut.: status da peça a comprar (vermelho/amarelo) tem prioridade. */}
        {dual && (() => {
          const of = os.pre_diagnostico?.oficina || {}
          const { limp: mostraLimp, manut: mostraManut } = secoesOficinaVisiveis(os)
          if (!mostraLimp && !mostraManut) return null
          return (
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 4, marginTop: 5 }}>
              {mostraLimp  && <SubStatus label="Limp."  status={statusServicoSub(of, 'limpeza')} T={T} dark={dark} />}
              {mostraManut && <SubStatus label="Manut." status={os.manutPecaStatus || statusServicoSub(of, 'manutencao')} T={T} dark={dark} />}
            </div>
          )
        })()}

        {/* Linha 6: tags */}
        {temTags && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
            marginTop: 6,
          }}>
            {os.garantia && (
              <span title={`Garantia da OS #${os.os_origem_id}`}
                    style={pill(cor('#0d2035', '#e6f1fb'), cor(P.blue, P.blueDark))}>
                <i className="ti ti-shield-check" style={{ fontSize: 10 }} aria-hidden="true" />Garantia
              </span>
            )}
            {pagoTotal && (
              <span style={pill(cor('#0e2818', '#e6f7ed'), cor(P.green, P.greenDark))}>
                <i className="ti ti-check" style={{ fontSize: 10 }} aria-hidden="true" />Pago
              </span>
            )}
            {pagoParcial && (
              <span style={{ ...pill(cor('#2e2204', '#fff8d8'), cor(P.yellow, P.yellowDark)), fontVariantNumeric: 'tabular-nums' }}>
                R$ {(os.valor_pago || 0).toLocaleString('pt-BR')}/{(totalAPagar(os)).toLocaleString('pt-BR')}
              </span>
            )}
            {os.aguardando_peca && (
              <span style={pill(cor('#3a2200', '#fff4e0'), '#ff9800')}>
                <i className="ti ti-package" style={{ fontSize: 10 }} aria-hidden="true" />peça
              </span>
            )}
            {os.horasNaEtapa && os.horasNaEtapa > 24 && (
              <span style={pill(cor('#2a1515', '#fde8e8'), cor(P.red, P.redDark))}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 10 }} aria-hidden="true" />{os.horasNaEtapa}h
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
