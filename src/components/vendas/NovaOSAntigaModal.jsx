// src/components/vendas/NovaOSAntigaModal.jsx
// Modal pra registrar OS antiga retroativamente — usado pela página /vendas.
//
// Diferenças vs NovaOSModal do Kanban:
//   - Cria direto na etapa `concluido` (não passa por fluxo de Kanban)
//   - Permite data retroativa (criado_em + data_conclusao)
//   - Já pergunta valor + pagamento + equipamento (uma tela só, sem 10 ações)
//
// NÃO cria lançamento financeiro automático (Onda 2 — checkbox opcional).

import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { Modal, Button, Input, useToast } from '../ui'
import { corEtapa, corHero } from '../../utils/colors'

const TIPOS = [
  { id: 'atendimento', label: 'Atendimento', icon: 'ti-tool',  cor: 'blue' },
  { id: 'fabricacao',  label: 'Fabricação',  icon: 'ti-hammer', cor: 'yellow' },
  { id: 'venda',       label: 'Venda',       icon: 'ti-shopping-bag', cor: 'green' },
]

const FORMAS_PAG = [
  { id: 'pix',                label: 'PIX' },
  { id: 'dinheiro',           label: 'Dinheiro' },
  { id: 'debito',             label: 'Cartão débito' },
  { id: 'credito_1x',         label: 'Cartão 1x' },
  { id: 'credito_parcelado',  label: 'Cartão parcelado' },
  { id: 'link_pagamento',     label: 'Link InfinitePay' },
  { id: 'boleto',             label: 'Boleto' },
  { id: 'transferencia',      label: 'Transferência' },
  { id: 'a_prazo',            label: 'A prazo' },
]

const hojeISO = () => new Date().toISOString().slice(0, 10)

export default function NovaOSAntigaModal({ T, dark, onClose, onCriada }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)

  // ─── Form state ────────────────────────────────────────────────────────────
  const [tipo, setTipo] = useState('atendimento')
  const [dataOS, setDataOS] = useState(hojeISO())

  // Cliente
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteSel, setClienteSel] = useState(null) // { id, nome, telefone }
  const [sugestoesCliente, setSugestoesCliente] = useState([])
  const [aberto, setAberto] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // Equipamento
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [defeito, setDefeito] = useState('')

  // Financeiro
  const [valorTotal, setValorTotal] = useState('')
  const [desconto, setDesconto] = useState('')
  const [valorPago, setValorPago] = useState('')
  const [formaPag, setFormaPag] = useState('pix')

  // Observações
  const [observacoes, setObservacoes] = useState('')

  // UI
  const [salvando, setSalvando] = useState(false)

  // ─── Click-fora fecha sugestões ────────────────────────────────────────────
  useEffect(() => {
    function handleClickFora(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  // ─── Busca cliente (debounce 250ms + ILIKE em nome+telefone) ──────────────
  function handleClienteBusca(novo) {
    setClienteBusca(novo)
    setClienteSel(null) // muda input → reseta seleção
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if ((novo || '').trim().length < 2) {
      setSugestoesCliente([])
      setAberto(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const termo = novo.trim().replace(/[,()*]/g, ' ')
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome, telefone, endereco')
        .is('deleted_at', null)
        .or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%`)
        .order('nome')
        .limit(20)
      setBuscando(false)
      if (error) {
        console.warn('busca cliente:', error.message)
        return
      }
      setSugestoesCliente(data || [])
      setAberto(true)
    }, 250)
  }

  function selecionarCliente(c) {
    setClienteSel(c)
    setClienteBusca(c.nome)
    setSugestoesCliente([])
    setAberto(false)
  }

  // ─── Validação ────────────────────────────────────────────────────────────
  const valorNum   = Number(String(valorTotal).replace(',', '.')) || 0
  const descNum    = Number(String(desconto).replace(',', '.')) || 0
  const pagoNum    = Number(String(valorPago).replace(',', '.')) || 0
  const valorLiq   = Math.max(0, valorNum - descNum)
  const statusPago = pagoNum >= valorLiq && valorLiq > 0 ? 'total'
                    : pagoNum > 0 ? 'parcial' : 'nao'

  const erros = []
  if (tipo === 'atendimento' && !clienteSel) erros.push('Selecione o cliente')
  if (!dataOS) erros.push('Data obrigatória')
  if (tipo !== 'venda' && !defeito.trim() && tipo === 'atendimento') erros.push('Descreva o defeito/serviço')
  if (valorNum <= 0) erros.push('Valor total maior que zero')
  if (pagoNum > valorLiq) erros.push('Valor pago não pode exceder o líquido')

  const podeSalvar = erros.length === 0 && !salvando

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)

    // Constrói payload pra tabela `os`
    const payload = {
      tipo,
      etapa: 'concluido',
      cliente_id: clienteSel?.id || null,
      valor_total: valorNum,
      desconto: descNum,
      valor_pago: pagoNum,
      forma_pagamento: pagoNum > 0 ? formaPag : null,
      pago: statusPago,
      marca_equipamento: marca.trim() || null,
      modelo_equipamento: modelo.trim() || null,
      numero_serie: numeroSerie.trim() || null,
      defeito_relatado: defeito.trim() || null,
      observacoes: observacoes.trim() || null,
      data_conclusao: dataOS,
    }

    // 1. INSERT — trigger preenche criado_em = NOW (será sobrescrito no passo 2)
    const { data: inserida, error: errIn } = await supabase
      .from('os')
      .insert(payload)
      .select('id, numero')
      .single()

    if (errIn) {
      setSalvando(false)
      notify('erro', `Falha ao criar OS: ${errIn.message || 'erro desconhecido'}`)
      console.error('[NovaOSAntiga] insert:', errIn)
      return
    }

    // 2. UPDATE — ajusta criado_em pra data retroativa
    //    (separado pra não brigar com trigger que sobrescreve no INSERT)
    const dataCompletaISO = `${dataOS}T12:00:00`
    const { error: errUp } = await supabase
      .from('os')
      .update({ criado_em: dataCompletaISO })
      .eq('id', inserida.id)

    if (errUp) {
      // Não é crítico — OS já existe, só ficou com data atual
      console.warn('[NovaOSAntiga] update criado_em:', errUp)
    }

    setSalvando(false)
    notify('ok', `OS #${inserida.numero} criada retroativamente`)
    onCriada?.(inserida)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal T={T} dark={dark} onClose={onClose} maxWidth={580}>
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${azul}22`, color: azul,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-history" style={{ fontSize: 17 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark) }}>
            Nova OS antiga
          </div>
          <div style={{ fontSize: 11, color: T.textMuted }}>
            Registro retroativo — vai direto pra etapa Concluído
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

      <div style={{
        padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        {/* Tipo */}
        <div>
          <Label T={T}>Tipo de OS</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {TIPOS.map(t => {
              const ativo = tipo === t.id
              const corT = corEtapa(t.cor, dark)
              return (
                <button key={t.id}
                  onClick={() => setTipo(t.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    border: `1.5px solid ${ativo ? corT : T.border}`,
                    background: ativo ? `${corT}15` : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <i className={`ti ${t.icon}`} style={{ fontSize: 14, color: ativo ? corT : T.textMuted }} aria-hidden="true" />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: ativo ? corT : T.textSecondary }}>
                    {t.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Data */}
        <div>
          <Label T={T}>Data da OS (retroativa)</Label>
          <input type="date" value={dataOS} max={hojeISO()}
            onChange={(e) => setDataOS(e.target.value)}
            style={{ ...inputStyle(T), colorScheme: dark ? 'dark' : 'light' }} />
        </div>

        {/* Cliente */}
        {tipo !== 'fabricacao' && (
          <div ref={wrapperRef} style={{ position: 'relative' }}>
            <Label T={T}>Cliente</Label>
            <input type="text" value={clienteBusca}
              onChange={(e) => handleClienteBusca(e.target.value)}
              onFocus={() => sugestoesCliente.length > 0 && setAberto(true)}
              placeholder="Digite 2+ letras do nome ou telefone"
              style={inputStyle(T)} />
            {clienteSel && (
              <div style={{ fontSize: 10.5, color: corEtapa('green', dark), marginTop: 4 }}>
                <i className="ti ti-check" style={{ fontSize: 12, marginRight: 3 }} />
                Cliente selecionado: <strong>{clienteSel.nome}</strong>
                {clienteSel.telefone && ` · ${clienteSel.telefone}`}
              </div>
            )}
            {buscando && (
              <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 4 }}>Buscando…</div>
            )}
            {aberto && sugestoesCliente.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                marginTop: 4, zIndex: 50,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                maxHeight: 220, overflowY: 'auto',
                boxShadow: dark ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.12)',
              }}>
                {sugestoesCliente.map(c => (
                  <button key={c.id}
                    onMouseDown={(e) => { e.preventDefault(); selecionarCliente(c) }}
                    style={{
                      width: '100%', padding: '8px 12px',
                      background: 'transparent',
                      border: 'none', borderBottom: `1px solid ${T.border}`,
                      color: T.textPrimary, fontSize: 12.5,
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.cardAlt}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight: 600, color: corHero(dark) }}>{c.nome}</div>
                    {c.telefone && <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>{c.telefone}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Equipamento — só atendimento + venda */}
        {tipo !== 'fabricacao' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label T={T}>Marca</Label>
                <input type="text" value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ex: Brastemp"
                  style={inputStyle(T)} />
                <div style={{ display: 'flex', gap: 5 }}>
                  {['Electrolux', 'Brastemp', 'Consul'].map(m => (
                    <button key={m} type="button"
                      onClick={() => setMarca(m)}
                      style={{
                        padding: '2px 10px', borderRadius: 99,
                        border: `1px solid ${marca === m ? '#5B9BD5' : (T.border || '#ddd')}`,
                        background: marca === m ? '#5B9BD5' : 'transparent',
                        color: marca === m ? '#fff' : T.textSecondary,
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all .12s',
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label T={T}>Modelo</Label>
                <input type="text" value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ex: BWG10"
                  style={inputStyle(T)} />
              </div>
            </div>
            <div>
              <Label T={T}>Nº de série <span style={{ color: T.textDim, fontWeight: 400, textTransform: 'none' }}>· opcional</span></Label>
              <input type="text" value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                style={inputStyle(T)} />
            </div>
            <div>
              <Label T={T}>Defeito / serviço executado</Label>
              <textarea value={defeito}
                onChange={(e) => setDefeito(e.target.value)}
                placeholder="O que foi feito ou qual era o defeito"
                style={{ ...inputStyle(T), minHeight: 60, resize: 'vertical' }} />
            </div>
          </>
        )}

        {/* Financeiro */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <Label T={T}>Valor total</Label>
            <input type="number" min="0" step="0.01" value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="0,00"
              style={{ ...inputStyle(T), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} />
          </div>
          <div>
            <Label T={T}>Desconto</Label>
            <input type="number" min="0" step="0.01" value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              placeholder="0,00"
              style={{ ...inputStyle(T), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} />
          </div>
          <div>
            <Label T={T}>Valor pago</Label>
            <input type="number" min="0" step="0.01" value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
              placeholder="0,00"
              style={{ ...inputStyle(T), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} />
          </div>
        </div>

        {valorNum > 0 && (
          <div style={{
            fontSize: 11.5, color: T.textMuted,
            display: 'flex', justifyContent: 'space-between',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span>Líquido: <strong style={{ color: T.textPrimary }}>R$ {valorLiq.toFixed(2).replace('.', ',')}</strong></span>
            <span>Status: <strong style={{ color: statusPago === 'total' ? corEtapa('green', dark) : statusPago === 'parcial' ? corEtapa('yellow', dark) : corEtapa('red', dark) }}>
              {statusPago === 'total' ? 'Pago' : statusPago === 'parcial' ? 'Parcial' : 'Não pago'}
            </strong></span>
          </div>
        )}

        {pagoNum > 0 && (
          <div>
            <Label T={T}>Forma de pagamento</Label>
            <select value={formaPag} onChange={(e) => setFormaPag(e.target.value)}
              style={inputStyle(T)}>
              {FORMAS_PAG.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        )}

        {/* Observações */}
        <div>
          <Label T={T}>Observações <span style={{ color: T.textDim, fontWeight: 400, textTransform: 'none' }}>· opcional</span></Label>
          <textarea value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Notas livres — não aparece em relatório, só pra histórico"
            style={{ ...inputStyle(T), minHeight: 60, resize: 'vertical' }} />
        </div>

        {/* Erros */}
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

      <div style={{
        padding: '12px 18px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <Button variant="ghost" T={T} dark={dark} onClick={onClose}>Cancelar</Button>
        <Button variant="primary" T={T} dark={dark}
          iconLeft={salvando ? 'ti-loader-2' : 'ti-check'}
          onClick={salvar}
          disabled={!podeSalvar}>
          {salvando ? 'Salvando…' : 'Criar OS retroativa'}
        </Button>
      </div>
    </Modal>
  )
}

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
