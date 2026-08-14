// src/components/osDetalhe/acoes/AcaoTesteHIG.jsx
// Etapa Teste final — Atlassian Design (reescrito 28/05/2026).
//
// 4 secoes:
//   1. Testes finais — 4 rows com chips OK/Defeito/Barulho
//   2. Acabamento (so se OS tem Limpeza) — 3 cards toggle
//   3. Observacoes — textarea
//   4. CTA primary (Aprovar) ou vermelho (Voltar pra oficina)
//
// Persiste:
//   · useChecklistEtapa(os.id, 'teste_final') -> resultados dos testes + acab
//   · useFalhaTeste(os.id).sincronizarAbertas() -> falhas detectadas
//   · os.observacoes
//
// Nome do arquivo permanece *HIG por compat com imports do EtapaTab.

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import { ETAPAS_TODOS, TIPOS_OS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useFalhaTeste } from '../../../hooks/useFalhaTeste'
import { useOSItens } from '../../../hooks/useOSItens'
import { useAutorCheck, fmtAutor, detectarTrocaAutor } from '../../../hooks/useAutorCheck'
import {
  AtlPanel, AtlButton, ATL_FONT,
} from './_AtlassianUI'

// ─── Dados por tipo de equipamento ────────────────────────────────────────
const TESTES_POR_EQUIP = {
  lavadora: [
    { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'droplet' },
    { id: 'agitacao',      label: 'Agitação',         icon: 'refresh' },
    { id: 'saida_agua',    label: 'Saída de água',    icon: 'droplet-off' },
    { id: 'centrifugacao', label: 'Centrifugação',    icon: 'rotate-clockwise' },
  ],
  microondas: [
    { id: 'aquecimento',  label: 'Aquecimento',       icon: 'flame' },
    { id: 'prato',        label: 'Prato giratório',   icon: 'rotate-clockwise' },
    { id: 'temporizador', label: 'Temporizador',      icon: 'clock' },
    { id: 'potencia',     label: 'Troca de potência', icon: 'adjustments' },
  ],
  lava_loucas: [
    { id: 'entrada_agua', label: 'Entrada de água',       icon: 'droplet' },
    { id: 'saida_agua',   label: 'Saída de água',         icon: 'droplet-off' },
    { id: 'lavagem',      label: 'Lavagem',               icon: 'sparkles' },
    { id: 'aquecimento',  label: 'Aquecimento / secagem', icon: 'flame' },
  ],
  outros: [
    { id: 'liga',        label: 'Liga normalmente', icon: 'power' },
    { id: 'funciona',    label: 'Funciona',         icon: 'check' },
    { id: 'sem_barulho', label: 'Sem barulho',      icon: 'volume-off' },
    { id: 'visual',      label: 'Aparência geral',  icon: 'eye' },
  ],
}
// Lava e seca usa os mesmos testes da lavadora + secagem (mais um mecanismo)
TESTES_POR_EQUIP.lava_seca = [
  ...TESTES_POR_EQUIP.lavadora,
  { id: 'secagem', label: 'Secagem', icon: 'wind' },
]

const ACABAMENTO_POR_EQUIP = {
  lavadora: [
    { id: 'secagem',     label: 'Secagem',     icon: 'wind' },
    { id: 'polimento',   label: 'Polimento',   icon: 'sparkles' },
    { id: 'enceramento', label: 'Enceramento', icon: 'droplet-half-2' },
  ],
  microondas: [
    { id: 'limpeza_interna', label: 'Higienização interna', icon: 'sparkles' },
    { id: 'painel',          label: 'Painel',           icon: 'layout-grid' },
  ],
  lava_loucas: [
    { id: 'filtros',   label: 'Filtros',           icon: 'filter' },
    { id: 'borracha',  label: 'Borracha da porta', icon: 'circle-dashed' },
    { id: 'polimento', label: 'Polimento',         icon: 'sparkles' },
  ],
  outros: [
    { id: 'limpeza', label: 'Higienização', icon: 'sparkles' },
    { id: 'visual',  label: 'Visual',  icon: 'eye' },
  ],
}
ACABAMENTO_POR_EQUIP.lava_seca = ACABAMENTO_POR_EQUIP.lavadora

const OPCOES = [
  { id: 'ok',      label: 'OK',       icon: 'check',          corKey: 'green'  },
  { id: 'defeito', label: 'Defeito',  icon: 'alert-triangle', corKey: 'red'    },
  { id: 'barulho', label: 'Barulho',  icon: 'volume',         corKey: 'yellow' },
]

// ─── Test row Atlassian — mesmo layout 2 linhas do Avaliacao ─────────────
function TestRow({ T, dark, teste, value, onChange, first, autor }) {
  const opSel = OPCOES.find(o => o.id === value)
  return (
    <div style={{
      padding: '10px 14px',
      borderTop: first ? 'none' : `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 4,
          background: opSel
            ? corEtapa(opSel.corKey, dark) + '22'
            : (dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7'),
          color: opSel ? corEtapa(opSel.corKey, dark) : T.textMuted,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'background .15s',
        }}>
          <i className={`ti ti-${teste.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
        </div>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500,
          color: T.textPrimary, letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{teste.label}</span>

        {value && autor && (
          <span style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 500,
            flexShrink: 0, letterSpacing: '-0.003em', whiteSpace: 'nowrap',
          }}>{autor}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {OPCOES.map(op => {
          const cor = corEtapa(op.corKey, dark)
          const sel = value === op.id
          return (
            <button key={op.id} type="button"
              onClick={() => onChange(sel ? null : op.id)}
              style={{
                flex: 1, height: 30,
                borderRadius: 3,
                border: `1px solid ${sel ? cor : T.border}`,
                background: sel ? cor + '22' : 'transparent',
                color: sel ? cor : T.textMuted,
                cursor: 'pointer', fontFamily: ATL_FONT,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 12, fontWeight: sel ? 600 : 500,
                letterSpacing: '-0.005em',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background .12s, border-color .12s',
              }}>
              <i className={`ti ti-${op.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
              {op.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Acabamento card ──────────────────────────────────────────────────────
function AcabamentoCard({ T, dark, acab, on, onClick }) {
  const azul = corEtapa('blue', dark)
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: '1 1 0', minHeight: 48,
        borderRadius: 4,
        border: `1px solid ${on ? azul : T.border}`,
        background: on
          ? (dark ? 'rgba(91,155,213,0.12)' : 'rgba(91,155,213,0.08)')
          : (dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC'),
        cursor: 'pointer', fontFamily: ATL_FONT,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      <i className={`ti ti-${acab.icon}`}
         style={{ fontSize: 17, color: on ? azul : T.textMuted }}
         aria-hidden="true" />
      <span style={{
        fontSize: 11.5, fontWeight: on ? 600 : 500,
        color: on ? azul : T.textMuted, letterSpacing: '-0.005em',
      }}>{acab.label}</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoTesteHIG({ os, onMoverOS, onUpdateOS }) {
  const { T, dark } = useTheme()
  const { carimbo } = useAutorCheck()

  // Checklists dinâmicos por tipo de equipamento
  const tipoEquip = os.tipoEquipamento || 'lavadora'
  const TESTES = TESTES_POR_EQUIP[tipoEquip] || TESTES_POR_EQUIP.lavadora
  const ACABAMENTO = ACABAMENTO_POR_EQUIP[tipoEquip] || ACABAMENTO_POR_EQUIP.lavadora

  const { itens: itensOrcamento } = useOSItens(os.id)
  const temLimpeza = useMemo(
    () => itensOrcamento.some(i => /limpeza|higieniz/i.test(i.nome || '')),
    [itensOrcamento]
  )

  const { itens: chkItens, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'teste_final')
  const { sincronizarAbertas } = useFalhaTeste(os.id)

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [acabamento, setAcabamento] = useState(
    () => ACABAMENTO.reduce((acc, a) => ({ ...acc, [a.id]: false }), {})
  )
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
    setHidratado(true)
  }, [loadingChk, chkItens, hidratado])

  // Reset quando o tipo de equipamento muda durante a sessão
  const prevTipoRef = useRef(null)
  useEffect(() => {
    if (prevTipoRef.current === null) { prevTipoRef.current = tipoEquip; return }
    if (prevTipoRef.current === tipoEquip) return
    prevTipoRef.current = tipoEquip
    const t = TESTES_POR_EQUIP[tipoEquip] || TESTES_POR_EQUIP.lavadora
    const a = ACABAMENTO_POR_EQUIP[tipoEquip] || ACABAMENTO_POR_EQUIP.lavadora
    setTestes(t.reduce((acc, x) => ({ ...acc, [x.id]: null }), {}))
    setAcabamento(a.reduce((acc, x) => ({ ...acc, [x.id]: false }), {}))
    setHidratado(false)
  }, [tipoEquip])

  // Autoria: quando o valor de um item MUDA, carimba com o usuário logado;
  // quando não muda, preserva o autor anterior (não sobrescreve quem fez).
  // Se quem mexeu agora é diferente de quem tinha o carimbo antes, registra
  // um alerta de reatribuição (rastro pro relatório de Qualidade).
  function serializarChecklist(novoTestes, novoAcab) {
    const t = novoTestes ?? testes
    const a = novoAcab ?? acabamento
    const anteriores = chkItens || []
    const alertas = []
    const linhasTestes = TESTES.map(item => {
      const antigo = anteriores.find(i => i.id === `teste:${item.id}`)
      const valor  = t[item.id] || null
      const mudou  = valor !== (antigo?.valor ?? null)
      let autor = antigo?.autor
      if (mudou) {
        const quemAgora = carimbo()
        autor = valor == null ? undefined : quemAgora
        const troca = detectarTrocaAutor(antigo?.autor, quemAgora)
        if (troca) alertas.push({ campo: `Teste final · ${item.label}`, ...troca, em: quemAgora.em })
      }
      return {
        id: `teste:${item.id}`, label: item.label,
        checked: t[item.id] === 'ok',
        valor,
        ...(autor ? { autor } : {}),
      }
    })
    const linhasAcab = temLimpeza
      ? ACABAMENTO.map(item => {
          const antigo  = anteriores.find(i => i.id === `acab:${item.id}`)
          const checked = !!a[item.id]
          const mudou   = checked !== !!antigo?.checked
          let autor = antigo?.autor
          if (mudou) {
            const quemAgora = carimbo()
            autor = checked ? quemAgora : undefined
            const troca = detectarTrocaAutor(antigo?.autor, quemAgora)
            if (troca) alertas.push({ campo: `Teste final · ${item.label}`, ...troca, em: quemAgora.em })
          }
          return {
            id: `acab:${item.id}`, label: item.label, checked,
            ...(autor ? { autor } : {}),
          }
        })
      : []
    return { itens: [...linhasTestes, ...linhasAcab], alertas }
  }

  function setResultado(testeId, valor) {
    const novoTestes = { ...testes, [testeId]: valor }
    setTestes(novoTestes)
    const { itens, alertas } = serializarChecklist(novoTestes, null)
    salvarChk(itens, null, alertas)
  }

  function toggleAcab(itemId) {
    const novoAcab = { ...acabamento, [itemId]: !acabamento[itemId] }
    setAcabamento(novoAcab)
    const { itens, alertas } = serializarChecklist(null, novoAcab)
    salvarChk(itens, null, alertas)
  }

  const falhas = TESTES
    .filter(t => testes[t.id] === 'defeito' || testes[t.id] === 'barulho')
    .map(t => `${t.label}: ${testes[t.id] === 'defeito' ? 'com defeito' : 'com barulho'}`)

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null)
  const todosOk = todosPreenchidos && falhas.length === 0
  const acabPendentes = ACABAMENTO.filter(a => !acabamento[a.id]).length
  const todoAcabOk = !temLimpeza || acabPendentes === 0
  const podeAprovar = todosOk && todoAcabOk
  const podeVoltarOficina = falhas.length > 0
  const preenchidos = TESTES.filter(t => testes[t.id] != null).length

  // Próxima etapa após o Teste = a que vem no fluxo do TIPO da OS (não fixa em
  // "Entrega"). Fabricação: Teste → Concluído (sem entrega). Visita: Teste →
  // A receber. Atendimento: Teste → Entrega.
  const proximaEtapaCfg = useMemo(() => {
    const etapas = TIPOS_OS[os?.tipo]?.etapas || []
    const idx = etapas.findIndex(e => e.id === 'teste_final')
    return idx >= 0 ? etapas[idx + 1] : null
  }, [os?.tipo])

  async function aprovar() {
    setSalvando(true)
    const { itens, alertas } = serializarChecklist()
    await salvarChk(itens, null, alertas)
    await sincronizarAbertas([])
    const proxima = proximaEtapaCfg
      ? ETAPAS_TODOS.find(e => e.match?.[os.tipo] === proximaEtapaCfg.id)
      : null
    setSalvando(false)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  async function voltarOficina() {
    setSalvando(true)
    const { itens, alertas } = serializarChecklist()
    await salvarChk(itens, null, alertas)
    await sincronizarAbertas(falhas)
    const oficina = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    setSalvando(false)
    if (oficina) onMoverOS(os.numero, oficina.id)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12, fontFamily: ATL_FONT, padding: '0 0 12px',
    }}>

      {/* 1. Testes finais */}
      <AtlPanel
        T={T} dark={dark}
        title="Testes finais"
        count={preenchidos > 0 ? `${preenchidos}/${TESTES.length}` : undefined}
        footer={`${preenchidos} de ${TESTES.length} avaliados.`}>
        {TESTES.map((t, i) => {
          const salvo = (chkItens || []).find(x => x.id === `teste:${t.id}`)
          return (
            <TestRow key={t.id}
              T={T} dark={dark}
              teste={t}
              value={testes[t.id]}
              autor={fmtAutor(salvo?.autor)}
              onChange={(v) => setResultado(t.id, v)}
              first={i === 0}
            />
          )
        })}
      </AtlPanel>

      {/* 2. Acabamento — so se tem Limpeza */}
      {temLimpeza && (
        <AtlPanel
          T={T} dark={dark}
          title="Acabamento"
          footer={acabPendentes === 0
            ? 'Acabamento completo.'
            : `${ACABAMENTO.length - acabPendentes} de ${ACABAMENTO.length} marcados.`}>
          <div style={{ padding: '10px 14px', display: 'flex', gap: 6 }}>
            {ACABAMENTO.map(a => (
              <AcabamentoCard
                key={a.id}
                T={T} dark={dark}
                acab={a}
                on={!!acabamento[a.id]}
                onClick={() => toggleAcab(a.id)}
              />
            ))}
          </div>
        </AtlPanel>
      )}

      {/* 3. CTA */}
      {!podeVoltarOficina ? (
        <AtlButton
          T={T} dark={dark}
          variant="primary"
          fullWidth
          disabled={!podeAprovar || salvando}
          icon={salvando ? 'loader-2' : (podeAprovar ? 'circle-check' : 'lock')}
          onClick={aprovar}>
          {salvando
            ? 'Salvando…'
            : podeAprovar
              ? (proximaEtapaCfg?.id === 'concluido'
                  ? 'Aprovar · concluir serviço'
                  : proximaEtapaCfg?.id === 'pagamento'
                    ? 'Aprovar · ir pra A receber'
                    : 'Aprovar · ir pra Entrega')
              : !todosPreenchidos
                ? `Avalie os ${TESTES.length} testes para continuar`
                : `Marque o acabamento (${acabPendentes} pendente${acabPendentes !== 1 ? 's' : ''})`}
        </AtlButton>
      ) : (
        <button
          type="button"
          onClick={voltarOficina}
          disabled={salvando}
          style={{
            width: '100%', minHeight: 32,
            padding: '7px 12px', borderRadius: 3,
            background: corEtapa('red', dark),
            color: '#fff', border: 'none',
            fontSize: 13.5, fontWeight: 500,
            fontFamily: ATL_FONT,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: salvando ? 'not-allowed' : 'pointer',
            opacity: salvando ? 0.6 : 1,
            letterSpacing: '-0.005em',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <i className={`ti ti-${salvando ? 'loader-2' : 'arrow-back-up'}`}
             style={{ fontSize: 14 }} aria-hidden="true" />
          {salvando
            ? 'Salvando…'
            : `Voltar pra oficina (${falhas.length} ${falhas.length === 1 ? 'falha' : 'falhas'})`}
        </button>
      )}
    </div>
  )
}
