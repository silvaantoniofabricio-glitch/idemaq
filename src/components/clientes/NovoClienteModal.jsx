// idemaq-src/components/clientes/NovoClienteModal.jsx
// Modal de cadastro de cliente — tela /clientes (desktop).
// Segue o mesmo padrão visual do modo edição do ClienteDetalheModal.
// NÃO é usado pela NovaOSModal (que usa o _legacy/) — pode ser alterado livremente.
//
// Campos: nome*, telefone*, telefone2, endereço (AddressInput + cidade/uf/cep),
//         endereço 2 (opcional), e-mail, observações.
// telefone2 → sql/78 · endereco2 → sql/81

import React, { useState } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import {
  Modal, ModalHeader, Button, Input, Textarea, useToast,
} from '../ui'
import AddressInput from '../logistica/AddressInput'

export default function NovoClienteModal({
  T, dark, mobile,
  nomeInicial = '',
  onClose,
  onCriado,   // (cliente) => void · chamado após cadastro
  criar,      // hook.criar do useClientes — passado por quem abre o modal
}) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  const [form, setForm] = useState({
    nome:        nomeInicial,
    telefone:    '',
    telefone2:   '',
    endereco:    '',
    cidade:      'Naviraí',
    uf:          'MS',
    cep:         '',
    endereco2:   '',
    email:       '',
    observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const podeSalvar = !!form.nome.trim() && !!form.telefone.trim() && !salvando

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    const { data, error } = await criar(form)
    setSalvando(false)
    if (error) {
      notify('erro', error.message || 'Erro ao cadastrar cliente')
      return
    }
    notify('ok', 'Cliente cadastrado')
    onCriado?.(data)
    onClose?.()
  }

  const divider = <div style={{ height: 1, background: T.border }} />

  const SectionLabel = ({ icon, children }) => (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.5px',
      textTransform: 'uppercase', color: T.textMuted,
      marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12, color: azul }} aria-hidden="true" />
      {children}
    </div>
  )

  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={560}>
      <ModalHeader T={T} title="Novo cliente" icon="ti-user-plus" onClose={onClose} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* IDENTIFICAÇÃO */}
        <div>
          <SectionLabel icon="ti-user">Identificação</SectionLabel>
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

        {divider}

        {/* ENDEREÇO PRINCIPAL */}
        <div>
          <SectionLabel icon="ti-map-pin">Endereço principal</SectionLabel>
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

        {divider}

        {/* ENDEREÇO SECUNDÁRIO */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.5px',
            textTransform: 'uppercase', color: T.textMuted,
            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
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

        {divider}

        {/* OBSERVAÇÕES */}
        <div>
          <SectionLabel icon="ti-notes">Observações</SectionLabel>
          <Textarea T={T} dark={dark}
            value={form.observacoes}
            onChange={v => update('observacoes', v)}
            placeholder="Ex: cliente recorrente, prefere atendimento pela manhã, etc."
            rows={3}
          />
        </div>

        <div style={{
          fontSize: 11, color: T.textMuted,
          padding: '8px 12px', borderRadius: 6, background: T.cardAlt,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 5, color: azul }} aria-hidden="true" />
          Campos com <strong style={{ color: corHero(dark) }}>*</strong> são obrigatórios.
          Você pode completar os outros depois pela ficha do cliente.
        </div>
      </div>

      <div style={{
        padding: 14, borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 8, justifyContent: 'flex-end',
        background: T.cardAlt, flexShrink: 0,
      }}>
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
      </div>
    </Modal>
  )
}
