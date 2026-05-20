// src/components/financeiro/NovoLancamentoModal.jsx
// Lançamento: avulso (1 linha), parcelado (N parcelas) ou recorrente (N repetições).
//
// Schema do payload por linha (igual em todos os modos), aceito por useFinanceiro.criar():
//   { tipo, valor, vencimento, pago_em?, categoria, descricao, conta_id?,
//     forma_pagamento?, taxa_pct?, os_id? }
//
// Parcelado e recorrente geram N payloads e chamam onCriar() em Promise.all.

import React, { useState, useMemo } from 'react'
import { Modal, Button, useToast } from '../ui'
import { corEtapa } from '../../utils/colors'
import { CATEGORIAS_SUGESTAO } from '../../hooks/useFinanceiro'

const FORMAS = [
  { id: 'pix',                label: 'PIX',                temTaxa: false },
  { id: 'dinheiro',           label: 'Dinheiro',           temTaxa: false },
  { id: 'debito',             label: 'Cartão débito',      temTaxa: true  },
  { id: 'credito_1x',         label: 'Cartão 1x',          temTaxa: true  },
  { id: 'credito_parcelado',  label: 'Cartão parcelado',   temTaxa: true  },
  { id: 'link_pagamento',     label: 'Link InfinitePay',   temTaxa: true  },
  { id: 'boleto',             label: 'Boleto',             temTaxa: false },
  { id: 'transferencia',      label: 'Transferência',      temTaxa: false },
]

const MODOS = [
  { id: 'avulso',     label: 'Avulso',     icon: 'ti-receipt',     desc: '1 lançamento' },
  { id: 'parcelado',  label: 'Parcelado',  icon: 'ti-credit-card', desc: 'Total ÷ N parcelas' },
  { id: 'recorrente', label: 'Recorrente', icon: 'ti-repeat',      desc: 'Repete todo mês' },
]

const INTERVALO_RECORRENTE = [
  { id: 'mensal',      label: 'Mensal (mesmo dia)' },
  { id: 'customizado', label: 'A cada N dias' },
]

const hojeISO = () => new Date().toISOString().slice(0, 10)

// Soma `days` ao ISO 'YYYY-MM-DD' (sem timezone). Não muta input.
function addDaysISO(iso, days) {
  if (!iso) return iso
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Soma `months` ao ISO. JS rola pra próximo mês se dia não existir (31/01+1 → 02/03).
function addMonthsISO(iso, months) {
  if (!iso) return iso
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

// Formata ISO 'YYYY-MM-DD' → 'DD/MM' (preview compacto)
function fmtDataCurta(iso) {
  if (!iso || iso.length < 10) return iso || '—'
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

function fmtBRL(n) {
  const v = Number(n) || 0
  return v.toFixed(2).replace('.', ',')
}

export default function NovoLancamentoModal({
  T, dark,
  contas = [],              // [{ id, nome, tipo }]
  onClose,
  onCriar,                  // async (payload) => { data, error }
  tipoInicial = 'receita',  // 'receita' | 'despesa'
}) {
  const notify = useToast()
  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)

  // ─── Estado do form ─────────────────────────────────────────────────────────
  const [modo,        setModo]        = useState('avulso')   // 'avulso'|'parcelado'|'recorrente'
  const [tipo,        setTipo]        = useState(tipoInicial) // 'receita'|'despesa'
  const [valor,       setValor]       = useState('')
  const [vencimento,  setVencimento]  = useState(hojeISO())
  const [jaPago,      setJaPago]      = useState(false)
  const [pagoEm,      setPagoEm]      = useState(hojeISO())
  const [categoria,   setCategoria]   = useState('')
  const [descricao,   setDescricao]   = useState('')
  const [contaId,     setContaId]     = useState('')
  const [formaPagto,  setFormaPagto]  = useState('pix')
  const [taxaPct,     setTaxaPct]     = useState('')
  const [salvando,    setSalvando]    = useState(false)

  // ─── Estado modo Parcelado ──────────────────────────────────────────────────
  const [nParcelas,        setNParcelas]        = useState(2)
  const [intervaloParcDias,setIntervaloParcDias]= useState(30)

  // ─── Estado modo Recorrente ─────────────────────────────────────────────────
  const [nRepeticoes,      setNRepeticoes]      = useState(2)
  const [tipoIntervaloRec, setTipoIntervaloRec] = useState('mensal') // 'mensal'|'customizado'
  const [intervaloRecDias, setIntervaloRecDias] = useState(30)

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const corTipo = tipo === 'receita' ? azul : amarelo
  const labelTipo = tipo === 'receita' ? 'Receita' : 'Despesa'
  const categoriasSugestao = CATEGORIAS_SUGESTAO[tipo] || []
  const formaSel = FORMAS.find(f => f.id === formaPagto)
  const mostraTaxa = modo === 'avulso' && jaPago && formaSel?.temTaxa

  const valorNumero = Number(String(valor).replace(',', '.')) || 0
  const taxaNumero  = Number(String(taxaPct).replace(',', '.')) || 0

  // Label do campo "valor" muda por modo
  const labelValor = modo === 'parcelado'
    ? 'Valor TOTAL (será dividido)'
    : modo === 'recorrente'
      ? 'Valor de CADA lançamento'
      : 'Valor'

  // Label do campo "vencimento" muda por modo
  const labelVencimento = modo === 'parcelado'
    ? 'Data da 1ª parcela'
    : modo === 'recorrente'
      ? 'Data do 1º lançamento'
      : 'Vencimento'

  // ─── Preview das parcelas/repetições ────────────────────────────────────────
  const preview = useMemo(() => {
    if (modo === 'avulso') return []
    if (!vencimento || !valorNumero) return []

    if (modo === 'parcelado') {
      const n = Math.max(2, Math.min(12, Number(nParcelas) || 2))
      const intervalo = Math.max(1, Number(intervaloParcDias) || 30)
      const valorParc = +(valorNumero / n).toFixed(2)
      // Última parcela ajusta resíduo de centavos pra somar exato
      const soma = +(valorParc * n).toFixed(2)
      const residuo = +(valorNumero - soma).toFixed(2)
      return Array.from({ length: n }, (_, i) => ({
        idx: i + 1,
        total: n,
        vencimento: addDaysISO(vencimento, i * intervalo),
        valor: i === n - 1 ? +(valorParc + residuo).toFixed(2) : valorParc,
        descricao: `${descricao.trim() || 'Lançamento'} — ${i + 1}/${n}`,
      }))
    }

    // recorrente
    const n = Math.max(2, Math.min(24, Number(nRepeticoes) || 2))
    return Array.from({ length: n }, (_, i) => {
      let venc = vencimento
      if (i > 0) {
        venc = tipoIntervaloRec === 'mensal'
          ? addMonthsISO(vencimento, i)
          : addDaysISO(vencimento, i * Math.max(1, Number(intervaloRecDias) || 30))
      }
      return {
        idx: i + 1,
        total: n,
        vencimento: venc,
        valor: valorNumero,
        descricao: `${descricao.trim() || 'Lançamento'} — ${i + 1}/${n}`,
      }
    })
  }, [
    modo, vencimento, valorNumero, descricao,
    nParcelas, intervaloParcDias,
    nRepeticoes, tipoIntervaloRec, intervaloRecDias,
  ])

  const totalPreview = useMemo(() => preview.reduce((s, l) => s + l.valor, 0), [preview])

  // ─── Validação ──────────────────────────────────────────────────────────────
  const erros = useMemo(() => {
    const e = []
    if (!valorNumero || valorNumero <= 0) e.push('Valor obrigatório (> 0)')
    if (!vencimento) e.push('Data obrigatória')
    if (!categoria.trim()) e.push('Categoria obrigatória')
    if (!descricao.trim()) e.push('Descrição obrigatória')

    if (modo === 'avulso') {
      if (jaPago && !pagoEm) e.push('Data do pagamento obrigatória')
    }
    if (modo === 'parcelado') {
      const n = Number(nParcelas) || 0
      if (n < 2 || n > 12) e.push('Nº de parcelas entre 2 e 12')
      if (!intervaloParcDias || intervaloParcDias < 1) e.push('Intervalo entre parcelas inválido')
    }
    if (modo === 'recorrente') {
      const n = Number(nRepeticoes) || 0
      if (n < 2 || n > 24) e.push('Nº de repetições entre 2 e 24')
      if (tipoIntervaloRec === 'customizado' && (!intervaloRecDias || intervaloRecDias < 1)) {
        e.push('Intervalo em dias inválido')
      }
    }
    return e
  }, [
    valorNumero, vencimento, categoria, descricao,
    modo, jaPago, pagoEm,
    nParcelas, intervaloParcDias,
    nRepeticoes, tipoIntervaloRec, intervaloRecDias,
  ])

  const podeSalvar = erros.length === 0 && !salvando

  // ─── Salvar ─────────────────────────────────────────────────────────────────
  function montarPayloadAvulso() {
    return [{
      tipo,
      valor: valorNumero,
      vencimento,
      pago_em: jaPago ? pagoEm : null,
      categoria: categoria.trim(),
      descricao: descricao.trim(),
      conta_id: contaId || null,
      forma_pagamento: jaPago ? formaPagto : null,
      taxa_pct: mostraTaxa ? taxaNumero : 0,
    }]
  }

  function montarPayloadsLote() {
    return preview.map(p => ({
      tipo,
      valor: p.valor,
      vencimento: p.vencimento,
      pago_em: null,
      categoria: categoria.trim(),
      descricao: p.descricao,
      conta_id: contaId || null,
      forma_pagamento: null,
      taxa_pct: 0,
    }))
  }

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)

    const payloads = modo === 'avulso' ? montarPayloadAvulso() : montarPayloadsLote()
    const resultados = await Promise.all(payloads.map(p => onCriar(p)))
    setSalvando(false)

    const erradas = resultados.filter(r => r?.error)
    if (erradas.length > 0) {
      const primeira = erradas[0].error
      if (primeira.code === 'OFFLINE') {
        notify('info', 'Modo demo: lançamentos não persistem. Aplique sql/01 no Supabase.')
      } else {
        notify('erro',
          erradas.length === payloads.length
            ? `Falha ao salvar: ${primeira.message || 'erro desconhecido'}`
            : `${erradas.length}/${payloads.length} falharam — alguns foram salvos`
        )
      }
      return
    }

    if (modo === 'avulso') {
      notify('ok', `${labelTipo} criada: ${descricao.slice(0, 40)}`)
    } else {
      const verbo = modo === 'parcelado' ? 'parcelas criadas' : 'lançamentos criados'
      notify('ok', `${payloads.length} ${verbo} — ${descricao.slice(0, 40)}`)
    }
    onClose?.()
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal T={T} dark={dark} onClose={onClose} maxWidth={560}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${corTipo}22`, color: corTipo,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-plus" style={{ fontSize: 17 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>
            Novo lançamento
          </div>
          <div style={{ fontSize: 11, color: T.textMuted }}>
            {labelTipo}
            {modo === 'avulso'     && (jaPago ? ' · já paga' : ' · em aberto')}
            {modo === 'parcelado'  && ` · parcelado em ${nParcelas}x`}
            {modo === 'recorrente' && ` · ${nRepeticoes} repetições`}
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar"
          style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'transparent', border: 'none', color: T.textMuted,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <i className="ti ti-x" style={{ fontSize: 17 }} aria-hidden="true" />
        </button>
      </div>

      {/* Corpo */}
      <div style={{
        padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 12,
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        {/* Modo (avulso / parcelado / recorrente) */}
        <div>
          <Label T={T}>Tipo de lançamento</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {MODOS.map(m => (
              <ModoBtn key={m.id}
                T={T} dark={dark} cor={azul}
                ativo={modo === m.id}
                onClick={() => setModo(m.id)}
                icon={m.icon} label={m.label} desc={m.desc} />
            ))}
          </div>
        </div>

        {/* Toggle tipo (receita/despesa) */}
        <div>
          <Label T={T}>Natureza</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <TipoBtn T={T} cor={azul}
              ativo={tipo === 'receita'} onClick={() => setTipo('receita')}
              icon="ti-arrow-down-circle" label="Receita" />
            <TipoBtn T={T} cor={amarelo}
              ativo={tipo === 'despesa'} onClick={() => setTipo('despesa')}
              icon="ti-arrow-up-circle" label="Despesa" />
          </div>
        </div>

        {/* Valor */}
        <div>
          <Label T={T}>{labelValor}</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>R$</span>
            <input
              type="number" min="0" step="0.01" value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 7,
                border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                outline: 'none', textAlign: 'right',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <Label T={T}>Descrição</Label>
          <input
            type="text" value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={
              modo === 'recorrente' ? 'Ex: Salário Alessandro'
              : modo === 'parcelado' ? 'Ex: Compra de peças ML — março'
              : tipo === 'receita' ? 'Ex: João Silva — Limpeza'
              : 'Ex: Compra de peças ML'
            }
            style={inputStyle(T)}
          />
          {modo !== 'avulso' && (
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>
              Cada linha vai receber " — 1/N", " — 2/N", etc.
            </div>
          )}
        </div>

        {/* Categoria */}
        <div>
          <Label T={T}>Categoria</Label>
          <input
            type="text" list="categorias-sugestao"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Digite ou escolha..."
            style={inputStyle(T)}
          />
          <datalist id="categorias-sugestao">
            {categoriasSugestao.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        {/* Conta bancária */}
        <div>
          <Label T={T}>Conta bancária <span style={{ color: T.textDim, fontWeight: 400, textTransform: 'none' }}>· opcional</span></Label>
          <select value={contaId} onChange={(e) => setContaId(e.target.value)}
            style={inputStyle(T)}>
            <option value="">— sem conta definida —</option>
            {contas.map(c => (
              <option key={c.id} value={c.id}>{c.nome}{c.tipo ? ` (${c.tipo})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Vencimento / Data inicial */}
        <div>
          <Label T={T}>{labelVencimento}</Label>
          <input type="date" value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            style={{ ...inputStyle(T), colorScheme: dark ? 'dark' : 'light' }} />
        </div>

        {/* ───── PARCELADO ───── */}
        {modo === 'parcelado' && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            padding: 10, borderRadius: 8,
            background: `${azul}0d`, border: `1px solid ${azul}33`,
          }}>
            <div>
              <Label T={T}>Nº de parcelas</Label>
              <select value={nParcelas}
                onChange={(e) => setNParcelas(Number(e.target.value))}
                style={inputStyle(T)}>
                {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
            <div>
              <Label T={T}>Intervalo (dias)</Label>
              <input type="number" min="1" max="365" value={intervaloParcDias}
                onChange={(e) => setIntervaloParcDias(Number(e.target.value))}
                style={inputStyle(T)} />
            </div>
          </div>
        )}

        {/* ───── RECORRENTE ───── */}
        {modo === 'recorrente' && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: 10, borderRadius: 8,
            background: `${azul}0d`, border: `1px solid ${azul}33`,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label T={T}>Quantas repetições</Label>
                <select value={nRepeticoes}
                  onChange={(e) => setNRepeticoes(Number(e.target.value))}
                  style={inputStyle(T)}>
                  {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
              <div>
                <Label T={T}>Intervalo</Label>
                <select value={tipoIntervaloRec}
                  onChange={(e) => setTipoIntervaloRec(e.target.value)}
                  style={inputStyle(T)}>
                  {INTERVALO_RECORRENTE.map(i => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {tipoIntervaloRec === 'customizado' && (
              <div>
                <Label T={T}>A cada quantos dias?</Label>
                <input type="number" min="1" max="365" value={intervaloRecDias}
                  onChange={(e) => setIntervaloRecDias(Number(e.target.value))}
                  style={inputStyle(T)} />
              </div>
            )}
            <div style={{ fontSize: 11, color: T.textDim }}>
              <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 4 }} />
              Cron-like: cada repetição é uma data fixa, não considera feriado/FDS.
            </div>
          </div>
        )}

        {/* ───── PREVIEW (parcelado/recorrente) ───── */}
        {modo !== 'avulso' && preview.length > 0 && (
          <div style={{
            borderRadius: 8, overflow: 'hidden',
            border: `1px solid ${T.border}`,
          }}>
            <div style={{
              padding: '8px 12px',
              background: T.cardAlt || T.bg,
              borderBottom: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                <i className="ti ti-list" style={{ fontSize: 12, marginRight: 4 }} />
                Pré-visualização ({preview.length} {modo === 'parcelado' ? 'parcelas' : 'lançamentos'})
              </span>
              <span style={{ fontSize: 12, color: T.textPrimary, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                Total: R$ {fmtBRL(totalPreview)}
              </span>
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {preview.map((p) => (
                <div key={p.idx} style={{
                  padding: '6px 12px',
                  display: 'grid', gridTemplateColumns: '36px 72px 1fr auto', gap: 8,
                  alignItems: 'center',
                  borderBottom: p.idx < preview.length ? `1px solid ${T.border}55` : 'none',
                  fontSize: 12, color: T.textSecondary,
                }}>
                  <span style={{ color: T.textMuted, fontWeight: 700, fontSize: 11 }}>
                    {p.idx}/{p.total}
                  </span>
                  <span style={{ color: T.textPrimary, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtDataCurta(p.vencimento)}
                  </span>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.descricao}</span>
                  <span style={{
                    color: T.textPrimary, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}>R$ {fmtBRL(p.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ───── JÁ PAGO (só avulso) ───── */}
        {modo === 'avulso' && (
          <>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: T.textPrimary, cursor: 'pointer',
              padding: '8px 0',
            }}>
              <input type="checkbox" checked={jaPago}
                onChange={(e) => setJaPago(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: azul, cursor: 'pointer' }} />
              Já foi {tipo === 'receita' ? 'recebido' : 'pago'}? (vai direto pro Caixa)
            </label>

            {jaPago && (
              <>
                <div>
                  <Label T={T}>Data do {tipo === 'receita' ? 'recebimento' : 'pagamento'}</Label>
                  <input type="date" value={pagoEm}
                    onChange={(e) => setPagoEm(e.target.value)}
                    style={{ ...inputStyle(T), colorScheme: dark ? 'dark' : 'light' }} />
                </div>
                <div>
                  <Label T={T}>Forma de pagamento</Label>
                  <select value={formaPagto} onChange={(e) => setFormaPagto(e.target.value)}
                    style={inputStyle(T)}>
                    {FORMAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                {mostraTaxa && (
                  <div>
                    <Label T={T}>Taxa <span style={{ color: T.textDim, fontWeight: 400, textTransform: 'none' }}>· % sobre o valor</span></Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="number" min="0" step="0.01" value={taxaPct}
                        onChange={(e) => setTaxaPct(e.target.value)}
                        placeholder="0,00"
                        style={{
                          flex: 1, padding: '9px 12px', borderRadius: 7,
                          border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                          fontSize: 14, fontVariantNumeric: 'tabular-nums',
                          outline: 'none', textAlign: 'right',
                          fontFamily: 'inherit', boxSizing: 'border-box',
                        }} />
                      <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>%</span>
                    </div>
                    {taxaNumero > 0 && valorNumero > 0 && (
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4, textAlign: 'right' }}>
                        Líquido recebido: <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                          R$ {(valorNumero - (valorNumero * taxaNumero / 100)).toFixed(2).replace('.', ',')}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Validações */}
        {erros.length > 0 && (
          <div style={{
            padding: '8px 10px', borderRadius: 6,
            background: `${amarelo}15`, border: `1px solid ${amarelo}44`,
            fontSize: 11, color: T.textSecondary,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 3, color: amarelo }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 12, marginRight: 4 }} />
              Preencha antes de salvar:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {erros.map(e => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 18px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <Button variant="ghost" T={T} dark={dark} onClick={onClose}>Cancelar</Button>
        <Button
          variant="primary" T={T} dark={dark}
          iconLeft={salvando ? 'ti-loader-2' : 'ti-check'}
          onClick={salvar}
          disabled={!podeSalvar}
        >
          {salvando
            ? 'Salvando...'
            : modo === 'avulso'
              ? 'Criar lançamento'
              : `Criar ${preview.length} ${modo === 'parcelado' ? 'parcelas' : 'lançamentos'}`}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Helpers visuais ──────────────────────────────────────────────────────────
function Label({ T, children }) {
  return (
    <label style={{
      display: 'block', fontSize: 10.5, color: T.textMuted, fontWeight: 700,
      marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px',
    }}>{children}</label>
  )
}

function inputStyle(T) {
  return {
    width: '100%', padding: '9px 12px', borderRadius: 7,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }
}

function TipoBtn({ T, cor, ativo, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '10px 12px', borderRadius: 8,
        border: `1.5px solid ${ativo ? cor : T.border}`,
        background: ativo ? `${cor}15` : 'transparent',
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 16, color: ativo ? cor : T.textMuted }} aria-hidden="true" />
      <span style={{ fontSize: 13, fontWeight: 700, color: ativo ? cor : T.textSecondary }}>
        {label}
      </span>
    </button>
  )
}

function ModoBtn({ T, cor, ativo, onClick, icon, label, desc }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '8px 10px', borderRadius: 8,
        border: `1.5px solid ${ativo ? cor : T.border}`,
        background: ativo ? `${cor}15` : 'transparent',
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 18, color: ativo ? cor : T.textMuted }} aria-hidden="true" />
      <span style={{ fontSize: 12, fontWeight: 700, color: ativo ? cor : T.textSecondary }}>
        {label}
      </span>
      <span style={{ fontSize: 10, color: T.textDim, lineHeight: 1.1 }}>
        {desc}
      </span>
    </button>
  )
}
