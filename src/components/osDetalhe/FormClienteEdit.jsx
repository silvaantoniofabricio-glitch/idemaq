// src/components/osDetalhe/FormClienteEdit.jsx
// Edita os dados do cliente VINCULADO à OS (não cria cliente novo).
// Aberto pelo Header do OSDetalhe ao clicar no nome do cliente.
//
// Schema real da tabela `cliente` (memória project_schema_cliente_real):
//   nome, telefone, endereco (text concat), email, observacoes
//   — NÃO existem colunas cidade/uf/cep separadas; concatenar no `endereco`.
//
// Fluxo:
//  1. Mount → SELECT cliente WHERE id=os.cliente_id (busca completa, useOS só traz nome+telefone)
//  2. Parseia endereco existente no separador ' — ' (formato gravado por criarClientePersist)
//  3. Salva via supabase.from('cliente').update(...).eq('id', os.cliente_id)
//  4. Chama onSalvarOk() pra disparar refetch do useOS no Kanban (cliente.nome/telefone
//     ficam stale até refetch — useOS subscreve só a tabela `os`, não `cliente`).
//
// Defaults: cidade=Naviraí · UF=MS (mesmos do NovoClienteModal).

import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { corEtapa, corHero } from '../../utils/colors'
import {
  Modal, ModalHeader, Button, Input, Textarea,
  useToast,
} from '../ui'

// Concatena os pedaços estruturados no formato gravado pelo helper
// criarClientePersist: "endereco_linha — cidade/UF — CEP". Pula partes vazias.
function montarEndereco({ enderecoLinha, cidade, uf, cep }) {
  const sufixoLocal = [cidade?.trim(), uf?.trim()].filter(Boolean).join('/')
  const partes = [enderecoLinha?.trim(), sufixoLocal, cep?.trim()].filter(Boolean)
  return partes.length ? partes.join(' — ') : ''
}

// Tenta separar o endereco gravado de volta nos campos estruturados.
// Aceita o formato " — " (novo) e cai pra "tudo no endereco_linha" se
// não houver separador (clientes legados importados do Bling).
function parseEndereco(endereco) {
  const base = { enderecoLinha: '', cidade: 'Naviraí', uf: 'MS', cep: '' }
  if (!endereco) return base
  const partes = endereco.split(' — ').map(p => p.trim()).filter(Boolean)
  if (partes.length === 0) return base
  base.enderecoLinha = partes[0]
  // partes[1] pode ser "Cidade/UF"
  if (partes[1]) {
    const cu = partes[1].split('/').map(p => p.trim())
    if (cu[0]) base.cidade = cu[0]
    if (cu[1]) base.uf = cu[1].toUpperCase().slice(0, 2)
  }
  // partes[2] = CEP
  if (partes[2]) base.cep = partes[2]
  return base
}

export default function FormClienteEdit({
  T, dark, mobile,
  os,            // pra pegar cliente_id e mostrar nome inicial enquanto carrega
  onClose,
  onSalvarOk,    // callback após save com sucesso (pai dispara refetch)
}) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  const [form, setForm] = useState({
    nome: os?.cliente || '',
    telefone: os?.fone || '',
    enderecoLinha: '',
    cidade: 'Naviraí',
    uf: 'MS',
    cep: '',
    email: '',
    observacoes: '',
  })
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroCarregar, setErroCarregar] = useState(null)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Carrega o cliente completo no mount — useOS só traz nome+telefone via join.
  useEffect(() => {
    let cancelado = false
    async function carregar() {
      if (!os?.cliente_id) {
        setCarregando(false)
        setErroCarregar('Esta OS não tem cliente vinculado')
        return
      }
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome, telefone, endereco, email, observacoes')
        .eq('id', os.cliente_id)
        .is('deleted_at', null)
        .single()
      if (cancelado) return
      if (error || !data) {
        setErroCarregar(error?.message || 'Cliente não encontrado')
        setCarregando(false)
        return
      }
      const end = parseEndereco(data.endereco)
      setForm({
        nome: data.nome || '',
        telefone: data.telefone || '',
        enderecoLinha: end.enderecoLinha,
        cidade: end.cidade,
        uf: end.uf,
        cep: end.cep,
        email: data.email || '',
        observacoes: data.observacoes || '',
      })
      setCarregando(false)
    }
    carregar()
    return () => { cancelado = true }
  }, [os?.cliente_id])

  const podeSalvar = !!form.nome.trim() && !salvando && !carregando && !erroCarregar

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    const enderecoFinal = montarEndereco(form)
    const patch = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      endereco: enderecoFinal || null,
      email: form.email.trim() || null,
      observacoes: form.observacoes.trim() || null,
    }
    const { error } = await supabase
      .from('cliente')
      .update(patch)
      .eq('id', os.cliente_id)
    setSalvando(false)
    if (error) {
      notify('erro', error.message || 'Erro ao salvar cliente')
      return
    }
    notify('ok', 'Cliente atualizado')
    onSalvarOk?.()
    onClose?.()
  }

  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={540}>
      <ModalHeader T={T}
        title="Editar cliente"
        subtitle={os?.numero ? `OS #${os.numero}` : undefined}
        icon="ti-user-edit"
        onClose={onClose}
      />

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {carregando && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px', borderRadius: 8,
            background: T.cardAlt, color: T.textMuted, fontSize: 12.5,
          }}>
            <i className="ti ti-loader-2" style={{ fontSize: 16, color: azul }} aria-hidden="true" />
            Carregando dados do cliente…
          </div>
        )}

        {erroCarregar && !carregando && (
          <div style={{
            padding: '14px 16px', borderRadius: 8,
            background: dark ? '#2a1515' : '#fde8e8',
            color: dark ? '#FF6B6B' : '#c04242',
            fontSize: 12.5, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 16 }} aria-hidden="true" />
            {erroCarregar}
          </div>
        )}

        {!carregando && !erroCarregar && (
          <>
            <Input T={T} dark={dark}
              label="Nome completo *"
              value={form.nome}
              onChange={v => update('nome', v)}
              placeholder="Ex: Maria Silva"
              autoFocus
              required
            />

            <Input T={T} dark={dark}
              label="Telefone"
              type="tel"
              value={form.telefone}
              onChange={v => update('telefone', v)}
              icon="ti-brand-whatsapp"
              placeholder="(67) 9 0000-0000"
            />

            <Input T={T} dark={dark}
              label="Endereço (rua, número, bairro)"
              value={form.enderecoLinha}
              onChange={v => update('enderecoLinha', v)}
              icon="ti-map-pin"
              placeholder="Rua das Flores, 123, Centro"
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
                onChange={v => update('uf', v.toUpperCase().slice(0, 2))}
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
              placeholder="Ex: prefere atendimento pela manhã, cliente recorrente, etc."
              rows={3}
            />

            <div style={{
              fontSize: 11, color: T.textMuted,
              padding: '8px 10px', borderRadius: 6,
              background: T.cardAlt,
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <i className="ti ti-info-circle" style={{ fontSize: 12, marginTop: 2, color: azul, flexShrink: 0 }} aria-hidden="true" />
              <span>
                Cidade, UF e CEP são gravados juntos no campo <strong style={{ color: corHero(dark) }}>endereço</strong> (o banco não tem colunas separadas).
                Campos com <strong style={{ color: corHero(dark) }}>*</strong> são obrigatórios.
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{
        padding: 14, borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 8, justifyContent: 'flex-end',
        background: T.cardAlt,
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
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </Modal>
  )
}
