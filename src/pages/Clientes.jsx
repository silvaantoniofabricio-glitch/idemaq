// idemaq-src/pages/Clientes.jsx
// Tela de Clientes — lista real do Supabase (tabela `cliente`).
// Lote 1 do Módulo 00c: troca CLIENTES_MOCK por useClientes().
// NovoClienteModal próprio (substitui o NovoClienteModalCompleto do _legacy/,
// que continua sendo usado pela NovaOSModal — não tocar lá).
// Detalhe do cliente abre ClienteDetalheModal e lista as OS dele.

import React, { useState, useMemo } from 'react'
import { corEtapa, corHero } from '../utils/colors'
import { useClientes } from '../hooks/useClientes'
import { useOS } from '../hooks/useOS'
import {
  Card, Button, Input,
  EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'
import NovoClienteModal from '../components/clientes/NovoClienteModal'
import ClienteDetalheModal from '../components/clientes/ClienteDetalheModal'

function iniciais(nome) {
  return (nome || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || '?'
}

export default function Clientes({ T, dark }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  const { clientes, loading, error, refetch, criar, atualizar, excluir } = useClientes()
  // useOS com buscando=true: pega TODAS as OS (inclusive concluídas >24h)
  // pra montar o histórico completo dentro do ClienteDetalheModal.
  const { osList } = useOS(true)

  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteAberto, setClienteAberto] = useState(null)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(c =>
      (c.nome     || '').toLowerCase().includes(q) ||
      (c.telefone || '').toLowerCase().includes(q) ||
      (c.endereco || '').toLowerCase().includes(q)
    )
  }, [clientes, busca])

  function abrirFicha(c) {
    setClienteAberto(c)
  }

  async function salvarCliente(atualizado) {
    const { id, ...patch } = atualizado
    const { error: err } = await atualizar(id, patch)
    if (err) {
      notify('erro', err.message || 'Erro ao atualizar cliente')
      return
    }
    setClienteAberto(null)
    notify('ok', 'Cliente atualizado')
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
      <PageHeader T={T} dark={dark}
        title="Clientes"
        subtitle={
          loading
            ? 'Carregando…'
            : `${clientes.length} ${clientes.length === 1 ? 'cadastrado' : 'cadastrados'}`
        }
        stats={[
          { label: 'Ativos', value: clientes.length, color: azul },
          // TODO Lote 2: cruzar com OS pra calcular "OS no mês" e "Inadimplentes"
        ]}
        actions={
          <Button variant="primary" iconLeft="ti-plus" onClick={() => setModalNovo(true)}>
            Novo cliente
          </Button>
        }
      />

      <Card T={T} dark={dark}>
        <Input T={T} dark={dark}
          value={busca}
          onChange={setBusca}
          icon="ti-search"
          placeholder="Buscar por nome, telefone ou endereço…"
        />
      </Card>

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
                  {filtrados.length} de {clientes.length}
                </span>
              }
            >Lista</SectionHeader>
          </div>

          {filtrados.map((c) => (
            <div key={c.id}
              onClick={() => abrirFicha(c)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirFicha(c) } }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 14, alignItems: 'center',
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
              {/* Avatar com iniciais */}
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: cor('#0d2035', '#e6f1fb'),
                border: `1px solid ${azul}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: azul,
                letterSpacing: '.5px',
                flexShrink: 0,
              }}>
                {iniciais(c.nome)}
              </div>

              {/* Nome + endereço */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 600,
                  color: corHero(dark),
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.nome}
                </div>
                <div style={{
                  fontSize: 11, color: T.textMuted, marginTop: 3,
                  display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                }}>
                  <i className="ti ti-map-pin" style={{ fontSize: 12 }} aria-hidden="true" />
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 360,
                  }}>{c.endereco || '—'}</span>
                </div>
              </div>

              {/* Telefone (WhatsApp) + chevron sutil */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  fontSize: 12, color: T.textSecondary,
                  fontVariantNumeric: 'tabular-nums',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <i className="ti ti-brand-whatsapp"
                     style={{ fontSize: 14, color: azul }} aria-hidden="true" />
                  {c.telefone || '—'}
                </div>
                <i className="ti ti-chevron-right"
                   style={{ fontSize: 16, color: T.textDim }} aria-hidden="true" />
              </div>
            </div>
          ))}
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
          cliente={clienteAberto}
          osList={osList}
          onClose={() => setClienteAberto(null)}
          onSalvar={salvarCliente}
          onExcluir={() => excluirCliente(clienteAberto)}
        />
      )}
    </div>
  )
}
