// src/components/paineis/PainelFuncionario.jsx
// Painel do funcionário — layout duplo:
//   Desktop (≥ 900px): topbar + painel esquerdo fixo 360px + conteúdo direito
//   Mobile (< 900px):  coluna única scrollável
// REGRA: nunca mostrar financeiro (R$, faturamento, lucro, etc.).

import React, { useState, useMemo, useEffect } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { Card, Button } from '../ui'
import CardPontoFuncionario from '../ponto/CardPontoFuncionario'
import ResumoDia from '../ponto/ResumoDia'
import SaldoBancoHoras from '../ponto/SaldoBancoHoras'
import HistoricoSemana from '../ponto/HistoricoSemana'
import EspelhoPonto from '../ponto/EspelhoPonto'
import { usePainelFuncionario } from '../../hooks/usePainelFuncionario'
import { usePonto, proximoTipo } from '../../hooks/usePonto'
import { usePontuacao } from '../../hooks/usePontuacao'
import { LABEL_SERVICO } from '../../utils/pontuacao'
import { getRole } from '../../utils/osHelpers'

const LABEL_PAPEL = { logistica: 'Logística', oficina: 'Oficina', dono: 'Dono' }
const JORNADA_PADRAO_MIN = 8 * 60

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function PainelFuncionario({ T, dark, user }) {
  const azul    = corEtapa('blue',   dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red',   dark)

  const [verEspelho, setVerEspelho] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900)

  useEffect(() => {
    const h = () => setIsDesktop(window.innerWidth >= 900)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const funcionario = {
    id:       user?.usuarioId || null,
    nome:     user?.apelido   || 'Funcionário',
    papel:    LABEL_PAPEL[user?.papel] || user?.papel || '',
    iniciais: (user?.apelido || 'F').slice(0, 2).toUpperCase(),
  }

  const funcId = getRole(user)
  const { osDoDia, desempenho, escopo, loading: loadingPainel } = usePainelFuncionario(funcId)

  // Pontuação por desempenho — mês corrente, só o próprio funcionário.
  const { iniIso: pontosIniIso, fimIso: pontosFimIso } = useMemo(() => {
    const hoje = new Date()
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1); ini.setHours(0, 0, 0, 0)
    const fim = new Date(hoje); fim.setHours(23, 59, 59, 999)
    return { iniIso: ini.toISOString(), fimIso: fim.toISOString() }
  }, [])
  const { data: pontuacaoData, loading: loadingPontos } = usePontuacao({ iniIso: pontosIniIso, fimIso: pontosFimIso })
  const meusPontos = pontuacaoData?.equipe?.find(f => f.funcionario_id === funcionario.id) || null

  const {
    batidas: batidasSemana,
    batidasHoje,
    ultima,
    saldoBancoMin,
  } = usePonto({ funcionarioId: funcionario.id, escopo: 'semana' })

  const proxTipo    = useMemo(() => proximoTipo(ultima), [ultima])
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
  const bgApp = dark ? T.bg : '#F0F1F4'

  // Props comuns para sub-componentes
  const pontoProps = { T, dark, funcionario, proxTipo, batidasHoje, batidasSemana, saldoBancoMin, periodoHoras }
  const painelProps = { T, dark, osDoDia, desempenho, escopo, loadingPainel, azul, vermelho }

  // ─── Vista espelho ───────────────────────────────────────────────────────────
  if (verEspelho) {
    return (
      <div style={{
        padding: isDesktop ? '20px 32px 32px' : '16px 16px 24px',
        overflowY: 'auto', flex: 1,
        display: 'flex', flexDirection: 'column', gap: 16,
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

  // ─── DESKTOP ─────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
        background: bgApp,
      }}>

        {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
        <div style={{
          background: T.card,
          borderBottom: `1px solid ${T.border}`,
          padding: '14px 28px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
          flexShrink: 0,
          boxShadow: dark ? 'none' : '0 1px 0 rgba(0,0,0,.06)',
        }}>
          {/* Identidade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `linear-gradient(135deg, ${azul}, ${azul}bb)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 19, fontWeight: 800, color: '#fff',
              flexShrink: 0, userSelect: 'none',
              boxShadow: `0 2px 8px ${azul}44`,
            }}>
              {funcionario.iniciais}
            </div>
            <div>
              <div style={{
                fontSize: 18, fontWeight: 700, color: corHero(dark),
                letterSpacing: '-0.02em', lineHeight: 1.2,
              }}>
                {saudacao()}, {funcionario.nome}
              </div>
              <div style={{
                fontSize: 12, color: T.textMuted, marginTop: 2,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  padding: '1px 7px', borderRadius: 3,
                  background: T.cardAlt,
                  border: `1px solid ${T.border}`,
                  fontSize: 11, fontWeight: 600, color: T.textSecondary,
                }}>
                  {funcionario.papel}
                </span>
                <span>{dataLabel}</span>
              </div>
            </div>
          </div>

          {/* Status + ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lozenge cor={statusAtual.cor} label={statusAtual.label} />
            <button onClick={() => setVerEspelho(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 6,
              background: 'transparent',
              border: `1.5px solid ${T.border2 || T.border}`,
              color: T.textSecondary, fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'border-color .15s, color .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = azul; e.currentTarget.style.color = azul }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2 || T.border; e.currentTarget.style.color = T.textSecondary }}
            >
              <i className="ti ti-calendar-stats" style={{ fontSize: 14 }} aria-hidden="true" />
              Espelho de ponto
            </button>
          </div>
        </div>

        {/* ── CONTEÚDO PRINCIPAL — 2 COLUNAS ──────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}>

          {/* ── PAINEL ESQUERDO: ponto ───────────────────────────────────── */}
          <div style={{
            borderRight: `1px solid ${T.border}`,
            overflowY: 'auto',
            padding: '20px 18px 32px 24px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <PanelLabel T={T} icon="ti-clock-pin" label="Ponto de hoje" />
            <CardPontoFuncionario
              T={T} dark={dark}
              funcionario={funcionario}
              onAbrirEspelho={() => setVerEspelho(true)}
            />
            <ResumoDia T={T} dark={dark} batidas={batidasHoje} proxTipo={proxTipo} />
            <SaldoBancoHoras T={T} dark={dark} saldoMinutos={saldoBancoMin} periodo={periodoHoras} />
          </div>

          {/* ── PAINEL DIREITO: OS + desempenho + histórico ─────────────── */}
          <div style={{
            overflowY: 'auto',
            padding: '20px 28px 32px 20px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>

            {/* OS */}
            <section>
              <PanelLabel T={T} icon="ti-clipboard-list"
                label={escopo === 'funcionario' ? 'Minhas OS' : 'OS abertas'}
                contagem={loadingPainel ? null : osDoDia.length}
              />
              <OSPanel T={T} dark={dark} azul={azul} osDoDia={osDoDia} escopo={escopo} loadingPainel={loadingPainel} desktop />
            </section>

            {/* Desempenho */}
            <section>
              <PanelLabel T={T} icon="ti-chart-bar" label="Desempenho no mês" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <KPICard T={T} dark={dark}
                  label="OS concluídas" valor={loadingPainel ? '—' : desempenho.osConcluidas}
                  icon="ti-clipboard-check" cor={azul} />
                <KPICard T={T} dark={dark}
                  label="Tempo médio" valor={loadingPainel ? '—' : desempenho.tempoMedio}
                  icon="ti-clock" cor={corHero(dark)} />
                <KPICard T={T} dark={dark}
                  label="Pontualidade" valor={loadingPainel ? '—' : desempenho.pontualidade}
                  icon="ti-award" cor={azul} />
              </div>
            </section>

            {/* Pontuação por desempenho */}
            <section>
              <PanelLabel T={T} icon="ti-trophy" label="Meus pontos do mês" />
              <CardPontos T={T} dark={dark} azul={azul} amarelo={amarelo}
                dados={meusPontos} loading={loadingPontos} />
            </section>

            {/* Histórico da semana */}
            <section>
              <PanelLabel T={T} icon="ti-calendar-week" label="Últimos 7 dias" />
              <HistoricoSemana T={T} dark={dark} batidas={batidasSemana} jornadaPadraoMin={JORNADA_PADRAO_MIN} horaEntradaSab={user?.papel === 'logistica' ? 8 : 7} />
            </section>

          </div>
        </div>
      </div>
    )
  }

  // ─── MOBILE ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '8px 16px 40px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 20,
      maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box',
      background: bgApp,
    }}>
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

      <SecLabel T={T} icon="ti-clock-pin" label="Ponto de hoje" />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14, alignItems: 'start',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CardPontoFuncionario T={T} dark={dark} funcionario={funcionario}
            onAbrirEspelho={() => setVerEspelho(true)} />
          <ResumoDia T={T} dark={dark} batidas={batidasHoje} proxTipo={proxTipo} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SaldoBancoHoras T={T} dark={dark} saldoMinutos={saldoBancoMin} periodo={periodoHoras} />
          <HistoricoSemana T={T} dark={dark} batidas={batidasSemana} jornadaPadraoMin={JORNADA_PADRAO_MIN} horaEntradaSab={user?.papel === 'logistica' ? 8 : 7} />
        </div>
      </div>

      <button onClick={() => setVerEspelho(true)} style={{
        background: 'transparent', border: 'none',
        color: azul, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 0', marginTop: -10, alignSelf: 'flex-start',
      }}>
        <i className="ti ti-calendar-stats" style={{ fontSize: 14 }} aria-hidden="true" />
        Ver espelho completo
        <i className="ti ti-arrow-right" style={{ fontSize: 12 }} aria-hidden="true" />
      </button>

      <SecLabel T={T} icon="ti-clipboard-list"
        label={escopo === 'funcionario' ? 'Minhas OS' : 'OS abertas'}
        contagem={loadingPainel ? null : osDoDia.length}
      />
      <OSPanel T={T} dark={dark} azul={azul} osDoDia={osDoDia} escopo={escopo} loadingPainel={loadingPainel} />

      <SecLabel T={T} icon="ti-chart-bar" label="Desempenho no mês" />
      <Card T={T} dark={dark} padding={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <KPI T={T} dark={dark} label="OS concluídas"
            valor={loadingPainel ? '—' : desempenho.osConcluidas}
            icon="ti-clipboard-check" cor={azul} separadorDireita />
          <KPI T={T} dark={dark} label="Tempo médio"
            valor={loadingPainel ? '—' : desempenho.tempoMedio}
            icon="ti-clock" cor={corHero(dark)} separadorDireita />
          <KPI T={T} dark={dark} label="Pontualidade"
            valor={loadingPainel ? '—' : desempenho.pontualidade}
            icon="ti-award" cor={azul} />
        </div>
      </Card>

      <SecLabel T={T} icon="ti-trophy" label="Meus pontos do mês" />
      <CardPontos T={T} dark={dark} azul={azul} amarelo={amarelo}
        dados={meusPontos} loading={loadingPontos} />
    </div>
  )
}

// ─── Card de pontuação por desempenho (mês corrente) ──────────────────────────
function CardPontos({ T, dark, azul, amarelo, dados, loading }) {
  const total = dados?.total || 0
  const porServico = dados?.porServico || {}
  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 10,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>
          Total no mês
        </span>
        <span style={{
          fontSize: 26, fontWeight: 800, color: amarelo,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        }}>
          {loading ? '—' : total} <span style={{ fontSize: 13, fontWeight: 500, color: T.textMuted }}>pts</span>
        </span>
      </div>
      {!loading && total === 0 && (
        <div style={{ fontSize: 11.5, color: T.textMuted, fontStyle: 'italic' }}>
          Seus pontos aparecem aqui quando você der check numa etapa da OS.
        </div>
      )}
      {!loading && total > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {Object.entries(porServico).map(([servico, pts]) => (
            <span key={servico} style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
              background: azul + '1a', color: azul,
              border: `1px solid ${azul}33`,
            }}>
              {LABEL_SERVICO[servico] || servico} · {pts}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── OSPanel — lista de OS (mobile e desktop) ─────────────────────────────────
function OSPanel({ T, dark, azul, osDoDia, escopo, loadingPainel, desktop }) {
  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 10,
      border: `1px solid ${T.border}`,
      overflow: 'hidden',
      boxShadow: T.shadow,
      marginTop: desktop ? 10 : 0,
    }}>
      {!loadingPainel && escopo === 'global' && (
        <div style={{
          padding: '8px 14px', fontSize: 11.5, color: T.textMuted,
          display: 'flex', alignItems: 'center', gap: 6,
          borderBottom: `1px solid ${T.border}`,
          background: T.cardAlt,
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
        desktop
          ? <OSRowDesktop key={os.numero} T={T} dark={dark} os={os} azul={azul} primeiro={i === 0} />
          : <OSRow key={os.numero} T={T} dark={dark} os={os} azul={azul} primeiro={i === 0} />
      ))}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Avatar({ iniciais, cor }) {
  return (
    <div style={{
      width: 46, height: 46, borderRadius: '50%', background: cor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 17, fontWeight: 800, color: '#fff',
      letterSpacing: '-0.02em', flexShrink: 0, userSelect: 'none',
    }}>
      {iniciais}
    </div>
  )
}

function Lozenge({ cor, label }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px', borderRadius: 3,
      background: cor + '1a', border: `1px solid ${cor}40`,
      fontSize: 11, fontWeight: 700, color: cor,
      whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '.02em',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cor, display: 'inline-block', flexShrink: 0,
      }} />
      {label}
    </div>
  )
}

// Label de seção no desktop — mais clean, sem linha divisora
function PanelLabel({ T, icon, label, contagem }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      marginBottom: 2,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 13, color: T.textMuted }} aria-hidden="true" />
      <span style={{
        fontSize: 11, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.07em',
      }}>
        {label}
        {contagem != null && (
          <span style={{ marginLeft: 5, fontVariantNumeric: 'tabular-nums' }}>
            ({contagem})
          </span>
        )}
      </span>
    </div>
  )
}

// Label de seção no mobile — com linha divisora
function SecLabel({ T, icon, label, contagem }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, marginBottom: -8,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12, color: T.textMuted }} aria-hidden="true" />
      <span style={{
        fontSize: 11, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap',
      }}>
        {label}
        {contagem != null && (
          <span style={{ marginLeft: 5, fontVariantNumeric: 'tabular-nums' }}>({contagem})</span>
        )}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

// OS row: desktop — mais larga, mostra etapa como lozenge
const COR_BORDA_ETAPA = {
  agendamento:            '#FFD966',
  aguardando_agendamento: '#FFD966',
  em_oficina:             '#5B9BD5',
  entrega:                '#5B9BD5',
  pagamento:              '#B8CCE4',
}
const LABEL_ETAPA = {
  agendamento: 'Agendado', aguardando_agendamento: 'Ag. agendamento',
  em_oficina: 'Em oficina', entrega: 'Entrega', pagamento: 'Pagamento',
}

function OSRowDesktop({ T, dark, os, azul, primeiro }) {
  const corBorda = COR_BORDA_ETAPA[os.etapa] || T.border
  const labelEtapa = LABEL_ETAPA[os.etapa] || os.etapa.replace(/_/g, ' ')

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '4px 52px 1fr auto auto 40px',
      alignItems: 'center', minHeight: 52,
      borderTop: primeiro ? 'none' : `1px solid ${T.border}`,
      cursor: 'pointer',
    }}
      onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ height: '100%', background: corBorda, borderRadius: '4px 0 0 4px', minHeight: 52 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px 0 10px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: azul + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11.5, fontWeight: 700, color: azul,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {String(os.numero).slice(-3)}
        </div>
      </div>

      <div style={{ minWidth: 0, padding: '10px 8px 10px 0' }}>
        <div style={{
          fontSize: 13.5, fontWeight: 600, color: corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>
          OS #{os.numero} · {os.cliente}
        </div>
        {os.hora && (
          <div style={{ fontSize: 11.5, color: azul, fontWeight: 600, marginTop: 2,
            fontVariantNumeric: 'tabular-nums' }}>
            <i className="ti ti-clock" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
            {os.hora}
          </div>
        )}
      </div>

      {/* Etapa como lozenge */}
      <div style={{
        padding: '3px 9px', borderRadius: 3,
        background: corBorda + '22', border: `1px solid ${corBorda}66`,
        fontSize: 10.5, fontWeight: 700, color: dark ? corBorda : corBorda,
        whiteSpace: 'nowrap', marginRight: 10,
      }}>
        {labelEtapa}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 14 }}>
        <i className="ti ti-chevron-right" style={{ fontSize: 14, color: T.textDim }} aria-hidden="true" />
      </div>

      {/* coluna vazia para alinhar o grid */}
      <div />
    </div>
  )
}

// OS row: mobile
function OSRow({ T, dark, os, azul, primeiro }) {
  const corBorda = COR_BORDA_ETAPA[os.etapa] || T.border

  return (
    <div style={{
      minHeight: 54,
      display: 'grid', gridTemplateColumns: '4px 48px 1fr auto',
      alignItems: 'stretch',
      borderTop: primeiro ? 'none' : `1px solid ${T.border}`,
      cursor: 'pointer',
    }}
      onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ background: corBorda, borderRadius: '4px 0 0 4px' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px 0 10px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: azul + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: azul, fontVariantNumeric: 'tabular-nums',
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
            <><span>·</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: azul }}>
              {os.hora}
            </span></>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 14 }}>
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

// KPI card isolado para desktop
function KPICard({ T, dark, label, valor, icon, cor }) {
  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 10,
      border: `1px solid ${T.border}`,
      padding: '16px 14px 14px',
      textAlign: 'center',
      boxShadow: T.shadow,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: cor + '15',
        border: `1px solid ${cor}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 10px',
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: cor }} aria-hidden="true" />
      </div>
      <div style={{
        fontSize: 24, fontWeight: 800, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        lineHeight: 1, marginBottom: 5,
      }}>
        {valor}
      </div>
      <div style={{
        fontSize: 11, color: T.textMuted, fontWeight: 600,
        letterSpacing: '.02em', lineHeight: 1.3,
      }}>
        {label}
      </div>
    </div>
  )
}

// KPI inline para mobile (dentro de um Card compartilhado)
function KPI({ T, dark, label, valor, icon, cor, separadorDireita }) {
  return (
    <div style={{
      padding: '16px 10px 14px', textAlign: 'center',
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
