// src/components/osDetalhe/acoes/AcaoOficina.jsx
// Etapa Em oficina — limpeza + manutenção rodam em paralelo.
// O técnico tem 2 checklists ativos:
//   - Limpeza: 6 passos típicos (desmontar/lavar/escovar/enxaguar/secar/remontar)
//   - Manutenção: lista de itens vindos do checklist do Diagnóstico (troca + man)
// Status (pendente/andamento/concluido) é DERIVADO dos checks marcados,
// sincronizado em os.limpeza e os.manutencao via onUpdateOS.
//
// Avançar pra Teste final só libera quando ambos concluídos E não há
// aguardando peça.

import React, { useState, useMemo, useEffect } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS, funcPorId } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import BlocoAcao from './BlocoAcao'

// === Labels do checklist do diagnóstico (espelha AcaoDiagnostico) ============
const ITENS_DIAG = {
  motor_principal: 'Motor principal', correia: 'Correia', polia_motor: 'Polia do motor',
  mecanismo: 'Mecanismo', embreagem: 'Embreagem', polia_mecanismo: 'Polia do mecanismo',
  catraca: 'Catraca / engaste', rolamentos_cesto: 'Rolamentos do cesto',
  rolamento_eixo: 'Rolamento do eixo', rolamentos_motor: 'Rolamentos do motor',
  bomba_drenagem: 'Bomba de drenagem', valvula_entrada: 'Válvula de entrada',
  mangueira_entrada: 'Mangueira de entrada', mangueira_saida: 'Mangueira de saída',
  mangueira_interna: 'Mangueira interna', pressostato: 'Pressostato',
  borracha_porta: 'Borracha da porta', placa_potencia: 'Placa de potência',
  placa_interface: 'Placa interface', timer_mecanico: 'Timer mecânico',
  capacitor: 'Capacitor', sensor_temperatura: 'Sensor de temperatura',
  sensor_tampa: 'Sensor da tampa', trava_porta: 'Trava da porta',
  cesto: 'Cesto', agitador: 'Agitador', suporte_cesto: 'Suporte do cesto',
  suspensao: 'Suspensão', tirantes: 'Tirantes da suspensão', pe_nivelador: 'Pé nivelador',
}

// Passos padrão da limpeza
const PASSOS_LIMPEZA = [
  { id: 'desmontar',  label: 'Desmontar gabinete e cesto', icon: 'ti-screw-loose' },
  { id: 'lavar',      label: 'Lavar peças com detergente', icon: 'ti-bubble' },
  { id: 'escovar',    label: 'Escovar incrustações',       icon: 'ti-brush' },
  { id: 'enxaguar',   label: 'Enxaguar e remover sabão',   icon: 'ti-droplet' },
  { id: 'secar',      label: 'Secar e inspecionar',        icon: 'ti-wind' },
  { id: 'remontar',   label: 'Remontar pra teste',         icon: 'ti-tool' },
]

// Derivação de status a partir dos checks
function deriveStatus(marcados, total) {
  if (total === 0) return 'pendente'
  if (marcados === 0) return 'pendente'
  if (marcados === total) return 'concluido'
  return 'andamento'
}

const STATUS_LABEL = { pendente: 'Pendente', andamento: 'Em andamento', concluido: 'Concluído' }

export default function AcaoOficina({ T, dark, os, onUpdateOS, onMoverOS, onToggleAgPeca }) {
  const cor = (d, c) => dark ? d : c
  const azul       = corEtapa('blue', dark)
  const azulClaro  = corEtapa('blueLight', dark)
  const amarelo    = corEtapa('yellow', dark)
  const verde      = corEtapa('green', dark)
  const vermelho   = corEtapa('red', dark)
  const laranja    = '#ff9800'  // ag. peça — única cor especial fora da paleta padrão

  // === Diagnóstico (referência) ===
  const diag = os.diagnostico || {}
  const causa = diag.causa || ''
  const checklistDiag = diag.checklist || {}
  const itensDiag = useMemo(() => {
    return Object.entries(checklistDiag)
      .filter(([, v]) => v?.man || v?.troca)
      .flatMap(([id, v]) => {
        const label = ITENS_DIAG[id] || id
        const out = []
        if (v.troca) out.push({ key: id + '-troca', baseId: id, label, tipo: 'troca' })
        if (v.man)   out.push({ key: id + '-man',   baseId: id, label, tipo: 'man' })
        return out
      })
  }, [checklistDiag])

  // === Estado local: checklists de execução ===
  // Carrega de os.oficina_execucao se já tiver (futuro Supabase) ou inicia vazio.
  const exec = os.oficina_execucao || {}
  const [limpezaCheck, setLimpezaCheck] = useState(() => exec.limpeza || {})
  const [manutCheck,   setManutCheck]   = useState(() => exec.manutencao || {})
  const [pecasPendentes, setPecasPendentes] = useState(() => exec.pecas_pendentes || {})

  const marcadosLimp = PASSOS_LIMPEZA.filter(p => limpezaCheck[p.id]).length
  const marcadosMan  = itensDiag.filter(it => manutCheck[it.key]).length

  const statusLimpeza   = deriveStatus(marcadosLimp, PASSOS_LIMPEZA.length)
  const statusManut     = deriveStatus(marcadosMan,  itensDiag.length)

  // Sincroniza status derivado com a OS sempre que mudar
  useEffect(() => {
    if (os.limpeza !== statusLimpeza || os.manutencao !== statusManut) {
      onUpdateOS?.(os.numero, {
        limpeza: statusLimpeza,
        manutencao: statusManut,
        oficina_execucao: {
          limpeza: limpezaCheck,
          manutencao: manutCheck,
          pecas_pendentes: pecasPendentes,
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusLimpeza, statusManut])

  // Há itens marcados como "aguardando peça"
  const algumaPecaPendente = Object.values(pecasPendentes).some(Boolean)
  const ambosConcluidos = statusLimpeza === 'concluido' && statusManut === 'concluido'
  const podeAvancar = ambosConcluidos && !os.aguardando_peca && !algumaPecaPendente

  // Quem fez o diagnóstico
  const regDiag = [...(os.historico || [])].reverse().find(h => h.etapa === 'diagnostico')
  const funcDiag = regDiag && funcPorId(regDiag.funcionario)

  function toggleLimp(id) {
    setLimpezaCheck(prev => ({ ...prev, [id]: !prev[id] }))
  }
  function toggleMan(key) {
    setManutCheck(prev => ({ ...prev, [key]: !prev[key] }))
  }
  function togglePecaPendente(key) {
    setPecasPendentes(prev => {
      const novo = { ...prev, [key]: !prev[key] }
      // Se marcar como pendente, desmarca check
      if (novo[key]) {
        setManutCheck(p => ({ ...p, [key]: false }))
      }
      return novo
    })
  }
  function marcarTodosLimp() {
    setLimpezaCheck(Object.fromEntries(PASSOS_LIMPEZA.map(p => [p.id, true])))
  }
  function limparTodosLimp() {
    setLimpezaCheck({})
  }
  function marcarTodosMan() {
    setManutCheck(Object.fromEntries(itensDiag.map(it => [it.key, true])))
    setPecasPendentes({})
  }
  function limparTodosMan() {
    setManutCheck({})
  }

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
      descricao="Limpeza e manutenção rodam em paralelo. Marca cada passo conforme executa — status atualiza sozinho."
    >
      {/* === RESUMO DO DIAGNÓSTICO === */}
      {(causa || itensDiag.length > 0) && (
        <div style={{
          padding: '10px 12px',
          background: cor('rgba(184,204,228,0.06)', 'rgba(26,106,170,0.06)'),
          border: `1px solid ${azulClaro}44`,
          borderRadius: 8,
          fontSize: 12, color: T.textSecondary,
        }}>
          <div style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 700,
            marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.3px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-stethoscope" style={{ fontSize: 12 }} aria-hidden="true" />
              Diagnóstico (referência)
            </span>
            {funcDiag && (
              <span style={{
                fontSize: 9.5, color: funcDiag.cor, fontWeight: 700,
                padding: '1px 6px', borderRadius: 8,
                background: funcDiag.cor + '22', border: `1px solid ${funcDiag.cor}33`,
              }}>
                {funcDiag.apelido}
              </span>
            )}
          </div>
          {causa && (
            <div style={{ marginBottom: itensDiag.length > 0 ? 4 : 0 }}>
              <strong style={{ color: T.textMuted, fontSize: 11 }}>Causa:</strong> {causa}
            </div>
          )}
          {itensDiag.length > 0 && (
            <div style={{ fontSize: 11, color: T.textMuted }}>
              {itensDiag.filter(i => i.tipo === 'troca').length} {' '}
              <i className="ti ti-replace" style={{ fontSize: 11, color: azul, verticalAlign: 'middle' }} aria-hidden="true" />
              {' '}trocas · {itensDiag.filter(i => i.tipo === 'man').length}{' '}
              <i className="ti ti-wrench" style={{ fontSize: 11, color: amarelo, verticalAlign: 'middle' }} aria-hidden="true" />
              {' '}manutenções marcadas
            </div>
          )}
        </div>
      )}

      {/* === CHECKLIST 2 COLUNAS === */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Limpeza */}
        <CardChecklist
          T={T} dark={dark} cor={cor}
          icon="ti-bubble" titulo="Limpeza"
          status={statusLimpeza}
          marcados={marcadosLimp} total={PASSOS_LIMPEZA.length}
          onMarcarTodos={marcarTodosLimp}
          onLimpar={limparTodosLimp}
        >
          {PASSOS_LIMPEZA.map(p => {
            const ok = !!limpezaCheck[p.id]
            return (
              <CheckItem key={p.id} T={T} dark={dark} cor={cor}
                ok={ok} icon={p.icon} label={p.label}
                onToggle={() => toggleLimp(p.id)}
                corAtivo={verde}
              />
            )
          })}
        </CardChecklist>

        {/* Manutenção */}
        <CardChecklist
          T={T} dark={dark} cor={cor}
          icon="ti-tools" titulo="Manutenção"
          status={statusManut}
          marcados={marcadosMan} total={itensDiag.length}
          onMarcarTodos={itensDiag.length > 0 ? marcarTodosMan : null}
          onLimpar={itensDiag.length > 0 ? limparTodosMan : null}
        >
          {itensDiag.length === 0 ? (
            <div style={{
              padding: '14px 10px', textAlign: 'center',
              fontSize: 11, color: T.textMuted, fontStyle: 'italic',
            }}>
              Nenhum item marcado no diagnóstico.<br/>
              Volte e complete o checklist técnico.
            </div>
          ) : itensDiag.map(it => {
            const ok = !!manutCheck[it.key]
            const pendente = !!pecasPendentes[it.key]
            return (
              <CheckItemManut key={it.key}
                T={T} dark={dark} cor={cor}
                item={it}
                ok={ok} pendente={pendente}
                onToggle={() => toggleMan(it.key)}
                onTogglePendente={() => togglePecaPendente(it.key)}
                corAtivo={verde}
                corPendente={laranja}
                azul={azul} amarelo={amarelo}
              />
            )
          })}
        </CardChecklist>
      </div>

      {/* === STATUS COMBINADO === */}
      <div style={{
        padding: '10px 12px',
        background: ambosConcluidos
          ? cor('#0f2a15', '#e8f5ec')
          : T.cardAlt,
        border: `1px solid ${(ambosConcluidos ? verde : T.border)}55`,
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        fontSize: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textSecondary }}>
            <i className="ti ti-bubble" style={{ fontSize: 13, color: verde }} aria-hidden="true" />
            Limpeza: <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{marcadosLimp}/{PASSOS_LIMPEZA.length}</strong>
          </span>
          <span style={{ color: T.border }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textSecondary }}>
            <i className="ti ti-tools" style={{ fontSize: 13, color: amarelo }} aria-hidden="true" />
            Manutenção: <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{marcadosMan}/{itensDiag.length || 0}</strong>
          </span>
        </div>
        {ambosConcluidos && (
          <span style={{ color: verde, fontWeight: 700, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 14 }} aria-hidden="true" />
            Pronto pra teste
          </span>
        )}
      </div>

      {/* === AGUARDANDO PEÇA === */}
      <button
        onClick={onToggleAgPeca}
        style={{
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

      {algumaPecaPendente && !os.aguardando_peca && (
        <div style={{
          padding: '8px 12px',
          background: cor('#3a2200', '#fff4e0'),
          border: `1px dashed ${laranja}66`,
          borderRadius: 7,
          fontSize: 11.5, color: laranja,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />
          {Object.values(pecasPendentes).filter(Boolean).length}{' '}
          {Object.values(pecasPendentes).filter(Boolean).length === 1 ? 'peça pendente' : 'peças pendentes'} —
          considere marcar a OS como aguardando peça acima.
        </div>
      )}

      {/* === AVANÇAR === */}
      <button
        onClick={avancarEtapa}
        disabled={!podeAvancar}
        title={
          podeAvancar ? 'Avança pra Teste final'
          : !ambosConcluidos ? 'Conclua Limpeza e Manutenção antes'
          : 'Desmarque "aguardando peça" antes de avançar'
        }
        style={{
          padding: '12px 16px', borderRadius: 8, border: 'none',
          background: podeAvancar
            ? `linear-gradient(135deg, ${amarelo}, ${amarelo}dd)`
            : T.cardAlt,
          color: podeAvancar ? '#0a0a0d' : T.textDim,
          fontSize: 13, fontWeight: 700,
          cursor: podeAvancar ? 'pointer' : 'not-allowed',
          opacity: podeAvancar ? 1 : 0.55,
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          boxShadow: podeAvancar ? `0 2px 8px ${amarelo}44` : 'none',
        }}>
        {podeAvancar ? (
          <>
            <i className="ti ti-arrow-right" style={{ fontSize: 17 }} aria-hidden="true" />
            Concluir oficina · ir pra Teste final
          </>
        ) : (
          <>
            <i className="ti ti-lock" style={{ fontSize: 15 }} aria-hidden="true" />
            {!ambosConcluidos
              ? 'Conclua Limpeza e Manutenção'
              : 'Resolva peças pendentes'}
          </>
        )}
      </button>
    </BlocoAcao>
  )
}

// ─── Card que contém um checklist (Limpeza ou Manutenção) ───────────────────
function CardChecklist({ T, dark, cor, icon, titulo, status, marcados, total, onMarcarTodos, onLimpar, children }) {
  const verde   = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  const corStatus = status === 'concluido' ? verde : status === 'andamento' ? amarelo : T.textMuted
  const bgStatus  = status === 'concluido' ? cor('#0f2a15', '#e8f5ec')
                  : status === 'andamento' ? cor('#2a2000', '#fdf6dc')
                  : T.cardAlt

  return (
    <div style={{
      background: bgStatus,
      border: `1px solid ${corStatus}44`,
      borderRadius: 9, padding: '12px 12px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16, color: corStatus, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{titulo}</span>
        </div>
        <span style={{
          fontSize: 10, color: corStatus, fontWeight: 700,
          padding: '2px 7px', borderRadius: 10,
          background: corStatus + '22', border: `1px solid ${corStatus}33`,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}>
          {marcados}/{total || 0}
        </span>
      </div>

      {/* Status label */}
      <div style={{
        fontSize: 10, color: corStatus, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.4px',
      }}>
        {STATUS_LABEL[status]}
      </div>

      {/* Lista de itens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>

      {/* Atalhos */}
      {(onMarcarTodos || onLimpar) && (
        <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
          {onMarcarTodos && (
            <button onClick={onMarcarTodos} style={miniBtn(T, dark)}>
              <i className="ti ti-checks" style={{ fontSize: 11 }} aria-hidden="true" />
              Marcar todos
            </button>
          )}
          {onLimpar && marcados > 0 && (
            <button onClick={onLimpar} style={miniBtn(T, dark)}>
              <i className="ti ti-rotate" style={{ fontSize: 11 }} aria-hidden="true" />
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Item simples de checklist (Limpeza) ────────────────────────────────────
function CheckItem({ T, dark, cor, ok, icon, label, onToggle, corAtivo }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '6px 8px', borderRadius: 6,
      background: ok ? cor(`${corAtivo}18`, `${corAtivo}12`) : 'transparent',
      border: `1px solid ${ok ? corAtivo + '33' : 'transparent'}`,
      color: ok ? T.textPrimary : T.textSecondary,
      fontSize: 11.5, fontWeight: ok ? 600 : 500,
      cursor: 'pointer', fontFamily: 'inherit',
      textAlign: 'left', width: '100%',
      transition: 'all .12s',
    }}
      onMouseEnter={e => { if (!ok) e.currentTarget.style.background = T.bg }}
      onMouseLeave={e => { if (!ok) e.currentTarget.style.background = 'transparent' }}
    >
      <i className={`ti ${ok ? 'ti-square-check-filled' : 'ti-square'}`}
         style={{ fontSize: 16, color: ok ? corAtivo : T.textDim, flexShrink: 0 }} aria-hidden="true" />
      <i className={`ti ${icon}`} style={{ fontSize: 12, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
      <span style={{
        flex: 1, lineHeight: 1.3,
        textDecoration: ok ? 'line-through' : 'none',
        textDecorationColor: corAtivo + '88',
      }}>
        {label}
      </span>
    </button>
  )
}

// ─── Item de manutenção (com toggle "ag. peça") ─────────────────────────────
function CheckItemManut({ T, dark, cor, item, ok, pendente, onToggle, onTogglePendente, corAtivo, corPendente, azul, amarelo }) {
  const tipoCor = item.tipo === 'troca' ? azul : amarelo
  const tipoIcon = item.tipo === 'troca' ? 'ti-replace' : 'ti-wrench'
  const tipoLabel = item.tipo === 'troca' ? 'troca' : 'man'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 8px', borderRadius: 6,
      background: ok ? cor(`${corAtivo}18`, `${corAtivo}12`)
                : pendente ? cor(`${corPendente}18`, `${corPendente}14`)
                : 'transparent',
      border: `1px solid ${
        ok ? corAtivo + '33'
        : pendente ? corPendente + '44'
        : 'transparent'
      }`,
    }}>
      {/* Check principal */}
      <button onClick={onToggle}
        disabled={pendente}
        title={pendente ? 'Desmarcar "ag. peça" antes' : ok ? 'Desmarcar' : 'Marcar como executado'}
        style={{
          background: 'transparent', border: 'none',
          cursor: pendente ? 'not-allowed' : 'pointer',
          padding: 0, flexShrink: 0, display: 'flex',
          opacity: pendente ? 0.4 : 1,
        }}>
        <i className={`ti ${ok ? 'ti-square-check-filled' : 'ti-square'}`}
           style={{ fontSize: 16, color: ok ? corAtivo : T.textDim }} aria-hidden="true" />
      </button>

      <i className={`ti ${tipoIcon}`} style={{ fontSize: 12, color: tipoCor, flexShrink: 0 }} aria-hidden="true" />

      <span style={{
        flex: 1, fontSize: 11.5, lineHeight: 1.3,
        color: ok ? T.textPrimary : pendente ? corPendente : T.textSecondary,
        fontWeight: ok ? 600 : 500,
        textDecoration: ok ? 'line-through' : 'none',
        textDecorationColor: corAtivo + '88',
        minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.label}
      </span>

      {/* Mini-tag tipo */}
      <span style={{
        fontSize: 9, fontWeight: 700, color: tipoCor,
        padding: '1px 5px', borderRadius: 6,
        background: tipoCor + '22', border: `1px solid ${tipoCor}33`,
        textTransform: 'uppercase', letterSpacing: '.2px', flexShrink: 0,
      }}>
        {tipoLabel}
      </span>

      {/* Toggle "ag. peça" — só faz sentido pra trocas */}
      {item.tipo === 'troca' && (
        <button onClick={onTogglePendente}
          title={pendente ? 'Peça chegou — pode marcar como feito' : 'Marcar como aguardando peça'}
          style={{
            background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 2, flexShrink: 0,
            color: pendente ? corPendente : T.textDim,
            display: 'flex',
          }}>
          <i className={`ti ${pendente ? 'ti-package' : 'ti-package-off'}`}
             style={{ fontSize: 13 }} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function miniBtn(T, dark) {
  return {
    flex: 1,
    padding: '5px 8px', borderRadius: 5,
    background: 'transparent', border: `1px solid ${T.border}`,
    color: T.textMuted,
    fontSize: 10.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  }
}
