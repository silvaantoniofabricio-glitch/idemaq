// src/components/osDetalhe/RelatorioPontuacaoModal.jsx
// Relatório de pontuação de UMA OS — aberto pelo menu "⋮ Mais ações" do
// Header. Mostra o que essa OS gerou de pontos, pra quem, e quando.
// Atlassian Design (mesmas primitivas de osDetalhe/acoes/_AtlassianUI).
//
// Reaproveita calcularPontosOS (mesma função que alimenta o placar em
// Relatórios/Funcionários e o Painel do Funcionário) — garante que o número
// aqui bate exatamente com o que conta pro prêmio.

import React from 'react'
import { Modal, ModalHeader } from '../ui'
import { AtlPanel, ATL_FONT } from './acoes/_AtlassianUI'
import { calcularPontosOS } from '../../utils/pontuacao'
import { corEtapa } from '../../utils/colors'

function fmtQuando(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function RelatorioPontuacaoModal({ T, dark, mobile, os, onClose }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  const ehGarantia = !!os?.garantia
  const entries = ehGarantia ? [] : calcularPontosOS({
    id: os.id,
    numero: os.numero,
    tipoEquipamento: os.tipoEquipamento,
    pre_diagnostico: os.pre_diagnostico,
  })

  const totalPontos = entries.reduce((s, e) => s + e.pontos, 0)

  // Agrupa por pessoa
  const porPessoa = {}
  for (const e of entries) {
    const chave = e.funcionario_id || e.apelido
    if (!porPessoa[chave]) porPessoa[chave] = { apelido: e.apelido, total: 0 }
    porPessoa[chave].total += e.pontos
  }
  const pessoas = Object.values(porPessoa).sort((a, b) => b.total - a.total)

  // Ordena detalhamento cronologicamente (mais recente primeiro)
  const entriesOrdenadas = [...entries].sort((a, b) => new Date(b.em || 0) - new Date(a.em || 0))

  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={520}>
      <ModalHeader T={T}
        title="Relatório de Pontuação"
        subtitle={`OS #${os?.numero}`}
        icon="ti-trophy"
        onClose={onClose}
      />

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: mobile ? '14px' : '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
        fontFamily: ATL_FONT,
      }}>

        {/* Aviso garantia — explica por que não pontua */}
        {ehGarantia && (
          <AtlPanel T={T} dark={dark} accent={vermelho}>
            <div style={{ padding: '12px 14px', display: 'flex', gap: 10 }}>
              <i className="ti ti-shield-x" style={{ fontSize: 18, color: vermelho, flexShrink: 0 }} aria-hidden="true" />
              <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.5 }}>
                <strong>OS de garantia — não gera pontos.</strong> Retrabalho decorrente de
                um problema não pontua pra quem conserta de novo (ver Qualidade em
                Relatórios → Funcionários pra o desconto de quem fez o serviço original).
              </div>
            </div>
          </AtlPanel>
        )}

        {/* Total */}
        {!ehGarantia && (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>
              Total gerado nesta OS
            </span>
            <span style={{
              fontSize: 28, fontWeight: 800, color: amarelo,
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            }}>
              {totalPontos} <span style={{ fontSize: 13, fontWeight: 500, color: T.textMuted }}>pts</span>
            </span>
          </div>
        )}

        {!ehGarantia && entries.length === 0 && (
          <div style={{
            padding: '20px 14px', textAlign: 'center',
            color: T.textMuted, fontSize: 12.5, fontStyle: 'italic',
          }}>
            Nenhum ponto gerado ainda — os pontos aparecem conforme os checks
            das etapas vão sendo concluídos (a partir de 06/07/2026).
          </div>
        )}

        {/* Por pessoa */}
        {pessoas.length > 0 && (
          <AtlPanel T={T} dark={dark} title="Por pessoa" count={pessoas.length}>
            {pessoas.map((p, i) => (
              <div key={p.apelido} style={{
                padding: '10px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: azul + '22', color: azul,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10.5, fontWeight: 800, flexShrink: 0,
                  }}>{(p.apelido || '?').slice(0, 2).toUpperCase()}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{p.apelido}</span>
                </div>
                <span style={{
                  fontSize: 15, fontWeight: 800, color: amarelo,
                  fontVariantNumeric: 'tabular-nums',
                }}>{p.total} pts</span>
              </div>
            ))}
          </AtlPanel>
        )}

        {/* Detalhamento por bloco */}
        {entries.length > 0 && (
          <AtlPanel T={T} dark={dark} title="Detalhamento" count={entries.length}>
            {entriesOrdenadas.map((e, i) => (
              <div key={`${e.servico}-${i}`} style={{
                padding: '10px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{e.label}</div>
                  <div style={{
                    fontSize: 11, color: T.textMuted, marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {e.apelido}{fmtQuando(e.em) ? ` · ${fmtQuando(e.em)}` : ''}
                  </div>
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: verde, flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>+{e.pontos}</span>
              </div>
            ))}
          </AtlPanel>
        )}

      </div>
    </Modal>
  )
}
