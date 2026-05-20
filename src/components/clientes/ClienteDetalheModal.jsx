// idemaq-src/components/clientes/ClienteDetalheModal.jsx
// Detalhe do cliente — visualização + edição inline + lista de OS dele.
//
// Schema REAL da tabela `cliente` (sem cidade/uf/cep separados):
//   id, nome, telefone, email, endereco, observacoes
// Concatenar cidade/uf/cep no campo `endereco` (memória project_schema_cliente_real).
//
// HistoricoOS recebe `osList` (do useOS no pai) por prop e filtra por cliente_id
// em memória — evita disparar query por modal aberto e reaproveita Realtime.
// Clique numa linha chama onAbrirOS(id) — o pai abre OSDetalhe.

import React, { useState, useMemo } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { TIPOS_OS } from '../../utils/osData'
import { fmtBRL } from '../../utils/fmt'
import { Modal, Input, Textarea, Button } from '../ui'

function iniciais(nome) {
  return (nome || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || '?'
}

function labelEtapa(os) {
  const cfg = TIPOS_OS[os.tipo]
  const e = cfg?.etapas?.find(x => x.id === os.etapa) || cfg?.lateral
  return e?.curto || e?.label || os.etapa
}

function fmtDataCurta(iso) {
  if (!iso) return '—'
  // useOS retorna "YYYY-MM-DD HH:mm" (timezone Cuiabá já aplicado).
  // Safari não parseia esse formato sem T — normalizamos antes.
  const d = new Date(typeof iso === 'string' ? iso.replace(' ', 'T') : iso)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function clienteParaForm(c) {
  return {
    nome:        c.nome        || '',
    telefone:    c.telefone    || '',
    endereco:    c.endereco    || '',
    email:       c.email       || '',
    observacoes: c.observacoes || '',
  }
}

export default function ClienteDetalheModal({
  T, dark, cliente, mobile,
  osList = [], // lista completa do useOS no pai — HistoricoOS filtra por cliente_id
  onClose,
  onSalvar,    // (cliente) => Promise<void>  · com .id incluso
  onExcluir,   // () => Promise<void>  · parent trata confirmação
  onAbrirOS,   // (osId) => void · pai abre OSDetalhe pra essa OS
}) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const initial = useMemo(() => clienteParaForm(cliente), [cliente])
  const [form, setForm] = useState(initial)
  const [salvando, setSalvando] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const obrigatoriosOk = !!form.nome.trim() && !!form.telefone.trim()
  const alterado = useMemo(() => {
    return Object.keys(initial).some(k => (form[k] || '') !== (initial[k] || ''))
  }, [form, initial])
  const podeSalvar = obrigatoriosOk && alterado && !salvando

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    await onSalvar?.({
      id:          cliente.id,
      nome:        form.nome.trim(),
      telefone:    form.telefone.trim() || null,
      endereco:    form.endereco.trim() || null,
      email:       form.email.trim() || null,
      observacoes: form.observacoes.trim() || null,
    })
    setSalvando(false)
  }

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={620}>
      {/* Header com avatar + nome */}
      <div style={{
        padding: '14px 20px 14px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: cor('#0d2035', '#e6f1fb'),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: `linear-gradient(135deg, ${azul}, ${cor('#3a7bbf', '#2860a0')})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff',
            letterSpacing: '.5px', flexShrink: 0,
            boxShadow: `0 4px 12px ${azul}33`,
          }}>
            {iniciais(form.nome || cliente.nome)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: corHero(dark),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{form.nome || cliente.nome}</div>
            <div style={{
              fontSize: 11, color: T.textMuted, marginTop: 3,
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }}>
              <i className="ti ti-brand-whatsapp" style={{ fontSize: 12, color: azul }} aria-hidden="true" />
              <span>{form.telefone || cliente.telefone || '—'}</span>
              {alterado && (
                <>
                  <span style={{ width: 3, height: 3, background: T.textMuted, borderRadius: '50%' }} />
                  <span style={{ color: corEtapa('yellow', dark), fontWeight: 600 }}>
                    <i className="ti ti-pencil" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
                    alterações pendentes
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.textMuted, padding: 6, borderRadius: 6, flexShrink: 0,
          }}>
          <i className="ti ti-x" style={{ fontSize: 22 }} aria-hidden="true" />
        </button>
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

        {/* Dados pessoais */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-user" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Dados pessoais</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <Input T={T} dark={dark} label="Nome completo *"
              value={form.nome} onChange={v => update('nome', v)}
              placeholder="Ex: Maria Silva" />
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <Input T={T} dark={dark} label="Telefone *" type="tel"
                value={form.telefone} onChange={v => update('telefone', v)}
                icon="ti-brand-whatsapp"
                placeholder="(67) 9 0000-0000" />
              <Input T={T} dark={dark} label="E-mail" type="email"
                value={form.email} onChange={v => update('email', v)}
                icon="ti-mail"
                placeholder="cliente@email.com" />
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Endereço (campo único — cidade/uf/cep concatenam aqui) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Endereço</span>
          </div>
          <Input T={T} dark={dark}
            value={form.endereco} onChange={v => update('endereco', v)}
            icon="ti-map-pin"
            placeholder="Rua, número, bairro — cidade/UF — CEP" />
        </div>

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Observações */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-notes" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Observações</span>
          </div>
          <Textarea T={T} dark={dark}
            value={form.observacoes} onChange={v => update('observacoes', v)}
            placeholder="Ex: cliente recorrente, prefere atendimento pela manhã…"
            rows={3} />
        </div>

        <div style={{ height: 1, background: T.border, margin: '18px 0 14px' }} />

        {/* Histórico de OS — filtra osList do useOS (montado no pai) */}
        <HistoricoOS
          T={T} dark={dark}
          clienteId={cliente.id}
          osList={osList}
          onAbrirOS={onAbrirOS}
        />
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        background: T.cardAlt, flexShrink: 0,
      }}>
        <Button T={T} dark={dark} variant="ghost" iconLeft="ti-trash"
          onClick={onExcluir} disabled={salvando}>
          Excluir cliente
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button T={T} dark={dark} variant="secondary" onClick={onClose} disabled={salvando}>
            {alterado ? 'Cancelar' : 'Fechar'}
          </Button>
          <Button variant="primary"
            iconLeft={salvando ? 'ti-loader-2' : 'ti-check'}
            disabled={!podeSalvar} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Histórico de OS deste cliente ────────────────────────────────────────
// Filtra a osList do useOS (recebida do pai) por cliente_id em memória.
// Reaproveita Realtime do useOS sem disparar query nova por abertura de modal.
// Clique chama onAbrirOS(id) — pai abre OSDetalhe.
function HistoricoOS({ T, dark, clienteId, osList, onAbrirOS }) {
  const azul = corEtapa('blue', dark)

  const osCliente = useMemo(() => {
    return (osList || [])
      .filter(o => o.cliente_id === clienteId)
      .slice()
      .sort((a, b) => new Date(b.abertura) - new Date(a.abertura))
  }, [osList, clienteId])

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  const clickable = typeof onAbrirOS === 'function'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <i className="ti ti-history" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
        <span style={sectionLabel}>Histórico de OS</span>
        <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {osCliente.length} OS
        </span>
      </div>

      {osCliente.length === 0 && (
        <div style={{
          background: T.cardAlt, border: `1px dashed ${T.border}`,
          borderRadius: 9, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <i className="ti ti-clipboard-off" style={{ fontSize: 18, color: T.textMuted }} aria-hidden="true" />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textSecondary }}>
              Sem OS registrada
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              Este cliente ainda não passou pela oficina.
            </div>
          </div>
        </div>
      )}

      {osCliente.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {osCliente.map(os => {
            const cfg = TIPOS_OS[os.tipo]
            const etapaCfg = cfg?.etapas?.find(e => e.id === os.etapa) || cfg?.lateral
            const etapaCor = corEtapa(etapaCfg?.cor || 'neutro', dark)
            const onClick = clickable ? () => onAbrirOS(os.id) : undefined
            return (
              <div key={os.id}
                onClick={onClick}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={clickable ? (e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrirOS(os.id) }
                }) : undefined}
                onMouseEnter={clickable ? (e => e.currentTarget.style.background = T.card) : undefined}
                onMouseLeave={clickable ? (e => e.currentTarget.style.background = T.cardAlt) : undefined}
                style={{
                  background: T.cardAlt,
                  border: `1px solid ${T.border}`,
                  borderRadius: 9,
                  padding: '10px 12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 10,
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'background .12s',
                  outline: 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
                      fontVariantNumeric: 'tabular-nums',
                    }}>OS #{os.numero}</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>·</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: T.textSecondary,
                      textTransform: 'capitalize',
                    }}>{cfg?.label || os.tipo}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 7px', borderRadius: 4,
                      background: etapaCor + '22', color: etapaCor,
                      textTransform: 'uppercase', letterSpacing: '.3px',
                    }}>{labelEtapa(os)}</span>
                  </div>
                  <div style={{
                    fontSize: 10.5, color: T.textMuted, marginTop: 4,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <i className="ti ti-calendar" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
                      {fmtDataCurta(os.abertura)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{fmtBRL(os.valor)}</span>
                  {clickable && (
                    <i className="ti ti-chevron-right"
                       style={{ fontSize: 14, color: T.textDim }} aria-hidden="true" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
