// src/components/osDetalhe/CustoTerceiroPanel.jsx
// Painel "Custo de terceiro / repasse" — aba Resumo da OS (admin only).
//
// Pra quando uma etapa do serviço é feita por terceiro (ex: mandar um motor
// pra retificar fora) e esse custo precisa entrar no Financeiro já vinculado
// a esta OS. Cria/lista/exclui lançamentos em `lancamento_financeiro` com
// os_id = esta OS, tipo='despesa', categoria='Terceiros'.
//
// Reusa useFinanceiro() (mesma fonte de verdade do Financeiro) — filtra só
// os lançamentos ligados a esta OS.

import React, { useMemo, useState } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro'
import { useToast } from '../ui'
import { fmtBRL } from '../../utils/fmt'
import { corEtapa } from '../../utils/colors'

const hojeISO = () => new Date().toISOString().slice(0, 10)

function ACard({ T, dark, children }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 6, overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

export default function CustoTerceiroPanel({ T, dark, os }) {
  const notify = useToast()
  const { lancamentos, contas, criar, darBaixa, excluir, tabelaAusente } = useFinanceiro()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    descricao: '', valor: '', data: hojeISO(), pago: false, contaId: '',
  })

  const custos = useMemo(
    () => (lancamentos || []).filter(l => l.os_id === os.id && l.tipo === 'despesa'),
    [lancamentos, os.id]
  )
  const totalCustos = custos.reduce((s, c) => s + (Number(c.valor) || 0), 0)

  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  function update(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function salvar() {
    const valor = Number(String(form.valor).replace(',', '.'))
    if (!form.descricao.trim() || !valor || valor <= 0) {
      notify('erro', 'Preencha descrição e valor'); return
    }
    setSalvando(true)
    const { error } = await criar({
      tipo: 'despesa',
      valor,
      categoria: 'Terceiros',
      descricao: form.descricao.trim(),
      vencimento: form.data,
      pago_em: form.pago ? form.data : null,
      conta_id: form.contaId || null,
      os_id: os.id,
    })
    setSalvando(false)
    if (error) {
      notify('erro', error.code === 'OFFLINE' ? 'Financeiro ainda não disponível' : `Erro: ${error.message}`)
      return
    }
    notify('ok', `Custo de ${fmtBRL(valor)} lançado`)
    setForm({ descricao: '', valor: '', data: hojeISO(), pago: false, contaId: '' })
    setAberto(false)
  }

  async function excluirCusto(c) {
    if (!window.confirm(`Excluir o custo "${c.descricao}" (${fmtBRL(c.valor)})?`)) return
    const { error } = await excluir(c.id)
    if (error) notify('erro', `Erro: ${error.message}`)
    else notify('ok', 'Custo removido')
  }

  if (tabelaAusente) return null

  return (
    <ACard T={T} dark={dark}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 12px 7px',
        borderBottom: `1px solid ${T.border}`,
        background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
      }}>
        <i className="ti ti-truck-return" style={{ fontSize: 13, color: T.textMuted }} aria-hidden="true" />
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1,
        }}>
          Custo de terceiro / repasse
        </span>
        {totalCustos > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: vermelho, fontVariantNumeric: 'tabular-nums' }}>
            − {fmtBRL(totalCustos)}
          </span>
        )}
      </div>

      {custos.length === 0 && !aberto && (
        <div style={{ padding: '12px', fontSize: 11.5, color: T.textDim, textAlign: 'center' }}>
          Nenhum custo de terceiro lançado nessa OS.
        </div>
      )}

      {custos.map((c, i) => {
        const pago = !!c.pago_em
        return (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.descricao}
              </div>
              <div style={{ fontSize: 10.5, color: pago ? verde : amarelo, marginTop: 1 }}>
                {pago ? 'Pago' : 'Pendente'}
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {fmtBRL(c.valor)}
            </span>
            <button
              onClick={() => excluirCusto(c)}
              title="Excluir"
              style={{
                background: 'transparent', border: 'none', color: T.textDim,
                cursor: 'pointer', padding: 2, flexShrink: 0,
              }}>
              <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
            </button>
          </div>
        )
      })}

      {aberto ? (
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={form.descricao}
            onChange={e => update('descricao', e.target.value)}
            placeholder="Ex: Retífica do motor — terceiro"
            style={inputStyle(T, dark)}
            autoFocus
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              type="number" inputMode="decimal"
              value={form.valor}
              onChange={e => update('valor', e.target.value)}
              placeholder="Valor R$"
              style={inputStyle(T, dark)}
            />
            <input
              type="date"
              value={form.data}
              onChange={e => update('data', e.target.value)}
              style={{ ...inputStyle(T, dark), colorScheme: dark ? 'dark' : 'light' }}
            />
          </div>
          {contas?.length > 0 && (
            <select
              value={form.contaId}
              onChange={e => update('contaId', e.target.value)}
              style={{ ...inputStyle(T, dark), colorScheme: dark ? 'dark' : 'light' }}
            >
              <option value="">Conta (opcional)</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSecondary, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.pago} onChange={e => update('pago', e.target.checked)} />
            Já foi pago
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setAberto(false)}
              style={{
                flex: 1, padding: '8px', borderRadius: 6, border: `1px solid ${T.border}`,
                background: 'transparent', color: T.textSecondary, fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 500,
              }}>
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              style={{
                flex: 1, padding: '8px', borderRadius: 6, border: 'none',
                background: corEtapa('blue', dark), color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: salvando ? 'default' : 'pointer', opacity: salvando ? 0.6 : 1,
                fontFamily: 'inherit',
              }}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAberto(true)}
          style={{
            width: '100%', padding: '9px 12px',
            borderTop: custos.length > 0 ? `1px solid ${T.border}` : 'none',
            background: 'transparent', border: 'none', borderTopStyle: 'solid',
            color: corEtapa('blue', dark), fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
          <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
          Adicionar custo
        </button>
      )}
    </ACard>
  )
}

function inputStyle(T, dark) {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 9px', borderRadius: 6,
    border: `1px solid ${T.border}`,
    background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
    color: T.textPrimary, fontSize: 12.5, fontFamily: 'inherit',
    outline: 'none',
  }
}
