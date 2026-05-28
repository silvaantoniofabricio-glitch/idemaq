// idemaq-src/pages/mobile/EstoqueMobile.jsx
// Estoque mobile — Apple HIG.
// Seções: Large title + subtítulo · KPIs (inset card) · Tabs (segmented) ·
//          Sticky search+chips · Lista · FAB · Modais

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { corEtapa, corHero } from '../../utils/colors'
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

import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT,
  higType, higInsetCard,
} from '../../theme-hig'

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
    supabase.from('peca').select('id, categoria, qtd_atual, qtd_minima, custo_atual').is('deleted_at', null)
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
      m.modelo.toLowerCase().includes(q) || m.marca.toLowerCase().includes(q) || m.capacidade.toLowerCase().includes(q)
    )
  }, [maquinas, busca])

  const disponiveis   = maquinas.filter(m => m.estado === 'disponivel').length
  const emRevisao     = maquinas.filter(m => m.estado === 'em_revisao').length
  const valorMaquinas = maquinas
    .filter(m => ['disponivel', 'em_revisao'].includes(m.estado))
    .reduce((s, m) => s + m.custoCompra + m.custoItens + m.custoServico, 0)

  const onPecas      = aba === 'pecas'
  const buscando     = !!buscaDebounced.trim()
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE))

  const azul    = HIG_COLOR.tintIdemaq
  const amarelo = HIG_COLOR.orange
  const verde   = HIG_COLOR.green

  const kpis = onPecas
    ? [
        { label: 'Em estoque', value: emEstoque,              color: azul },
        { label: 'Reposição',  value: reposicao,              color: reposicao > 0 ? amarelo : T.textDim },
        mostraValores && { label: 'Valor',     value: fmtCompact(valorPecas), color: corHero(dark) },
        mostraValores && { label: 'Cadastros', value: totalGlobal,            color: T.textSecondary },
      ].filter(Boolean)
    : [
        { label: 'Disponíveis', value: disponiveis, color: disponiveis > 0 ? verde : T.textDim },
        { label: 'Em revisão',  value: emRevisao,   color: emRevisao > 0 ? amarelo : T.textDim },
        mostraValores && { label: 'Capital', value: fmtCompact(valorMaquinas), color: corHero(dark) },
      ].filter(Boolean)

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
      overflowY: 'auto',
      background: dark ? T.bg : HIG_COLOR.bgGrouped,
      paddingBottom: 140,
      fontFamily: HIG_FONT,
    }}>

      {/* ── HEADER: large title + subtítulo ───────────────────────────── */}
      <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px ${HIG_SPACE.xs}px` }}>
        <div style={{ ...higType('largeTitle'), color: T.textPrimary }}>Estoque</div>
        <div style={{ ...higType('footnote'), color: T.textMuted, marginTop: 2 }}>
          {subtitle}
        </div>
      </div>

      {/* ── KPIs: inset grouped card 2 colunas ─────────────────────────── */}
      <div style={{ padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.sm}px` }}>
        <div style={{
          ...higInsetCard(T, dark),
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
        }}>
          {kpis.map((k, i) => {
            const lastRow = i >= kpis.length - (kpis.length % 2 === 0 ? 2 : 1)
            const isRight = i % 2 === 1
            return (
              <div key={i} style={{
                padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
                borderBottom: !lastRow ? `0.5px solid ${T.border}` : 'none',
                borderLeft: isRight ? `0.5px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  ...higType('caption2'),
                  color: T.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 2,
                }}>{k.label}</div>
                <div style={{
                  ...higType('title2'),
                  fontWeight: 600,
                  color: k.color,
                  fontVariantNumeric: 'tabular-nums',
                }}>{k.value}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Segmented control (Peças/Máquinas) ─────────────────────────── */}
      <div style={{ padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xs}px` }}>
        <SegmentedHIG T={T} dark={dark}
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

      {/* ── STICKY: busca + chips ──────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: dark ? T.bg : HIG_COLOR.bgGrouped,
        paddingTop: HIG_SPACE.xs,
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}>
        {/* Search field HIG */}
        <div style={{
          padding: `0 ${HIG_SPACE.md}px`, position: 'relative',
          marginBottom: HIG_SPACE.xs,
        }}>
          <i className="ti ti-search" aria-hidden="true" style={{
            position: 'absolute', left: HIG_SPACE.md + 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 15, color: T.textDim, pointerEvents: 'none',
          }} />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder={onPecas ? 'Buscar peça por nome, SKU…' : 'Buscar máquina…'}
            style={{
              width: '100%', boxSizing: 'border-box',
              minHeight: 36,
              padding: `0 ${HIG_SPACE.md + 18}px 0 ${HIG_SPACE.md + 18}px`,
              borderRadius: HIG_RADIUS.card,
              border: 'none',
              background: dark ? T.cardAlt : HIG_COLOR.gray6,
              color: T.textPrimary,
              ...higType('body'),
              outline: 'none',
            }}
          />
          {busca && (
            <button onClick={() => setBusca('')} aria-label="Limpar" style={{
              position: 'absolute', right: HIG_SPACE.md + 6, top: '50%', transform: 'translateY(-50%)',
              width: 18, height: 18, borderRadius: 9,
              background: HIG_COLOR.gray3, color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Chips de categoria (pills HIG) */}
        {onPecas && chipsCat.length > 1 && (
          <div style={{
            display: 'flex', gap: 6,
            padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xs}px`,
            overflowX: 'auto', scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}>
            {chipsCat.map(cat => {
              const ativo = categoriaSel === cat.id
              return (
                <button key={cat.id} onClick={() => setCategoriaSel(cat.id)} style={{
                  flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px',
                  borderRadius: HIG_RADIUS.pill,
                  border: 'none',
                  background: ativo ? azul : (dark ? T.cardAlt : '#fff'),
                  color: ativo ? '#fff' : T.textSecondary,
                  ...higType('subheadline'),
                  fontWeight: ativo ? 600 : 400,
                  cursor: 'pointer',
                  minHeight: 32, whiteSpace: 'nowrap',
                  boxShadow: ativo ? 'none' : (dark ? 'none' : '0 0.5px 0 rgba(0,0,0,0.04)'),
                }}>
                  {cat.label}
                  {cat.badge != null && (
                    <span style={{
                      background: ativo ? 'rgba(255,255,255,0.25)' : HIG_COLOR.gray4,
                      color: ativo ? '#fff' : T.textMuted,
                      ...higType('caption2'),
                      fontWeight: 600,
                      padding: '1px 6px', borderRadius: HIG_RADIUS.pill,
                    }}>{cat.badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── LISTA ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        display: 'flex', flexDirection: 'column', gap: HIG_SPACE.xs,
      }}>
        {onPecas
          ? (loadingPecas
              ? <SkeletonHIG T={T} />
              : errorPecas
                ? <ErroHIG T={T} dark={dark} mensagem={errorPecas.message} />
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
                        onClick={() => setPecaAberta(p)}
                      />
                    )))
          : (maquinasFiltradas.length === 0
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
                    onClick={() => setMaquinaAberta(m)}
                  />
                )))}

        {onPecas && !buscando && !loadingPecas && totalPaginas > 1 && (
          <PaginacaoHIG T={T} dark={dark}
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            totalItens={totalFiltrado}
            pageSize={PAGE_SIZE}
            onPagina={setPaginaAtual}
          />
        )}
      </div>

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

// =============================================================================
// Segmented Control HIG — iOS UISegmentedControl
// =============================================================================
function SegmentedHIG({ T, dark, opcoes, ativo, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2, padding: 2,
      background: dark ? T.cardAlt : HIG_COLOR.gray5,
      borderRadius: HIG_RADIUS.card,
    }}>
      {opcoes.map(o => {
        const on = ativo === o.id
        return (
          <button key={o.id} onClick={() => onChange?.(o.id)} style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            minHeight: 32,
            padding: '0 12px',
            borderRadius: 7,
            background: on ? (dark ? T.card : '#fff') : 'transparent',
            color: T.textPrimary,
            border: 'none', cursor: 'pointer',
            ...higType('subheadline'),
            fontWeight: on ? 600 : 400,
            boxShadow: on
              ? (dark ? '0 0.5px 0 rgba(255,255,255,0.05)' : '0 3px 1px rgba(0,0,0,0.04), 0 3px 8px rgba(0,0,0,0.12)')
              : 'none',
            transition: 'background .15s',
          }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// =============================================================================
// Paginação HIG
// =============================================================================
function PaginacaoHIG({ T, dark, paginaAtual, totalPaginas, totalItens, pageSize, onPagina }) {
  const podeAnt  = paginaAtual > 1
  const podeProx = paginaAtual < totalPaginas
  const from = (paginaAtual - 1) * pageSize + 1
  const to   = Math.min(paginaAtual * pageSize, totalItens)

  return (
    <div style={{
      ...higInsetCard(T, dark),
      marginTop: HIG_SPACE.xxs,
      padding: HIG_SPACE.sm,
      display: 'flex', flexDirection: 'column', gap: HIG_SPACE.xs,
    }}>
      <div style={{
        ...higType('footnote'), color: T.textMuted, textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}>
        Exibindo <strong style={{ color: T.textSecondary }}>{from}–{to}</strong>{' '}
        de <strong style={{ color: T.textSecondary }}>{totalItens}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
        <BotaoPagHIG T={T} dark={dark} icone="ti-chevron-left" label="Anterior"
          disabled={!podeAnt} onClick={() => onPagina(Math.max(1, paginaAtual - 1))} />
        <span style={{
          ...higType('subheadline'), fontWeight: 600,
          color: T.textSecondary,
          padding: '0 8px', whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {paginaAtual} / {totalPaginas}
        </span>
        <BotaoPagHIG T={T} dark={dark} icone="ti-chevron-right" label="Próxima" iconeDireita
          disabled={!podeProx} onClick={() => onPagina(Math.min(totalPaginas, paginaAtual + 1))} />
      </div>
    </div>
  )
}

function BotaoPagHIG({ T, dark, icone, label, iconeDireita, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minHeight: HIG_SIZE.minTouchTarget,
      padding: '0 14px',
      background: disabled ? 'transparent' : (dark ? T.cardAlt : HIG_COLOR.gray6),
      color: disabled ? T.textDim : HIG_COLOR.tintIdemaq,
      border: 'none',
      borderRadius: HIG_RADIUS.card,
      ...higType('body'),
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    }}>
      {!iconeDireita && <i className={`ti ${icone}`} style={{ fontSize: 16 }} aria-hidden="true" />}
      <span>{label}</span>
      {iconeDireita && <i className={`ti ${icone}`} style={{ fontSize: 16 }} aria-hidden="true" />}
    </button>
  )
}

// =============================================================================
// Skeleton HIG
// =============================================================================
function SkeletonHIG({ T }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          ...higInsetCard(T, false),
          padding: HIG_SPACE.sm,
          minHeight: 72,
          display: 'flex', flexDirection: 'column', gap: 8,
          opacity: 0.55,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ height: 13, width: '60%', borderRadius: 4, background: T.border }} />
            <div style={{ height: 16, width: '20%', borderRadius: 4, background: T.border }} />
          </div>
          <div style={{ height: 10, width: '40%', borderRadius: 4, background: T.border }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ height: 11, width: 45, borderRadius: 4, background: T.border }} />
            <div style={{ height: 11, width: 55, borderRadius: 4, background: T.border }} />
            <div style={{ height: 14, width: 52, borderRadius: 8, background: T.border, marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </>
  )
}

function ErroHIG({ T, dark, mensagem }) {
  return (
    <div style={{
      ...higInsetCard(T, dark),
      padding: HIG_SPACE.md,
      color: HIG_COLOR.red,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
        ...higType('headline'),
      }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} aria-hidden="true" />
        <span>Erro ao carregar peças</span>
      </div>
      <div style={{ ...higType('footnote'), color: T.textMuted }}>{mensagem}</div>
    </div>
  )
}
