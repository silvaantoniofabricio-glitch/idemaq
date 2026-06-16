// idemaq-src/components/estoque/MaquinaDetalheModal.jsx
// Detalhe de uma máquina do estoque — identificação, breakdown de custos,
// itens usados na reforma e timeline da máquina.
// Modo edição inline: clicou "Editar" → form inline → Salvar chama onAtualizar(id, patch).
// Ação de estado: "Marcar como vendida" / "Marcar como disponível" chama onAtualizar também.

import React, { useState, useEffect, useMemo } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, Button, Badge, Input, Select, Textarea, useToast } from '../ui'

const ESTADO = {
  disponivel: { label: 'Disponível', variant: 'verde',   icon: 'ti-circle-check',
                acaoLabel: 'Marcar como vendida',    acaoIcon: 'ti-cash',         acaoEstado: 'vendida' },
  em_revisao: { label: 'Em revisão', variant: 'amarelo', icon: 'ti-tool',
                acaoLabel: 'Marcar como disponível', acaoIcon: 'ti-circle-check', acaoEstado: 'disponivel' },
  do_cliente: { label: 'Do cliente', variant: 'azul',    icon: 'ti-user',         acaoLabel: null },
  vendida:    { label: 'Vendida',    variant: 'neutro',  icon: 'ti-circle-dashed', acaoLabel: null },
}

const ESTADOS_SELECT = [
  { value: 'disponivel', label: 'Disponível'  },
  { value: 'em_revisao', label: 'Em revisão'  },
  { value: 'do_cliente', label: 'Do cliente'  },
  { value: 'vendida',    label: 'Vendida'     },
]

function fmtDataTimeline(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' })
}

function toNum(v) {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function pctLucro(custo, venda) {
  if (!custo || !venda) return 0
  return Math.round(((venda - custo) / custo) * 100)
}

export default function MaquinaDetalheModal({
  T, dark, maquina: maquinaInicial, onClose, mobile, mostraValores = true, onAtualizar,
}) {
  const notify = useToast()
  const cor    = (d, c) => dark ? d : c
  const azul   = corEtapa('blue', dark)

  const [maquina,  setMaquina]  = useState(maquinaInicial)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => { setMaquina(maquinaInicial) }, [maquinaInicial])

  function abrirEdicao() {
    setForm({
      modelo:       maquina.modelo       || '',
      marca:        maquina.marca        || '',
      capacidade:   maquina.capacidade   || '',
      estado:       maquina.estado       || 'disponivel',
      custoCompra:  maquina.custoCompra  || '',
      custoItens:   maquina.custoItens   || '',
      custoServico: maquina.custoServico || '',
      precoVenda:   maquina.precoVenda   || '',
      observacoes:  maquina.observacoes  || '',
    })
    setEditando(true)
  }

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const erros = useMemo(() => {
    const e = {}
    if (!form.modelo?.trim()) e.modelo = 'Obrigatório'
    return e
  }, [form.modelo])

  async function salvarEdicao() {
    if (Object.keys(erros).length) { notify('erro', 'Confira os campos'); return }
    if (!onAtualizar) { notify('erro', 'Sem callback de atualização'); return }
    setSalvando(true)
    const patch = {
      modelo:       form.modelo.trim(),
      marca:        form.marca.trim()        || null,
      capacidade:   form.capacidade.trim()   || null,
      estado:       form.estado,
      custoCompra:  mostraValores ? toNum(form.custoCompra)  : maquina.custoCompra,
      custoItens:   mostraValores ? toNum(form.custoItens)   : maquina.custoItens,
      custoServico: mostraValores ? toNum(form.custoServico) : maquina.custoServico,
      precoVenda:   toNum(form.precoVenda),
      observacoes:  form.observacoes.trim() || null,
    }
    const { data, error } = await onAtualizar(maquina.id, patch)
    setSalvando(false)
    if (error) { notify('erro', 'Erro ao salvar: ' + (error.message || error)); return }
    if (data) setMaquina(data)
    setEditando(false)
    notify('ok', 'Máquina atualizada')
  }

  async function mudarEstado(novoEstado) {
    if (!onAtualizar) return
    setSalvando(true)
    const { data, error } = await onAtualizar(maquina.id, { estado: novoEstado })
    setSalvando(false)
    if (error) { notify('erro', 'Erro: ' + (error.message || error)); return }
    if (data) setMaquina(data)
    notify('ok', `Estado atualizado`)
  }

  const est        = ESTADO[maquina.estado] || ESTADO.disponivel
  const custoTotal = (maquina.custoCompra || 0) + (maquina.custoItens || 0) + (maquina.custoServico || 0)
  const margemRS   = maquina.precoVenda - custoTotal
  const lucro      = pctLucro(custoTotal, maquina.precoVenda)

  const custoPreviewForm = toNum(form.custoCompra) + toNum(form.custoItens) + toNum(form.custoServico)
  const margemPreviewRS  = toNum(form.precoVenda) - custoPreviewForm
  const margemPreviewPct = custoPreviewForm > 0 ? Math.round((margemPreviewRS / custoPreviewForm) * 100) : 0

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }
  const divider = <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

  // ── Modo edição ──────────────────────────────────────────────────────────
  if (editando) {
    const vermelho = corEtapa('red', dark)
    return (
      <Modal T={T} dark={dark} onClose={salvando ? undefined : () => setEditando(false)}
        mobile={mobile} maxWidth={560}>

        {/* Header edição */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
          background: cor('#0d2035', '#e6f1fb'),
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${azul}, ${cor('#3a7bbf', '#2860a0')})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: '#fff',
          }} aria-hidden="true">
            <i className="ti ti-pencil" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark) }}>
              Editar máquina
            </div>
            <div style={{ fontSize: 11, color: T.textMuted }}>
              {maquina.modelo}
            </div>
          </div>
          <button onClick={salvando ? undefined : () => setEditando(false)} aria-label="Cancelar"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 6, borderRadius: 6 }}>
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Identificação */}
            <Campo label="Modelo" obrigatorio T={T} dark={dark} erro={erros.modelo}>
              <Input T={T} dark={dark} value={form.modelo} onChange={set('modelo')}
                icon="ti-tag" placeholder="Ex: Lavadora Consul CWE10"
                style={erros.modelo ? { borderColor: vermelho } : undefined} />
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <Campo label="Marca" T={T} dark={dark}>
                <Input T={T} dark={dark} value={form.marca} onChange={set('marca')}
                  icon="ti-building-factory" placeholder="Ex: Consul, LG…" />
              </Campo>
              <Campo label="Capacidade" T={T} dark={dark}>
                <Input T={T} dark={dark} value={form.capacidade} onChange={set('capacidade')}
                  icon="ti-weight" placeholder="Ex: 10kg, 12kg…" />
              </Campo>
            </div>

            <Campo label="Estado" T={T} dark={dark}>
              <Select T={T} dark={dark} value={form.estado} onChange={set('estado')} options={ESTADOS_SELECT} />
            </Campo>

            {divider}

            {/* Valores — só dono */}
            {mostraValores && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: 10 }}>
                  <Campo label="Custo compra (R$)" T={T} dark={dark}>
                    <Input T={T} dark={dark} type="number" inputMode="decimal"
                      value={form.custoCompra} onChange={set('custoCompra')} placeholder="0" />
                  </Campo>
                  <Campo label="Custo itens (R$)" T={T} dark={dark}>
                    <Input T={T} dark={dark} type="number" inputMode="decimal"
                      value={form.custoItens} onChange={set('custoItens')} placeholder="0" />
                  </Campo>
                  <Campo label="Custo serviço (R$)" T={T} dark={dark}>
                    <Input T={T} dark={dark} type="number" inputMode="decimal"
                      value={form.custoServico} onChange={set('custoServico')} placeholder="0" />
                  </Campo>
                </div>

                <Campo label="Preço de venda (R$)" T={T} dark={dark}>
                  <Input T={T} dark={dark} type="number" inputMode="decimal"
                    value={form.precoVenda} onChange={set('precoVenda')}
                    icon="ti-currency-dollar" placeholder="0" />
                </Campo>

                {/* Preview margem */}
                <div style={{
                  padding: '10px 14px',
                  background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
                  display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    Custo total:{' '}
                    <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRL(custoPreviewForm)}
                    </strong>
                  </div>
                  <div style={{ width: 1, height: 16, background: T.border }} />
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    Margem:{' '}
                    <strong style={{ color: azul, fontVariantNumeric: 'tabular-nums' }}>
                      {margemPreviewPct}% · {fmtBRL(margemPreviewRS)}
                    </strong>
                  </div>
                </div>

                {divider}
              </>
            )}

            <Campo label="Observações" T={T} dark={dark}>
              <Textarea T={T} dark={dark} value={form.observacoes} onChange={set('observacoes')}
                placeholder="Detalhes sobre a máquina, procedência, defeitos conhecidos…"
                rows={3} />
            </Campo>
          </div>
        </div>

        {/* Rodapé edição */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: T.cardAlt, flexShrink: 0,
        }}>
          <Button T={T} dark={dark} variant="ghost" onClick={() => setEditando(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="primary"
            iconLeft={salvando ? 'ti-loader-2 ti-spin' : 'ti-device-floppy'}
            onClick={salvarEdicao}
            disabled={salvando || Object.keys(erros).length > 0}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </Modal>
    )
  }

  // ── Modo visualização ─────────────────────────────────────────────────────
  const timeline = [
    {
      id: 1,
      tipo: maquina.estado === 'do_cliente' ? 'entrada' : 'entrada',
      label: maquina.estado === 'do_cliente' ? 'Recebida do cliente' : 'Máquina cadastrada',
      dataFmt: fmtDataTimeline(maquina.criadoEm),
      obs: maquina.observacoes || '',
    },
  ]

  const TIPO_TIMELINE = {
    entrada:    { icon: 'ti-package-import', cor: 'blue'   },
    reforma:    { icon: 'ti-tools',          cor: 'yellow' },
    disponivel: { icon: 'ti-circle-check',   cor: 'green'  },
    revisao:    { icon: 'ti-refresh-alert',  cor: 'yellow' },
    vendida:    { icon: 'ti-cash',           cor: 'green'  },
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={660}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: cor('#0d2035', '#e6f1fb'),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg, ${azul}, ${cor('#3a7bbf', '#2860a0')})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff',
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
              {maquina.marca && <span>{maquina.marca}</span>}
              {maquina.marca && maquina.capacidade && (
                <span style={{ width: 3, height: 3, background: T.textMuted, borderRadius: '50%' }} />
              )}
              {maquina.capacidade && (
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{maquina.capacidade}</span>
              )}
            </div>
          </div>
        </div>
        <Badge variant={est.variant} dark={dark} sm>
          <i className={`ti ${est.icon}`} aria-hidden="true" /> {est.label}
        </Badge>
        <button onClick={onClose} aria-label="Fechar"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 6, borderRadius: 6, flexShrink: 0 }}>
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
                Não faz parte do estoque pra venda. Está sob atendimento.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Bloco financeiro */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <i className="ti ti-cash" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
                <span style={sectionLabel}>
                  {mostraValores ? 'Composição do custo' : 'Preço de venda'}
                </span>
              </div>

              {mostraValores && (
                <div style={{
                  display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)',
                  gap: 10, marginBottom: 10,
                }}>
                  <BlocoCusto T={T} dark={dark} label="Compra"  icon="ti-shopping-bag" valor={maquina.custoCompra} />
                  <BlocoCusto T={T} dark={dark} label="Itens"   icon="ti-puzzle"       valor={maquina.custoItens} />
                  <BlocoCusto T={T} dark={dark} label="Serviço" icon="ti-tools"        valor={maquina.custoServico} />
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

            {divider}
          </>
        )}

        {/* Observações */}
        {maquina.observacoes && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <i className="ti ti-notes" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
                <span style={sectionLabel}>Observações</span>
              </div>
              <div style={{
                padding: '10px 14px',
                background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 9,
                fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
              }}>
                {maquina.observacoes}
              </div>
            </div>
            {divider}
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
              const cfg  = TIPO_TIMELINE[t.tipo] || TIPO_TIMELINE.entrada
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
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                  }} aria-hidden="true">
                    <i className={`ti ${cfg.icon}`} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>
                      {t.label}
                    </span>
                    {t.obs && (
                      <div style={{
                        fontSize: 11, color: T.textMuted, marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {t.obs}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {t.dataFmt}
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
        {onAtualizar ? (
          <Button T={T} dark={dark} variant="ghost" iconLeft="ti-pencil"
            onClick={abrirEdicao} disabled={salvando}>
            Editar
          </Button>
        ) : <div />}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button T={T} dark={dark} variant="secondary" onClick={onClose}>Fechar</Button>
          {onAtualizar && est.acaoLabel && (
            <Button variant="primary" iconLeft={salvando ? 'ti-loader-2 ti-spin' : est.acaoIcon}
              onClick={() => mudarEstado(est.acaoEstado)}
              disabled={salvando}>
              {salvando ? 'Salvando…' : est.acaoLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Campo({ label, obrigatorio, children, erro, T, dark }) {
  const vermelho = corEtapa('red', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {label}
        {obrigatorio && <span style={{ color: vermelho, marginLeft: 3 }}>*</span>}
      </div>
      {children}
      {erro && (
        <span style={{ fontSize: 10.5, color: vermelho }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
          {erro}
        </span>
      )}
    </div>
  )
}

function BlocoCusto({ T, dark, label, icon, valor }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      padding: '10px 12px',
      background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 9,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12, color: azul }} aria-hidden="true" />
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
        {valor > 0 ? fmtBRL(valor) : '—'}
      </div>
    </div>
  )
}
