// idemaq-src/pages/Clientes.jsx
// Tela de Clientes — lista real do Supabase (tabela `cliente`).
// Lote 1 do Módulo 00c: troca CLIENTES_MOCK por useClientes().
// NovoClienteModal próprio (substitui o NovoClienteModalCompleto do _legacy/,
// que continua sendo usado pela NovaOSModal — não tocar lá).
// Detalhe do cliente abre ClienteDetalheModal e lista as OS dele.

import React, { useState, useMemo } from 'react'
import { corEtapa, corHero } from '../utils/colors'
import { useIsMobile } from '../theme'
import { useClientes } from '../hooks/useClientes'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import {
  Card, Button, Input,
  EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'
import NovoClienteModal from '../components/clientes/NovoClienteModal'
import ClienteDetalheModal from '../components/clientes/ClienteDetalheModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

function iniciais(nome) {
  return (nome || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || '?'
}

// Detecta nome 'ruim' (telefone na coluna nome — comum na importacao Bling).
// Se o nome so tem digitos, + e separadores telefonicos -> trata como sem nome.
function nomeEhTelefone(nome) {
  if (!nome) return false
  const limpo = nome.trim()
  if (limpo.length < 3) return false
  // se removendo digitos, +, espacos, parenteses, traco, ponto sobra <2 chars
  const semFone = limpo.replace(/[\d+\-\s().]+/g, '').trim()
  return semFone.length < 2
}

function exibirNome(c) {
  if (nomeEhTelefone(c.nome)) return 'Cliente sem nome'
  return c.nome || 'Sem nome'
}

export default function Clientes({ T, dark }) {
  const cor = (d, c) => dark ? d : c
  const isMobile = useIsMobile()
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  const { clientes, loading, error, refetch, criar, atualizar, excluir } = useClientes()
  // useOSDetalheModal com buscando=true: pega TODAS as OS (inclusive concluídas >24h)
  // pra montar o histórico completo. Também expõe abrirOSPorId + modalProps.
  const { abrirOSPorId, modalProps, osList } = useOSDetalheModal({ notify, buscando: true })

  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteAberto, setClienteAberto] = useState(null)
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 20

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(c =>
      (c.nome     || '').toLowerCase().includes(q) ||
      (c.telefone || '').toLowerCase().includes(q) ||
      (c.endereco || '').toLowerCase().includes(q)
    )
  }, [clientes, busca])

  const buscando = busca.trim().length > 0
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function mudarBusca(v) {
    setBusca(v)
    setPagina(1)
  }

  function abrirFicha(c) {
    setClienteAberto(c)
  }

  async function salvarCliente(atualizado) {
    const { id, ...patch } = atualizado
    const { data, error: err } = await atualizar(id, patch)
    if (err) {
      notify('erro', err.message || 'Erro ao atualizar cliente')
      return { error: err }
    }
    notify('ok', 'Cliente atualizado')
    // Atualiza clienteAberto com dados novos — modal não fecha após salvar,
    // apenas volta pro modo visualização com as informações atualizadas.
    if (data) setClienteAberto(data)
    return { data }
  }

  async function excluirCliente(c) {
    if (!window.confirm(`Excluir o cliente "${c.nome}"? Isso só esconde da lista — o histórico fica preservado no banco.`)) return
    const { error: err } = await excluir(c.id)
    if (err) {
      notify('erro', err.message || 'Erro ao excluir cliente')
      return
    }
    setClienteAberto(null)
    notify('ok', 'Cliente excluído')
  }

  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* PageHeader so no desktop — no mobile o titulo ja aparece na topbar */}
      {!isMobile && (
        <PageHeader T={T} dark={dark}
          title="Clientes"
          subtitle={
            loading
              ? 'Carregando…'
              : `${clientes.length} ${clientes.length === 1 ? 'cadastrado' : 'cadastrados'}`
          }
          stats={[
            { label: 'Ativos', value: clientes.length, color: azul },
          ]}
          actions={
            <Button variant="primary" iconLeft="ti-plus" onClick={() => setModalNovo(true)}>
              Novo cliente
            </Button>
          }
        />
      )}

      {/* Busca + botao Novo cliente icone (so mobile) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input T={T} dark={dark}
            value={busca}
            onChange={mudarBusca}
            icon="ti-search"
            placeholder={isMobile ? 'Buscar nome, telefone ou endereço…' : 'Buscar por nome, telefone ou endereço…'}
          />
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={() => setModalNovo(true)}
            aria-label="Novo cliente"
            title="Novo cliente"
            style={{
              width: 32, height: 32, borderRadius: 3,
              background: azul, color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
              alignSelf: 'flex-end',
            }}>
            <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
        )}
      </div>

      {error && (
        <Card T={T} dark={dark} accent={corEtapa('red', dark)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-alert-triangle" style={{
              fontSize: 20, color: corEtapa('red', dark),
            }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: corHero(dark) }}>
                Erro ao carregar clientes
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                {error.message || 'Erro desconhecido'}
              </div>
            </div>
            <Button T={T} dark={dark} variant="secondary" size="sm"
              iconLeft="ti-refresh" onClick={refetch}>
              Tentar de novo
            </Button>
          </div>
        </Card>
      )}

      {loading && !error && (
        <Card T={T} dark={dark}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '24px 12px',
            color: T.textMuted, fontSize: 13,
          }}>
            <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
            Carregando clientes…
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
        </Card>
      )}

      {!loading && !error && filtrados.length === 0 && (
        <EmptyState T={T}
          icon={busca ? 'ti-search-off' : 'ti-user-off'}
          title={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={busca
            ? `Sem resultados para "${busca}".`
            : 'Cadastre o primeiro cliente pra começar.'}
          action={!busca && (
            <Button variant="primary" iconLeft="ti-plus" onClick={() => setModalNovo(true)}>
              Cadastrar
            </Button>
          )}
        />
      )}

      {!loading && !error && filtrados.length > 0 && (
        <Card T={T} dark={dark} padding={0}>
          <div style={{ padding: '12px 16px 10px' }}>
            <SectionHeader T={T} dark={dark} icon="ti-users" mb={0}
              action={
                <span style={{
                  fontSize: 11, color: T.textMuted,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {`${(paginaAtual - 1) * POR_PAGINA + 1}–${Math.min(paginaAtual * POR_PAGINA, filtrados.length)} de ${filtrados.length}${buscando ? ` (de ${clientes.length})` : ''}`}
                </span>
              }
            >Lista</SectionHeader>
          </div>

          {visiveis.map((c) => {
            const semNome = nomeEhTelefone(c.nome)
            return (
              <div key={c.id}
                onClick={() => abrirFicha(c)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirFicha(c) } }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: isMobile ? 10 : 14, alignItems: 'center',
                  padding: '12px 14px',
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
                {/* Avatar — icone person quando nome ruim, iniciais quando ok */}
                <div style={{
                  width: 36, height: 36, borderRadius: 4,
                  background: azul + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: azul,
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                }}>
                  {semNome
                    ? <i className="ti ti-user" style={{ fontSize: 17 }} aria-hidden="true" />
                    : iniciais(c.nome)}
                </div>

                {/* Stack: Nome + Endereco + Telefone */}
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
                      <i className="ti ti-map-pin"
                         style={{ fontSize: 11, flexShrink: 0 }}
                         aria-hidden="true" />
                      <span style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        flex: 1, minWidth: 0,
                      }}>{c.endereco}</span>
                    </div>
                  )}

                  {c.telefone && (
                    <div style={{
                      fontSize: 11.5, color: azul, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.005em',
                    }}>
                      <i className="ti ti-brand-whatsapp"
                         style={{ fontSize: 11, flexShrink: 0 }}
                         aria-hidden="true" />
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

          {totalPaginas > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, padding: '12px 16px',
              borderTop: `1px solid ${T.border}`,
            }}>
              <span style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                Página {paginaAtual} de {totalPaginas}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button T={T} dark={dark} variant="secondary" size="sm"
                  iconLeft="ti-chevron-left"
                  disabled={paginaAtual <= 1}
                  onClick={() => setPagina(p => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <Button T={T} dark={dark} variant="secondary" size="sm"
                  iconRight="ti-chevron-right"
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {modalNovo && (
        <NovoClienteModal
          T={T} dark={dark}
          nomeInicial={busca.trim()}
          criar={criar}
          onClose={() => setModalNovo(false)}
          onCriado={() => { /* useClientes já refetch internamente */ }}
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
