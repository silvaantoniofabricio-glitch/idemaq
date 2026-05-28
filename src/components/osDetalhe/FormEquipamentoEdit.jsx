// src/components/osDetalhe/FormEquipamentoEdit.jsx
// Edita os dados do equipamento da OS (marca, modelo, série, defeito).
// Aberto pelo Header do OSDetalhe ao clicar na linha de equipamento.
//
// Patch direto via onUpdateOS(numero, patch) — o normalizePatchOS traduz
// `marca/modelo/serie/defeito` pras colunas reais (`marca_equipamento`,
// `modelo_equipamento`, `numero_serie`, `defeito_relatado`).
// Colunas aplicadas via sql/10-os-equipamento.sql em 20/05/2026.

import React, { useState } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import {
  Modal, ModalHeader, Button, Input, Textarea,
  useToast,
} from '../ui'
import FotosColetaSection from './FotosColetaSection'

export default function FormEquipamentoEdit({
  T, dark, mobile,
  os,
  onClose,
  onUpdateOS,    // (numero, patch) => Promise · vem do Kanban (já trata optimistic + toast de erro)
}) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  const [form, setForm] = useState({
    marca: os?.marca || '',
    modelo: os?.modelo || '',
    serie: os?.serie || '',
    defeito: os?.defeito || '',
  })
  const [salvando, setSalvando] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Nenhum campo é obrigatório aqui — equipamento pode ter dados parciais
  // (ex: marca sem modelo, ou só o defeito relatado). Salvar só faz sentido
  // se algo realmente mudou.
  const alterado =
    (form.marca   || '') !== (os?.marca   || '') ||
    (form.modelo  || '') !== (os?.modelo  || '') ||
    (form.serie   || '') !== (os?.serie   || '') ||
    (form.defeito || '') !== (os?.defeito || '')

  const podeSalvar = alterado && !salvando

  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    const patch = {
      marca:   form.marca.trim()   || null,
      modelo:  form.modelo.trim()  || null,
      serie:   form.serie.trim()   || null,
      defeito: form.defeito.trim() || null,
    }
    // onUpdateOS já faz optimistic + persist + rollback + toast de erro.
    // Aqui só damos o feedback positivo e fechamos.
    await onUpdateOS?.(os.numero, patch)
    setSalvando(false)
    notify('ok', 'Equipamento atualizado')
    onClose?.()
  }

  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={520}>
      <ModalHeader T={T}
        title="Editar equipamento"
        subtitle={os?.numero ? `OS #${os.numero}` : undefined}
        icon="ti-tool"
        onClose={onClose}
      />

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          <Input T={T} dark={dark}
            label="Marca"
            value={form.marca}
            onChange={v => update('marca', v)}
            icon="ti-device-washing-machine"
            placeholder="Ex: Brastemp"
            autoFocus
          />
          <Input T={T} dark={dark}
            label="Modelo"
            value={form.modelo}
            onChange={v => update('modelo', v)}
            placeholder="Ex: BWK11AB"
          />
        </div>

        <Input T={T} dark={dark}
          label="Número de série"
          value={form.serie}
          onChange={v => update('serie', v)}
          icon="ti-hash"
          placeholder="Ex: 1A2B3C4D5E"
        />

        <Textarea T={T} dark={dark}
          label="Defeito relatado"
          value={form.defeito}
          onChange={v => update('defeito', v)}
          placeholder="Ex: não centrifuga, faz barulho na lavagem"
          rows={4}
        />

        <div style={{
          fontSize: 11, color: T.textMuted,
          padding: '8px 10px', borderRadius: 6,
          background: T.cardAlt,
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12, marginTop: 2, color: azul, flexShrink: 0 }} aria-hidden="true" />
          <span>
            Dados do equipamento são <strong style={{ color: corHero(dark) }}>desta OS</strong> — alterar aqui não muda OS anteriores do mesmo cliente.
          </span>
        </div>

        <FotosColetaSection
          T={T} dark={dark}
          os={os}
          onUpdateOS={onUpdateOS}
          onCamposExtraidos={(campos) => {
            // Auto-fill IA: preenche só campos vazios; nao sobrescreve o que
            // o usuario ja digitou. Usuario revisa e clica Salvar.
            setForm(f => ({
              ...f,
              marca:  f.marca  || campos.marca  || '',
              modelo: f.modelo || campos.modelo || '',
              serie:  f.serie  || campos.serie  || '',
            }))
          }}
        />
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
