// idemaq-src/pages/Configuracoes.jsx
// Módulo 09 — Configurações da empresa (admin-only).
// MVP: edição da meta mensal e da jornada padrão. Cada chave vive na tabela
// `configuracoes` (sql/10) como chave/valor JSONB. Hook: useConfiguracoes.

import React, { useState, useEffect } from 'react'
import { fmtBRL } from '../utils/fmt'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { useToast } from '../components/ui/Toast'

import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import SectionHeader from '../components/ui/SectionHeader'

export default function Configuracoes({ T, dark }) {
  const { configs, loading, tabelaAusente, get, set } = useConfiguracoes()
  const notify = useToast()

  // Estados locais: começam vazios e hidratam quando o hook resolve.
  // Permite edição livre sem perder digitação durante refetch.
  const [meta, setMeta]       = useState('')
  const [jornada, setJornada] = useState('')
  const [salvandoMeta, setSalvandoMeta] = useState(false)
  const [salvandoJornada, setSalvandoJornada] = useState(false)

  useEffect(() => {
    if (!loading) {
      setMeta(String(get('meta_mensal', 20000)))
      setJornada(String(get('jornada_padrao_horas', 8)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, configs])

  async function salvarMeta() {
    const v = Number(meta)
    if (!Number.isFinite(v) || v <= 0) {
      notify('erro', 'Meta inválida — informe um valor maior que zero.')
      return
    }
    setSalvandoMeta(true)
    const { error } = await set('meta_mensal', v)
    setSalvandoMeta(false)
    if (error) {
      if (error.code === 'OFFLINE') {
        notify('info', 'Modo demo: rode sql/10-configuracoes.sql pra persistir.')
      } else {
        notify('erro', `Falha ao salvar meta: ${error.message || 'erro'}`)
      }
      return
    }
    notify('ok', `Meta mensal atualizada pra ${fmtBRL(v)}.`)
  }

  async function salvarJornada() {
    const v = Number(jornada)
    if (!Number.isFinite(v) || v <= 0 || v > 24) {
      notify('erro', 'Jornada inválida — informe um número entre 1 e 24.')
      return
    }
    setSalvandoJornada(true)
    const { error } = await set('jornada_padrao_horas', v)
    setSalvandoJornada(false)
    if (error) {
      if (error.code === 'OFFLINE') {
        notify('info', 'Modo demo: rode sql/10-configuracoes.sql pra persistir.')
      } else {
        notify('erro', `Falha ao salvar jornada: ${error.message || 'erro'}`)
      }
      return
    }
    notify('ok', `Jornada padrão atualizada pra ${v} h/dia.`)
  }

  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
      fontSize: 14,
    }}>
      <PageHeader
        T={T} dark={dark}
        title="Configurações"
        subtitle="Parâmetros da empresa usados pelos painéis e relatórios."
      />

      {tabelaAusente && (
        <Card T={T} dark={dark} padding="10px 14px" style={{ borderLeft: `3px solid ${T.warning || '#FFD966'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 18, color: T.textSecondary }} aria-hidden="true" />
            <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.4 }}>
              <strong>Modo demo:</strong> rode <code>sql/10-configuracoes.sql</code> no Supabase pra
              persistir as alterações. Por enquanto, as mudanças ficam só nesta sessão.
            </div>
          </div>
        </Card>
      )}

      {/* Meta mensal */}
      <Card T={T} dark={dark} padding="16px 20px">
        <SectionHeader T={T} dark={dark} icon="ti-target" sm>Meta mensal de faturamento</SectionHeader>
        <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
          Valor em reais que o Painel usa pra calcular o progresso do mês e a meta diária restante.
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 200 }}>
            <Input
              T={T} dark={dark}
              label="Meta (R$)"
              type="number"
              value={meta}
              onChange={setMeta}
              icon="ti-currency-real"
              min={0}
              step={100}
            />
          </div>
          <Button
            T={T} dark={dark}
            variant="primary"
            iconLeft={salvandoMeta ? 'ti-loader-2' : 'ti-device-floppy'}
            onClick={salvarMeta}
            disabled={salvandoMeta || loading}
          >
            {salvandoMeta ? 'Salvando…' : 'Salvar'}
          </Button>
          <div style={{ fontSize: 11.5, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
            Atual: <strong style={{ color: T.textSecondary }}>{fmtBRL(Number(get('meta_mensal', 20000)) || 0)}</strong>
          </div>
        </div>
      </Card>

      {/* Jornada padrão */}
      <Card T={T} dark={dark} padding="16px 20px">
        <SectionHeader T={T} dark={dark} icon="ti-clock" sm>Jornada padrão</SectionHeader>
        <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
          Horas trabalhadas por dia padrão. Será a base do módulo de Ponto (horas extras / banco de horas).
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 160 }}>
            <Input
              T={T} dark={dark}
              label="Horas / dia"
              type="number"
              value={jornada}
              onChange={setJornada}
              icon="ti-hourglass"
              min={1}
              max={24}
              step={0.5}
            />
          </div>
          <Button
            T={T} dark={dark}
            variant="primary"
            iconLeft={salvandoJornada ? 'ti-loader-2' : 'ti-device-floppy'}
            onClick={salvarJornada}
            disabled={salvandoJornada || loading}
          >
            {salvandoJornada ? 'Salvando…' : 'Salvar'}
          </Button>
          <div style={{ fontSize: 11.5, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
            Atual: <strong style={{ color: T.textSecondary }}>{Number(get('jornada_padrao_horas', 8)) || 8} h/dia</strong>
          </div>
        </div>
      </Card>
    </div>
  )
}
