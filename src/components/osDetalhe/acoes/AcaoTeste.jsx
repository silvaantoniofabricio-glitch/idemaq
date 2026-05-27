// src/components/osDetalhe/acoes/AcaoTeste.jsx
// Etapa Teste final — ESPELHO do AcaoRecebido (mesmo checklist, mesma UI)
// + seção condicional "Acabamento" (Secagem/Polimento/Enceramento) que só
// aparece em OS com Limpeza no orçamento.
//
// Regras:
// - Testes (4): Entrada de água · Saída de água · Agitação · Centrifugação
//   → cada um: OK / Defeito / Barulho (mesmo SegOption do AcaoRecebido)
// - Acabamento (3): Secagem · Polimento · Enceramento
//   → só aparece se há item /limpeza/i no orçamento
//   → cada um: feito (toggle)
// - Aprovar libera quando TODOS testes preenchidos + (se aplicável) TODOS
//   acabamento marcados
// - Voltar pra oficina aparece quando há defeito/barulho — leva as falhas
//   pro banner do AcaoOficina via useFalhaTeste.

import React, { useState, useEffect } from 'react'
import { useTheme } from '../../../theme'
import {
  TI, NowCard, Group, TextArea, BtnMobile, MOBILE, PALETA,
} from '../../_shared/PrimitivasMobile'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useFalhaTeste } from '../../../hooks/useFalhaTeste'
import { useOSItens } from '../../../hooks/useOSItens'

// Mesmos 4 testes do AcaoRecebido (paridade visual exigida pela Idemaq).
const TESTES = [
  { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'droplet' },
  { id: 'saida_agua',    label: 'Saída de água',    icon: 'droplet-off' },
  { id: 'agitacao',      label: 'Agitação',         icon: 'refresh' },
  { id: 'centrifugacao', label: 'Centrifugação',    icon: 'rotate-clockwise' },
]

// Acabamento — só aparece em OS com Limpeza no orçamento.
const ACABAMENTO = [
  { id: 'secagem',     label: 'Secagem',     icon: 'wind' },
  { id: 'polimento',   label: 'Polimento',   icon: 'sparkles' },
  { id: 'enceramento', label: 'Enceramento', icon: 'droplet-half-2' },
]

const RESULTADO_THEMES = {
  ok:      { icon: 'check',          label: 'OK',      bg: PALETA.greenBg,  fg: PALETA.greenStrong,  bd: '#7DC09F' },
  defeito: { icon: 'alert-triangle', label: 'Defeito', bg: PALETA.redBg,    fg: PALETA.redStrong,    bd: '#E89B9B' },
  barulho: { icon: 'volume',         label: 'Barulho', bg: PALETA.yellowBg, fg: PALETA.yellowStrong, bd: '#E5BD3E' },
}

const SegOption = ({ kind, selected, onClick }) => {
  const { T } = useTheme()
  const th = RESULTADO_THEMES[kind]
  return (
    <button type="button" onClick={onClick} style={{
      height: MOBILE.segHeight, borderRadius: 10,
      border: `1px solid ${selected ? th.bd : T.border}`,
      background: selected ? th.bg : T.card,
      color: selected ? th.fg : T.textPrimary,
      fontSize: 13, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      transition: 'background .12s, border-color .12s',
      fontFamily: 'inherit',
    }}>
      <TI name={th.icon} size={15} color={selected ? th.fg : T.textMuted} />
      {th.label}
    </button>
  )
}

const TesteCard = ({ teste, valor, onChange }) => {
  const { T } = useTheme()
  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radiusCard, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Label à esquerda */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 14, fontWeight: 600, color: T.textPrimary,
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        <TI name={teste.icon} size={17} color={PALETA.blueStrong} />
        {teste.label}
      </div>
      {/* 3 botões à direita, fixos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, flexShrink: 0, width: 270 }}>
        {(['ok', 'defeito', 'barulho']).map(k => (
          <SegOption key={k} kind={k}
            selected={valor === k}
            onClick={() => onChange(valor === k ? null : k)} />
        ))}
      </div>
    </div>
  )
}

// Toggle "feito/não feito" pros itens de acabamento.
const AcabamentoCard = ({ item, feito, onToggle }) => {
  const { T } = useTheme()
  return (
    <button type="button" onClick={onToggle}
      className="idemaq-card"
      style={{
        background: feito ? PALETA.greenBg : T.card,
        border: `1px solid ${feito ? '#7DC09F' : T.border}`,
        borderRadius: MOBILE.radiusCard, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        width: '100%',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      <TI name={item.icon} size={18}
        color={feito ? PALETA.greenStrong : PALETA.blueStrong} />
      <span style={{
        flex: 1, fontSize: 14.5, fontWeight: 600,
        color: T.textPrimary,
        textDecoration: feito ? 'line-through' : 'none',
        textDecorationColor: feito ? PALETA.greenStrong : 'transparent',
      }}>
        {item.label}
      </span>
      <TI
        name={feito ? 'square-check-filled' : 'square'}
        size={22}
        color={feito ? PALETA.greenStrong : T.textDim} />
    </button>
  )
}

export default function AcaoTeste({ os, onMoverOS }) {
  // Detecta se orçamento tem Limpeza pra mostrar/ocultar bloco Acabamento.
  const { itens: itensOrcamento } = useOSItens(os.id)
  const temLimpeza = itensOrcamento.some(i => /limpeza/i.test(i.nome || ''))

  const { itens: chkItens, observacoes: chkObs, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'teste_final')
  const { sincronizarAbertas } = useFalhaTeste(os.id)

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [acabamento, setAcabamento] = useState(
    () => ACABAMENTO.reduce((acc, a) => ({ ...acc, [a.id]: false }), {})
  )
  const [obs, setObs] = useState('')
  const [hidratado, setHidratado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Hidrata estado a partir do checklist persistido (uma vez só).
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
    setObs(chkObs || '')
    setHidratado(true)
  }, [loadingChk, chkItens, chkObs, hidratado])

  function setResultado(testeId, valor) {
    setTestes(prev => ({ ...prev, [testeId]: valor }))
  }
  function toggleAcab(itemId) {
    setAcabamento(prev => ({ ...prev, [itemId]: !prev[itemId] }))
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

  // Lista de falhas (defeito/barulho) pra rastrear no AcaoOficina.
  const falhas = TESTES
    .filter(t => testes[t.id] === 'defeito' || testes[t.id] === 'barulho')
    .map(t => `${t.label}: ${testes[t.id] === 'defeito' ? 'com defeito' : 'com barulho'}`)

  const todosTestesPreenchidos = TESTES.every(t => testes[t.id] != null)
  const todosTestesOk = todosTestesPreenchidos && falhas.length === 0
  const todoAcabamentoOk = !temLimpeza || ACABAMENTO.every(a => acabamento[a.id])
  const podeAprovar = todosTestesOk && todoAcabamentoOk
  const podeVoltarOficina = falhas.length > 0

  async function aprovar() {
    setSalvando(true)
    await salvarChk(serializarChecklist(), obs || null)
    await sincronizarAbertas([])
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    setSalvando(false)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  async function voltarOficina() {
    setSalvando(true)
    await salvarChk(serializarChecklist(), obs || null)
    await sincronizarAbertas(falhas)
    const oficina = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    setSalvando(false)
    if (oficina) onMoverOS(os.numero, oficina.id)
  }

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <NowCard
        icon="clipboard-check"
        titulo="teste final"
        descricao={temLimpeza
          ? <>Teste cada função e marque <b>OK</b>, <b>Defeito</b> ou <b>Barulho</b>. Marque também o acabamento concluído.</>
          : <>Teste cada função e marque <b>OK</b>, <b>Defeito</b> ou <b>Barulho</b>.</>}
      />

      {/* Mesmo checklist do AcaoRecebido — 4 testes */}
      {TESTES.map(t => (
        <TesteCard key={t.id}
          teste={t}
          valor={testes[t.id]}
          onChange={(v) => setResultado(t.id, v)} />
      ))}

      {/* Acabamento — só aparece se OS tem Limpeza no orçamento */}
      {temLimpeza && (
        <>
          <Group label={(
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TI name="sparkles" size={13} color={PALETA.blueStrong} />
              ACABAMENTO
            </span>
          )}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACABAMENTO.map(a => (
                <AcabamentoCard key={a.id}
                  item={a}
                  feito={!!acabamento[a.id]}
                  onToggle={() => toggleAcab(a.id)} />
              ))}
            </div>
          </Group>
        </>
      )}

      <Group label={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <TI name="message-2" size={13} color={PALETA.blueStrong} />
          OBSERVAÇÕES
        </span>
      )}>
        <TextArea
          placeholder="Ex: ficou tudo OK; cliente vai retirar amanhã…"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </Group>

      {/* Botão APROVAR — habilita quando tudo OK */}
      {!podeVoltarOficina && (
        <BtnMobile variant="blue" icon="circle-check"
          disabled={!podeAprovar || salvando}
          onClick={aprovar}>
          {salvando ? 'Salvando…'
            : podeAprovar ? 'Aprovar teste · ir pra Entrega'
            : !todosTestesPreenchidos ? `Preencha os ${TESTES.length} testes`
            : `Marque o acabamento (${ACABAMENTO.filter(a => !acabamento[a.id]).length} pendente${ACABAMENTO.filter(a => !acabamento[a.id]).length !== 1 ? 's' : ''})`}
        </BtnMobile>
      )}

      {/* Botão VOLTAR PRA OFICINA — quando há falhas */}
      {podeVoltarOficina && (
        <BtnMobile variant="red" icon="arrow-back-up"
          disabled={salvando}
          onClick={voltarOficina}>
          {salvando ? 'Salvando…' : `Voltar pra oficina (${falhas.length} ${falhas.length === 1 ? 'falha' : 'falhas'})`}
        </BtnMobile>
      )}
    </div>
  )
}
