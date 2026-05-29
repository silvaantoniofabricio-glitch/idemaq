// src/pages/mobile/EstoqueMobile.jsx
// Estoque mobile — Atlassian Design (reescrito 28/05/2026).
//
// Estrutura:
//   1. Header (large title + subtitle)
//   2. KPIs (panel grid 2x2)
//   3. Segmented control (Pecas / Maquinas)
//   4. Sticky busca + chips categoria
//   5. Lista (PecaCardMobile / MaquinaCardMobile)
//   6. Paginacao + FAB + Modais
//
// Logica preservada: usePecas com filtros server-side (categoria, busca,
// pagina), debounce 300ms na busca, stats agregadas do supabase.

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { corEtapa } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { isAdmin } from '../../utils/osHelpers'
import { useToast } from '../../components/ui'
import { CATEGORIAS_PECA } from '../../utils/categoriasPeca'
import { usePecas } from '../../hooks/usePecas'

import PecaCardMobile    from '../../components/mobile/PecaCardMobile'
import MaquinaCardMobile from '../../components/mobile/MaquinaCardMobile'
import MobileFAB         from '../../components/mobile/MobileFAB'
import MobileEmptyState  from '../../components/mobile/MobileEmptyState'

import PecaDetalheModal    from '../../components/estoque/PecaDetalheModal'
import MaquinaDetalheModal from '../../components/estoque/MaquinaDetalheModal'
import NovaPecaModal       from '../../components/estoque/NovaPecaModal'

const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const ATL_RADIUS = 4
const PAGE_SIZE = 20

const MAQUINAS_MOCK = [
  { id:1, modelo:'Lavadora Consul CWE10',    marca:'Consul',     capacidade:'10kg', estado:'disponivel', custoCompra:150, custoItens:180, custoServico:50,  precoVenda:650 },
  { id:2, modelo:'Lavadora LG WD-1014',      marca:'LG',         capacidade:'11kg', estado:'disponivel', custoCompra:180, custoItens:200, custoServico:40,  precoVenda:650 },
  { id:3, modelo:'Brastemp Active BWL12',    marca:'Brastemp',   capacidade:'12kg', estado:'em_revisao', custoCompra:120, custoItens:120, custoServico:55,  precoVenda:650 },
  { id:4, modelo:'Lavadora Consul Maré 8kg', marca:'Consul',     capacidade:'8kg',  estado:'do_cliente', custoCompra:0,   custoItens:0,   custoServico:0,   precoVenda:0   },
  { id:5, modelo:'Electrolux LAC11',         marca:'Electrolux', capacidade:'11kg', estado:'vendida',    custoCompra:165, custoItens:155, custoServico:45,  precoVenda:650 },
]

function nivelEstoque(qtd, min) {
  if (!min || min <= 0) return 'sem_controle'
  if (qtd <= 0) return 'esgotado'
  if (qtd <= min) return 'baixo'
  return 'ok'
}

function fmtCompact(v) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(n < 10_000 ? 1 : 0).replace('.', ',')}k`
  return fmtBRL(n)
}

export default function EstoqueMobile({ T, dark, user }) {
  useToast()
  const mostraValores = isAdmin(user)
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  const [aba, setAba]                   = useState('pecas')
  const [busca, setBusca]               = useState('')
  const [buscaDebounced, setBD]         = useState('')
  const [categoriaSel, setCategoriaSel] = useState('todas')
  const [paginaAtual, setPaginaAtual]   = useState(1)
  const [refetchKey, setRefetchKey]     = useState(0)
  const [pecaAberta, setPecaAberta]     = useState(null)
  const [maquinaAberta, setMaquinaAberta] = useState(null)
  const [novaPecaAberta, setNovaPeca]   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setBD(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => { setPaginaAtual(1) }, [categoriaSel, buscaDebounced])

  const {
    pecas, total: totalFiltrado, loading: loadingPecas, error: errorPecas,
    criar, atualizar, ajustarEstoque,
  } = usePecas({ categoria: categoriaSel, busca: buscaDebounced, page: paginaAtual, pageSize: PAGE_SIZE })

  const [statsRaw, setStatsRaw] = useState([])
  useEffect(() => {
    let alive = true
    supabase.from('peca')
      .select('id, categoria, qtd_atual, qtd_minima, custo_atual')
      .is('deleted_at', null)
      .then(({ data }) => { if (alive) setStatsRaw(data || []) })
    return () => { alive = false }
  }, [refetchKey])

  const [maquinas] = useState(MAQUINAS_MOCK)

  async function adicionarPeca(nova) {
    const res = await criar(nova)
    if (!res.error) setRefetchKey(k => k + 1)
    return res
  }
  async function salvarEdicaoPeca(patch) {
    if (!pecaAberta) return { error: new Error('Sem peça aberta') }
    const { data, error } = await atualizar(pecaAberta.id, patch)
    if (!error && data) { setPecaAberta(data); setRefetchKey(k => k + 1) }
    return { data, error }
  }
  async function ajustarEstoqueDaPeca(payload) {
    if (!pecaAberta) return { error: new Error('Sem peça aberta') }
    const { data, error } = await ajustarEstoque(pecaAberta.id, payload)
    if (!error && data) { setPecaAberta(data); setRefetchKey(k => k + 1) }
    return { data, error }
  }

  const totalGlobal = statsRaw.length
  const emEstoque   = statsRaw.reduce((s, p) => s + (p.qtd_atual || 0), 0)
  const reposicao   = statsRaw.filter(p => {
    const n = nivelEstoque(p.qtd_atual, p.qtd_minima)
    return n === 'esgotado' || n === 'baixo'
  }).length
  const valorPecas  = statsRaw.reduce((s, p) => s + (p.qtd_atual || 0) * Number(p.custo_atual || 0), 0)

  const contagemCat = useMemo(() => {
    const m = {}
    for (const p of statsRaw) { const k = p.categoria || 'outros'; m[k] = (m[k] || 0) + 1 }
    return m
  }, [statsRaw])

  const maquinasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return maquinas
    return maquinas.filter(m =>
      m.modelo.toLowerCase().includes(q) ||
      m.marca.toLowerCase().includes(q) ||
      m.capacidade.toLowerCase().includes(q))
  }, [maquinas, busca])

  const disponiveis   = maquinas.filter(m => m.estado === 'disponivel').length
  const emRevisao     = maquinas.filter(m => m.estado === 'em_revisao').length
  const valorMaquinas = maquinas
    .filter(m => ['disponivel', 'em_revisao'].includes(m.estado))
    .reduce((s, m) => s + m.custoCompra + m.custoItens + m.custoServico, 0)

  const onPecas      = aba === 'pecas'
  const buscando     = !!buscaDebounced.trim()
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE))

  const kpis = onPecas
    ? [
        { label: 'Em estoque', value: emEstoque,              corKey: 'blue' },
        { label: 'Reposição',  value: reposicao,              corKey: reposicao > 0 ? 'yellow' : 'mute' },
        mostraValores && { label: 'Valor',     value: fmtCompact(valorPecas), corKey: 'text' },
        mostraValores && { label: 'Cadastros', value: totalGlobal,            corKey: 'text' },
      ].filter(Boolean)
    : [
        { label: 'Disponíveis', value: disponiveis, corKey: disponiveis > 0 ? 'green' : 'mute' },
        { label: 'Em revisão',  value: emRevisao,   corKey: emRevisao > 0 ? 'yellow' : 'mute' },
        mostraValores && { label: 'Capital', value: fmtCompact(valorMaquinas), corKey: 'text' },
      ].filter(Boolean)

  const corDo = (k) =>
    k === 'blue'   ? azul
  : k === 'yellow' ? amarelo
  : k === 'green'  ? verde
  : k === 'red'    ? vermelho
  : k === 'mute'   ? T.textDim
  : T.textPrimary

  const chipsCat = useMemo(() => {
    const out = [{ id: 'todas', label: 'Todas', badge: totalGlobal || null }]
    for (const cat of CATEGORIAS_PECA) {
      const c = contagemCat[cat.id]
      if (!c) continue
      out.push({ id: cat.id, label: cat.label, badge: c })
    }
    return out
  }, [contagemCat, totalGlobal])

  const subtitle = onPecas
    ? loadingPecas
      ? 'Carregando…'
      : buscando
        ? `${totalFiltrado} resultado${totalFiltrado === 1 ? '' : 's'} para "${buscaDebounced}"`
        : `Pág ${paginaAtual}/${totalPaginas} · ${pecas.length} de ${totalGlobal} peças`
    : `${maquinasFiltradas.length} de ${maquinas.length} máquinas`

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflowY: 'auto', background: T.bg,
      paddingBottom: 140, fontFamily: ATL_FONT,
    }}>

      {/* 1. Header */}
      <div style={{ padding: '14px 14px 6px' }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: T.textPrimary,
          margin: 0, letterSpacing: '-0.01em',
        }}>Estoque</h1>
        <div style={{
          fontSize: 12.5, color: T.textMuted, marginTop: 3,
          letterSpacing: '-0.005em',
        }}>{subtitle}</div>
      </div>

      {/* 2. KPIs em grid 2x2 dentro de panel */}
      <div style={{ padding: '0 14px 10px' }}>
        <div style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: ATL_RADIUS,
          overflow: 'hidden',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
        }}>
          {kpis.map((k, i) => {
            const lastRow = i >= kpis.length - (kpis.length % 2 === 0 ? 2 : 1)
            const isRight = i % 2 === 1
            return (
              <div key={i} style={{
                padding: '10px 14px',
                borderBottom: !lastRow ? `1px solid ${T.border}` : 'none',
                borderLeft: isRight ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, color: T.textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  marginBottom: 2,
                }}>{k.label}</div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: corDo(k.corKey),
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                }}>{k.value}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Segmented control Pecas/Maquinas */}
      <div style={{ padding: '0 14px 8px' }}>
        <AtlSegmented T={T} dark={dark}
          opcoes={[
            { id: 'pecas',    label: 'Peças' },
            { id: 'maquinas', label: 'Máquinas' },
          ]}
          ativo={aba}
          onChange={(v) => {
            setAba(v); setBusca(''); setBD(''); setCategoriaSel('todas'); setPaginaAtual(1)
          }}
        />
      </div>

      {/* 4. Sticky busca + chips */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.bg,
        paddingTop: 4,
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}>
        {/* Busca */}
        <div style={{ padding: '0 14px', position: 'relative', marginBottom: 8 }}>
          <i className="ti ti-search" aria-hidden="true" style={{
            position: 'absolute', left: 14 + 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: T.textMuted, pointerEvents: 'none',
          }} />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder={onPecas ? 'Buscar peça por nome, SKU…' : 'Buscar máquina…'}
            style={{
              width: '100%', boxSizing: 'border-box',
              minHeight: 34,
              padding: '0 32px 0 32px',
              borderRadius: 3,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
              color: T.textPrimary,
              fontSize: 13, fontFamily: ATL_FONT,
              outline: 'none', letterSpacing: '-0.005em',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = azul
              e.currentTarget.style.boxShadow = `0 0 0 2px ${azul}33`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = T.border
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          {busca && (
            <button onClick={() => setBusca('')} aria-label="Limpar" style={{
              position: 'absolute', right: 14 + 8, top: '50%', transform: 'translateY(-50%)',
              width: 18, height: 18, borderRadius: 9,
              background: T.textMuted + '88', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Chips categoria */}
        {onPecas && chipsCat.length > 1 && (
          <div style={{
            display: 'flex', gap: 5,
            padding: '0 14px 8px',
            overflowX: 'auto', scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}>
            <style>{`div::-webkit-scrollbar{display:none}`}</style>
            {chipsCat.map(cat => {
              const ativo = categoriaSel === cat.id
              return (
                <button key={cat.id} onClick={() => setCategoriaSel(cat.id)} style={{
                  flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px',
                  borderRadius: 99,
                  border: `1px solid ${ativo ? azul : T.border}`,
                  background: ativo ? azul : (dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC'),
                  color: ativo ? '#fff' : T.textPrimary,
                  fontSize: 12, fontWeight: ativo ? 600 : 500,
                  cursor: 'pointer', minHeight: 28,
                  whiteSpace: 'nowrap', fontFamily: ATL_FONT,
                  letterSpacing: '-0.005em',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background .12s, border-color .12s',
                }}>
                  {cat.label}
                  {cat.badge != null && (
                    <span style={{
                      background: ativo ? 'rgba(255,255,255,0.25)' : (dark ? 'rgba(255,255,255,0.07)' : '#DFE1E6'),
                      color: ativo ? '#fff' : T.textMuted,
                      fontSize: 10.5, fontWeight: 600,
                      padding: '1px 6px', borderRadius: 99,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{cat.badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. Lista */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {onPecas ? (
          loadingPecas ? <AtlSkeletonList T={T} dark={dark} />
            : errorPecas ? <AtlError T={T} dark={dark} mensagem={errorPecas.message} />
            : pecas.length === 0
              ? <MobileEmptyState T={T} dark={dark}
                  icon={buscando ? 'ti-search-off' : 'ti-puzzle-off'}
                  iconColor={azul}
                  title={buscando ? 'Nenhuma peça encontrada' : 'Nenhuma peça cadastrada'}
                  description={buscando
                    ? `Sem resultados para "${buscaDebounced}".`
                    : 'Toque no + pra cadastrar a primeira peça.'} />
              : pecas.map(p => (
                  <PecaCardMobile key={p.id} T={T} dark={dark}
                    peca={p}
                    mostraValores={mostraValores}
                    onClick={() => setPecaAberta(p)} />
                ))
        ) : (
          maquinasFiltradas.length === 0
            ? <MobileEmptyState T={T} dark={dark}
                icon={busca ? 'ti-search-off' : 'ti-device-washing-machine-off'}
                iconColor={azul}
                title={busca ? 'Nenhuma máquina encontrada' : 'Sem máquinas no estoque'}
                description={busca
                  ? `Sem resultados para "${busca}".`
                  : 'Máquinas reformadas entram ao concluir OS de Fabricação.'} />
            : maquinasFiltradas.map(m => (
                <MaquinaCardMobile key={m.id} T={T} dark={dark}
                  maquina={m}
                  mostraValores={mostraValores}
                  onClick={() => setMaquinaAberta(m)} />
              ))
        )}

        {onPecas && !buscando && !loadingPecas && totalPaginas > 1 && (
          <AtlPaginacao T={T} dark={dark}
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            totalItens={totalFiltrado}
            pageSize={PAGE_SIZE}
            onPagina={setPaginaAtual} />
        )}
      </div>

      {/* 6. FAB + modais */}
      {onPecas && mostraValores && (
        <MobileFAB T={T} dark={dark} icon="ti-plus" onClick={() => setNovaPeca(true)} />
      )}

      {pecaAberta && (
        <PecaDetalheModal T={T} dark={dark}
          peca={pecaAberta} mobile
          mostraValores={mostraValores}
          onSalvar={salvarEdicaoPeca}
          onAjustar={ajustarEstoqueDaPeca}
          onClose={() => setPecaAberta(null)} />
      )}
      {maquinaAberta && (
        <MaquinaDetalheModal T={T} dark={dark}
          maquina={maquinaAberta} mobile
          mostraValores={mostraValores}
          onClose={() => setMaquinaAberta(null)} />
      )}
      {novaPecaAberta && (
        <NovaPecaModal T={T} dark={dark} mobile
          onClose={() => setNovaPeca(false)}
          onSalvar={adicionarPeca} />
      )}
    </div>
  )
}

// ─── Segmented Atlassian ──────────────────────────────────────────────────
function AtlSegmented({ T, dark, opcoes, ativo, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
      borderRadius: 3, padding: 2, gap: 0,
    }}>
      {opcoes.map(o => {
        const sel = o.id === ativo
        return (
          <button key={o.id} onClick={() => onChange?.(o.id)}
            style={{
              flex: 1, minHeight: 32,
              border: 'none', borderRadius: 3,
              background: sel ? (dark ? '#22272B' : '#FFFFFF') : 'transparent',
              color: sel ? T.textPrimary : T.textMuted,
              fontSize: 13, fontWeight: sel ? 600 : 500,
              fontFamily: ATL_FONT, cursor: 'pointer',
              boxShadow: sel
                ? (dark
                    ? '0 1px 2px rgba(0,0,0,.4)'
                    : '0 1px 2px rgba(9,30,66,0.18)')
                : 'none',
              letterSpacing: '-0.005em',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background .12s, box-shadow .12s',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Paginacao Atlassian ──────────────────────────────────────────────────
function AtlPaginacao({ T, dark, paginaAtual, totalPaginas, totalItens, pageSize, onPagina }) {
  const azul = corEtapa('blue', dark)
  const podeAnt = paginaAtual > 1
  const podeProx = paginaAtual < totalPaginas
  const from = (paginaAtual - 1) * pageSize + 1
  const to = Math.min(paginaAtual * pageSize, totalItens)

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS,
      padding: 10,
      display: 'flex', flexDirection: 'column', gap: 8,
      marginTop: 4,
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      <div style={{
        fontSize: 11.5, color: T.textMuted, textAlign: 'center',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.005em',
      }}>
        Exibindo <strong style={{ color: T.textPrimary }}>{from}–{to}</strong>{' '}
        de <strong style={{ color: T.textPrimary }}>{totalItens}</strong>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        gap: 6, alignItems: 'center',
      }}>
        <PagBtn T={T} dark={dark} azul={azul}
          disabled={!podeAnt}
          onClick={() => onPagina(Math.max(1, paginaAtual - 1))}
          icon="chevron-left">Anterior</PagBtn>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: T.textPrimary, padding: '0 8px',
          whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.005em',
        }}>{paginaAtual} / {totalPaginas}</span>
        <PagBtn T={T} dark={dark} azul={azul}
          disabled={!podeProx}
          onClick={() => onPagina(Math.min(totalPaginas, paginaAtual + 1))}
          icon="chevron-right" right>Próxima</PagBtn>
      </div>
    </div>
  )
}

function PagBtn({ T, dark, azul, icon, right, disabled, onClick, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minHeight: 32, padding: '0 12px',
      background: disabled ? 'transparent' : (dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7'),
      color: disabled ? T.textDim : azul,
      border: `1px solid ${disabled ? 'transparent' : T.border}`,
      borderRadius: 3, fontSize: 13, fontWeight: 500,
      fontFamily: ATL_FONT, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      letterSpacing: '-0.005em',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {!right && <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
      <span>{children}</span>
      {right && <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
    </button>
  )
}

// ─── Skeleton + Error Atlassian ──────────────────────────────────────────
function AtlSkeletonList({ T, dark }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: ATL_RADIUS,
          padding: 10, minHeight: 72,
          display: 'flex', flexDirection: 'column', gap: 6,
          opacity: 0.55,
          boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ height: 12, width: '60%', borderRadius: 3, background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7' }} />
            <div style={{ height: 14, width: '20%', borderRadius: 3, background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7' }} />
          </div>
          <div style={{ height: 9, width: '40%', borderRadius: 3, background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7' }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ height: 10, width: 40, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7' }} />
            <div style={{ height: 10, width: 50, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7' }} />
            <div style={{ height: 12, width: 50, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7', marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </>
  )
}

function AtlError({ T, dark, mensagem }) {
  const vermelho = corEtapa('red', dark)
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${vermelho}`,
      borderRadius: ATL_RADIUS,
      padding: 14,
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
        fontSize: 14, fontWeight: 600, color: vermelho,
        letterSpacing: '-0.005em',
      }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 16 }} aria-hidden="true" />
        <span>Erro ao carregar peças</span>
      </div>
      <div style={{ fontSize: 12, color: T.textMuted }}>{mensagem}</div>
    </div>
  )
}
