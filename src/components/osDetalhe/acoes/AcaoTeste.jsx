// src/components/osDetalhe/acoes/AcaoTeste.jsx
// Etapa Teste final — espelha o checklist do AcaoRecebido (pré-diagnóstico)
// + checklist condicional de Acabamento se o orçamento incluiu limpeza.
//
// Regras:
// - Testes (4): Entrada de água, Saída de água, Agitação, Centrifugação
//   - cada um: Ok / Defeito / Barulho
// - Acabamento (3): Polimento, Limpeza final, Enceramento
//   - só aparece se há item /limpeza/i no orçamento
//   - cada um: feito (toggle)
// - Aprovar libera quando TODOS testes = Ok E (se aplicável) TODOS acabamento marcados
// - Voltar pra oficina aparece quando há defeito/barulho — leva as falhas
//   automaticamente (os.teste_falhas) pro banner do AcaoOficina

import React, { useState, useMemo, useEffect } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { useOSItens } from '../../../hooks/useOSItens'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useFalhaTeste } from '../../../hooks/useFalhaTeste'
import BlocoAcao from './BlocoAcao'

// Espelha exatamente o checklist do AcaoRecebido (mesma ordem, mesmos labels).
// Se mudar lá, atualizar aqui — a Idemaq quer paridade visual entre as 2 etapas.
const TESTES = [
  { id: 'entrada_agua',  label: 'Entrada de água', icon: 'ti-droplet' },
  { id: 'saida_agua',    label: 'Saída de água',   icon: 'ti-droplet-off' },
  { id: 'agitacao',      label: 'Agitação',        icon: 'ti-refresh' },
  { id: 'centrifugacao', label: 'Centrifugação',   icon: 'ti-rotate-clockwise' },
  { id: 'painel',        label: 'Painel / botões', icon: 'ti-device-laptop' },
]

const OPCOES = [
  { valor: 'ok',      label: 'Ok',      cor: 'azul' },
  { valor: 'defeito', label: 'Defeito', cor: 'vermelho' },
  { valor: 'barulho', label: 'Barulho', cor: 'amarelo' },
]

const ACABAMENTO = [
  { id: 'polimento',     label: 'Polimento',     icon: 'ti-sparkles' },
  { id: 'limpeza_final', label: 'Limpeza final', icon: 'ti-bubble' },
  { id: 'enceramento',   label: 'Enceramento',   icon: 'ti-droplet-half-2' },
]

export default function AcaoTeste({ T, dark, os, onMoverOS, onUpdateOS }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)
  const amarelo = cor(P.yellow, P.yellowDark)

  // === Detecta se orçamento tem limpeza (mesma regra do AcaoOficina) ===
  const { itens: itensOrcamento, loading: loadingItens } = useOSItens(os.id)
  const temLimpeza = itensOrcamento.some(i => /limpeza/i.test(i.nome))

  // === Checklist persistido em checklist_etapa (etapa='teste_final') ===
  // Estrutura do `itens`:
  //   [{ id: 'teste:entrada_agua', label: 'Entrada de água', checked: false, valor: 'ok'|'defeito'|'barulho' },
  //    { id: 'acab:polimento',     label: 'Polimento',       checked: true }]
  // Convertemos pra/de estado local pra preservar a UX sem reescrever a UI.
  const { itens: chkItens, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'teste_final')
  const { abertas: falhasAbertas, sincronizarAbertas } = useFalhaTeste(os.id)

  // === Estado UI (hidrata do checklist quando chega) ===
  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [acabamento, setAcabamento] = useState(
    () => ACABAMENTO.reduce((acc, a) => ({ ...acc, [a.id]: false }), {})
  )
  const [hidratado, setHidratado] = useState(false)
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
    setTestes(novoTestes); setAcabamento(novoAcab); setHidratado(true)
  }, [loadingChk, chkItens, hidratado])

  // === Derivações ===
  // Falhas = testes marcados como defeito ou barulho
  const falhas = useMemo(() => {
    return TESTES
      .filter(t => testes[t.id] === 'defeito' || testes[t.id] === 'barulho')
      .map(t => `${t.label}: ${testes[t.id] === 'defeito' ? 'com defeito' : 'com barulho'}`)
  }, [testes])

  const todosTestesPreenchidos = TESTES.every(t => testes[t.id] != null)
  const todosTestesOk = todosTestesPreenchidos && falhas.length === 0
  const todoAcabamentoOk = !temLimpeza || ACABAMENTO.every(a => acabamento[a.id])

  // Estados possíveis
  const podeAprovar = todosTestesOk && todoAcabamentoOk
  const podeVoltarOficina = falhas.length > 0
  // "Faltando preencher": testes incompletos OU acabamento incompleto
  const faltandoPreencher = !todosTestesPreenchidos || (todosTestesOk && !todoAcabamentoOk)

  function selecionar(testeId, valor) {
    setTestes(prev => ({
      ...prev,
      [testeId]: prev[testeId] === valor ? null : valor,
    }))
  }
  function toggleAcab(id) {
    setAcabamento(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function serializarChecklist() {
    const linhasTestes = TESTES.map(t => ({
      id: `teste:${t.id}`, label: t.label,
      checked: testes[t.id] === 'ok',
      valor: testes[t.id] || null,
    }))
    const linhasAcab = temLimpeza
      ? ACABAMENTO.map(a => ({ id: `acab:${a.id}`, label: a.label, checked: !!acabamento[a.id] }))
      : []
    return [...linhasTestes, ...linhasAcab]
  }

  async function aprovar() {
    await salvarChk(serializarChecklist())
    await sincronizarAbertas([])  // todas as falhas em aberto viram resolvidas
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  async function voltarOficina() {
    await salvarChk(serializarChecklist())
    await sincronizarAbertas(falhas)  // persiste falhas pro banner do AcaoOficina
    const oficina = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    if (oficina) onMoverOS(os.numero, oficina.id)
  }

  // Cores por opção
  function corOpcao(opcaoCor, ativo) {
    if (!ativo) return { bg: 'transparent', border: T.border, color: T.textMuted }
    if (opcaoCor === 'azul')     return { bg: `${azul}22`,     border: azul,     color: azul }
    if (opcaoCor === 'vermelho') return { bg: `${vermelho}22`, border: vermelho, color: vermelho }
    if (opcaoCor === 'amarelo')  return { bg: `${amarelo}22`,  border: amarelo,  color: amarelo }
    return { bg: 'transparent', border: T.border, color: T.textMuted }
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-clipboard-check"
      etapa="Teste final"
      descricao={temLimpeza
        ? 'Teste cada função + confira acabamento. Aprove só com tudo OK.'
        : 'Teste cada função. Aprove só com tudo OK; do contrário, volta pra oficina.'}
      tom={falhas.length > 0 ? 'vermelho' : 'amarelo'}
    >
      {/* === CHECKLIST DE TESTE === */}
      <Secao titulo="Teste de funcionamento" T={T} dark={dark} icon="ti-test-pipe" cor={azul}>
        <div style={{
          borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr repeat(3, auto)', gap: 0,
            padding: '7px 12px',
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={hdrStyle(T)}>Teste</span>
            {OPCOES.map(op => (
              <span key={op.valor} style={{ ...hdrStyle(T), width: 78, textAlign: 'center' }}>
                {op.valor === 'ok' ? 'Ok' : op.valor === 'defeito' ? 'Com defeito' : 'Com barulho'}
              </span>
            ))}
          </div>

          {TESTES.map((teste, idx) => (
            <div key={teste.id} style={{
              display: 'grid', gridTemplateColumns: '1fr repeat(3, auto)', gap: 0,
              alignItems: 'center', padding: '10px 12px',
              borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
              background: idx % 2 === 0 ? 'transparent'
                : dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className={`ti ${teste.icon}`} style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                  {teste.label}
                </span>
              </div>
              {OPCOES.map(op => {
                const ativo = testes[teste.id] === op.valor
                const { bg, border, color } = corOpcao(op.cor, ativo)
                return (
                  <div key={op.valor} style={{ width: 78, display: 'flex', justifyContent: 'center' }}>
                    <button type="button"
                      onClick={() => selecionar(teste.id, op.valor)}
                      style={{
                        padding: '5px 12px', borderRadius: 20,
                        border: `1.5px solid ${border}`,
                        background: bg, color,
                        fontSize: 12, fontWeight: ativo ? 700 : 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all .15s', whiteSpace: 'nowrap',
                      }}>
                      {op.label}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </Secao>

      {/* === CHECKLIST DE ACABAMENTO (condicional) === */}
      {temLimpeza && (
        <Secao titulo="Acabamento" T={T} dark={dark} icon="ti-sparkles" cor={azul}
          subtitulo="Aplicável porque o orçamento inclui limpeza.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ACABAMENTO.map(a => {
              const ok = !!acabamento[a.id]
              return (
                <button key={a.id} onClick={() => toggleAcab(a.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '10px 12px', borderRadius: 7,
                  background: ok ? cor(`${verde}18`, `${verde}12`) : 'transparent',
                  border: `1px solid ${ok ? verde + '44' : T.border}`,
                  color: ok ? T.textPrimary : T.textSecondary,
                  fontSize: 13, fontWeight: ok ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left', width: '100%',
                  transition: 'all .12s',
                }}>
                  <i className={`ti ${ok ? 'ti-square-check-filled' : 'ti-square'}`}
                     style={{ fontSize: 18, color: ok ? verde : T.textDim, flexShrink: 0 }} aria-hidden="true" />
                  <i className={`ti ${a.icon}`} style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
                  <span style={{
                    flex: 1, lineHeight: 1.3,
                    textDecoration: ok ? 'line-through' : 'none',
                    textDecorationColor: verde + '88',
                  }}>
                    {a.label}
                  </span>
                </button>
              )
            })}
          </div>
        </Secao>
      )}

      {/* === RESUMO + AÇÃO === */}
      {/* Sem testes preenchidos */}
      {!todosTestesPreenchidos && (
        <div style={{
          padding: '10px 12px', borderRadius: 7,
          background: T.cardAlt, border: `1px dashed ${T.border}`,
          fontSize: 12, color: T.textMuted, fontStyle: 'italic',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14 }} aria-hidden="true" />
          Preencha todos os {TESTES.length} testes pra liberar a decisão.
        </div>
      )}

      {/* Tudo ok e acabamento faltando */}
      {todosTestesOk && !todoAcabamentoOk && temLimpeza && (
        <div style={{
          padding: '10px 12px', borderRadius: 7,
          background: cor('#2a2000', '#fdf6dc'), border: `1px solid ${amarelo}55`,
          fontSize: 12, color: amarelo, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-sparkles" style={{ fontSize: 14 }} aria-hidden="true" />
          Marque o acabamento completo antes de aprovar.
        </div>
      )}

      {/* Botão APROVAR (verde) */}
      {podeAprovar && (
        <button onClick={aprovar} style={{
          padding: '14px 18px', borderRadius: 8, border: 'none',
          background: verde, color: '#fff',
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="ti ti-circle-check" style={{ fontSize: 18 }} aria-hidden="true" />
          Aprovar teste · ir pra Entrega
        </button>
      )}

      {/* Botão VOLTAR PRA OFICINA (vermelho — quando há falhas) */}
      {podeVoltarOficina && (
        <button onClick={voltarOficina} style={{
          padding: '12px 16px', borderRadius: 8, border: 'none',
          background: vermelho, color: '#fff',
          fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <i className="ti ti-arrow-back-up" style={{ fontSize: 17 }} aria-hidden="true" />
          Voltar para Em oficina ({falhas.length} {falhas.length === 1 ? 'falha' : 'falhas'})
        </button>
      )}
    </BlocoAcao>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Secao({ titulo, subtitulo, T, dark, icon, cor: corIcon, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color: corIcon }} aria-hidden="true" />
        <span style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>
          {titulo}
        </span>
      </div>
      {subtitulo && (
        <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6, fontStyle: 'italic' }}>
          {subtitulo}
        </div>
      )}
      {children}
    </div>
  )
}

function hdrStyle(T) {
  return {
    fontSize: 10.5, color: T.textMuted, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '.3px',
  }
}
