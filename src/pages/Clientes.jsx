// idemaq-src/pages/Clientes.jsx
// Tela de Clientes — listagem + busca + cadastro.
// Reaproveita NovoClienteModalCompleto do _legacy (já usado pela Nova OS).
// Detalhe completo (ficha) fica pro Módulo 02 — botão "Abrir" toasta por enquanto.

import React, { useState, useMemo } from 'react'
import { P } from '../theme'
import { corEtapa, corHero } from '../utils/colors'
import { CLIENTES_MOCK } from '../utils/osData'
import {
  Card, Button, Badge, Input,
  EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'
import { NovoClienteModalCompleto } from '../_legacy/desktopKanbanModals'

// Adapta o mock antigo (endereco: string) pro formato novo (enderecos: array).
// Idêntico ao adaptador do desktopKanbanModals — replicado aqui pra não importar
// helper interno do _legacy (regra: importar componentes, não funções internas).
function adaptarClientes(lista) {
  return (lista || []).map(c => ({
    ...c,
    enderecos: c.enderecos && Array.isArray(c.enderecos) && c.enderecos.length > 0
      ? c.enderecos
      : (c.endereco ? [c.endereco] : []),
  }))
}

function iniciais(nome) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('')
}

export default function Clientes({ T, dark }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const [clientes, setClientes] = useState(() => adaptarClientes(CLIENTES_MOCK))
  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState(false)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.fone || '').toLowerCase().includes(q) ||
      (c.enderecos[0] || '').toLowerCase().includes(q)
    )
  }, [clientes, busca])

  function clienteCadastrado(novo) {
    setClientes(prev => [novo, ...prev])
    notify('ok', 'Cliente cadastrado')
  }

  function abrirFicha(c) {
    notify('info', `Ficha do ${c.nome.split(' ')[0]} — em breve (Módulo 02)`)
  }

  const azul = corEtapa('blue', dark)

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
        subtitle={`${clientes.length} ${clientes.length === 1 ? 'cadastrado' : 'cadastrados'}`}
        stats={[
          { label: 'Cadastrados', value: clientes.length, color: azul },
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

      {filtrados.length === 0 ? (
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
      ) : (
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

          {filtrados.map((c, i) => {
            const endereco = c.enderecos[0] || '—'
            const extraEnd = c.enderecos.length > 1 ? `+${c.enderecos.length - 1}` : null
            return (
              <div key={c.id}
                onClick={() => abrirFicha(c)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: 14, alignItems: 'center',
                  padding: '12px 16px',
                  borderTop: `1px solid ${T.border}`,
                  cursor: 'pointer',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
                    }}>{endereco}</span>
                    {extraEnd && (
                      <Badge variant="neutro" dark={dark} sm>{extraEnd}</Badge>
                    )}
                  </div>
                </div>

                {/* Telefone (WhatsApp) */}
                <div style={{
                  fontSize: 12, color: T.textSecondary,
                  fontVariantNumeric: 'tabular-nums',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <i className="ti ti-brand-whatsapp"
                     style={{ fontSize: 14, color: azul }} aria-hidden="true" />
                  {c.fone || '—'}
                </div>

                {/* Ação */}
                <Button variant="ghost" size="sm" iconRight="ti-chevron-right"
                  onClick={(e) => { e.stopPropagation(); abrirFicha(c) }}>
                  Abrir
                </Button>
              </div>
            )
          })}
        </Card>
      )}

      {modalNovo && (
        <NovoClienteModalCompleto
          T={T} dark={dark}
          nomeInicial={busca.trim()}
          onClose={() => setModalNovo(false)}
          onSalvar={clienteCadastrado}
        />
      )}
    </div>
  )
}
