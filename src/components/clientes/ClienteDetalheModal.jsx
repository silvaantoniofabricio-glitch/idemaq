// idemaq-src/components/clientes/ClienteDetalheModal.jsx
//
// Ficha do cliente — 2 modos:
//   Visualização: layout Atlassian (label/valor em grid, somente leitura).
//   Edição:       formulário único (sem divisões por seção), padrão NovoCliente OS.
//
// Schema DB: nome, telefone, telefone2, cpf_cnpj,
//            endereco, endereco2, endereco3, email, observacoes
//   telefone2 → sql/78 · endereco2 → sql/81 · cpf_cnpj + endereco3 → sql/82

import React, { useState, useMemo, useEffect } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { TIPOS_OS } from '../../utils/osData'
import { fmtBRL } from '../../utils/fmt'
import { Modal, Input, Textarea, Button } from '../ui'
import { useToast } from '../ui'
import { criarOSDerivada } from '../../utils/osDerivada'
import AddressInput from '../logistica/AddressInput'
import { supabase } from '../../supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Extrai array de endereços do cliente (filtra vazios, sempre ao menos 1 slot)
function parseEnderecos(c) {
  const arr = [c.endereco, c.endereco2, c.endereco3].filter(Boolean)
  return arr.length > 0 ? arr : ['']
}

function toForm(c) {
  return {
    nome:        c.nome        || '',
    telefone:    c.telefone    || '',
    telefone2:   c.telefone2   || '',
    email:       c.email       || '',
    cpf_cnpj:    c.cpf_cnpj    || '',
    observacoes: c.observacoes || '',
  }
}

// ─── Sub-componentes: modo visualização ───────────────────────────────────────

function InfoRow({ label, value, icon, T, azul }) {
  if (!value) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: T.textMuted, paddingTop: 2, lineHeight: 1.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 13.5, color: T.textPrimary, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 13, color: azul, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />}
        <span>{value}</span>
      </span>
    </div>
  )
}

function InfoSection({ title, icon, children, T, azul, border }) {
  return (
    <div style={{ padding: '18px 24px', borderTop: border ? `1px solid ${T.border}` : 'none' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.5px',
        textTransform: 'uppercase', color: T.textMuted,
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12, color: azul }} aria-hidden="true" />
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
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
      <div style={{
        width: 56, height: 56, borderRadius: 14, flexShrink: 0,
        background: `linear-gradient(135deg, ${azul}, ${dark ? '#3a7bbf' : '#2860a0'})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '.5px',
        boxShadow: `0 4px 14px ${azul}44`,
      }}>
        {iniciais(cliente.nome)}
      </div>

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

// ─── Label de endereço (padrão foto OS) ───────────────────────────────────────

function EnderecoLabel({ idx, onRemove, T, azul, vermelho }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 6,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px',
        textTransform: 'uppercase', color: T.textMuted,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className="ti ti-map-pin" style={{ fontSize: 11, color: azul }} aria-hidden="true" />
        Endereço {idx + 1}
        {idx === 0 && (
          <span style={{ color: vermelho, marginLeft: 2 }}>Obrigatório</span>
        )}
      </div>
      {idx > 0 && onRemove && (
        <button onClick={onRemove} title="Remover endereço" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.textMuted, padding: '2px 4px', borderRadius: 4, lineHeight: 0,
        }}>
          <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ClienteDetalheModal({
  T, dark,
  cliente: clienteProp,   // objeto completo — use este OU clienteId
  clienteId,              // alternativa: busca o cliente internamente
  mobile,
  osList = [],
  onClose,
  onSalvar,   // (patch com .id) => Promise<{ data, error }>
  onExcluir,  // se não passado, botão "Excluir" não aparece
  onAbrirOS,
}) {
  const azul     = corEtapa('blue',  dark)
  const vermelho = corEtapa('red',   dark)

  // Se vier clienteId sem o objeto, faz fetch interno
  const [clienteLocal, setClienteLocal] = useState(clienteProp || null)
  const [loadingFetch, setLoadingFetch] = useState(!clienteProp && !!clienteId)
  const [erroFetch, setErroFetch]       = useState(null)

  useEffect(() => {
    if (clienteProp) { setClienteLocal(clienteProp); return }
    if (!clienteId)  return
    setLoadingFetch(true); setErroFetch(null)
    supabase.from('cliente').select('*').eq('id', clienteId).is('deleted_at', null).single()
      .then(({ data, error }) => {
        if (error || !data) setErroFetch(error?.message || 'Cliente não encontrado')
        else { setClienteLocal(data); inicializarForm(data) }
        setLoadingFetch(false)
      })
  }, [clienteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const [modoEdicao, setModoEdicao] = useState(false)
  const [form, setForm]             = useState(() => toForm(clienteProp || {}))
  const [enderecos, setEnderecos]   = useState(() => parseEnderecos(clienteProp || {}))
  const [infoExtra, setInfoExtra]   = useState(() => !!(clienteProp?.email || clienteProp?.cpf_cnpj))
  const [salvando, setSalvando]     = useState(false)

  function inicializarForm(c) {
    setForm(toForm(c))
    setEnderecos(parseEnderecos(c))
    setInfoExtra(!!(c.email || c.cpf_cnpj))
  }

  useEffect(() => {
    if (clienteProp) setClienteLocal(clienteProp)
  }, [clienteProp])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function updateEndereco(idx, val) {
    setEnderecos(prev => prev.map((e, i) => i === idx ? val : e))
  }
  function addEndereco() {
    if (enderecos.length < 3) setEnderecos(prev => [...prev, ''])
  }
  function removeEndereco(idx) {
    setEnderecos(prev => prev.filter((_, i) => i !== idx))
  }

  const podeSalvar = !!form.nome.trim() && !!form.telefone.trim() && !salvando

  function entrarEdicao() {
    setForm(toForm(clienteLocal))
    setEnderecos(parseEnderecos(clienteLocal))
    setInfoExtra(!!(clienteLocal.email || clienteLocal.cpf_cnpj))
    setModoEdicao(true)
  }

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)

    const patch = {
      id:          clienteLocal.id,
      nome:        form.nome.trim(),
      telefone:    form.telefone.trim()    || null,
      telefone2:   form.telefone2.trim()   || null,
      cpf_cnpj:    form.cpf_cnpj.trim()    || null,
      email:       form.email.trim()       || null,
      endereco:    enderecos[0]?.trim()    || null,
      endereco2:   enderecos[1]?.trim()    || null,
      endereco3:   enderecos[2]?.trim()    || null,
      observacoes: form.observacoes.trim() || null,
    }

    const result = await onSalvar?.(patch)
    setSalvando(false)
    if (result?.error) return

    const atualizado = result?.data || { ...clienteLocal, ...patch }
    setClienteLocal(atualizado)
    setModoEdicao(false)
  }

  // ── Render ────────────────────────────────────────────────────

  // Loading / erro quando clienteId foi passado sem o objeto completo
  if (loadingFetch || (!clienteLocal && !erroFetch)) {
    return (
      <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={680}>
        <div style={{ padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: T.textMuted, fontSize: 13 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 18, color: azul, animation: 'idemaq-spin .8s linear infinite' }} aria-hidden="true" />
          Carregando dados do cliente…
        </div>
      </Modal>
    )
  }

  if (erroFetch) {
    return (
      <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={680}>
        <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: 10, color: corEtapa('red', dark), fontSize: 13 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} aria-hidden="true" />
          {erroFetch}
        </div>
      </Modal>
    )
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={680}>

      <ClienteHeader
        T={T} dark={dark} azul={azul}
        cliente={clienteLocal}
        modoEdicao={modoEdicao}
        onEditar={entrarEdicao}
        onClose={onClose}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── MODO VISUALIZAÇÃO ── */}
        {!modoEdicao && (
          <>
            <InfoSection T={T} azul={azul} title="Contato" icon="ti-phone">
              <InfoRow T={T} azul={azul} label="Telefone"   value={clienteLocal.telefone}  icon="ti-brand-whatsapp" />
              <InfoRow T={T} azul={azul} label="Telefone 2" value={clienteLocal.telefone2} icon="ti-phone" />
              <InfoRow T={T} azul={azul} label="E-mail"     value={clienteLocal.email}     icon="ti-mail" />
              <InfoRow T={T} azul={azul} label="CPF/CNPJ"   value={clienteLocal.cpf_cnpj}  icon="ti-id-badge" />
              {!clienteLocal.telefone && !clienteLocal.telefone2 && !clienteLocal.email && !clienteLocal.cpf_cnpj && (
                <span style={{ fontSize: 12.5, color: T.textMuted, fontStyle: 'italic' }}>
                  Nenhum contato registrado
                </span>
              )}
            </InfoSection>

            <InfoSection T={T} azul={azul} title="Endereços" icon="ti-map-pin" border>
              <InfoRow T={T} azul={azul} label="Principal"  value={clienteLocal.endereco}  icon="ti-map-pin" />
              <InfoRow T={T} azul={azul} label="Secundário" value={clienteLocal.endereco2} icon="ti-map-pin" />
              <InfoRow T={T} azul={azul} label="Endereço 3" value={clienteLocal.endereco3} icon="ti-map-pin" />
              {!clienteLocal.endereco && !clienteLocal.endereco2 && !clienteLocal.endereco3 && (
                <span style={{ fontSize: 12.5, color: T.textMuted, fontStyle: 'italic' }}>
                  Nenhum endereço registrado
                </span>
              )}
            </InfoSection>

            {clienteLocal.observacoes && (
              <InfoSection T={T} azul={azul} title="Observações" icon="ti-notes" border>
                <p style={{ margin: 0, fontSize: 13.5, color: T.textPrimary, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
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

        {/* ── MODO EDIÇÃO ── formulário único, sem divisões ── */}
        {modoEdicao && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Nome */}
            <Input T={T} dark={dark}
              label="Nome completo *"
              value={form.nome}
              onChange={v => update('nome', v)}
              placeholder="Ex: Maria Silva"
              autoFocus
            />

            {/* Telefones */}
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

            {/* E-mail + CPF/CNPJ — colapsável */}
            {!infoExtra ? (
              <button
                type="button"
                onClick={() => setInfoExtra(true)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: 'transparent', cursor: 'pointer',
                  border: `1px dashed ${T.border}`, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', fontFamily: 'inherit',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 12.5, color: T.textMuted }}>
                  E-mail · CPF/CNPJ
                </span>
                <span style={{ fontSize: 12, color: azul, fontWeight: 600 }}>
                  mais
                </span>
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <Input T={T} dark={dark}
                    label="E-mail" type="email"
                    value={form.email}
                    onChange={v => update('email', v)}
                    icon="ti-mail"
                    placeholder="cliente@email.com"
                  />
                  <Input T={T} dark={dark}
                    label="CPF/CNPJ"
                    value={form.cpf_cnpj}
                    onChange={v => update('cpf_cnpj', v)}
                    icon="ti-id-badge"
                    placeholder="000.000.000-00"
                  />
                </div>
                {/* Ocultar só se ambos estiverem vazios */}
                {!form.email && !form.cpf_cnpj && (
                  <button
                    type="button"
                    onClick={() => setInfoExtra(false)}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: T.textMuted, fontSize: 11.5,
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '0', fontFamily: 'inherit',
                    }}
                  >
                    <i className="ti ti-minus" style={{ fontSize: 11 }} aria-hidden="true" />
                    Ocultar
                  </button>
                )}
              </div>
            )}

            {/* Endereços — dinâmico (até 3) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
              {enderecos.map((end, idx) => (
                <div key={idx}>
                  <EnderecoLabel
                    idx={idx}
                    T={T} azul={azul} vermelho={vermelho}
                    onRemove={idx > 0 ? () => removeEndereco(idx) : null}
                  />
                  <AddressInput
                    T={T} dark={dark}
                    value={end}
                    onChange={({ endereco }) => updateEndereco(idx, endereco)}
                    placeholder="Rua, número, bairro — cidade/UF"
                  />
                </div>
              ))}

              {/* Botão adicionar + hint */}
              {enderecos.length < 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                  <button
                    type="button"
                    onClick={addEndereco}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: azul, fontSize: 13, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 8px', fontFamily: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
                    Adicionar outro endereço
                  </button>
                  <span style={{ fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
                    até 3 endereços — útil pra clientes com casa e comércio
                  </span>
                </div>
              )}
            </div>

            {/* Observações */}
            <Textarea T={T} dark={dark}
              label="Observações"
              value={form.observacoes}
              onChange={v => update('observacoes', v)}
              placeholder="Ex: cliente recorrente, prefere atendimento pela manhã…"
              rows={3}
            />

            <div style={{ fontSize: 11, color: T.textMuted, padding: '6px 10px', borderRadius: 6, background: T.cardAlt }}>
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
            {onExcluir ? (
              <Button T={T} dark={dark} variant="ghost" iconLeft="ti-trash" onClick={onExcluir}>
                Excluir cliente
              </Button>
            ) : <div />}
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
        <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
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
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textSecondary }}>Sem OS registrada</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Este cliente ainda não passou pela oficina.</div>
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
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                      OS #{os.numero}
                    </span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>·</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, textTransform: 'capitalize' }}>
                      {cfg?.label || os.tipo}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: etapaCor + '22', color: etapaCor,
                      textTransform: 'uppercase', letterSpacing: '.3px',
                    }}>{labelEtapa(os)}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <i className="ti ti-calendar" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
                      {fmtDataCurta(os.abertura)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtBRL(os.valor)}
                  </span>
                  {['entrega', 'pagamento', 'concluido'].includes(os.etapa) && !os.garantia && os.tipo === 'atendimento' && estaEmGarantia(os) && (
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
                      <i className={`ti ${criandoGarantia === os.id ? 'ti-loader-2' : 'ti-shield-check'}`} style={{ fontSize: 12 }} aria-hidden="true" />
                      Garantia
                    </button>
                  )}
                  {clickable && (
                    <i className="ti ti-chevron-right" style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
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
