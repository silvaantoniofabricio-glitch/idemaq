// idemaq-src/components/logistica/NovaRotaModal.jsx
// Modal de CRIAÇÃO de rota — usa o ParadasEditor compartilhado para a lista
// com drag-and-drop, e os hooks useUsuarios (motoristas) + useOS (picker
// opcional de OS por parada). Persiste via useRotas.criar (passado pelo pai).
//
// Validação: data obrigatória + pelo menos 1 parada com endereço preenchido.
// Status inicial da rota: 'planejada'.

import React, { useMemo, useState } from 'react'
import {
  Modal, ModalHeader,
  Input, Select, Textarea, Button, useToast,
} from '../ui'
import { corEtapa } from '../../utils/colors'
import ParadasEditor, { paradaVazia } from './ParadasEditor'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useOS } from '../../hooks/useOS'

const HOJE = new Date().toISOString().slice(0, 10)

export default function NovaRotaModal({ T, dark, onClose, onCriar }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const { usuarios } = useUsuarios()
  const { osList } = useOS(false)

  const [data, setData] = useState(HOJE)
  const [motoristaId, setMotoristaId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [paradas, setParadas] = useState([paradaVazia('coleta')])
  const [salvando, setSalvando] = useState(false)
  const [erroValidacao, setErroValidacao] = useState(null)

  // Motoristas elegíveis: papel logistica + dono (Toni pode dirigir também).
  const motoristas = useMemo(() => {
    return usuarios
      .filter(u => u.papel === 'logistica' || u.papel === 'dono')
      .map(u => ({ value: u.id, label: u.apelido }))
  }, [usuarios])

  // OS pickable: lista as ativas (useOS já filtra concluídas > 24h)
  const osOptions = useMemo(() => {
    return (osList || [])
      .filter(o => o.etapa !== 'concluido' && o.etapa !== 'recusado')
      .slice(0, 200) // safety cap
      .map(o => ({
        value: o.id,
        label: `OS #${o.numero} — ${o.cliente || 'Sem cliente'}`,
        numero: o.numero,
        cliente: o.cliente,
        fone: o.fone,
      }))
  }, [osList])

  function validar() {
    if (!data) return 'Selecione a data da rota.'
    const valids = paradas.filter(p => (p.endereco || '').trim().length > 0)
    if (valids.length === 0) return 'Adicione ao menos uma parada com endereço.'
    return null
  }

  async function salvar() {
    const erro = validar()
    if (erro) {
      setErroValidacao(erro)
      notify('erro', erro)
      return
    }
    setErroValidacao(null)
    setSalvando(true)

    // Renumera ordem + descarta paradas em branco
    const paradasFinais = paradas
      .filter(p => (p.endereco || '').trim().length > 0)
      .map((p, i) => ({ ...p, ordem: i + 1 }))

    const payload = {
      data,
      motorista_id: motoristaId || null,
      paradas: paradasFinais,
      status: 'planejada',
      observacoes: observacoes.trim() || null,
    }

    try {
      const { error } = await (onCriar?.(payload) ?? Promise.resolve({ error: new Error('onCriar não passado') }))
      if (error) {
        notify('erro', error.message || 'Falha ao criar rota')
        setSalvando(false)
        return
      }
      notify('ok', 'Rota criada')
      onClose?.()
    } catch (e) {
      notify('erro', e?.message || 'Erro inesperado ao criar rota')
      setSalvando(false)
    }
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} maxWidth={860} closeOnOverlay={false}>
      <ModalHeader
        T={T}
        icon="ti-route"
        title="Nova rota"
        subtitle="Programar coletas, entregas e visitas do dia"
        onClose={onClose}
      />

      <div style={{
        padding: '16px 18px',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 14,
        flex: 1, minHeight: 0,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(150px, 180px) 1fr',
          gap: 10,
        }}>
          <Input
            T={T} dark={dark}
            type="date"
            label="Data da rota"
            value={data}
            onChange={setData}
            required
            icon="ti-calendar-event"
          />
          <Select
            T={T} dark={dark}
            label="Motorista"
            value={motoristaId}
            onChange={setMotoristaId}
            placeholder="— Selecionar —"
            options={motoristas}
          />
        </div>

        <Textarea
          T={T} dark={dark}
          label="Observações (opcional)"
          rows={2}
          value={observacoes}
          onChange={setObservacoes}
          placeholder="Ex.: prioridade na coleta da manhã, levar peça do João…"
        />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 600, color: T?.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginTop: 4,
        }}>
          <i className="ti ti-map-pin-plus" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
          Paradas
          <span style={{
            marginLeft: 'auto',
            fontSize: 11, color: T?.textDim,
            textTransform: 'none', letterSpacing: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {paradas.length} {paradas.length === 1 ? 'parada' : 'paradas'}
          </span>
        </div>

        <ParadasEditor
          T={T} dark={dark}
          paradas={paradas}
          onChange={setParadas}
          osOptions={osOptions}
        />

        {erroValidacao && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 10px', borderRadius: 8,
            background: dark ? '#2a1515' : '#fde8e8',
            color: vermelho, fontSize: 12, fontWeight: 500,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} aria-hidden="true" />
            {erroValidacao}
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 18px',
        borderTop: `1px solid ${T?.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 8, flexShrink: 0,
      }}>
        <Button T={T} dark={dark} variant="ghost" onClick={onClose} disabled={salvando}>
          Cancelar
        </Button>
        <Button
          T={T} dark={dark}
          variant="primary" iconLeft="ti-check"
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? 'Salvando…' : 'Salvar rota'}
        </Button>
      </div>
    </Modal>
  )
}
