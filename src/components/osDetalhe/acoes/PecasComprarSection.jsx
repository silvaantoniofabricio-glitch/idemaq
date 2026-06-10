// src/components/osDetalhe/acoes/PecasComprarSection.jsx
// Seção "Peças a comprar" da etapa Conserto.
//
// Mostra as peças do orçamento (vinculadas ao catálogo via peca_id) cujo
// estoque está ZERADO. Cada peça tem um fluxo de status, guardado em
// os.pre_diagnostico.compra_pecas[<os_item_id>]:
//
//   aguardando compra  → (clico "Já comprei")   → aguardando entrega
//   aguardando entrega → (clico "Peça chegou")  → entregue + abre o card da
//                        peça (PecaDetalheModal, o mesmo do Estoque) pra lançar
//                        a quantidade recebida + atualizar o custo de compra.
//
// Só peças vinculadas ao catálogo (peca_id) entram — peça digitada livre não
// tem como checar estoque.

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabase'
import { corEtapa } from '../../../utils/colors'
import { hojeISO } from '../../../utils/fmt'
import { usePecas } from '../../../hooks/usePecas'
import PecaDetalheModal from '../../estoque/PecaDetalheModal'
import { AtlPanel, ATL_FONT } from './_AtlassianUI'

const SELECT_PECA = [
  'id', 'nome', 'sku', 'categoria',
  'marca', 'tipo', 'referencia', 'modelo', 'modelos_compativeis',
  'qtd_atual', 'qtd_minima', 'qtd_maxima',
  'custo_atual', 'custo_medio', 'preco_venda',
  'fornecedor', 'favorito',
].join(', ')

// Mapeia row do banco → shape camelCase que o PecaDetalheModal espera.
function pecaDbToUi(row) {
  if (!row) return null
  let compat = row.modelos_compativeis
  if (typeof compat === 'string') compat = compat.split(/[,/\n;]/).map(s => s.trim()).filter(Boolean)
  else if (!Array.isArray(compat)) compat = []
  return {
    id: row.id, nome: row.nome, sku: row.sku || '', categoria: row.categoria || 'outros',
    marca: row.marca || '', tipo: row.tipo || '', referencia: row.referencia || '',
    modelo: row.modelo || '', modelosCompativeis: compat,
    qtdAtual: row.qtd_atual ?? 0, qtdMinima: row.qtd_minima ?? 0, qtdMaxima: row.qtd_maxima ?? 0,
    custoAtual: Number(row.custo_atual ?? 0), custoMedio: Number(row.custo_medio ?? 0),
    precoVenda: Number(row.preco_venda ?? 0), fornecedor: row.fornecedor || '',
    favorito: Boolean(row.favorito),
  }
}

const FLUXO = {
  comprar:  { label: 'Aguardando compra',  icon: 'shopping-cart',  cor: 'red',    cta: 'Já comprei',    ctaIcon: 'check' },
  entrega:  { label: 'Aguardando entrega', icon: 'truck-delivery', cor: 'yellow', cta: 'Peça chegou',   ctaIcon: 'package-import' },
  entregue: { label: 'Entregue',           icon: 'circle-check',   cor: 'green',  cta: null,            ctaIcon: null },
}

export default function PecasComprarSection({ T, dark, os, itens, admin = false, faltaSet, onUpdateOS }) {
  const { atualizar, ajustarEstoque } = usePecas()
  const [pecasMap, setPecasMap] = useState({})
  const [cardPeca, setCardPeca] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Peças do orçamento vinculadas ao catálogo.
  const pecasItens = useMemo(
    () => (itens || []).filter(it => it.tipo === 'peca' && it.peca_id),
    [itens]
  )
  const pecaIds = useMemo(
    () => [...new Set(pecasItens.map(i => i.peca_id))],
    [pecasItens]
  )
  const pecaIdsKey = pecaIds.join(',')

  // Busca o estoque atual das peças vinculadas (1 query).
  useEffect(() => {
    if (!pecaIds.length) { setPecasMap({}); return }
    let cancel = false
    ;(async () => {
      const { data, error } = await supabase
        .from('peca').select(SELECT_PECA).in('id', pecaIds).is('deleted_at', null)
      if (cancel || error || !data) return
      const m = {}
      for (const r of data) m[r.id] = pecaDbToUi(r)
      setPecasMap(m)
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecaIdsKey, refreshKey])

  const compraStatus = os?.pre_diagnostico?.compra_pecas || {}

  // Aparece: peça EM FALTA (alocação global do estoque), ou que já entrou no
  // fluxo de compra. O faltaSet considera qtd pedida + demanda de várias OS.
  const lista = useMemo(() => pecasItens.filter(it => {
    return (faltaSet?.has(it.id)) || !!compraStatus[it.id]?.status
  }), [pecasItens, faltaSet, compraStatus])

  if (lista.length === 0) return null

  function setStatus(it, novoStatus, extra = {}) {
    const atual = os?.pre_diagnostico?.compra_pecas || {}
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        compra_pecas: {
          ...atual,
          [it.id]: { ...(atual[it.id] || {}), status: novoStatus, ...extra },
        },
      },
    })
  }

  function avancar(it) {
    const st = compraStatus[it.id]?.status || 'comprar'
    if (st === 'comprar') {
      setStatus(it, 'entrega', { data_pedido: hojeISO() })
    } else if (st === 'entrega') {
      setStatus(it, 'entregue', { data_entrega: hojeISO() })
      const p = pecasMap[it.peca_id]
      if (p) setCardPeca(p) // abre o card da peça (mesmo do Estoque)
    }
  }

  return (
    <AtlPanel
      T={T} dark={dark}
      title="Peças a comprar"
      count={lista.length}
      footer="Peças do orçamento que estão zeradas no estoque. Marque a compra e a entrega; ao receber, lance a quantidade e o custo no card da peça.">
      {lista.map((it, idx) => {
        const st = compraStatus[it.id]?.status || 'comprar'
        const info = FLUXO[st]
        const cor = corEtapa(info.cor, dark)
        const p = pecasMap[it.peca_id]
        return (
          <div key={it.id} style={{
            padding: '10px 14px',
            borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {/* Ícone status */}
            <div style={{
              width: 28, height: 28, borderRadius: 4, flexShrink: 0,
              background: cor + '22', color: cor,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ti-${info.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
            </div>

            {/* Nome + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: T.textPrimary,
                letterSpacing: '-0.005em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{it.nome}</div>
              <div style={{ fontSize: 11.5, color: cor, marginTop: 1, fontWeight: 600 }}>
                {info.label}
                <span style={{ color: T.textMuted, fontWeight: 400 }}>
                  {`  ·  pedir ${it.qtd || 1}`}
                  {p ? `  ·  estoque ${p.qtdAtual}` : ''}
                </span>
              </div>
            </div>

            {/* CTA avançar (ou reabrir card se entregue) */}
            {info.cta ? (
              <button type="button" onClick={() => avancar(it)}
                style={{
                  flexShrink: 0,
                  height: 30, padding: '0 12px', borderRadius: 4,
                  border: `1px solid ${cor}`, background: cor + '22', color: cor,
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  fontFamily: ATL_FONT,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <i className={`ti ti-${info.ctaIcon}`} style={{ fontSize: 13 }} aria-hidden="true" />
                {info.cta}
              </button>
            ) : (
              p && (
                <button type="button" onClick={() => setCardPeca(p)}
                  style={{
                    flexShrink: 0,
                    height: 30, padding: '0 10px', borderRadius: 4,
                    border: `1px solid ${T.border}`, background: 'transparent', color: T.textMuted,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: ATL_FONT,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  <i className="ti ti-package" style={{ fontSize: 13 }} aria-hidden="true" />
                  Ver peça
                </button>
              )
            )}
          </div>
        )
      })}

      {/* Card da peça (mesmo do Estoque) — lançar qtd recebida + custo */}
      {cardPeca && (
        <PecaDetalheModal
          T={T} dark={dark}
          peca={cardPeca}
          mostraValores={admin}
          onClose={() => { setCardPeca(null); setRefreshKey(k => k + 1) }}
          onSalvar={(patch) => atualizar(cardPeca.id, patch)}
          onAjustar={(payload) => ajustarEstoque(cardPeca.id, payload)}
        />
      )}
    </AtlPanel>
  )
}
