// idemaq-src/components/estoque/PecaDetalheModal.jsx
// Detalhe de uma peça — ficha visual + histórico de movimentações.
// Módulo 06 chat 2 troca o histórico mock por consulta real no Supabase.
// Mesmo padrão visual do ClienteDetalheModal: gradient header + secoes
// separadas por divider + footer com acoes.

import React from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, Button, Badge, useToast } from '../ui'

// ─── Mock de movimentações ─────────────────────────────────────────────────
// Cada peça gera um histórico fictício a partir do id, pra demo da ficha.
// Tipos cobertos: entrada manual, entrada NF, baixa em OS, ajuste manual.
const TIPOS_MOV = {
  entrada_manual: { label: 'Entrada manual', icon: 'ti-package-import',  cor: 'green'  },
  entrada_nf:     { label: 'Entrada por NF', icon: 'ti-file-invoice',    cor: 'green'  },
  baixa_os:       { label: 'Baixa em OS',    icon: 'ti-arrow-down-right',cor: 'yellow' },
  ajuste:         { label: 'Ajuste manual',  icon: 'ti-pencil',          cor: 'neutro' },
}

function movsMock(peca) {
  const base = peca.id * 7
  return [
    { id: 1, tipo: 'entrada_nf',     delta: +12, data: '2026-04-12 09:14', responsavel: 'Toni',       obs: `NF #${1820 + base} · Atacado MS` },
    { id: 2, tipo: 'baixa_os',       delta: -2,  data: '2026-04-22 14:30', responsavel: 'Guilherme',  obs: `OS #${1090 + base}` },
    { id: 3, tipo: 'baixa_os',       delta: -1,  data: '2026-05-03 10:05', responsavel: 'Guilherme',  obs: `OS #${1102 + base}` },
    { id: 4, tipo: 'ajuste',         delta: -1,  data: '2026-05-08 17:40', responsavel: 'Toni',       obs: 'Peça quebrada no manuseio' },
    { id: 5, tipo: 'entrada_manual', delta: +5,  data: '2026-05-14 11:20', responsavel: 'Alessandro', obs: 'Compra avulsa ML' },
  ]
}

function nivel(qtd, min) {
  if (qtd <= 0) return { variant: 'vermelho', label: 'Esgotado', icon: 'ti-alert-octagon' }
  if (qtd <= min) return { variant: 'amarelo', label: 'Estoque baixo', icon: 'ti-alert-triangle' }
  return { variant: 'azul', label: 'Estoque OK', icon: 'ti-check' }
}

function pctLucro(custo, venda) {
  if (!custo || !venda) return 0
  return Math.round(((venda - custo) / custo) * 100)
}

export default function PecaDetalheModal({ T, dark, peca, onClose, mobile }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  const nv = nivel(peca.qtdAtual, peca.qtdMinima)
  const lucro = pctLucro(peca.custoAtual, peca.precoVenda)
  const margemRS = peca.precoVenda - peca.custoAtual
  const movs = movsMock(peca)

  // Posição da qtd atual entre mínimo e máximo (0–100)
  const range = Math.max(1, peca.qtdMaxima - 0)
  const pctAtual = Math.min(100, Math.max(0, (peca.qtdAtual / range) * 100))
  const pctMin   = Math.min(100, Math.max(0, (peca.qtdMinima / range) * 100))

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }
  const labelMini = {
    fontSize: 10, color: T.textMuted, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    marginBottom: 3,
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={620}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: cor('#0d2035', '#e6f1fb'),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: `linear-gradient(135deg, ${azul}, ${cor('#3a7bbf', '#2860a0')})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${azul}33`,
          }} aria-hidden="true">
            <i className="ti ti-puzzle" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: corHero(dark),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{peca.nome}</div>
            <div style={{
              fontSize: 11, color: T.textMuted, marginTop: 3,
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <i className="ti ti-barcode" style={{ fontSize: 12 }} aria-hidden="true" />
              <span>{peca.sku}</span>
              <span style={{ width: 3, height: 3, background: T.textMuted, borderRadius: '50%' }} />
              <span>{peca.fornecedor}</span>
            </div>
          </div>
        </div>
        <Badge variant={nv.variant} dark={dark} sm>
          <i className={`ti ${nv.icon}`} aria-hidden="true" /> {nv.label}
        </Badge>
        <button onClick={onClose} aria-label="Fechar"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.textMuted, padding: 6, borderRadius: 6, flexShrink: 0,
          }}>
          <i className="ti ti-x" style={{ fontSize: 22 }} aria-hidden="true" />
        </button>
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

        {/* Estoque */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-stack-2" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Estoque</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center',
            padding: '12px 14px',
            background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
          }}>
            {/* Qtd grande */}
            <div style={{ textAlign: 'center', minWidth: 92 }}>
              <div style={{
                fontSize: 32, fontWeight: 800,
                color: nv.variant === 'vermelho' ? vermelho
                     : nv.variant === 'amarelo'  ? amarelo
                     : corHero(dark),
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>{peca.qtdAtual}</div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                em estoque
              </div>
            </div>

            {/* Barra mín/atual/máx */}
            <div>
              <div style={{
                position: 'relative', height: 10,
                background: cor('#1a1a1d', '#eaeaee'),
                borderRadius: 6, overflow: 'hidden',
              }}>
                {/* Faixa atual */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${pctAtual}%`,
                  background: nv.variant === 'vermelho' ? vermelho
                            : nv.variant === 'amarelo'  ? amarelo
                            : verde,
                  transition: 'width .25s',
                }} />
                {/* Marca do mínimo */}
                <div title={`Mínimo: ${peca.qtdMinima}`} style={{
                  position: 'absolute', top: -2, bottom: -2,
                  left: `calc(${pctMin}% - 1px)`,
                  width: 2, background: amarelo,
                  borderRadius: 1,
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 10.5, color: T.textMuted, marginTop: 6,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <span>0</span>
                <span><i className="ti ti-flag" style={{ fontSize: 11, color: amarelo, marginRight: 3 }} aria-hidden="true" />mín {peca.qtdMinima}</span>
                <span>máx {peca.qtdMaxima}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Custos & preços */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-cash" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Custos & preço</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 10,
          }}>
            <BlocoValor T={T} label="Custo atual" valor={fmtBRL(peca.custoAtual)}
              corValor={T.textSecondary} dark={dark} />
            <BlocoValor T={T} label="Preço venda" valor={fmtBRL(peca.precoVenda)}
              corValor={corHero(dark)} dark={dark} destaque />
            <BlocoValor T={T} label="Margem"
              valor={`${lucro}% · ${fmtBRL(margemRS)}`}
              corValor={azul} dark={dark} />
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Movimentações */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <i className="ti ti-history" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Movimentações</span>
            <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
              últimas {movs.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {movs.map(m => {
              const t = TIPOS_MOV[m.tipo]
              const corDelta = m.delta > 0 ? verde : m.delta < 0 ? amarelo : T.textMuted
              return (
                <div key={m.id} style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center',
                  padding: '10px 12px',
                  background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: corEtapa(t.cor === 'neutro' ? 'blue' : t.cor, dark) + '22',
                    color: corEtapa(t.cor === 'neutro' ? 'blue' : t.cor, dark),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15,
                  }} aria-hidden="true">
                    <i className={`ti ${t.icon}`} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>
                        {t.label}
                      </span>
                      <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                        · {m.data.slice(0, 10).split('-').reverse().join('/')}
                      </span>
                      <span style={{ fontSize: 11, color: T.textMuted }}>
                        · {m.responsavel}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: T.textMuted, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.obs}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: corDelta,
                    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                  }}>
                    {m.delta > 0 ? '+' : ''}{m.delta}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', gap: 8,
        background: T.cardAlt, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <Button T={T} dark={dark} variant="ghost" iconLeft="ti-pencil"
          onClick={() => notify('info', 'Edição da peça — Módulo 06 chat 1')}>
          Editar peça
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button T={T} dark={dark} variant="secondary" onClick={onClose}>Fechar</Button>
          <Button variant="primary" iconLeft="ti-arrows-up-down"
            onClick={() => notify('info', 'Ajuste manual de estoque — Módulo 06 chat 2')}>
            Ajustar estoque
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Bloco de valor (label uppercase + número grande) ──────────────────────
function BlocoValor({ T, label, valor, corValor, destaque }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: T.cardAlt, border: `1px solid ${T.border}`,
      borderRadius: 9,
    }}>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontSize: destaque ? 16 : 14,
        fontWeight: destaque ? 800 : 700,
        color: corValor,
        fontVariantNumeric: 'tabular-nums',
      }}>{valor}</div>
    </div>
  )
}
