// src/components/ponto/ConfigJornadaModal.jsx
// Modal de configuração da jornada de um funcionário.
// Edita horários padrão, tolerância, banco de horas, raio de batida.

import React, { useState } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { Modal, ModalHeader, Button, Input, useToast } from '../ui'
import { JORNADA_MOCK } from './_mocks'

export default function ConfigJornadaModal({ T, dark, funcionario, onClose, onSalvar }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  const jornadaAtual = JORNADA_MOCK[funcionario.id] || {}
  const [form, setForm] = useState({
    entrada_padrao:        jornadaAtual.entrada_padrao        || '07:30',
    saida_padrao:          jornadaAtual.saida_padrao          || '17:30',
    almoco_inicio_padrao:  jornadaAtual.almoco_inicio_padrao  || '12:00',
    almoco_fim_padrao:     jornadaAtual.almoco_fim_padrao     || '13:30',
    carga_diaria_horas:    jornadaAtual.carga_diaria_horas    || 8.0,
    tolerancia_min:        jornadaAtual.tolerancia_min        || 10,
    raio_batida_km:        jornadaAtual.raio_batida_km        || 50,
    banco_horas_ativo:     jornadaAtual.banco_horas_ativo ?? true,
    banco_horas_saldo:     jornadaAtual.banco_horas_saldo     || 0,
  })

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function salvar() {
    // MVP: só toasta. Futuro: onSalvar(funcionario.id, form)
    notify('ok', `Jornada de ${funcionario.nome} salva`)
    onSalvar?.(funcionario.id, form)
    onClose?.()
  }

  function zerarBanco() {
    if (!window.confirm(`Zerar banco de horas de ${funcionario.nome}? Ação fica auditada.`)) return
    set('banco_horas_saldo', 0)
    notify('info', 'Banco de horas zerado (lembre de salvar)')
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} maxWidth={520}>
      <ModalHeader T={T} title={`Jornada · ${funcionario.nome}`}
        icon="ti-clock-cog" onClose={onClose} />

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Horários */}
        <Secao titulo="Horários padrão" T={T} dark={dark} icon="ti-clock">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input T={T} dark={dark} label="Entrada" type="time"
              value={form.entrada_padrao} onChange={v => set('entrada_padrao', v)} />
            <Input T={T} dark={dark} label="Saída" type="time"
              value={form.saida_padrao} onChange={v => set('saida_padrao', v)} />
            <Input T={T} dark={dark} label="Início almoço" type="time"
              value={form.almoco_inicio_padrao} onChange={v => set('almoco_inicio_padrao', v)} />
            <Input T={T} dark={dark} label="Fim almoço" type="time"
              value={form.almoco_fim_padrao} onChange={v => set('almoco_fim_padrao', v)} />
          </div>
        </Secao>

        {/* Carga + tolerância */}
        <Secao titulo="Carga e tolerância" T={T} dark={dark} icon="ti-adjustments">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Input T={T} dark={dark} label="Carga diária (h)" type="number" step="0.5"
              value={form.carga_diaria_horas} onChange={v => set('carga_diaria_horas', Number(v) || 8)} />
            <Input T={T} dark={dark} label="Tolerância (min)" type="number"
              value={form.tolerancia_min} onChange={v => set('tolerancia_min', Number(v) || 0)} />
            <Input T={T} dark={dark} label="Raio batida (km)" type="number"
              value={form.raio_batida_km} onChange={v => set('raio_batida_km', Number(v) || 0)} />
          </div>
        </Secao>

        {/* Banco de horas */}
        <Secao titulo="Banco de horas" T={T} dark={dark} icon="ti-arrows-exchange">
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', background: T.cardAlt, borderRadius: 7,
            border: `1px solid ${T.border}`, cursor: 'pointer',
            fontSize: 12, color: T.textPrimary,
          }}>
            <input type="checkbox" checked={form.banco_horas_ativo}
              onChange={e => set('banco_horas_ativo', e.target.checked)}
              style={{ accentColor: azul }} />
            Banco de horas ativo
          </label>

          {form.banco_horas_ativo && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end',
            }}>
              <Input T={T} dark={dark} label="Saldo atual (h)" type="number" step="0.25"
                value={form.banco_horas_saldo} onChange={v => set('banco_horas_saldo', Number(v) || 0)} />
              <Button variant="ghost" T={T} dark={dark} size="sm"
                iconLeft="ti-rotate"
                onClick={zerarBanco}>
                Zerar
              </Button>
            </div>
          )}
        </Secao>
      </div>

      <div style={{
        padding: 14, borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 8, justifyContent: 'flex-end',
      }}>
        <Button variant="secondary" T={T} dark={dark} onClick={onClose}>Cancelar</Button>
        <Button variant="primary" iconLeft="ti-check" onClick={salvar}>Salvar jornada</Button>
      </div>
    </Modal>
  )
}

function Secao({ titulo, icon, T, dark, children }) {
  const azul = corEtapa('blue', dark)
  return (
    <div>
      <div style={{
        fontSize: 11, color: T.textMuted, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.04em',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13, color: azul }} aria-hidden="true" />
        {titulo}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}
