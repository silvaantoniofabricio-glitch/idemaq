// idemaq-src/components/clientes/ClienteDetalheModal.jsx
// Detalhe do cliente — visualização + edição inline.
// Reaproveita Modal + Input + Button da lib. Mostra avatar de iniciais no header.
// Histórico de OS fica pro Módulo 02 — placeholder no rodapé do corpo.

import React, { useState, useMemo } from 'react'
import { P } from '../../theme'
import { corEtapa, corHero } from '../../utils/colors'
import { Modal, Input, Button } from '../ui'
import { OS_MOCK } from '../../_mocks/os'
import { TIPOS_OS } from '../../utils/osData'
import { dentroGarantia } from '../../utils/osHelpers'
import { fmtBRL, fmtPrazoCurto } from '../../utils/fmt'

// Dias restantes de garantia (somente OS concluídas com entrega registrada).
function diasGarantiaRestantes(os) {
  if (!os || os.etapa !== 'concluido') return 0
  const dias = os.garantia_dias || 90
  const reg = (os.historico || []).find(h => h.etapa === 'entrega' || h.etapa === 'entregue')
  if (!reg) return 0
  const limite = new Date(new Date(reg.data).getTime() + dias * 86400000)
  return Math.max(0, Math.round((limite - new Date()) / 86400000))
}

function labelEtapa(os) {
  const cfg = TIPOS_OS[os.tipo]
  const e = cfg?.etapas?.find(x => x.id === os.etapa) || cfg?.lateral
  return e?.curto || e?.label || os.etapa
}

function iniciais(nome) {
  return (nome || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || '?'
}

// Normaliza o cliente em form: enderecos sempre array com pelo menos 1 entrada.
function clienteParaForm(c) {
  const enderecos = c.enderecos && Array.isArray(c.enderecos) && c.enderecos.length > 0
    ? c.enderecos
    : (c.endereco ? [c.endereco] : [''])
  return {
    nome: c.nome || '',
    cpfCnpj: c.cpfCnpj || '',
    email: c.email || '',
    fone: c.fone || '',
    foneSecundario: c.foneSecundario || '',
    enderecos: [...enderecos],
  }
}

export default function ClienteDetalheModal({ T, dark, cliente, onClose, onSalvar, mobile }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const initial = useMemo(() => clienteParaForm(cliente), [cliente])
  const [form, setForm] = useState(initial)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const updateEnd = (i, v) => setForm(f => {
    const novos = [...f.enderecos]
    novos[i] = v
    return { ...f, enderecos: novos }
  })
  const addEndereco = () => setForm(f =>
    f.enderecos.length >= 3 ? f : ({ ...f, enderecos: [...f.enderecos, ''] })
  )
  const removerEndereco = (i) => setForm(f =>
    f.enderecos.length <= 1 ? f : ({ ...f, enderecos: f.enderecos.filter((_, idx) => idx !== i) })
  )

  // Validação dos obrigatórios + detecção de alteração
  const obrigatoriosOk = !!(form.nome.trim() && form.fone.trim() && form.enderecos[0]?.trim())
  const alterado = useMemo(() => {
    if (form.nome !== initial.nome) return true
    if (form.cpfCnpj !== initial.cpfCnpj) return true
    if (form.email !== initial.email) return true
    if (form.fone !== initial.fone) return true
    if (form.foneSecundario !== initial.foneSecundario) return true
    if (form.enderecos.length !== initial.enderecos.length) return true
    for (let i = 0; i < form.enderecos.length; i++) {
      if (form.enderecos[i] !== initial.enderecos[i]) return true
    }
    return false
  }, [form, initial])

  const podeSalvar = obrigatoriosOk && alterado

  function salvar() {
    if (!podeSalvar) return
    const enderecosLimpos = form.enderecos.map(e => e.trim()).filter(Boolean)
    const atualizado = {
      ...cliente,
      nome: form.nome.trim(),
      cpfCnpj: form.cpfCnpj.trim(),
      email: form.email.trim(),
      fone: form.fone.trim(),
      foneSecundario: form.foneSecundario.trim(),
      enderecos: enderecosLimpos,
      endereco: enderecosLimpos[0] || '', // compat com mock antigo
    }
    onSalvar?.(atualizado)
  }

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={620}>
      {/* Header com avatar + nome + identidade */}
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
              <i className="ti ti-id-badge-2" style={{ fontSize: 12 }} aria-hidden="true" />
              <span>ID #{cliente.id}</span>
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
              placeholder="Ex: Maria Silva" autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <Input T={T} dark={dark} label="CPF / CNPJ"
                value={form.cpfCnpj} onChange={v => update('cpfCnpj', v)}
                placeholder="000.000.000-00" />
              <Input T={T} dark={dark} label="E-mail" type="email"
                value={form.email} onChange={v => update('email', v)}
                placeholder="maria@email.com" />
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Contato */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-phone" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Contato</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
            <div>
              <Input T={T} dark={dark} label="Telefone principal *" type="tel"
                value={form.fone} onChange={v => update('fone', v)}
                icon="ti-brand-whatsapp"
                placeholder="(67) 9 0000-0000" />
              <div style={{ fontSize: 10.5, color: azul, marginTop: 4 }}>
                WhatsApp principal
              </div>
            </div>
            <div>
              <Input T={T} dark={dark} label="Telefone secundário" type="tel"
                value={form.foneSecundario} onChange={v => update('foneSecundario', v)}
                placeholder="(67) 9 0000-0000" />
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4 }}>
                Esposo(a), parente, recado
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Endereços */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Endereços</span>
            <span style={{ fontSize: 10, color: T.textMuted }}>
              até 3 — útil pra casa e comércio
            </span>
          </div>

          {/* Endereço principal (sempre presente) */}
          <Input T={T} dark={dark} label="Endereço principal *"
            value={form.enderecos[0] || ''}
            onChange={v => updateEnd(0, v)}
            icon="ti-map-pin"
            placeholder="Rua, número, bairro — cidade/UF" />

          {/* Endereços extras */}
          {form.enderecos.slice(1).map((end, idx) => {
            const realIdx = idx + 1
            return (
              <div key={realIdx} style={{
                marginTop: 12, padding: 12,
                background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 9,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-map-pin" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
                    <span style={{ ...sectionLabel, fontSize: 10.5 }}>
                      Endereço {realIdx + 1}
                    </span>
                  </div>
                  <button onClick={() => removerEndereco(realIdx)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: T.textMuted, padding: 4,
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                      fontFamily: 'inherit',
                    }}>
                    <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
                    Remover
                  </button>
                </div>
                <Input T={T} dark={dark}
                  value={end} onChange={v => updateEnd(realIdx, v)}
                  placeholder="Rua, número, bairro — cidade/UF" />
              </div>
            )
          })}

          {form.enderecos.length < 3 && (
            <button onClick={addEndereco}
              style={{
                marginTop: 12, width: '100%',
                background: 'transparent', color: azul,
                border: `1px dashed ${T.border}`,
                padding: '11px 12px', borderRadius: 8,
                fontSize: 12.5, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
              Adicionar outro endereço
            </button>
          )}
        </div>

        <div style={{ height: 1, background: T.border, margin: '18px 0 14px' }} />

        {/* Histórico de OS */}
        <HistoricoOS T={T} dark={dark} cor={cor} clienteNome={cliente.nome} />
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        background: T.cardAlt, flexShrink: 0,
      }}>
        <Button T={T} dark={dark} variant="secondary" onClick={onClose}>
          {alterado ? 'Cancelar' : 'Fechar'}
        </Button>
        <Button variant="primary" iconLeft="ti-check"
          disabled={!podeSalvar} onClick={salvar}>
          Salvar alterações
        </Button>
      </div>
    </Modal>
  )
}

// ─── Histórico de OS deste cliente ────────────────────────────────────────
// Filtra OS_MOCK pelo nome do cliente (a ligação ainda é por nome — o
// Módulo 02 introduz cliente_id no Supabase e troca o filtro pra FK).
function HistoricoOS({ T, dark, cor, clienteNome }) {
  const osCliente = useMemo(() => {
    return OS_MOCK
      .filter(o => o.cliente === clienteNome && !o.deleted_at)
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
  }, [clienteNome])

  const azul = corEtapa('blue', dark)

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  if (osCliente.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <i className="ti ti-history" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
          <span style={sectionLabel}>Histórico de OS</span>
        </div>
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
      </div>
    )
  }

  const totalPago = osCliente.reduce((s, o) => s + (o.valor_pago || 0), 0)
  const emAndamento = osCliente.filter(o => o.etapa !== 'concluido' && o.etapa !== 'recusado').length
  const garantiasAtivas = osCliente.filter(o => dentroGarantia(o)).length

  const resumoPills = []
  resumoPills.push(`${osCliente.length} OS`)
  if (totalPago > 0) resumoPills.push(`${fmtBRL(totalPago)} pago`)
  if (garantiasAtivas > 0) resumoPills.push(`${garantiasAtivas} garantia${garantiasAtivas > 1 ? 's' : ''} ativa${garantiasAtivas > 1 ? 's' : ''}`)
  if (emAndamento > 0) resumoPills.push(`${emAndamento} em andamento`)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <i className="ti ti-history" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
        <span style={sectionLabel}>Histórico de OS</span>
        <span style={{
          fontSize: 10.5, color: T.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>{resumoPills.join(' · ')}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {osCliente.map(os => (
          <OSHistRow key={os.numero} os={os} T={T} dark={dark} cor={cor} />
        ))}
      </div>
    </div>
  )
}

function OSHistRow({ os, T, dark, cor }) {
  const isConcluido = os.etapa === 'concluido'
  const isRecusado = os.etapa === 'recusado'
  const isAndamento = !isConcluido && !isRecusado
  const cfg = TIPOS_OS[os.tipo]
  const etapaCfg = cfg?.etapas?.find(e => e.id === os.etapa) || cfg?.lateral
  const etapaCorKey = etapaCfg?.cor || 'neutro'
  const etapaCor = corEtapa(etapaCorKey, dark)
  const diasGar = diasGarantiaRestantes(os)
  const garantiaAtiva = diasGar > 0
  const totalLiq = (os.valor || 0) - (os.desconto || 0)
  const pagoTotal = os.pago === 'total' || (totalLiq > 0 && (os.valor_pago || 0) >= totalLiq)

  return (
    <div style={{
      background: T.cardAlt,
      border: `1px solid ${T.border}`,
      borderRadius: 9,
      padding: '10px 12px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 5, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}>OS #{os.numero}</span>
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            padding: '2px 7px', borderRadius: 4,
            background: etapaCor + '22', color: etapaCor,
            textTransform: 'uppercase', letterSpacing: '.3px',
          }}>{labelEtapa(os)}</span>
          {os.garantia && (
            <span style={{
              fontSize: 9.5, fontWeight: 700,
              padding: '2px 7px', borderRadius: 4,
              background: cor('#0d2035', '#e6f1fb'),
              color: cor(P.blue, P.blueDark),
              display: 'inline-flex', alignItems: 'center', gap: 3,
              textTransform: 'uppercase', letterSpacing: '.3px',
            }}>
              <i className="ti ti-shield-check" style={{ fontSize: 11 }} aria-hidden="true" />
              retorno
            </span>
          )}
        </div>
        <span style={{
          fontSize: 11, color: T.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>{fmtPrazoCurto(os.criado_em)}</span>
      </div>

      <div style={{
        fontSize: 11.5, color: T.textSecondary,
        lineHeight: 1.4, marginBottom: 6,
      }}>{os.defeito || '—'}</div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        fontSize: 11, color: T.textMuted,
      }}>
        {os.valor > 0 ? (
          <span style={{
            fontVariantNumeric: 'tabular-nums', fontWeight: 700,
            color: pagoTotal ? corEtapa('green', dark) : T.textSecondary,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {pagoTotal && <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true" />}
            {fmtBRL(totalLiq)}{pagoTotal && ' · pago'}
          </span>
        ) : (
          <span style={{ fontStyle: 'italic' }}>sem orçamento ainda</span>
        )}

        {garantiaAtiva && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: corEtapa('green', dark), fontWeight: 600,
          }}>
            <i className="ti ti-shield-check" style={{ fontSize: 12 }} aria-hidden="true" />
            Garantia ativa · {diasGar} dia{diasGar !== 1 ? 's' : ''}
          </span>
        )}

        {isAndamento && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: corEtapa('yellow', dark), fontWeight: 600,
          }}>
            <i className="ti ti-clock" style={{ fontSize: 12 }} aria-hidden="true" />
            Em andamento
          </span>
        )}

        {isRecusado && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: corEtapa('red', dark), fontWeight: 600,
          }}>
            <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
            Recusada
          </span>
        )}
      </div>
    </div>
  )
}
