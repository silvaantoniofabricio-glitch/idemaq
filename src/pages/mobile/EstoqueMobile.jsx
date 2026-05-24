// idemaq-src/pages/mobile/EstoqueMobile.jsx
// Versão mobile do Estoque — reescrita sobre a base do desktop (Estoque.jsx).
//
// Estrutura:
//   Header   — título + KPIs 2×2 + tabs Peças/Máquinas (scrolla com conteúdo)
//   StickyBar — busca + chips de categoria (gruda no topo ao rolar)
//   Lista     — PecaCardMobile | MaquinaCardMobile + paginação
//   FAB       — cadastro de peça (admin only)
//   Modais    — PecaDetalheModal / MaquinaDetalheModal / NovaPecaModal

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

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setBD(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  // Reset paginação quando filtro/busca mudam
  useEffect(() => { setPaginaAtual(1) }, [categoriaSel, buscaDebounced])

  const {
    pecas, total: totalFiltrado, loading: loadingPecas, error: errorPecas,
    criar, atualizar, ajustarEstoque,
  } = usePecas({ categoria: categoriaSel, busca: buscaDebounced, page: paginaAtual, pageSize: PAGE_SIZE })

  // Stats globais (KPIs do header + contagem por categoria)
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

  // ─── Stats derivados ─────────────────────────────────────────────────────
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

  const onPecas     = aba === 'pecas'
  const buscando    = !!buscaDebounced.trim()
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE))

  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde   = corEtapa('green', dark)

  // KPIs
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

  // Chips de categoria
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
      paddingBottom: 140,
    }}>

      {/* ── HEADER: título + KPIs + tabs ──────────────────────────────── */}
      <div style={{ padding: '12px 14px 0' }}>
        {/* Título */}
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: T.textPrimary,
            letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>Estoque</div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>
        </div>

        {/* KPI grid 2×2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 12,
        }}>
          {kpis.map((k, i) => (
            <div key={i} style={{
              background: T.cardAlt, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: '10px 12px',
            }}>
              <div style={{
                fontSize: 9.5, color: T.textMuted, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3,
              }}>{k.label}</div>
              <div style={{
                fontSize: 20, fontWeight: 700, color: k.color,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em',
              }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs Peças / Máquinas */}
        <TabsMobile T={T} dark={dark}
          opcoes={[
            { id: 'pecas',    label: 'Peças',    icon: 'ti-puzzle' },
            { id: 'maquinas', label: 'Máquinas', icon: 'ti-device-washing-machine' },
          ]}
          ativo={aba}
          onChange={(v) => {
            setAba(v); setBusca(''); setBD(''); setCategoriaSel('todas'); setPaginaAtual(1)
          }}
        />
      </div>

      {/* ── BARRA STICKY: busca + chips (agrupados pra grudar juntos) ──── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.bg,
        borderBottom: `1px solid ${T.border}`,
        paddingTop: 8,
      }}>
        {/* Campo de busca */}
        <div style={{ padding: '0 14px', position: 'relative', marginBottom: 6 }}>
          <i className="ti ti-search" aria-hidden="true" style={{
            position: 'absolute', left: 26, top: '50%', transform: 'translateY(-50%)',
            fontSize: 15, color: T.textDim, pointerEvents: 'none',
          }} />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder={onPecas ? 'Buscar peça por nome, SKU…' : 'Buscar máquina…'}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 36px 10px 38px',
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: T.cardAlt,
              color: T.textPrimary,
              fontSize: 13.5, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {busca && (
            <button onClick={() => setBusca('')} aria-label="Limpar busca" style={{
              position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
              width: 22, height: 22, borderRadius: 11,
              background: T.border, color: T.card,
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Chips de categoria (só na aba Peças) */}
        {onPecas && chipsCat.length > 1 && (
          <div style={{
            display: 'flex', gap: 6,
            padding: '0 14px 8px',
            overflowX: 'auto', scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}>
            {chipsCat.map(cat => {
              const ativo = categoriaSel === cat.id
              return (
                <button key={cat.id} onClick={() => setCategoriaSel(cat.id)} style={{
                  flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 13px', borderRadius: 18,
                  border: `1px solid ${ativo ? azul : T.border}`,
                  background: ativo ? `${azul}18` : T.card,
                  color: ativo ? azul : T.textSecondary,
                  fontSize: 12, fontWeight: ativo ? 700 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  minHeight: 34, whiteSpace: 'nowrap',
                }}>
                  {cat.label}
                  {cat.badge != null && (
                    <span style={{
                      background: ativo ? azul : T.textMuted, color: '#fff',
                      fontSize: 9.5, fontWeight: 700,
                      padding: '1px 5px', borderRadius: 8,
                    }}>{cat.badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── LISTA ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {onPecas
          ? (loadingPecas
              ? <SkeletonMobile T={T} />
              : errorPecas
                ? <ErroMobile T={T} dark={dark} mensagem={errorPecas.message} />
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

        {/* Paginação — só Peças, fora de busca, múltiplas páginas */}
        {onPecas && !buscando && !loadingPecas && totalPaginas > 1 && (
          <PaginacaoMobile T={T} dark={dark}
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            totalItens={totalFiltrado}
            pageSize={PAGE_SIZE}
            onPagina={setPaginaAtual}
          />
        )}
      </div>

      {/* FAB — cadastro de peça, só admin na aba Peças */}
      {onPecas && mostraValores && (
        <MobileFAB T={T} dark={dark} icon="ti-plus" onClick={() => setNovaPeca(true)} />
      )}

      {/* Modais */}
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
// TABS MOBILE — segmented control compacto
// =============================================================================
function TabsMobile({ T, dark, opcoes, ativo, onChange }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 3,
      background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
      marginBottom: 4,
    }}>
      {opcoes.map(o => {
        const on = ativo === o.id
        return (
          <button key={o.id} onClick={() => onChange?.(o.id)} style={{
            flex: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 12px', borderRadius: 8,
            background: on ? T.card : 'transparent',
            color: on ? azul : T.textMuted,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: on ? 700 : 500,
            boxShadow: on && !dark ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            minHeight: 38,
          }}>
            {o.icon && <i className={`ti ${o.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// =============================================================================
// PAGINAÇÃO MOBILE — botões grandes (≥44px)
// =============================================================================
function PaginacaoMobile({ T, dark, paginaAtual, totalPaginas, totalItens, pageSize, onPagina }) {
  const podeAnt  = paginaAtual > 1
  const podeProx = paginaAtual < totalPaginas
  const from = (paginaAtual - 1) * pageSize + 1
  const to   = Math.min(paginaAtual * pageSize, totalItens)

  return (
    <div style={{
      marginTop: 4, padding: '12px 14px',
      background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        fontSize: 11.5, color: T.textMuted, textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}>
        Exibindo <strong style={{ color: T.textSecondary }}>{from}–{to}</strong>{' '}
        de <strong style={{ color: T.textSecondary }}>{totalItens}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
        <BotaoPag T={T} dark={dark} icone="ti-chevron-left" label="Anterior"
          disabled={!podeAnt} onClick={() => onPagina(Math.max(1, paginaAtual - 1))} />
        <span style={{
          fontSize: 13, color: T.textSecondary, fontWeight: 700,
          padding: '0 8px', whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {paginaAtual} / {totalPaginas}
        </span>
        <BotaoPag T={T} dark={dark} icone="ti-chevron-right" label="Próxima" iconeDireita
          disabled={!podeProx} onClick={() => onPagina(Math.min(totalPaginas, paginaAtual + 1))} />
      </div>
    </div>
  )
}

function BotaoPag({ T, dark, icone, label, iconeDireita, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minHeight: 44, padding: '0 14px',
      background: disabled ? T.cardAlt : T.card,
      color: disabled ? T.textDim : T.textPrimary,
      border: `1px solid ${T.border}`, borderRadius: 10,
      fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    }}>
      {!iconeDireita && <i className={`ti ${icone}`} style={{ fontSize: 16 }} aria-hidden="true" />}
      <span>{label}</span>
      {iconeDireita && <i className={`ti ${icone}`} style={{ fontSize: 16 }} aria-hidden="true" />}
    </button>
  )
}

// =============================================================================
// SKELETON — 6 cards fantasma enquanto a primeira página carrega
// =============================================================================
function SkeletonMobile({ T }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderLeft: `3px solid ${T.border}`,
          borderRadius: 12, padding: '12px 14px',
          minHeight: 76, display: 'flex', flexDirection: 'column', gap: 8,
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

function ErroMobile({ T, dark, mensagem }) {
  return (
    <div style={{
      padding: 16,
      background: T.cardAlt, border: `1px solid ${T.border}`,
      borderRadius: 12, color: corEtapa('red', dark), fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} aria-hidden="true" />
        <strong>Erro ao carregar peças</strong>
      </div>
      <div style={{ color: T.textMuted, fontSize: 11.5 }}>{mensagem}</div>
    </div>
  )
}
