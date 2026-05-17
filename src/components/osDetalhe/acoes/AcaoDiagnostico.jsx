// src/components/osDetalhe/acoes/AcaoDiagnostico.jsx
// Diagnóstico técnico com checklist de componentes 2×2 (colapsível).
// Técnico marca "man." e/ou "troca" por item → dados vão pro Orçamento.
// Botão "Concluir diagnóstico" → avança pra Orçamento.

import React, { useState } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import BlocoAcao from './BlocoAcao'

// ─── Definição dos grupos e itens ───────────────────────────────────────────
const GRUPOS = [
  {
    id: 'motor',
    label: 'Motor e transmissão',
    icon: 'ti-engine',
    itens: [
      { id: 'motor_principal',    label: 'Motor principal',      temMan: true },
      { id: 'correia',            label: 'Correia',              temMan: true },
      { id: 'polia_motor',        label: 'Polia do motor',       temMan: true },
      { id: 'mecanismo',          label: 'Mecanismo',            temMan: true },
      { id: 'embreagem',          label: 'Embreagem',            temMan: true },
      { id: 'polia_mecanismo',    label: 'Polia do mecanismo',   temMan: true },
      { id: 'catraca',            label: 'Catraca / engaste',    temMan: true },
      { id: 'rolamentos_cesto',   label: 'Rolamentos do cesto',  temMan: true },
      { id: 'rolamento_eixo',     label: 'Rolamento do eixo',    temMan: true },
      { id: 'rolamentos_motor',   label: 'Rolamentos do motor',  temMan: true },
    ],
  },
  {
    id: 'agua',
    label: 'Sistema de água',
    icon: 'ti-droplet',
    itens: [
      { id: 'bomba_drenagem',     label: 'Bomba de drenagem',    temMan: true  },
      { id: 'valvula_entrada',    label: 'Válvula de entrada',   temMan: true  },
      { id: 'mangueira_entrada',  label: 'Mangueira de entrada', temMan: false },
      { id: 'mangueira_saida',    label: 'Mangueira de saída',   temMan: false },
      { id: 'mangueira_interna',  label: 'Mangueira interna',    temMan: false },
      { id: 'pressostato',        label: 'Pressostato',          temMan: true  },
      { id: 'borracha_porta',     label: 'Borracha da porta',    temMan: false },
    ],
  },
  {
    id: 'eletrico',
    label: 'Sistema elétrico',
    icon: 'ti-bolt',
    itens: [
      { id: 'placa_potencia',     label: 'Placa de potência',    temMan: true  },
      { id: 'placa_interface',    label: 'Placa interface',      temMan: true  },
      { id: 'timer_mecanico',     label: 'Timer mecânico',       temMan: true  },
      { id: 'capacitor',          label: 'Capacitor',            temMan: false },
      { id: 'sensor_temperatura', label: 'Sensor de temperatura',temMan: true  },
      { id: 'sensor_tampa',       label: 'Sensor da tampa',      temMan: true  },
      { id: 'trava_porta',        label: 'Trava da porta',       temMan: true  },
    ],
  },
  {
    id: 'estrutura',
    label: 'Estrutura',
    icon: 'ti-tool',
    itens: [
      { id: 'cesto',              label: 'Cesto',                temMan: true },
      { id: 'agitador',           label: 'Agitador',             temMan: true },
      { id: 'suporte_cesto',      label: 'Suporte do cesto',     temMan: true },
      // Eixo do cesto removido por solicitação
      { id: 'suspensao',          label: 'Suspensão',            temMan: true },
      { id: 'tirantes',           label: 'Tirantes da suspensão',temMan: true },
      { id: 'pe_nivelador',       label: 'Pé nivelador',         temMan: true },
    ],
  },
]

// ─── Componente principal ────────────────────────────────────────────────────
export default function AcaoDiagnostico({ T, dark, os, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const amarelo   = cor(P.yellow, P.yellowDark)
  const azul      = corEtapa('blue', dark)

  // Estado da causa (obrigatória)
  const salvo = os.diagnostico || {}
  const [causa, setCausa] = useState(salvo.causa || '')

  // checklist: { item_id: { man: bool, troca: bool } }
  const [check, setCheck] = useState(() => salvo.checklist || {})

  // Busca no checklist
  const [busca, setBusca] = useState('')
  const sem = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const buscaNorm = sem(busca.trim())

  // Grupos abertos/fechados — todos fechados por padrão
  const [abertos, setAbertos] = useState({})

  function toggleGrupo(id) {
    setAbertos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Quando há busca: grupo está "aberto" se tiver resultados
  function grupoVisivel(grupo) {
    if (!buscaNorm) return true
    return grupo.itens.some(i => sem(i.label).includes(buscaNorm))
  }

  function itensFiltrados(grupo) {
    if (!buscaNorm) return grupo.itens
    return grupo.itens.filter(i => sem(i.label).includes(buscaNorm))
  }

  function grupoAberto(grupo) {
    if (buscaNorm) return true   // busca ativa → sempre aberto se tiver resultado
    return !!abertos[grupo.id]
  }

  function toggleFlag(itemId, flag) {
    setCheck(prev => {
      const atual = prev[itemId] || {}
      return { ...prev, [itemId]: { ...atual, [flag]: !atual[flag] } }
    })
  }

  // Conta itens marcados de um grupo
  function contaMarcados(grupo) {
    return grupo.itens.filter(i => {
      const c = check[i.id] || {}
      return c.man || c.troca
    }).length
  }

  // Total global marcado
  const totalMarcado = GRUPOS.reduce((s, g) => s + contaMarcados(g), 0)

  function concluir() {
    onUpdateOS(os.numero, {
      diagnostico: { causa, checklist: check },
    })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'orcamento')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  const podeConcluir = causa.trim().length > 0

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-stethoscope"
      etapa="Diagnóstico técnico"
      descricao="Descreva a causa e marque os itens que precisam de manutenção ou troca."
    >
      {/* Causa (campo de texto obrigatório) */}
      <div>
        <label style={labelStyle(T)}>Causa identificada</label>
        <input
          value={causa}
          onChange={e => setCausa(e.target.value)}
          placeholder="Ex: Rolamento do tambor desgastado, correia partida…"
          style={inputStyle(T)}
        />
      </div>

      {/* Checklist 2×2 */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 6,
        }}>
          <label style={labelStyle(T)}>Checklist de componentes</label>
          {totalMarcado > 0 && (
            <span style={{
              fontSize: 11, color: azul, fontWeight: 700,
              background: `${azul}18`, borderRadius: 20,
              padding: '2px 8px',
            }}>
              {totalMarcado} {totalMarcado === 1 ? 'item' : 'itens'} marcados
            </span>
          )}
        </div>

        {/* Campo de busca */}
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <i className="ti ti-search" style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 13, color: T.textMuted, pointerEvents: 'none',
          }} aria-hidden="true" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar componente…"
            style={{
              ...inputStyle(T),
              paddingLeft: 30,
              paddingRight: busca ? 28 : 12,
            }}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: T.textMuted, display: 'flex', alignItems: 'center', padding: 2,
              }}
              aria-label="Limpar busca"
            >
              <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
            </button>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}>
          {GRUPOS.filter(grupoVisivel).map(grupo => {
            const aberto   = grupoAberto(grupo)
            const marcados = contaMarcados(grupo)
            const itens    = itensFiltrados(grupo)
            return (
              <GrupoCard
                key={grupo.id}
                T={T} dark={dark}
                grupo={grupo}
                aberto={aberto}
                marcados={marcados}
                itens={itens}
                check={check}
                amarelo={amarelo}
                azul={azul}
                onToggle={() => !buscaNorm && toggleGrupo(grupo.id)}
                onToggleFlag={toggleFlag}
                buscaAtiva={!!buscaNorm}
              />
            )
          })}
        </div>
      </div>

      {/* Botão concluir */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={concluir}
          disabled={!podeConcluir}
          title={!podeConcluir ? 'Informe a causa antes de concluir' : 'Avança pra Orçamento'}
          style={{
            padding: '10px 16px', borderRadius: 7, border: 'none',
            background: amarelo, color: '#0a0a0d',
            fontSize: 12.5, fontWeight: 700,
            cursor: podeConcluir ? 'pointer' : 'not-allowed',
            opacity: podeConcluir ? 1 : 0.45,
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />
          Concluir diagnóstico
        </button>
      </div>
    </BlocoAcao>
  )
}

// ─── Card colapsável de grupo ────────────────────────────────────────────────
function GrupoCard({ T, dark, grupo, aberto, marcados, itens, check, amarelo, azul, onToggle, onToggleFlag, buscaAtiva }) {
  const cor = (d, c) => dark ? d : c

  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${marcados > 0 ? `${azul}55` : T.border}`,
      overflow: 'hidden',
      transition: 'border-color .15s',
    }}>
      {/* Cabeçalho clicável */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 10px',
          background: marcados > 0
            ? cor(`${azul}18`, `${azul}10`)
            : dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          border: 'none', cursor: buscaAtiva ? 'default' : 'pointer', fontFamily: 'inherit',
          borderBottom: aberto ? `1px solid ${T.border}` : 'none',
          transition: 'background .15s',
        }}
      >
        <i className={`ti ${grupo.icon}`} style={{ fontSize: 13, color: marcados > 0 ? azul : T.textMuted, flexShrink: 0 }} aria-hidden="true" />
        <span style={{
          flex: 1, textAlign: 'left',
          fontSize: 11.5, fontWeight: 700, color: marcados > 0 ? azul : T.textSecondary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {grupo.label}
        </span>
        {/* Badge de marcados */}
        {marcados > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: azul,
            background: `${azul}22`, borderRadius: 10,
            padding: '1px 6px', flexShrink: 0,
          }}>
            {marcados}
          </span>
        )}
        {/* Chevron */}
        <i
          className={`ti ti-chevron-${aberto ? 'up' : 'down'}`}
          style={{ fontSize: 12, color: T.textMuted, flexShrink: 0 }}
          aria-hidden="true"
        />
      </button>

      {/* Lista de itens */}
      {aberto && (
        <div>
          {itens.map((item, idx) => {
            const c     = check[item.id] || {}
            const manAtivo   = !!c.man
            const trocaAtivo = !!c.troca
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '7px 10px',
                  borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
                  background: (manAtivo || trocaAtivo)
                    ? cor('rgba(255,255,255,0.02)', 'rgba(0,0,0,0.015)')
                    : 'transparent',
                  gap: 6,
                }}
              >
                {/* Nome */}
                <span style={{
                  flex: 1, fontSize: 12, fontWeight: 500,
                  color: (manAtivo || trocaAtivo) ? T.textPrimary : T.textSecondary,
                  minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.label}
                </span>

                {/* Botão man. */}
                {item.temMan && (
                  <PillBtn
                    ativo={manAtivo}
                    cor={amarelo}
                    corTexto="#0a0a0d"
                    dark={dark}
                    onClick={() => onToggleFlag(item.id, 'man')}
                  >
                    man.
                  </PillBtn>
                )}

                {/* Botão troca */}
                <PillBtn
                  ativo={trocaAtivo}
                  cor={azul}
                  corTexto={dark ? '#fff' : '#fff'}
                  dark={dark}
                  onClick={() => onToggleFlag(item.id, 'troca')}
                >
                  troca
                </PillBtn>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Pill toggle ─────────────────────────────────────────────────────────────
function PillBtn({ ativo, cor, corTexto, dark, onClick, children }) {
  const bgInativo = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const txtInativo = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '3px 7px', borderRadius: 20, border: 'none',
        background: ativo ? cor : bgInativo,
        color: ativo ? corTexto : txtInativo,
        fontSize: 10.5, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        flexShrink: 0,
        transition: 'background .12s, color .12s',
      }}
    >
      {children}
    </button>
  )
}

// ─── Helpers de estilo ───────────────────────────────────────────────────────
function labelStyle(T) {
  return {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 10.5, color: T.textMuted, fontWeight: 600,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px',
  }
}
function inputStyle(T) {
  return {
    width: '100%', padding: '9px 12px', borderRadius: 7,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
}
