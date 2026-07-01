// src/pages/relatorios/RelatorioPonto.jsx
// 7º relatório: Relógio de Ponto. Admin-only.
// KPI strip + tabela resumo por funcionário + espelho dia-a-dia expansível por linha.

import React, { useState } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { Card, EmptyState } from '../../components/ui'
import { useRelatorioPonto } from '../../hooks/useRelatorios'
import EspelhoPonto from '../../components/ponto/EspelhoPonto'

const LABEL_PAPEL = { dono: 'Dono', logistica: 'Logística', oficina: 'Oficina' }

export default function RelatorioPonto({ T, dark, iniIso, fimIso }) {
  const { data, loading, error } = useRelatorioPonto({ iniIso, fimIso })
  const [espelhoAberto, setEspelhoAberto] = useState(null)  // id do funcionário expandido

  if (loading) return <PontoLoading T={T} />
  if (error)   return <PontoErro T={T} dark={dark} msg={error} />
  if (!data)   return null

  const azul     = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  const amarelo  = corEtapa('yellow', dark)
  const equipe   = data.porFuncionario

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <KPI T={T} dark={dark} label="Horas trabalhadas (total)" valor={data.totalHoras}       cor={azul}    icon="ti-clock" />
        <KPI T={T} dark={dark} label="Faltas no período"          valor={data.totalFaltas}       cor={data.totalFaltas > 0 ? amarelo : corHero(dark)} icon="ti-calendar-x" />
        <KPI T={T} dark={dark} label="Pessoas com jornada"        valor={data.totalFuncionarios} cor={corHero(dark)} icon="ti-users" />
        <KPI T={T} dark={dark} label="Top performer"
          valor={data.topPerformer ? data.topPerformer.nome : '—'}
          subtitulo={data.topPerformer ? data.topPerformer.totalHoras : null}
          cor={azul} icon="ti-trophy" />
      </div>

      {/* Tabela + espelhos expansíveis */}
      <Card T={T} dark={dark} padding={0}>
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>
          <i className="ti ti-clock-pin" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
          Jornada por funcionário
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 500, color: T.textDim, textTransform: 'none', letterSpacing: 0 }}>
            Clique numa linha pra ver o espelho detalhado
          </span>
        </div>

        {equipe.length === 0 ? (
          <div style={{ padding: '16px 16px 20px' }}>
            <EmptyState T={T} compact icon="ti-clock-off"
              title="Sem batidas registradas no período"
              description="Nenhum funcionário bateu ponto neste período." />
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 80px 130px 36px',
              gap: 10, padding: '8px 16px',
              background: T.cardAlt,
              fontSize: 10.5, color: T.textMuted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              <div>Funcionário</div>
              <div style={{ textAlign: 'right' }}>Horas trabalhadas</div>
              <div style={{ textAlign: 'right' }}>Faltas</div>
              <div style={{ textAlign: 'right' }}>Saldo banco</div>
              <div />
            </div>

            {equipe.map(f => {
              const saldoPos  = f.saldoHorasMin >= 0
              const corSaldo  = saldoPos ? azul : vermelho
              const iconSaldo = saldoPos ? 'ti-trending-up' : 'ti-trending-down'
              const aberto    = espelhoAberto === f.id
              const funcionario = { id: f.id, nome: f.nome, papel: LABEL_PAPEL[f.papel] || f.papel || '' }

              return (
                <div key={f.id}>
                  {/* Linha da tabela — clicável */}
                  <div
                    onClick={() => setEspelhoAberto(aberto ? null : f.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 80px 130px 36px',
                      gap: 10, alignItems: 'center',
                      padding: '14px 16px',
                      borderTop: `1px solid ${T.border}`,
                      cursor: 'pointer',
                      background: aberto ? (dark ? '#1a2030' : '#f0f5ff') : 'transparent',
                      transition: 'background .1s',
                    }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: corHero(dark) }}>{f.nome}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                        {LABEL_PAPEL[f.papel] || f.papel || '—'}
                        {' · '}{f.diasComputados} dia{f.diasComputados === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
                      {f.totalHoras}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: f.faltas > 0 ? amarelo : T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                      {f.faltas}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: corSaldo, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <i className={`ti ${iconSaldo}`} style={{ fontSize: 14 }} aria-hidden="true" />
                      {f.saldoHoras}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`ti ${aberto ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                         style={{ fontSize: 14, color: T.textDim }} aria-hidden="true" />
                    </div>
                  </div>

                  {/* Espelho expansível */}
                  {aberto && (
                    <div style={{
                      padding: '12px 16px 20px',
                      borderTop: `1px solid ${T.border}`,
                      background: dark ? '#10141c' : '#f7f9ff',
                    }}>
                      <EspelhoPonto T={T} dark={dark} funcionario={funcionario} />
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </Card>
    </div>
  )
}

function KPI({ T, dark, label, valor, subtitulo, cor, icon }) {
  return (
    <Card T={T} dark={dark}>
      <div style={{
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8,
      }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />}
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {valor}
      </div>
      {subtitulo && <div style={{ marginTop: 4, fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{subtitulo}</div>}
    </Card>
  )
}

function PontoLoading({ T }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48, color: T.textMuted, fontSize: 13 }}>
      <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
      Carregando jornadas…
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function PontoErro({ T, dark, msg }) {
  const vermelho = corEtapa('red', dark)
  return (
    <Card T={T} dark={dark} accent={vermelho}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: vermelho }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 20 }} aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Falha ao carregar relatório de ponto</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: T.textSecondary }}>{msg}</div>
    </Card>
  )
}
