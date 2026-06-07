import React, { useState } from 'react';
import { useTheme } from '../../theme';
import { TI, PALETA } from '../_shared/PrimitivasMobile';
import { ETAPAS_TODOS } from '../../utils/osData';
import FormEquipamentoEdit from './FormEquipamentoEdit';
import { higType, HIG_FONT, HIG_COLOR } from '../../theme-hig';
import { useToast } from '../ui';

// Apple HIG — aplicado em TODAS as etapas (decisao 2026-05-27).

// Resolve label friendly da etapa atual a partir do raw id (ex: 'ag_agendamento'
// → 'Agenda'). Usa o `match` em ETAPAS_TODOS pra encontrar a etapa unificada
// que mapeia pro id real do tipo da OS.
function resolverEtapaLabel(os) {
  if (!os?.etapa) return 'Etapa';
  const uni = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === os.etapa);
  return uni?.curto || uni?.label || os.etapaLabel || os.etapa;
}

const ABAS = [
  { id: 'etapa',     label: 'Etapa',     icon: 'checkup-list' },
  { id: 'relatorio', label: 'Resumo', icon: 'report' },
  { id: 'pagamento', label: 'A receber', icon: 'cash-banknote' },
];

const BADGE_TONE = {
  ag_agenda:   'blue',
  agendado:    'blue',
  recebido:    'blue',
  diagnostico: 'yellow',
  orcamento:   'yellow',
  oficina:     'yellow',
  teste_final: 'blue',
  concluida:   'green',
};

const TONE_STYLES = {
  blue:   { bg: PALETA.blueBg,   fg: PALETA.blueStrong },
  yellow: { bg: PALETA.yellowBg, fg: PALETA.yellowStrong },
  red:    { bg: PALETA.redBg,    fg: PALETA.redStrong },
  green:  { bg: PALETA.greenBg,  fg: PALETA.greenStrong },
};

const formatAtraso = (d) => {
  if (!d || d <= 0) return null;
  if (d > 999) return '999d+';
  return `${d}d`;
};

const MONO_STACK = 'ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo, monospace';

const HeaderMobile = ({
  os,
  onClose,
  onHistory,
  onShowHistorico,
  onAdicionarEquipamento,
  historyCount = 0,
  aba,
  setAba,
  onUpdateOS,
  onExcluir,
  onDuplicar,
  admin = false,
}) => {
  const { T, dark } = useTheme();
  const notify = useToast();
  // Flag `m3` mantida no codigo mas sempre true — HIG aplicado em tudo.
  const m3 = true;
  // Modal de edicao de equipamento — gerenciado aqui dentro porque o
  // OSDetalhe nao passa onAdicionarEquipamento. Mesma logica do Header
  // desktop (que tambem mantem estado proprio).
  const [modalEquipamento, setModalEquipamento] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [foneCopied, setFoneCopied] = useState(false);
  const [endCopied, setEndCopied] = useState(false);
  const historicoHandler = onShowHistorico || onHistory;
  const abrirEquipamento = onAdicionarEquipamento || (() => setModalEquipamento(true));

  function abrirWhatsApp() {
    const digits = (os?.fone || '').replace(/\D/g, '')
    if (!digits) return
    const numero = digits.startsWith('55') ? digits : '55' + digits
    window.location.href = `whatsapp://send?phone=${numero}`
  }

  function abrirMapa() {
    const end = os?.endereco
    if (!end) return
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank', 'noopener,noreferrer')
  }

  function copiarFone() {
    const fone = os?.fone || ''
    if (!fone) return
    navigator.clipboard?.writeText(fone).then(() => {
      setFoneCopied(true)
      setTimeout(() => setFoneCopied(false), 2000)
    })
  }

  function copiarEndereco() {
    const end = os?.endereco || ''
    if (!end) return
    navigator.clipboard?.writeText(end).then(() => {
      setEndCopied(true)
      setTimeout(() => setEndCopied(false), 2000)
    })
  }

  const endResumido = os?.endereco ? os.endereco.split('—')[0].trim() : null

  // ── Funções do menu "Mais ações" (espelham o Header desktop) ────────────
  async function copiarNumeroOS() {
    setMenuAberto(false)
    try {
      await navigator.clipboard.writeText(String(os.numero))
      notify('ok', `OS #${os.numero} copiada`)
    } catch {
      notify('erro', 'Não consegui copiar')
    }
  }

  async function duplicarOSHandler() {
    if (duplicando || !onDuplicar) return
    setMenuAberto(false)
    setDuplicando(true)
    try {
      const res = await onDuplicar(os)
      if (res?.error) throw res.error
      notify('ok', `OS #${res?.numero} criada como duplicata`)
    } catch (e) {
      notify('erro', `Erro ao duplicar: ${e?.message || 'desconhecido'}`)
    } finally {
      setDuplicando(false)
    }
  }

  async function ocultarNoKanban() {
    if (!onUpdateOS) return
    setMenuAberto(false)
    try {
      await onUpdateOS(os.numero, { oculta_no_kanban: !os.oculta_no_kanban })
      notify('ok', os.oculta_no_kanban
        ? `OS #${os.numero} voltou pro Kanban`
        : `OS #${os.numero} retirada do Kanban (continua em Vendas)`)
    } catch (e) {
      notify('erro', `Erro: ${e?.message || 'desconhecido'}`)
    }
  }

  async function excluirOS() {
    if (excluindo) return
    setMenuAberto(false)
    if (!window.confirm(
      `Excluir OS #${os.numero}?\n\n` +
      `Cliente: ${os.cliente || '—'}\n` +
      `A OS some do Kanban mas fica no banco (soft-delete).`
    )) return
    setExcluindo(true)
    try {
      await onExcluir?.(os.numero)
      onClose?.()
    } finally {
      setExcluindo(false)
    }
  }

  const atrasoLabel = formatAtraso(os?.diasAtraso);
  const isLate = !!atrasoLabel;

  const tone = isLate ? 'red' : (BADGE_TONE[os?.etapa] || 'blue');
  const toneStyle = TONE_STYLES[tone];

  // Schema real do useOS: os.cliente eh string (nome direto), os.marca/modelo
  // sao flat. Antes esse componente assumia objetos aninhados (cliente.nome,
  // equipamento.modelo) — por isso vinha "Sem cliente" sempre.
  const etapaLabel = resolverEtapaLabel(os);
  const badgeText = isLate ? `${etapaLabel} · ${atrasoLabel}` : etapaLabel;

  const modelo = os?.modelo || os?.equipamento?.modelo;
  const serie  = os?.serie  || os?.equipamento?.serie;
  const marca  = os?.marca;
  const hasEquipamento = !!(marca || modelo || serie);
  const nome = (typeof os?.cliente === 'string' ? os.cliente : os?.cliente?.nome)
    || (os?.tipo === 'fabricacao' ? 'Fabricação interna' : 'Sem cliente');

  return (
    <div style={{
      background: T.card,
      borderBottom: `1px solid ${T.border}`,
    }}>
      {/* Linha 1 (combinada) · OS# + badge à esquerda · ações à direita.
          Antes eram 2 linhas: topbar (X/histórico/dots) + OS#/badge.
          X removido — modal fecha por swipe/back nativo do mobile. */}
      {/* Linha 1: M3 top app bar (64dp) com icon buttons 40x40 +
          assist chip pro status. V1 mantida mais compacta. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: m3 ? '8px 4px' : '8px 12px 4px', gap: 8,
        minHeight: m3 ? 56 : undefined,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: m3 ? 8 : 7, minWidth: 0, flex: 1 }}>
          {/* X discreto pra fechar */}
          <button
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            style={m3 ? {
              border: 'none', background: 'transparent',
              color: T.textPrimary,
              width: 40, height: 40, borderRadius: 999,
              cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            } : {
              border: 'none', background: 'transparent',
              color: T.textMuted, padding: 4, lineHeight: 0,
              cursor: 'pointer', flexShrink: 0,
              marginLeft: -4,
            }}
          >
            <TI name="x" size={m3 ? 22 : 16} />
          </button>
          <span style={m3 ? {
            fontFamily: MONO_STACK,
            ...higType('labelMedium'),
            color: T.textMuted, flexShrink: 0,
          } : {
            fontFamily: MONO_STACK,
            fontSize: 11, color: T.textMuted, fontWeight: 600,
            letterSpacing: '.04em', flexShrink: 0,
          }}>
            OS #{os?.numero}
          </span>
          {/* Status badge — HIG: capsule pill subtle, no icon */}
          <span style={m3 ? {
            display: 'inline-flex', alignItems: 'center',
            minHeight: 22, padding: '0 10px',
            borderRadius: 999,
            background: toneStyle.bg, color: toneStyle.fg,
            ...higType('caption1'),
            fontWeight: 600, letterSpacing: 0,
            whiteSpace: 'nowrap', flexShrink: 0,
          } : {
            fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
            padding: '3px 8px', borderRadius: 999,
            textTransform: 'uppercase', whiteSpace: 'nowrap',
            background: toneStyle.bg, color: toneStyle.fg,
            flexShrink: 0,
          }}>
            {badgeText}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: m3 ? 0 : 4, flexShrink: 0 }}>
          {/* M3 Icon button 40x40 com fundo tint */}
          <button
            onClick={historicoHandler}
            aria-label="Histórico"
            style={m3 ? {
              position: 'relative',
              background: dark ? 'rgba(91,155,213,0.18)' : '#E3F2FD',
              color: PALETA.blueStrong,
              border: 'none', borderRadius: 999,
              width: 40, height: 40,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            } : {
              position: 'relative',
              background: PALETA.blueBg, color: PALETA.blueStrong,
              border: 'none', borderRadius: 999,
              padding: 5, cursor: 'pointer', display: 'inline-flex',
            }}
          >
            <TI name="history" size={m3 ? 20 : 16} />
            {historyCount > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -3,
                background: PALETA.blue, color: '#fff',
                fontSize: 9, fontWeight: 700,
                borderRadius: 99, padding: '1px 4px',
                minWidth: 15, textAlign: 'center', lineHeight: 1.4,
              }}>{historyCount}</span>
            )}
          </button>
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Mais opções"
            style={m3 ? {
              border: 'none', background: 'transparent',
              color: T.textPrimary,
              width: 40, height: 40, borderRadius: 999,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            } : {
              border: 'none', background: 'transparent',
              color: T.textMuted, padding: 4,
              cursor: 'pointer', lineHeight: 0,
            }}
          >
            <TI name="dots-vertical" size={m3 ? 22 : 16} />
          </button>
        </div>
      </div>

      {/* Linha 2 · nome do cliente + telefone + WhatsApp */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px 0', gap: 8, minWidth: 0 }}>
        <div
          title={nome}
          style={m3 ? {
            flex: 1, minWidth: 0,
            ...higType('titleLarge'),
            color: T.textPrimary,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          } : {
            flex: 1, minWidth: 0,
            fontSize: 17, fontWeight: 700,
            color: T.textPrimary, letterSpacing: '-.01em',
            lineHeight: 1.15,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {nome}
        </div>
        {os?.fone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
              onClick={copiarFone}
              title="Tocar para copiar número"
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                padding: '2px 0', fontFamily: MONO_STACK,
                fontSize: 12, fontWeight: 600,
                color: foneCopied ? (dark ? '#4ade80' : '#16a34a') : T.textMuted,
                WebkitTapHighlightColor: 'transparent',
                transition: 'color .15s',
              }}
            >
              {foneCopied ? 'Copiado!' : os.fone}
            </button>
            <button
              onClick={abrirWhatsApp}
              title="Abrir conversa no WhatsApp"
              aria-label="WhatsApp"
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                padding: 4, lineHeight: 0, display: 'inline-flex',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <TI name="brand-whatsapp" size={20} color="#25D366" />
            </button>
          </div>
        )}
      </div>

      {/* Linha 2b · endereço com copy + ícone Maps */}
      {endResumido && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '3px 16px 0', gap: 6, minWidth: 0 }}>
          <TI name="map-pin" size={14} color={T.textMuted} />
          <button
            onClick={copiarEndereco}
            title="Tocar para copiar endereço"
            style={{
              flex: 1, minWidth: 0,
              border: 'none', background: 'transparent', cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
              ...higType('bodyMedium'),
              color: endCopied ? (dark ? '#4ade80' : '#16a34a') : T.textMuted,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color .15s',
            }}
          >
            {endCopied ? 'Copiado!' : endResumido}
          </button>
          <button
            onClick={abrirMapa}
            title="Abrir no Google Maps"
            aria-label="Abrir no Google Maps"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              padding: 4, lineHeight: 0, display: 'inline-flex', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <TI name="map-2" size={18} color={PALETA.blueStrong} />
          </button>
        </div>
      )}

      {/* Linha 3 · equipamento (M3 text button pill quando vazio) */}
      {hasEquipamento ? (
        <button
          onClick={abrirEquipamento}
          title="Editar equipamento"
          style={m3 ? {
            padding: '4px 16px 12px',
            border: 'none', background: 'transparent',
            ...higType('bodyMedium'),
            color: T.textMuted,
            display: 'flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            width: '100%',
            WebkitTapHighlightColor: 'transparent',
          } : {
            padding: '0 12px 8px',
            border: 'none', background: 'transparent',
            fontSize: 12.5, color: T.textMuted, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
            lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            width: '100%',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <TI name="device-laptop" size={m3 ? 16 : 13} color={T.textMuted} />
          {marca && <span>{marca}</span>}
          {marca && modelo && <span style={{ color: '#D1D5DB' }}>·</span>}
          {modelo && <span>{modelo}</span>}
          {serie && <span style={{ color: '#D1D5DB' }}>·</span>}
          {serie && (
            <span style={{ fontFamily: MONO_STACK, fontSize: m3 ? 13 : 11.5 }}>S/N {serie}</span>
          )}
        </button>
      ) : (
        <div style={{ padding: m3 ? '0 8px 8px' : 0 }}>
          <button
            onClick={abrirEquipamento}
            style={m3 ? {
              // M3 Text button pill 40dp
              minHeight: 40, padding: '0 12px', borderRadius: 999,
              border: 'none', background: 'transparent',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              ...higType('labelLarge'),
              color: PALETA.blueStrong,
              cursor: 'pointer', fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            } : {
              padding: '0 12px 8px',
              border: 'none', background: 'transparent',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12.5, color: PALETA.blueStrong, fontWeight: 600,
              cursor: 'pointer', lineHeight: 1.3, textAlign: 'left',
            }}
          >
            <TI name="plus" size={m3 ? 18 : 13} color={PALETA.blueStrong} />
            adicionar equipamento
          </button>
        </div>
      )}

      {/* Linha 4 · abas (Etapa / Relatório / Pagamento) — restauradas em
          27/05/2026 (commit e6f3864 tinha removido sem querer apesar da
          mensagem dizer "OSDetalhe com 3 abas"). Touch target 48px. */}
      {setAba && (
        <div style={{
          display: 'flex',
          borderTop: `1px solid ${T.border}`,
        }}>
          {ABAS.map(a => {
            const ativo = aba === a.id;
            return (
              <button key={a.id}
                onClick={() => setAba(a.id)}
                style={m3 ? {
                  // HIG iOS-style tab — 44pt altura, indicator 2px, subtle
                  flex: 1, minHeight: 44, padding: '0 12px',
                  border: 'none', background: 'transparent',
                  borderBottom: `2px solid ${ativo ? HIG_COLOR.tintIdemaq : 'transparent'}`,
                  color: ativo ? HIG_COLOR.tintIdemaq : T.textMuted,
                  ...higType('subheadline'),
                  fontWeight: ativo ? 600 : 500,
                  cursor: 'pointer', fontFamily: HIG_FONT,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'border-color .15s, color .15s',
                  WebkitTapHighlightColor: 'transparent',
                } : {
                  flex: 1, minHeight: 42, padding: '0 6px',
                  border: 'none', background: ativo
                    ? (dark ? 'rgba(91,155,213,0.08)' : 'rgba(91,155,213,0.06)')
                    : 'transparent',
                  borderBottom: `2px solid ${ativo ? PALETA.blueStrong : 'transparent'}`,
                  color: ativo ? PALETA.blueStrong : T.textMuted,
                  fontSize: 12.5, fontWeight: ativo ? 700 : 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  transition: 'all .12s',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <TI name={a.icon} size={m3 ? 18 : 14} />
                {a.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de edicao do equipamento da OS */}
      {modalEquipamento && (
        <FormEquipamentoEdit
          T={T} dark={dark} mobile={true}
          os={os}
          onClose={() => setModalEquipamento(false)}
          onUpdateOS={onUpdateOS}
        />
      )}

      {/* ── Action sheet "Mais ações" (bottom sheet iOS-style) ────────────── */}
      {menuAberto && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setMenuAberto(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.45)',
            }}
          />
          {/* Sheet */}
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 301,
            background: T.card,
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
            </div>

            {/* Título */}
            <div style={{
              padding: '4px 20px 10px',
              ...higType('headline'),
              color: T.textPrimary, fontFamily: HIG_FONT,
              borderBottom: `1px solid ${T.border}`,
            }}>
              OS #{os?.numero}
            </div>

            {/* Itens */}
            <div style={{ padding: '6px 0 8px' }}>
              <SheetItem icon="copy" label="Copiar nº da OS" T={T} dark={dark} onClick={copiarNumeroOS} />
              {onDuplicar && (
                <SheetItem
                  icon="copy-plus"
                  label={duplicando ? 'Duplicando…' : 'Duplicar OS'}
                  T={T} dark={dark}
                  onClick={duplicarOSHandler}
                  disabled={duplicando}
                />
              )}
              {onUpdateOS && (
                <SheetItem
                  icon={os?.oculta_no_kanban ? 'eye' : 'eye-off'}
                  label={os?.oculta_no_kanban ? 'Voltar pro Kanban' : 'Retirar do Kanban'}
                  T={T} dark={dark}
                  onClick={ocultarNoKanban}
                />
              )}
              {admin && onExcluir && (
                <>
                  <div style={{ height: 1, background: T.border, margin: '6px 16px' }} />
                  <SheetItem
                    icon="trash"
                    label={excluindo ? 'Excluindo…' : 'Excluir OS'}
                    T={T} dark={dark}
                    onClick={excluirOS}
                    disabled={excluindo}
                    danger
                  />
                </>
              )}
            </div>

            {/* Botão cancelar */}
            <div style={{ padding: '0 16px 20px' }}>
              <button
                onClick={() => setMenuAberto(false)}
                style={{
                  width: '100%', minHeight: 48,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  background: dark ? 'rgba(255,255,255,0.06)' : '#f4f5f7',
                  color: T.textSecondary,
                  ...higType('bodyLarge'),
                  fontFamily: HIG_FONT, fontWeight: 600,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Item de linha dentro do action sheet
function SheetItem({ icon, label, onClick, disabled, danger, T, dark }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', minHeight: 52,
        padding: '0 20px',
        border: 'none', background: 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: 'transparent',
        fontFamily: 'inherit',
      }}
    >
      <i
        className={`ti ti-${icon}`}
        style={{
          fontSize: 20, flexShrink: 0,
          color: danger ? PALETA.redStrong : T.textSecondary,
        }}
        aria-hidden="true"
      />
      <span style={{
        fontSize: 16, fontWeight: 500,
        color: danger ? PALETA.redStrong : T.textPrimary,
        textAlign: 'left',
      }}>
        {label}
      </span>
    </button>
  )
}

export default HeaderMobile;
