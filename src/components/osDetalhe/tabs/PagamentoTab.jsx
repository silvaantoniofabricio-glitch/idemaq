// src/components/osDetalhe/tabs/PagamentoTab.jsx
// Aba Pagamento — itens, total, status + recebimento.
//
// SEMPRE editável em qualquer etapa: o cliente pode pedir orçamento e pagar
// antes mesmo do agendamento (ex: limpeza pré-paga). A aba é o "painel
// financeiro" da OS, independente da etapa atual no kanban.
//
// Regras especiais por etapa:
// - ORÇAMENTO: aparecem os botões Aprovar (→ oficina) / Recusar (→ recusado)
// - PAGAMENTO: ao confirmar recebimento total, move automaticamente pra Concluído
// - Em qualquer outra etapa: ao confirmar pagamento, OS fica na etapa atual
//   (sistema já redireciona Entrega→Concluído quando estiver paga, via podeMoverOS)
//
// Persistência dos itens via useOSItens (Lote 2d do Módulo 00c). Edição vive
// em estado local; salvar() faz diff (delete/update/insert) contra o banco.

import React, { useState, useMemo } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { useOSItens } from '../../../hooks/useOSItens'
import { fmtBRL } from '../../../utils/fmt'
import { estaPagaTotal, estaPagaParcial } from '../../../utils/osHelpers'
import FormRecebimento, { formaIdToLabel } from '../FormRecebimento'

export default function PagamentoTab({ T, dark, os, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  const isOrcamento = os.etapa === 'orcamento'
  const isPagamento = os.etapa === 'pagamento'

  // Itens editáveis em estado local (origem: Supabase via useOSItens).
  // Hook usa aliases (addItemDB/updateItemDB/removeItemDB) porque já existem
  // funções locais addItem/updateItem/removeItem que manipulam o state em memória.
  const {
    itens: itensSalvos,
    loading: loadingItens,
    addItem: addItemDB,
    updateItem: updateItemDB,
    removeItem: removeItemDB,
  } = useOSItens(os.id)
  const [itens, setItens] = useState([])
  React.useEffect(() => {
    if (!loadingItens) setItens(itensSalvos.map(i => ({ ...i })))
  }, [loadingItens])
  const [desconto, setDesconto] = useState(os.desconto || 0)

  const subtotal = useMemo(() => itens.reduce((s, i) => s + i.valor * i.qtd, 0), [itens])
  const total = Math.max(0, subtotal - desconto)
  const valorPago = os.valor_pago || 0
  const aPagar = Math.max(0, total - valorPago)
  const pagoTotal = estaPagaTotal({ ...os, valor: total, desconto: 0, valor_pago: valorPago })
  const pagoParcial = !pagoTotal && estaPagaParcial(os)

  // Sincronização R$ ↔ %
  const descontoPct = subtotal > 0 ? Math.round((desconto / subtotal) * 100) : 0
  function setDescontoBRL(v) {
    const n = Math.max(0, Math.min(subtotal, Number(v) || 0))
    setDesconto(n)
  }
  function setDescontoPct(v) {
    const p = Math.max(0, Math.min(100, Number(v) || 0))
    setDesconto(Math.round(subtotal * p / 100))
  }

  // CRUD de itens (só ativo em Orçamento)
  function addItem() {
    setItens(prev => [...prev, { tipo: 'servico', nome: '', qtd: 1, valor: 0 }])
  }
  function removeItem(i) {
    setItens(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateItem(i, patch) {
    setItens(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }

  // Persiste o diff de itens contra o que veio do banco.
  async function salvar() {
    const idsSalvos = itensSalvos.map(i => i.id).filter(Boolean)
    const idsLocais = itens.map(i => i.id).filter(Boolean)
    const deletados = idsSalvos.filter(id => !idsLocais.includes(id))
    for (const id of deletados) await removeItemDB(id)
    for (const item of itens) {
      const payload = {
        tipo: item.tipo,
        nome: item.nome,
        qtd: item.qtd ?? 1,
        valor_unitario: item.valor_unitario ?? item.valor ?? 0,
      }
      if (item.id) {
        await updateItemDB(item.id, payload)
      } else {
        await addItemDB(payload)
      }
    }
  }

  async function salvarOrcamento() {
    onUpdateOS(os.numero, { valor: subtotal, desconto })
    await salvar()
  }

  async function aprovarOrcamento() {
    await salvarOrcamento()
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }
  async function recusarOrcamento() {
    await salvarOrcamento()
    const recusado = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'recusado')
    if (recusado) onMoverOS(os.numero, recusado.id)
  }

  // ─── Pagamento: callback do FormRecebimento
  // modo:
  //   'total'    → quita totalmente (valor === saldo)
  //   'parcial'  → registra parcial, OS continua aberta
  //   'desconto' → quita aplicando desconto pelo restante
  // parcelas:    → quando forma === aprazo, array de { data, valor }
  async function handleConfirmarPagamento({ valor, forma, modo, parcelas: parcelasAPrazo }) {
    const novoValorPago = valorPago + valor
    let novoDesconto = desconto
    let novoPago = 'total'
    if (modo === 'parcial') {
      novoPago = 'parcial'
    } else if (modo === 'desconto') {
      novoDesconto = desconto + (aPagar - valor)
    }
    // Anexa as parcelas a prazo nas observações (Módulo 07 cria tabela
    // `lancamento_financeiro` própria — por enquanto vive em texto).
    let novasObs = os.observacoes
    if (parcelasAPrazo && parcelasAPrazo.length > 0) {
      const txt = parcelasAPrazo
        .map((p, i) => `${i + 1}ª · ${p.data} · ${fmtBRL(p.valor, { fr: true })}`)
        .join('\n')
      novasObs = [
        os.observacoes,
        `— A prazo (${parcelasAPrazo.length} ${parcelasAPrazo.length === 1 ? 'parcela' : 'parcelas'}) —\n${txt}`,
      ].filter(Boolean).join('\n\n')
    }
    onUpdateOS(os.numero, {
      valor: subtotal,
      desconto: novoDesconto,
      valor_pago: novoValorPago,
      pago: novoPago,
      forma_pagamento: forma,
      ...(novasObs !== os.observacoes ? { observacoes: novasObs } : {}),
    })
    await salvar()
    // Só move pra Concluído quando o recebimento total acontece DENTRO da
    // etapa Pagamento. Pagamentos adiantados (em agendamento, recebido…)
    // mantêm a OS na etapa atual — o sistema redireciona Entrega→Concluído
    // automaticamente via podeMoverOS quando estiver paga.
    if (novoPago === 'total' && isPagamento) {
      const concluido = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'concluido')
      if (concluido) onMoverOS(os.numero, concluido.id)
    }
  }

  return (
    <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabeçalho da aba */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-receipt" style={{ fontSize: 17, color: azul }} aria-hidden="true" />
        <span style={{
          fontSize: 11, color: T.textMuted,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px',
        }}>
          Itens · orçamento · recebimento
        </span>
      </div>

      {/* Lista de itens */}
      <div className="idemaq-card" style={{
        background: T.cardAlt, border: `1px solid ${T.border}`,
        borderRadius: 9, padding: 0, overflow: 'hidden',
      }}>
        {itens.length === 0 ? (
          <div style={{ padding: '18px 14px', textAlign: 'center', fontSize: 12, color: T.textMuted }}>
            Sem itens — adicione abaixo
          </div>
        ) : itens.map((it, i) => (
          <ItemLinha
            key={i} item={it} T={T} dark={dark}
            editavel={true}
            onChange={(patch) => updateItem(i, patch)}
            onRemove={() => removeItem(i)}
            primeiro={i === 0}
          />
        ))}
        <button
          onClick={addItem}
          style={{
            width: '100%', padding: '10px 12px',
            background: 'transparent', color: cor(P.blue, P.blueDark),
            border: 'none', borderTop: itens.length > 0 ? `1px dashed ${T.border}` : 'none',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
          adicionar item
        </button>
      </div>

      {/* Desconto — sempre editável quando há itens */}
      {subtotal > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CampoDesconto T={T} label="Desconto R$" prefix="R$" valor={desconto} onChange={setDescontoBRL} />
          <CampoDesconto T={T} label="Desconto %" suffix="%" valor={descontoPct} onChange={setDescontoPct} />
        </div>
      )}

      {/* Bloco TOTAL */}
      <div style={{
        background: cor('#0d2035', '#e6f1fb'),
        border: `1px solid ${azul}55`,
        borderRadius: 9, padding: '12px 14px',
      }}>
        <LinhaTotal T={T} label="Subtotal" valor={fmtBRL(subtotal, { fr: true })} />
        {desconto > 0 && (
          <LinhaTotal T={T} label="Desconto" valor={`− ${fmtBRL(desconto, { fr: true })}`} cor={corEtapa('green', dark)} />
        )}
        <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>Total</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {fmtBRL(total, { fr: true })}
          </span>
        </div>
      </div>

      {/* Status de pagamento (visível quando há valor_pago) */}
      {(pagoTotal || pagoParcial || valorPago > 0) && (
        <div style={{
          background: pagoTotal ? cor('#0f2a15', '#e8f5ec')
                     : pagoParcial ? cor('#2a2000', '#fdf6dc')
                     : T.cardAlt,
          border: `1px solid ${pagoTotal ? verde + '55' : pagoParcial ? amarelo + '55' : T.border}`,
          borderRadius: 8, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: T.textSecondary,
        }}>
          <i className={`ti ${pagoTotal ? 'ti-circle-check' : pagoParcial ? 'ti-circle-half' : 'ti-circle-off'}`}
             style={{ fontSize: 16, color: pagoTotal ? verde : pagoParcial ? amarelo : T.textMuted }} aria-hidden="true" />
          <span style={{ flex: 1 }}>
            {pagoTotal && <strong style={{ color: verde }}>Pago R$ {valorPago.toLocaleString('pt-BR')} via {formaIdToLabel(os.forma_pagamento) || 'não informado'}</strong>}
            {pagoParcial && !pagoTotal && <strong style={{ color: amarelo }}>Parcial · R$ {valorPago.toLocaleString('pt-BR')} de R$ {total.toLocaleString('pt-BR')}</strong>}
          </span>
        </div>
      )}

      {/* Aprovar / Recusar (só em Orçamento) */}
      {isOrcamento && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <button
            onClick={aprovarOrcamento}
            style={{
              padding: '12px 16px', borderRadius: 8, border: 'none',
              background: verde, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <i className="ti ti-check" style={{ fontSize: 17 }} aria-hidden="true" />
            Aprovar orçamento · ir pra oficina
          </button>
          <button
            onClick={recusarOrcamento}
            style={{
              padding: '12px 14px', borderRadius: 8,
              border: `1px solid ${vermelho}55`,
              background: cor('#2a1515', '#fde8e8'),
              color: vermelho,
              fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
            Recusar
          </button>
        </div>
      )}

      {/* Forma de pagamento — sempre disponível quando há saldo a receber.
          Cliente pode pagar adiantado em qualquer etapa (limpeza pré-paga, etc.) */}
      {aPagar > 0 && (
        <>
          <Separador T={T} cor={amarelo}>
            {isPagamento ? 'RECEBER PAGAMENTO' : 'RECEBER (PAGAMENTO ADIANTADO)'}
          </Separador>
          <FormRecebimento
            T={T} dark={dark}
            saldo={aPagar}
            onConfirmar={handleConfirmarPagamento}
            onEnviarLink={() => {/* Módulo 03: gera link real via API InfinitePay */}}
            onGerarPix={() => {/* Módulo 03: gera QR PIX dinâmico */}}
          />
        </>
      )}

    </div>
  )
}

// ─── helpers visuais ────────────────────────────────────────────────────────
function ItemLinha({ item, T, dark, editavel, onChange, onRemove, primeiro }) {
  const cor = (d, c) => dark ? d : c
  const icone = item.tipo === 'peca' ? 'ti-package' : item.tipo === 'maquina' ? 'ti-device-washing-machine' : 'ti-tool'
  const corIcone = item.tipo === 'peca' ? cor(P.yellow, P.yellowDark)
                  : item.tipo === 'maquina' ? cor(P.green, P.greenDark)
                  : cor(P.blue, P.blueDark)
  const subtotal = item.valor * item.qtd

  if (!editavel) {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10,
        alignItems: 'center',
        padding: '10px 12px',
        borderTop: primeiro ? 'none' : `1px solid ${T.border}`,
      }}>
        <i className={`ti ${icone}`} style={{ fontSize: 15, color: corIcone }} aria-hidden="true" />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, color: T.textPrimary, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{item.nome}</div>
          <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>
            ×{item.qtd} · {fmtBRL(item.valor, { fr: true })}
          </div>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, color: cor(P.blue, P.blueDark),
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtBRL(subtotal, { fr: true })}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '90px 1fr 60px 90px auto', gap: 8,
      alignItems: 'center',
      padding: '10px 12px',
      borderTop: primeiro ? 'none' : `1px solid ${T.border}`,
    }}>
      <select
        value={item.tipo}
        onChange={(e) => onChange({ tipo: e.target.value })}
        style={{
          padding: '5px 6px', borderRadius: 5,
          border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
          fontSize: 10.5, fontFamily: 'inherit',
          colorScheme: dark ? 'dark' : 'light',
        }}>
        <option value="servico">serviço</option>
        <option value="peca">peça</option>
        <option value="maquina">máquina</option>
      </select>
      <input
        value={item.nome}
        onChange={(e) => onChange({ nome: e.target.value })}
        placeholder="Nome do item"
        style={inputStyle(T)}
      />
      <input
        type="number" min="1"
        value={item.qtd}
        onChange={(e) => onChange({ qtd: Math.max(1, Number(e.target.value) || 1) })}
        style={{ ...inputStyle(T), textAlign: 'center' }}
      />
      <input
        type="number" min="0" step="0.01"
        value={item.valor}
        onChange={(e) => onChange({ valor: Math.max(0, Number(e.target.value) || 0) })}
        style={{ ...inputStyle(T), textAlign: 'right' }}
      />
      <button
        onClick={onRemove}
        aria-label="Remover item"
        style={{
          padding: '6px 8px', borderRadius: 5,
          border: 'none', background: 'transparent',
          color: T.textMuted, cursor: 'pointer',
        }}>
        <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
    </div>
  )
}

function CampoDesconto({ T, label, prefix, suffix, valor, onChange }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px',
      }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {prefix && <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>{prefix}</span>}
        <input
          type="number" min="0"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle(T), flex: 1, textAlign: 'right' }}
        />
        {suffix && <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>{suffix}</span>}
      </div>
    </div>
  )
}

function inputStyle(T) {
  return {
    padding: '6px 8px', borderRadius: 5,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 11.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    minWidth: 0,
  }
}

function LinhaTotal({ T, label, valor, cor: c }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      fontSize: 12, color: T.textMuted, marginBottom: 4,
    }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, color: c || T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </span>
    </div>
  )
}

function Separador({ T, cor, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <span style={{
        fontSize: 10, color: cor, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.6px',
      }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}
