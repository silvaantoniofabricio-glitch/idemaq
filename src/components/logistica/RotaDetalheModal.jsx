// idemaq-src/components/logistica/RotaDetalheModal.jsx
// Modal de EDIÇÃO/VISUALIZAÇÃO de uma rota existente. Reusa o ParadasEditor,
// e expõe três ações ligadas ao hook:
//   - reordenar/editar paradas + campos da rota → useRotas.atualizar
//   - concluir parada individual                → useRotas.concluirParada
//   - soft-delete da rota                       → useRotas.excluir
//
// Comportamento: o modal mantém um draft local (state) de todos os campos.
// "Salvar alterações" persiste tudo via atualizar(). "Concluir parada"
// dispara a mutação direto no hook (já é optimistic). Excluir pede confirmação.

import React, { useMemo, useState } from 'react'
import {
  Modal, ModalHeader,
  Input, Select, Textarea, Button, Badge, useToast,
} from '../ui'
import { corEtapa } from '../../utils/colors'
import ParadasEditor from './ParadasEditor'
import { useOS } from '../../hooks/useOS'

const STATUS_ROTA = [
  { value: 'planejada',     label: 'Planejada' },
  { value: 'em_andamento',  label: 'Em andamento' },
  { value: 'concluida',     label: 'Concluída' },
  { value: 'cancelada',     label: 'Cancelada' },
]

function statusBadge(status, dark) {
  if (status === 'concluida')    return <Badge variant="azul"     dark={dark} sm><i className="ti ti-check" /> Concluída</Badge>
  if (status === 'em_andamento') return <Badge variant="amarelo"  dark={dark} sm><i className="ti ti-player-play" /> Em andamento</Badge>
  if (status === 'cancelada')    return <Badge variant="vermelho" dark={dark} sm><i className="ti ti-x" /> Cancelada</Badge>
  return <Badge variant="neutro" dark={dark} sm><i className="ti ti-clock" /> Planejada</Badge>
}

export default function RotaDetalheModal({
  T, dark, mobile = false,
  rota,
  onClose,
  onAtualizar,            // (id, patch) => Promise<{ error }>
  onExcluir,              // (id) => Promise<{ error }>
  onConcluirParada,       // (rotaId, paradaId) => Promise
}) {
  const notify = useToast()
  const vermelho = corEtapa('red', dark)

  const { osList } = useOS(false)

  const [data, setData] = useState(rota?.data || '')
  const [status, setStatus] = useState(rota?.status || 'planejada')
  const [observacoes, setObservacoes] = useState(rota?.observacoes || '')
  const [paradas, setParadas] = useState(Array.isArray(rota?.paradas) ? rota.paradas : [])
  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [erroValidacao, setErroValidacao] = useState(null)

  const osOptions = useMemo(() => {
    return (osList || [])
      .slice(0, 200)
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
    if (valids.length === 0) return 'A rota precisa de ao menos uma parada com endereço.'
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

    const paradasFinais = paradas
      .filter(p => (p.endereco || '').trim().length > 0)
      .map((p, i) => ({ ...p, ordem: i + 1 }))

    const patch = {
      data,
      paradas: paradasFinais,
      status,
      observacoes: observacoes.trim() || null,
    }

    try {
      const { error } = await (onAtualizar?.(rota.id, patch) ?? Promise.resolve({ error: new Error('onAtualizar não passado') }))
      if (error) {
        notify('erro', error.message || 'Falha ao salvar')
        setSalvando(false)
        return
      }
      notify('ok', 'Rota atualizada')
      onClose?.()
    } catch (e) {
      notify('erro', e?.message || 'Erro inesperado ao salvar')
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true)
      return
    }
    setSalvando(true)
    try {
      const { error } = await (onExcluir?.(rota.id) ?? Promise.resolve({ error: new Error('onExcluir não passado') }))
      if (error) {
        notify('erro', error.message || 'Falha ao excluir')
        setSalvando(false)
        return
      }
      notify('ok', 'Rota excluída')
      onClose?.()
    } catch (e) {
      notify('erro', e?.message || 'Erro inesperado ao excluir')
      setSalvando(false)
    }
  }

  function concluirParadaLocal(paradaId) {
    // 1) feedback visual imediato no draft local
    setParadas(prev => prev.map(p =>
      p.id === paradaId
        ? { ...p, status: 'concluida', horario_chegada: new Date().toTimeString().slice(0, 5) }
        : p
    ))
    // 2) chama o hook (já é optimistic + rollback no hook)
    onConcluirParada?.(rota.id, paradaId)
    notify('ok', 'Parada concluída')
  }

  if (!rota) return null

  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={860} closeOnOverlay={false}>
      <ModalHeader
        T={T}
        icon="ti-route"
        title={`Rota ${rota.nome || ''} · ${new Date(rota.data + 'T00:00:00').toLocaleDateString('pt-BR')}`}
        subtitle={`${(rota.paradas || []).length} ${(rota.paradas || []).length === 1 ? 'parada' : 'paradas'}`}
        onClose={onClose}
        right={statusBadge(rota.status, dark)}
      />

      <div style={{
        padding: '16px 18px',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 14,
        flex: 1, minHeight: 0,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(150px, 200px) minmax(150px, 200px)',
          gap: 10,
        }}>
          <Input
            T={T} dark={dark}
            type="date"
            label="Data"
            value={data}
            onChange={setData}
            required
            icon="ti-calendar-event"
          />
          <Select
            T={T} dark={dark}
            label="Status"
            value={status}
            onChange={setStatus}
            options={STATUS_ROTA}
          />
        </div>

        <Textarea
          T={T} dark={dark}
          label="Observações"
          rows={2}
          value={observacoes}
          onChange={setObservacoes}
          placeholder="Ex.: ordem definida pelo Alessandro, levar revestimento extra…"
        />

        <ParadasEditor
          T={T} dark={dark}
          paradas={paradas}
          onChange={setParadas}
          osOptions={osOptions}
          onConcluirParada={concluirParadaLocal}
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, flexShrink: 0,
      }}>
        <Button
          T={T} dark={dark}
          variant="danger" iconLeft="ti-trash"
          onClick={excluir}
          disabled={salvando}
        >
          {confirmandoExclusao ? 'Confirmar exclusão?' : 'Excluir rota'}
        </Button>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button T={T} dark={dark} variant="ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            T={T} dark={dark}
            variant="primary" iconLeft="ti-check"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
