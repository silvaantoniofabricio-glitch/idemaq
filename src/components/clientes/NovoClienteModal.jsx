// idemaq-src/components/clientes/NovoClienteModal.jsx
// Modal de cadastro de cliente — tela /clientes (desktop).
// Mesmo padrão do modo edição do ClienteDetalheModal:
//   - Formulário único sem divisões por seção
//   - 2 telefones · E-mail+CPF/CNPJ colapsáveis · até 3 endereços dinâmicos
// NÃO é usado pela NovaOSModal (_legacy/) — pode ser alterado livremente.

import React, { useState } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { Modal, ModalHeader, Button, Input, Textarea, useToast } from '../ui'
import AddressInput from '../logistica/AddressInput'

export default function NovoClienteModal({
  T, dark, mobile,
  nomeInicial = '',
  onClose,
  onCriado,
  criar,
}) {
  const notify   = useToast()
  const azul     = corEtapa('blue', dark)
  const vermelho = corEtapa('red',  dark)

  const [form, setForm] = useState({
    nome:        nomeInicial,
    telefone:    '',
    telefone2:   '',
    email:       '',
    cpf_cnpj:    '',
    observacoes: '',
  })
  const [enderecos, setEnderecos] = useState([''])
  const [infoExtra, setInfoExtra] = useState(false)
  const [salvando, setSalvando]   = useState(false)

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

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    const payload = {
      ...form,
      endereco:  enderecos[0]?.trim() || '',
      endereco2: enderecos[1]?.trim() || '',
      endereco3: enderecos[2]?.trim() || '',
    }
    const { data, error } = await criar(payload)
    setSalvando(false)
    if (error) {
      notify('erro', error.message || 'Erro ao cadastrar cliente')
      return
    }
    notify('ok', 'Cliente cadastrado')
    onCriado?.(data)
    onClose?.()
  }

  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={560}>
      <ModalHeader T={T} title="Novo cliente" icon="ti-user-plus" onClose={onClose} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>

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

        {/* Endereços — dinâmico até 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
          {enderecos.map((end, idx) => (
            <div key={idx}>
              {/* Label do endereço */}
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
                {idx > 0 && (
                  <button onClick={() => removeEndereco(idx)} title="Remover" style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.textMuted, padding: '2px 4px', borderRadius: 4, lineHeight: 0,
                  }}>
                    <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
                  </button>
                )}
              </div>
              <AddressInput
                T={T} dark={dark}
                value={end}
                onChange={({ endereco }) => updateEndereco(idx, endereco)}
                placeholder="Rua, número, bairro — cidade/UF"
              />
            </div>
          ))}

          {enderecos.length < 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '2px 0' }}>
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
          placeholder="Ex: cliente recorrente, prefere atendimento pela manhã, etc."
          rows={3}
        />

        <div style={{ fontSize: 11, color: T.textMuted, padding: '6px 10px', borderRadius: 6, background: T.cardAlt }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 5, color: azul }} aria-hidden="true" />
          Campos com <strong style={{ color: corHero(dark) }}>*</strong> são obrigatórios.
          Você pode completar os outros depois pela ficha do cliente.
        </div>
      </div>

      <div style={{
        padding: mobile ? '12px 16px' : 14,
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        gap: 8,
        justifyContent: mobile ? 'stretch' : 'flex-end',
        background: T.cardAlt, flexShrink: 0,
        paddingBottom: mobile ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : 14,
      }}>
        {mobile ? (
          <>
            <Button
              variant="primary"
              iconLeft={salvando ? 'ti-loader-2' : 'ti-check'}
              onClick={salvar}
              disabled={!podeSalvar}
              fullWidth
            >
              {salvando ? 'Salvando…' : 'Cadastrar cliente'}
            </Button>
            <Button variant="secondary" T={T} dark={dark} onClick={onClose} disabled={salvando} fullWidth>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" T={T} dark={dark} onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              iconLeft={salvando ? 'ti-loader-2' : 'ti-check'}
              onClick={salvar}
              disabled={!podeSalvar}
            >
              {salvando ? 'Salvando…' : 'Cadastrar cliente'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
