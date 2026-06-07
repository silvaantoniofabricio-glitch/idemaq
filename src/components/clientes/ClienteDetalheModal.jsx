// idemaq-src/components/clientes/ClienteDetalheModal.jsx
//
// Ficha do cliente — 2 modos:
//   Visualização: layout Atlassian (label/valor em grid, somente leitura).
//   Edição:       mesmo formulário e padrão do NovoClienteModal desktop.
//
// Após salvar com sucesso: volta ao modo visualização SEM fechar o modal.
// onSalvar deve retornar { data, error } — Clientes.jsx atualizado pra isso.
//
// Schema DB: nome, telefone, telefone2, email, endereco, endereco2, observacoes
//   telefone2 adicionado via sql/78 · endereco2 via sql/81

import React, { useState, useMemo, useEffect } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { TIPOS_OS } from '../../utils/osData'
import { fmtBRL } from '../../utils/fmt'
import { Modal, Input, Textarea, Button } from '../ui'
import { useToast } from '../ui'
import { criarOSDerivada } from '../../utils/osDerivada'
import AddressInput from '../logistica/AddressInput'

// ─── Helpers puros ────────────────────────────────────────────────────────────

function iniciais(nome) {
  return (nome || '')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(p => p[0]?.toUpperCase()).join('') || '?'
}

function fmtDataCurta(iso) {
  if (!iso) return '—'
  const d = new Date(typeof iso === 'string' ? iso.replace(' ', 'T') : iso)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCriacao(iso) {
  if (!iso) return null
  const d = new Date(typeof iso === 'string' ? iso.replace(' ', 'T') : iso)
  if (isNaN(d)) return null
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Extrai rua do endereço concatenado "rua — cidade/uf — cep"
function parseRua(endereco) {
  if (!endereco) return ''
  return endereco.split(' — ')[0] || endereco
}

function normFone(s) {
  if (!s) return ''
  let d = String(s).replace(/\D/g, '')
  if (d.length === 13 && d.startsWith('55')) d = d.slice(2)
  return d
}

function estaEmGarantia(os) {
  const dias = os.garantia_dias || 90
  const ref = os.data_conclusao || os.abertura
  if (!ref) return false
  return Date.now() <= new Date(ref).getTime() + dias * 86400000
}

function labelEtapa(os) {
  const cfg = TIPOS_OS[os.tipo]
  const e = cfg?.etapas?.find(x => x.id === os.etapa) || cfg?.lateral
  return e?.curto || e?.label || os.etapa
}

// Converte cliente para estado de formulário de edição
function toForm(c) {
  return {
    nome:        c.nome        || '',
    telefone:    c.telefone    || '',
    telefone2:   c.telefone2   || '',
    email:       c.email       || '',
    // Separa rua do sufixo cidade/uf/cep concatenado por criarClientePersist
    endereco:    parseRua(c.endereco),
    cidade:      'Naviraí',
    uf:          'MS',
    cep:         '',
    endereco2:   c.endereco2   || '',
    observacoes: c.observacoes || '',
  }
}

// ─── Sub-componentes: modo visualização ───────────────────────────────────────

function SectionLabel({ icon, title, T, azul }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.5px',
      textTransform: 'uppercase', color: T.textMuted,
      marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12, color: azul }} aria-hidden="true" />
      {title}
    </div>
  )
}

function InfoRow({ label, value, icon, T, azul }) {
  if (!value) return null
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '130px 1fr',
      gap: 8, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 12, color: T.textMuted, paddingTop: 2, lineHeight: 1.5 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13.5, color: T.textPrimary, lineHeight: 1.5,
        display: 'flex', alignItems: 'flex-start', gap: 6,
      }}>
        {icon && (
          <i className={`ti ${icon}`}
             style={{ fontSize: 13, color: azul, flexShrink: 0, marginTop: 2 }}
             aria-hidden="true" />
        )}
        <span>{value}</span>
      </span>
    </div>
  )
}

function InfoSection({ title, icon, children, T, azul, border }) {
  return (
    <div style={{
      padding: '18px 24px',
      borderTop: border ? `1px solid ${T.border}` : 'none',
    }}>
      <SectionLabel title={title} icon={icon} T={T} azul={azul} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Header do modal ──────────────────────────────────────────────────────────

function ClienteHeader({ T, dark, azul, cliente, modoEdicao, onEditar, onClose }) {
  const dataStr = fmtCriacao(cliente.criado_em)
  return (
    <div style={{
      padding: '20px 24px 18px',
      borderBottom: `1px solid ${T.border}`,
      background: dark ? '#0b1d2e' : '#eef4fb',
      display: 'flex', alignItems: 'flex-start', gap: 16,
    }}>
      {/* Avatar */}
      <div style={{
        width: 56, height: 56, borderRadius: 14, flexShrink: 0,
        background: `linear-gradient(135deg, ${azul}, ${dark ? '#3a7bbf' : '#2860a0'})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '.5px',
        boxShadow: `0 4px 14px ${azul}44`,
      }}>
        {iniciais(cliente.nome)}
      </div>

      {/* Nome + subtítulo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 18, fontWeight: 700, color: corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.02em', lineHeight: 1.2,
        }}>
          {cliente.nome || 'Sem nome'}
        </div>
        <div style={{
          fontSize: 12, color: T.textMuted, marginTop: 5,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          {cliente.telefone && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-brand-whatsapp" style={{ fontSize: 12, color: azul }} aria-hidden="true" />
              {cliente.telefone}
            </span>
          )}
          {cliente.telefone && dataStr && (
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.textMuted, flexShrink: 0 }} />
          )}
          {dataStr && <span>Cadastrado em {dataStr}</span>}
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}>
        {!modoEdicao && (
          <Button T={T} dark={dark} variant="secondary" size="sm" iconLeft="ti-edit" onClick={onEditar}>
            Editar ficha
          </Button>
        )}
        {modoEdicao && (
          <span style={{
            fontSize: 11.5, color: azul, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
            background: azul + '18', borderRadius: 6, padding: '4px 10px',
          }}>
            <i className="ti ti-edit" style={{ fontSize: 12 }} aria-hidden="true" />
            Editando
          </span>
        )}
        <button onClick={onClose} aria-label="Fechar" style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.textMuted, padding: 6, borderRadius: 6, lineHeight: 0,
        }}>
          <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ClienteDetalheModal({
  T, dark, cliente, mobile,
  osList = [],
  onClose,
  onSalvar,   // (patch com .id) => Promise<{ data, error }>
  onExcluir,
  onAbrirOS,
}) {
  const azul = corEtapa('blue', dark)

  const [modoEdicao, setModoEdicao]     = useState(false)
  const [clienteLocal, setClienteLocal] = useState(cliente)
  const [form, setForm]                 = useState(() => toForm(cliente))
  const [salvando, setSalvando]         = useState(false)

  // Sincroniza se o prop mudar externamente (pai faz refetch)
  useEffect(() => { setClienteLocal(cliente) }, [cliente])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const podeSalvar = !!form.nome.trim() && !!form.telefone.trim() && !salvando

  function entrarEdicao() {
    setForm(toForm(clienteLocal))
    setModoEdicao(true)
  }

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)

    // Preserva endereço original se o campo rua não foi alterado
    // (evita dobrar "Naviraí/MS" em clientes já com endereço completo)
    const ruaOriginal = parseRua(clienteLocal.endereco)
    let enderecoFinal
    if (
      form.endereco.trim() === ruaOriginal.trim() &&
      !form.cep.trim() &&
      form.cidade === 'Naviraí' &&
      form.uf === 'MS'
    ) {
      enderecoFinal = clienteLocal.endereco || null
    } else {
      const sufixo = [form.cidade?.trim(), form.uf?.trim()].filter(Boolean).join('/')
      const partes = [form.endereco.trim(), sufixo, form.cep?.trim()].filter(Boolean)
      enderecoFinal = partes.length ? partes.join(' — ') : null
    }

    const patch = {
      id:          clienteLocal.id,
      nome:        form.nome.trim(),
      telefone:    form.telefone.trim()    || null,
      telefone2:   form.telefone2.trim()   || null,
      email:       form.email.trim()       || null,
      endereco:    enderecoFinal,
      endereco2:   form.endereco2.trim()   || null,
      observacoes: form.observacoes.trim() || null,
    }

    const result = await onSalvar?.(patch)
    setSalvando(false)

    if (result?.error) return // Clientes.jsx já exibiu o toast de erro

    const atualizado = result?.data || { ...clienteLocal, ...patch }
    setClienteLocal(atualizado)
    setModoEdicao(false)
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={680}>

      {/* Header */}
      <ClienteHeader
        T={T} dark={dark} azul={azul}
        cliente={clienteLocal}
        modoEdicao={modoEdicao}
        onEditar={entrarEdicao}
        onClose={onClose}
      />

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── MODO VISUALIZAÇÃO ── */}
        {!modoEdicao && (
          <>
            <InfoSection T={T} azul={azul} title="Contato" icon="ti-phone">
              <InfoRow T={T} azul={azul} label="Telefone"   value={clienteLocal.telefone}  icon="ti-brand-whatsapp" />
              <InfoRow T={T} azul={azul} label="Telefone 2" value={clienteLocal.telefone2} icon="ti-phone" />
              <InfoRow T={T} azul={azul} label="E-mail"     value={clienteLocal.email}     icon="ti-mail" />
              {!clienteLocal.telefone && !clienteLocal.telefone2 && !clienteLocal.email && (
                <span style={{ fontSize: 12.5, color: T.textMuted, fontStyle: 'italic' }}>
                  Nenhum contato registrado
                </span>
              )}
            </InfoSection>

            <InfoSection T={T} azul={azul} title="Endereços" icon="ti-map-pin" border>
              <InfoRow T={T} azul={azul} label="Principal"  value={clienteLocal.endereco}  icon="ti-map-pin" />
              <InfoRow T={T} azul={azul} label="Secundário" value={clienteLocal.endereco2} icon="ti-map-pin" />
              {!clienteLocal.endereco && !clienteLocal.endereco2 && (
                <span style={{ fontSize: 12.5, color: T.textMuted, fontStyle: 'italic' }}>
                  Nenhum endereço registrado
                </span>
              )}
            </InfoSection>

            {clienteLocal.observacoes && (
              <InfoSection T={T} azul={azul} title="Observações" icon="ti-notes" border>
                <p style={{
                  margin: 0, fontSize: 13.5, color: T.textPrimary,
                  lineHeight: 1.65, whiteSpace: 'pre-wrap',
                }}>
                  {clienteLocal.observacoes}
                </p>
              </InfoSection>
            )}

            <div style={{ borderTop: `1px solid ${T.border}`, padding: '18px 24px 22px' }}>
              <HistoricoOS
                T={T} dark={dark}
                clienteId={clienteLocal.id}
                clienteFone={clienteLocal.telefone}
                osList={osList}
                onAbrirOS={onAbrirOS}
              />
            </div>
          </>
        )}

        {/* ── MODO EDIÇÃO ── */}
        {modoEdicao && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* IDENTIFICAÇÃO */}
            <div>
              <SectionLabel T={T} azul={azul} icon="ti-user" title="Identificação" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Input T={T} dark={dark}
                  label="Nome completo *"
                  value={form.nome}
                  onChange={v => update('nome', v)}
                  placeholder="Ex: Maria Silva"
                  autoFocus
                />
                <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <Input T={T} dark={dark}
                    label="Telefone *" type="tel"
                    value={form.telefone}
                    onChange={v => update('telefone', v)}
                    icon="ti-brand-whatsapp"
                    placeholder="(67) 9 0000-0000"
                  />
                  <Input T={T} dark={dark}
                    label="Telefone 2" type="tel"
                    value={form.telefone2}
                    onChange={v => update('telefone2', v)}
                    icon="ti-phone"
                    placeholder="(67) 9 0000-0000"
                  />
                </div>
                <Input T={T} dark={dark}
                  label="E-mail" type="email"
                  value={form.email}
                  onChange={v => update('email', v)}
                  icon="ti-mail"
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            <div style={{ height: 1, background: T.border }} />

            {/* ENDEREÇO PRINCIPAL */}
            <div>
              <SectionLabel T={T} azul={azul} icon="ti-map-pin" title="Endereço principal" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AddressInput
                  T={T} dark={dark}
                  label="Endereço"
                  value={form.endereco}
                  onChange={({ endereco }) => update('endereco', endereco)}
                  placeholder="Rua, número, bairro"
                />
                <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '2fr 1fr 1fr', gap: 10 }}>
                  <Input T={T} dark={dark}
                    label="Cidade"
                    value={form.cidade}
                    onChange={v => update('cidade', v)}
                    placeholder="Naviraí"
                  />
                  <Input T={T} dark={dark}
                    label="UF"
                    value={form.uf}
                    onChange={v => update('uf', v)}
                    placeholder="MS"
                  />
                  <Input T={T} dark={dark}
                    label="CEP"
                    value={form.cep}
                    onChange={v => update('cep', v)}
                    placeholder="79950-000"
                  />
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: T.border }} />

            {/* ENDEREÇO SECUNDÁRIO */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '.5px',
                textTransform: 'uppercase', color: T.textMuted,
                marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ti ti-map-pin" style={{ fontSize: 12, color: azul }} aria-hidden="true" />
                Endereço secundário
                <span style={{
                  fontSize: 10.5, fontWeight: 400, textTransform: 'none',
                  letterSpacing: 0, color: T.textMuted,
                }}>— opcional</span>
              </div>
              <AddressInput
                T={T} dark={dark}
                label="Endereço 2"
                value={form.endereco2}
                onChange={({ endereco }) => update('endereco2', endereco)}
                placeholder="Ex: endereço do trabalho ou entrega"
              />
            </div>

            <div style={{ height: 1, background: T.border }} />

            {/* OBSERVAÇÕES */}
            <div>
              <SectionLabel T={T} azul={azul} icon="ti-notes" title="Observações" />
              <Textarea T={T} dark={dark}
                value={form.observacoes}
                onChange={v => update('observacoes', v)}
                placeholder="Ex: cliente recorrente, prefere atendimento pela manhã…"
                rows={3}
              />
            </div>

            <div style={{
              fontSize: 11, color: T.textMuted,
              padding: '8px 12px', borderRadius: 6, background: T.cardAlt,
            }}>
              <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 5, color: azul }} aria-hidden="true" />
              Campos com <strong style={{ color: corHero(dark) }}>*</strong> são obrigatórios.
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        background: T.cardAlt, flexShrink: 0,
      }}>
        {!modoEdicao ? (
          <>
            <Button T={T} dark={dark} variant="ghost" iconLeft="ti-trash" onClick={onExcluir}>
              Excluir cliente
            </Button>
            <Button T={T} dark={dark} variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </>
        ) : (
          <>
            <div />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button T={T} dark={dark} variant="secondary"
                onClick={() => setModoEdicao(false)} disabled={salvando}>
                Cancelar
              </Button>
              <Button variant="primary"
                iconLeft={salvando ? 'ti-loader-2' : 'ti-check'}
                disabled={!podeSalvar} onClick={salvar}>
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Histórico de OS ──────────────────────────────────────────────────────────
// Recebe osList completa do pai (via useOS) e filtra em memória.
// Matching: cliente_id exato OU telefone normalizado (cobre OS do Trello/Bling).

function HistoricoOS({ T, dark, clienteId, clienteFone, osList, onAbrirOS }) {
  const notify = useToast()
  const [criandoGarantia, setCriandoGarantia] = useState(null)
  const azul  = corEtapa('blue',  dark)
  const verde = corEtapa('green', dark)

  async function abrirGarantia(e, os) {
    e.stopPropagation()
    setCriandoGarantia(os.id)
    const { numero, error } = await criarOSDerivada(os.id, {
      tipo: 'atendimento', etapa: 'aguardando_agendamento',
      garantia: true, valor_total: 0, garantia_dias: os.garantia_dias || 90,
    })
    setCriandoGarantia(null)
    if (error) { notify('erro', 'Erro ao abrir OS de garantia'); return }
    notify('ok', `OS de garantia #${numero} aberta`)
  }

  const osCliente = useMemo(() => {
    const foneN = normFone(clienteFone)
    return (osList || [])
      .filter(o => {
        if (o.cliente_id && o.cliente_id === clienteId) return true
        if (foneN && foneN.length >= 8 && normFone(o.fone) === foneN) return true
        return false
      })
      .slice()
      .sort((a, b) => new Date(b.abertura) - new Date(a.abertura))
  }, [osList, clienteId, clienteFone])

  const clickable = typeof onAbrirOS === 'function'

  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.5px',
        textTransform: 'uppercase', color: T.textMuted, marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className="ti ti-history" style={{ fontSize: 12, color: azul }} aria-hidden="true" />
        Histórico de OS
        <span style={{
          fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums',
          fontWeight: 400, textTransform: 'none', letterSpacing: 0,
        }}>
          — {osCliente.length} {osCliente.length === 1 ? 'ordem' : 'ordens'}
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
            const cfg      = TIPOS_OS[os.tipo]
            const etapaCfg = cfg?.etapas?.find(e => e.id === os.etapa) || cfg?.lateral
            const etapaCor = corEtapa(etapaCfg?.cor || 'neutro', dark)
            const onClick  = clickable ? () => onAbrirOS(os.id) : undefined
            return (
              <div key={os.id}
                onClick={onClick}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={clickable ? e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrirOS(os.id) }
                } : undefined}
                onMouseEnter={clickable ? e => e.currentTarget.style.background = T.card : undefined}
                onMouseLeave={clickable ? e => e.currentTarget.style.background = T.cardAlt : undefined}
                style={{
                  background: T.cardAlt, border: `1px solid ${T.border}`,
                  borderRadius: 9, padding: '10px 12px',
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  alignItems: 'center', gap: 10,
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'background .12s', outline: 'none',
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
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
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
                  {os.etapa === 'concluido' && !os.garantia && os.tipo === 'atendimento' && estaEmGarantia(os) && (
                    <button
                      type="button"
                      disabled={criandoGarantia === os.id}
                      onClick={e => abrirGarantia(e, os)}
                      title="Abrir OS de garantia"
                      style={{
                        height: 26, padding: '0 9px', borderRadius: 6,
                        border: `1px solid ${verde}55`,
                        background: dark ? 'rgba(0,200,100,0.10)' : '#edfaf3',
                        color: verde, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        WebkitTapHighlightColor: 'transparent',
                        opacity: criandoGarantia === os.id ? 0.6 : 1,
                      }}
                    >
                      <i className={`ti ${criandoGarantia === os.id ? 'ti-loader-2' : 'ti-shield-check'}`}
                         style={{ fontSize: 12 }} aria-hidden="true" />
                      Garantia
                    </button>
                  )}
                  {clickable && (
                    <i className="ti ti-chevron-right"
                       style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
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
