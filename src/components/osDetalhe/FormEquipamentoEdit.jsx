// src/components/osDetalhe/FormEquipamentoEdit.jsx
// Edita os dados do equipamento da OS (marca, modelo, série, defeito).
// Aberto pelo Header do OSDetalhe ao clicar na linha de equipamento.
//
// Patch direto via onUpdateOS(numero, patch) — o normalizePatchOS traduz
// `marca/modelo/serie/defeito` pras colunas reais (`marca_equipamento`,
// `modelo_equipamento`, `numero_serie`, `defeito_relatado`).
// Colunas aplicadas via sql/10-os-equipamento.sql em 20/05/2026.

import React, { useState, useEffect, useRef } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import {
  Modal, ModalHeader, Button, Input, Textarea,
  useToast,
} from '../ui'
import {
  uploadFotoColeta, removerFotoColeta, resolverFotoUrl, FOTO_STORAGE_MARKER,
} from '../../utils/osStorage'
import FotosColetaSection from './FotosColetaSection'

export default function FormEquipamentoEdit({
  T, dark, mobile,
  os,
  onClose,
  onUpdateOS,    // (numero, patch) => Promise · vem do Kanban (já trata optimistic + toast de erro)
}) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const inputFotoRef = useRef(null)

  // Foto
  const fotoRef = os?.pre_diagnostico?.foto || os?.foto || null
  const [fotoUrl, setFotoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const url = await resolverFotoUrl(fotoRef, os.id)
      if (!cancelado) setFotoUrl(url || null)
    }
    if (fotoRef) carregar()
    else setFotoUrl(null)
    return () => { cancelado = true }
  }, [fotoRef, os?.id])

  async function escolherFoto(file) {
    if (!file || !file.type?.startsWith('image/')) {
      notify('erro', 'Selecione uma imagem (JPG/PNG).')
      return
    }
    setUploading(true)
    const res = await uploadFotoColeta(os.id, file)
    setUploading(false)
    if (!res.ok) { notify('erro', `Falha ao enviar foto: ${res.error}`); return }
    setFotoUrl(res.url)
    onUpdateOS?.(os.numero, {
      pre_diagnostico: { ...(os.pre_diagnostico || {}), foto: FOTO_STORAGE_MARKER },
    })
    notify('ok', 'Foto adicionada')
  }

  async function removerFoto() {
    if (!window.confirm('Remover a foto?')) return
    const res = await removerFotoColeta(os.id)
    if (!res.ok) { notify('erro', `Falha ao remover: ${res.error}`); return }
    setFotoUrl(null)
    const { foto, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
    notify('ok', 'Foto removida')
  }

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

        {/* Foto do equipamento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            onClick={() => !uploading && inputFotoRef.current?.click()}
            style={{
              width: 80, height: 80, flexShrink: 0,
              borderRadius: 10,
              border: `2px dashed ${fotoUrl ? 'transparent' : azul + '66'}`,
              background: fotoUrl
                ? `url(${fotoUrl}) center/cover no-repeat`
                : (dark ? '#1e2d3d' : '#eef4fb'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: uploading ? 'wait' : 'pointer',
              overflow: 'hidden', flexShrink: 0,
            }}
          >
            {!fotoUrl && !uploading && (
              <i className="ti ti-camera-plus"
                style={{ fontSize: 26, color: azul, opacity: 0.7 }}
                aria-hidden="true" />
            )}
            {uploading && (
              <i className="ti ti-loader-2"
                style={{ fontSize: 24, color: azul, animation: 'spin 1s linear infinite' }}
                aria-hidden="true" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>
              Foto do equipamento
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => !uploading && inputFotoRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: `1px solid ${azul}`,
                  background: 'transparent', color: azul,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {fotoUrl ? 'Trocar' : 'Adicionar'}
              </button>
              {fotoUrl && (
                <button
                  onClick={removerFoto}
                  style={{
                    padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.border}`,
                    background: 'transparent', color: T.textMuted,
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Remover
                </button>
              )}
            </div>
          </div>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => escolherFoto(e.target.files?.[0])}
          />
        </div>

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
