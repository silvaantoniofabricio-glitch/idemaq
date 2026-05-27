import React from 'react';
import { useTheme } from '../../theme';
import { TI, PALETA } from '../_shared/PrimitivasMobile';

const ABAS = [
  { id: 'etapa',     label: 'Etapa',     icon: 'checkup-list' },
  { id: 'relatorio', label: 'Resumo', icon: 'report' },
  { id: 'pagamento', label: 'Pagamento', icon: 'cash-banknote' },
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
  onMore,
  onHistory,
  onAdicionarEquipamento,
  historyCount = 0,
  aba,
  setAba,
}) => {
  const { T, dark } = useTheme();

  const atrasoLabel = formatAtraso(os?.diasAtraso);
  const isLate = !!atrasoLabel;

  const tone = isLate ? 'red' : (BADGE_TONE[os?.etapa] || 'blue');
  const toneStyle = TONE_STYLES[tone];

  const etapaLabel = os?.etapaLabel || os?.etapa || 'Etapa';
  const badgeText = isLate ? `${etapaLabel} · ${atrasoLabel}` : etapaLabel;

  const modelo = os?.equipamento?.modelo;
  const serie  = os?.equipamento?.serie;
  const hasEquipamento = !!(modelo || serie);
  const nome = os?.cliente?.nome || 'Sem cliente';

  return (
    <div style={{
      background: T.card,
      borderBottom: `1px solid ${T.border}`,
    }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 0',
      }}>
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: T.textMuted, padding: 4, lineHeight: 0,
          }}
        >
          <TI name="x" size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onHistory}
            aria-label="Histórico"
            style={{
              position: 'relative',
              background: PALETA.blueBg, color: PALETA.blueStrong,
              border: 'none', borderRadius: 999,
              padding: 6, cursor: 'pointer', display: 'inline-flex',
            }}
          >
            <TI name="history" size={18} />
            {historyCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: PALETA.blue, color: '#fff',
                fontSize: 10, fontWeight: 700,
                borderRadius: 99, padding: '1px 5px',
                minWidth: 18, textAlign: 'center', lineHeight: 1.4,
              }}>{historyCount}</span>
            )}
          </button>
          <button
            onClick={onMore}
            aria-label="Mais opções"
            style={{
              border: 'none', background: 'transparent',
              color: T.textMuted, padding: 4,
              cursor: 'pointer', lineHeight: 0,
            }}
          >
            <TI name="dots-vertical" size={18} />
          </button>
        </div>
      </div>

      {/* Linha 1 · OS # + badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px 4px',
      }}>
        <span style={{
          fontFamily: MONO_STACK,
          fontSize: 11.5, color: T.textMuted, fontWeight: 600,
          letterSpacing: '.04em',
        }}>
          OS #{os?.numero}
        </span>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
          padding: '4px 10px', borderRadius: 999,
          textTransform: 'uppercase', whiteSpace: 'nowrap',
          background: toneStyle.bg, color: toneStyle.fg,
        }}>
          {badgeText}
        </span>
      </div>

      {/* Linha 2 · nome do cliente */}
      <div
        title={nome}
        style={{
          padding: '0 14px 2px',
          fontSize: 22, fontWeight: 700,
          color: T.textPrimary, letterSpacing: '-.02em',
          lineHeight: 1.15,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        {nome}
      </div>

      {/* Linha 3 · equipamento ou ação de adicionar */}
      {hasEquipamento ? (
        <div style={{
          padding: '0 14px 14px',
          fontSize: 13.5, color: T.textMuted, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
          lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <TI name="device-laptop" size={14} color={T.textMuted} />
          {modelo && <span>{modelo}</span>}
          {modelo && serie && <span style={{ color: '#D1D5DB' }}>·</span>}
          {serie && (
            <span style={{ fontFamily: MONO_STACK, fontSize: 12 }}>{serie}</span>
          )}
        </div>
      ) : (
        <button
          onClick={onAdicionarEquipamento}
          style={{
            padding: '0 14px 14px',
            border: 'none', background: 'transparent',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13.5, color: PALETA.blueStrong, fontWeight: 600,
            cursor: 'pointer', lineHeight: 1.3, textAlign: 'left',
          }}
        >
          <TI name="plus" size={14} color={PALETA.blueStrong} />
          adicionar equipamento
        </button>
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
                style={{
                  flex: 1, minHeight: 48, padding: '0 8px',
                  border: 'none', background: ativo
                    ? (dark ? 'rgba(91,155,213,0.08)' : 'rgba(91,155,213,0.06)')
                    : 'transparent',
                  borderBottom: `2px solid ${ativo ? PALETA.blueStrong : 'transparent'}`,
                  color: ativo ? PALETA.blueStrong : T.textMuted,
                  fontSize: 13, fontWeight: ativo ? 700 : 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all .12s',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <TI name={a.icon} size={15} />
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HeaderMobile;
