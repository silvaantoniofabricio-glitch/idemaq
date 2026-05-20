// src/components/financeiro/NovoLancamentoModal.jsx
// Lançamento avulso: receita OU despesa, em aberto OU já paga.
//
// MVP — Módulo 07. Sem parcelamento nem recorrência (vão pra modal separado).
//
// Schema esperado pelo useFinanceiro.criar():
//   { tipo, valor, vencimento, pago_em?, categoria, descricao, conta_id?,
//     forma_pagamento?, taxa_pct?, os_id? }

import React, { useState, useMemo } from 'react'
import { Modal, Button, Input, useToast } from '../ui'
import { P } from '../../theme'
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

const hojeISO = () => new Date().toISOString().slice(0, 10)

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
  const vermelho = corEtapa('red', dark)
  const verde    = corEtapa('green', dark)

  // ─── Estado do form ─────────────────────────────────────────────────────────
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

  // ─── Derivados ──────────────────────────────────────────────────────────────
  const corTipo = tipo === 'receita' ? azul : amarelo
  const labelTipo = tipo === 'receita' ? 'Receita' : 'Despesa'
  const categoriasSugestao = CATEGORIAS_SUGESTAO[tipo] || []
  const formaSel = FORMAS.find(f => f.id === formaPagto)
  const mostraTaxa = jaPago && formaSel?.temTaxa

  const valorNumero = Number(String(valor).replace(',', '.')) || 0
  const taxaNumero  = Number(String(taxaPct).replace(',', '.')) || 0

  const erros = useMemo(() => {
    const e = []
    if (!valorNumero || valorNumero <= 0) e.push('Valor obrigatório (> 0)')
    if (!vencimento) e.push('Vencimento obrigatório')
    if (!categoria.trim()) e.push('Categoria obrigatória')
    if (!descricao.trim()) e.push('Descrição obrigatória')
    if (jaPago && !pagoEm) e.push('Data do pagamento obrigatória')
    return e
  }, [valorNumero, vencimento, categoria, descricao, jaPago, pagoEm])

  const podeSalvar = erros.length === 0 && !salvando

  // ─── Salvar ─────────────────────────────────────────────────────────────────
  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    const payload = {
      tipo,
      valor: valorNumero,
      vencimento,
      pago_em: jaPago ? pagoEm : null,
      categoria: categoria.trim(),
      descricao: descricao.trim(),
      conta_id: contaId || null,
      forma_pagamento: jaPago ? formaPagto : null,
      taxa_pct: mostraTaxa ? taxaNumero : 0,
    }
    const { error } = await onCriar(payload)
    setSalvando(false)
    if (error) {
      if (error.code === 'OFFLINE') {
        notify('info', 'Modo demo: lançamento não persiste. Aplique sql/01 no Supabase.')
      } else {
        notify('erro', `Falha ao salvar: ${error.message || 'erro desconhecido'}`)
      }
      return
    }
    notify('ok', `${labelTipo} criada: ${descricao.slice(0, 40)}`)
    onClose?.()
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal T={T} dark={dark} onClose={onClose} maxWidth={520}>
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
            {labelTipo} {jaPago ? '(já paga)' : '(em aberto)'}
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
        {/* Toggle tipo (receita/despesa) */}
        <div>
          <Label T={T}>Tipo</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <TipoBtn T={T} dark={dark} cor={azul}
              ativo={tipo === 'receita'} onClick={() => setTipo('receita')}
              icon="ti-arrow-down-circle" label="Receita" />
            <TipoBtn T={T} dark={dark} cor={amarelo}
              ativo={tipo === 'despesa'} onClick={() => setTipo('despesa')}
              icon="ti-arrow-up-circle" label="Despesa" />
          </div>
        </div>

        {/* Valor */}
        <div>
          <Label T={T}>Valor</Label>
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
            placeholder={tipo === 'receita' ? 'Ex: João Silva — Limpeza' : 'Ex: Compra de peças ML'}
            style={inputStyle(T)}
          />
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

        {/* Vencimento */}
        <div>
          <Label T={T}>Vencimento</Label>
          <input type="date" value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            style={{ ...inputStyle(T), colorScheme: dark ? 'dark' : 'light' }} />
        </div>

        {/* Já pago? */}
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
          {salvando ? 'Salvando...' : 'Criar lançamento'}
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

function TipoBtn({ T, dark, cor, ativo, onClick, icon, label }) {
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
