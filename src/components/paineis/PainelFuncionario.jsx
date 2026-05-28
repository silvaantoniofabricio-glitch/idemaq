// src/components/paineis/PainelFuncionario.jsx
// Painel inicial do funcionário (Alessandro/Guilherme) — substitui o painel do dono
// quando o usuário não é admin. Layout mobile-first no padrão Apple HIG:
//   - Large title (28pt bold, tight letter-spacing)
//   - Inset grouped lists com hairlines internas (estilo iOS Settings)
//   - Tap targets ≥ 44pt
//   - System font stack (SF Pro no iOS, system-ui no resto)
//   - Spacing scale 8/12/16/20/24
// REGRA: nunca mostrar financeiro (R$, faturamento, lucro, etc.) — Toni decidiu.

import React, { useState } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { Card, Button, SectionHeader } from '../ui'
import CardPontoFuncionario from '../ponto/CardPontoFuncionario'
import EspelhoPonto from '../ponto/EspelhoPonto'
import { FUNCIONARIOS_PONTO } from '../ponto/_mocks'
import { usePainelFuncionario } from '../../hooks/usePainelFuncionario'

// Stack de fonte estilo Apple — SF Pro no iOS/macOS, fallback system-ui.
const SYS_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'

export default function PainelFuncionario({ T, dark, funcId = 'func1' }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const [verEspelho, setVerEspelho] = useState(false)

  const funcionario = FUNCIONARIOS_PONTO.find(f => f.id === funcId) || FUNCIONARIOS_PONTO[0]

  const { osDoDia, desempenho, escopo, loading: loadingPainel } = usePainelFuncionario(funcId)

  const hoje = new Date()
  const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dia = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  const dataFormatada = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1) + ', ' + dia

  // Background levemente acinzentado (estilo iOS Settings) — separa "fundo do app"
  // dos cards brancos por cima. No dark mode mantemos o T.bg padrão.
  const bgApp = dark ? T.bg : '#F2F2F7'

  if (verEspelho) {
    return (
      <div style={{
        padding: '16px 16px 24px', overflowY: 'auto', flex: 1,
        display: 'flex', flexDirection: 'column', gap: 12,
        fontFamily: SYS_FONT, background: bgApp,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="ghost" size="sm" T={T} dark={dark}
            iconLeft="ti-arrow-left"
            onClick={() => setVerEspelho(false)}>
            Voltar
          </Button>
        </div>
        <EspelhoPonto T={T} dark={dark} funcionario={funcionario} />
      </div>
    )
  }

  return (
    <div style={{
      padding: '8px 16px 32px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 24,
      maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box',
      fontFamily: SYS_FONT, background: bgApp,
    }}>
      {/* ─── LARGE TITLE (estilo iOS) ─────────────────────────────────────── */}
      <header style={{ paddingTop: 12, paddingBottom: 4 }}>
        <h1 style={{
          margin: 0,
          fontSize: 30, fontWeight: 700,
          color: corHero(dark),
          letterSpacing: '-0.022em',
          lineHeight: 1.15,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          Olá, {funcionario.nome}
          <span style={{ display: 'inline-block', transform: 'rotate(15deg)' }}>
            <i className="ti ti-hand-stop" style={{
              fontSize: 26, color: amarelo,
            }} aria-hidden="true" />
          </span>
        </h1>
        <div style={{
          marginTop: 4, fontSize: 14, color: T.textMuted,
          letterSpacing: '-0.01em',
        }}>
          Naviraí · {dataFormatada}
        </div>
      </header>

      {/* ─── CARD DE PONTO EM DESTAQUE ────────────────────────────────────── */}
      <CardPontoFuncionario T={T} dark={dark} funcionario={funcionario}
        onAbrirEspelho={() => setVerEspelho(true)} />

      {/* ─── GROUPED LIST: OS ABERTAS (estilo iOS Settings) ───────────────── */}
      <section>
        <SectionHIG T={T} dark={dark}
          titulo={escopo === 'funcionario' ? 'Minhas OS' : 'OS abertas'}
          contagem={loadingPainel ? null : `${osDoDia.length}`}
        />
        <Card T={T} dark={dark} padding={0}>
          {!loadingPainel && escopo === 'global' && (
            <div style={{
              padding: '10px 16px',
              fontSize: 12, color: T.textMuted,
              display: 'flex', alignItems: 'center', gap: 6,
              borderBottom: `0.5px solid ${T.border}`,
            }}>
              <i className="ti ti-info-circle" style={{ fontSize: 13 }} aria-hidden="true" />
              Sem histórico no seu nome — mostrando OS gerais
            </div>
          )}
          {loadingPainel && (
            <EmptyRow T={T} icon="loader-2" texto="Carregando…" />
          )}
          {!loadingPainel && osDoDia.length === 0 && (
            <EmptyRow T={T} icon="circle-check"
              cor={corEtapa('green', dark)}
              texto="Nenhuma OS aberta no momento" />
          )}
          {!loadingPainel && osDoDia.map((os, i) => (
            <OSRow key={os.numero} T={T} dark={dark} os={os}
              azul={azul} primeiro={i === 0} />
          ))}
        </Card>
      </section>

      {/* ─── DESEMPENHO (KPIs num único card com hairlines) ──────────────── */}
      <section>
        <SectionHIG T={T} dark={dark} titulo="Desempenho no mês" />
        <Card T={T} dark={dark} padding={0}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          }}>
            <KPI T={T} dark={dark}
              label="OS concluídas"
              valor={loadingPainel ? '—' : desempenho.osConcluidas}
              cor={azul}
              separadorDireita
            />
            <KPI T={T} dark={dark}
              label="Tempo médio"
              valor={loadingPainel ? '—' : desempenho.tempoMedio}
              cor={corHero(dark)}
              separadorDireita
            />
            <KPI T={T} dark={dark}
              label="Pontualidade"
              valor={loadingPainel ? '—' : desempenho.pontualidade}
              cor={azul}
            />
          </div>
        </Card>
      </section>
    </div>
  )
}

// ─── Section header estilo iOS ─────────────────────────────────────────────
// Texto pequeno, todo em maiúsculas, cinza, com padding lateral 16px.
// (Equivalente ao <SectionHeader> da apple Settings.app.)
function SectionHIG({ T, titulo, contagem }) {
  return (
    <div style={{
      padding: '0 16px 6px',
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    }}>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: T.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '.06em',
      }}>
        {titulo}
      </span>
      {contagem != null && (
        <span style={{
          fontSize: 12, color: T.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {contagem}
        </span>
      )}
    </div>
  )
}

// ─── Linha de OS (estilo cell do iOS) ──────────────────────────────────────
// Tap target ≥ 44pt, hairline 0.5pt entre rows, chevron à direita.
function OSRow({ T, dark, os, azul, primeiro }) {
  return (
    <div style={{
      minHeight: 56,
      display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
      gap: 12, alignItems: 'center',
      padding: '10px 16px',
      borderTop: primeiro ? 'none' : `0.5px solid ${T.border}`,
      cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: bgEtapa('blue', dark),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: azul,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
      }}>
        {os.numero.toString().slice(-3)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>
          OS #{os.numero}
        </div>
        <div style={{
          fontSize: 13, color: T.textMuted, marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {os.cliente} · {os.etapa}
        </div>
      </div>
      {os.hora && (
        <span style={{
          fontSize: 13, color: T.textSecondary, fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {os.hora}
        </span>
      )}
      <i className="ti ti-chevron-right" style={{
        fontSize: 16, color: T.textDim, marginLeft: 2,
      }} aria-hidden="true" />
    </div>
  )
}

// ─── Linha "vazio" estilo iOS ─────────────────────────────────────────────
function EmptyRow({ T, icon, texto, cor }) {
  return (
    <div style={{
      padding: '20px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 14, color: T.textMuted,
    }}>
      <i className={`ti ti-${icon}`} style={{
        fontSize: 16, color: cor || T.textMuted,
      }} aria-hidden="true" />
      {texto}
    </div>
  )
}

// ─── KPI individual (1/3 da largura, separador vertical hairline) ─────────
function KPI({ T, label, valor, cor, separadorDireita }) {
  return (
    <div style={{
      padding: '14px 12px',
      textAlign: 'center',
      borderRight: separadorDireita ? `0.5px solid ${T.border}` : 'none',
    }}>
      <div style={{
        fontSize: 22, fontWeight: 700, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        marginBottom: 2, lineHeight: 1.1,
      }}>
        {valor}
      </div>
      <div style={{
        fontSize: 11, color: T.textMuted, fontWeight: 500,
        letterSpacing: '-0.005em',
      }}>
        {label}
      </div>
    </div>
  )
}
