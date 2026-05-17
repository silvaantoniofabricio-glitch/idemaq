// idemaq-src/pages/Estoque.jsx
// Tela de Estoque — Peças + Máquinas (Módulo 06 do plano).
// MVP visual: tabelas `peca` e `maquina` já existem no Supabase mas a tela
// ainda lê mocks. Entrada manual e por NF (IA) ficam pra próximos chats.
// Visível pra todos os papéis (RLS no banco vai filtrar conforme o caso).

import React, { useState, useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL } from '../utils/fmt'
import { isAdmin } from '../utils/osHelpers'
import {
  Card, Button, Badge, Input, Tabs,
  EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'
import PecaDetalheModal from '../components/estoque/PecaDetalheModal'
import MaquinaDetalheModal from '../components/estoque/MaquinaDetalheModal'
import NovaPecaModal from '../components/estoque/NovaPecaModal'

// Mocks — futuro: lê de `peca` e `maquina` no Supabase
const PECAS_MOCK = [
  { id:1, nome:'Capa Brastemp 12kg',              sku:'CAP-BRA-12',  qtdAtual: 8, qtdMinima: 5, qtdMaxima: 20, custoAtual: 30, precoVenda: 85,  fornecedor:'ML' },
  { id:2, nome:'Mangueira admissão Consul',       sku:'MAN-CON-01',  qtdAtual: 2, qtdMinima: 5, qtdMaxima: 15, custoAtual: 18, precoVenda: 45,  fornecedor:'ML' },
  { id:3, nome:'Capacitor 8μF universal',         sku:'CAP-EL-08',   qtdAtual: 0, qtdMinima: 3, qtdMaxima: 12, custoAtual: 12, precoVenda: 35,  fornecedor:'ML' },
  { id:4, nome:'Filtro pluma LG 11kg',            sku:'FIL-LG-11',   qtdAtual:15, qtdMinima: 5, qtdMaxima: 30, custoAtual: 22, precoVenda: 65,  fornecedor:'Atacado MS' },
  { id:5, nome:'Correia transmissão Electrolux',  sku:'COR-ELE-01',  qtdAtual: 6, qtdMinima: 3, qtdMaxima: 12, custoAtual: 40, precoVenda: 110, fornecedor:'Atacado MS' },
  { id:6, nome:'Termostato Brastemp 220V',        sku:'TER-BRA-220', qtdAtual: 1, qtdMinima: 2, qtdMaxima: 8,  custoAtual: 55, precoVenda: 145, fornecedor:'ML' },
  { id:7, nome:'Bomba de drenagem Consul',        sku:'BOM-CON-01',  qtdAtual:12, qtdMinima: 4, qtdMaxima: 20, custoAtual: 65, precoVenda: 180, fornecedor:'Distribuidor SP' },
  { id:8, nome:'Placa eletrônica LG WD-1014',     sku:'PLA-LG-WD',   qtdAtual: 3, qtdMinima: 2, qtdMaxima: 6,  custoAtual: 280,precoVenda: 580, fornecedor:'Distribuidor SP' },
]

const MAQUINAS_MOCK = [
  { id:1, modelo:'Lavadora Consul CWE10',     marca:'Consul',   capacidade:'10kg', estado:'disponivel', custoCompra:150, custoItens:180, custoServico:50,  precoVenda:650 },
  { id:2, modelo:'Lavadora LG WD-1014',       marca:'LG',       capacidade:'11kg', estado:'disponivel', custoCompra:180, custoItens:200, custoServico:40,  precoVenda:650 },
  { id:3, modelo:'Brastemp Active BWL12',     marca:'Brastemp', capacidade:'12kg', estado:'em_revisao', custoCompra:120, custoItens:120, custoServico:55,  precoVenda:650 },
  { id:4, modelo:'Lavadora Consul Maré 8kg',  marca:'Consul',   capacidade:'8kg',  estado:'do_cliente',custoCompra:0,   custoItens:0,   custoServico:0,   precoVenda:0 },
  { id:5, modelo:'Electrolux LAC11',          marca:'Electrolux', capacidade:'11kg', estado:'vendida', custoCompra:165, custoItens:155, custoServico:45,  precoVenda:650 },
]

const ESTADO_MAQUINA = {
  disponivel: { label:'Disponível', variant:'verde',   icon:'ti-circle-check' },
  em_revisao: { label:'Em revisão', variant:'amarelo', icon:'ti-tool' },
  do_cliente: { label:'Do cliente', variant:'azul',    icon:'ti-user' },
  vendida:    { label:'Vendida',    variant:'neutro',  icon:'ti-circle-dashed' },
}

const ABAS = [
  { id:'pecas',    label:'Peças',    icon:'ti-puzzle' },
  { id:'maquinas', label:'Máquinas', icon:'ti-device-washing-machine' },
]

function nivelEstoque(qtd, min) {
  if (qtd <= 0) return 'esgotado'
  if (qtd <= min) return 'baixo'
  return 'ok'
}

function NivelBadge({ qtd, min, dark }) {
  const n = nivelEstoque(qtd, min)
  if (n === 'esgotado') {
    return (
      <Badge variant="vermelho" dark={dark} sm>
        <i className="ti ti-alert-octagon" aria-hidden="true" /> Esgotado
      </Badge>
    )
  }
  if (n === 'baixo') {
    return (
      <Badge variant="amarelo" dark={dark} sm>
        <i className="ti ti-alert-triangle" aria-hidden="true" /> Baixo
      </Badge>
    )
  }
  return (
    <Badge variant="azul" dark={dark} sm>
      <i className="ti ti-check" aria-hidden="true" /> OK
    </Badge>
  )
}

function pctLucro(custo, venda) {
  if (!custo || !venda) return 0
  return Math.round(((venda - custo) / custo) * 100)
}

export default function Estoque({ T, dark, user }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  // Funcionário não enxerga valores financeiros (custo, lucro, capital).
  // Só vê preço de venda + quantidade. Toggle único usado em todos os blocos.
  const mostraValores = isAdmin(user)
  const [aba, setAba] = useState('pecas')
  const [busca, setBusca] = useState('')
  const [pecas, setPecas] = useState(PECAS_MOCK)
  const [maquinas] = useState(MAQUINAS_MOCK)
  const [pecaAberta, setPecaAberta] = useState(null)
  const [maquinaAberta, setMaquinaAberta] = useState(null)
  const [novaPecaAberta, setNovaPecaAberta] = useState(false)

  function adicionarPeca(nova) {
    setPecas(prev => [
      { id: Math.max(0, ...prev.map(p => p.id)) + 1, ...nova },
      ...prev,
    ])
  }

  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  // Filtros
  const pecasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return pecas
    return pecas.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.fornecedor || '').toLowerCase().includes(q)
    )
  }, [pecas, busca])

  const maquinasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return maquinas
    return maquinas.filter(m =>
      m.modelo.toLowerCase().includes(q) ||
      m.marca.toLowerCase().includes(q) ||
      m.capacidade.toLowerCase().includes(q)
    )
  }, [maquinas, busca])

  // Stats
  const totalPecas = pecas.reduce((s, p) => s + p.qtdAtual, 0)
  const pecasBaixas = pecas.filter(p => nivelEstoque(p.qtdAtual, p.qtdMinima) !== 'ok').length
  const valorPecas = pecas.reduce((s, p) => s + p.qtdAtual * p.custoAtual, 0)

  const disponiveis = maquinas.filter(m => m.estado === 'disponivel').length
  const emRevisao = maquinas.filter(m => m.estado === 'em_revisao').length
  const valorMaquinas = maquinas
    .filter(m => m.estado === 'disponivel' || m.estado === 'em_revisao')
    .reduce((s, m) => s + (m.custoCompra + m.custoItens + m.custoServico), 0)

  const onPecas = aba === 'pecas'

  const headerStats = onPecas
    ? [
        { label: 'Itens em estoque', value: totalPecas,    color: azul },
        { label: 'Estoque baixo',    value: pecasBaixas,   color: pecasBaixas > 0 ? amarelo : T.textDim },
        // Valor em peças = custo × quantidade — só pro dono
        mostraValores && { label: 'Valor em peças', value: fmtBRL(valorPecas), color: corHero(dark) },
      ].filter(Boolean)
    : [
        { label: 'Disponíveis',  value: disponiveis,            color: disponiveis > 0 ? verde : T.textDim },
        { label: 'Em revisão',   value: emRevisao,              color: emRevisao > 0 ? amarelo : T.textDim },
        // Capital parado = soma dos custos das máquinas disponíveis/revisão — só pro dono
        mostraValores && { label: 'Capital parado', value: fmtBRL(valorMaquinas), color: corHero(dark) },
      ].filter(Boolean)

  function placeholder(msg) {
    notify('info', msg || 'Em breve — Módulo 06 do plano')
  }

  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Estoque"
        subtitle={onPecas
          ? `${pecasFiltradas.length} de ${pecas.length} peças${pecasBaixas > 0 ? ` · ${pecasBaixas} precisam de reposição` : ''}`
          : `${maquinasFiltradas.length} de ${maquinas.length} máquinas`}
        stats={headerStats}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" T={T} dark={dark}
              iconLeft="ti-file-upload"
              onClick={() => placeholder('Entrada por nota fiscal (IA) — próximos chats')}>
              Por NF
            </Button>
            <Button variant="primary" iconLeft="ti-plus"
              onClick={() => onPecas
                ? setNovaPecaAberta(true)
                : placeholder('Cadastro de máquina em breve')}>
              {onPecas ? 'Nova peça' : 'Nova máquina'}
            </Button>
          </div>
        }
      />

      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs T={T} dark={dark}
            options={ABAS}
            value={aba}
            onChange={(v) => { setAba(v); setBusca('') }}
            variant="segmented"
          />
          <div style={{ width: 1, height: 24, background: T.border }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input T={T} dark={dark}
              value={busca} onChange={setBusca}
              icon="ti-search"
              placeholder={onPecas
                ? 'Buscar peça por nome, SKU ou fornecedor…'
                : 'Buscar máquina por modelo, marca ou capacidade…'}
            />
          </div>
        </div>
      </Card>

      {onPecas
        ? <ListaPecas T={T} dark={dark} itens={pecasFiltradas} todos={pecas} busca={busca}
            mostraValores={mostraValores}
            onAbrir={(p) => setPecaAberta(p)} />
        : <ListaMaquinas T={T} dark={dark} itens={maquinasFiltradas} todos={maquinas} busca={busca}
            mostraValores={mostraValores}
            onAbrir={(m) => setMaquinaAberta(m)} />}

      {pecaAberta && (
        <PecaDetalheModal T={T} dark={dark}
          peca={pecaAberta}
          mostraValores={mostraValores}
          onClose={() => setPecaAberta(null)} />
      )}

      {maquinaAberta && (
        <MaquinaDetalheModal T={T} dark={dark}
          maquina={maquinaAberta}
          mostraValores={mostraValores}
          onClose={() => setMaquinaAberta(null)} />
      )}

      {novaPecaAberta && (
        <NovaPecaModal T={T} dark={dark}
          onClose={() => setNovaPecaAberta(false)}
          onSalvar={adicionarPeca} />
      )}
    </div>
  )
}

// =============================================================================
// PEÇAS
// =============================================================================
function ListaPecas({ T, dark, itens, todos, busca, onAbrir, mostraValores = true }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c

  // Grid muda conforme o papel: dono vê 6 colunas, funcionário 4 (sem Custo + Lucro)
  const gridCols = mostraValores
    ? '1fr 90px 110px 110px 90px 90px'
    : '1fr 90px 110px 90px'

  if (itens.length === 0) {
    return (
      <EmptyState T={T}
        icon={busca ? 'ti-search-off' : 'ti-puzzle-off'}
        title={busca ? 'Nenhuma peça encontrada' : 'Nenhuma peça cadastrada'}
        description={busca
          ? `Sem resultados para "${busca}".`
          : 'Cadastre a primeira peça pra começar a controlar o estoque.'}
        compact height="auto"
      />
    )
  }

  return (
    <Card T={T} dark={dark} padding={0}>
      <div style={{ padding: '12px 16px 10px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-puzzle" mb={0}
          action={
            <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
              {itens.length} de {todos.length}
            </span>
          }
        >Peças</SectionHeader>
      </div>

      {/* Cabeçalho da "tabela" */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: 10, alignItems: 'center',
        padding: '8px 16px',
        borderTop: `1px solid ${T.border}`,
        background: T.cardAlt,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <div>Item</div>
        <div style={{ textAlign: 'right' }}>Qtd</div>
        {mostraValores && <div style={{ textAlign: 'right' }}>Custo</div>}
        <div style={{ textAlign: 'right' }}>Venda</div>
        {mostraValores && <div style={{ textAlign: 'right' }}>Lucro</div>}
        <div style={{ textAlign: 'right' }}>Status</div>
      </div>

      {itens.map((p) => {
        const lucro = pctLucro(p.custoAtual, p.precoVenda)
        return (
          <div key={p.id}
            onClick={() => onAbrir(p)}
            role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(p) } }}
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: 10, alignItems: 'center',
              padding: '12px 16px',
              borderTop: `1px solid ${T.border}`,
              cursor: 'pointer',
              transition: 'background .12s',
              outline: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onFocus={e => e.currentTarget.style.background = T.cardAlt}
            onBlur={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: corHero(dark),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.nome}
              </div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2, display: 'flex', gap: 8 }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.sku}</span>
                <span>·</span>
                <span>{p.fornecedor}</span>
              </div>
            </div>

            <div style={{
              textAlign: 'right', fontSize: 13, fontWeight: 600,
              color: corHero(dark),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {p.qtdAtual}
              <span style={{ color: T.textDim, fontWeight: 400, fontSize: 11 }}> / {p.qtdMinima}</span>
            </div>

            {mostraValores && (
              <div style={{
                textAlign: 'right', fontSize: 12.5,
                color: T.textSecondary,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtBRL(p.custoAtual)}
              </div>
            )}

            <div style={{
              textAlign: 'right', fontSize: 13, fontWeight: 600,
              color: corHero(dark),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtBRL(p.precoVenda)}
            </div>

            {mostraValores && (
              <div style={{
                textAlign: 'right', fontSize: 12, fontWeight: 600,
                color: lucro > 100 ? corEtapa('blue', dark) : T.textSecondary,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {lucro}%
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <NivelBadge qtd={p.qtdAtual} min={p.qtdMinima} dark={dark} />
            </div>
          </div>
        )
      })}
    </Card>
  )
}

// =============================================================================
// MÁQUINAS
// =============================================================================
function ListaMaquinas({ T, dark, itens, todos, busca, onAbrir, mostraValores = true }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c

  if (itens.length === 0) {
    return (
      <EmptyState T={T}
        icon={busca ? 'ti-search-off' : 'ti-device-washing-machine-off'}
        title={busca ? 'Nenhuma máquina encontrada' : 'Nenhuma máquina no estoque'}
        description={busca
          ? `Sem resultados para "${busca}".`
          : 'Máquinas reformadas entram automaticamente ao concluir OS de Fabricação.'}
        compact height="auto"
      />
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 12,
    }}>
      {itens.map(m => {
        const est = ESTADO_MAQUINA[m.estado] || ESTADO_MAQUINA.disponivel
        const custoTotal = (m.custoCompra || 0) + (m.custoItens || 0) + (m.custoServico || 0)
        const lucro = pctLucro(custoTotal, m.precoVenda)
        const corEst = corEtapa(
          est.variant === 'verde' ? 'green'
          : est.variant === 'amarelo' ? 'yellow'
          : est.variant === 'azul' ? 'blue'
          : 'neutro',
          dark
        )

        return (
          <Card key={m.id} T={T} dark={dark} hover
            accent={corEst}
            onClick={() => onAbrir(m)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: corHero(dark),
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 3,
                }}>
                  {m.modelo}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', gap: 8 }}>
                  <span>{m.marca}</span>
                  <span>·</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.capacidade}</span>
                </div>
              </div>
              <Badge variant={est.variant} dark={dark} sm>
                <i className={`ti ${est.icon}`} aria-hidden="true" /> {est.label}
              </Badge>
            </div>

            {/* Bloco de números */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              padding: '10px 12px',
              background: T.cardAlt,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
            }}>
              <div>
                <div style={{
                  fontSize: 10, color: T.textMuted, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  marginBottom: 2,
                }}>
                  Custo total
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: corHero(dark),
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {custoTotal > 0 ? fmtBRL(custoTotal) : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 10, color: T.textMuted, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  marginBottom: 2,
                }}>
                  Venda
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: corHero(dark),
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {m.precoVenda > 0 ? fmtBRL(m.precoVenda) : '—'}
                </div>
              </div>
              {custoTotal > 0 && m.precoVenda > 0 && (
                <div style={{ gridColumn: '1 / -1', fontSize: 11, color: T.textMuted, paddingTop: 6, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Margem</span>
                  <span style={{ color: azul, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtBRL(m.precoVenda - custoTotal)} · {lucro}%
                  </span>
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
