// src/components/osDetalhe/FotosColetaSection.jsx
// Seção "Fotos da coleta" reutilizável — Apple HIG.
// Dois modos:
//   - readOnly={true}  : só visualiza (tap abre FotoAmpliadaModal). Usado no
//                        Resumo (RelatorioTab) — não permite alterar.
//   - readOnly={false} : permite upload (câmera/galeria) + remover. Usado em
//                        FormEquipamentoEdit e na ação Coleta.
//
// Backend: usa o mesmo padrão de AcaoColetaHIG (pre_diagnostico.foto_coleta_1/2
// + uploadFotoOS/resolverFotoUrl/removerFotoOS do utils/osStorage).
//
// Slot vazio em readOnly fica oculto (não polui o resumo com placeholders).

import React, { useEffect, useRef, useState } from 'react'
import {
  uploadFotoOS, resolverFotoUrl, removerFotoOS, FOTO_STORAGE_MARKER,
} from '../../utils/osStorage'
import { corEtapa } from '../../utils/colors'
import { supabase } from '../../supabase'
import { useToast } from '../ui'
import FotoAmpliadaModal from './FotoAmpliadaModal'

const SLOTS = [
  { idx: 1, key: 'foto_coleta_1', label: 'Etiqueta',     tipo: 'coleta_1', legacyKey: 'foto_coleta' },
  { idx: 2, key: 'foto_coleta_2', label: 'Estado geral', tipo: 'coleta_2' },
]

export default function FotosColetaSection({
  T, dark, os, onUpdateOS,
  readOnly = false,
  onCamposExtraidos,  // (campos) => void — opcional. Se passado, recebe { marca, modelo, serie }
                      // detectados na etiqueta. Quando ausente, FotosColetaSection persiste
                      // direto via onUpdateOS (preenchendo só campos vazios).
}) {
  const azul = corEtapa('blue', dark)
  const notify = useToast()

  const [urls, setUrls] = useState({ 1: null, 2: null })
  const [uploading, setUploading] = useState({ 1: false, 2: false })
  const [lendoEtiqueta, setLendoEtiqueta] = useState(false)
  const [escolhaSlot, setEscolhaSlot] = useState(null) // slot do action sheet (1|2|null)
  const [ampliada, setAmpliada] = useState(null)

  const inputCam1 = useRef(null)
  const inputGal1 = useRef(null)
  const inputCam2 = useRef(null)
  const inputGal2 = useRef(null)

  // Resolve URLs sempre que pre_diagnostico mudar
  useEffect(() => {
    let canc = false
    ;(async () => {
      const pd = os?.pre_diagnostico || {}
      const u1 = await resolverFotoUrl(pd.foto_coleta_1 || pd.foto_coleta || null, os?.id, 'coleta_1')
      const u2 = await resolverFotoUrl(pd.foto_coleta_2 || null, os?.id, 'coleta_2')
      if (!canc) setUrls({ 1: u1, 2: u2 })
    })()
    return () => { canc = true }
  }, [os?.id, os?.pre_diagnostico])

  async function escolherFoto(file, slot) {
    if (!file?.type?.startsWith('image/')) return
    setUploading(u => ({ ...u, [slot]: true }))
    const tipo = slot === 1 ? 'coleta_1' : 'coleta_2'
    const res = await uploadFotoOS(os.id, file, tipo)
    setUploading(u => ({ ...u, [slot]: false }))
    if (!res.ok) return
    setUrls(u => ({ ...u, [slot]: res.url }))
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        [`foto_coleta_${slot}`]: FOTO_STORAGE_MARKER,
      },
    })

    // Auto-OCR: se foi a etiqueta (slot 1), chama Claude pra extrair marca/modelo/série.
    // Falha silenciosa se a edge function não estiver deployada (não atrapalha o fluxo).
    if (slot === 1 && res.url) {
      lerEtiqueta(res.url)
    }
  }

  async function lerEtiqueta(imageUrl) {
    setLendoEtiqueta(true)
    try {
      const { data, error } = await supabase.functions.invoke('extrair-etiqueta', {
        body: { imageUrl },
      })
      if (error || !data?.ok) {
        // Falha silenciosa — usuário preenche manual
        if (error) console.warn('[extrair-etiqueta] falha:', error)
        return
      }
      const campos = {
        marca:  data.marca  || null,
        modelo: data.modelo || null,
        serie:  data.serie  || null,
      }
      const detectados = Object.entries(campos).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)
      if (detectados.length === 0) {
        notify('info', 'Etiqueta ilegível — preencha manual')
        return
      }

      // Quem aplica: callback do parent (se passado) ou onUpdateOS direto.
      if (onCamposExtraidos) {
        onCamposExtraidos(campos)
      } else {
        // Persiste só os campos vazios (não sobrescreve o que usuário já digitou)
        const patch = {}
        if (campos.marca  && !(os?.marca   || os?.marca_equipamento))   patch.marca  = campos.marca
        if (campos.modelo && !(os?.modelo  || os?.modelo_equipamento))  patch.modelo = campos.modelo
        if (campos.serie  && !(os?.serie   || os?.numero_serie))        patch.serie  = campos.serie
        if (Object.keys(patch).length) {
          onUpdateOS?.(os.numero, patch)
        }
      }

      notify('ok', `Etiqueta lida: ${detectados.join(' · ')}`)
    } catch (e) {
      console.warn('[extrair-etiqueta] exception:', e)
    } finally {
      setLendoEtiqueta(false)
    }
  }

  async function removerFoto(slot) {
    if (!window.confirm('Remover esta foto?')) return
    const tipo = slot === 1 ? 'coleta_1' : 'coleta_2'
    await removerFotoOS(os.id, tipo)
    setUrls(u => ({ ...u, [slot]: null }))
    const key = `foto_coleta_${slot}`
    const { [key]: _, ...resto } = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, { pre_diagnostico: resto })
  }

  // Em readOnly: se nenhuma foto, não renderiza nada (não polui o resumo).
  if (readOnly && !urls[1] && !urls[2]) return null

  // Em readOnly: mostra só os slots com foto
  const slotsVisiveis = readOnly
    ? SLOTS.filter(s => urls[s.idx])
    : SLOTS

  return (
    <section>
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: T.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '0 14px 6px',
      }}>
        Fotos da coleta
      </div>

      <div style={{
        background: T.card,
        borderRadius: 12,
        padding: 10,
        boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: slotsVisiveis.length === 1 ? '1fr' : '1fr 1fr',
          gap: 8,
        }}>
          {slotsVisiveis.map(s => (
            <FotoSlot
              key={s.idx}
              T={T} dark={dark} azul={azul}
              label={s.label}
              url={urls[s.idx]}
              uploading={uploading[s.idx]}
              processandoIA={s.idx === 1 && lendoEtiqueta}
              readOnly={readOnly}
              onTap={() => {
                if (urls[s.idx]) setAmpliada({ url: urls[s.idx], alt: s.label })
                else if (!readOnly) setEscolhaSlot(s.idx)
              }}
              onRemove={() => removerFoto(s.idx)}
            />
          ))}
        </div>

        {!readOnly && (
          <div style={{
            fontSize: 11, color: T.textMuted,
            padding: '8px 4px 2px',
            letterSpacing: '-0.005em',
          }}>
            Registre a etiqueta e o estado da máquina antes de sair.
          </div>
        )}
      </div>

      {/* Inputs ocultos para câmera e galeria */}
      {!readOnly && (
        <>
          <input ref={inputCam1} type="file" accept="image/*" capture="environment"
            onChange={(e) => escolherFoto(e.target.files?.[0], 1)} style={{ display: 'none' }} />
          <input ref={inputGal1} type="file" accept="image/*"
            onChange={(e) => escolherFoto(e.target.files?.[0], 1)} style={{ display: 'none' }} />
          <input ref={inputCam2} type="file" accept="image/*" capture="environment"
            onChange={(e) => escolherFoto(e.target.files?.[0], 2)} style={{ display: 'none' }} />
          <input ref={inputGal2} type="file" accept="image/*"
            onChange={(e) => escolherFoto(e.target.files?.[0], 2)} style={{ display: 'none' }} />
        </>
      )}

      {/* Action sheet (Câmera / Galeria) */}
      {escolhaSlot && (
        <ActionSheet
          T={T} dark={dark}
          onClose={() => setEscolhaSlot(null)}
          actions={[
            {
              label: 'Tirar foto',
              onClick: () => {
                const ref = escolhaSlot === 1 ? inputCam1 : inputCam2
                ref.current?.click()
                setEscolhaSlot(null)
              },
            },
            {
              label: 'Escolher da galeria',
              onClick: () => {
                const ref = escolhaSlot === 1 ? inputGal1 : inputGal2
                ref.current?.click()
                setEscolhaSlot(null)
              },
            },
          ]}
        />
      )}

      {/* Foto ampliada */}
      {ampliada && (
        <FotoAmpliadaModal
          src={ampliada.url}
          alt={ampliada.alt}
          onClose={() => setAmpliada(null)}
        />
      )}
    </section>
  )
}

// ─── Slot de foto ─────────────────────────────────────────────────────────
function FotoSlot({ T, dark, azul, label, url, uploading, processandoIA, readOnly, onTap, onRemove }) {
  const Tag = url ? 'div' : 'button'
  return (
    <div style={{
      position: 'relative',
      borderRadius: 10, overflow: 'hidden',
      border: `1px ${url ? 'solid' : 'dashed'} ${T.border}`,
      background: url ? '#000' : T.bg,
      aspectRatio: '4 / 3',
    }}>
      {url ? (
        <>
          <img src={url} alt={label}
            onClick={onTap}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              cursor: 'pointer',
            }} />
          {!readOnly && (
            <button type="button" onClick={onRemove}
              aria-label="Remover foto"
              style={{
                position: 'absolute', top: 6, right: 6,
                width: 28, height: 28, borderRadius: 999,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
            </button>
          )}
          <span style={{
            position: 'absolute', bottom: 6, left: 8,
            fontSize: 11, fontWeight: 500,
            color: '#fff', background: 'rgba(0,0,0,0.55)',
            padding: '2px 8px', borderRadius: 6,
            backdropFilter: 'blur(4px)',
          }}>
            {label}
          </span>

          {processandoIA && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              color: '#fff', fontFamily: 'inherit',
              backdropFilter: 'blur(2px)',
            }}>
              <i className="ti ti-sparkles" style={{ fontSize: 22 }} aria-hidden="true" />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.005em' }}>
                Lendo etiqueta…
              </span>
            </div>
          )}
        </>
      ) : (
        <button type="button" onClick={onTap} disabled={uploading || readOnly}
          style={{
            width: '100%', height: '100%',
            background: 'transparent', border: 'none',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            color: azul, fontFamily: 'inherit',
            cursor: uploading ? 'wait' : (readOnly ? 'default' : 'pointer'),
            WebkitTapHighlightColor: 'transparent',
          }}>
          <i className={`ti ${uploading ? 'ti-loader-2' : 'ti-camera-plus'}`}
            style={{ fontSize: 22, color: azul }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 500, color: azul }}>
            {uploading ? 'Enviando…' : label}
          </span>
        </button>
      )}
    </div>
  )
}

// ─── iOS Action Sheet ─────────────────────────────────────────────────────
function ActionSheet({ T, dark, onClose, actions }) {
  const _mdb = useRef(false)
  const azul = corEtapa('blue', dark)
  return (
    <div
      onMouseDown={(e) => { _mdb.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && _mdb.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 8,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
        <div style={{
          background: dark ? '#1C1C1E' : '#FFFFFF',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {actions.map((a, i) => (
            <React.Fragment key={i}>
              <button onClick={a.onClick}
                style={{
                  width: '100%', minHeight: 56,
                  padding: 12,
                  border: 'none', background: 'transparent',
                  fontSize: 17, fontFamily: 'inherit',
                  color: azul,
                  fontWeight: 400, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                {a.label}
              </button>
              {i < actions.length - 1 && (
                <div style={{ height: 0.5, background: T.border }} />
              )}
            </React.Fragment>
          ))}
        </div>
        <button onClick={onClose}
          style={{
            minHeight: 56, borderRadius: 14,
            background: dark ? '#1C1C1E' : '#FFFFFF',
            border: 'none', cursor: 'pointer',
            fontSize: 17, fontWeight: 600, fontFamily: 'inherit',
            color: azul,
            WebkitTapHighlightColor: 'transparent',
          }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
