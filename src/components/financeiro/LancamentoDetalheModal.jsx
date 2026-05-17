// idemaq-src/components/financeiro/LancamentoDetalheModal.jsx
// Detalhe do lançamento financeiro — modal único adaptativo aos 3 tipos:
//   - 'receber' : conta a receber → ações [Excluir] [Editar] [Baixar]
//   - 'pagar'   : conta a pagar   → ações [Excluir] [Editar] [Pagar]
//   - 'caixa'   : movimentação confirmada → read-only · só [Excluir]
// Regra de negócio: Caixa só permite exclusão (sem edição). Módulo 07 do plano.
// Edição ainda é placeholder — entra com o schema parte 2 (`lancamento_financeiro`).

import React, { useState, useEffect } from 'react'
import { Modal, Button, Badge, SubCard } from '../ui'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtBRL, fmtPrazoCurto } from '../../utils/fmt'

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
  onClose,
  onBaixar,              // (lancamento) → registra baixa (receber/pagar)
  onEditar,              // (lancamento) → abrir edição (placeholder por enquanto)
  onExcluir,             // (lancamento) → remove
  mobile = false,
}) {
  if (!lancamento) return null
  const cor = (d, c) => dark ? d : c
  const cfg = configTipo(lancamento, tipo, dark)
  const st = cfg.isoData ? statusVencimento(cfg.isoData) : null
  const ehCaixa = tipo === 'caixa'

  // Ações destrutivas/irreversíveis exigem confirmação dentro do próprio modal:
  // 1º clique troca o rodapé pra "Tem certeza? · [Voltar] [Confirmar]" — evita
  // que clique acidental no botão primário (Baixar/Pagar) ou no Excluir conclua
  // a transação sem chance de voltar. null = estado normal.
  const [pendente, setPendente] = useState(null)  // null | 'baixar' | 'excluir'
  // Se trocar de item (sem fechar modal), reseta o estado de confirmação
  useEffect(() => { setPendente(null) }, [lancamento?.id])

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

      {/* Corpo rolável */}
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

      {/* Rodapé: ações normais OU painel de confirmação (anti-clique-acidental) */}
      {pendente ? (
        <ConfirmacaoFooter T={T} dark={dark}
          pendente={pendente}
          tipo={tipo}
          valor={lancamento.valor}
          acaoLabel={cfg.acaoLabel}
          acaoIcon={cfg.acaoIcon}
          corDestaque={pendente === 'excluir' ? vermelho : cfg.cor}
          bgDestaque={pendente === 'excluir' ? bgEtapa('red', dark) : bgEtapa('yellow', dark)}
          onVoltar={() => setPendente(null)}
          onConfirmar={() => {
            if (pendente === 'baixar') onBaixar?.(lancamento)
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
                onClick={() => onEditar?.(lancamento)}>
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
  T, dark, pendente, tipo, valor, acaoLabel, acaoIcon,
  corDestaque, bgDestaque, onVoltar, onConfirmar,
}) {
  const ehExcluir = pendente === 'excluir'
  const titulo = ehExcluir
    ? 'Excluir este lançamento?'
    : tipo === 'receber'
      ? `Confirmar recebimento de ${fmtBRL(valor)}?`
      : `Confirmar pagamento de ${fmtBRL(valor)}?`
  const subtitulo = ehExcluir
    ? 'O lançamento será removido. Esta ação não pode ser desfeita.'
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
          onClick={onConfirmar}>
          {ehExcluir ? 'Sim, excluir' : `Sim, ${acaoLabel?.toLowerCase() || 'confirmar'}`}
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
