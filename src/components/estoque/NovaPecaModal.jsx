// idemaq-src/components/estoque/NovaPecaModal.jsx
// Formulário de cadastro de nova peça (Módulo 06 chat 1).
// Visual MVP — salva via callback onSalvar. Quando Supabase entrar, basta
// trocar o handler em Estoque.jsx pra fazer o INSERT em `peca`.

import React, { useState, useMemo } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, ModalHeader, Button, Input, useToast } from '../ui'

const VAZIO = {
  nome: '',
  sku: '',
  fornecedor: '',
  qtdAtual: '',
  qtdMinima: '',
  qtdMaxima: '',
  custoAtual: '',
  precoVenda: '',
}

function toNum(v) {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function NovaPecaModal({ T, dark, onClose, onSalvar }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const [form, setForm] = useState(VAZIO)
  const set = (campo) => (v) => setForm(f => ({ ...f, [campo]: v }))

  const custo = toNum(form.custoAtual)
  const venda = toNum(form.precoVenda)
  const margemRS = venda - custo
  const margemPct = custo > 0 ? Math.round((margemRS / custo) * 100) : 0
  const margemValida = custo > 0 && venda > 0

  const erros = useMemo(() => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    if (!form.sku.trim()) e.sku = 'Obrigatório'
    if (!form.fornecedor.trim()) e.fornecedor = 'Obrigatório'
    if (form.qtdAtual === '' || toNum(form.qtdAtual) < 0) e.qtdAtual = 'Inválido'
    if (form.qtdMinima === '' || toNum(form.qtdMinima) < 0) e.qtdMinima = 'Inválido'
    if (form.qtdMaxima !== '' && toNum(form.qtdMaxima) < toNum(form.qtdMinima)) e.qtdMaxima = 'Menor que mínimo'
    if (toNum(form.custoAtual) <= 0) e.custoAtual = 'Obrigatório'
    if (toNum(form.precoVenda) <= 0) e.precoVenda = 'Obrigatório'
    if (margemValida && venda < custo) e.precoVenda = 'Venda < custo'
    return e
  }, [form, custo, venda, margemValida])

  const podeSalvar = Object.keys(erros).length === 0

  function salvar() {
    if (!podeSalvar) {
      notify('erro', 'Confira os campos destacados')
      return
    }
    const nova = {
      nome: form.nome.trim(),
      sku: form.sku.trim(),
      fornecedor: form.fornecedor.trim(),
      qtdAtual: toNum(form.qtdAtual),
      qtdMinima: toNum(form.qtdMinima),
      qtdMaxima: form.qtdMaxima === '' ? toNum(form.qtdMinima) * 3 : toNum(form.qtdMaxima),
      custoAtual: custo,
      precoVenda: venda,
    }
    onSalvar?.(nova)
    notify('ok', `Peça "${nova.nome}" cadastrada`)
    onClose?.()
  }

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} maxWidth={560}>
      <ModalHeader T={T} title="Nova peça" subtitle="Cadastro manual"
        icon="ti-puzzle" onClose={onClose} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

        {/* Identificação */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-tag" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Identificação</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <CampoErro erro={erros.nome} dark={dark}>
              <Input T={T} dark={dark} label="Nome do item" required
                value={form.nome} onChange={set('nome')}
                placeholder="Ex: Capa Brastemp 12kg"
              />
            </CampoErro>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <CampoErro erro={erros.sku} dark={dark}>
                <Input T={T} dark={dark} label="SKU / Código" required
                  value={form.sku} onChange={set('sku')}
                  placeholder="Ex: CAP-BRA-12"
                  icon="ti-barcode"
                />
              </CampoErro>
              <CampoErro erro={erros.fornecedor} dark={dark}>
                <Input T={T} dark={dark} label="Fornecedor" required
                  value={form.fornecedor} onChange={set('fornecedor')}
                  placeholder="Ex: Atacado MS"
                  icon="ti-truck"
                />
              </CampoErro>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '14px 0' }} />

        {/* Estoque */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-stack-2" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Estoque</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <CampoErro erro={erros.qtdAtual} dark={dark}>
              <Input T={T} dark={dark} label="Qtd. atual" required
                type="number" min="0" step="1"
                value={form.qtdAtual} onChange={set('qtdAtual')}
                placeholder="0"
              />
            </CampoErro>
            <CampoErro erro={erros.qtdMinima} dark={dark}>
              <Input T={T} dark={dark} label="Mínimo" required
                type="number" min="0" step="1"
                value={form.qtdMinima} onChange={set('qtdMinima')}
                placeholder="0"
              />
            </CampoErro>
            <CampoErro erro={erros.qtdMaxima} dark={dark}>
              <Input T={T} dark={dark} label="Máximo"
                type="number" min="0" step="1"
                value={form.qtdMaxima} onChange={set('qtdMaxima')}
                placeholder="auto"
              />
            </CampoErro>
          </div>
          <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 6 }}>
            Quando a quantidade cair até o mínimo, o item aparece com alerta no estoque.
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '14px 0' }} />

        {/* Custos & preço */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-cash" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Custos & preço</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <CampoErro erro={erros.custoAtual} dark={dark}>
              <Input T={T} dark={dark} label="Custo (R$)" required
                type="number" min="0" step="0.01"
                value={form.custoAtual} onChange={set('custoAtual')}
                placeholder="0,00"
                icon="ti-tag"
              />
            </CampoErro>
            <CampoErro erro={erros.precoVenda} dark={dark}>
              <Input T={T} dark={dark} label="Preço de venda (R$)" required
                type="number" min="0" step="0.01"
                value={form.precoVenda} onChange={set('precoVenda')}
                placeholder="0,00"
                icon="ti-currency-real"
              />
            </CampoErro>
          </div>

          {/* Preview da margem */}
          <div style={{
            marginTop: 10,
            padding: '10px 12px',
            background: T.cardAlt,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{
              fontSize: 11, color: T.textMuted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '.04em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ti ti-chart-line" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
              Margem prevista
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: margemValida ? (venda >= custo ? azul : vermelho) : T.textDim,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {margemValida
                ? `${margemPct}% · ${fmtBRL(margemRS)}`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        background: T.cardAlt, flexShrink: 0,
      }}>
        <Button T={T} dark={dark} variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" iconLeft="ti-check"
          onClick={salvar}
          disabled={!podeSalvar}>
          Salvar peça
        </Button>
      </div>
    </Modal>
  )
}

// Wrapper que mostra mensagem de erro abaixo do campo
function CampoErro({ erro, dark, children }) {
  const vermelho = corEtapa('red', dark)
  return (
    <div>
      {children}
      {erro && (
        <div style={{
          fontSize: 10.5, color: vermelho, marginTop: 4,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 12 }} aria-hidden="true" />
          {erro}
        </div>
      )}
    </div>
  )
}
