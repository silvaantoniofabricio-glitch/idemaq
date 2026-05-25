// src/components/osDetalhe/RelatorioDiagnostico.jsx
// Resumo do diagnóstico — compartilhado entre AcaoOrcamento e AcaoOficina.
// Mostra:
//   1. Defeito relatado pelo cliente (os.defeito)
//   2. Causa identificada pelo técnico (os.diagnostico.causa)
//   3. Itens marcados como troca ou manutenção (os.diagnostico.checklist)
// Header tem badge do técnico que fez o diagnóstico (lido de os.historico).

import React from 'react'
import { corEtapa } from '../../utils/colors'
import { CATEGORIAS_PECA } from '../../utils/categoriasPeca'

// Cor por papel — alinhada com a paleta Deutan. Usada como fallback quando
// `usuarios` ainda está carregando ou o id do histórico não bate com ninguém.
const COR_PAPEL = { dono: '#5B9BD5', logistica: '#FFD966', oficina: '#B8CCE4' }

// Mapa id → label derivado de categoriasPeca.js — única fonte da verdade.
export const ITENS_DIAG = Object.fromEntries(CATEGORIAS_PECA.map(c => [c.id, c.label]))

// Converte o checklist do diagnóstico em lista plana — 1 entrada por flag.
// Item com man + troca vira 2 entradas (mais escaneável).
export function itensMarcadosDoDiag(os) {
  const checklist = os?.diagnostico?.checklist || {}
  return Object.entries(checklist)
    .filter(([, v]) => v?.man || v?.troca)
    .flatMap(([id, v]) => {
      const label = ITENS_DIAG[id] || id
      const out = []
      if (v.troca) out.push({ key: id + '-troca', baseId: id, label, tipo: 'troca' })
      if (v.man)   out.push({ key: id + '-man',   baseId: id, label, tipo: 'man' })
      return out
    })
}

export default function RelatorioDiagnostico({ T, dark, os, usuarios }) {
  const cor = (d, c) => dark ? d : c
  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)

  const diag  = os.diagnostico || {}
  const causa = diag.causa || ''
  const itens = itensMarcadosDoDiag(os)
  const regDiag  = [...(os.historico || [])].reverse().find(h => h.etapa === 'diagnostico')
  const u = regDiag && (usuarios || []).find(x => x.id === regDiag.funcionario)
  const funcDiag = u
    ? { apelido: u.apelido || u.nome || 'técnico', cor: u.cor || COR_PAPEL[u.papel] || '#5B9BD5' }
    : null

  return (
    <div style={{
      background: cor('rgba(184,204,228,0.06)', 'rgba(26,106,170,0.06)'),
      border: `1px solid ${corEtapa('blueLight', dark)}44`,
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-stethoscope" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
          <span style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
          }}>
            Relatório do diagnóstico
          </span>
        </div>
        {funcDiag && (
          <span style={{
            fontSize: 10, color: funcDiag.cor, fontWeight: 700,
            padding: '2px 7px', borderRadius: 10,
            background: funcDiag.cor + '22', border: `1px solid ${funcDiag.cor}33`,
          }}>
            Diag por {funcDiag.apelido}
          </span>
        )}
      </div>

      {/* Defeito relatado pelo cliente */}
      <BlocoDiagTexto T={T} dark={dark}
        icon="ti-user-exclamation" label="Defeito relatado pelo cliente"
        texto={os.defeito}
        placeholder="Cliente não relatou defeito específico."
      />

      {/* Causa identificada */}
      <BlocoDiagTexto T={T} dark={dark}
        icon="ti-zoom-scan" label="Causa identificada (técnico)"
        texto={causa}
        placeholder="Diagnóstico sem causa registrada — voltar e completar?"
        destaque
      />

      {/* Itens marcados */}
      {itens.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <div style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 700,
            marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <i className="ti ti-list-check" style={{ fontSize: 12 }} aria-hidden="true" />
            {itens.length} {itens.length === 1 ? 'item identificado' : 'itens identificados'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {itens.map(it => {
              const corT = it.tipo === 'troca' ? azul : amarelo
              return (
                <span key={it.key} style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 8px 3px 6px', borderRadius: 12,
                  background: cor(`${corT}22`, `${corT}18`),
                  color: corT, border: `1px solid ${corT}33`,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <i className={`ti ${it.tipo === 'troca' ? 'ti-replace' : 'ti-wrench'}`}
                     style={{ fontSize: 11 }} aria-hidden="true" />
                  {it.label}
                  <span style={{
                    fontSize: 9, fontWeight: 700, opacity: 0.7,
                    padding: '1px 5px', borderRadius: 8,
                    background: cor('rgba(0,0,0,0.25)', 'rgba(255,255,255,0.4)'),
                    textTransform: 'uppercase', letterSpacing: '.3px',
                  }}>
                    {it.tipo === 'troca' ? 'troca' : 'man'}
                  </span>
                </span>
              )
            })}
          </div>
          <div style={{
            fontSize: 10.5, color: T.textDim, marginTop: 6,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-replace" style={{ fontSize: 11, color: azul }} aria-hidden="true" />
              troca de peça
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-wrench" style={{ fontSize: 11, color: amarelo }} aria-hidden="true" />
              só manutenção
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          marginTop: 10, fontSize: 11, color: T.textMuted, fontStyle: 'italic',
        }}>
          Nenhum item marcado no checklist do diagnóstico.
        </div>
      )}
    </div>
  )
}

function BlocoDiagTexto({ T, dark, icon, label, texto, placeholder, destaque }) {
  const tem = texto && String(texto).trim().length > 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontSize: 10.5, color: T.textMuted, fontWeight: 700,
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
        {label}
      </div>
      <div style={{
        fontSize: 13,
        color: tem ? T.textPrimary : T.textMuted,
        fontStyle: tem ? 'normal' : 'italic',
        lineHeight: 1.5,
        padding: '8px 10px',
        background: T.bg,
        borderRadius: 6,
        border: `1px solid ${T.border}`,
        borderLeft: destaque ? `3px solid ${corEtapa('blue', dark)}` : `1px solid ${T.border}`,
        whiteSpace: 'pre-wrap',
      }}>
        {tem ? texto : placeholder}
      </div>
    </div>
  )
}
