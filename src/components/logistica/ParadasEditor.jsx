// idemaq-src/components/logistica/ParadasEditor.jsx
// Lista editável de paradas (coleta / entrega / serviço) com drag-and-drop
// nativo HTML5 (o projeto não usa @dnd-kit). Usado por NovaRotaModal e
// RotaDetalheModal — mantém o shape do jsonb `paradas` documentado em
// contexto-logistica.md §3 (id, ordem, tipo, os_id, os_num, cliente_nome,
// cliente_fone, endereco, lat, lng, horario_previsto, status, observacoes).
//
// Props:
//   - paradas        : array (controlled)
//   - onChange(next) : novo array (não persiste — quem decide é o modal pai)
//   - osOptions      : [{ value: uuid, label: 'OS #247 — João' , numero, cliente, fone }] (opcional)
//   - onConcluirParada(paradaId)?  — exibe botão "Concluir" por parada (só na edição)
//   - T, dark
//
// A renumeração `ordem` é feita pelo pai no momento de salvar (ou pelo hook
// reordenarParadas quando aplicável). Aqui só mantemos a sequência do array.

import React, { useState } from 'react'
import { Input, Select, Button, Badge } from '../ui'
import { corEtapa, bgEtapa } from '../../utils/colors'
import AddressInput from './AddressInput'
import { supabase } from '../../supabase'

// Tipos canônicos do jsonb `paradas` — alinhados com MapaLogistica.jsx e
// AdicionarOSARotaModal.jsx (sessão geral 20/05 noite). NÃO alterar sem
// atualizar os outros dois lugares também.
const TIPOS = [
  { value: 'coleta',   label: 'Coleta',   icon: 'ti-arrow-down-circle' },
  { value: 'entrega',  label: 'Entrega',  icon: 'ti-truck-delivery' },
  { value: 'cobranca', label: 'Cobrança', icon: 'ti-cash' },
  { value: 'visita',   label: 'Visita',   icon: 'ti-tool' },
  { value: 'avulsa',   label: 'Avulsa',   icon: 'ti-pin' },
]

function novoUid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

export function paradaVazia(tipo = 'coleta') {
  return {
    id: novoUid(),
    ordem: 0,
    tipo,
    os_id: null,
    os_num: null,
    cliente_nome: '',
    cliente_fone: '',
    endereco: '',
    lat: null,
    lng: null,
    horario_previsto: '',
    horario_chegada: null,
    status: 'pendente',
    foto_url: null,
    observacoes: null,
  }
}

export default function ParadasEditor({
  T, dark,
  paradas = [],
  onChange,
  osOptions = [],
  onConcluirParada,
}) {
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const neutro = T?.textMuted || '#9CA3AF'
  const [dragIdx, setDragIdx] = useState(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  // Endereços salvos do cliente por parada: { [paradaId]: string[] }
  const [enderecosMap, setEnderecosMap] = useState({})
  // Qual parada tem o dropdown de endereços aberto
  const [dropdownEnd, setDropdownEnd] = useState(null)
  const [carregandoEnd, setCarregandoEnd] = useState(null)

  async function verEnderecos(paradaId, osId) {
    if (dropdownEnd === paradaId) { setDropdownEnd(null); return }
    if (enderecosMap[paradaId]) { setDropdownEnd(paradaId); return }
    setCarregandoEnd(paradaId)
    try {
      const { data } = await supabase
        .from('os')
        .select('cliente:cliente_id(endereco, endereco2, endereco3)')
        .eq('id', osId)
        .single()
      const c = data?.cliente
      const lista = [c?.endereco, c?.endereco2, c?.endereco3].filter(Boolean)
      setEnderecosMap(prev => ({ ...prev, [paradaId]: lista }))
      setDropdownEnd(paradaId)
    } catch {
      setEnderecosMap(prev => ({ ...prev, [paradaId]: [] }))
      setDropdownEnd(paradaId)
    } finally {
      setCarregandoEnd(null)
    }
  }

  function escolherEndereco(idx, paradaId, endereco) {
    alterarParada(idx, { endereco, lat: null, lng: null })
    setDropdownEnd(null)
  }

  function corTipo(tipo) {
    if (tipo === 'coleta')   return azul
    if (tipo === 'entrega')  return verde
    if (tipo === 'cobranca') return amarelo
    if (tipo === 'visita')   return azulClaro
    if (tipo === 'avulsa')   return neutro
    return amarelo
  }
  function bgTipo(tipo) {
    if (tipo === 'coleta')   return bgEtapa('blue', dark)
    if (tipo === 'entrega')  return bgEtapa('green', dark)
    if (tipo === 'cobranca') return bgEtapa('yellow', dark)
    if (tipo === 'visita')   return bgEtapa('blueLight', dark)
    if (tipo === 'avulsa')   return T?.cardAlt || (dark ? '#202024' : '#f5f5f7')
    return bgEtapa('yellow', dark)
  }
  function iconeTipo(tipo) {
    const t = TIPOS.find(x => x.value === tipo)
    return t?.icon || 'ti-map-pin'
  }

  function alterarParada(idx, patch) {
    const next = paradas.map((p, i) => i === idx ? { ...p, ...patch } : p)
    onChange?.(next)
  }

  function removerParada(idx) {
    const next = paradas.filter((_, i) => i !== idx)
    onChange?.(next)
  }

  function adicionarParada() {
    const tipoSugerido = paradas.length === 0 ? 'coleta' : (paradas[paradas.length - 1].tipo === 'coleta' ? 'entrega' : 'coleta')
    onChange?.([...paradas, paradaVazia(tipoSugerido)])
  }

  // ─── Drag-and-drop nativo HTML5 ────────────────────────────────────────
  function onDragStart(e, idx) {
    setDragIdx(idx)
    try { e.dataTransfer.effectAllowed = 'move' } catch {}
    try { e.dataTransfer.setData('text/plain', String(idx)) } catch {}
  }
  function onDragOver(e, idx) {
    e.preventDefault()
    try { e.dataTransfer.dropEffect = 'move' } catch {}
    if (idx !== hoverIdx) setHoverIdx(idx)
  }
  function onDragLeave() {
    setHoverIdx(null)
  }
  function onDrop(e, idxAlvo) {
    e.preventDefault()
    const idxOrigem = dragIdx
    setDragIdx(null)
    setHoverIdx(null)
    if (idxOrigem == null || idxOrigem === idxAlvo) return
    const copia = paradas.slice()
    const [item] = copia.splice(idxOrigem, 1)
    copia.splice(idxAlvo, 0, item)
    onChange?.(copia)
  }
  function onDragEnd() {
    setDragIdx(null)
    setHoverIdx(null)
  }

  function escolherOS(idx, osId) {
    if (!osId) {
      alterarParada(idx, { os_id: null, os_num: null })
      return
    }
    const os = osOptions.find(o => o.value === osId)
    if (!os) {
      alterarParada(idx, { os_id: osId })
      return
    }
    const atual = paradas[idx] || {}
    alterarParada(idx, {
      os_id: os.value,
      os_num: os.numero ?? null,
      // Só preenche cliente_nome/fone se estavam vazios — não sobrescreve
      // edição manual do operador.
      cliente_nome: atual.cliente_nome || os.cliente || '',
      cliente_fone: atual.cliente_fone || os.fone || '',
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {paradas.length === 0 && (
        <div style={{
          padding: '20px 14px',
          border: `1px dashed ${T?.border}`,
          borderRadius: 10,
          textAlign: 'center',
          color: T?.textMuted,
          fontSize: 12.5,
        }}>
          Nenhuma parada ainda. Clique em <strong style={{ color: T?.textPrimary }}>“Adicionar parada”</strong> abaixo.
        </div>
      )}

      {paradas.map((p, idx) => {
        const cor = corTipo(p.tipo)
        const bg = bgTipo(p.tipo)
        const icone = iconeTipo(p.tipo)
        const arrastando = dragIdx === idx
        const sobre = hoverIdx === idx && dragIdx != null && dragIdx !== idx
        const concluida = p.status === 'concluida'

        return (
          <div
            key={p.id}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, idx)}
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 10,
              padding: 12,
              borderRadius: 10,
              background: T?.card,
              border: `1px solid ${sobre ? cor : T?.border}`,
              boxShadow: sobre ? `0 0 0 3px ${cor}22` : 'none',
              opacity: arrastando ? 0.5 : (concluida ? 0.7 : 1),
              transition: 'border-color .12s, box-shadow .12s, opacity .12s',
            }}
          >
            {/* Coluna 1: handle de drag + número da ordem */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragEnd={onDragEnd}
              title="Arraste para reordenar"
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'flex-start',
                gap: 6,
                cursor: 'grab',
                userSelect: 'none',
                paddingTop: 2,
              }}
            >
              <i className="ti ti-grip-vertical" style={{ fontSize: 16, color: T?.textDim }} aria-hidden="true" />
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: bg,
                border: `1px solid ${cor}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: cor,
                fontVariantNumeric: 'tabular-nums',
              }}>{idx + 1}</div>
              <i className={`ti ${icone}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />
            </div>

            {/* Coluna 2: campos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 140px) 1fr 120px',
                gap: 8,
              }}>
                <Select
                  T={T} dark={dark}
                  value={p.tipo}
                  onChange={(v) => alterarParada(idx, { tipo: v })}
                  options={TIPOS.map(t => ({ value: t.value, label: t.label }))}
                  size="sm"
                />
                <Input
                  T={T} dark={dark}
                  value={p.cliente_nome || ''}
                  onChange={(v) => alterarParada(idx, { cliente_nome: v })}
                  placeholder="Cliente (opcional)"
                  icon="ti-user"
                  size="sm"
                />
                <Input
                  T={T} dark={dark}
                  type="time"
                  value={p.horario_previsto || ''}
                  onChange={(v) => alterarParada(idx, { horario_previsto: v })}
                  icon="ti-clock"
                  size="sm"
                />
              </div>

              {/* Endereço + botão de endereços salvos do cliente */}
              <div style={{ position: 'relative' }}>
                <AddressInput
                  T={T} dark={dark}
                  value={p.endereco || ''}
                  onChange={({ endereco, lat, lng }) => alterarParada(idx, { endereco, lat, lng })}
                  label={null}
                  placeholder="Endereço da parada"
                />
                {p.os_id && (
                  <button
                    type="button"
                    onClick={() => verEnderecos(p.id, p.os_id)}
                    disabled={carregandoEnd === p.id}
                    style={{
                      marginTop: 3,
                      background: 'transparent', border: 'none', padding: '1px 0',
                      color: azul, fontSize: 11.5, fontWeight: 500,
                      cursor: carregandoEnd === p.id ? 'wait' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontFamily: 'inherit',
                    }}>
                    <i className={`ti ${carregandoEnd === p.id ? 'ti-loader-2' : 'ti-address-book'}`}
                       style={{ fontSize: 12 }} aria-hidden="true" />
                    {carregandoEnd === p.id ? 'Carregando…' : 'Endereços do cliente'}
                  </button>
                )}
                {dropdownEnd === p.id && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 29 }}
                      onClick={() => setDropdownEnd(null)}
                    />
                    <div style={{
                      position: 'absolute', left: 0, top: '100%', zIndex: 30,
                      background: T?.card,
                      border: `1px solid ${T?.border}`,
                      borderRadius: 8,
                      boxShadow: '0 4px 16px rgba(9,30,66,0.18)',
                      marginTop: 2,
                      minWidth: 260, maxWidth: '100%',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '6px 12px',
                        borderBottom: `1px solid ${T?.border}`,
                        fontSize: 11, fontWeight: 700, color: T?.textMuted,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>Endereços do cliente</div>
                      {(enderecosMap[p.id] || []).length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: 12.5, color: T?.textMuted }}>
                          Nenhum endereço salvo neste cliente
                        </div>
                      ) : (
                        (enderecosMap[p.id] || []).map((end, i) => {
                          const ativo = p.endereco === end
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => escolherEndereco(idx, p.id, end)}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                width: '100%', padding: '9px 12px',
                                background: ativo ? (dark ? 'rgba(91,155,213,0.12)' : '#EBF3FB') : 'transparent',
                                border: 'none',
                                borderTop: i === 0 ? 'none' : `1px solid ${T?.border}`,
                                color: ativo ? azul : T?.textPrimary,
                                fontSize: 12.5, fontWeight: ativo ? 600 : 400,
                                cursor: 'pointer', textAlign: 'left',
                                fontFamily: 'inherit',
                              }}
                              onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7' }}
                              onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = 'transparent' }}>
                              <i className="ti ti-map-pin"
                                 style={{ fontSize: 13, color: azul, flexShrink: 0, marginTop: 1 }}
                                 aria-hidden="true" />
                              {end}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}>
                <Select
                  T={T} dark={dark}
                  value={p.os_id || ''}
                  onChange={(v) => escolherOS(idx, v || null)}
                  options={[
                    { value: '', label: '— Sem OS vinculada —' },
                    ...osOptions,
                  ]}
                  size="sm"
                />
                <Input
                  T={T} dark={dark}
                  value={p.cliente_fone || ''}
                  onChange={(v) => alterarParada(idx, { cliente_fone: v })}
                  placeholder="Telefone (opcional)"
                  icon="ti-phone"
                  size="sm"
                />
              </div>

              {concluida && (
                <div>
                  <Badge variant="azul" dark={dark} sm>
                    <i className="ti ti-check" /> Concluída
                    {p.horario_chegada ? ` · ${p.horario_chegada}` : ''}
                  </Badge>
                </div>
              )}
            </div>

            {/* Coluna 3: ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              {onConcluirParada && !concluida && (
                <Button
                  T={T} dark={dark}
                  variant="secondary" size="sm" iconLeft="ti-check"
                  onClick={() => onConcluirParada(p.id)}
                >Concluir</Button>
              )}
              <Button
                T={T} dark={dark}
                variant="ghost" size="sm" iconLeft="ti-trash"
                onClick={() => removerParada(idx)}
                title="Remover parada"
              >Remover</Button>
            </div>
          </div>
        )
      })}

      <Button
        T={T} dark={dark}
        variant="secondary" iconLeft="ti-plus"
        onClick={adicionarParada}
        fullWidth
      >Adicionar parada</Button>

      {paradas.length > 1 && (
        <div style={{
          fontSize: 11, color: T?.textDim,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12 }} aria-hidden="true" />
          Arraste pelo ícone <i className="ti ti-grip-vertical" /> à esquerda para reordenar.
        </div>
      )}
    </div>
  )
}
