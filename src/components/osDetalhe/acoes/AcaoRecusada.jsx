// src/components/osDetalhe/acoes/AcaoRecusada.jsx
// Etapa Recusado — Atlassian Design (reescrito 28/05/2026).
// 3 decisoes: converter em Fabricacao · cobrar taxa · entregar de volta.

import React, { useState } from 'react'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { criarOSDerivada } from '../../../utils/osDerivada'
import { useToast } from '../../ui'
import { AtlPanel, ATL_FONT, atlHover } from './_AtlassianUI'

export default function AcaoRecusada({ T, dark, os, onMoverOS, onUpdateOS }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const notify = useToast()
  const [convertendo, setConvertendo] = useState(false)

  function entregarDeVolta() {
    const entrega = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    if (entrega) onMoverOS(os.numero, entrega.id)
  }

  // Recusou sem querer → volta a OS pro Orçamento e reabre a decisão
  // (status "Aguardando resposta", limpa o flag recusada via moverOS).
  function reabrirOrcamento() {
    onUpdateOS(os.numero, {
      pre_diagnostico: { ...(os.pre_diagnostico || {}), orcamento_status: 'aguardando' },
    })
    onMoverOS(os.numero, 'orcamento')
    notify('ok', `OS #${os.numero} reaberta no Orçamento`)
  }

  function cobrarTaxa() {
    onUpdateOS(os.numero, {
      valor: 30,
      observacoes: [os.observacoes, '— Cobrança: taxa de diagnóstico R$ 30 —']
        .filter(Boolean).join('\n'),
    })
    const pagamento = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'pagamento')
    if (pagamento) onMoverOS(os.numero, pagamento.id)
  }

  async function converterFabricacao() {
    if (convertendo) return
    const ok = window.confirm(
      `Converter OS #${os.numero} em Fabricação?\n\n` +
      `• Uma NOVA OS de Fabricação será criada na coluna Diagnóstico.\n` +
      `• A OS recusada #${os.numero} fica com o cliente "${os.cliente || '—'}" preservada.\n` +
      `• Marca, modelo e defeito vêm copiados.\n` +
      `• Itens do orçamento NÃO são copiados.\n\nContinuar?`
    )
    if (!ok) return
    setConvertendo(true)
    try {
      const { error, numero } = await criarOSDerivada(os.id, {
        tipo: 'fabricacao', etapa: 'diagnostico', cliente_id: null,
      })
      if (error) throw error
      notify('ok', `OS #${numero} (Fabricação) criada a partir da #${os.numero}`)
    } catch (e) {
      notify('erro', `Erro ao converter: ${e?.message || 'desconhecido'}`)
    } finally {
      setConvertendo(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12, fontFamily: ATL_FONT, padding: '0 0 12px',
    }}>

      {/* Banner contextual */}
      <AtlPanel T={T} dark={dark} title="OS recusada" accent={vermelho}>
        <div style={{ padding: '12px 14px', display: 'flex', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 4,
            background: vermelho + '22', color: vermelho,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-circle-x" style={{ fontSize: 17 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.textPrimary,
              letterSpacing: '-0.005em',
            }}>O cliente recusou o orçamento</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, lineHeight: 1.4 }}>
              Escolha um dos destinos abaixo pra fechar essa OS.
            </div>
          </div>
        </div>
      </AtlPanel>

      {/* Reverter — recusou sem querer */}
      <AtlPanel T={T} dark={dark} title="Foi sem querer?">
        <Decisao T={T} dark={dark} cor={azul}
          first
          icon="arrow-back-up"
          titulo="Reabrir orçamento"
          texto="Volta a OS pra etapa Orçamento e reabre a decisão (aguardando resposta)."
          onClick={reabrirOrcamento}
        />
      </AtlPanel>

      {/* 3 decisoes em panel unico */}
      <AtlPanel T={T} dark={dark} title="Destino da máquina">
        <Decisao T={T} dark={dark} cor={azul}
          first
          icon="building-factory-2"
          titulo="Converter em Fabricação"
          texto="Aproveita as peças e a máquina vira estoque pra venda futura."
          onClick={converterFabricacao}
          loading={convertendo}
        />
        <Decisao T={T} dark={dark} cor={amarelo}
          icon="cash"
          titulo="Cobrar taxa de diagnóstico (R$ 30)"
          texto="Lança R$ 30 no orçamento e move pra Pagamento."
          onClick={cobrarTaxa}
        />
        <Decisao T={T} dark={dark} cor={vermelho}
          icon="truck-return"
          titulo="Devolver máquina ao cliente"
          texto="Move pra Entrega — máquina volta como está, sem cobrança."
          onClick={entregarDeVolta}
        />
      </AtlPanel>
    </div>
  )
}

function Decisao({ T, dark, cor, icon, titulo, texto, onClick, loading, first }) {
  const [hover, setHover] = useState(false)
  const inativo = loading
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inativo}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '12px 14px',
        borderTop: first ? 'none' : `1px solid ${T.border}`,
        background: hover && !inativo ? atlHover(dark) : 'transparent',
        border: 'none', cursor: inativo ? 'not-allowed' : 'pointer',
        fontFamily: ATL_FONT,
        display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s',
      }}>
      <div style={{
        width: 32, height: 32, borderRadius: 4,
        background: cor + '22', color: cor,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: T.textPrimary,
          letterSpacing: '-0.005em',
        }}>{titulo}</div>
        <div style={{
          fontSize: 11.5, color: T.textMuted, marginTop: 2, lineHeight: 1.4,
        }}>{loading ? 'Convertendo…' : texto}</div>
      </div>
      <i className={`ti ti-${loading ? 'loader-2' : 'chevron-right'}`}
         style={{ fontSize: 14, color: T.textDim, flexShrink: 0 }}
         aria-hidden="true" />
    </button>
  )
}
