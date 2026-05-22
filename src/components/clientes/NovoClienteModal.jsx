// idemaq-src/components/clientes/NovoClienteModal.jsx
// Modal próprio de cadastro de cliente. Substitui o NovoClienteModalCompleto
// do _legacy/ na tela /clientes (o legacy continua sendo usado pela NovaOSModal
// até refatoração futura — não tocar lá).
//
// Salva via useClientes().criar(). Toast verde em sucesso, vermelho em erro.
// Campos seguem schema exato da tabela `cliente` — sem campos inventados.

import React, { useState } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import {
  Modal, ModalHeader, Button, Input, Textarea,
  useToast,
} from '../ui'
import AddressInput from '../logistica/AddressInput'

export default function NovoClienteModal({
  T, dark, mobile,
  nomeInicial = '',
  onClose,
  onCriado,   // (cliente) => void · chamado após cadastro com o cliente recém-criado
  criar,      // hook.criar do useClientes — passado por quem abre o modal
}) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  // Campos cidade/uf/cep são auxiliares de UX — o helper criarClientePersist
  // concatena tudo no `endereco` (a tabela `cliente` não tem essas colunas).
  const [form, setForm] = useState({
    nome: nomeInicial,
    telefone: '',
    endereco: '',
    cidade: 'Naviraí',
    uf: 'MS',
    cep: '',
    email: '',
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

  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={520}>
      <ModalHeader T={T} title="Novo cliente" icon="ti-user-plus" onClose={onClose} />

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <Input T={T} dark={dark}
          label="Nome completo *"
          value={form.nome}
          onChange={v => update('nome', v)}
          placeholder="Ex: Maria Silva"
          autoFocus
          required
        />

        <Input T={T} dark={dark}
          label="Telefone *"
          type="tel"
          value={form.telefone}
          onChange={v => update('telefone', v)}
          icon="ti-brand-whatsapp"
          placeholder="(67) 9 0000-0000"
          required
        />

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

        <Input T={T} dark={dark}
          label="E-mail"
          type="email"
          value={form.email}
          onChange={v => update('email', v)}
          icon="ti-mail"
          placeholder="cliente@email.com"
        />

        <Textarea T={T} dark={dark}
          label="Observações"
          value={form.observacoes}
          onChange={v => update('observacoes', v)}
          placeholder="Ex: cliente recorrente, prefere atendimento pela manhã, etc."
          rows={3}
        />

        <div style={{
          fontSize: 11, color: T.textMuted,
          padding: '6px 10px', borderRadius: 6,
          background: T.cardAlt,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 5, color: azul }} aria-hidden="true" />
          Campos com <strong style={{ color: corHero(dark) }}>*</strong> são obrigatórios. Você pode completar os outros depois pela ficha do cliente.
        </div>
      </div>

      <div style={{
        padding: 14, borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 8, justifyContent: 'flex-end',
        background: T.cardAlt,
        flexShrink: 0, // mantém os botões fixos quando o form rola
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
