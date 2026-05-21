// idemaq-src/pages/mobile/EstoqueMobile.jsx
// Página mobile de Estoque (Peças + Máquinas) — Reestruturação 21/05/2026.
//
// Substitui o re-uso do Estoque desktop (que estourava em tela 360px com
// 6 colunas de tabela). Padrão mobile do app:
//   - MobilePageHeader com KPIs em grid 2x2
//   - Tabs Peças/Máquinas inline
//   - MobileSearchBar sticky no topo da lista
//   - MobileChipFilter pra categorias (scroll horizontal)
//   - Lista vertical de PecaCardMobile (touch ≥76px, status colorido na borda)
//   - Paginação grande no rodapé (only quando NÃO buscando + multi-página)
//   - MobileFAB + pra cadastro de peça (admin only)
//   - Modais reusam PecaDetalheModal/AjusteEstoqueModal com mobile={true}
//
// Reusa toda a lógica de dados do desktop (usePecas com filtros/paginação,
// statsRaw pros KPIs globais). Só o layout é otimizado pra touch.

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { isAdmin } from '../../utils/osHelpers'
import { useToast } from '../../components/ui'
import { CATEGORIAS_PECA } from '../../utils/categoriasPeca'
import { usePecas } from '../../hooks/usePecas'

import MobilePageHeader from '../../components/mobile/MobilePageHeader'
import MobileSearchBar  from '../../components/mobile/MobileSearchBar'
import MobileChipFilter from '../../components/mobile/MobileChipFilter'
import MobileFAB        from '../../components/mobile/MobileFAB'
import MobileEmptyState from '../../components/mobile/MobileEmptyState'
import PecaCardMobile   from '../../components/mobile/PecaCardMobile'
import MaquinaCardMobile from '../../components/mobile/MaquinaCardMobile'

import PecaDetalheModal    from '../../components/estoque/PecaDetalheModal'
import MaquinaDetalheModal from '../../components/estoque/MaquinaDetalheModal'
import NovaPecaModal       from '../../components/estoque/NovaPecaModal'

const PAGE_SIZE = 20

// Formata valor BRL compacto pra caber no KPI mobile (360px tem só ~155px
// por coluna). Acima de 1k vira "R$ 28k" / "R$ 1,2M". Abaixo fica fmt normal.
function fmtBRLCompact(v) {
  const n = Number(v) || 0
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `R$ ${m.toFixed(m < 10 ? 1 : 0).replace('.', ',')}M`
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return `R$ ${k.toFixed(k < 10 ? 1 : 0).replace('.', ',')}k`
  }
  return `R$ ${n.toFixed(0)}`
}

// Espelha o mock que o desktop usa enquanto Máquinas não está real (Módulo 07)
const MAQUINAS_MOCK = [
  { id:1, modelo:'Lavadora Consul CWE10',     marca:'Consul',     capacidade:'10kg', estado:'disponivel', custoCompra:150, custoItens:180, custoServico:50,  precoVenda:650 },
  { id:2, modelo:'Lavadora LG WD-1014',       marca:'LG',         capacidade:'11kg', estado:'disponivel', custoCompra:180, custoItens:200, custoServico:40,  precoVenda:650 },
  { id:3, modelo:'Brastemp Active BWL12',     marca:'Brastemp',   capacidade:'12kg', estado:'em_revisao', custoCompra:120, custoItens:120, custoServico:55,  precoVenda:650 },
  { id:4, modelo:'Lavadora Consul Maré 8kg',  marca:'Consul',     capacidade:'8kg',  estado:'do_cliente',custoCompra:0,   custoItens:0,   custoServico:0,   precoVenda:0 },
  { id:5, modelo:'Electrolux LAC11',          marca:'Electrolux', capacidade:'11kg', estado:'vendida',   custoCompra:165, custoItens:155, custoServico:45,  precoVenda:650 },
]

function nivelEstoque(qtd, min) {
  if (!min || min <= 0) return 'sem_controle'
  if (qtd <= 0) return 'esgotado'
  if (qtd <= min) return 'baixo'
  return 'ok'
}

export default function EstoqueMobile({ T, dark, user }) {
  const notify = useToast()
  const mostraValores = isAdmin(user)

  const [aba, setAba] = useState('pecas')
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [categoriaSel, setCategoriaSel] = useState('todas')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [refetchKey, setRefetchKey] = useState(0)

  const [pecaAberta, setPecaAberta] = useState(null)
  const [maquinaAberta, setMaquinaAberta] = useState(null)
  const [novaPecaAberta, setNovaPecaAberta] = useState(false)

  // Debounce 300ms na busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  // Reset pra pág 1 quando filtro/busca mudam
  useEffect(() => { setPaginaAtual(1) }, [categoriaSel, buscaDebounced])

  // Hook principal — paginação server-side, busca varre tudo (ver hook)
  const {
    pecas,
    total: totalFiltrado,
    loading: loadingPecas,
    error: errorPecas,
    criar: criarPeca,
    atualizar: atualizarPeca,
    ajustarEstoque: ajustarEstoquePeca,
  } = usePecas({
    categoria: categoriaSel,
    busca: buscaDebounced,
    page: paginaAtual,
    pageSize: PAGE_SIZE,
  })

  // Stats globais p/ KPIs do header e contagem por categoria
  const [statsRaw, setStatsRaw] = useState([])
  useEffect(() => {
    let alive = true
    supabase
      .from('peca')
      .select('id, categoria, qtd_atual, qtd_minima, custo_atual')
      .is('deleted_at', null)
      .then(({ data }) => {
        if (!alive) return
        setStatsRaw(data || [])
      })
    return () => { alive = false }
  }, [refetchKey])

  const [maquinas] = useState(MAQUINAS_MOCK)

  async function adicionarPeca(nova) {
    const res = await criarPeca(nova)
    if (!res.error) setRefetchKey(k => k + 1)
    return res
  }
  async function salvarEdicaoPeca(patch) {
    if (!pecaAberta) return { error: new Error('Sem peça aberta') }
    const { data, error } = await atualizarPeca(pecaAberta.id, patch)
    if (!error && data) { setPecaAberta(data); setRefetchKey(k => k + 1) }
    return { data, error }
  }
  async function ajustarEstoqueDaPeca(payload) {
    if (!pecaAberta) return { error: new Error('Sem peça aberta') }
    const { data, error } = await ajustarEstoquePeca(pecaAberta.id, payload)
    if (!error && data) { setPecaAberta(data); setRefetchKey(k => k + 1) }
    return { data, error }
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalGlobal = statsRaw.length
  const totalPecasQtd = statsRaw.reduce((s, p) => s + (p.qtd_atual || 0), 0)
  const pecasBaixas = statsRaw.filter(p => {
    const n = nivelEstoque(p.qtd_atual, p.qtd_minima)
    return n === 'esgotado' || n === 'baixo'
  }).length
  const valorPecas = statsRaw.reduce(
    (s, p) => s + (p.qtd_atual || 0) * Number(p.custo_atual || 0), 0
  )

  const contagemCat = useMemo(() => {
    const m = {}
    for (const p of statsRaw) {
      const k = p.categoria || 'outros'
      m[k] = (m[k] || 0) + 1
    }
    return m
  }, [statsRaw])

  // Filtragem mock pras máquinas (igual desktop)
  const maquinasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return maquinas
    return maquinas.filter(m =>
      m.modelo.toLowerCase().includes(q) ||
      m.marca.toLowerCase().includes(q) ||
      m.capacidade.toLowerCase().includes(q)
    )
  }, [maquinas, busca])

  const disponiveis = maquinas.filter(m => m.estado === 'disponivel').length
  const emRevisao = maquinas.filter(m => m.estado === 'em_revisao').length
  const valorMaquinas = maquinas
    .filter(m => m.estado === 'disponivel' || m.estado === 'em_revisao')
    .reduce((s, m) => s + (m.custoCompra + m.custoItens + m.custoServico), 0)

  const onPecas = aba === 'pecas'
  const buscando = !!buscaDebounced.trim()
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE))

  // ─── KPIs do header (2x2 quando dono / 1x2 quando funcionário) ────────────
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)

  const kpisPecas = [
    { label: 'Em estoque',  value: totalPecasQtd, color: azul },
    { label: 'Reposição',   value: pecasBaixas,   color: pecasBaixas > 0 ? amarelo : T.textDim },
    mostraValores && { label: 'Valor', value: fmtBRLCompact(valorPecas), color: corHero(dark) },
    mostraValores && { label: 'Cadastros', value: totalGlobal, color: T.textSecondary },
  ].filter(Boolean)

  const kpisMaquinas = [
    { label: 'Disponíveis', value: disponiveis, color: disponiveis > 0 ? verde : T.textDim },
    { label: 'Em revisão',  value: emRevisao,   color: emRevisao > 0 ? amarelo : T.textDim },
    mostraValores && { label: 'Capital parado', value: fmtBRLCompact(valorMaquinas), color: corHero(dark) },
  ].filter(Boolean)

  // ─── Categorias pro chip filter (Todas + as com count > 0) ────────────────
  const chipsCategorias = useMemo(() => {
    const out = [{ id: 'todas', label: 'Todas', badge: totalGlobal || null }]
    for (const cat of CATEGORIAS_PECA) {
      const c = contagemCat[cat.id]
      if (!c) continue
      out.push({ id: cat.id, label: cat.label, badge: c })
    }
    return out
  }, [contagemCat, totalGlobal])

  // Subtítulo do header
  const subtitle = onPecas
    ? (loadingPecas
        ? 'Carregando peças…'
        : buscando
          ? `${totalFiltrado} resultado${totalFiltrado === 1 ? '' : 's'} para "${buscaDebounced}"`
          : `Pág ${paginaAtual}/${totalPaginas} · ${pecas.length} de ${totalGlobal} peças`)
    : `${maquinasFiltradas.length} de ${maquinas.length} máquinas`

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
      // FAB tem 56px de altura + bottom 76 → ocupa de y=76 a y=132 do bottom.
      // BottomNav fica abaixo do FAB. Padding 140 garante que o último card e
      // a paginação não fiquem cobertos pelo FAB ao rolar até o fim.
      paddingBottom: 140,
      background: T.bg,
    }}>
      <MobilePageHeader T={T} dark={dark}
        title="Estoque"
        subtitle={subtitle}
        stats={onPecas ? kpisPecas : kpisMaquinas}
      />

      {/* Tabs Peças/Máquinas — segmented compacto */}
      <div style={{ padding: '4px 14px 8px' }}>
        <TabsMobile T={T} dark={dark}
          opcoes={[
            { id: 'pecas',    label: 'Peças',    icon: 'ti-puzzle' },
            { id: 'maquinas', label: 'Máquinas', icon: 'ti-device-washing-machine' },
          ]}
          ativo={aba}
          onChange={(v) => {
            setAba(v); setBusca(''); setBuscaDebounced(''); setCategoriaSel('todas'); setPaginaAtual(1)
          }}
        />
      </div>

      <MobileSearchBar T={T} dark={dark}
        sticky
        value={busca}
        onChange={setBusca}
        placeholder={onPecas
          ? 'Buscar peça por nome, SKU…'
          : 'Buscar máquina…'}
      />

      {/* Chips de categoria só na aba Peças */}
      {onPecas && chipsCategorias.length > 1 && (
        <MobileChipFilter T={T} dark={dark}
          opcoes={chipsCategorias}
          ativos={categoriaSel}
          onToggle={(id) => setCategoriaSel(id)}
          modo="single"
        />
      )}

      {/* Lista */}
      <div style={{
        padding: '4px 14px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {onPecas
          ? (loadingPecas
              ? <PecasSkeletonMobile T={T} dark={dark} />
              : errorPecas
                ? <ErroMobile T={T} dark={dark} mensagem={errorPecas.message} />
                : pecas.length === 0
                  ? <MobileEmptyState T={T} dark={dark}
                      icon={buscando ? 'ti-search-off' : 'ti-puzzle-off'}
                      iconColor={azul}
                      title={buscando ? 'Nenhuma peça encontrada' : 'Nenhuma peça cadastrada'}
                      description={buscando
                        ? `Sem resultados para "${buscaDebounced}"`
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
                    ? `Sem resultados para "${busca}"`
                    : 'Máquinas reformadas entram ao concluir OS de Fabricação.'} />
              : maquinasFiltradas.map(m => (
                  <MaquinaCardMobile key={m.id} T={T} dark={dark}
                    maquina={m}
                    mostraValores={mostraValores}
                    onClick={() => setMaquinaAberta(m)}
                  />
                )))}

        {/* Paginação — só na aba Peças, fora de busca, com mais de 1 página */}
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

      {/* FAB — só pro dono na aba Peças (cadastro de peça).
          Funcionário e aba Máquinas não têm ação primária aqui. */}
      {onPecas && mostraValores && (
        <MobileFAB T={T} dark={dark}
          icon="ti-plus"
          onClick={() => setNovaPecaAberta(true)}
        />
      )}

      {/* Modais — usam mobile={true} pra virar bottom sheet */}
      {pecaAberta && (
        <PecaDetalheModal T={T} dark={dark}
          peca={pecaAberta}
          mobile
          mostraValores={mostraValores}
          onSalvar={salvarEdicaoPeca}
          onAjustar={ajustarEstoqueDaPeca}
          onClose={() => setPecaAberta(null)} />
      )}
      {maquinaAberta && (
        <MaquinaDetalheModal T={T} dark={dark}
          maquina={maquinaAberta}
          mobile
          mostraValores={mostraValores}
          onClose={() => setMaquinaAberta(null)} />
      )}
      {novaPecaAberta && (
        <NovaPecaModal T={T} dark={dark}
          mobile
          onClose={() => setNovaPecaAberta(false)}
          onSalvar={adicionarPeca} />
      )}
    </div>
  )
}

// =============================================================================
// TABS MOBILE — segmented control compacto (touch ≥36px)
// =============================================================================
function TabsMobile({ T, dark, opcoes, ativo, onChange }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      display: 'flex', gap: 4,
      padding: 3,
      background: T.cardAlt,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
    }}>
      {opcoes.map(o => {
        const on = ativo === o.id
        return (
          <button key={o.id}
            onClick={() => onChange?.(o.id)}
            style={{
              flex: 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 12px',
              borderRadius: 8,
              background: on ? T.card : 'transparent',
              color: on ? azul : T.textMuted,
              border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
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
// PAGINAÇÃO MOBILE — botões grandes (≥48px), centro com pág atual
// =============================================================================
function PaginacaoMobile({ T, dark, paginaAtual, totalPaginas, totalItens, pageSize, onPagina }) {
  const podeAnt = paginaAtual > 1
  const podeProx = paginaAtual < totalPaginas
  const from = (paginaAtual - 1) * pageSize + 1
  const to = Math.min(paginaAtual * pageSize, totalItens)

  return (
    <div style={{
      marginTop: 8,
      padding: '12px 14px',
      background: T.cardAlt,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        fontSize: 11, color: T.textMuted, textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}>
        Exibindo <strong style={{ color: T.textSecondary, fontWeight: 700 }}>{from}–{to}</strong> de <strong style={{ color: T.textSecondary, fontWeight: 700 }}>{totalItens}</strong>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center',
      }}>
        <BotaoPag T={T} dark={dark}
          icone="ti-chevron-left" label="Anterior"
          disabled={!podeAnt}
          onClick={() => onPagina?.(Math.max(1, paginaAtual - 1))}
        />
        <span style={{
          fontSize: 12.5, color: T.textSecondary, fontWeight: 700,
          padding: '0 10px', whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {paginaAtual} / {totalPaginas}
        </span>
        <BotaoPag T={T} dark={dark}
          icone="ti-chevron-right" label="Próxima" iconeDireita
          disabled={!podeProx}
          onClick={() => onPagina?.(Math.min(totalPaginas, paginaAtual + 1))}
        />
      </div>
    </div>
  )
}

function BotaoPag({ T, dark, icone, label, iconeDireita, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        minHeight: 44,
        padding: '0 14px',
        background: disabled ? T.cardAlt : T.card,
        color: disabled ? T.textDim : T.textPrimary,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        fontFamily: 'inherit',
        fontSize: 13, fontWeight: 600,
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
function PecasSkeletonMobile({ T, dark }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderLeft: `3px solid ${T.border}`,
          borderRadius: 12,
          padding: '12px 14px',
          minHeight: 76,
          display: 'flex', flexDirection: 'column', gap: 8,
          opacity: 0.55,
        }}>
          <div style={{ height: 13, width: '65%', borderRadius: 4, background: T.border }} />
          <div style={{ height: 10, width: '40%', borderRadius: 4, background: T.border }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
            <div style={{ height: 11, width: 50, borderRadius: 4, background: T.border }} />
            <div style={{ height: 11, width: 60, borderRadius: 4, background: T.border }} />
            <div style={{ height: 14, width: 50, borderRadius: 6, background: T.border, marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </>
  )
}

function ErroMobile({ T, dark, mensagem }) {
  return (
    <div style={{
      padding: '16px',
      background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 12,
      color: corEtapa('red', dark),
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} aria-hidden="true" />
        <strong>Erro ao carregar peças</strong>
      </div>
      <div style={{ color: T.textMuted, fontSize: 11.5 }}>{mensagem}</div>
    </div>
  )
}
