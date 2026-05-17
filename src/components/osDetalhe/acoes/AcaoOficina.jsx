// src/components/osDetalhe/acoes/AcaoOficina.jsx
// Etapa Em oficina — limpeza + manutenção em paralelo.
//
// Estrutura:
//   Limpeza  : Desmontagem ↔ · Limpeza      · Montagem ↔
//   Manutenção: Desmontagem ↔ · Serviço (+ checklist do diag) · Montagem ↔
//
// Regras:
//   • Card de Limpeza só ativa se o orçamento tem algum item com "limpeza" no nome
//   • Card de Manutenção só ativa se o orçamento tem algum item que NÃO é limpeza
//   • "Desmontagem" e "Montagem" são SINCRONIZADAS entre os dois cards (é o
//     mesmo ato físico — máquina é uma só). Marcar num lado marca no outro.
//   • Montagem é BLOQUEADA cruzadamente:
//     - Pra montar do lado da Limpeza, o Serviço de Manutenção tem que estar
//       100% concluído (e vice-versa)
//     - Mensagem: "Aguardando Limpeza" ou "Aguardando Manutenção"
//   • Avançar pra Teste só libera quando ambos os lados ativos estiverem
//     concluídos e sem peças pendentes/ag.peça

import React, { useState, useMemo, useEffect } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { OS_ITENS_MOCK } from '../../../_mocks/os'
import BlocoAcao from './BlocoAcao'
import RelatorioDiagnostico, { itensMarcadosDoDiag } from '../RelatorioDiagnostico'

const STATUS_LABEL = { pendente: 'Pendente', andamento: 'Em andamento', concluido: 'Concluído' }
function deriveStatus(m, t) {
  if (t === 0) return 'pendente'
  if (m === 0) return 'pendente'
  if (m === t) return 'concluido'
  return 'andamento'
}

export default function AcaoOficina({ T, dark, os, onUpdateOS, onMoverOS, onToggleAgPeca }) {
  const cor = (d, c) => dark ? d : c
  const azul       = corEtapa('blue', dark)
  const azulClaro  = corEtapa('blueLight', dark)
  const amarelo    = corEtapa('yellow', dark)
  const verde      = corEtapa('green', dark)
  const vermelho   = corEtapa('red', dark)
  const laranja    = '#ff9800'

  // === O QUE TEM NO ORÇAMENTO ===
  // Limpeza = item com /limpeza/i no nome (Limpeza, Limpeza combinada, etc.)
  // Manutenção = qualquer outro item (peças, manutenção, mão de obra, taxa…)
  const itensOrcamento = OS_ITENS_MOCK[os.numero] || []
  const temLimpeza    = itensOrcamento.some(i => /limpeza/i.test(i.nome))
  const itensNaoLimp  = itensOrcamento.filter(i => !/limpeza/i.test(i.nome))
  const temManutencao = itensNaoLimp.length > 0
  const orcamentoVazio = itensOrcamento.length === 0
  const ambosTipos = temLimpeza && temManutencao

  // === DIAGNÓSTICO (REFERÊNCIA) — usado como checklist do "Serviço" ===
  const itensDiag = useMemo(() => itensMarcadosDoDiag(os), [os])

  // === ESTADO ===
  // 3 etapas sincronizáveis: desmontagem e montagem são compartilhadas.
  // limpeza e servico são individuais.
  const exec = os.oficina_execucao || {}
  const [desmontagem, setDesmontagem] = useState(() => !!exec.desmontagem)
  const [montagem, setMontagem]       = useState(() => !!exec.montagem)
  const [limpezaFeita, setLimpezaFeita] = useState(() => !!exec.limpeza)
  const [servicoCheck, setServicoCheck] = useState(() => exec.servico || {})
  const [pecasPendentes, setPecasPendentes] = useState(() => exec.pecas_pendentes || {})

  // Serviço da Manutenção é SEMPRE o checklist do diagnóstico
  // (mangueira troca, placa manutenção, etc). Se diagnóstico vazio mas
  // orçamento tem manutenção, mostra aviso pra completar o diagnóstico.
  const temItensDiag = itensDiag.length > 0
  const marcadosServico = itensDiag.filter(it => servicoCheck[it.key]).length
  const servicoCompleto = temManutencao && temItensDiag && marcadosServico === itensDiag.length

  // === STATUS DERIVADO POR LADO ===
  // Limpeza: 3 etapas (desmontagem, limpeza, montagem)
  // Manutenção: 3 etapas (desmontagem, serviço, montagem)
  const limpezaMarcados = (temLimpeza ? 0 : 0)
    + (temLimpeza && desmontagem ? 1 : 0)
    + (temLimpeza && limpezaFeita ? 1 : 0)
    + (temLimpeza && montagem ? 1 : 0)
  const limpezaTotal = temLimpeza ? 3 : 0
  const statusLimpeza = deriveStatus(limpezaMarcados, limpezaTotal)

  const manutMarcados = (temManutencao && desmontagem ? 1 : 0)
    + (servicoCompleto ? 1 : 0)
    + (temManutencao && montagem ? 1 : 0)
  const manutTotal = temManutencao ? 3 : 0
  const statusManut = deriveStatus(manutMarcados, manutTotal)

  // === SINCRONIZA COM A OS ===
  useEffect(() => {
    onUpdateOS?.(os.numero, {
      limpeza: temLimpeza ? statusLimpeza : null,
      manutencao: temManutencao ? statusManut : null,
      oficina_execucao: {
        desmontagem, montagem, limpeza: limpezaFeita,
        servico: servicoCheck,
        pecas_pendentes: pecasPendentes,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusLimpeza, statusManut, desmontagem, montagem, limpezaFeita,
      JSON.stringify(servicoCheck), JSON.stringify(pecasPendentes)])

  // === REGRAS DE BLOQUEIO DA MONTAGEM ===
  // Montagem só libera se O OUTRO LADO estiver com o serviço pronto.
  // Se o lado oposto não existe (ex: só limpeza), libera direto.
  const motivoBloqMontagem = (() => {
    if (!ambosTipos) return null              // só um lado → sem bloqueio cruzado
    if (!limpezaFeita) return 'Aguardando Limpeza'
    if (!servicoCompleto) return 'Aguardando Manutenção'
    return null
  })()

  // Bloqueio individual também: precisa ter feito a desmontagem antes
  const podeMontar = desmontagem && !motivoBloqMontagem

  function tentarToggleMontagem() {
    if (!desmontagem) {
      alert('Faça a desmontagem antes da montagem.')
      return
    }
    if (motivoBloqMontagem) {
      alert(`${motivoBloqMontagem} — não dá pra montar antes do outro lado terminar.`)
      return
    }
    setMontagem(v => !v)
  }

  function toggleServicoItem(key) {
    setServicoCheck(prev => ({ ...prev, [key]: !prev[key] }))
  }
  function togglePecaPendente(key) {
    setPecasPendentes(prev => {
      const novo = { ...prev, [key]: !prev[key] }
      if (novo[key]) setServicoCheck(p => ({ ...p, [key]: false }))
      return novo
    })
  }

  const algumaPecaPendente = Object.values(pecasPendentes).some(Boolean)
  const ladosOk =
    (!temLimpeza || statusLimpeza === 'concluido') &&
    (!temManutencao || statusManut === 'concluido')
  const podeAvancar = ladosOk && !os.aguardando_peca && !algumaPecaPendente && !orcamentoVazio

  function avancarEtapa() {
    if (!podeAvancar) return
    if (!window.confirm('Concluir oficina e avançar pra "Teste final"?')) return
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'teste_final')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-tool"
      etapa="Em oficina"
      descricao="Desmontagem e Montagem são compartilhadas — marcar num lado marca no outro."
    >
      {/* === AVISO: orçamento vazio === */}
      {orcamentoVazio && (
        <div style={{
          padding: '12px 14px', borderRadius: 8,
          background: cor('#2a1515', '#fde8e8'),
          border: `1px solid ${vermelho}55`,
          color: vermelho, fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16 }} aria-hidden="true" />
          Orçamento vazio — volte à etapa Orçamento e adicione itens antes de executar.
        </div>
      )}

      {/* === AVISO: falhas do teste (OS voltou pra oficina) === */}
      {(os.teste_falhas || []).length > 0 && (
        <div style={{
          padding: '11px 14px', borderRadius: 8,
          background: cor('#2a1515', '#fde8e8'),
          border: `1px solid ${vermelho}66`,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <i className="ti ti-arrow-back-up" style={{ fontSize: 18, color: vermelho, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: vermelho, marginBottom: 5 }}>
              OS voltou do Teste com {os.teste_falhas.length} {os.teste_falhas.length === 1 ? 'falha' : 'falhas'} pra corrigir:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: T.textSecondary, lineHeight: 1.5 }}>
              {os.teste_falhas.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* === RELATÓRIO COMPLETO DO DIAGNÓSTICO === */}
      {!orcamentoVazio && <RelatorioDiagnostico T={T} dark={dark} os={os} />}

      {/* === CARDS LIMPEZA + MANUTENÇÃO === */}
      {!orcamentoVazio && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* === LIMPEZA === */}
          <CardLado T={T} dark={dark} cor={cor}
            ativo={temLimpeza}
            icon="ti-bubble" titulo="Limpeza"
            status={statusLimpeza}
            marcados={limpezaMarcados} total={limpezaTotal}
            desativoLabel="Sem limpeza neste orçamento"
          >
            <CheckEtapa T={T} dark={dark} cor={cor}
              ok={desmontagem} icon="ti-screw-loose" label="Desmontagem"
              sincronizado={ambosTipos}
              onToggle={() => setDesmontagem(v => !v)}
              corAtivo={verde}
            />
            <CheckEtapa T={T} dark={dark} cor={cor}
              ok={limpezaFeita} icon="ti-bubble" label="Limpeza"
              onToggle={() => setLimpezaFeita(v => !v)}
              corAtivo={verde}
            />
            <CheckEtapa T={T} dark={dark} cor={cor}
              ok={montagem} icon="ti-tool" label="Montagem"
              sincronizado={ambosTipos}
              bloqueado={!desmontagem || !!motivoBloqMontagem}
              motivoBloq={!desmontagem ? 'Faça a desmontagem primeiro' : motivoBloqMontagem}
              onToggle={tentarToggleMontagem}
              corAtivo={verde}
            />
          </CardLado>

          {/* === MANUTENÇÃO === */}
          <CardLado T={T} dark={dark} cor={cor}
            ativo={temManutencao}
            icon="ti-tools" titulo="Manutenção"
            status={statusManut}
            marcados={manutMarcados} total={manutTotal}
            desativoLabel="Sem peças ou manutenção neste orçamento"
          >
            <CheckEtapa T={T} dark={dark} cor={cor}
              ok={desmontagem} icon="ti-screw-loose" label="Desmontagem"
              sincronizado={ambosTipos}
              onToggle={() => setDesmontagem(v => !v)}
              corAtivo={verde}
            />

            {/* Serviço — checklist dos itens do diagnóstico (mangueira troca, placa man, etc) */}
            {temItensDiag ? (
              <CheckServicoChecklist T={T} dark={dark} cor={cor}
                itens={itensDiag}
                servicoCheck={servicoCheck}
                pecasPendentes={pecasPendentes}
                onToggleItem={toggleServicoItem}
                onTogglePendente={togglePecaPendente}
                corAtivo={verde} corPendente={laranja}
                azul={azul} amarelo={amarelo}
                marcados={marcadosServico} total={itensDiag.length}
              />
            ) : (
              <div style={{
                padding: '10px 12px', borderRadius: 6,
                background: cor('#3a2200', '#fff4e0'),
                border: `1px dashed ${laranja}55`,
                fontSize: 11.5, color: laranja,
                display: 'flex', alignItems: 'flex-start', gap: 7,
              }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                <div>
                  <strong>Diagnóstico incompleto.</strong><br />
                  Volte à etapa Diagnóstico e marque os itens (peças e manutenções)
                  pra montar o checklist do serviço.
                </div>
              </div>
            )}

            <CheckEtapa T={T} dark={dark} cor={cor}
              ok={montagem} icon="ti-tool" label="Montagem"
              sincronizado={ambosTipos}
              bloqueado={!desmontagem || !!motivoBloqMontagem}
              motivoBloq={!desmontagem ? 'Faça a desmontagem primeiro' : motivoBloqMontagem}
              onToggle={tentarToggleMontagem}
              corAtivo={verde}
            />
          </CardLado>
        </div>
      )}

      {/* === STATUS COMBINADO === */}
      {!orcamentoVazio && (
        <div style={{
          padding: '10px 12px',
          background: ladosOk ? cor('#0f2a15', '#e8f5ec') : T.cardAlt,
          border: `1px solid ${(ladosOk ? verde : T.border)}55`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {temLimpeza && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textSecondary }}>
                <i className="ti ti-bubble" style={{ fontSize: 13, color: verde }} aria-hidden="true" />
                Limpeza: <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{limpezaMarcados}/{limpezaTotal}</strong>
              </span>
            )}
            {temLimpeza && temManutencao && <span style={{ color: T.border }}>·</span>}
            {temManutencao && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textSecondary }}>
                <i className="ti ti-tools" style={{ fontSize: 13, color: amarelo }} aria-hidden="true" />
                Manutenção: <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{manutMarcados}/{manutTotal}</strong>
              </span>
            )}
          </div>
          {ladosOk && (
            <span style={{ color: verde, fontWeight: 700, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 14 }} aria-hidden="true" />
              Pronto pra teste
            </span>
          )}
        </div>
      )}

      {/* === AGUARDANDO PEÇA === */}
      {!orcamentoVazio && (
        <button onClick={onToggleAgPeca} style={{
          padding: '10px 12px', borderRadius: 7,
          border: `1px solid ${os.aguardando_peca ? laranja : T.border}`,
          background: os.aguardando_peca ? cor('#3a2200', '#fff4e0') : T.bg,
          color: os.aguardando_peca ? laranja : T.textSecondary,
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <i className={`ti ${os.aguardando_peca ? 'ti-package' : 'ti-package-off'}`}
               style={{ fontSize: 15 }} aria-hidden="true" />
            {os.aguardando_peca ? 'OS marcada como aguardando peça' : 'Marcar OS como aguardando peça'}
          </span>
          <span style={{ fontSize: 10.5, color: os.aguardando_peca ? laranja : T.textDim, fontWeight: 500 }}>
            {os.aguardando_peca ? 'clique pra desmarcar' : 'opcional'}
          </span>
        </button>
      )}

      {algumaPecaPendente && !os.aguardando_peca && (
        <div style={{
          padding: '8px 12px',
          background: cor('#3a2200', '#fff4e0'),
          border: `1px dashed ${laranja}66`,
          borderRadius: 7, fontSize: 11.5, color: laranja,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />
          {Object.values(pecasPendentes).filter(Boolean).length}{' '}
          {Object.values(pecasPendentes).filter(Boolean).length === 1 ? 'peça pendente' : 'peças pendentes'} —
          considere marcar a OS como aguardando peça acima.
        </div>
      )}

      {/* === AVANÇAR === */}
      {!orcamentoVazio && (
        <button onClick={avancarEtapa} disabled={!podeAvancar}
          title={
            podeAvancar ? 'Avança pra Teste final'
            : !ladosOk ? 'Conclua os dois lados primeiro'
            : os.aguardando_peca ? 'Desmarque "aguardando peça" antes'
            : 'Resolva peças pendentes'
          }
          style={{
            padding: '12px 16px', borderRadius: 8, border: 'none',
            background: podeAvancar ? `linear-gradient(135deg, ${amarelo}, ${amarelo}dd)` : T.cardAlt,
            color: podeAvancar ? '#0a0a0d' : T.textDim,
            fontSize: 13, fontWeight: 700,
            cursor: podeAvancar ? 'pointer' : 'not-allowed',
            opacity: podeAvancar ? 1 : 0.55,
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: podeAvancar ? `0 2px 8px ${amarelo}44` : 'none',
          }}>
          {podeAvancar
            ? <><i className="ti ti-arrow-right" style={{ fontSize: 17 }} aria-hidden="true" />Concluir oficina · ir pra Teste final</>
            : <><i className="ti ti-lock" style={{ fontSize: 15 }} aria-hidden="true" />
                {!ladosOk
                  ? (motivoBloqMontagem || 'Conclua os dois lados primeiro')
                  : os.aguardando_peca ? 'Desmarque "aguardando peça"'
                  : 'Resolva peças pendentes'}
              </>
          }
        </button>
      )}
    </BlocoAcao>
  )
}

// ─── Card de um lado (Limpeza ou Manutenção) ────────────────────────────────
function CardLado({ T, dark, cor, ativo, icon, titulo, status, marcados, total, desativoLabel, children }) {
  const verde   = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  const corStatus = status === 'concluido' ? verde : status === 'andamento' ? amarelo : T.textMuted
  const bgStatus  = !ativo ? cor('rgba(255,255,255,0.02)', 'rgba(0,0,0,0.02)')
                  : status === 'concluido' ? cor('#0f2a15', '#e8f5ec')
                  : status === 'andamento' ? cor('#2a2000', '#fdf6dc')
                  : T.cardAlt
  const borderColor = !ativo ? T.border : corStatus + '44'

  if (!ativo) {
    return (
      <div style={{
        background: bgStatus, border: `1px dashed ${borderColor}`,
        borderRadius: 9, padding: '14px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: 8, minHeight: 180,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 24, color: T.textDim, opacity: 0.5 }} aria-hidden="true" />
        <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>{titulo}</div>
        <div style={{ fontSize: 11, color: T.textDim, fontStyle: 'italic', lineHeight: 1.4 }}>
          {desativoLabel}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: bgStatus, border: `1px solid ${borderColor}`,
      borderRadius: 9, padding: '12px 12px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16, color: corStatus, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{titulo}</span>
        </div>
        <span style={{
          fontSize: 10, color: corStatus, fontWeight: 700,
          padding: '2px 7px', borderRadius: 10,
          background: corStatus + '22', border: `1px solid ${corStatus}33`,
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>
          {marcados}/{total}
        </span>
      </div>
      <div style={{
        fontSize: 10, color: corStatus, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.4px',
      }}>
        {STATUS_LABEL[status]}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Etapa simples (Desmontagem / Limpeza / Montagem / Serviço simples) ─────
function CheckEtapa({ T, dark, cor, ok, icon, label, sincronizado, bloqueado, motivoBloq, onToggle, corAtivo }) {
  return (
    <button onClick={onToggle}
      disabled={bloqueado && !ok}
      title={bloqueado && !ok ? motivoBloq : ''}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 8px', borderRadius: 6,
        background: bloqueado && !ok
          ? cor('rgba(255,255,255,0.02)', 'rgba(0,0,0,0.025)')
          : ok ? cor(`${corAtivo}18`, `${corAtivo}12`) : 'transparent',
        border: `1px solid ${ok ? corAtivo + '33' : bloqueado && !ok ? T.border : 'transparent'}`,
        color: bloqueado && !ok ? T.textDim
              : ok ? T.textPrimary : T.textSecondary,
        fontSize: 12, fontWeight: ok ? 600 : 500,
        cursor: bloqueado && !ok ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left', width: '100%',
        transition: 'all .12s',
        opacity: bloqueado && !ok ? 0.75 : 1,
      }}>
      <i className={`ti ${
        bloqueado && !ok ? 'ti-lock'
        : ok ? 'ti-square-check-filled'
        : 'ti-square'
      }`} style={{
        fontSize: 16, flexShrink: 0,
        color: ok ? corAtivo : bloqueado && !ok ? T.textDim : T.textDim,
      }} aria-hidden="true" />
      <i className={`ti ${icon}`} style={{ fontSize: 12, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
      <span style={{
        flex: 1, lineHeight: 1.3,
        textDecoration: ok ? 'line-through' : 'none',
        textDecorationColor: corAtivo + '88',
      }}>
        {label}
      </span>
      {sincronizado && (
        <i className="ti ti-arrows-left-right"
           title="Sincronizado com o outro lado"
           style={{ fontSize: 11, color: T.textDim, opacity: 0.6, flexShrink: 0 }} aria-hidden="true" />
      )}
      {bloqueado && !ok && motivoBloq && (
        <span style={{
          fontSize: 9, fontWeight: 700, color: T.textMuted,
          padding: '1px 5px', borderRadius: 6,
          background: cor('rgba(255,255,255,0.04)', 'rgba(0,0,0,0.04)'),
          textTransform: 'uppercase', letterSpacing: '.2px', flexShrink: 0,
          maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {motivoBloq}
        </span>
      )}
    </button>
  )
}

// ─── Etapa "Serviço" da manutenção com sub-checklist do diagnóstico ─────────
function CheckServicoChecklist({ T, dark, cor, itens, servicoCheck, pecasPendentes, onToggleItem, onTogglePendente, corAtivo, corPendente, azul, amarelo, marcados, total }) {
  const completo = marcados === total

  return (
    <div style={{
      borderRadius: 6,
      background: completo ? cor(`${corAtivo}18`, `${corAtivo}12`) : T.bg,
      border: `1px solid ${completo ? corAtivo + '33' : T.border}`,
      padding: '6px 8px 4px',
    }}>
      {/* Header do "Serviço" */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '2px 0 6px',
      }}>
        <i className={`ti ${completo ? 'ti-square-check-filled' : 'ti-square'}`}
           style={{ fontSize: 16, color: completo ? corAtivo : T.textDim, flexShrink: 0 }} aria-hidden="true" />
        <i className="ti ti-tools" style={{ fontSize: 12, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
        <span style={{
          flex: 1, fontSize: 12, fontWeight: completo ? 600 : 500,
          color: completo ? T.textPrimary : T.textSecondary,
          textDecoration: completo ? 'line-through' : 'none',
          textDecorationColor: corAtivo + '88',
        }}>
          Serviço
        </span>
        <span style={{
          fontSize: 9.5, fontWeight: 700, color: completo ? corAtivo : T.textMuted,
          padding: '1px 6px', borderRadius: 8,
          background: completo ? corAtivo + '22' : cor('rgba(255,255,255,0.04)', 'rgba(0,0,0,0.04)'),
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>
          {marcados}/{total}
        </span>
      </div>

      {/* Sub-itens */}
      <div style={{
        paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 2,
        borderLeft: `1px dashed ${T.border}`, marginLeft: 7, marginTop: 2,
      }}>
        {itens.map(it => {
          const ok = !!servicoCheck[it.key]
          const pendente = !!pecasPendentes[it.key]
          const tipoCor = it.tipo === 'troca' ? azul : amarelo
          const tipoIcon = it.tipo === 'troca' ? 'ti-replace' : 'ti-wrench'
          const tipoLabel = it.tipo === 'troca' ? 'troca' : 'man'

          return (
            <div key={it.key} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 6px', borderRadius: 5,
              background: ok ? cor(`${corAtivo}10`, `${corAtivo}08`)
                       : pendente ? cor(`${corPendente}14`, `${corPendente}10`)
                       : 'transparent',
              border: `1px solid ${
                ok ? corAtivo + '22'
                : pendente ? corPendente + '33'
                : 'transparent'
              }`,
            }}>
              <button onClick={() => onToggleItem(it.key)}
                disabled={pendente}
                title={pendente ? 'Desmarcar "ag. peça" antes' : ok ? 'Desmarcar' : 'Marcar como feito'}
                style={{
                  background: 'transparent', border: 'none',
                  cursor: pendente ? 'not-allowed' : 'pointer',
                  padding: 0, flexShrink: 0, display: 'flex',
                  opacity: pendente ? 0.4 : 1,
                }}>
                <i className={`ti ${ok ? 'ti-square-check-filled' : 'ti-square'}`}
                   style={{ fontSize: 13, color: ok ? corAtivo : T.textDim }} aria-hidden="true" />
              </button>

              <i className={`ti ${tipoIcon}`}
                 style={{ fontSize: 10.5, color: tipoCor, flexShrink: 0 }} aria-hidden="true" />

              <span style={{
                flex: 1, fontSize: 10.5, lineHeight: 1.25,
                color: ok ? T.textPrimary : pendente ? corPendente : T.textSecondary,
                fontWeight: ok ? 600 : 500,
                textDecoration: ok ? 'line-through' : 'none',
                textDecorationColor: corAtivo + '88',
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {it.label}
              </span>

              <span style={{
                fontSize: 8, fontWeight: 700, color: tipoCor,
                padding: '1px 4px', borderRadius: 4,
                background: tipoCor + '22', border: `1px solid ${tipoCor}33`,
                textTransform: 'uppercase', letterSpacing: '.2px', flexShrink: 0,
              }}>
                {tipoLabel}
              </span>

              {it.tipo === 'troca' && (
                <button onClick={() => onTogglePendente(it.key)}
                  title={pendente ? 'Peça chegou' : 'Marcar como ag. peça'}
                  style={{
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', padding: 1, flexShrink: 0,
                    color: pendente ? corPendente : T.textDim, display: 'flex',
                  }}>
                  <i className={`ti ${pendente ? 'ti-package' : 'ti-package-off'}`}
                     style={{ fontSize: 11 }} aria-hidden="true" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
