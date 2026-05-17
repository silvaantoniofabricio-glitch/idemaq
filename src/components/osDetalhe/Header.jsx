// src/components/osDetalhe/Header.jsx
// Header do OSDetalhe centralizado.
// Linhas:
//  1. badges (tipo + OS# + status) à esquerda · ícones (histórico+badge, fechar) à direita
//  2. nome do cliente em destaque
//  3. marca · modelo · defeito (resumo)
//  4. Timeline compacta
//  5. 3 abas (Resumo · Financeiro · Etapa)

import React, { useState } from 'react'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { corEtapa } from '../../utils/colors'
import {
  estaPagaTotal, estaPagaParcial,
  calcStatusPrazo, diasPrazo,
} from '../../utils/osHelpers'
import { useToast } from '../ui'
import Timeline from './Timeline'

const ABAS = [
  { id: 'etapa',     label: 'Etapa',     icon: 'ti-checkup-list' },
  { id: 'resumo',    label: 'Resumo',    icon: 'ti-info-circle' },
  { id: 'pagamento', label: 'Pagamento', icon: 'ti-cash-banknote' },
]

export default function Header({
  T, dark, os, admin,
  aba, setAba,
  onShowHistorico, onClose,
  mobile = false,
}) {
  const cor = (d, c) => dark ? d : c
  const config = TIPOS_OS[os.tipo]
  const tipoCor = corEtapa(config.cor, dark)
  const notify = useToast()

  function avisoCadastroEmBreve(o) {
    notify('info', `Cadastro de ${o} em breve`)
  }
  function abrirWhatsApp(fone) {
    const digits = (fone || '').replace(/\D/g, '')
    if (!digits) return
    const numero = digits.startsWith('55') ? digits : '55' + digits
    window.open(`https://wa.me/${numero}`, '_blank', 'noopener,noreferrer')
  }
  function abrirMapa(endereco) {
    if (!endereco) return
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const isRecusado = os.etapa === 'recusado'
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)
  const historicoCount = (os.historico || []).length

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: `1px solid ${T.border}`,
      background: tipoCor + '08',
    }}>
      {/* Linha 1 — badges + ícones */}
      <div style={{
        padding: '13px 20px 6px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {/* Tipo */}
          <span style={{
            padding: '3px 9px', borderRadius: 6,
            background: tipoCor + '22', color: tipoCor,
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
            textTransform: 'uppercase', letterSpacing: '.3px',
          }}>
            <i className={`ti ${config.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
            {config.label}
          </span>
          {/* OS # */}
          <span style={{
            fontSize: 15, fontWeight: 700, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}>OS #{os.numero}</span>
          {/* Pills de status */}
          {os.garantia && (
            <Pill cor={cor(P.blue, P.blueDark)} bg={cor('#0d2035', '#e6f1fb')}>
              <i className="ti ti-shield-check" style={{ fontSize: 11 }} aria-hidden="true" /> Garantia
            </Pill>
          )}
          {pagoTotal && (
            <Pill cor={cor(P.green, P.greenDark)} bg={cor('#0f2a15', '#e8f5ec')}>
              <i className="ti ti-check" style={{ fontSize: 11 }} aria-hidden="true" /> Pago
            </Pill>
          )}
          {pagoParcial && (
            <Pill cor={cor(P.yellow, P.yellowDark)} bg={cor('#2a2000', '#fdf6dc')}>Parcial</Pill>
          )}
          {!isRecusado && status === 'vencido' && (
            <Pill cor={cor(P.red, P.redDark)} bg={cor('#2a1515', '#fde8e8')}>
              {Math.abs(dias)}d atraso
            </Pill>
          )}
          {status === 'hoje' && (
            <Pill cor={cor(P.yellow, P.yellowDark)} bg={cor('#2a2000', '#fdf6dc')}>Vence hoje</Pill>
          )}
          {status === 'amanha' && (
            <Pill cor={cor(P.yellow, P.yellowDark)} bg={cor('#2a2000', '#fdf6dc')}>Vence amanhã</Pill>
          )}
          {isRecusado && (
            <Pill cor={cor(P.red, P.redDark)} bg={cor('#2a1515', '#fde8e8')}>Recusada</Pill>
          )}
          {os.aguardando_peca && (
            <Pill cor="#ff9800" bg={cor('#3a2200', '#fff4e0')}>
              <i className="ti ti-package" style={{ fontSize: 11 }} aria-hidden="true" /> Ag. peça
            </Pill>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          {/* Ícone histórico com badge */}
          <button
            onClick={onShowHistorico}
            title={`Histórico (${historicoCount} ${historicoCount === 1 ? 'evento' : 'eventos'})`}
            aria-label="Ver histórico"
            style={{
              position: 'relative',
              background: 'transparent', border: `1px solid ${T.border}`,
              cursor: 'pointer',
              color: T.textSecondary, padding: '6px 8px', borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="ti ti-history" style={{ fontSize: 16 }} aria-hidden="true" />
            {historicoCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 8,
                background: cor(P.blue, P.blueDark), color: '#fff',
                fontSize: 9.5, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, border: `1.5px solid ${T.card}`,
                fontVariantNumeric: 'tabular-nums',
              }}>{historicoCount > 99 ? '99+' : historicoCount}</span>
            )}
          </button>

          {/* Placeholder menu (sem ação) */}
          <button
            title="Mais ações"
            aria-label="Mais ações"
            disabled
            style={{
              background: 'transparent', border: `1px solid ${T.border}`,
              cursor: 'not-allowed', opacity: 0.4,
              color: T.textMuted, padding: '6px 8px', borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="ti ti-dots-vertical" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>

          {/* Fechar */}
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.textMuted, padding: '6px 6px', borderRadius: 6,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Bloco de contexto da OS — hierarquia: cliente (herói) → equip (subtitle) → defeito (callout) */}
      <BlocoContextoOS
        T={T} dark={dark}
        os={os}
        onAbrirCadastroCliente={() => avisoCadastroEmBreve('cliente')}
        onAbrirCadastroEquipamento={() => avisoCadastroEmBreve('equipamento')}
        onAbrirWhatsApp={() => abrirWhatsApp(os.fone)}
        onAbrirMapa={() => abrirMapa(os.endereco)}
      />

      {/* Linha 4 — Timeline (não aparece em recusado) */}
      {!isRecusado && (
        <div style={{ padding: '4px 20px 6px' }}>
          <Timeline T={T} dark={dark} os={os} config={config} admin={admin} mobile={mobile} />
        </div>
      )}

      {/* Linha 5 — Abas */}
      <div style={{ display: 'flex', padding: '0 8px', marginTop: 4 }}>
        {ABAS.map(a => {
          const ativo = aba === a.id
          const azul = cor(P.blue, P.blueDark)
          const azulBg = cor('#0d2035', '#e6f1fb')
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                borderBottom: `2px solid ${ativo ? azul : 'transparent'}`,
                background: ativo ? azulBg : 'transparent',
                color: ativo ? azul : T.textMuted,
                fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background .12s, border-color .12s, color .12s',
                fontFamily: 'inherit',
              }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
              {a.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Pill({ cor, bg, children }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5,
      background: bg, color: cor, border: `1px solid ${cor}33`,
      fontSize: 10.5, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

// Bloco de contexto da OS — design assimétrico com hierarquia clara:
//   1. Nome do cliente (H1, clicável → cadastro)
//   2. Contato (telefone · endereço — texto plano, ações pelos ícones à direita)
//   3. Equipamento (subtitle com ícone)
//   4. Defeito (callout italic com borda lateral amarela — destaca o "porquê" da OS)
//
// Ações: 3 icon-buttons compactos na direita (WhatsApp, Maps, Equip cadastro).
function BlocoContextoOS({
  T, dark, os,
  onAbrirCadastroCliente,
  onAbrirCadastroEquipamento,
  onAbrirWhatsApp,
  onAbrirMapa,
}) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  const amarelo = cor(P.yellow, P.yellowDark)
  const [hoverNome, setHoverNome] = useState(false)
  const [hoverEquip, setHoverEquip] = useState(false)

  const tituloEquip = [os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento

  return (
    <div style={{ padding: '14px 22px 14px' }}>
      {/* Topo: Nome cliente + ações à direita */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 14, marginBottom: 2,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Nome (clicável → cadastro do cliente) */}
          <div
            onClick={onAbrirCadastroCliente}
            onMouseEnter={() => setHoverNome(true)}
            onMouseLeave={() => setHoverNome(false)}
            title="Abrir cadastro do cliente"
            style={{
              fontSize: 17, fontWeight: 700, lineHeight: 1.2,
              color: hoverNome ? azul : T.textPrimary,
              cursor: 'pointer',
              transition: 'color .12s',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginBottom: 3,
            }}
          >{os.cliente || '— sem cliente —'}</div>

          {/* Contato em UMA linha (telefone · endereço) */}
          <div style={{
            fontSize: 11.5, color: T.textMuted, lineHeight: 1.4,
            wordBreak: 'break-word',
          }}>
            {os.fone || '—'}
            {os.endereco && (
              <>
                <span style={{ opacity: 0.45, padding: '0 7px' }}>•</span>
                {os.endereco}
              </>
            )}
          </div>
        </div>

        {/* Ações: 3 icon-buttons compactos */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <IconBtn
            T={T} dark={dark}
            icon="ti-brand-whatsapp"
            title={os.fone ? `WhatsApp ${os.fone}` : 'Sem telefone cadastrado'}
            onClick={onAbrirWhatsApp}
            disabled={!os.fone}
          />
          <IconBtn
            T={T} dark={dark}
            icon="ti-map-pin"
            title={os.endereco ? 'Abrir no Google Maps' : 'Sem endereço cadastrado'}
            onClick={onAbrirMapa}
            disabled={!os.endereco}
          />
          <IconBtn
            T={T} dark={dark}
            icon="ti-tool"
            title="Abrir cadastro do equipamento"
            onClick={onAbrirCadastroEquipamento}
          />
        </div>
      </div>

      {/* Equipamento subtitle (clicável → cadastro) */}
      {tituloEquip && (
        <div
          onClick={onAbrirCadastroEquipamento}
          onMouseEnter={() => setHoverEquip(true)}
          onMouseLeave={() => setHoverEquip(false)}
          title="Abrir cadastro do equipamento"
          style={{
            marginTop: 12,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            fontSize: 12, color: hoverEquip ? azul : T.textSecondary,
            transition: 'color .12s',
          }}
        >
          <i className="ti ti-device-washing-machine"
             style={{ fontSize: 13.5, color: hoverEquip ? azul : T.textMuted, transition: 'color .12s' }}
             aria-hidden="true" />
          <span style={{ fontWeight: 600 }}>{tituloEquip}</span>
          {os.serie && (
            <>
              <span style={{ opacity: 0.45 }}>·</span>
              <span style={{ color: T.textMuted, fontSize: 11.5 }}>Nº {os.serie}</span>
            </>
          )}
        </div>
      )}

      {/* Defeito como callout italic com borda lateral amarela */}
      {os.defeito && (
        <div style={{
          marginTop: 10,
          paddingLeft: 12,
          borderLeft: `3px solid ${amarelo}55`,
          fontSize: 12.5, fontStyle: 'italic',
          color: T.textSecondary, lineHeight: 1.45,
        }}>
          “{os.defeito}”
        </div>
      )}
    </div>
  )
}

// Icon-button compacto pras ações rápidas (WhatsApp, Maps, Equip cadastro).
function IconBtn({ T, dark, icon, title, onClick, disabled }) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  const azulBg = cor('#0d2035', '#e6f1fb')
  const [hover, setHover] = useState(false)
  const active = !disabled && hover
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32, height: 32, borderRadius: 8,
        border: `1px solid ${active ? azul : T.border}`,
        background: active ? azulBg : 'transparent',
        color: disabled ? T.textDim : (active ? azul : T.textSecondary),
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .12s, border-color .12s, color .12s',
        fontFamily: 'inherit',
        flexShrink: 0,
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
    </button>
  )
}
