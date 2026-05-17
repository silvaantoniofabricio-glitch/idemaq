// src/components/os/OSDrawer.jsx
// Painel lateral de detalhe de OS — desktop only.
// Slide-in da direita (480 px) · 4 abas · footer com "Avançar etapa".

import React, { useState, useEffect } from 'react'
import { P } from '../../theme'
import { TIPOS_OS, ETAPAS_TODOS, funcPorId } from '../../utils/osData'
import {
  estaPagaTotal, estaPagaParcial,
  calcStatusPrazo, diasPrazo, responsavelAtual,
  isAdmin, dentroGarantia, podeMoverOS,
} from '../../utils/osHelpers'
import { corEtapa, bgEtapa } from '../../utils/colors'
import { OS_ITENS_MOCK } from '../../_mocks/os'

export default function OSDrawer({ T, dark, os, user, osBase, onClose, onToggleAgPeca, onAbrirOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const [aba, setAba] = useState('resumo')
  const admin = isAdmin(user)

  const config      = TIPOS_OS[os.tipo]
  const tipoCor     = corEtapa(config.cor, dark)
  const etapaIdx    = config.etapas.findIndex(e => e.id === os.etapa)
  const etapaAtual  = config.etapas[etapaIdx]
  const isConcluido = os.etapa === 'concluido'
  const isRecusado  = os.etapa === 'recusado'

  const status     = calcStatusPrazo(os.prazo, os.etapa)
  const dias       = diasPrazo(os.prazo)
  const pagoTotal  = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)
  const valorPago  = os.valor_pago || 0

  const itens    = OS_ITENS_MOCK[os.numero] || []
  const subtotal = itens.reduce((s, i) => s + i.valor * i.qtd, 0)
  const totalLiq = subtotal - (os.desconto || 0)
  const aPagar   = Math.max(0, totalLiq - valorPago)

  const respId = responsavelAtual(os)
  const func   = funcPorId(respId)

  const osOrigem      = os.garantia && osBase ? osBase.find(o => o.numero === os.os_origem_id) : null
  const garantiaValida = isConcluido ? dentroGarantia(os) : false

  // Próxima etapa — mapeada para ID unificado (o que moverOS espera)
  const proximaEtapaCfg  = config.etapas[etapaIdx + 1]
  const proximaEtapaUnif = proximaEtapaCfg
    ? ETAPAS_TODOS.find(e => e.match?.[os.tipo] === proximaEtapaCfg.id)
    : null
  const podeAvancar = proximaEtapaCfg && !isConcluido && !isRecusado
    ? podeMoverOS(os, proximaEtapaCfg.id)
    : { ok: false, motivo: isConcluido ? 'OS concluída' : isRecusado ? 'OS recusada' : 'Última etapa' }

  const historico = os.historico || []

  // ESC fecha
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const abas = [
    { id: 'resumo',    label: 'Resumo',                      icon: 'ti-info-circle'   },
    { id: 'itens',     label: `Itens (${itens.length})`,     icon: 'ti-list-details'  },
    { id: 'historico', label: `Histórico (${historico.length})`, icon: 'ti-history'  },
    { id: 'pagamento', label: 'Pagamento',                   icon: 'ti-cash-banknote' },
  ]

  return (
    <>
      <style>{`@keyframes os-drawer-in{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      {/* Overlay escurecido */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, backdropFilter:'blur(2px)' }}
      />

      {/* Painel lateral */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, width:480,
        background:T.bg, zIndex:201,
        boxShadow:'-4px 0 40px rgba(0,0,0,.35)',
        display:'flex', flexDirection:'column',
        animation:'os-drawer-in .2s cubic-bezier(.32,1,.5,1)',
      }}>

        {/* ── HEADER FIXO ───────────────────────────────────────────────── */}
        <div style={{ flexShrink:0, borderBottom:`1px solid ${T.border}`, background:tipoCor+'0a' }}>

          {/* Linha 1: tipo + OS# + badges de estado + botões */}
          <div style={{ padding:'12px 14px 8px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
              <span style={{ padding:'3px 9px', borderRadius:6, background:tipoCor+'22', color:tipoCor, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5, textTransform:'uppercase', letterSpacing:'.3px' }}>
                <i className={`ti ${config.icon}`} style={{ fontSize:13 }} aria-hidden="true" />
                {config.label}
              </span>
              <span style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>OS #{os.numero}</span>
              {os.garantia && (
                <_Pill cor={cor(P.blue,P.blueDark)} bg={cor('#0d2035','#e6f1fb')}>
                  <i className="ti ti-shield-check" style={{ fontSize:11 }} aria-hidden="true" /> Garantia
                </_Pill>
              )}
              {pagoTotal && (
                <_Pill cor={cor(P.green,P.greenDark)} bg={cor('#0f2a15','#e8f5ec')}>
                  <i className="ti ti-check" style={{ fontSize:11 }} aria-hidden="true" /> Pago
                </_Pill>
              )}
              {pagoParcial && (
                <_Pill cor={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')}>Parcial</_Pill>
              )}
              {!isRecusado && status==='vencido' && (
                <_Pill cor={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')}>{Math.abs(dias)}d atraso</_Pill>
              )}
              {status==='hoje'   && <_Pill cor={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')}>Vence hoje</_Pill>}
              {status==='amanha' && <_Pill cor={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')}>Vence amanhã</_Pill>}
              {isRecusado && <_Pill cor={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')}>Recusada</_Pill>}
              {os.aguardando_peca && <_Pill cor="#ff9800" bg={cor('#3a2200','#fff4e0')}><i className="ti ti-package" style={{ fontSize:11 }} aria-hidden="true" /> Ag. peça</_Pill>}
            </div>

            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <button onClick={onToggleAgPeca} title={os.aguardando_peca ? 'Desmarcar aguardando peça' : 'Marcar aguardando peça'}
                style={{ padding:'5px 8px', borderRadius:6, border:`1px solid ${os.aguardando_peca?'#ff9800':T.border}`, background:os.aguardando_peca?cor('#3a2200','#fff4e0'):'transparent', color:os.aguardando_peca?'#ff9800':T.textMuted, cursor:'pointer', display:'flex', alignItems:'center' }}>
                <i className={`ti ${os.aguardando_peca?'ti-package':'ti-package-off'}`} style={{ fontSize:14 }} aria-hidden="true" />
              </button>
              <button onClick={onClose} aria-label="Fechar"
                style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:'5px 6px', borderRadius:6, display:'flex', alignItems:'center' }}>
                <i className="ti ti-x" style={{ fontSize:20 }} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Linha 2: cliente + equipamento + etapa pill + avatar */}
          <div style={{ padding:'0 14px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.textPrimary, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{os.cliente}</div>
              <div style={{ fontSize:11.5, color:T.textMuted }}>
                {[os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              {etapaAtual && (
                <span style={{ padding:'4px 10px', borderRadius:20, background:bgEtapa(etapaAtual.cor, dark), color:corEtapa(etapaAtual.cor, dark), fontSize:11, fontWeight:700, border:`1px solid ${corEtapa(etapaAtual.cor, dark)}33`, whiteSpace:'nowrap' }}>
                  {etapaAtual.curto}
                </span>
              )}
              {func && (
                <span title={func.nome} style={{ width:30, height:30, borderRadius:'50%', background:func.cor+'33', color:func.cor, fontSize:10.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${func.cor}55`, flexShrink:0, userSelect:'none' }}>
                  {func.apelido}
                </span>
              )}
            </div>
          </div>

          {/* Abas underline */}
          <div style={{ display:'flex' }}>
            {abas.map(a => {
              if (!admin && a.id === 'pagamento') return null
              const ativo = aba === a.id
              return (
                <button key={a.id} onClick={() => setAba(a.id)}
                  style={{ flex:1, padding:'8px 6px', border:'none', borderBottom:`2px solid ${ativo?tipoCor:'transparent'}`, background:'transparent', color:ativo?tipoCor:T.textMuted, fontSize:11, fontWeight:ativo?700:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, transition:'border-color .12s,color .12s', whiteSpace:'nowrap' }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize:12 }} aria-hidden="true" />
                  {a.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── CONTEÚDO SCROLLÁVEL ────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 14px', display:'flex', flexDirection:'column', gap:12 }}>
          {aba==='resumo'    && <AbaResumo os={os} config={config} etapaIdx={etapaIdx} osOrigem={osOrigem} garantiaValida={garantiaValida} admin={admin} T={T} dark={dark} tipoCor={tipoCor} status={status} dias={dias} onAbrirOS={onAbrirOS} onToggleAgPeca={onToggleAgPeca} historico={historico} itens={itens} onMoverOS={onMoverOS} onClose={onClose} />}
          {aba==='itens'     && <AbaItens itens={itens} subtotal={subtotal} totalLiq={totalLiq} os={os} pagoTotal={pagoTotal} pagoParcial={pagoParcial} valorPago={valorPago} aPagar={aPagar} tipoCor={tipoCor} T={T} dark={dark} />}
          {aba==='historico' && <AbaHistorico historico={historico} config={config} T={T} dark={dark} />}
          {aba==='pagamento' && admin && <AbaPagamento os={os} totalLiq={totalLiq} valorPago={valorPago} aPagar={aPagar} pagoTotal={pagoTotal} pagoParcial={pagoParcial} T={T} dark={dark} tipoCor={tipoCor} />}
        </div>

        {/* ── FOOTER FIXO ────────────────────────────────────────────────── */}
        {!isConcluido && !isRecusado && (
          <div style={{ flexShrink:0, padding:'10px 14px', borderTop:`1px solid ${T.border}`, background:T.card, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, fontSize:11.5 }}>
              {podeAvancar.ok && proximaEtapaCfg
                ? <span style={{ color:T.textMuted }}>Avançar para <strong style={{ color:T.textPrimary }}>{proximaEtapaCfg.label}</strong></span>
                : <span style={{ color:cor(P.red,P.redDark), display:'flex', alignItems:'center', gap:5 }}>
                    <i className="ti ti-lock" style={{ fontSize:13 }} aria-hidden="true" />
                    {podeAvancar.motivo || 'Última etapa do fluxo'}
                  </span>
              }
            </div>
            <button
              onClick={() => { if (podeAvancar.ok && proximaEtapaUnif) onMoverOS(os.numero, proximaEtapaUnif.id) }}
              disabled={!podeAvancar.ok || !proximaEtapaUnif}
              style={{
                padding:'8px 16px', borderRadius:7, border:'none',
                cursor: podeAvancar.ok && proximaEtapaUnif ? 'pointer' : 'not-allowed',
                background: podeAvancar.ok ? `linear-gradient(135deg,${tipoCor},${tipoCor}cc)` : T.cardAlt,
                color: podeAvancar.ok ? '#fff' : T.textDim,
                fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:6,
                opacity: podeAvancar.ok ? 1 : 0.55, flexShrink:0,
              }}>
              <i className="ti ti-arrow-right" style={{ fontSize:14 }} aria-hidden="true" />
              Avançar etapa
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Pill de badge inline ────────────────────────────────────────────────────
function _Pill({ cor, bg, children }) {
  return (
    <span style={{ padding:'2px 8px', borderRadius:5, background:bg, color:cor, border:`1px solid ${cor}33`, fontSize:10.5, fontWeight:700, display:'inline-flex', alignItems:'center', gap:4 }}>
      {children}
    </span>
  )
}

// ─── Aba Resumo ──────────────────────────────────────────────────────────────
function AbaResumo({ os, config, etapaIdx, osOrigem, garantiaValida, admin, T, dark, tipoCor, status, dias, onAbrirOS, onToggleAgPeca, historico, itens, onMoverOS, onClose }) {
  const cor = (d, c) => dark ? d : c
  const isRecusado = os.etapa === 'recusado'

  return (
    <>
      {/* OS em garantia — exibe OS de origem */}
      {os.garantia && osOrigem && (
        <div onClick={() => onAbrirOS?.(osOrigem.numero)}
          style={{ padding:'10px 14px', borderRadius:9, background:bgEtapa('blue', dark), border:`1px solid ${corEtapa('blue', dark)}55`, fontSize:12, color:T.textSecondary, display:'flex', alignItems:'center', gap:10, cursor:onAbrirOS?'pointer':'default' }}>
          <i className="ti ti-shield-check" style={{ fontSize:20, color:corEtapa('blue', dark), flexShrink:0 }} aria-hidden="true" />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:T.textPrimary, marginBottom:2 }}>OS em garantia</div>
            <div style={{ lineHeight:1.4 }}>
              Referente à OS #{' '}<strong style={{ color:corEtapa('blue', dark) }}>{osOrigem.numero}</strong>{' '}
              de {osOrigem.cliente} ({osOrigem.equipamento}). Peças a preço de custo, sem mão de obra.
            </div>
          </div>
          {onAbrirOS && <i className="ti ti-chevron-right" style={{ fontSize:18, color:T.textDim }} aria-hidden="true" />}
        </div>
      )}

      {/* Garantia ativa (OS concluída original) */}
      {!os.garantia && os.etapa==='concluido' && garantiaValida && (
        <div style={{ padding:'10px 14px', borderRadius:9, background:bgEtapa('blue', dark), border:`1px solid ${corEtapa('blue', dark)}55`, fontSize:12, color:T.textSecondary, display:'flex', alignItems:'center', gap:10 }}>
          <i className="ti ti-shield-check" style={{ fontSize:20, color:corEtapa('blue', dark), flexShrink:0 }} aria-hidden="true" />
          <div>
            <div style={{ fontWeight:700, color:T.textPrimary, marginBottom:2 }}>Garantia ativa</div>
            <div>Se houver retorno, abra nova OS marcando "Garantia" e referenciando esta.</div>
          </div>
        </div>
      )}

      {/* Timeline das etapas */}
      {!isRecusado && (
        <div style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
            <i className="ti ti-route" style={{ fontSize:14 }} aria-hidden="true" />
            Fluxo — etapa atual: <strong style={{ color:tipoCor }}>{config.etapas[etapaIdx]?.label}</strong>
          </div>
          <div style={{ display:'flex', gap:3, overflowX:'auto', paddingBottom:4 }}>
            {config.etapas.map((e, i) => {
              if (e.adminOnly && !admin) return null
              const passou = i < etapaIdx
              const atual  = i === etapaIdx
              const corE   = atual ? corEtapa(e.cor, dark) : (passou ? cor(P.green, P.greenDark) : T.textDim)
              const bgE    = atual ? bgEtapa(e.cor, dark)  : (passou ? cor('#0f2a15', '#e8f5ec') : T.bg)
              const reg    = historico.find(h => h.etapa === e.id)
              const f      = reg && funcPorId(reg.funcionario)
              return (
                <div key={e.id} style={{ flex:'1 0 auto', minWidth:78, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:bgE, color:corE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, border:`1.5px solid ${atual?corE:'transparent'}` }}>
                    {passou ? <i className="ti ti-check" style={{ fontSize:12 }} aria-hidden="true" /> : atual ? <div style={{ width:6, height:6, borderRadius:'50%', background:corE }} /> : i+1}
                  </div>
                  <span style={{ fontSize:9.5, color:corE, textAlign:'center', lineHeight:1.25, fontWeight:atual?700:500, maxWidth:80 }}>{e.curto}</span>
                  {f && (
                    <span title={`Feito por ${f.nome}`} style={{ fontSize:8, color:f.cor, fontWeight:700, padding:'1px 5px', borderRadius:8, background:f.cor+'22', border:`1px solid ${f.cor}33` }}>
                      {f.apelido}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bloco Orçamento — só na etapa orcamento */}
      {os.etapa==='orcamento' && (
        <BlocoOrcamento os={os} itens={itens} T={T} dark={dark} tipoCor={tipoCor}
          onMoverOS={onMoverOS} onClose={onClose} historico={historico} />
      )}

      {/* Limpeza e Manutenção — só na etapa oficina */}
      {os.etapa==='oficina' && (
        <div style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-tool" style={{ fontSize:14 }} aria-hidden="true" />
              Em oficina
            </div>
            <button onClick={onToggleAgPeca}
              style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${os.aguardando_peca?'#ff9800':T.border}`, background:os.aguardando_peca?cor('#3a2200','#fff4e0'):T.bg, color:os.aguardando_peca?'#ff9800':T.textMuted, fontSize:10.5, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5, textTransform:'none', letterSpacing:'normal' }}>
              <i className={`ti ${os.aguardando_peca?'ti-package':'ti-package-off'}`} style={{ fontSize:12 }} aria-hidden="true" />
              {os.aguardando_peca ? 'Aguardando peça' : 'Marcar ag. peça'}
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <_SubBox label="Limpeza"    status={os.limpeza}    icon="ti-droplet" T={T} dark={dark} />
            <_SubBox label="Manutenção" status={os.manutencao} icon="ti-tool"    T={T} dark={dark} />
          </div>
          <div style={{ fontSize:11, color:T.textDim, marginTop:8, fontStyle:'italic' }}>
            <i className="ti ti-info-circle" style={{ fontSize:12, marginRight:4, verticalAlign:'middle' }} aria-hidden="true" />
            Teste final libera quando ambas concluídas.
          </div>
        </div>
      )}

      {/* Cliente e Equipamento */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <_DetCard icon="ti-user" titulo="Cliente" T={T}>
          <_Linha label="Nome"     valor={os.cliente}  T={T} />
          {os.fone     && <_Linha label="Telefone" valor={os.fone}     T={T} />}
          {os.endereco && <_Linha label="Endereço" valor={os.endereco} T={T} multi />}
        </_DetCard>
        <_DetCard icon="ti-device-mobile-cog" titulo="Equipamento" T={T}>
          {os.marca  && <_Linha label="Marca"   valor={os.marca}  T={T} />}
          {os.modelo && <_Linha label="Modelo"  valor={os.modelo} T={T} />}
          {os.serie  && <_Linha label="Nº série" valor={os.serie} T={T} mono />}
          <_Linha label="Defeito" valor={os.defeito} T={T} multi />
        </_DetCard>
      </div>

      {/* Datas */}
      {(() => {
        const aberturaStr = os.abertura || os.criado_em
        const aberturaD   = aberturaStr ? new Date(aberturaStr) : null
        const prazoD      = os.prazo    ? new Date(os.prazo)    : null
        const diasNaOS    = aberturaD   ? Math.max(1, Math.round((Date.now()-aberturaD)/86400000)) : null
        return (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            <_DetMini icon="ti-calendar-plus"  label="Aberta" valor={aberturaD ? aberturaD.toLocaleDateString('pt-BR') : '—'} T={T} />
            <_DetMini icon="ti-calendar-check" label="Prazo"  valor={prazoD ? prazoD.toLocaleDateString('pt-BR') : '—'} T={T}
              cor={prazoD && status==='vencido' ? (dark?P.red:P.redDark) : prazoD && (status==='hoje'||status==='amanha') ? (dark?P.yellow:P.yellowDark) : undefined} />
            <_DetMini icon="ti-clock-hour-4"   label="Na OS"  valor={diasNaOS != null ? diasNaOS+'d' : '—'} T={T} />
          </div>
        )
      })()}

      {/* Observações */}
      {os.observacoes && (
        <_DetCard icon="ti-notes" titulo="Observações" T={T}>
          <div style={{ fontSize:12.5, color:T.textSecondary, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{os.observacoes}</div>
        </_DetCard>
      )}
    </>
  )
}

// ─── Aba Itens ────────────────────────────────────────────────────────────────
function AbaItens({ itens, subtotal, totalLiq, os, pagoTotal, pagoParcial, valorPago, aPagar, tipoCor, T, dark }) {
  const cor = (d, c) => dark ? d : c
  if (itens.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'3rem 1rem', color:T.textDim }}>
        <i className="ti ti-list-details" style={{ fontSize:36, display:'block', marginBottom:10, opacity:.4 }} aria-hidden="true" />
        <div style={{ fontSize:13, fontWeight:600 }}>Nenhum item cadastrado</div>
        <div style={{ fontSize:11.5, marginTop:4 }}>Os itens aparecerão aqui quando forem adicionados à OS.</div>
      </div>
    )
  }
  return (
    <div style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:5 }}>
      {itens.map((it, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:T.bg, borderRadius:6, fontSize:12.5, gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0, flex:1 }}>
            <i className={`ti ${it.tipo==='servico'?'ti-tool':'ti-package'}`}
              style={{ fontSize:14, color:it.tipo==='servico'?cor(P.blueLight,P.blueLightDark):cor(P.blue,P.blueDark), flexShrink:0 }} aria-hidden="true" />
            <span style={{ color:T.textPrimary, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.nome}</span>
            <span style={{ color:T.textDim, fontSize:11, flexShrink:0 }}>×{it.qtd}</span>
          </div>
          <span style={{ color:T.textSecondary, fontWeight:600, whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>
            R$ {(it.valor*it.qtd).toLocaleString('pt-BR',{minimumFractionDigits:2})}
          </span>
        </div>
      ))}

      {/* Totais */}
      <div style={{ marginTop:8, paddingTop:10, borderTop:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:5 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted }}>
          <span>Subtotal</span>
          <span style={{ fontVariantNumeric:'tabular-nums' }}>R$ {subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
        {(os.desconto||0) > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.green,P.greenDark) }}>
            <span>Desconto</span>
            <span style={{ fontVariantNumeric:'tabular-nums' }}>− R$ {os.desconto.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:T.textPrimary, fontWeight:700, marginTop:2 }}>
          <span>Total</span>
          <span style={{ color:tipoCor, fontVariantNumeric:'tabular-nums' }}>R$ {totalLiq.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
        {(pagoTotal||pagoParcial) && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.green,P.greenDark), marginTop:5, paddingTop:6, borderTop:`1px dashed ${T.border}` }}>
              <span>
                <i className="ti ti-cash-banknote" style={{ fontSize:13, marginRight:5, verticalAlign:'middle' }} aria-hidden="true" />
                Pago{os.forma_pagamento?` (${os.forma_pagamento})`:''}
              </span>
              <span style={{ fontVariantNumeric:'tabular-nums' }}>R$ {valorPago.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
            </div>
            {pagoParcial && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.yellow,P.yellowDark), fontWeight:600 }}>
                <span>A receber</span>
                <span style={{ fontVariantNumeric:'tabular-nums' }}>R$ {aPagar.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Aba Histórico ────────────────────────────────────────────────────────────
function AbaHistorico({ historico, config, T, dark }) {
  if (historico.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'3rem 1rem', color:T.textDim }}>
        <i className="ti ti-clipboard-off" style={{ fontSize:36, display:'block', marginBottom:10, opacity:.4 }} aria-hidden="true" />
        <div style={{ fontSize:13, fontWeight:600 }}>Sem movimentações ainda</div>
      </div>
    )
  }
  return (
    <div style={{ background:T.cardAlt, borderRadius:9, padding:'14px 14px', border:`1px solid ${T.border}`, position:'relative' }}>
      {historico.map((h, i) => {
        const e     = config.etapas.find(et => et.id === h.etapa) || { label:h.etapa, cor:'neutro' }
        const f     = funcPorId(h.funcionario)
        const corE  = corEtapa(e.cor, dark)
        const isLast = i === historico.length - 1
        return (
          <div key={i} style={{ display:'flex', gap:12, position:'relative', paddingBottom:isLast?0:14 }}>
            {!isLast && <div style={{ position:'absolute', left:13, top:28, bottom:0, width:2, background:T.border }} />}
            <div style={{ width:28, height:28, borderRadius:'50%', background:bgEtapa(e.cor, dark), color:corE, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:`1.5px solid ${corE}44`, zIndex:1 }}>
              <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" />
            </div>
            <div style={{ flex:1, paddingTop:2 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                <span style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{e.label}</span>
                {f && (
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:18, height:18, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{f.apelido}</span>
                    <span style={{ fontSize:11.5, color:T.textSecondary, fontWeight:600 }}>{f.nome}</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize:11, color:T.textMuted }}>
                <i className="ti ti-clock" style={{ fontSize:11, marginRight:4, verticalAlign:'middle' }} aria-hidden="true" />
                {h.data}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Aba Pagamento ────────────────────────────────────────────────────────────
function AbaPagamento({ os, totalLiq, valorPago, aPagar, pagoTotal, pagoParcial, T, dark, tipoCor }) {
  const cor = (d, c) => dark ? d : c
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Card de status */}
      <div style={{
        background: pagoTotal ? cor('#0f2a15','#e8f5ec') : pagoParcial ? cor('#2a2000','#fdf6dc') : T.cardAlt,
        borderRadius:9, padding:'14px 16px',
        border:`1px solid ${(pagoTotal?cor(P.green,P.greenDark):pagoParcial?cor(P.yellow,P.yellowDark):T.border)}44`,
        display:'flex', alignItems:'center', gap:12,
      }}>
        <i className={`ti ${pagoTotal?'ti-circle-check':pagoParcial?'ti-clock':'ti-cash-banknote'}`}
          style={{ fontSize:28, color:pagoTotal?cor(P.green,P.greenDark):pagoParcial?cor(P.yellow,P.yellowDark):T.textMuted, flexShrink:0 }} aria-hidden="true" />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>
            {pagoTotal ? 'Pago integralmente' : pagoParcial ? 'Pagamento parcial' : 'Aguardando pagamento'}
          </div>
          {pagoParcial && (
            <div style={{ fontSize:12, color:T.textMuted, marginTop:3 }}>
              R${' '}<span style={{ fontVariantNumeric:'tabular-nums' }}>{valorPago.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
              {' '}de R${' '}<span style={{ fontVariantNumeric:'tabular-nums' }}>{totalLiq.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
            </div>
          )}
        </div>
      </div>

      {/* Resumo financeiro */}
      <_DetCard icon="ti-receipt" titulo="Resumo financeiro" T={T}>
        <_Linha label="Total OS"    valor={`R$ ${totalLiq.toLocaleString('pt-BR',{minimumFractionDigits:2})}`}  T={T} />
        <_Linha label="Valor pago"  valor={`R$ ${valorPago.toLocaleString('pt-BR',{minimumFractionDigits:2})}`} T={T} />
        {pagoParcial && <_Linha label="A receber" valor={`R$ ${aPagar.toLocaleString('pt-BR',{minimumFractionDigits:2})}`} T={T} />}
        {os.forma_pagamento && <_Linha label="Forma" valor={os.forma_pagamento} T={T} />}
        {(os.desconto||0) > 0 && <_Linha label="Desconto" valor={`R$ ${os.desconto.toLocaleString('pt-BR',{minimumFractionDigits:2})}`} T={T} />}
      </_DetCard>

      {!pagoTotal && (
        <div style={{ padding:'10px 12px', borderRadius:8, background:bgEtapa('blue', dark), border:`1px dashed ${corEtapa('blue', dark)}55`, fontSize:11.5, color:T.textSecondary, display:'flex', alignItems:'center', gap:8 }}>
          <i className="ti ti-info-circle" style={{ fontSize:15, color:corEtapa('blue', dark), flexShrink:0 }} aria-hidden="true" />
          <span>O registro de pagamento estará disponível na Entrega 2 do sistema.</span>
        </div>
      )}
    </div>
  )
}

// ─── BlocoOrcamento — etapa Orçamento ────────────────────────────────────────
// Único lugar do sistema onde se mexe em preço (regra de negócio).
// Mostra: relatório do diagnóstico, atalhos rápidos (Limpeza/Manutenção/Taxa),
// editor de itens, desconto bidirecional R$ ↔ %, resumo, e 4 ações:
// Gerar orçamento (HTML printável) · Enviar (WhatsApp) · Aprovar · Recusar.
// Tudo é mock local — integração com Supabase virá quando lancamento_financeiro
// e o save real da OS estiverem prontos.

const ATALHOS_ORCAMENTO = [
  { nome: 'Limpeza',                tipo: 'servico', valor: 185, icon: 'ti-droplet' },
  { nome: 'Manutenção',             tipo: 'servico', valor: 185, icon: 'ti-tool' },
  { nome: 'Limpeza combinada',      tipo: 'servico', valor: 165, icon: 'ti-droplet-half' },
  { nome: 'Taxa de diagnóstico',    tipo: 'servico', valor:  30, icon: 'ti-stethoscope' },
  { nome: 'Capa',                   tipo: 'peca',    valor:  85, icon: 'ti-package' },
]

function fmtR(v) {
  return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function BlocoOrcamento({ os, itens, T, dark, tipoCor, onMoverOS, onClose, historico }) {
  const cor = (d, c) => dark ? d : c
  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde    = corEtapa('green', dark)

  // Quem fez o diagnóstico (último registro de etapa 'diagnostico' no histórico)
  const regDiag = [...historico].reverse().find(h => h.etapa === 'diagnostico')
  const funcDiag = regDiag && funcPorId(regDiag.funcionario)

  // Estado local — futuro: salva em os.diagnostico_relatorio + os.itens via Supabase
  const [diagRelatorio, setDiagRelatorio] = React.useState(
    os.diagnostico_relatorio || os.observacoes || ''
  )
  const [itensOrc, setItensOrc] = React.useState(
    itens.length > 0
      ? itens.map(i => ({ ...i }))
      : []
  )
  const [novoNome, setNovoNome] = React.useState('')
  const [novoValor, setNovoValor] = React.useState('')
  const [novoTipo, setNovoTipo] = React.useState('servico')
  const [descontoR, setDescontoR] = React.useState(os.desconto || 0)

  const subtotal = itensOrc.reduce((s, i) => s + i.valor * i.qtd, 0)
  const descontoPct = subtotal > 0 ? Math.round((descontoR / subtotal) * 100) : 0
  const total = Math.max(0, subtotal - descontoR)

  function setDescR(v) {
    const n = Math.max(0, Math.min(subtotal, parseFloat(v) || 0))
    setDescontoR(n)
  }
  function setDescP(v) {
    const n = Math.max(0, Math.min(100, parseFloat(v) || 0))
    setDescontoR(Math.round((subtotal * n) / 100 * 100) / 100)
  }

  function adicionarAtalho(a) {
    // Se já tem o item, incrementa qtd; senão adiciona novo.
    setItensOrc(prev => {
      const idx = prev.findIndex(i => i.nome === a.nome && i.tipo === a.tipo)
      if (idx >= 0) {
        const novo = [...prev]
        novo[idx] = { ...novo[idx], qtd: novo[idx].qtd + 1 }
        return novo
      }
      return [...prev, { nome: a.nome, tipo: a.tipo, valor: a.valor, qtd: 1 }]
    })
  }

  function adicionarCustom() {
    const nome = novoNome.trim()
    const valor = parseFloat(novoValor) || 0
    if (!nome || valor <= 0) return
    setItensOrc(prev => [...prev, { nome, tipo: novoTipo, valor, qtd: 1 }])
    setNovoNome(''); setNovoValor('')
  }

  function alterarQtd(idx, delta) {
    setItensOrc(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const novaQtd = Math.max(1, it.qtd + delta)
      return { ...it, qtd: novaQtd }
    }))
  }

  function removerItem(idx) {
    setItensOrc(prev => prev.filter((_, i) => i !== idx))
  }

  function gerarOrcamento() {
    if (itensOrc.length === 0) {
      alert('Adicione pelo menos um item antes de gerar o orçamento.')
      return
    }
    const w = window.open('', '_blank', 'width=720,height=900')
    if (!w) {
      alert('Permita pop-ups pra gerar o orçamento.')
      return
    }
    const hoje = new Date().toLocaleDateString('pt-BR')
    const linhas = itensOrc.map(i => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${i.nome}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;font-variant-numeric:tabular-nums">${i.qtd}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums">R$ ${fmtR(i.valor)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums">R$ ${fmtR(i.valor * i.qtd)}</td>
      </tr>
    `).join('')
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Orçamento OS #${os.numero}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 32px; color: #1a1a1a; max-width: 720px; margin: 0 auto; }
        h1 { color: #1a6aaa; margin: 0 0 4px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
        .bloco { background: #f7f7f9; padding: 14px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #eaeaee; }
        .bloco-titulo { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1a6aaa; color: #fff; padding: 10px; text-align: left; font-size: 12px; }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3), th:nth-child(4) { text-align: right; }
        .total { font-size: 22px; font-weight: 800; color: #1a6aaa; text-align: right; padding: 12px 10px; }
        .footer { font-size: 11px; color: #888; margin-top: 32px; text-align: center; border-top: 1px solid #eaeaee; padding-top: 14px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>IDEMAQ — Orçamento</h1>
      <div class="sub">OS #${os.numero} · ${hoje}</div>
      <div class="bloco">
        <div class="bloco-titulo">Cliente</div>
        <div><strong>${os.cliente || '—'}</strong></div>
        <div style="font-size:12px;color:#666">${os.fone || ''} · ${os.endereco || ''}</div>
      </div>
      <div class="bloco">
        <div class="bloco-titulo">Equipamento</div>
        <div>${[os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento || '—'}</div>
        <div style="font-size:12px;color:#666;margin-top:4px"><strong>Defeito:</strong> ${os.defeito || '—'}</div>
      </div>
      ${diagRelatorio ? `<div class="bloco"><div class="bloco-titulo">Diagnóstico técnico</div><div style="font-size:13px;line-height:1.5;white-space:pre-wrap">${diagRelatorio}</div></div>` : ''}
      <table>
        <thead><tr><th>Item</th><th>Qtd</th><th>Valor unit.</th><th>Subtotal</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <table style="margin-top:16px;background:#f7f7f9;border-radius:8px;overflow:hidden">
        <tr><td style="padding:8px 12px;color:#666">Subtotal</td><td style="padding:8px 12px;text-align:right;font-variant-numeric:tabular-nums">R$ ${fmtR(subtotal)}</td></tr>
        ${descontoR > 0 ? `<tr><td style="padding:8px 12px;color:#2d8d4a">Desconto (${descontoPct}%)</td><td style="padding:8px 12px;text-align:right;color:#2d8d4a;font-variant-numeric:tabular-nums">− R$ ${fmtR(descontoR)}</td></tr>` : ''}
        <tr style="background:#e6f1fb"><td style="padding:14px 12px;font-weight:700;font-size:16px">Total</td><td class="total">R$ ${fmtR(total)}</td></tr>
      </table>
      <div class="footer">
        IDEMAQ Assistência Técnica · Naviraí/MS · Pagamento via PIX, cartão ou link InfinitePay<br>
        Orçamento válido por 7 dias.
      </div>
      <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
      </body></html>`)
    w.document.close()
  }

  function enviarWhatsApp() {
    const num = (os.fone || '').replace(/\D/g, '')
    if (!num) {
      alert('Cliente sem telefone cadastrado.')
      return
    }
    if (itensOrc.length === 0) {
      alert('Adicione pelo menos um item antes de enviar.')
      return
    }
    const linhas = itensOrc.map(i => `• ${i.nome}${i.qtd > 1 ? ` (${i.qtd}x)` : ''} — R$ ${fmtR(i.valor * i.qtd)}`).join('\n')
    const texto = `Olá ${os.cliente || ''}! 👋

Segue o orçamento da OS #${os.numero} (${[os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento || 'equipamento'}):

${linhas}
${descontoR > 0 ? `\nDesconto: R$ ${fmtR(descontoR)} (${descontoPct}%)\n` : '\n'}
*Total: R$ ${fmtR(total)}*

Pagamento via PIX, cartão ou link InfinitePay (D+1).
Aguardo sua aprovação pra começar o serviço. Qualquer dúvida estou aqui!`
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
  }

  function aprovar() {
    if (itensOrc.length === 0) {
      alert('Adicione pelo menos um item antes de aprovar.')
      return
    }
    if (!window.confirm(`Aprovar orçamento de R$ ${fmtR(total)} e avançar pra "Em oficina"?`)) return
    onMoverOS?.(os.numero, 'oficina')
    onClose?.()
  }

  function recusar() {
    if (!window.confirm('Cliente recusou o orçamento? A OS vai pra coluna "Recusado".')) return
    onMoverOS?.(os.numero, 'recusado')
    onClose?.()
  }

  return (
    <div style={{
      background: T.cardAlt, borderRadius: 9,
      padding: '14px 14px', border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header do bloco */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{
          fontSize: 11, color: T.textMuted, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
          textTransform: 'uppercase', letterSpacing: '.4px',
        }}>
          <i className="ti ti-file-dollar" style={{ fontSize: 14, color: amarelo }} aria-hidden="true" />
          Orçamento — único lugar onde se mexe em preço
        </div>
        {funcDiag && (
          <span style={{
            fontSize: 10, color: funcDiag.cor, fontWeight: 700,
            padding: '2px 7px', borderRadius: 10,
            background: funcDiag.cor + '22', border: `1px solid ${funcDiag.cor}33`,
          }}>
            Diag por {funcDiag.apelido}
          </span>
        )}
      </div>

      {/* === RELATÓRIO DO DIAGNÓSTICO === */}
      <div>
        <div style={{
          fontSize: 11, color: T.textDim, fontWeight: 600, marginBottom: 5,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-stethoscope" style={{ fontSize: 13 }} aria-hidden="true" />
          Relatório do diagnóstico
        </div>
        <textarea
          value={diagRelatorio}
          onChange={e => setDiagRelatorio(e.target.value)}
          placeholder="Descreva o que foi encontrado no diagnóstico — peças comprometidas, causa do defeito, recomendações…"
          rows={4}
          style={{
            width: '100%', padding: '10px 12px',
            background: T.bg, color: T.textPrimary,
            border: `1px solid ${T.border}`, borderRadius: 7,
            fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical',
            lineHeight: 1.5, boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 4 }}>
          Texto que entra no PDF do orçamento e na mensagem do WhatsApp.
        </div>
      </div>

      {/* === ATALHOS RÁPIDOS === */}
      <div>
        <div style={{
          fontSize: 11, color: T.textDim, fontWeight: 600, marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-bolt" style={{ fontSize: 13 }} aria-hidden="true" />
          Atalhos rápidos
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ATALHOS_ORCAMENTO.map(a => (
            <button key={a.nome} onClick={() => adicionarAtalho(a)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 14,
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = azul + '55'; e.currentTarget.style.color = azul }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary }}
            >
              <i className={`ti ${a.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
              {a.nome}
              <span style={{ color: T.textDim, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                · R$ {fmtR(a.valor)}
              </span>
              <i className="ti ti-plus" style={{ fontSize: 12, marginLeft: 2 }} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* === LISTA DE ITENS === */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 6,
        }}>
          <div style={{
            fontSize: 11, color: T.textDim, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className="ti ti-list-details" style={{ fontSize: 13 }} aria-hidden="true" />
            Itens do orçamento ({itensOrc.length})
          </div>
        </div>

        {itensOrc.length === 0 ? (
          <div style={{
            padding: '14px 12px', textAlign: 'center',
            fontSize: 11.5, color: T.textDim,
            background: T.bg, borderRadius: 7,
            border: `1px dashed ${T.border}`,
          }}>
            Nenhum item ainda — use os atalhos acima ou adicione manualmente abaixo.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {itensOrc.map((it, idx) => (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto auto',
                alignItems: 'center', gap: 8,
                padding: '8px 10px',
                background: T.bg, borderRadius: 6,
                fontSize: 12.5,
              }}>
                <i className={`ti ${it.tipo === 'servico' ? 'ti-tool' : 'ti-package'}`}
                  style={{ fontSize: 14, color: it.tipo === 'servico' ? azul : corEtapa('blueLight', dark) }}
                  aria-hidden="true" />
                <span style={{
                  color: T.textPrimary, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{it.nome}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button onClick={() => alterarQtd(idx, -1)}
                    disabled={it.qtd <= 1}
                    style={qtdBtnStyle(T, it.qtd <= 1)}>−</button>
                  <span style={{
                    minWidth: 22, textAlign: 'center', color: T.textSecondary,
                    fontVariantNumeric: 'tabular-nums', fontSize: 12,
                  }}>{it.qtd}</span>
                  <button onClick={() => alterarQtd(idx, 1)} style={qtdBtnStyle(T, false)}>+</button>
                </div>
                <span style={{
                  color: T.textSecondary, fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                  minWidth: 75, textAlign: 'right',
                }}>
                  R$ {fmtR(it.valor * it.qtd)}
                </span>
                <button onClick={() => removerItem(idx)}
                  title="Remover"
                  style={{
                    width: 24, height: 24, borderRadius: 5,
                    background: 'transparent', border: 'none',
                    color: T.textDim, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = vermelho; e.currentTarget.style.background = cor('#2a1515', '#fde8e8') }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.textDim; e.currentTarget.style.background = 'transparent' }}
                >
                  <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar item custom */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr 90px auto',
          gap: 6, marginTop: 8,
          padding: '8px 10px', background: T.bg, borderRadius: 6,
          border: `1px dashed ${T.border}`,
          alignItems: 'center',
        }}>
          <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} style={{
            padding: '5px 6px', fontSize: 11.5,
            background: T.cardAlt, color: T.textPrimary,
            border: `1px solid ${T.border}`, borderRadius: 5,
            fontFamily: 'inherit', cursor: 'pointer',
          }}>
            <option value="servico">Serviço</option>
            <option value="peca">Peça</option>
          </select>
          <input
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') adicionarCustom() }}
            placeholder="Nome do item personalizado"
            style={{
              padding: '5px 8px', fontSize: 12,
              background: T.cardAlt, color: T.textPrimary,
              border: `1px solid ${T.border}`, borderRadius: 5,
              fontFamily: 'inherit', minWidth: 0,
            }}
          />
          <input
            value={novoValor}
            onChange={e => setNovoValor(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') adicionarCustom() }}
            placeholder="R$"
            type="number" step="0.01" min="0"
            style={{
              padding: '5px 8px', fontSize: 12,
              background: T.cardAlt, color: T.textPrimary,
              border: `1px solid ${T.border}`, borderRadius: 5,
              fontFamily: 'inherit', textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <button onClick={adicionarCustom} style={{
            padding: '5px 10px', borderRadius: 5,
            background: azul, color: '#fff', border: 'none',
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 3,
            fontFamily: 'inherit',
          }}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
            Add
          </button>
        </div>
      </div>

      {/* === DESCONTO BIDIRECIONAL === */}
      <div>
        <div style={{
          fontSize: 11, color: T.textDim, fontWeight: 600, marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-tag" style={{ fontSize: 13 }} aria-hidden="true" />
          Desconto
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10.5, color: T.textDim, fontWeight: 500 }}>Valor (R$)</span>
            <input
              type="number" step="0.01" min="0" max={subtotal}
              value={descontoR}
              onChange={e => setDescR(e.target.value)}
              style={inputDescStyle(T)}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10.5, color: T.textDim, fontWeight: 500 }}>Percentual (%)</span>
            <input
              type="number" step="1" min="0" max="100"
              value={descontoPct}
              onChange={e => setDescP(e.target.value)}
              style={inputDescStyle(T)}
            />
          </label>
        </div>
      </div>

      {/* === RESUMO === */}
      <div style={{
        padding: '12px 14px',
        background: T.bg, borderRadius: 8,
        border: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textMuted }}>
          <span>Subtotal ({itensOrc.length} {itensOrc.length === 1 ? 'item' : 'itens'})</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>R$ {fmtR(subtotal)}</span>
        </div>
        {descontoR > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: azul }}>
            <span>Desconto ({descontoPct}%)</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>− R$ {fmtR(descontoR)}</span>
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 4, paddingTop: 8,
          borderTop: `1px solid ${T.border}`,
          alignItems: 'baseline',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>Total</span>
          <span style={{
            fontSize: 22, fontWeight: 800, color: tipoCor,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
          }}>
            R$ {fmtR(total)}
          </span>
        </div>
      </div>

      {/* === BOTÕES DE AÇÃO === */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Linha 1: gerar + enviar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={gerarOrcamento} style={btnSecStyle(T, dark)}>
            <i className="ti ti-printer" style={{ fontSize: 15 }} aria-hidden="true" />
            Gerar PDF
          </button>
          <button onClick={enviarWhatsApp} style={btnSecStyle(T, dark)}>
            <i className="ti ti-brand-whatsapp" style={{ fontSize: 15 }} aria-hidden="true" />
            Enviar ao cliente
          </button>
        </div>
        {/* Linha 2: aprovar + recusar */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <button onClick={aprovar} style={{
            padding: '12px 16px', borderRadius: 8, border: 'none',
            background: `linear-gradient(135deg, ${azul}, ${azul}cc)`,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: `0 2px 8px ${azul}33`,
          }}>
            <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />
            Cliente aprovou — começar serviço
          </button>
          <button onClick={recusar} style={{
            padding: '12px 12px', borderRadius: 8,
            background: cor('#2a1515', '#fde8e8'),
            color: vermelho, fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${vermelho}33`,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
            Recusou
          </button>
        </div>
      </div>
    </div>
  )
}

function qtdBtnStyle(T, disabled) {
  return {
    width: 22, height: 22, borderRadius: 4,
    background: disabled ? 'transparent' : T.cardAlt,
    border: `1px solid ${T.border}`,
    color: disabled ? T.textDim : T.textSecondary,
    fontSize: 13, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 1,
  }
}

function inputDescStyle(T) {
  return {
    padding: '8px 10px', fontSize: 13,
    background: T.bg, color: T.textPrimary,
    border: `1px solid ${T.border}`, borderRadius: 6,
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    width: '100%', boxSizing: 'border-box',
  }
}

function btnSecStyle(T, dark) {
  return {
    padding: '10px 14px', borderRadius: 8,
    background: T.cardAlt, color: T.textPrimary,
    border: `1px solid ${T.border}`,
    fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
}

// ─── Helpers visuais internos ─────────────────────────────────────────────────
function _DetCard({ icon, titulo, children, T }) {
  return (
    <div style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
      <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
        <i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />
        {titulo}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>{children}</div>
    </div>
  )
}

function _Linha({ label, valor, T, multi, mono }) {
  return (
    <div style={{ display:'flex', flexDirection:multi?'column':'row', justifyContent:'space-between', gap:multi?3:8, alignItems:'flex-start' }}>
      <span style={{ fontSize:11, color:T.textDim, flexShrink:0, fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:12.5, color:T.textPrimary, textAlign:multi?'left':'right', wordBreak:'break-word', lineHeight:1.4, fontFamily:mono?'ui-monospace,SFMono-Regular,monospace':'inherit', fontVariantNumeric:'tabular-nums' }}>
        {valor || '—'}
      </span>
    </div>
  )
}

function _DetMini({ icon, label, valor, T, cor }) {
  return (
    <div style={{ background:T.cardAlt, borderRadius:9, padding:'11px 12px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:9 }}>
      <i className={`ti ${icon}`} style={{ fontSize:17, color:cor||T.textMuted }} aria-hidden="true" />
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:10, color:T.textDim, marginBottom:2, fontWeight:500, textTransform:'uppercase', letterSpacing:'.3px' }}>{label}</div>
        <div style={{ fontSize:12.5, fontWeight:600, color:cor||T.textPrimary }}>{valor}</div>
      </div>
    </div>
  )
}

function _SubBox({ label, status, icon, T, dark }) {
  const cor = (d, c) => dark ? d : c
  const map = {
    concluido:    { c:cor(P.green,P.greenDark),   bg:cor('#0f2a15','#e8f5ec'), txt:'Concluída'    },
    em_andamento: { c:cor(P.yellow,P.yellowDark), bg:cor('#2a2000','#fdf6dc'), txt:'Em andamento' },
    aguardando:   { c:T.textMuted,                bg:T.bg,                    txt:'Aguardando'   },
  }
  const m = map[status] || map.aguardando
  return (
    <div style={{ background:m.bg, border:`1px solid ${m.c}33`, borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:9 }}>
      <i className={`ti ${icon}`} style={{ fontSize:18, color:m.c }} aria-hidden="true" />
      <div>
        <div style={{ fontSize:11, color:T.textMuted, marginBottom:1, fontWeight:500 }}>{label}</div>
        <div style={{ fontSize:12.5, fontWeight:700, color:m.c }}>{m.txt}</div>
      </div>
    </div>
  )
}
