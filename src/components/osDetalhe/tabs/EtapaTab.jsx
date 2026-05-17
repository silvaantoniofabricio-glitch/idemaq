// src/components/osDetalhe/tabs/EtapaTab.jsx
// PR1: placeholder — implementação completa vem no PR3.
// Vai conter forms detalhados: pré-diagnóstico, diagnóstico, checklist oficina,
// falhas do teste final, entrega.

import React from 'react'
import { TIPOS_OS } from '../../../utils/osData'
import PlaceholderTab from './_PlaceholderTab'

export default function EtapaTab(props) {
  const cfg = TIPOS_OS[props.os.tipo]
  const etapa = cfg?.etapas?.find(e => e.id === props.os.etapa) || cfg?.lateral
  return (
    <PlaceholderTab
      {...props}
      icon="ti-checkup-list"
      titulo={`Etapa "${etapa?.label || props.os.etapa}" — em construção (PR3)`}
      descricao="Vai conter formulários completos por etapa: pré-diagnóstico (Recebido), diagnóstico técnico (Diagnóstico), checklist limpeza+manutenção (Em oficina), falhas (Teste final), confirmação de entrega (Entrega)."
    />
  )
}
