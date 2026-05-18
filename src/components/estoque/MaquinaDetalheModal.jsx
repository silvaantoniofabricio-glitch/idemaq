// idemaq-src/components/estoque/MaquinaDetalheModal.jsx
// Detalhe de uma máquina do estoque — identificação, breakdown de custos,
// itens usados na reforma e timeline da máquina.
// Módulo 06 chat 4: itens vêm do `os_item` e timeline da `os_historico` da
// OS de Fabricação que originou a máquina.

import React from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, Button, Badge, useToast } from '../ui'

const ESTADO = {
  disponivel: { label: 'Disponível', variant: 'verde',   icon: 'ti-circle-check',   acaoLabel: 'Marcar como vendida', acaoIcon: 'ti-cash' },
  em_revisao: { label: 'Em revisão', variant: 'amarelo', icon: 'ti-tool',           acaoLabel: 'Marcar como disponível', acaoIcon: 'ti-circle-check' },
  do_cliente: { label: 'Do cliente', variant: 'azul',    icon: 'ti-user',           acaoLabel: null, acaoIcon: null },
  vendida:    { label: 'Vendida',    variant: 'neutro',  icon: 'ti-circle-dashed',  acaoLabel: null, acaoIcon: null },
}

// Itens usados na reforma (mock — Módulo 06 chat 4 lê de os_item)
function itensReformaMock(maq) {
  if (maq.estado === 'do_cliente') return []
  const base = maq.id * 3
  return [
    { id: 1, nome: 'Capacitor 8μF universal',     qtd: 1, custoUnit: 12,  total: 12 },
    { id: 2, nome: 'Correia transmissão',         qtd: 1, custoUnit: 40,  total: 40 },
    { id: 3, nome: 'Filtro pluma',                qtd: 1, custoUnit: 22,  total: 22 },
    { id: 4, nome: 'Bomba de drenagem',           qtd: maq.id > 2 ? 1 : 0, custoUnit: 65, total: maq.id > 2 ? 65 : 0 },
    { id: 5, nome: 'Capa',                        qtd: 1, custoUnit: 30,  total: 30 },
  ].filter(i => i.qtd > 0).map((i, idx) => ({ ...i, id: base + idx + 1 }))
}

// Timeline da máquina (mock — Módulo 06 chat 4 lê de os_historico)
function timelineMock(maq) {
  const itens = []
  if (maq.estado === 'do_cliente') {
    itens.push({ id: 1, tipo: 'entrada', label: 'Recebida do cliente', data: '2026-05-10', responsavel: 'Alessandro', obs: 'Em diagnóstico' })
    return itens
  }
  itens.push({ id: 1, tipo: 'entrada',     label: `OS Fabricação #F-${1200 + maq.id}`, data: '2026-04-12', responsavel: 'Toni',      obs: 'Compra direta de máquina usada' })
  itens.push({ id: 2, tipo: 'reforma',     label: 'Reforma concluída',                  data: '2026-04-22', responsavel: 'Guilherme', obs: 'Limpeza + manutenção + teste OK' })
  itens.push({ id: 3, tipo: 'disponivel',  label: 'Disponível no estoque',              data: '2026-04-23', responsavel: 'Toni',      obs: 'Pronta pra venda' })
  if (maq.estado === 'em_revisao') {
    itens.push({ id: 4, tipo: 'revisao',   label: 'Voltou pra revisão',                 data: '2026-05-08', responsavel: 'Guilherme', obs: 'Cliente devolveu — ajuste de centrifugação' })
  }
  if (maq.estado === 'vendida') {
    itens.push({ id: 4, tipo: 'vendida',   label: `Vendida ao cliente`,                 data: '2026-05-14', responsavel: 'Toni',      obs: 'Pago via PIX' })
  }
  return itens
}

const TIPO_TIMELINE = {
  entrada:    { icon: 'ti-package-import',   cor: 'blue'   },
  reforma:    { icon: 'ti-tools',            cor: 'yellow' },
  disponivel: { icon: 'ti-circle-check',     cor: 'green'  },
  revisao:    { icon: 'ti-refresh-alert',    cor: 'yellow' },
  vendida:    { icon: 'ti-cash',             cor: 'green'  },
}

function pctLucro(custo, venda) {
  if (!custo || !venda) return 0
  return Math.round(((venda - custo) / custo) * 100)
}

export default function MaquinaDetalheModal({ T, dark, maquina, onClose, mobile, mostraValores = true }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)

  const est = ESTADO[maquina.estado] || ESTADO.disponivel
  const custoTotal = (maquina.custoCompra || 0) + (maquina.custoItens || 0) + (maquina.custoServico || 0)
  const margemRS = maquina.precoVenda - custoTotal
  const lucro = pctLucro(custoTotal, maquina.precoVenda)
  const itens = itensReformaMock(maquina)
  const timeline = timelineMock(maquina)
  const corEst = corEtapa(
    est.variant === 'verde' ? 'green'
    : est.variant === 'amarelo' ? 'yellow'
    : est.variant === 'azul' ? 'blue'
    : 'neutro',
    dark
  )

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={660}>
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
            <i className="ti ti-device-washing-machine" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: corHero(dark),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{maquina.modelo}</div>
            <div style={{
              fontSize: 11, color: T.textMuted, marginTop: 3,
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }}>
              <span>{maquina.marca}</span>
              <span style={{ width: 3, height: 3, background: T.textMuted, borderRadius: '50%' }} />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{maquina.capacidade}</span>
              <span style={{ width: 3, height: 3, background: T.textMuted, borderRadius: '50%' }} />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>ID #{maquina.id}</span>
            </div>
          </div>
        </div>
        <Badge variant={est.variant} dark={dark} sm>
          <i className={`ti ${est.icon}`} aria-hidden="true" /> {est.label}
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

        {maquina.estado === 'do_cliente' ? (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: cor('#0d2035', '#e6f1fb'),
            border: `1px solid ${azul}33`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <i className="ti ti-user" style={{ fontSize: 22, color: azul }} aria-hidden="true" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: corHero(dark) }}>
                Máquina do cliente
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>
                Não faz parte do estoque pra venda. Está sob atendimento — abra a OS
                relacionada pra ver detalhes da reforma.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Bloco financeiro — funcionário vê só preço de venda */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <i className="ti ti-cash" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
                <span style={sectionLabel}>
                  {mostraValores ? 'Composição do custo' : 'Preço de venda'}
                </span>
              </div>

              {mostraValores && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
                  gap: 10, marginBottom: 10,
                }}>
                  <BlocoCusto T={T} dark={dark} label="Compra"  icon="ti-shopping-bag" valor={maquina.custoCompra} />
                  <BlocoCusto T={T} dark={dark} label="Itens"   icon="ti-puzzle"      valor={maquina.custoItens} />
                  <BlocoCusto T={T} dark={dark} label="Serviço" icon="ti-tools"       valor={maquina.custoServico} />
                </div>
              )}

              <div style={{
                padding: '12px 14px', borderRadius: 9,
                background: T.cardAlt, border: `1px solid ${T.border}`,
                display: 'grid',
                gridTemplateColumns: mostraValores ? '1fr 1fr 1fr' : '1fr',
                gap: 12, alignItems: 'center',
              }}>
                {mostraValores && (
                  <div>
                    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                      Custo total
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRL(custoTotal)}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                    Preço venda
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
                    {maquina.precoVenda > 0 ? fmtBRL(maquina.precoVenda) : '—'}
                  </div>
                </div>
                {mostraValores && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                      Margem
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: azul, fontVariantNumeric: 'tabular-nums' }}>
                      {custoTotal > 0 && maquina.precoVenda > 0
                        ? `${lucro}% · ${fmtBRL(margemRS)}`
                        : '—'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

            {/* Itens usados na reforma */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <i className="ti ti-puzzle" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
                <span style={sectionLabel}>Itens usados na reforma</span>
                <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {itens.length} item{itens.length !== 1 ? 's' : ''}
                </span>
              </div>

              {itens.length === 0 ? (
                <div style={{
                  padding: '14px 16px',
                  background: T.cardAlt, border: `1px dashed ${T.border}`, borderRadius: 9,
                  fontSize: 12, color: T.textMuted, textAlign: 'center',
                }}>
                  Nenhum item registrado.
                </div>
              ) : (
                <div style={{
                  background: T.cardAlt, border: `1px solid ${T.border}`,
                  borderRadius: 9, overflow: 'hidden',
                }}>
                  {/* Cabecalho — funcionário não vê Custo un. nem Total */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: mostraValores ? '1fr 60px 90px 90px' : '1fr 60px',
                    gap: 10, padding: '8px 12px',
                    fontSize: 10.5, color: T.textMuted, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '.04em',
                    borderBottom: `1px solid ${T.border}`,
                  }}>
                    <div>Item</div>
                    <div style={{ textAlign: 'right' }}>Qtd</div>
                    {mostraValores && <div style={{ textAlign: 'right' }}>Custo un.</div>}
                    {mostraValores && <div style={{ textAlign: 'right' }}>Total</div>}
                  </div>
                  {itens.map((it, i) => (
                    <div key={it.id} style={{
                      display: 'grid',
                      gridTemplateColumns: mostraValores ? '1fr 60px 90px 90px' : '1fr 60px',
                      gap: 10, padding: '8px 12px',
                      borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                      fontSize: 12, color: T.textPrimary,
                    }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.nome}
                      </div>
                      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{it.qtd}</div>
                      {mostraValores && <div style={{ textAlign: 'right', color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(it.custoUnit)}</div>}
                      {mostraValores && <div style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(it.total)}</div>}
                    </div>
                  ))}
                  {mostraValores && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 60px 90px 90px',
                      gap: 10, padding: '8px 12px',
                      borderTop: `1px solid ${T.border}`,
                      background: cor('#0d2035', '#e6f1fb'),
                      fontSize: 12, fontWeight: 700, color: corHero(dark),
                    }}>
                      <div style={{ gridColumn: '1 / 4', textAlign: 'right' }}>Subtotal itens</div>
                      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtBRL(itens.reduce((s, i) => s + i.total, 0))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: T.border, margin: '16px 0' }} />
          </>
        )}

        {/* Timeline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-history" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Timeline da máquina</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {timeline.map(t => {
              const cfg = TIPO_TIMELINE[t.tipo] || TIPO_TIMELINE.entrada
              const corC = corEtapa(cfg.cor, dark)
              return (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center',
                  padding: '10px 12px',
                  background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: corC + '22', color: corC,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15,
                  }} aria-hidden="true">
                    <i className={`ti ${cfg.icon}`} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>
                        {t.label}
                      </span>
                      <span style={{ fontSize: 11, color: T.textMuted }}>
                        · {t.responsavel}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: T.textMuted, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.obs}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}>
                    {t.data.split('-').reverse().join('/')}
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
          onClick={() => notify('info', 'Edição da máquina — Módulo 06 chat 1')}>
          Editar máquina
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button T={T} dark={dark} variant="secondary" onClick={onClose}>Fechar</Button>
          {est.acaoLabel && (
            <Button variant="primary" iconLeft={est.acaoIcon}
              onClick={() => notify('info', `${est.acaoLabel} — Módulo 06 chat 4`)}>
              {est.acaoLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function BlocoCusto({ T, dark, label, icon, valor }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      padding: '10px 12px',
      background: T.cardAlt, border: `1px solid ${T.border}`,
      borderRadius: 9,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12, color: azul }} aria-hidden="true" />
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: corHero(dark),
        fontVariantNumeric: 'tabular-nums',
      }}>{valor > 0 ? fmtBRL(valor) : '—'}</div>
    </div>
  )
}
