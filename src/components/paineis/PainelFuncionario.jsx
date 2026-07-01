// src/components/paineis/PainelFuncionario.jsx
// Painel do funcionário (Alessandro/Guilherme) — design Atlassian.
// Mobile-first, com layout 2 colunas em desktop (auto-fit minmax 280px).
// REGRA: nunca mostrar financeiro (R$, faturamento, lucro, etc.).

import React, { useState, useMemo } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { Card, Button } from '../ui'
import CardPontoFuncionario from '../ponto/CardPontoFuncionario'
import ResumoDia from '../ponto/ResumoDia'
import SaldoBancoHoras from '../ponto/SaldoBancoHoras'
import HistoricoSemana from '../ponto/HistoricoSemana'
import EspelhoPonto from '../ponto/EspelhoPonto'
import { usePainelFuncionario } from '../../hooks/usePainelFuncionario'
import { usePonto, proximoTipo } from '../../hooks/usePonto'
import { getRole } from '../../utils/osHelpers'

const LABEL_PAPEL = { logistica: 'Logística', oficina: 'Oficina', dono: 'Dono' }
const JORNADA_PADRAO_MIN = 8 * 60

export default function PainelFuncionario({ T, dark, user }) {
  const azul     = corEtapa('blue',   dark)
  const amarelo  = corEtapa('yellow', dark)
  const [verEspelho, setVerEspelho] = useState(false)

  const funcionario = {
    id:       user?.usuarioId || null,
    nome:     user?.apelido   || 'Funcionário',
    papel:    LABEL_PAPEL[user?.papel] || user?.papel || '',
    iniciais: (user?.apelido || 'F').slice(0, 2).toUpperCase(),
  }

  const funcId = getRole(user)
  const { osDoDia, desempenho, escopo, loading: loadingPainel } = usePainelFuncionario(funcId)

  // Escopo 'semana' cobre hoje + 6 dias → alimenta HistoricoSemana, ResumoDia, SaldoBancoHoras.
  // Canal usa sufixo '_semana' para não conflitar com o '_hoje' interno do CardPontoFuncionario.
  const {
    batidas: batidasSemana,
    batidasHoje,
    ultima,
    saldoBancoMin,
  } = usePonto({ funcionarioId: funcionario.id, escopo: 'semana' })

  const proxTipo = useMemo(() => proximoTipo(ultima), [ultima])

  const statusAtual = useMemo(() => {
    if (!ultima) return { label: 'Sem batida hoje', cor: amarelo }
    if (ultima.tipo === 'saida')        return { label: 'Expediente encerrado', cor: T.textMuted }
    if (ultima.tipo === 'saida_almoco') return { label: 'Em almoço', cor: amarelo }
    return { label: 'Trabalhando', cor: azul }
  }, [ultima, azul, amarelo, T.textMuted])

  const hoje = new Date()
  const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const diaMes    = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  const dataLabel = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1) + ', ' + diaMes
  const periodoHoras = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const bgApp = dark ? T.bg : '#F2F2F7'

  // ─── Vista espelho ───────────────────────────────────────────────────────────
  if (verEspelho) {
    return (
      <div style={{
        padding: '16px 16px 24px', overflowY: 'auto', flex: 1,
        display: 'flex', flexDirection: 'column', gap: 12,
        background: bgApp,
      }}>
        <Button variant="ghost" size="sm" T={T} dark={dark}
          iconLeft="ti-arrow-left"
          onClick={() => setVerEspelho(false)}>
          Voltar ao painel
        </Button>
        <EspelhoPonto T={T} dark={dark} funcionario={funcionario} />
      </div>
    )
  }

  // ─── Vista principal ─────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '8px 16px 40px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 20,
      maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box',
      background: bgApp,
    }}>

      {/* ── CABEÇALHO ────────────────────────────────────────────────────────── */}
      <header style={{
        paddingTop: 14,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar iniciais={funcionario.iniciais} cor={azul} />
          <div>
            <div style={{
              fontSize: 20, fontWeight: 700, color: corHero(dark),
              letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              {funcionario.nome}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>
              {funcionario.papel} · {dataLabel}
            </div>
          </div>
        </div>
        <Lozenge cor={statusAtual.cor} label={statusAtual.label} />
      </header>

      {/* ── SEÇÃO: PONTO ─────────────────────────────────────────────────────── */}
      <SecLabel T={T} icon="ti-clock-pin" label="Ponto de hoje" />

      {/* Grid 2 colunas no desktop, 1 no mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14,
        alignItems: 'start',
      }}>
        {/* Coluna esquerda: botão bater + marcações do dia */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CardPontoFuncionario
            T={T} dark={dark}
            funcionario={funcionario}
            onAbrirEspelho={() => setVerEspelho(true)}
          />
          <ResumoDia T={T} dark={dark} batidas={batidasHoje} proxTipo={proxTipo} />
        </div>

        {/* Coluna direita: banco de horas + histórico da semana */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SaldoBancoHoras T={T} dark={dark} saldoMinutos={saldoBancoMin} periodo={periodoHoras} />
          <HistoricoSemana T={T} dark={dark} batidas={batidasSemana} jornadaPadraoMin={JORNADA_PADRAO_MIN} />
        </div>
      </div>

      {/* Link espelho — discreto, logo abaixo da seção de ponto */}
      <button onClick={() => setVerEspelho(true)} style={{
        background: 'transparent', border: 'none',
        color: azul, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 0', marginTop: -10,
        alignSelf: 'flex-start',
      }}>
        <i className="ti ti-calendar-stats" style={{ fontSize: 14 }} aria-hidden="true" />
        Ver espelho completo
        <i className="ti ti-arrow-right" style={{ fontSize: 12 }} aria-hidden="true" />
      </button>

      {/* ── SEÇÃO: MINHAS OS ─────────────────────────────────────────────────── */}
      <SecLabel T={T} icon="ti-clipboard-list"
        label={escopo === 'funcionario' ? 'Minhas OS' : 'OS abertas'}
        contagem={loadingPainel ? null : osDoDia.length}
      />
      <Card T={T} dark={dark} padding={0}>
        {!loadingPainel && escopo === 'global' && (
          <div style={{
            padding: '9px 14px',
            fontSize: 11.5, color: T.textMuted,
            display: 'flex', alignItems: 'center', gap: 6,
            borderBottom: `1px solid ${T.border}`,
          }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
            Sem histórico no seu nome — mostrando OS gerais
          </div>
        )}
        {loadingPainel && <EmptyRow T={T} icon="loader-2" texto="Carregando…" />}
        {!loadingPainel && osDoDia.length === 0 && (
          <EmptyRow T={T} icon="circle-check" cor={azul} texto="Nenhuma OS aberta no momento" />
        )}
        {!loadingPainel && osDoDia.map((os, i) => (
          <OSRow key={os.numero} T={T} dark={dark} os={os} azul={azul} primeiro={i === 0} />
        ))}
      </Card>

      {/* ── SEÇÃO: DESEMPENHO DO MÊS ─────────────────────────────────────────── */}
      <SecLabel T={T} icon="ti-chart-bar" label="Desempenho no mês" />
      <Card T={T} dark={dark} padding={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <KPI T={T} dark={dark}
            label="OS concluídas"
            valor={loadingPainel ? '—' : desempenho.osConcluidas}
            icon="ti-clipboard-check"
            cor={azul}
            separadorDireita
          />
          <KPI T={T} dark={dark}
            label="Tempo médio"
            valor={loadingPainel ? '—' : desempenho.tempoMedio}
            icon="ti-clock"
            cor={corHero(dark)}
            separadorDireita
          />
          <KPI T={T} dark={dark}
            label="Pontualidade"
            valor={loadingPainel ? '—' : desempenho.pontualidade}
            icon="ti-award"
            cor={azul}
          />
        </div>
      </Card>

    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Avatar({ iniciais, cor }) {
  return (
    <div style={{
      width: 46, height: 46, borderRadius: '50%',
      background: cor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, fontWeight: 800, color: '#fff',
      letterSpacing: '-0.02em', flexShrink: 0,
      userSelect: 'none',
    }}>
      {iniciais}
    </div>
  )
}

// Lozenge Atlassian: bordas retas (3px), tint de fundo, cor semântica
function Lozenge({ cor, label }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px', borderRadius: 3,
      background: cor + '1a',
      border: `1px solid ${cor}40`,
      fontSize: 11, fontWeight: 700, color: cor,
      whiteSpace: 'nowrap', flexShrink: 0,
      letterSpacing: '.02em',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cor, display: 'inline-block', flexShrink: 0,
      }} />
      {label}
    </div>
  )
}

// Section label estilo Atlassian — uppercase 11px cinza + linha divisora
function SecLabel({ T, icon, label, contagem }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      marginBottom: -8,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12, color: T.textMuted }} aria-hidden="true" />
      <span style={{
        fontSize: 11, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.07em',
        whiteSpace: 'nowrap',
      }}>
        {label}
        {contagem != null && (
          <span style={{ marginLeft: 5, fontVariantNumeric: 'tabular-nums' }}>
            ({contagem})
          </span>
        )}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

// Linha de OS — left-border accent, estilo Atlassian
function OSRow({ T, dark, os, azul, primeiro }) {
  const corBordaMap = {
    agendamento:           '#FFD966',
    aguardando_agendamento:'#FFD966',
    em_oficina:            '#5B9BD5',
    entrega:               '#5B9BD5',
    pagamento:             '#B8CCE4',
  }
  const corBorda = corBordaMap[os.etapa] || T.border

  return (
    <div style={{
      minHeight: 54,
      display: 'grid', gridTemplateColumns: '4px 48px 1fr auto',
      alignItems: 'stretch',
      borderTop: primeiro ? 'none' : `1px solid ${T.border}`,
      cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
    }}
      onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ background: corBorda, borderRadius: '4px 0 0 4px' }} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 6px 0 10px',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: azul + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: azul,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {String(os.numero).slice(-3)}
        </div>
      </div>

      <div style={{ padding: '10px 4px 10px 0', minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>
          OS #{os.numero} · {os.cliente}
        </div>
        <div style={{
          fontSize: 11.5, color: T.textMuted, marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <i className="ti ti-point-filled" style={{ fontSize: 8 }} aria-hidden="true" />
          {os.etapa.replace(/_/g, ' ')}
          {os.hora && (
            <>
              <span>·</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: azul }}>
                {os.hora}
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', paddingRight: 14,
      }}>
        <i className="ti ti-chevron-right" style={{ fontSize: 15, color: T.textDim }} aria-hidden="true" />
      </div>
    </div>
  )
}

function EmptyRow({ T, icon, texto, cor }) {
  return (
    <div style={{
      padding: '20px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 13, color: T.textMuted,
    }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 16, color: cor || T.textMuted }} aria-hidden="true" />
      {texto}
    </div>
  )
}

// KPI com ícone centralizado — Atlassian style
function KPI({ T, dark, label, valor, icon, cor, separadorDireita }) {
  return (
    <div style={{
      padding: '16px 10px 14px',
      textAlign: 'center',
      borderRight: separadorDireita ? `1px solid ${T.border}` : 'none',
    }}>
      <i className={`ti ${icon}`} style={{
        fontSize: 18, color: cor, display: 'block',
        marginBottom: 6, opacity: 0.75,
      }} aria-hidden="true" />
      <div style={{
        fontSize: 22, fontWeight: 700, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        marginBottom: 3, lineHeight: 1.1,
      }}>
        {valor}
      </div>
      <div style={{
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        letterSpacing: '.01em', lineHeight: 1.3,
      }}>
        {label}
      </div>
    </div>
  )
}
