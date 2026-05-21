// src/pages/MeuRelatorio.jsx
// Relatório pessoal do funcionário (Alessandro/Guilherme).
//
// Diferente do /relatorios (admin-only) que mostra dados gerais da empresa,
// aqui o funcionário vê APENAS o que se aplica a ele:
//   - Espelho de ponto do mês (horas + faltas + saldo banco horas)
//   - OS que ele atuou (count + tempo médio)
//   - ZERO dado financeiro (faturamento, ticket médio, lucro — do dono)
//
// Status: 🔴 placeholder visual. Conteúdo real depende de ponto_registro
// começar a ser povoado (Alessandro/Guilherme batendo ponto).
//
// Mobile-first: a página inteira foi pensada pra celular, mas funciona OK
// no desktop também.

import React from 'react'
import { useTheme } from '../theme'
import { isAdmin, getRole } from '../utils/osHelpers'
import { Card } from '../components/ui'
import { corEtapa, corHero } from '../utils/colors'

export default function MeuRelatorio({ user }) {
  const { T, dark } = useTheme()
  const role = getRole(user)
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)

  // Nome amigável
  const nome = role === 'func1' ? 'Alessandro'
             : role === 'func2' ? 'Guilherme'
             : isAdmin(user) ? 'Dono' : 'Você'

  return (
    <div style={{
      padding: '16px 14px 80px',
      flex: 1, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header pessoal */}
      <div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: corHero(dark),
          letterSpacing: '-0.02em',
        }}>
          Meu relatório
        </div>
        <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 4 }}>
          {nome} · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Placeholder — KPIs vazios com explicação */}
      <Card T={T} dark={dark}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          <KPI T={T} dark={dark} label="Horas trabalhadas" valor="—" cor={azul} icon="ti-clock" />
          <KPI T={T} dark={dark} label="Faltas no mês" valor="—" cor={amarelo} icon="ti-x" />
          <KPI T={T} dark={dark} label="OS concluídas" valor="—" cor={verde} icon="ti-check" />
          <KPI T={T} dark={dark} label="Saldo banco horas" valor="—" cor={azul} icon="ti-wallet" />
        </div>
      </Card>

      {/* Aviso de "em construção" */}
      <Card T={T} dark={dark} accent={amarelo}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <i className="ti ti-tools" style={{ fontSize: 22, color: amarelo, marginTop: 2 }} aria-hidden="true" />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>
              Relatório em construção
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, lineHeight: 1.5 }}>
              Quando você começar a bater ponto pelo app, esta tela vai mostrar:
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                <li>Horas trabalhadas no mês</li>
                <li>Faltas e atrasos</li>
                <li>Saldo do banco de horas</li>
                <li>OS que você atuou no período</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Texto secundário */}
      <div style={{ fontSize: 11, color: T.textDim, textAlign: 'center', marginTop: 8 }}>
        Os dados são pessoais e só você vê.<br />
        O dono tem acesso a um relatório consolidado da equipe.
      </div>
    </div>
  )
}

function KPI({ T, dark, label, valor, cor, icon }) {
  return (
    <div style={{
      background: T.cardAlt,
      borderRadius: 10,
      border: `1px solid ${T.border}`,
      padding: '12px 14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.3px',
        marginBottom: 6,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13, color: cor }} aria-hidden="true" />
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em',
      }}>
        {valor}
      </div>
    </div>
  )
}
