// idemaq-src/components/clientes/NovoClienteModal.jsx
// Modal de cadastro de cliente — tela /clientes (desktop).
// Mesmo padrão do modo edição do ClienteDetalheModal:
//   - Formulário único sem divisões por seção
//   - 2 telefones · E-mail+CPF/CNPJ colapsáveis · até 3 endereços dinâmicos
// NÃO é usado pela NovaOSModal (_legacy/) — pode ser alterado livremente.

import React, { useState } from 'react'
import { corEtapa } from '../../utils/colors'
import { Modal, Input, Textarea, useToast } from '../ui'
import AddressInput from '../logistica/AddressInput'
import { AtlPanel, ATL_FONT, atlSurfaceSunken, AtlButton } from '../osDetalhe/acoes/_AtlassianUI'

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
      {/* Header Atlassian inline */}
      <div style={{
        padding: '4px 14px 12px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: T.card, flexShrink: 0,
        fontFamily: ATL_FONT,
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary, letterSpacing: '-0.01em', fontFamily: ATL_FONT }}>
            Novo cliente
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
            {podeSalvar
              ? <span style={{ color: corEtapa('green', dark) }}>
                  <i className="ti ti-check" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
                  pronto para salvar
                </span>
              : 'Nome e telefone são obrigatórios'}
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 3,
          background: atlSurfaceSunken(dark),
          border: `1px solid ${T.border}`,
          color: T.textPrimary, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
          padding: 0, fontFamily: 'inherit',
        }}>
          <i className="ti ti-x" style={{ fontSize: 18 }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: T.bg, overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px' }}>

          {/* Seção: Contato */}
          <AtlPanel T={T} dark={dark} title="Contato" >
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Input T={T} dark={dark}
                label="Nome completo *"
                size="lg"
                value={form.nome}
                onChange={v => update('nome', v)}
                placeholder="Ex: Maria Silva"
                autoFocus
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Input T={T} dark={dark}
                  label="Telefone *" type="tel"
                  size="lg"
                  value={form.telefone}
                  onChange={v => update('telefone', v)}
                  icon="ti-brand-whatsapp"
                  placeholder="(67) 9 0000-0000"
                />
                <Input T={T} dark={dark}
                  label="Telefone 2" type="tel"
                  size="lg"
                  value={form.telefone2}
                  onChange={v => update('telefone2', v)}
                  icon="ti-phone"
                  placeholder="(67) 9 0000-0000"
                />
              </div>
            </div>
          </AtlPanel>

          {/* Seção: Endereços */}
          <AtlPanel T={T} dark={dark} title="Endereços">
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {enderecos.map((end, idx) => (
                <div key={idx}>
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
                      {idx === 0 ? 'Principal' : `Endereço ${idx + 1}`}
                      {idx === 0 && (
                        <span style={{ color: vermelho, marginLeft: 2 }}>*</span>
                      )}
                    </div>
                    {idx > 0 && (
                      <button onClick={() => removeEndereco(idx)} title="Remover" style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: T.textMuted, padding: '2px 4px', borderRadius: 3, lineHeight: 0,
                        WebkitTapHighlightColor: 'transparent',
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
                <button
                  type="button"
                  onClick={addEndereco}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: azul, fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 8px', fontFamily: ATL_FONT,
                    WebkitTapHighlightColor: 'transparent',
                    alignSelf: 'flex-start',
                  }}
                >
                  <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
                  Adicionar outro endereço
                </button>
              )}
            </div>
          </AtlPanel>

          {/* Seção: Email · CPF/CNPJ — colapsável */}
          <AtlPanel T={T} dark={dark} title="Email · CPF/CNPJ" action={
            <button
              type="button"
              onClick={() => setInfoExtra(v => !v)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: azul, fontSize: 12, fontWeight: 600,
                fontFamily: ATL_FONT,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 4px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <i className={`ti ${infoExtra ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 13 }} aria-hidden="true" />
              {infoExtra ? 'ocultar' : 'expandir'}
            </button>
          }>
            {infoExtra && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <Input T={T} dark={dark}
                    label="E-mail" type="email"
                    size="lg"
                    value={form.email}
                    onChange={v => update('email', v)}
                    icon="ti-mail"
                    placeholder="cliente@email.com"
                  />
                  <Input T={T} dark={dark}
                    label="CPF/CNPJ"
                    size="lg"
                    value={form.cpf_cnpj}
                    onChange={v => update('cpf_cnpj', v)}
                    icon="ti-id-badge"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            )}
          </AtlPanel>

          {/* Seção: Observações */}
          <AtlPanel T={T} dark={dark} title="Observações">
            <div style={{ padding: '12px 14px' }}>
              <Textarea T={T} dark={dark}
                value={form.observacoes}
                onChange={v => update('observacoes', v)}
                placeholder="Ex: cliente recorrente, prefere atendimento pela manhã..."
                rows={3}
              />
            </div>
          </AtlPanel>

        </div>
      </div>

      {/* Footer Atlassian */}
      <div style={{
        padding: mobile ? '12px 14px' : '10px 14px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', flexDirection: mobile ? 'column' : 'row',
        gap: 8, background: T.card, flexShrink: 0,
        paddingBottom: mobile ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : undefined,
        fontFamily: ATL_FONT,
      }}>
        <AtlButton variant="primary" fullWidth={mobile} icon={salvando ? 'loader-2' : 'check'} onClick={salvar} disabled={!podeSalvar} T={T} dark={dark}>
          {salvando ? 'Salvando…' : 'Cadastrar cliente'}
        </AtlButton>
        {mobile
          ? <AtlButton variant="default" fullWidth onClick={onClose} T={T} dark={dark}>Cancelar</AtlButton>
          : <AtlButton variant="default" onClick={onClose} T={T} dark={dark}>Cancelar</AtlButton>
        }
      </div>
    </Modal>
  )
}
