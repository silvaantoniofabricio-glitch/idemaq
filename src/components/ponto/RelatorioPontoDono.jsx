// src/components/ponto/RelatorioPontoDono.jsx
// Dashboard completo de ponto — ACESSO SÓ DO DONO.
// 6 abas: Visão geral, Espelhos, Mapa, Ponto×Produtividade, Ajustes, Configurações.

import React, { useState } from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { Card, Button, Badge, Tabs, Select, SectionHeader } from '../ui'
import EspelhoPonto from './EspelhoPonto'
import MapaDeBatidas from './MapaDeBatidas'
import ConfigJornadaModal from './ConfigJornadaModal'
import {
  FUNCIONARIOS_PONTO, BATIDAS_MOCK, JORNADA_MOCK,
  batidasDeHoje, ultimaBatidaHoje, statusFuncionario,
  minutosTrabalhadosHoje, fmtHora, fmtDuracao, fmtBancoHoras,
} from './_mocks'

const ABAS = [
  { id: 'visao',       label: 'Visão geral',     icon: 'ti-layout-dashboard' },
  { id: 'espelhos',    label: 'Espelhos',         icon: 'ti-calendar-stats' },
  { id: 'mapa',        label: 'Mapa',             icon: 'ti-map-pin' },
  { id: 'produtiv',    label: 'Ponto × Produtividade', icon: 'ti-chart-line' },
  { id: 'ajustes',     label: 'Ajustes manuais',  icon: 'ti-edit' },
  { id: 'config',      label: 'Configurações',    icon: 'ti-settings' },
]

export default function RelatorioPontoDono({ T, dark }) {
  const [aba, setAba] = useState('visao')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card T={T} dark={dark}>
        <Tabs T={T} dark={dark}
          options={ABAS} value={aba} onChange={setAba}
          variant="segmented"
        />
      </Card>

      {aba === 'visao'    && <AbaVisao T={T} dark={dark} setAba={setAba} />}
      {aba === 'espelhos' && <AbaEspelhos T={T} dark={dark} />}
      {aba === 'mapa'     && <MapaDeBatidas T={T} dark={dark} />}
      {aba === 'produtiv' && <AbaProdutividade T={T} dark={dark} />}
      {aba === 'ajustes'  && <AbaAjustes T={T} dark={dark} />}
      {aba === 'config'   && <AbaConfig T={T} dark={dark} />}
    </div>
  )
}

// =============================================================================
// ABA: Visão geral
// =============================================================================
function AbaVisao({ T, dark, setAba }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  // Alertas mock (atrasos, faltas)
  const alertas = []
  for (const f of FUNCIONARIOS_PONTO) {
    const ultima = ultimaBatidaHoje(f.id)
    if (ultima && ultima.tipo === 'entrada') {
      const entrada = new Date(ultima.bateu_em)
      const padrao = new Date(entrada)
      padrao.setHours(7, 40, 0, 0)  // 07:30 + 10min tolerância
      if (entrada > padrao) {
        const atrasoMin = Math.round((entrada - padrao) / 60000)
        alertas.push({
          funcionario: f,
          tipo: 'atraso',
          texto: `atrasou ${atrasoMin}min na entrada (chegou ${fmtHora(ultima.bateu_em)})`,
        })
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Equipe agora */}
      <Card T={T} dark={dark} padding={0}>
        <div style={{ padding: '12px 14px 8px' }}>
          <SectionHeader T={T} dark={dark} icon="ti-users" mb={0}>
            Equipe agora
          </SectionHeader>
        </div>
        {FUNCIONARIOS_PONTO.map(f => {
          const status = statusFuncionario(f.id)
          const minTrab = minutosTrabalhadosHoje(f.id)
          const ultima = ultimaBatidaHoje(f.id)
          const corS = status.cor === 'blue' ? azul
                     : status.cor === 'yellow' ? amarelo
                     : T.textMuted
          const iconS = status.codigo === 'trabalhando' ? 'ti-circle-filled'
                      : status.codigo === 'almoco' ? 'ti-coffee'
                      : status.codigo === 'encerrado' ? 'ti-circle-check'
                      : 'ti-circle-dashed'
          return (
            <div key={f.id} style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr auto',
              gap: 12, alignItems: 'center',
              padding: '12px 14px',
              borderTop: `1px solid ${T.border}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: f.cor + '22', border: `1px solid ${f.cor}55`,
                color: f.cor, fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {f.avatar}
              </div>
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: corHero(dark),
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <i className={`ti ${iconS}`} style={{ fontSize: 12, color: corS }} aria-hidden="true" />
                  {f.nome}
                  <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>· {f.papel}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 3 }}>
                  {status.codigo === 'trabalhando' && `Trabalhando há ${fmtDuracao(minTrab)} · Entrada ${fmtHora(batidasDeHoje(f.id)[0]?.bateu_em)}`}
                  {status.codigo === 'almoco' && `Em almoço desde ${fmtHora(ultima?.bateu_em)}`}
                  {status.codigo === 'encerrado' && `Encerrou às ${fmtHora(ultima?.bateu_em)} · ${fmtDuracao(minTrab)} hoje`}
                  {status.codigo === 'ausente' && 'Sem batida hoje'}
                </div>
              </div>
              <Badge variant={status.cor === 'blue' ? 'azul' : status.cor === 'yellow' ? 'amarelo' : 'neutro'} dark={dark}>
                {status.label}
              </Badge>
            </div>
          )
        })}
      </Card>

      {/* Banco de horas + alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card T={T} dark={dark}>
          <SectionHeader T={T} dark={dark} icon="ti-arrows-exchange" mb={12}>
            Banco de horas
          </SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FUNCIONARIOS_PONTO.map(f => {
              const saldo = JORNADA_MOCK[f.id]?.banco_horas_saldo ?? 0
              const positivo = saldo >= 0
              return (
                <div key={f.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', background: T.cardAlt, borderRadius: 7,
                  border: `1px solid ${T.border}`,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: corHero(dark), fontWeight: 600 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: f.cor + '22', color: f.cor,
                      fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{f.avatar}</span>
                    {f.nome}
                  </span>
                  <span style={{
                    fontSize: 15, fontWeight: 700,
                    color: positivo ? azul : vermelho,
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    <i className={`ti ${positivo ? 'ti-trending-up' : 'ti-trending-down'}`}
                       style={{ fontSize: 14 }} aria-hidden="true" />
                    {fmtBancoHoras(saldo)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card T={T} dark={dark}>
          <SectionHeader T={T} dark={dark} icon="ti-bell" mb={12}>
            Alertas hoje
          </SectionHeader>
          {alertas.length === 0 ? (
            <div style={{
              padding: '14px 10px', textAlign: 'center',
              fontSize: 12, color: T.textMuted, fontStyle: 'italic',
            }}>
              Nenhum alerta — tudo em ordem.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertas.map((a, i) => (
                <div key={i} style={{
                  padding: '8px 10px',
                  background: cor('#2a2000', '#fdf6dc'),
                  border: `1px solid ${amarelo}55`,
                  borderRadius: 7, fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: amarelo, flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ color: T.textPrimary }}>
                    <strong>{a.funcionario.nome}</strong> {a.texto}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// =============================================================================
// ABA: Espelhos
// =============================================================================
function AbaEspelhos({ T, dark }) {
  const [funcId, setFuncId] = useState(FUNCIONARIOS_PONTO[0].id)
  const funcionario = FUNCIONARIOS_PONTO.find(f => f.id === funcId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Funcionário:</span>
          <Tabs T={T} dark={dark}
            options={FUNCIONARIOS_PONTO.map(f => ({ id: f.id, label: f.nome, icon: 'ti-user' }))}
            value={funcId} onChange={setFuncId}
            variant="segmented"
          />
        </div>
      </Card>
      <EspelhoPonto T={T} dark={dark} funcionario={funcionario} />
    </div>
  )
}

// =============================================================================
// ABA: Ponto × Produtividade (placeholder de gráfico cruzado)
// =============================================================================
function AbaProdutividade({ T, dark }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)

  return (
    <Card T={T} dark={dark} accent={azulClaro}
      style={{ background: cor('#0d2035', '#e6f1fb') + '40' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: bgEtapa('blueLight', dark),
          border: `1px solid ${azulClaro}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="ti ti-sparkles" style={{ fontSize: 20, color: azulClaro }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: corHero(dark) }}>
              Análise cruzada Ponto × OS
            </span>
            <Badge variant="neutro" dark={dark} sm>Em breve</Badge>
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
            Quando a integração com Claude API estiver pronta, esta aba vai cruzar
            <strong> horas trabalhadas</strong> com <strong>OS concluídas por etapa</strong> pra
            mostrar produtividade individual, gargalos por funcionário e sugestões de
            redistribuição de tarefas. Alimenta também o Relatório de Funcionários do Módulo 08.
          </div>
        </div>
      </div>
    </Card>
  )
}

// =============================================================================
// ABA: Ajustes manuais
// =============================================================================
function AbaAjustes({ T, dark }) {
  const amarelo = corEtapa('yellow', dark)
  return (
    <Card T={T} dark={dark}>
      <SectionHeader T={T} dark={dark} icon="ti-edit" mb={12}>
        Ajustes manuais de batidas
      </SectionHeader>
      <div style={{
        padding: '18px 14px', background: T.cardAlt,
        border: `1px dashed ${T.border}`, borderRadius: 8,
        textAlign: 'center', fontSize: 12.5, color: T.textMuted, lineHeight: 1.5,
      }}>
        <i className="ti ti-clock-edit" style={{
          fontSize: 28, color: amarelo, display: 'block',
          margin: '0 auto 8px',
        }} aria-hidden="true" />
        <div style={{ fontWeight: 600, color: T.textSecondary, marginBottom: 4 }}>
          Editor de batidas — em construção
        </div>
        Aqui o dono vai poder editar batidas que ficaram fora (saída esquecida,
        atraso justificado, etc.). Toda alteração fica registrada com <code style={{
          background: T.bg, padding: '1px 5px', borderRadius: 4,
        }}>ajuste_manual: true</code> + motivo.
      </div>
    </Card>
  )
}

// =============================================================================
// ABA: Configurações de jornada
// =============================================================================
function AbaConfig({ T, dark }) {
  const azul = corEtapa('blue', dark)
  const [funcEditando, setFuncEditando] = useState(null)

  return (
    <Card T={T} dark={dark} padding={0}>
      <div style={{ padding: '12px 14px 8px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-clock-cog" mb={0}>
          Jornadas dos funcionários
        </SectionHeader>
      </div>
      {FUNCIONARIOS_PONTO.map(f => {
        const j = JORNADA_MOCK[f.id] || {}
        return (
          <div key={f.id} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto',
            gap: 12, alignItems: 'center',
            padding: '12px 14px',
            borderTop: `1px solid ${T.border}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: f.cor + '22', border: `1px solid ${f.cor}55`,
              color: f.cor, fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {f.avatar}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: corHero(dark) }}>
                {f.nome} <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>· {f.papel}</span>
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                {j.entrada_padrao}-{j.almoco_inicio_padrao} · {j.almoco_fim_padrao}-{j.saida_padrao}
                {' '}· {j.carga_diaria_horas}h/dia
                {' '}· tolerância {j.tolerancia_min}min
                {' '}· banco {j.banco_horas_ativo ? fmtBancoHoras(j.banco_horas_saldo) : 'OFF'}
              </div>
            </div>
            <Button variant="secondary" T={T} dark={dark} size="sm"
              iconLeft="ti-edit"
              onClick={() => setFuncEditando(f)}>
              Configurar
            </Button>
          </div>
        )
      })}

      {funcEditando && (
        <ConfigJornadaModal T={T} dark={dark}
          funcionario={funcEditando}
          onClose={() => setFuncEditando(null)}
        />
      )}
    </Card>
  )
}
