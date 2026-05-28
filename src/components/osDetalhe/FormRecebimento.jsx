// src/components/osDetalhe/FormRecebimento.jsx
// Form de recebimento — Apple HIG rewrite.
// Toda a lógica de negócio preservada; só o visual trocado pra HIG.

import React, { useState, useEffect } from 'react'
import { TI } from '../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_SIZE, HIG_RADIUS, HIG_COLOR, HIG_FONT,
  higType, higFilledButton, higInsetCard,
} from '../../theme-hig'
import { fmtBRL } from '../../utils/fmt'
import { useToast } from '../ui'

// ─── Taxas InfinitePay Maxi 1 ────────────────────────────────────────────────
const TAXA_CREDITO = {
  1: 3.15, 2: 4.46, 3: 4.99, 4: 5.52, 5: 6.05, 6: 6.58,
  7: 7.11, 8: 7.64, 9: 8.17, 10: 8.70, 11: 9.23, 12: 9.76,
}
const LINK_ACRESCIMO = 0.90
const taxaLink = (p) => (TAXA_CREDITO[p] || 0) + LINK_ACRESCIMO

const SUB_CARTAO = [
  { id: 'debito',  label: 'Débito',           icon: 'credit-card', fixed: 1.37 },
  { id: 'credito', label: 'Crédito',          icon: 'credit-card', parcelado: true, getTaxa: (p) => TAXA_CREDITO[p] || 0, desc: '1x–12x' },
  { id: 'link',    label: 'Link InfinitePay', icon: 'link',        parcelado: true, getTaxa: taxaLink,                    desc: '1x–12x' },
]

// ─── formaIdToLabel (exportado — usado por outras telas) ──────────────────────
export function formaIdToLabel(id) {
  if (!id) return ''
  if (id === 'pix')      return 'PIX'
  if (id === 'dinheiro') return 'Dinheiro'
  if (id === 'debito')   return 'Débito'
  if (id === 'aprazo')   return 'A prazo'
  let m = id.match?.(/^credito_(\d+)x$/)
  if (m) return `Crédito ${m[1]}x`
  m = id.match?.(/^link_(\d+)x$/)
  if (m) return `Link ${m[1]}x`
  if (id === 'credito1x') return 'Crédito 1x'
  if (id === 'link')      return 'Link'
  m = id.match?.(/^parcelado_(\d+)x$/)
  if (m) return `Crédito ${m[1]}x`
  return id
}

// ─── HIGSection ───────────────────────────────────────────────────────────────
function HIGSection({ T, dark, title, children, footer }) {
  return (
    <section>
      <div style={{
        ...higType('footnote'), color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.5,
        padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
      }}>{title}</div>
      <div style={higInsetCard(T, dark)}>{children}</div>
      {footer && (
        <div style={{
          ...higType('footnote'), color: T.textMuted,
          padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0`,
        }}>{footer}</div>
      )}
    </section>
  )
}

// ─── Sep ─────────────────────────────────────────────────────────────────────
function Sep({ T, indent = 0 }) {
  return <div style={{ height: 0.5, background: T.border, marginLeft: indent, opacity: 0.7 }} />
}

// ─── FormaRow — list row de seleção de forma ──────────────────────────────────
function FormaRow({ T, dark, icon, iconColor, label, sublabel, taxa, selected, onClick, separator }) {
  return (
    <>
      <button type="button" onClick={onClick} style={{
        width: '100%', minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        cursor: 'pointer', fontFamily: HIG_FONT,
        WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: iconColor + '22', color: iconColor,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TI name={icon} size={15} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...higType('body'), color: T.textPrimary }}>{label}</div>
          {sublabel && <div style={{ ...higType('caption1'), color: T.textMuted }}>{sublabel}</div>}
        </div>
        {taxa != null && (
          <span style={{ ...higType('caption1'), color: T.textMuted, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {taxa === 0 ? 'Sem taxa' : `${taxa.toFixed(2).replace('.', ',')}%`}
          </span>
        )}
        {selected
          ? <TI name="check" size={16} color={HIG_COLOR.tintIdemaq} />
          : <span style={{ width: 16 }} />}
      </button>
      {separator && <Sep T={T} indent={HIG_SPACE.md + 28 + HIG_SPACE.sm} />}
    </>
  )
}

// ─── SubCartaoRow ─────────────────────────────────────────────────────────────
function SubCartaoRow({ T, dark, sub, selected, onClick, parcelas, setParcelas, taxaAtual, separator }) {
  return (
    <>
      <button type="button" onClick={onClick} style={{
        width: '100%', minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        cursor: 'pointer', fontFamily: HIG_FONT,
        WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: HIG_COLOR.tintIdemaq + '22', color: HIG_COLOR.tintIdemaq,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TI name={sub.icon} size={15} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...higType('body'), color: T.textPrimary }}>
            {sub.label}
            {sub.desc && <span style={{ ...higType('caption1'), color: T.textMuted, marginLeft: 5 }}>· {sub.desc}</span>}
          </div>
        </div>
        {taxaAtual != null && (
          <span style={{ ...higType('caption1'), color: T.textMuted, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {taxaAtual.toFixed(2).replace('.', ',')}%
          </span>
        )}
        {selected
          ? <TI name="check" size={16} color={HIG_COLOR.tintIdemaq} />
          : <span style={{ width: 16 }} />}
      </button>

      {/* Seletor de parcelas — aparece inline quando sub parcelado está selecionado */}
      {sub.parcelado && selected && (
        <div style={{ padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.sm}px ${HIG_SPACE.md + 28 + HIG_SPACE.sm}px` }}>
          <div style={{ ...higType('caption2'), color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: HIG_SPACE.xs }}>
            Parcelas
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(p => {
              const sel = parcelas === p
              return (
                <button key={p} type="button"
                  onClick={e => { e.stopPropagation(); setParcelas(p) }}
                  style={{
                    padding: '5px 2px', borderRadius: 6,
                    border: `1px solid ${sel ? HIG_COLOR.tintIdemaq : T.border}`,
                    background: sel ? HIG_COLOR.tintIdemaq : 'transparent',
                    color: sel ? '#fff' : T.textSecondary,
                    ...higType('caption1'), fontWeight: 700,
                    cursor: 'pointer', fontFamily: HIG_FONT,
                    fontVariantNumeric: 'tabular-nums',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  {p}x
                </button>
              )
            })}
          </div>
        </div>
      )}

      {separator && <Sep T={T} indent={HIG_SPACE.md + 28 + HIG_SPACE.sm} />}
    </>
  )
}

// ─── PartialDialog — inline HIGSection ───────────────────────────────────────
function PartialDialog({ T, dark, valor, saldo, onParcial, onDesconto, onCancelar }) {
  const falta = saldo - valor
  return (
    <HIGSection T={T} dark={dark} title="Como registrar?">
      <button type="button" onClick={onParcial} style={{
        width: '100%', minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
        border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'flex-start', gap: HIG_SPACE.sm,
        cursor: 'pointer', fontFamily: HIG_FONT, textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{ width:28, height:28, borderRadius:6, flexShrink:0, background: HIG_COLOR.tintIdemaq+'22', color: HIG_COLOR.tintIdemaq, display:'inline-flex', alignItems:'center', justifyContent:'center', marginTop:1 }}>
          <TI name="circle-half" size={15} />
        </span>
        <div>
          <div style={{ ...higType('body'), color: T.textPrimary, fontWeight: 600 }}>Dar baixa parcial</div>
          <div style={{ ...higType('caption1'), color: T.textMuted, marginTop: 2 }}>
            OS continua aberta com <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(falta)}</strong> a receber
          </div>
        </div>
        <TI name="chevron-right" size={14} color={T.textDim} style={{ marginLeft: 'auto', flexShrink: 0, marginTop: 4 }} />
      </button>
      <Sep T={T} indent={HIG_SPACE.md + 28 + HIG_SPACE.sm} />
      <button type="button" onClick={onDesconto} style={{
        width: '100%', minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
        border: 'none', background: 'transparent',
        display: 'flex', alignItems: 'flex-start', gap: HIG_SPACE.sm,
        cursor: 'pointer', fontFamily: HIG_FONT, textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{ width:28, height:28, borderRadius:6, flexShrink:0, background: HIG_COLOR.green+'22', color: HIG_COLOR.green, display:'inline-flex', alignItems:'center', justifyContent:'center', marginTop:1 }}>
          <TI name="discount-2" size={15} />
        </span>
        <div>
          <div style={{ ...higType('body'), color: T.textPrimary, fontWeight: 600 }}>Quitar com desconto</div>
          <div style={{ ...higType('caption1'), color: T.textMuted, marginTop: 2 }}>
            Aplica <strong style={{ fontVariantNumeric: 'tabular-nums' }}>−{fmtBRL(falta)}</strong> de desconto e marca como pago total
          </div>
        </div>
        <TI name="chevron-right" size={14} color={T.textDim} style={{ marginLeft: 'auto', flexShrink: 0, marginTop: 4 }} />
      </button>
      <Sep T={T} />
      <button type="button" onClick={onCancelar} style={{
        width: '100%', minHeight: 44,
        border: 'none', background: 'transparent',
        ...higType('body'), color: HIG_COLOR.tintIdemaq,
        cursor: 'pointer', fontFamily: HIG_FONT,
        WebkitTapHighlightColor: 'transparent',
      }}>
        Cancelar
      </button>
    </HIGSection>
  )
}

// ─── ParcelasAPrazoPanel ──────────────────────────────────────────────────────
function dataMaisDiasISO(n) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function addDiasISO(iso, n) {
  if (!iso) return dataMaisDiasISO(n)
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function ParcelasAPrazoPanel({ T, dark, valor, parcelas, total, ok, onAdd, onUpdate, onRemove }) {
  const diff = valor - total
  return (
    <HIGSection T={T} dark={dark}
      title={`Agenda de parcelas · ${parcelas.length}`}
      footer={ok
        ? `Total ${fmtBRL(total)} — bate com o valor`
        : `Total ${fmtBRL(total)} — ${diff > 0 ? `falta ${fmtBRL(diff)}` : `${fmtBRL(-diff)} a mais`}`}
    >
      {parcelas.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Sep T={T} indent={HIG_SPACE.md} />}
          <div style={{
            minHeight: HIG_SIZE.listRow,
            padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
          }}>
            <span style={{ ...higType('caption1'), color: T.textMuted, width: 24, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {i + 1}ª
            </span>
            <input type="date" value={p.data || ''} onChange={e => onUpdate(i, 'data', e.target.value)}
              style={{
                flex: 1, padding: '6px 8px', borderRadius: HIG_RADIUS.small,
                border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                ...higType('subheadline'), outline: 'none', fontFamily: HIG_FONT,
                colorScheme: dark ? 'dark' : 'light',
              }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ ...higType('caption1'), color: T.textMuted }}>R$</span>
              <input type="number" min="0" step="0.01" value={p.valor}
                onChange={e => onUpdate(i, 'valor', Number(e.target.value) || 0)}
                style={{
                  width: 72, padding: '6px 8px', borderRadius: HIG_RADIUS.small,
                  border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                  ...higType('subheadline'), textAlign: 'right', outline: 'none', fontFamily: HIG_FONT,
                  fontVariantNumeric: 'tabular-nums',
                }} />
            </div>
            <button type="button" onClick={() => onRemove(i)} disabled={parcelas.length <= 1}
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'transparent', cursor: parcelas.length <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: parcelas.length <= 1 ? 0.3 : 1,
                WebkitTapHighlightColor: 'transparent',
              }}>
              <TI name="x" size={14} color={T.textMuted} />
            </button>
          </div>
        </React.Fragment>
      ))}
      <Sep T={T} />
      <button type="button" onClick={onAdd} style={{
        width: '100%', minHeight: 44,
        border: 'none', background: 'transparent',
        ...higType('body'), color: HIG_COLOR.tintIdemaq,
        cursor: 'pointer', fontFamily: HIG_FONT,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: HIG_SPACE.xs,
        WebkitTapHighlightColor: 'transparent',
      }}>
        <TI name="plus" size={15} color={HIG_COLOR.tintIdemaq} />
        Adicionar parcela
      </button>
    </HIGSection>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════════
export default function FormRecebimento({
  T, dark,
  saldo,
  onConfirmar,
  onEnviarLink,
  onGerarPix,
  showAtalhos = true,
}) {
  const notify = useToast()

  const [valor, setValor]           = useState(saldo)
  const [forma, setForma]           = useState('pix')
  const [subCartao, setSubCartao]   = useState(null)
  const [parcelas, setParcelas]     = useState(1)
  const [parcelasAPrazo, setParcelasAPrazo] = useState([])
  const [partialDialog, setPartialDialog]   = useState(false)

  useEffect(() => { setValor(saldo) }, [saldo])

  useEffect(() => {
    if (forma === 'cartao' && !subCartao) setSubCartao('debito')
  }, [forma, subCartao])

  useEffect(() => {
    if (forma === 'aprazo' && parcelasAPrazo.length === 0) {
      setParcelasAPrazo([{ data: dataMaisDiasISO(30), valor: valor || saldo }])
    }
  }, [forma, parcelasAPrazo.length, valor, saldo])

  // ─── Cálculos ──────────────────────────────────────────────────────────────
  function formaIdFinal() {
    if (forma === 'pix')      return 'pix'
    if (forma === 'dinheiro') return 'dinheiro'
    if (forma === 'aprazo')   return `aprazo_${parcelasAPrazo.length}x`
    const sub = SUB_CARTAO.find(s => s.id === subCartao)
    if (!sub) return 'debito'
    if (sub.parcelado) return `${sub.id}_${parcelas}x`
    return sub.id
  }

  function taxaAtual() {
    if (forma === 'pix' || forma === 'dinheiro' || forma === 'aprazo') return 0
    const sub = SUB_CARTAO.find(s => s.id === subCartao)
    if (!sub) return 0
    if (sub.fixed != null) return sub.fixed
    if (sub.getTaxa)       return sub.getTaxa(parcelas)
    return 0
  }

  const totalParcelasAPrazo = parcelasAPrazo.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const parcelasAPrazoOk = forma !== 'aprazo' || (
    parcelasAPrazo.length > 0 &&
    parcelasAPrazo.every(p => p.data && Number(p.valor) > 0) &&
    Math.abs(totalParcelasAPrazo - valor) < 0.01
  )
  const taxa      = taxaAtual()
  const liquido   = taxa > 0 ? valor - (valor * taxa / 100) : valor
  const isParcial = valor < saldo - 0.01
  const isExcedente = valor > saldo + 0.01
  const formaOk   = (
    forma === 'pix' || forma === 'dinheiro' ||
    (forma === 'aprazo' && parcelasAPrazoOk) ||
    (forma === 'cartao' && !!subCartao)
  )
  const valorOk = valor > 0 && !isExcedente

  // ─── CRUD parcelas a prazo ─────────────────────────────────────────────────
  function addParcelaAPrazo() {
    setParcelasAPrazo(prev => {
      const totalAnt = prev.reduce((s, p) => s + (Number(p.valor) || 0), 0)
      const restante = Math.max(0, valor - totalAnt)
      const ultimaData = prev.length > 0 ? prev[prev.length - 1].data : dataMaisDiasISO(0)
      return [...prev, { data: addDiasISO(ultimaData, 30), valor: restante }]
    })
  }
  function updateParcelaAPrazo(i, field, v) {
    setParcelasAPrazo(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: v } : p))
  }
  function removeParcelaAPrazo(i) {
    setParcelasAPrazo(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i))
  }

  // ─── Ações ─────────────────────────────────────────────────────────────────
  function clickConfirmar() {
    if (!formaOk || !valorOk) return
    if (forma === 'aprazo') {
      onConfirmar({ valor, forma: formaIdFinal(), modo: 'total', taxa_pct: taxa, parcelas: parcelasAPrazo.map(p => ({ ...p, valor: Number(p.valor) || 0 })) })
      return
    }
    if (isParcial) { setPartialDialog(true) }
    else           { onConfirmar({ valor, forma: formaIdFinal(), modo: 'total', taxa_pct: taxa }) }
  }

  function confirmarParcial()    { onConfirmar({ valor, forma: formaIdFinal(), modo: 'parcial',  taxa_pct: taxa }); setPartialDialog(false) }
  function confirmarComDesconto(){ onConfirmar({ valor, forma: formaIdFinal(), modo: 'desconto', taxa_pct: taxa }); setPartialDialog(false) }

  const taxaSubCartao = (s) => s.fixed != null ? s.fixed : (s.getTaxa ? s.getTaxa(parcelas) : null)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg, fontFamily: HIG_FONT }}>

      {/* 1. Valor */}
      <HIGSection T={T} dark={dark} title="Valor a receber">
        <div style={{
          minHeight: HIG_SIZE.listRow, padding: `0 ${HIG_SPACE.md}px`,
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        }}>
          <span style={{ ...higType('body'), color: T.textMuted, flexShrink: 0 }}>R$</span>
          <input
            type="number" min="0" max={saldo} step="0.01"
            value={valor}
            onChange={e => setValor(Math.max(0, Math.min(saldo, Number(e.target.value) || 0)))}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 22, fontWeight: 700, color: T.textPrimary,
              textAlign: 'right', fontFamily: HIG_FONT,
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        </div>
        {valor !== saldo && saldo > 0 && (
          <>
            <Sep T={T} indent={HIG_SPACE.md} />
            <button type="button" onClick={() => setValor(saldo)} style={{
              width: '100%', minHeight: 44,
              border: 'none', background: 'transparent',
              ...higType('body'), color: HIG_COLOR.tintIdemaq,
              cursor: 'pointer', fontFamily: HIG_FONT, textAlign: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
              Receber tudo · {fmtBRL(saldo)}
            </button>
          </>
        )}
      </HIGSection>

      {/* 2. Forma de pagamento */}
      <HIGSection T={T} dark={dark} title="Forma de pagamento">
        <FormaRow T={T} dark={dark} icon="brand-pinterest" iconColor="#00C853" label="PIX"      sublabel="Transferência instantânea" taxa={0} selected={forma==='pix'}      onClick={()=>setForma('pix')}      separator />
        <FormaRow T={T} dark={dark} icon="credit-card"    iconColor={HIG_COLOR.tintIdemaq}      label="Cartão"  sublabel="Débito · Crédito · Link"       selected={forma==='cartao'}   onClick={()=>setForma('cartao')}   separator />
        <FormaRow T={T} dark={dark} icon="coins"          iconColor={HIG_COLOR.orange}          label="Dinheiro" sublabel="Espécie"                      taxa={0} selected={forma==='dinheiro'} onClick={()=>setForma('dinheiro')} separator />
        <FormaRow T={T} dark={dark} icon="clock"          iconColor={HIG_COLOR.gray}            label="A prazo" sublabel="Fiado — agenda de parcelas"    selected={forma==='aprazo'}   onClick={()=>setForma('aprazo')} />
      </HIGSection>

      {/* 3. Sub-leque do Cartão */}
      {forma === 'cartao' && (
        <HIGSection T={T} dark={dark} title="Tipo de cartão">
          {SUB_CARTAO.map((s, i) => (
            <SubCartaoRow key={s.id}
              T={T} dark={dark} sub={s}
              selected={subCartao === s.id}
              onClick={() => setSubCartao(s.id)}
              parcelas={parcelas} setParcelas={setParcelas}
              taxaAtual={taxaSubCartao(s)}
              separator={i < SUB_CARTAO.length - 1}
            />
          ))}
        </HIGSection>
      )}

      {/* 4. Agenda de parcelas a prazo */}
      {forma === 'aprazo' && (
        <ParcelasAPrazoPanel
          T={T} dark={dark}
          valor={valor}
          parcelas={parcelasAPrazo}
          total={totalParcelasAPrazo}
          ok={parcelasAPrazoOk}
          onAdd={addParcelaAPrazo}
          onUpdate={updateParcelaAPrazo}
          onRemove={removeParcelaAPrazo}
        />
      )}

      {/* 5. Info de taxa */}
      {taxa > 0 && valor > 0 && (
        <div style={{
          ...higType('footnote'), color: T.textMuted,
          padding: `0 ${HIG_SPACE.md}px`,
        }}>
          Após taxa de {taxa.toFixed(2).replace('.', ',')}%, você recebe ~<strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(liquido)}</strong>
        </div>
      )}

      {/* 6. Dialog de valor parcial ou CTA confirmar */}
      {partialDialog ? (
        <PartialDialog
          T={T} dark={dark}
          valor={valor} saldo={saldo}
          onParcial={confirmarParcial}
          onDesconto={confirmarComDesconto}
          onCancelar={() => setPartialDialog(false)}
        />
      ) : (
        <button type="button" onClick={clickConfirmar} disabled={!formaOk || !valorOk} style={{
          ...higFilledButton(T, dark),
          opacity: (formaOk && valorOk) ? 1 : 0.35,
          cursor:  (formaOk && valorOk) ? 'pointer' : 'not-allowed',
        }}>
          <TI name="check" size={18} />
          Confirmar {fmtBRL(valor)}{!isParcial && saldo > 0 ? ' · concluir' : ''}
        </button>
      )}

    </div>
  )
}
