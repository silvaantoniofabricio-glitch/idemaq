// src/components/osDetalhe/acoes/AcaoTeste.jsx
// Etapa Teste final — padrao V2 SubBloco (mesmo Diagnostico/Orcamento/Conserto).
//
// Regras:
// - 4 testes (Entrada/Saida/Agitacao/Centrifugacao): OK / Defeito / Barulho
// - Acabamento (3): Secagem · Polimento · Enceramento → só se OS tem Limpeza
// - Aprovar libera quando TODOS testes preenchidos + (se aplicável) TODOS
//   acabamento marcados
// - Voltar pra oficina aparece quando há defeito/barulho — leva as falhas
//   pro banner do AcaoOficina via useFalhaTeste.

import React, { useState, useEffect, useMemo } from 'react'
import { useTheme } from '../../../theme'
import {
  TI, BtnMobile, PALETA, Pill,
} from '../../_shared/PrimitivasMobile'
import { HIGSubBloco as _HIGSubBloco } from '../../_shared/HIGPrimitives'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useFalhaTeste } from '../../../hooks/useFalhaTeste'
import { useOSItens } from '../../../hooks/useOSItens'
import { CATEGORIA_POR_ID } from '../../../utils/categoriasPeca'

const TESTES = [
  { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'droplet' },
  { id: 'saida_agua',    label: 'Saída de água',    icon: 'droplet-off' },
  { id: 'agitacao',      label: 'Agitação',         icon: 'refresh' },
  { id: 'centrifugacao', label: 'Centrifugação',    icon: 'rotate-clockwise' },
]

const ACABAMENTO = [
  { id: 'secagem',     label: 'Secagem',     icon: 'wind' },
  { id: 'polimento',   label: 'Polimento',   icon: 'sparkles' },
  { id: 'enceramento', label: 'Enceramento', icon: 'droplet-half-2' },
]

const RESULTADO_THEMES = {
  ok:      { icon: 'check',          label: 'OK',      bgLight: PALETA.greenBg,  bgDark: 'rgba(46,125,94,0.22)',   fg: PALETA.greenStrong,  bd: '#7DC09F' },
  defeito: { icon: 'alert-triangle', label: 'Defeito', bgLight: PALETA.redBg,    bgDark: 'rgba(192,66,66,0.22)',   fg: PALETA.redStrong,    bd: '#E89B9B' },
  barulho: { icon: 'volume',         label: 'Barulho', bgLight: PALETA.yellowBg, bgDark: 'rgba(255,217,102,0.20)', fg: PALETA.yellowStrong, bd: '#E5BD3E' },
}

// ─── SubBloco compacto (mesmo padrao V2 das outras etapas) ────────────────
function SubBloco(props) {
  return <_HIGSubBloco {...props} />;
}
// ─── Resumo do diagnostico (mesmo bloco usado em Orcamento/Conserto) ──────
function ResumoDiagnostico({ T, dark, os }) {
  const relato = os?.defeito || ''
  const causa = os?.pre_diagnostico?.causa_diagnostico || ''
  const marcados = os?.pre_diagnostico?.componentes_marcados || {}
  const chips = []
  for (const [, itens] of Object.entries(marcados)) {
    if (!itens || typeof itens !== 'object') continue
    const pares = Array.isArray(itens)
      ? itens.map(id => [id, 'troca'])
      : Object.entries(itens)
    for (const [itemId, acao] of pares) {
      const cat = CATEGORIA_POR_ID[itemId]
      chips.push({ id: itemId, label: cat?.label || itemId, acao })
    }
  }
  if (!relato && !causa && chips.length === 0) return null

  const SubLabel = ({ children }) => (
    <div style={{
      fontSize: 10, fontWeight: 700, color: T.textMuted,
      textTransform: 'uppercase', letterSpacing: '.05em',
      marginBottom: 3,
    }}>{children}</div>
  )
  const corBadge = (acao) => acao === 'manutencao'
    ? { fg: PALETA.yellowStrong, bg: dark ? 'rgba(255,217,102,0.18)' : '#FFF7DC', label: 'MANUT.' }
    : { fg: PALETA.redStrong,    bg: dark ? 'rgba(192,66,66,0.18)'   : '#FDECEC', label: 'TROCA' }

  return (
    <SubBloco T={T} dark={dark} icon="stethoscope" label="Resumo do diagnóstico" color="blue">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {relato && (
          <div>
            <SubLabel>Relato do cliente</SubLabel>
            <div style={{
              fontSize: 12.5, color: T.textPrimary, lineHeight: 1.4,
              borderLeft: `3px solid ${PALETA.yellowStrong}`, paddingLeft: 8,
            }}>{relato}</div>
          </div>
        )}
        {causa && (
          <div>
            <SubLabel>Causa identificada</SubLabel>
            <div style={{
              fontSize: 12.5, color: T.textPrimary, lineHeight: 1.4,
              borderLeft: `3px solid ${PALETA.blueStrong}`, paddingLeft: 8,
            }}>{causa}</div>
          </div>
        )}
        {chips.length > 0 && (
          <div>
            <SubLabel>Componentes marcados · {chips.length}</SubLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {chips.map(c => {
                const b = corBadge(c.acao)
                return (
                  <span key={c.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, padding: '3px 7px', borderRadius: 999,
                    background: b.bg, color: b.fg,
                    border: `1px solid ${b.fg}33`, fontWeight: 600,
                  }}>
                    <b style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em' }}>
                      {b.label}
                    </b>
                    {c.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </SubBloco>
  )
}

// ─── Botao segmentado OK/Defeito/Barulho ──────────────────────────────────
const SegOption = ({ T, dark, kind, selected, onClick }) => {
  const th = RESULTADO_THEMES[kind]
  return (
    <button type="button" onClick={onClick}
      title={th.label}
      style={{
        minHeight: 34, borderRadius: 7,
        padding: '0 6px',
        border: `1px solid ${selected ? th.bd : T.border}`,
        background: selected ? (dark ? th.bgDark : th.bgLight) : T.bg,
        color: selected ? th.fg : T.textPrimary,
        fontSize: 11.5, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
        fontFamily: 'inherit',
        overflow: 'hidden', minWidth: 0,
      }}>
      <TI name={th.icon} size={12} color={selected ? th.fg : T.textMuted} />
      <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{th.label}</span>
    </button>
  )
}

// ─── Linha de um teste dentro do SubBloco ─────────────────────────────────
const TesteRow = ({ T, dark, teste, valor, onChange, primeira }) => (
  <div style={{
    padding: '7px 0',
    borderTop: primeira ? 'none' : `1px solid ${T.border}`,
    display: 'flex', alignItems: 'center', gap: 8,
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12.5, fontWeight: 600, color: T.textPrimary,
      flex: '1 1 90px', minWidth: 0,
    }}>
      <TI name={teste.icon} size={13} color={PALETA.blueStrong} />
      <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{teste.label}</span>
    </div>
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 4, flex: '2 1 170px', minWidth: 0,
    }}>
      {(['ok', 'defeito', 'barulho']).map(k => (
        <SegOption key={k} T={T} dark={dark} kind={k}
          selected={valor === k}
          onClick={() => onChange(valor === k ? null : k)} />
      ))}
    </div>
  </div>
)

// ─── Botao de acabamento (Secagem/Polimento/Enceramento) ──────────────────
// Mesmo visual do SegOption dos testes, mas verde quando ativo.
const AcabBtn = ({ T, dark, item, feito, onClick }) => (
  <button type="button" onClick={onClick}
    title={item.label}
    style={{
      minHeight: 34, borderRadius: 7,
      padding: '0 6px',
      border: `1px solid ${feito ? '#7DC09F' : T.border}`,
      background: feito
        ? (dark ? 'rgba(46,125,94,0.22)' : PALETA.greenBg)
        : T.bg,
      color: feito ? PALETA.greenStrong : T.textPrimary,
      fontSize: 11.5, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      transition: 'background .12s, border-color .12s',
      fontFamily: 'inherit',
      overflow: 'hidden', minWidth: 0,
    }}>
    <TI name={item.icon} size={12} color={feito ? PALETA.greenStrong : T.textMuted} />
    <span style={{
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>{item.label}</span>
  </button>
)

export default function AcaoTeste({ os, onMoverOS, onUpdateOS }) {
  const { T, dark } = useTheme()

  // Detecta se orçamento tem Limpeza pra mostrar/ocultar bloco Acabamento.
  const { itens: itensOrcamento } = useOSItens(os.id)
  const temLimpeza = useMemo(
    () => itensOrcamento.some(i => /limpeza/i.test(i.nome || '')),
    [itensOrcamento]
  )

  const { itens: chkItens, observacoes: chkObs, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'teste_final')
  const { sincronizarAbertas } = useFalhaTeste(os.id)

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [acabamento, setAcabamento] = useState(
    () => ACABAMENTO.reduce((acc, a) => ({ ...acc, [a.id]: false }), {})
  )
  // Obs UNIFICADAS no campo global os.observacoes
  const [obs, setObs] = useState(os?.observacoes || '')
  const [hidratado, setHidratado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (loadingChk || hidratado) return
    const novoTestes = TESTES.reduce((acc, t) => {
      const found = chkItens.find(i => i.id === `teste:${t.id}`)
      return { ...acc, [t.id]: found?.valor ?? null }
    }, {})
    const novoAcab = ACABAMENTO.reduce((acc, a) => {
      const found = chkItens.find(i => i.id === `acab:${a.id}`)
      return { ...acc, [a.id]: !!found?.checked }
    }, {})
    setTestes(novoTestes)
    setAcabamento(novoAcab)
    setObs(os?.observacoes || '')
    setHidratado(true)
  }, [loadingChk, chkItens, hidratado, os?.observacoes])

  // Re-sincroniza obs se outra etapa alterar os.observacoes
  useEffect(() => {
    if (hidratado) setObs(os?.observacoes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.observacoes])

  // Auto-save de obs no campo global (debounce 500ms)
  useEffect(() => {
    if (!hidratado) return
    if (obs === (os?.observacoes || '')) return
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs, hidratado])

  function setResultado(testeId, valor) {
    const novoTestes = { ...testes, [testeId]: valor };
    setTestes(novoTestes);
    // Salva imediatamente
    const linhasTestes = TESTES.map(t => ({
      id: `teste:${t.id}`, label: t.label,
      checked: novoTestes[t.id] === 'ok',
      valor: novoTestes[t.id] || null,
    }));
    const linhasAcab = temLimpeza
      ? ACABAMENTO.map(a => ({ id: `acab:${a.id}`, label: a.label, checked: !!acabamento[a.id] }))
      : [];
    salvarChk([...linhasTestes, ...linhasAcab], null);
  }
  function toggleAcab(itemId) {
    const novoAcab = { ...acabamento, [itemId]: !acabamento[itemId] };
    setAcabamento(novoAcab);
    // Salva imediatamente
    const linhasTestes = TESTES.map(t => ({
      id: `teste:${t.id}`, label: t.label,
      checked: testes[t.id] === 'ok',
      valor: testes[t.id] || null,
    }));
    const linhasAcab = temLimpeza
      ? ACABAMENTO.map(a => ({ id: `acab:${a.id}`, label: a.label, checked: !!novoAcab[a.id] }))
      : [];
    salvarChk([...linhasTestes, ...linhasAcab], null);
  }

  function serializarChecklist() {
    const linhasTestes = TESTES.map(t => ({
      id: `teste:${t.id}`, label: t.label,
      checked: testes[t.id] === 'ok',
      valor: testes[t.id] || null,
    }))
    const linhasAcab = temLimpeza
      ? ACABAMENTO.map(a => ({
          id: `acab:${a.id}`, label: a.label,
          checked: !!acabamento[a.id],
        }))
      : []
    return [...linhasTestes, ...linhasAcab]
  }

  const falhas = TESTES
    .filter(t => testes[t.id] === 'defeito' || testes[t.id] === 'barulho')
    .map(t => `${t.label}: ${testes[t.id] === 'defeito' ? 'com defeito' : 'com barulho'}`)

  const todosTestesPreenchidos = TESTES.every(t => testes[t.id] != null)
  const todosTestesOk = todosTestesPreenchidos && falhas.length === 0
  const acabPendentes = ACABAMENTO.filter(a => !acabamento[a.id]).length
  const todoAcabamentoOk = !temLimpeza || acabPendentes === 0
  const podeAprovar = todosTestesOk && todoAcabamentoOk
  const podeVoltarOficina = falhas.length > 0

  // Resumo dos resultados pra mostrar como Pill no header
  const okCount = TESTES.filter(t => testes[t.id] === 'ok').length
  const resumoPill = todosTestesPreenchidos
    ? (todosTestesOk
        ? { tone: 'green', icon: 'circle-check', label: 'Tudo OK' }
        : { tone: 'red', icon: 'alert-triangle', label: `${falhas.length} falha${falhas.length > 1 ? 's' : ''}` })
    : { tone: 'neutral', icon: 'clock', label: `${okCount}/${TESTES.length}` }

  async function aprovar() {
    setSalvando(true)
    await salvarChk(serializarChecklist(), null)
    if (obs !== (os?.observacoes || '')) {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }
    await sincronizarAbertas([])
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    setSalvando(false)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  async function voltarOficina() {
    setSalvando(true)
    await salvarChk(serializarChecklist(), null)
    if (obs !== (os?.observacoes || '')) {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }
    await sincronizarAbertas(falhas)
    const oficina = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    setSalvando(false)
    if (oficina) onMoverOS(os.numero, oficina.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Resumo do diagnostico (mesmo das outras etapas) */}
      <ResumoDiagnostico T={T} dark={dark} os={os} />

      {/* Testes — 4 linhas dentro de um SubBloco */}
      <SubBloco T={T} dark={dark} icon="clipboard-check" label="Testes finais" color="blue"
        action={<Pill tone={resumoPill.tone} icon={resumoPill.icon}>{resumoPill.label}</Pill>}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {TESTES.map((t, i) => (
            <TesteRow key={t.id} T={T} dark={dark}
              teste={t}
              valor={testes[t.id]}
              primeira={i === 0}
              onChange={(v) => setResultado(t.id, v)} />
          ))}
        </div>
      </SubBloco>

      {/* Acabamento — só aparece se OS tem Limpeza no orçamento.
          Mesmo padrao das linhas de teste: rotulo + 3 botoes (multi-select). */}
      {temLimpeza && (
        <SubBloco T={T} dark={dark} icon="sparkles" label="Acabamento" color="blue"
          action={acabPendentes === 0
            ? <Pill tone="green" icon="check">Concluído</Pill>
            : <Pill tone="neutral" icon="clock">{ACABAMENTO.length - acabPendentes}/{ACABAMENTO.length}</Pill>}>
          <div style={{
            padding: '7px 0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12.5, fontWeight: 600, color: T.textPrimary,
              flex: '1 1 90px', minWidth: 0,
            }}>
              <TI name="sparkles" size={13} color={PALETA.blueStrong} />
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>Acabamento</span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 4, flex: '2 1 170px', minWidth: 0,
            }}>
              {ACABAMENTO.map(a => (
                <AcabBtn key={a.id} T={T} dark={dark}
                  item={a}
                  feito={!!acabamento[a.id]}
                  onClick={() => toggleAcab(a.id)} />
              ))}
            </div>
          </div>
        </SubBloco>
      )}

      {/* Observações */}
      <SubBloco T={T} dark={dark} icon="message-2" label="Observações" color="blue">
        <textarea
          placeholder="Ex: ficou tudo OK; cliente vai retirar amanhã…"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px', borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.bg, color: T.textPrimary,
            fontSize: 12.5, fontFamily: 'inherit',
            outline: 'none', resize: 'vertical',
          }}
        />
      </SubBloco>

      {/* CTA — Aprovar OU Voltar pra Oficina */}
      {!podeVoltarOficina && (
        <BtnMobile variant="blue" icon="circle-check"
          disabled={!podeAprovar || salvando}
          onClick={aprovar}>
          {salvando ? 'Salvando…'
            : podeAprovar ? 'Aprovar teste · ir pra Entrega'
            : !todosTestesPreenchidos ? `Preencha os ${TESTES.length} testes`
            : `Marque o acabamento (${acabPendentes} pendente${acabPendentes !== 1 ? 's' : ''})`}
        </BtnMobile>
      )}

      {podeVoltarOficina && (
        <BtnMobile variant="danger" icon="arrow-back-up"
          disabled={salvando}
          onClick={voltarOficina}>
          {salvando ? 'Salvando…' : `Voltar pra oficina (${falhas.length} ${falhas.length === 1 ? 'falha' : 'falhas'})`}
        </BtnMobile>
      )}
    </div>
  )
}
