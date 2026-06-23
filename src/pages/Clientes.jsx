// idemaq-src/pages/Clientes.jsx
// Reconstruída do zero (22/06/2026) — padrão Atlassian idêntico ao Kanban.jsx.
// Layout: flex-column + header sticky (borderBottom) + busca inline + lista scrollável.
// Linha 1 header: icon-box 32px · h1 · stats | "Novo cliente" button
// Linha 2 header: search input + contagem
// Content: lista de clientes com paginação

import React, { useState, useMemo } from 'react'
import { corEtapa, corHero } from '../utils/colors'
import { semAcento } from '../utils/fmt'
import { useIsMobile } from '../theme'
import { useClientes } from '../hooks/useClientes'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import { useToast, ModuleHeader } from '../components/ui'
import NovoClienteModal from '../components/clientes/NovoClienteModal'
import ClienteDetalheModal from '../components/clientes/ClienteDetalheModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

const POR_PAGINA = 20

function iniciais(nome) {
  return (nome || '?')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(p => p[0]?.toUpperCase()).join('') || '?'
}

function nomeEhTelefone(nome) {
  if (!nome) return false
  const limpo = nome.trim()
  if (limpo.length < 3) return false
  return limpo.replace(/[\d+\-\s().]+/g, '').trim().length < 2
}

function exibirNome(c) {
  if (nomeEhTelefone(c.nome)) return 'Cliente sem nome'
  return c.nome || 'Sem nome'
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function StatBadge({ v, label, color, dot }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 12 }}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: color, display: 'inline-block',
          alignSelf: 'center', flexShrink: 0,
        }} />
      )}
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
      <span style={{ color, opacity: 0.75 }}>{label}</span>
    </span>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Clientes({ T, dark }) {
  const isMobile = useIsMobile()
  const notify   = useToast()
  const azul     = corEtapa('blue', dark)
  const azulBg   = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'
  const vermelho  = corEtapa('red', dark)

  const { clientes, loading, error, refetch, criar, atualizar, excluir } = useClientes()
  const { abrirOSPorId, modalProps, osList } = useOSDetalheModal({ notify, buscando: true })

  const [busca, setBusca]         = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteAberto, setClienteAberto] = useState(null)
  const [pagina, setPagina]       = useState(1)

  const filtrados = useMemo(() => {
    const q = semAcento(busca.trim())
    if (!q) return clientes
    return clientes.filter(c =>
      semAcento(c.nome).includes(q) ||
      semAcento(c.telefone).includes(q) ||
      semAcento(c.endereco).includes(q)
    )
  }, [clientes, busca])

  const buscando     = busca.trim().length > 0
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual  = Math.min(pagina, totalPaginas)
  const visiveis     = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function mudarBusca(v) { setBusca(v); setPagina(1) }

  async function salvarCliente(atualizado) {
    const { id, ...patch } = atualizado
    const { data, error: err } = await atualizar(id, patch)
    if (err) { notify('erro', err.message || 'Erro ao atualizar cliente'); return { error: err } }
    notify('ok', 'Cliente atualizado')
    if (data) setClienteAberto(data)
    return { data }
  }

  async function excluirCliente(c) {
    if (!window.confirm(`Excluir "${c.nome}"? O histórico fica preservado no banco.`)) return
    const { error: err } = await excluir(c.id)
    if (err) { notify('erro', err.message || 'Erro ao excluir cliente'); return }
    setClienteAberto(null)
    notify('ok', 'Cliente excluído')
  }

  // ─── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minHeight: 0, overflow: 'hidden', background: T.bg,
    }}>

      {isMobile ? (
        /* ── Mobile: mantém header original simples ── */
        <div style={{ padding: '12px 16px 0', borderBottom: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: T.textDim, pointerEvents: 'none' }} aria-hidden="true" />
              <input type="search" value={busca} onChange={e => mudarBusca(e.target.value)}
                placeholder="Buscar por nome, telefone ou endereço…"
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 30, paddingRight: busca ? 28 : 10, paddingTop: 6, paddingBottom: 6, borderRadius: 4, border: `1px solid ${T.border}`, background: dark ? 'rgba(255,255,255,0.04)' : '#fff', color: T.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = azul}
                onBlur={e => e.target.style.borderColor = T.border}
              />
              {busca && <button onClick={() => mudarBusca('')} aria-label="Limpar busca" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: T.textDim, padding: 2, display: 'flex' }}><i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" /></button>}
            </div>
            <button type="button" onClick={() => setModalNovo(true)} aria-label="Novo cliente"
              style={{ width: 32, height: 32, borderRadius: 4, background: azul, color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
              <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        /* ── Desktop: ModuleHeader ── */
        <ModuleHeader
          T={T} dark={dark}
          icon="ti-users"
          title="Clientes"
          stats={loading ? [] : [
            { v: clientes.length, label: 'cadastrados', color: T.textSecondary },
            ...(buscando && filtrados.length !== clientes.length ? [{ v: filtrados.length, label: 'encontrados', color: azul, dot: true }] : []),
          ]}
          primaryAction={{ label: 'Novo cliente', icon: 'ti-plus', onClick: () => setModalNovo(true) }}
          filterSlot={<>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 160 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: T.textDim, pointerEvents: 'none' }} aria-hidden="true" />
              <input type="search" value={busca} onChange={e => mudarBusca(e.target.value)}
                placeholder="Nome, telefone ou endereço…"
                style={{ width: '100%', boxSizing: 'border-box', height: 22, paddingLeft: 26, paddingRight: busca ? 24 : 8, borderRadius: 4, border: `1px solid ${T.border}`, background: dark ? 'rgba(255,255,255,0.04)' : T.card, color: T.textPrimary, fontSize: 11, outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = azul}
                onBlur={e => e.target.style.borderColor = T.border}
              />
              {busca && <button onClick={() => mudarBusca('')} aria-label="Limpar busca" style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: T.textDim, padding: 2, display: 'flex' }}><i className="ti ti-x" style={{ fontSize: 11 }} aria-hidden="true" /></button>}
            </div>
            {!loading && !error && filtrados.length > 0 && (
              <span style={{ fontSize: 11, color: T.textDim, fontVariantNumeric: 'tabular-nums', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, filtrados.length)} de {filtrados.length}
                {buscando && filtrados.length !== clientes.length && ` (${clientes.length} total)`}
              </span>
            )}
          </>}
        />
      )}

      {/* ═══════════════════════════════════════════════════════
          CONTENT — lista scrollável
      ═══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Loading */}
        {loading && !error && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '48px 24px',
            color: T.textMuted, fontSize: 13,
          }}>
            <i className="ti ti-loader-2"
              style={{ fontSize: 20, animation: 'spin 1s linear infinite' }}
              aria-hidden="true" />
            Carregando clientes…
            <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Erro */}
        {error && !loading && (
          <div style={{
            margin: isMobile ? '16px' : '24px 22px',
            padding: '14px 16px',
            borderRadius: 4,
            border: `1px solid ${vermelho}44`,
            background: dark ? 'rgba(192,66,66,0.10)' : '#fff5f5',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <i className="ti ti-alert-triangle"
              style={{ fontSize: 20, color: vermelho, flexShrink: 0 }}
              aria-hidden="true" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
                Erro ao carregar clientes
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                {error.message || 'Erro desconhecido'}
              </div>
            </div>
            <button
              onClick={refetch}
              style={{
                padding: '5px 12px', borderRadius: 4,
                border: `1px solid ${T.border}`,
                background: 'transparent', color: T.textPrimary,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <i className="ti ti-refresh" style={{ fontSize: 13 }} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Vazio */}
        {!loading && !error && filtrados.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '56px 24px', gap: 12, textAlign: 'center',
          }}>
            <i className={`ti ${buscando ? 'ti-search-off' : 'ti-user-off'}`}
              style={{ fontSize: 40, color: T.textDim }}
              aria-hidden="true" />
            <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, letterSpacing: '-0.01em' }}>
              {buscando ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, maxWidth: 280 }}>
              {buscando
                ? `Sem resultados para "${busca}". Tente outro termo.`
                : 'Cadastre o primeiro cliente pra começar.'}
            </div>
            {!buscando && (
              <button
                onClick={() => setModalNovo(true)}
                style={{
                  marginTop: 4, padding: '8px 18px', borderRadius: 4,
                  background: azul, color: '#fff',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
                Cadastrar
              </button>
            )}
          </div>
        )}

        {/* Lista */}
        {!loading && !error && filtrados.length > 0 && (
          <div style={{
            background: T.card,
            borderBottom: `1px solid ${T.border}`,
          }}>
            {visiveis.map((c) => {
              const semNome = nomeEhTelefone(c.nome)
              return (
                <div
                  key={c.id}
                  onClick={() => setClienteAberto(c)}
                  role="button" tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setClienteAberto(c)
                    }
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: isMobile ? 10 : 14,
                    alignItems: 'center',
                    padding: isMobile ? '11px 14px' : '11px 22px',
                    borderBottom: `1px solid ${T.border}`,
                    cursor: 'pointer',
                    transition: 'background .1s',
                    outline: 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : '#F7F8F9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onFocus={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : '#F7F8F9'}
                  onBlur={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 4,
                    background: azul + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: azul,
                    letterSpacing: '0.5px', flexShrink: 0,
                  }}>
                    {semNome
                      ? <i className="ti ti-user" style={{ fontSize: 17 }} aria-hidden="true" />
                      : iniciais(c.nome)}
                  </div>

                  {/* Nome + endereço + telefone */}
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: 600,
                      color: semNome ? T.textMuted : T.textPrimary,
                      fontStyle: semNome ? 'italic' : 'normal',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      letterSpacing: '-0.005em',
                    }}>
                      {exibirNome(c)}
                    </div>
                    {c.endereco && (
                      <div style={{
                        fontSize: 11.5, color: T.textMuted,
                        display: 'flex', alignItems: 'center', gap: 5,
                        letterSpacing: '-0.005em',
                      }}>
                        <i className="ti ti-map-pin" style={{ fontSize: 11, flexShrink: 0 }} aria-hidden="true" />
                        <span style={{
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', flex: 1, minWidth: 0,
                        }}>{c.endereco}</span>
                      </div>
                    )}
                    {c.telefone && (
                      <div style={{
                        fontSize: 11.5, color: azul, fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.005em',
                      }}>
                        <i className="ti ti-brand-whatsapp" style={{ fontSize: 11, flexShrink: 0 }} aria-hidden="true" />
                        {c.telefone}
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <i className="ti ti-chevron-right"
                    style={{ fontSize: 14, color: T.textDim, flexShrink: 0 }}
                    aria-hidden="true" />
                </div>
              )
            })}

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: isMobile ? '12px 14px' : '12px 22px',
                borderTop: `1px solid ${T.border}`,
                background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
              }}>
                <span style={{
                  fontSize: 12, color: T.textMuted,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: 'Anterior', icon: 'ti-chevron-left', fn: () => setPagina(p => Math.max(1, p - 1)), disabled: paginaAtual <= 1 },
                    { label: 'Próxima',  icon: 'ti-chevron-right', fn: () => setPagina(p => Math.min(totalPaginas, p + 1)), disabled: paginaAtual >= totalPaginas, iconDir: 'right' },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.fn} disabled={btn.disabled}
                      style={{
                        padding: '5px 12px', borderRadius: 4,
                        border: `1px solid ${T.border}`,
                        background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
                        color: btn.disabled ? T.textDim : T.textPrimary,
                        fontSize: 12, fontWeight: 500,
                        cursor: btn.disabled ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', opacity: btn.disabled ? 0.5 : 1,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                      {!btn.iconDir && <i className={`ti ${btn.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />}
                      {btn.label}
                      {btn.iconDir && <i className={`ti ${btn.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modais */}
      {modalNovo && (
        <NovoClienteModal
          T={T} dark={dark}
          nomeInicial={busca.trim()}
          criar={criar}
          onClose={() => setModalNovo(false)}
          onCriado={() => {}}
        />
      )}

      {clienteAberto && (
        <ClienteDetalheModal
          T={T} dark={dark}
          mobile={isMobile}
          cliente={clienteAberto}
          osList={osList}
          onClose={() => setClienteAberto(null)}
          onSalvar={salvarCliente}
          onExcluir={() => excluirCliente(clienteAberto)}
          onAbrirOS={abrirOSPorId}
        />
      )}

      {modalProps && (
        <OSDetalhe {...modalProps} T={T} dark={dark} mobile={isMobile} />
      )}
    </div>
  )
}
