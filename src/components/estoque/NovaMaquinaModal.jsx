// idemaq-src/components/estoque/NovaMaquinaModal.jsx
// Formulário de cadastro de nova máquina (refurbish / revenda).
// Chama onSalvar(payload) — quem persiste é o consumidor (Estoque → useMaquinas.criar).

import React, { useMemo, useState } from 'react'
import { corEtapa } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, ModalHeader, Button, Input, Select, Textarea, useToast } from '../ui'

const ESTADOS = [
  { value: 'disponivel', label: 'Disponível'  },
  { value: 'em_revisao', label: 'Em revisão'  },
  { value: 'do_cliente', label: 'Do cliente'  },
  { value: 'vendida',    label: 'Vendida'     },
]

function toNum(v) {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function CampoLabel({ label, obrigatorio, children, erro, T, dark }) {
  const vermelho = corEtapa('red', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {label}
        {obrigatorio && <span style={{ color: vermelho, marginLeft: 3 }}>*</span>}
      </div>
      {children}
      {erro && (
        <span style={{ fontSize: 10.5, color: vermelho }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
          {erro}
        </span>
      )}
    </div>
  )
}

export default function NovaMaquinaModal({ T, dark, onClose, onSalvar, mobile, mostraValores = true }) {
  const notify  = useToast()
  const azul    = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    modelo:       '',
    marca:        '',
    capacidade:   '',
    estado:       'disponivel',
    custoCompra:  '',
    custoItens:   '',
    custoServico: '',
    precoVenda:   '',
    observacoes:  '',
  })
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const custoTotal = toNum(form.custoCompra) + toNum(form.custoItens) + toNum(form.custoServico)
  const margemRS   = toNum(form.precoVenda) - custoTotal
  const margemPct  = custoTotal > 0 ? Math.round((margemRS / custoTotal) * 100) : 0

  const erros = useMemo(() => {
    const e = {}
    if (!form.modelo.trim()) e.modelo = 'Obrigatório'
    return e
  }, [form.modelo])

  const podeSalvar = Object.keys(erros).length === 0 && !salvando

  async function salvar() {
    if (!podeSalvar) { notify('erro', 'Confira os campos destacados'); return }
    setSalvando(true)
    try {
      const payload = {
        modelo:       form.modelo.trim(),
        marca:        form.marca.trim()        || null,
        capacidade:   form.capacidade.trim()   || null,
        estado:       form.estado,
        custoCompra:  mostraValores ? toNum(form.custoCompra)  : 0,
        custoItens:   mostraValores ? toNum(form.custoItens)   : 0,
        custoServico: mostraValores ? toNum(form.custoServico) : 0,
        precoVenda:   toNum(form.precoVenda),
        observacoes:  form.observacoes.trim() || null,
      }
      const res = await onSalvar(payload)
      if (res?.error) {
        notify('erro', 'Erro ao salvar: ' + (res.error.message || res.error))
        setSalvando(false)
        return
      }
      notify('ok', 'Máquina cadastrada')
      onClose?.()
    } catch (e) {
      notify('erro', 'Erro ao salvar: ' + (e?.message || e))
      setSalvando(false)
    }
  }

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
  }

  const divider = <div style={{ height: 1, background: T.border, margin: '4px 0' }} />

  return (
    <Modal T={T} dark={dark} onClose={salvando ? undefined : onClose}
      mobile={mobile} closeOnOverlay={!salvando} maxWidth={560}>

      <ModalHeader T={T} icon="ti-device-washing-machine"
        title="Nova máquina"
        subtitle="Cadastrar máquina para revenda"
        onClose={salvando ? undefined : onClose}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identificação */}
          <div>
            <div style={sectionLabel}>
              <i className="ti ti-device-washing-machine" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
              Identificação
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CampoLabel label="Modelo" obrigatorio T={T} dark={dark} erro={erros.modelo}>
                <Input T={T} dark={dark}
                  value={form.modelo} onChange={set('modelo')}
                  icon="ti-tag"
                  placeholder="Ex: Lavadora Consul CWE10"
                  style={erros.modelo ? { borderColor: vermelho } : undefined}
                />
              </CampoLabel>
              <div style={{
                display: 'grid',
                gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
                gap: 10,
              }}>
                <CampoLabel label="Marca" T={T} dark={dark}>
                  <Input T={T} dark={dark}
                    value={form.marca} onChange={set('marca')}
                    icon="ti-building-factory"
                    placeholder="Ex: Consul, LG, Brastemp…"
                  />
                </CampoLabel>
                <CampoLabel label="Capacidade" T={T} dark={dark}>
                  <Input T={T} dark={dark}
                    value={form.capacidade} onChange={set('capacidade')}
                    icon="ti-weight"
                    placeholder="Ex: 10kg, 12kg…"
                  />
                </CampoLabel>
              </div>
            </div>
          </div>

          {divider}

          {/* Estado */}
          <div>
            <div style={sectionLabel}>
              <i className="ti ti-circle-dashed" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
              Estado inicial
            </div>
            <Select T={T} dark={dark}
              value={form.estado}
              onChange={set('estado')}
              options={ESTADOS}
            />
          </div>

          {/* Valores — só pro dono */}
          {mostraValores && (
            <>
              {divider}
              <div>
                <div style={sectionLabel}>
                  <i className="ti ti-cash" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
                  Custos &amp; preço
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
                  gap: 10,
                  marginBottom: 10,
                }}>
                  <CampoLabel label="Custo compra (R$)" T={T} dark={dark}>
                    <Input T={T} dark={dark}
                      type="number" inputMode="decimal"
                      value={form.custoCompra} onChange={set('custoCompra')}
                      placeholder="0"
                    />
                  </CampoLabel>
                  <CampoLabel label="Custo itens (R$)" T={T} dark={dark}>
                    <Input T={T} dark={dark}
                      type="number" inputMode="decimal"
                      value={form.custoItens} onChange={set('custoItens')}
                      placeholder="0"
                    />
                  </CampoLabel>
                  <CampoLabel label="Custo serviço (R$)" T={T} dark={dark}>
                    <Input T={T} dark={dark}
                      type="number" inputMode="decimal"
                      value={form.custoServico} onChange={set('custoServico')}
                      placeholder="0"
                    />
                  </CampoLabel>
                </div>
                <CampoLabel label="Preço de venda (R$)" T={T} dark={dark}>
                  <Input T={T} dark={dark}
                    type="number" inputMode="decimal"
                    value={form.precoVenda} onChange={set('precoVenda')}
                    icon="ti-currency-dollar"
                    placeholder="0"
                  />
                </CampoLabel>

                {/* Preview custo total + margem */}
                <div style={{
                  marginTop: 10, padding: '10px 14px',
                  background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
                  display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    Custo total:{' '}
                    <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRL(custoTotal)}
                    </strong>
                  </div>
                  <div style={{ width: 1, height: 16, background: T.border }} />
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    Margem:{' '}
                    <strong style={{ color: azul, fontVariantNumeric: 'tabular-nums' }}>
                      {margemPct}% · {fmtBRL(margemRS)}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {divider}

          {/* Observações */}
          <div>
            <div style={sectionLabel}>
              <i className="ti ti-notes" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
              Observações
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: T.textMuted }}>
                (opcional)
              </span>
            </div>
            <Textarea T={T} dark={dark}
              value={form.observacoes} onChange={set('observacoes')}
              placeholder="Detalhes adicionais sobre a máquina, procedência, defeitos conhecidos…"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        background: T.cardAlt, flexShrink: 0,
      }}>
        <Button T={T} dark={dark} variant="ghost" onClick={onClose} disabled={salvando}>
          Cancelar
        </Button>
        <Button variant="primary"
          iconLeft={salvando ? 'ti-loader-2 ti-spin' : 'ti-device-washing-machine'}
          onClick={salvar}
          disabled={!podeSalvar}>
          {salvando ? 'Salvando…' : 'Cadastrar máquina'}
        </Button>
      </div>
    </Modal>
  )
}
