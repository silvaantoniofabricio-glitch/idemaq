// src/components/osDetalhe/tabs/RelatorioTab.jsx
// Aba Resumo — visão completa da OS. Apple HIG.
// Seções: 1. Cliente & Equipamento  2. Financeiro (admin)
//         3. O que foi feito        4. Banners contextuais

import React, { useState, useEffect } from 'react'
import { corEtapa } from '../../../utils/colors'
import {
  dentroGarantia, calcStatusPrazo, totalAPagar,
  estaPagaTotal, estaPagaParcial,
} from '../../../utils/osHelpers'
import { fmtBRL, fmtPrazoCurto } from '../../../utils/fmt'
import { useOSItens } from '../../../hooks/useOSItens'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useFalhaTeste } from '../../../hooks/useFalhaTeste'
import { resolverFotoUrl, FOTO_STORAGE_MARKER } from '../../../utils/osStorage'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT,
  higType, higInsetCard,
} from '../../../theme-hig'

// ─── Metadados das etapas ────────────────────────────────────────────────────
const ETAPA_META = {
  ag_agendamento: { icon: 'ti-calendar-time',    cor: 'neutro', label: 'Agenda' },
  agendado:       { icon: 'ti-calendar-event',   cor: 'blue',   label: 'Coleta' },
  recebido:       { icon: 'ti-clipboard-check',  cor: 'blue',   label: 'Avaliação' },
  diagnostico:    { icon: 'ti-stethoscope',      cor: 'yellow', label: 'Diagnóstico' },
  orcamento:      { icon: 'ti-receipt',          cor: 'yellow', label: 'Orçamento' },
  oficina:        { icon: 'ti-tool',             cor: 'yellow', label: 'Conserto' },
  teste_final:    { icon: 'ti-flask',            cor: 'blue',   label: 'Teste' },
  entrega:        { icon: 'ti-truck-delivery',   cor: 'blue',   label: 'Entrega' },
  pagamento:      { icon: 'ti-cash-banknote',    cor: 'blue',   label: 'A receber' },
  concluido:      { icon: 'ti-circle-check',     cor: 'green',  label: 'Concluído' },
  recusado:       { icon: 'ti-circle-x',         cor: 'red',    label: 'Recusado' },
}

// ─── Primitivos de layout HIG ────────────────────────────────────────────────

function HIGSection({ T, dark, title, children, footer }) {
  return (
    <section>
      <div style={{
        ...higType('footnote'),
        color: T.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
      }}>{title}</div>
      <div style={higInsetCard(T, dark)}>{children}</div>
      {footer && (
        <div style={{
          ...higType('footnote'),
          color: T.textMuted,
          padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0`,
        }}>{footer}</div>
      )}
    </section>
  )
}

function Sep({ T, indent = 0 }) {
  return <div style={{ height: 0.5, background: T.border, marginLeft: indent, opacity: 0.7 }} />
}

// ─── 1. Cliente & Equipamento ────────────────────────────────────────────────
function SecaoCliente({ T, dark, os }) {
  const [fotoUrl, setFotoUrl] = useState(null)

  useEffect(() => {
    const raw = os?.pre_diagnostico?.foto
    if (!raw) { setFotoUrl(null); return }
    if (raw === FOTO_STORAGE_MARKER || raw?.startsWith?.(FOTO_STORAGE_MARKER)) {
      resolverFotoUrl(os.id).then(url => setFotoUrl(url || null))
    } else {
      setFotoUrl(raw)
    }
  }, [os?.id, os?.pre_diagnostico?.foto])

  const dateParts = []
  if (os.abertura || os.criado_em)
    dateParts.push(`Abertura: ${fmtPrazoCurto(os.abertura || os.criado_em)}`)
  if (os.prazo) {
    const status = calcStatusPrazo(os.prazo, os.etapa)
    dateParts.push(`Prazo: ${fmtPrazoCurto(os.prazo)}${status === 'vencido' ? ' ⚠' : ''}`)
  }
  if (os.data_conclusao)
    dateParts.push(`Concluída: ${fmtPrazoCurto(os.data_conclusao)}`)

  return (
    <HIGSection T={T} dark={dark} title="Cliente & Equipamento"
      footer={dateParts.length ? dateParts.join(' · ') : undefined}>

      {/* Foto + nome + equipamento */}
      <div style={{
        padding: HIG_SPACE.md,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.md,
      }}>
        <div style={{
          width: 56, height: 56, flexShrink: 0,
          borderRadius: HIG_RADIUS.card,
          background: fotoUrl
            ? `url(${fotoUrl}) center/cover no-repeat`
            : (dark ? '#2c4257' : '#e8f0f8'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {!fotoUrl && (
            <i className="ti ti-photo"
              style={{ fontSize: 22, color: HIG_COLOR.tintIdemaq, opacity: 0.5 }}
              aria-hidden="true" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            ...higType('headline'),
            color: T.textPrimary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {os.cliente || 'Cliente não informado'}
          </div>
          {(os.marca || os.modelo) && (
            <div style={{
              ...higType('subheadline'),
              color: T.textSecondary,
              marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {[os.marca, os.modelo].filter(Boolean).join(' ')}
              {os.serie && (
                <span style={{
                  ...higType('caption2'),
                  color: T.textMuted,
                  marginLeft: 8,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}>
                  S/N {os.serie}
                </span>
              )}
            </div>
          )}
          {os.defeito && (
            <div style={{
              ...higType('caption1'),
              color: T.textMuted,
              marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {os.defeito}
            </div>
          )}
        </div>
      </div>

      {/* Telefone */}
      {os.fone && (
        <>
          <Sep T={T} indent={HIG_SPACE.md} />
          <div style={{
            minHeight: HIG_SIZE.listRow,
            padding: `0 ${HIG_SPACE.md}px`,
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
          }}>
            <i className="ti ti-phone"
              style={{ fontSize: 16, color: HIG_COLOR.tintIdemaq, flexShrink: 0 }}
              aria-hidden="true" />
            <span style={{ ...higType('body'), color: T.textPrimary, flex: 1 }}>
              {os.fone}
            </span>
            <i className="ti ti-brand-whatsapp"
              style={{ fontSize: 18, color: HIG_COLOR.green, flexShrink: 0 }}
              aria-hidden="true" />
          </div>
        </>
      )}

      {/* Endereço */}
      {os.endereco && (
        <>
          <Sep T={T} indent={HIG_SPACE.md} />
          <div style={{
            minHeight: HIG_SIZE.listRow,
            padding: `0 ${HIG_SPACE.md}px`,
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
          }}>
            <i className="ti ti-map-pin"
              style={{ fontSize: 16, color: HIG_COLOR.tintIdemaq, flexShrink: 0 }}
              aria-hidden="true" />
            <span style={{
              ...higType('subheadline'),
              color: T.textSecondary,
              flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {os.endereco}
            </span>
            <i className="ti ti-map-2"
              style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }}
              aria-hidden="true" />
          </div>
        </>
      )}
    </HIGSection>
  )
}

// ─── 2. Financeiro ───────────────────────────────────────────────────────────
function SecaoFinanceiro({ T, dark, os, itens }) {
  function unit(i) { return i.valor_unitario ?? i.valor ?? 0 }
  function total(i) { return i.valor_total ?? unit(i) * (i.qtd ?? 1) }

  const subtotal = itens.reduce((s, i) => s + total(i), 0)
  const desconto = os.desconto || 0
  const totalLiq = Math.max(0, subtotal - desconto)
  const pago = os.valor_pago || 0
  const saldo = Math.max(0, totalLiq - pago)
  const pagaTotal = estaPagaTotal(os)
  const pagaParcial = estaPagaParcial(os)

  const statusCor = pagaTotal ? HIG_COLOR.green : pagaParcial ? HIG_COLOR.orange : T.textMuted
  const statusLabel = pagaTotal ? 'Pago' : pagaParcial ? 'Parcial' : 'Em aberto'
  const statusIcon = pagaTotal ? 'ti-circle-check' : pagaParcial ? 'ti-clock-hour-3' : 'ti-circle-dashed'

  return (
    <HIGSection T={T} dark={dark} title="Financeiro">
      {/* 3 KPIs em grid horizontal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <KPICell T={T}
          label="Total orçado"
          value={fmtBRL(totalLiq)}
          sub={desconto > 0 ? `desc. ${fmtBRL(desconto)}` : `${itens.length} iten${itens.length !== 1 ? 's' : ''}`}
        />
        <KPICell T={T}
          label="Pago"
          value={fmtBRL(pago)}
          valueCor={pago > 0 ? HIG_COLOR.green : T.textMuted}
          sub={os.forma_pagamento || '—'}
          border
        />
        <KPICell T={T}
          label="Saldo"
          value={fmtBRL(saldo)}
          valueCor={saldo === 0 ? HIG_COLOR.green : HIG_COLOR.orange}
          sub={saldo === 0 ? 'Quitado ✓' : 'Em aberto'}
          border
        />
      </div>

      {/* Lista de itens */}
      {itens.length > 0 && (
        <>
          <Sep T={T} />
          {itens.map((it, i) => (
            <React.Fragment key={it.id || i}>
              {i > 0 && <Sep T={T} indent={HIG_SPACE.md + 22 + HIG_SPACE.xs} />}
              <div style={{
                minHeight: HIG_SIZE.listRow,
                padding: `0 ${HIG_SPACE.md}px`,
                display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
              }}>
                <i className={`ti ${tipoIcone(it.tipo)}`}
                  style={{ fontSize: 14, color: T.textMuted, flexShrink: 0, width: 22, textAlign: 'center' }}
                  aria-hidden="true" />
                <span style={{
                  ...higType('subheadline'),
                  color: T.textPrimary,
                  flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {it.nome || '(sem nome)'}
                </span>
                <span style={{ ...higType('footnote'), color: T.textMuted, marginRight: 8 }}>
                  {it.qtd}×
                </span>
                <span style={{
                  ...higType('subheadline'),
                  fontWeight: 600,
                  color: T.textPrimary,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 64, textAlign: 'right',
                }}>
                  {fmtBRL(total(it))}
                </span>
              </div>
            </React.Fragment>
          ))}
        </>
      )}
    </HIGSection>
  )
}

// ─── 3. O que foi feito ──────────────────────────────────────────────────────
function SecaoHistorico({ T, dark, os, admin, checkRecebido, checkOficina, checkTeste, falhas, itens, funcPorId }) {
  const historico = os.historico || []

  function dadosEtapa(etapaDb) {
    const hist = historico.filter(h => {
      if (etapaDb === 'em_oficina') return h.etapa === 'oficina'
      if (etapaDb === 'entrega') return h.etapa === 'entrega' || h.etapa === 'entregue'
      return h.etapa === etapaDb
    })
    if (hist.length === 0) return null
    const u = hist[hist.length - 1]
    return { data: u.data, responsavel: funcPorId(u.funcionario) }
  }

  function resumoChecklist(chk) {
    if (!chk?.itens?.length) return null
    const total = chk.itens.length
    const ok = chk.itens.filter(i => i.valor === 'ok' || i.checked === true).length
    const problemas = chk.itens.filter(i => i.valor === 'defeito' || i.valor === 'barulho').length
    if (problemas > 0) return `${ok}/${total} OK · ${problemas} problema${problemas > 1 ? 's' : ''}`
    return `${ok}/${total} OK`
  }

  const linhas = []

  const dRec = dadosEtapa('recebido')
  if (dRec && !checkRecebido.loading)
    linhas.push({ key: 'recebido', meta: ETAPA_META.recebido, dados: dRec, texto: resumoChecklist(checkRecebido) || '—' })

  const dDiag = dadosEtapa('diagnostico')
  if (dDiag)
    linhas.push({ key: 'diagnostico', meta: ETAPA_META.diagnostico, dados: dDiag, texto: os.diagnostico?.causa || '—' })

  const dOrc = dadosEtapa('orcamento')
  if (admin && dOrc) {
    const sub = itens.reduce((s, i) => s + (i.valor_total ?? (i.valor_unitario ?? i.valor ?? 0) * (i.qtd ?? 1)), 0)
    linhas.push({
      key: 'orcamento', meta: ETAPA_META.orcamento, dados: dOrc,
      texto: `${itens.length} iten${itens.length !== 1 ? 's' : ''} · ${fmtBRL(sub)}${os.desconto > 0 ? ` · desc. ${fmtBRL(os.desconto)}` : ''}`,
    })
  }

  const dOf = dadosEtapa('em_oficina')
  if (dOf && !checkOficina.loading)
    linhas.push({ key: 'oficina', meta: ETAPA_META.oficina, dados: dOf, texto: resumoChecklist(checkOficina) || '—' })

  const dTeste = dadosEtapa('teste_final')
  if (dTeste && !checkTeste.loading) {
    const base = resumoChecklist(checkTeste)
    const abertas = falhas.filter(f => !f.resolvida).length
    const txt = [base, abertas > 0 ? `${abertas} falha${abertas > 1 ? 's' : ''} aberta${abertas > 1 ? 's' : ''}` : null]
      .filter(Boolean).join(' · ') || '—'
    linhas.push({ key: 'teste', meta: ETAPA_META.teste_final, dados: dTeste, texto: txt })
  }

  const dEnt = dadosEtapa('entrega')
  if (dEnt)
    linhas.push({ key: 'entrega', meta: ETAPA_META.entrega, dados: dEnt, texto: 'Máquina entregue ao cliente.' })

  const dPag = dadosEtapa('pagamento')
  if (admin && (dPag || os.valor_pago > 0)) {
    const saldo = Math.max(0, totalAPagar(os) - (os.valor_pago || 0))
    linhas.push({
      key: 'pagamento', meta: ETAPA_META.pagamento, dados: dPag,
      texto: `Pago ${fmtBRL(os.valor_pago || 0)} · saldo ${fmtBRL(saldo)}${os.forma_pagamento ? ` · ${os.forma_pagamento}` : ''}`,
    })
  }

  const dConc = dadosEtapa('concluido')
  if (dConc)
    linhas.push({ key: 'concluido', meta: ETAPA_META.concluido, dados: dConc, texto: `Garantia de ${os.garantia_dias || 90} dias.` })

  const dRecus = dadosEtapa('recusado')
  if (dRecus)
    linhas.push({ key: 'recusado', meta: ETAPA_META.recusado, dados: dRecus, texto: 'OS recusada pelo cliente.' })

  const carregando = checkRecebido.loading || checkOficina.loading || checkTeste.loading
  if (carregando || linhas.length === 0) return null

  return (
    <HIGSection T={T} dark={dark} title="O que foi feito">
      {linhas.map(({ key, meta, dados, texto }, i) => {
        const c = corEtapa(meta.cor, dark)
        return (
          <React.Fragment key={key}>
            {i > 0 && <Sep T={T} indent={HIG_SPACE.md + 32 + HIG_SPACE.sm} />}
            <div style={{
              padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
              display: 'flex', gap: HIG_SPACE.sm, alignItems: 'flex-start',
            }}>
              {/* Ícone circular colorido */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: c + '1A',
                border: `1.5px solid ${c}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <i className={`ti ${meta.icon}`}
                  style={{ fontSize: 14, color: c }}
                  aria-hidden="true" />
              </div>

              {/* Label + data + texto */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'baseline',
                  justifyContent: 'space-between', gap: 8,
                }}>
                  <span style={{
                    ...higType('subheadline'),
                    fontWeight: 600,
                    color: T.textPrimary,
                  }}>
                    {meta.label}
                  </span>
                  {dados && (
                    <span style={{
                      ...higType('caption2'),
                      color: T.textMuted,
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}>
                      {fmtPrazoCurto(dados.data)}
                      {dados.responsavel ? ` · ${dados.responsavel}` : ''}
                    </span>
                  )}
                </div>
                <div style={{
                  ...higType('footnote'),
                  color: T.textSecondary,
                  marginTop: 2,
                  lineHeight: '1.4',
                }}>
                  {texto}
                </div>
              </div>
            </div>
          </React.Fragment>
        )
      })}
    </HIGSection>
  )
}

// ─── 4. Banners contextuais ──────────────────────────────────────────────────
function BannerHIG({ T, dark, cor, icon, titulo, texto, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...higInsetCard(T, dark),
        padding: HIG_SPACE.md,
        border: `1px solid ${cor}33`,
        background: cor + '0F',
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.md,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: HIG_RADIUS.small,
        background: cor + '1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={`ti ${icon}`}
          style={{ fontSize: 20, color: cor }}
          aria-hidden="true" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          ...higType('subheadline'),
          fontWeight: 600,
          color: T.textPrimary,
        }}>{titulo}</div>
        <div style={{
          ...higType('footnote'),
          color: T.textSecondary,
          marginTop: 2,
        }}>{texto}</div>
      </div>
      {onClick && (
        <i className="ti ti-chevron-right"
          style={{ fontSize: 16, color: T.textMuted }}
          aria-hidden="true" />
      )}
    </div>
  )
}

// ─── Primitivos internos ──────────────────────────────────────────────────────
function KPICell({ T, label, value, valueCor, sub, border }) {
  return (
    <div style={{
      padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
      borderLeft: border ? `0.5px solid ${T.border}` : 'none',
    }}>
      <div style={{
        ...higType('caption2'),
        color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.3,
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        ...higType('callout'),
        fontWeight: 700,
        color: valueCor || T.textPrimary,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ ...higType('caption2'), color: T.textMuted, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function tipoIcone(tipo) {
  if (tipo === 'servico') return 'ti-tool'
  if (tipo === 'peca') return 'ti-puzzle'
  if (tipo === 'maquina') return 'ti-device-washing-machine'
  return 'ti-circle'
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function RelatorioTab({ T, dark, os, osBase, usuarios, admin, onAbrirOS }) {
  const { itens, loading: itensLoading } = useOSItens(os?.id)
  const checkRecebido = useChecklistEtapa(os?.id, 'recebido')
  const checkOficina  = useChecklistEtapa(os?.id, 'em_oficina')
  const checkTeste    = useChecklistEtapa(os?.id, 'teste_final')
  const { falhas }    = useFalhaTeste(os?.id)

  const funcPorId = (id) => {
    const u = (usuarios || []).find(x => x.id === id)
    return u ? (u.apelido || u.nome || null) : null
  }

  const isConcluido = os.etapa === 'concluido'
  const isRecusado = os.etapa === 'recusado'
  const garantiaAtiva = isConcluido ? dentroGarantia(os) : false
  const osOrigem = os.garantia && osBase ? osBase.find(o => o.numero === os.os_origem_id) : null

  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  return (
    <div style={{
      padding: `${HIG_SPACE.md}px ${HIG_SPACE.md}px ${HIG_SPACE.xxl}px`,
      display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg,
      fontFamily: HIG_FONT,
    }}>

      <SecaoCliente T={T} dark={dark} os={os} />

      {admin && !itensLoading && (
        <SecaoFinanceiro T={T} dark={dark} os={os} itens={itens} />
      )}

      <SecaoHistorico
        T={T} dark={dark} os={os} admin={admin}
        checkRecebido={checkRecebido}
        checkOficina={checkOficina}
        checkTeste={checkTeste}
        falhas={falhas}
        itens={itens}
        funcPorId={funcPorId}
      />

      {os.garantia && osOrigem && (
        <BannerHIG T={T} dark={dark}
          cor={azul} icon="ti-shield-check"
          titulo="OS em garantia"
          texto={`Referente à OS #${osOrigem.numero} de ${osOrigem.cliente}.`}
          onClick={() => onAbrirOS?.(osOrigem.numero)}
        />
      )}
      {garantiaAtiva && !os.garantia && (
        <BannerHIG T={T} dark={dark}
          cor={azul} icon="ti-shield-check"
          titulo="Garantia ativa"
          texto="Se o cliente retornar com o mesmo defeito dentro do prazo, abra uma OS de garantia."
        />
      )}
      {isRecusado && (
        <BannerHIG T={T} dark={dark}
          cor={vermelho} icon="ti-circle-x"
          titulo="OS recusada pelo cliente"
          texto="Defina o destino da máquina na aba Etapa."
        />
      )}

    </div>
  )
}
