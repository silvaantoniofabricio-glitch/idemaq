// src/components/ponto/MapaDeBatidas.jsx
// Placeholder do mapa de batidas — mesma estratégia da Logística.
// MVP: grid background + lista de pontos coloridos por funcionário +
// botão "abrir no Google Maps" com os endereços das batidas do dia.

import React, { useState } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { Card, Button, Tabs, SectionHeader } from '../ui'
import {
  FUNCIONARIOS_PONTO, batidasDeHoje, fmtHora, TIPOS_BATIDA,
} from './_mocks'

export default function MapaDeBatidas({ T, dark }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const [funcFiltro, setFuncFiltro] = useState('todos')

  const opcoesFiltro = [
    { id: 'todos', label: 'Todos', icon: 'ti-users' },
    ...FUNCIONARIOS_PONTO.map(f => ({ id: f.id, label: f.nome, icon: 'ti-user' })),
  ]

  // Junta todas as batidas filtradas
  const batidas = []
  for (const f of FUNCIONARIOS_PONTO) {
    if (funcFiltro !== 'todos' && funcFiltro !== f.id) continue
    for (const b of batidasDeHoje(f.id)) {
      batidas.push({ ...b, funcionario: f })
    }
  }
  batidas.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))

  function abrirRotaMaps() {
    if (batidas.length === 0) return
    const enderecos = batidas
      .filter(b => b.endereco)
      .map(b => encodeURIComponent(b.endereco))
    if (enderecos.length === 0) return
    window.open(`https://www.google.com/maps/dir/${enderecos.join('/')}`,
      '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs T={T} dark={dark}
            options={opcoesFiltro}
            value={funcFiltro}
            onChange={setFuncFiltro}
            variant="segmented"
          />
          <div style={{ flex: 1 }} />
          <Button variant="secondary" T={T} dark={dark}
            iconLeft="ti-external-link"
            onClick={abrirRotaMaps}
            disabled={batidas.length === 0}>
            Abrir rota no Maps
          </Button>
        </div>
      </Card>

      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 1.1fr', gap: 12,
        alignItems: 'start',
      }}>
        {/* Lista de batidas (esquerda) */}
        <Card T={T} dark={dark} padding={0}>
          <div style={{ padding: '12px 14px 8px' }}>
            <SectionHeader T={T} dark={dark} icon="ti-list-details" mb={0}
              action={
                <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {batidas.length} {batidas.length === 1 ? 'batida' : 'batidas'}
                </span>
              }
            >Batidas de hoje</SectionHeader>
          </div>
          {batidas.length === 0 ? (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              fontSize: 12, color: T.textMuted, fontStyle: 'italic',
            }}>
              Sem batidas pra mostrar.
            </div>
          ) : batidas.map(b => {
            const cfg = TIPOS_BATIDA[b.tipo]
            const corT = corEtapa(cfg.cor, dark)
            return (
              <div key={b.id} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                gap: 10, alignItems: 'center',
                padding: '10px 14px',
                borderTop: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: bgEtapa(cfg.cor, dark),
                  border: `1px solid ${corT}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 14, color: corT }} aria-hidden="true" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 600, color: corHero(dark),
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: b.funcionario.cor,
                      padding: '1px 6px', borderRadius: 8,
                      background: b.funcionario.cor + '22',
                      border: `1px solid ${b.funcionario.cor}33`,
                    }}>
                      {b.funcionario.avatar}
                    </span>
                    {b.funcionario.nome} · {cfg.label}
                  </div>
                  <div style={{
                    fontSize: 10.5, color: T.textMuted, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    <i className="ti ti-map-pin" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
                    {b.endereco || `${b.latitude}, ${b.longitude}`}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, color: T.textSecondary, fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtHora(b.data_hora)}
                </span>
              </div>
            )
          })}
        </Card>

        {/* Placeholder do mapa (direita) */}
        <Card T={T} dark={dark} padding={0}>
          <div style={{ padding: '12px 14px 8px' }}>
            <SectionHeader T={T} dark={dark} icon="ti-map" mb={0}
              action={
                <span style={{ fontSize: 11, color: T.textMuted }}>
                  Google Maps · em breve
                </span>
              }
            >Mapa das batidas</SectionHeader>
          </div>
          <div style={{
            position: 'relative', minHeight: 440,
            background: cor('#1a1a1d', '#f7f7f9'),
            backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, padding: 28, textAlign: 'center',
            borderBottomLeftRadius: 11, borderBottomRightRadius: 11,
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: bgEtapa('blue', dark),
              border: `1px solid ${azul}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-map-pin-pin" style={{ fontSize: 28, color: azul }} aria-hidden="true" />
            </div>
            <div style={{ maxWidth: 340 }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: corHero(dark), marginBottom: 4,
              }}>
                Mapa interativo em breve
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.45 }}>
                Quando o Google Maps Places for integrado, os pontos coloridos por
                funcionário (Alessandro amarelo, Guilherme azul claro) vão aparecer aqui.
                Por enquanto, use o botão "Abrir rota no Maps" acima.
              </div>
            </div>

            {/* Legenda */}
            <div style={{
              position: 'absolute', bottom: 14, left: 14,
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: '6px 10px', borderRadius: 8,
              background: T.card, border: `1px solid ${T.border}`,
              fontSize: 10.5,
            }}>
              {FUNCIONARIOS_PONTO.map(f => (
                <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.textMuted }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: f.cor, border: `1px solid ${f.cor}55`,
                  }} />
                  {f.nome}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
