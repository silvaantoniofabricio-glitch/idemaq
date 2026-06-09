// idemaq-src/components/financeiro/LancamentoDetalheModal.jsx
// Detalhe do lançamento financeiro — modal único adaptativo aos 3 tipos:
//   - 'receber' : conta a receber → ações [Excluir] [Editar] [Baixar]
//   - 'pagar'   : conta a pagar   → ações [Excluir] [Editar] [Pagar]
//   - 'caixa'   : movimentação confirmada → read-only · só [Excluir]
// Regra de negócio: Caixa só permite exclusão (sem edição). Módulo 07 do plano.
// Edição inline plugada em 20/05/2026 — troca o body por form quando editando.

import React, { useState, useEffect } from 'react'
import { Modal, Button, Badge, SubCard, useToast } from '../ui'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtBRL, fmtPrazoCurto, hojeISO } from '../../utils/fmt'
import { CATEGORIAS_SUGESTAO } from '../../hooks/useFinanceiro'

const FORMAS_EDIT = [
  { id: 'pix',                label: 'PIX',                temTaxa: false },
  { id: 'dinheiro',           label: 'Dinheiro',           temTaxa: false },
  { id: 'debito',             label: 'Cartão débito',      temTaxa: true  },
  { id: 'credito_1x',         label: 'Cartão 1x',          temTaxa: true  },
  { id: 'credito_parcelado',  label: 'Cartão parcelado',   temTaxa: true  },
  { id: 'link_pagamento',     label: 'Link InfinitePay',   temTaxa: true  },
  { id: 'boleto',             label: 'Boleto',             temTaxa: false },
  { id: 'transferencia',      label: 'Transferência',      temTaxa: false },
  { id: 'a_prazo',            label: 'A prazo',            temTaxa: false },
]

// ─── Status do vencimento (mesma regra usada em Financeiro.jsx) ──────────────
function statusVencimento(isoData) {
  if (!isoData) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const d = new Date(isoData + 'T00:00:00')
  const diff = Math.round((d - hoje) / 86400000)
  if (diff < 0)   return { tipo: 'vencido', dias: -diff, label: `Venceu há ${-diff}d`, cor: 'red',    icon: 'ti-alert-triangle'   }
  if (diff === 0) return { tipo: 'hoje',    dias: 0,     label: 'Vence hoje',          cor: 'yellow', icon: 'ti-clock'            }
  if (diff === 1) return { tipo: 'amanha',  dias: 1,     label: 'Vence amanhã',        cor: 'yellow', icon: 'ti-calendar-due'     }
  return                  { tipo: 'futuro', dias: diff,  label: `Vence em ${diff} dias`, cor: 'blue', icon: 'ti-calendar-event'   }
}

// Configuração visual por tipo de lançamento ----------------------------------
function configTipo(item, tipo, dark) {
  if (tipo === 'receber') {
    return {
      corKey: 'blue',
      cor: corEtapa('blue', dark),
      bg: bgEtapa('blue', dark),
      icon: 'ti-arrow-down-circle',
      labelTipo: 'A RECEBER',
      sinal: '+',
      isoData: item.vencimento,
      labelData: 'Vencimento',
      acaoLabel: 'Baixar recebimento',
      acaoIcon: 'ti-check',
    }
  }
  if (tipo === 'pagar') {
    return {
      corKey: 'yellow',
      cor: corEtapa('yellow', dark),
      bg: bgEtapa('yellow', dark),
      icon: 'ti-arrow-up-circle',
      labelTipo: 'A PAGAR',
      sinal: '−',
      isoData: item.vencimento,
      labelData: 'Vencimento',
      acaoLabel: 'Confirmar pagamento',
      acaoIcon: 'ti-check',
    }
  }
  // caixa
  const ehReceita = item.tipo === 'receita'
  return {
    corKey: ehReceita ? 'blue' : 'yellow',
    cor: corEtapa(ehReceita ? 'blue' : 'yellow', dark),
    bg: bgEtapa(ehReceita ? 'blue' : 'yellow', dark),
    icon: ehReceita ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle',
    labelTipo: ehReceita ? 'RECEITA CONFIRMADA' : 'DESPESA CONFIRMADA',
    sinal: ehReceita ? '+' : '−',
    isoData: item.data,
    labelData: 'Data',
    acaoLabel: null,
    acaoIcon: null,
  }
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function LancamentoDetalheModal({
  T, dark,
  lancamento,
  tipo,                  // 'receber' | 'pagar' | 'caixa'
  contas = [],           // [{ id, nome, tipo }] — pro select de conta no modo edição
  onClose,
  onBaixar,              // (lancamento, opts?) → registra baixa. opts.valorRecebido permite parcial
  onSalvarEdicao,        // async (id, patch) → { error? } — edição inline
  onExcluir,             // (lancamento) → remove
  mobile = false,
}) {
  if (!lancamento) return null
  const cor = (d, c) => dark ? d : c
  const cfg = configTipo(lancamento, tipo, dark)
  const st = cfg.isoData ? statusVencimento(cfg.isoData) : null
  const ehCaixa = tipo === 'caixa'
  const notify = useToast()

  // Ações destrutivas/irreversíveis exigem confirmação dentro do próprio modal:
  // 1º clique troca o rodapé pra "Tem certeza? · [Voltar] [Confirmar]" — evita
  // que clique acidental no botão primário (Baixar/Pagar) ou no Excluir conclua
  // a transação sem chance de voltar. null = estado normal.
  const [pendente, setPendente] = useState(null)  // null | 'baixar' | 'excluir'
  // Modo edição inline: body vira form pré-preenchido com valores atuais.
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState(null)
  // Se trocar de item (sem fechar modal), reseta o estado de confirmação/edição
  useEffect(() => {
    setPendente(null)
    setEditando(false)
    setForm(null)
  }, [lancamento?.id])

  function entrarEmEdicao() {
    setForm({
      valor:           String(lancamento.valor ?? ''),
      vencimento:      lancamento.vencimento || '',
      categoria:       lancamento.categoria || '',
      descricao:       lancamento.descricao || '',
      conta_id:        lancamento.conta_id || '',
      forma_pagamento: lancamento.forma_enum || '',
      taxa_pct:        String(lancamento.taxa_pct ?? lancamento.taxa ?? ''),
    })
    setEditando(true)
  }

  async function salvarEdicao() {
    if (!form || salvando) return
    const patch = {
      valor:           Number(String(form.valor).replace(',', '.')) || 0,
      vencimento:      form.vencimento || null,
      categoria:       form.categoria,
      descricao:       form.descricao,
      conta_id:        form.conta_id || null,
      forma_pagamento: form.forma_pagamento || null,
      taxa_pct:        Number(String(form.taxa_pct).replace(',', '.')) || 0,
    }
    if (!patch.valor || patch.valor <= 0) {
      notify('erro', 'Valor precisa ser maior que zero')
      return
    }
    if (!patch.descricao?.trim()) {
      notify('erro', 'Descrição obrigatória')
      return
    }
    setSalvando(true)
    const res = await onSalvarEdicao?.(lancamento.id, patch)
    setSalvando(false)
    if (res?.error) {
      if (res.error.code === 'OFFLINE') {
        notify('info', 'Modo demo: edição não persiste. Aplique sql/01 no Supabase.')
      } else {
        notify('erro', `Falha ao salvar: ${res.error.message || 'erro desconhecido'}`)
      }
      return
    }
    notify('ok', 'Lançamento atualizado')
    setEditando(false)
  }

  const vermelho = corEtapa('red', dark)
  const amarelo = corEtapa('yellow', dark)

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={580}>
      {/* Header colorido — ícone do tipo + label + botão fechar */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: cfg.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: cor('#0a0a0d33', '#ffffff'),
            border: `1px solid ${cfg.cor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <i className={`ti ${cfg.icon}`} style={{ fontSize: 22, color: cfg.cor }} aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px',
              color: cfg.cor, marginBottom: 2,
            }}>
              {cfg.labelTipo}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: corHero(dark),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 360,
            }}>
              {tipo === 'receber' ? lancamento.cliente : lancamento.descricao}
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.textMuted, padding: 6, borderRadius: 6, flexShrink: 0,
          }}>
          <i className="ti ti-x" style={{ fontSize: 22 }} aria-hidden="true" />
        </button>
      </div>

      {/* Corpo rolável — modo view OU form (edição inline) */}
      {editando ? (
        <FormEdicao
          T={T} dark={dark}
          form={form} setForm={setForm}
          contas={contas}
          tipoLanc={lancamento.tipo /* 'receita' | 'despesa' do shape UI */}
        />
      ) : (
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

        {/* Hero: valor grande + status */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginBottom: 18, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ ...sectionLabel, marginBottom: 4 }}>Valor</div>
            <div style={{
              fontSize: 30, fontWeight: 800, color: corHero(dark),
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>
              <span style={{ color: cfg.cor, marginRight: 4 }}>{cfg.sinal}</span>
              {fmtBRL(lancamento.valor)}
            </div>
          </div>
          {st && (
            <Badge variant={st.cor === 'red' ? 'vermelho' : st.cor === 'yellow' ? 'amarelo' : 'azul'} dark={dark}>
              <i className={`ti ${st.icon}`} aria-hidden="true" /> {st.label}
            </Badge>
          )}
        </div>

        {/* Identificação */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-id" style={{ fontSize: 15, color: cfg.cor }} aria-hidden="true" />
            <span style={sectionLabel}>Identificação</span>
          </div>
          <SubCard T={T}>
            <div style={{ display: 'grid', gap: 10 }}>
              {tipo === 'receber' && (
                <>
                  <CampoLinha T={T} label="Cliente" valor={lancamento.cliente} />
                  {lancamento.osNum != null && (
                    <CampoLinha T={T} label="OS vinculada" valor={`#${lancamento.osNum}`} />
                  )}
                  <CampoLinha T={T} label="Descrição" valor={lancamento.descricao} />
                </>
              )}
              {tipo === 'pagar' && (
                <>
                  <CampoLinha T={T} label="Descrição" valor={lancamento.descricao} />
                  <CampoLinha T={T} label="Categoria"
                    valor={lancamento.categoria}
                    icon="ti-tag" iconCor={cfg.cor} />
                  {lancamento.recorrente && (
                    <CampoLinha T={T} label="Tipo"
                      valor={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <i className="ti ti-rotate-clockwise" style={{ fontSize: 13, color: cfg.cor }} aria-hidden="true" />
                          Recorrente
                        </span>
                      } />
                  )}
                </>
              )}
              {tipo === 'caixa' && (
                <>
                  <CampoLinha T={T} label="Descrição" valor={lancamento.descricao} />
                  <CampoLinha T={T} label="Tipo"
                    valor={lancamento.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    icon={cfg.icon} iconCor={cfg.cor} />
                </>
              )}
            </div>
          </SubCard>
        </div>

        {/* Vencimento / Data */}
        {cfg.isoData && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <i className="ti ti-calendar" style={{ fontSize: 15, color: cfg.cor }} aria-hidden="true" />
              <span style={sectionLabel}>{cfg.labelData}</span>
            </div>
            <SubCard T={T}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 600, color: corHero(dark),
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {new Date(cfg.isoData + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </span>
                <span style={{
                  fontSize: 11.5, color: T.textMuted,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtPrazoCurto(cfg.isoData)}
                </span>
              </div>
            </SubCard>
          </div>
        )}

        {/* Forma de pagamento / Banco */}
        {(lancamento.forma || lancamento.banco) && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <i className="ti ti-credit-card" style={{ fontSize: 15, color: cfg.cor }} aria-hidden="true" />
              <span style={sectionLabel}>
                {lancamento.banco ? 'Banco / cartão' : 'Forma de pagamento'}
              </span>
            </div>
            <SubCard T={T}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className={`ti ${lancamento.banco ? 'ti-building-bank' : 'ti-credit-card'}`}
                   style={{ fontSize: 15, color: cfg.cor }} aria-hidden="true" />
                <span style={{ fontSize: 13, color: corHero(dark), fontWeight: 600 }}>
                  {lancamento.forma || lancamento.banco}
                </span>
              </div>
            </SubCard>
          </div>
        )}

        {/* Aviso de read-only no caixa */}
        {ehCaixa && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 12px', borderRadius: 9,
            background: bgEtapa('neutro', dark),
            border: `1px solid ${T.border}`,
            marginTop: 4,
          }}>
            <i className="ti ti-lock" style={{ fontSize: 16, color: T.textMuted, marginTop: 1 }} aria-hidden="true" />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textSecondary, marginBottom: 2 }}>
                Movimentação confirmada
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.45 }}>
                Por regra, registros no caixa não podem ser editados — só excluídos.
                Pra ajustar, exclua e crie um novo lançamento.
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Rodapé: edição OU confirmação OU ações normais */}
      {editando ? (
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: T.cardAlt, flexShrink: 0,
        }}>
          <Button T={T} dark={dark} variant="ghost" size="sm"
            onClick={() => { setEditando(false); setForm(null) }}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm"
            iconLeft={salvando ? 'ti-loader-2' : 'ti-check'}
            onClick={salvarEdicao}
            disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      ) : pendente ? (
        <ConfirmacaoFooter T={T} dark={dark}
          pendente={pendente}
          tipo={tipo}
          valor={lancamento.valor}
          formaInicial={lancamento.forma_enum}
          acaoLabel={cfg.acaoLabel}
          acaoIcon={cfg.acaoIcon}
          corDestaque={pendente === 'excluir' ? vermelho : cfg.cor}
          bgDestaque={pendente === 'excluir' ? bgEtapa('red', dark) : bgEtapa('yellow', dark)}
          onVoltar={() => setPendente(null)}
          onConfirmar={(opts) => {
            if (pendente === 'baixar') onBaixar?.(lancamento, opts)
            else if (pendente === 'excluir') onExcluir?.(lancamento)
          }}
        />
      ) : (
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', gap: 8,
          background: T.cardAlt, flexShrink: 0, flexWrap: 'wrap',
        }}>
          <Button T={T} dark={dark} variant="danger" size="sm"
            iconLeft="ti-trash"
            onClick={() => setPendente('excluir')}>
            Excluir
          </Button>

          <div style={{ display: 'flex', gap: 8 }}>
            {!ehCaixa && (
              <Button T={T} dark={dark} variant="secondary" size="sm"
                iconLeft="ti-pencil"
                onClick={entrarEmEdicao}>
                Editar
              </Button>
            )}
            {!ehCaixa && cfg.acaoLabel && (
              <Button variant="primary" size="sm"
                iconLeft={cfg.acaoIcon}
                onClick={() => setPendente('baixar')}>
                {cfg.acaoLabel}
              </Button>
            )}
            {ehCaixa && (
              <Button T={T} dark={dark} variant="secondary" size="sm" onClick={onClose}>
                Fechar
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Footer de confirmação ──────────────────────────────────────────────────
// Aparece quando o usuário clica em Baixar/Pagar ou Excluir — força o passo
// de "Tem certeza?" pra evitar conclusão acidental por click errado.
function ConfirmacaoFooter({
  T, dark, pendente, tipo, valor, formaInicial, acaoLabel, acaoIcon,
  corDestaque, bgDestaque, onVoltar, onConfirmar,
}) {
  const ehExcluir = pendente === 'excluir'
  // Permite ajustar o valor recebido/pago (pagamentos parciais).
  // Default = valor total. Se < total: cria entrada paga parcial e mantem o
  // restante em aberto. Se >= total: baixa integral (comportamento de sempre).
  const [valorRecebidoStr, setValorRecebidoStr] = useState(
    Number(valor || 0).toFixed(2).replace('.', ',')
  )
  // Data do recebimento/pagamento — pré-preenchida com hoje (fuso local), editável.
  const hoje = hojeISO()
  const [pagoEm, setPagoEm] = useState(hoje)
  // Forma de pagamento — default = a do lançamento, ou PIX.
  const [formaPag, setFormaPag] = useState(formaInicial || 'pix')
  const valorRecebido = Number(String(valorRecebidoStr).replace(',', '.')) || 0
  const ehParcial = !ehExcluir && valorRecebido > 0 && valorRecebido < Number(valor || 0)
  const restante = Math.max(0, Number(valor || 0) - valorRecebido)

  const titulo = ehExcluir
    ? 'Excluir este lançamento?'
    : tipo === 'receber'
      ? (ehParcial
          ? `Recebimento parcial de ${fmtBRL(valorRecebido, { fr: true })}?`
          : `Confirmar recebimento de ${fmtBRL(valor)}?`)
      : (ehParcial
          ? `Pagamento parcial de ${fmtBRL(valorRecebido, { fr: true })}?`
          : `Confirmar pagamento de ${fmtBRL(valor)}?`)
  const subtitulo = ehExcluir
    ? 'O lançamento será removido. Esta ação não pode ser desfeita.'
    : ehParcial
      ? `Sobra ${fmtBRL(restante, { fr: true })} em aberto pra cobrar depois.`
      : tipo === 'receber'
        ? 'Vai sair da lista de "A receber" e entrar no Caixa como receita confirmada.'
        : 'Vai sair da lista de "A pagar" e entrar no Caixa como despesa confirmada.'

  return (
    <div style={{
      borderTop: `1px solid ${T.border}`,
      background: bgDestaque,
      flexShrink: 0,
    }}>
      <div style={{
        padding: '12px 20px 4px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <i className={`ti ${ehExcluir ? 'ti-alert-triangle' : 'ti-help-circle'}`}
           style={{ fontSize: 18, color: corDestaque, marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: corHero(dark), marginBottom: 2 }}>
            {titulo}
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.4 }}>
            {subtitulo}
          </div>
        </div>
      </div>

      {/* Input de valor — so na baixa (receber/pagar), nao na exclusao */}
      {!ehExcluir && (
        <div style={{
          padding: '4px 20px 4px 48px',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <label style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>
            {tipo === 'receber' ? 'Valor recebido' : 'Valor pago'}
          </label>
          <input
            type="text" inputMode="decimal"
            value={valorRecebidoStr}
            onChange={e => setValorRecebidoStr(e.target.value)}
            style={{
              width: 110,
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '5px 8px',
              color: T.textPrimary, fontSize: 13, fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <span style={{ fontSize: 11, color: T.textDim }}>
            de {fmtBRL(valor, { fr: true })}
          </span>
        </div>
      )}

      {/* Data do recebimento/pagamento + forma — só na baixa (não na exclusão) */}
      {!ehExcluir && (
        <div style={{
          padding: '4px 20px 8px 48px',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <label style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>
            {tipo === 'receber' ? 'Data do recebimento' : 'Data do pagamento'}
          </label>
          <input
            type="date"
            value={pagoEm}
            onChange={e => setPagoEm(e.target.value || hoje)}
            style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '5px 8px',
              color: T.textPrimary, fontSize: 13, fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              colorScheme: dark ? 'dark' : 'light',
            }}
          />
          <label style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, marginLeft: 4 }}>
            Forma
          </label>
          <select
            value={formaPag}
            onChange={e => setFormaPag(e.target.value)}
            style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '5px 8px',
              color: T.textPrimary, fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            {FORMAS_EDIT.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      )}

      <div style={{
        padding: '10px 20px 12px',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <Button T={T} dark={dark} variant="secondary" size="sm"
          iconLeft="ti-arrow-left"
          onClick={onVoltar}>
          Voltar
        </Button>
        <Button
          variant={ehExcluir ? 'danger' : 'primary'}
          size="sm"
          iconLeft={ehExcluir ? 'ti-trash' : (acaoIcon || 'ti-check')}
          disabled={!ehExcluir && valorRecebido <= 0}
          onClick={() => onConfirmar(ehExcluir ? undefined : { valorRecebido, pago_em: pagoEm, forma_pagamento: formaPag })}>
          {ehExcluir
            ? 'Sim, excluir'
            : ehParcial
              ? `Sim, baixar ${fmtBRL(valorRecebido, { fr: true })}`
              : `Sim, ${acaoLabel?.toLowerCase() || 'confirmar'}`}
        </Button>
      </div>
    </div>
  )
}

// ─── Linha "label · valor" usada dentro dos SubCards ─────────────────────────
function CampoLinha({ T, label, valor, icon, iconCor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12,
    }}>
      <span style={{
        fontSize: 11.5, color: T.textMuted, fontWeight: 500,
      }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 600, color: T.textPrimary,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        textAlign: 'right', maxWidth: '70%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 13, color: iconCor }} aria-hidden="true" />}
        {valor}
      </span>
    </div>
  )
}

// ─── Form de edição inline ──────────────────────────────────────────────────
// Renderizado dentro do body quando `editando=true`. Mantém o cabeçalho
// colorido + footer normais — só troca o miolo por inputs pré-preenchidos.
function FormEdicao({ T, dark, form, setForm, contas, tipoLanc }) {
  if (!form) return null
  const tipoBase = tipoLanc === 'despesa' ? 'despesa' : 'receita'
  const categoriasSugestao = CATEGORIAS_SUGESTAO[tipoBase] || []
  const formaSel = FORMAS_EDIT.find(f => f.id === form.forma_pagamento)
  const mostraTaxa = formaSel?.temTaxa

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '14px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <FieldLabel T={T}>Valor</FieldLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>R$</span>
        <input type="number" min="0" step="0.01" value={form.valor}
          onChange={e => set('valor', e.target.value)}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 7,
            border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
            fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            outline: 'none', textAlign: 'right',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }} />
      </div>

      <FieldLabel T={T}>Descrição</FieldLabel>
      <input type="text" value={form.descricao}
        onChange={e => set('descricao', e.target.value)}
        style={editInputStyle(T)} />

      <FieldLabel T={T}>Categoria</FieldLabel>
      <input type="text" list="cat-edit-sugestao" value={form.categoria}
        onChange={e => set('categoria', e.target.value)}
        style={editInputStyle(T)} />
      <datalist id="cat-edit-sugestao">
        {categoriasSugestao.map(c => <option key={c} value={c} />)}
      </datalist>

      <FieldLabel T={T}>
        Conta bancária <span style={{ color: T.textDim, fontWeight: 400, textTransform: 'none' }}>· opcional</span>
      </FieldLabel>
      <select value={form.conta_id} onChange={e => set('conta_id', e.target.value)}
        style={editInputStyle(T)}>
        <option value="">— sem conta definida —</option>
        {contas.map(c => (
          <option key={c.id} value={c.id}>{c.nome}{c.tipo ? ` (${c.tipo})` : ''}</option>
        ))}
      </select>

      <FieldLabel T={T}>Vencimento</FieldLabel>
      <input type="date" value={form.vencimento || ''}
        onChange={e => set('vencimento', e.target.value)}
        style={{ ...editInputStyle(T), colorScheme: dark ? 'dark' : 'light' }} />

      <FieldLabel T={T}>
        Forma de pagamento <span style={{ color: T.textDim, fontWeight: 400, textTransform: 'none' }}>· opcional</span>
      </FieldLabel>
      <select value={form.forma_pagamento || ''}
        onChange={e => set('forma_pagamento', e.target.value)}
        style={editInputStyle(T)}>
        <option value="">— nenhuma —</option>
        {FORMAS_EDIT.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>

      {mostraTaxa && (
        <>
          <FieldLabel T={T}>
            Taxa <span style={{ color: T.textDim, fontWeight: 400, textTransform: 'none' }}>· % sobre o valor</span>
          </FieldLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="number" min="0" step="0.01" value={form.taxa_pct}
              onChange={e => set('taxa_pct', e.target.value)}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 7,
                border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                fontSize: 14, fontVariantNumeric: 'tabular-nums',
                outline: 'none', textAlign: 'right',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }} />
            <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>%</span>
          </div>
        </>
      )}
    </div>
  )
}

function FieldLabel({ T, children }) {
  return (
    <label style={{
      display: 'block', fontSize: 10.5, color: T.textMuted, fontWeight: 700,
      marginBottom: -4, textTransform: 'uppercase', letterSpacing: '.4px',
    }}>{children}</label>
  )
}

function editInputStyle(T) {
  return {
    width: '100%', padding: '9px 12px', borderRadius: 7,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }
}
