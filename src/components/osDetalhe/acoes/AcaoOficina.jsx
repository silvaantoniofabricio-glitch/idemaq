import React from 'react';
import { useTheme } from '../../../theme';
import {
  TI, NowCard, BtnMobile, MOBILE, PALETA, Pill,
} from '../../_shared/PrimitivasMobile';

const ETAPAS_SEQ = [
  { id: 'recebido',    label: 'Pré-diagnóstico' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'orcamento',   label: 'Orçamento' },
  { id: 'oficina',     label: 'Em oficina' },
];

const StepTrail = ({ os, onAbrirAba }) => {
  const { T } = useTheme();

  const statusOf = (etapaId) => {
    if (etapaId === 'oficina') return 'now-blocked';
    if (etapaId === 'orcamento' && !os?.orcamento?.itens?.length) return 'miss';
    return 'done';
  };

  const metaOf = (etapaId) => {
    if (etapaId === 'recebido') {
      const n = Object.keys(os?.preDiagnostico || {}).length;
      return n ? `${n} testes registrados` : 'feito';
    }
    if (etapaId === 'diagnostico') {
      const n = (os?.diagnostico?.componentesMarcados || []).length;
      return n ? `${n} componentes marcados` : 'feito';
    }
    if (etapaId === 'orcamento') {
      const itens = os?.orcamento?.itens || [];
      return itens.length
        ? `${itens.length} itens cadastrados`
        : 'Pendente · sem itens cadastrados';
    }
    if (etapaId === 'oficina') {
      return 'vai liberar quando o orçamento for fechado';
    }
    return null;
  };

  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radiusCard, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: T.textMuted, fontWeight: 700,
        letterSpacing: '.08em', textTransform: 'uppercase',
      }}>
        <TI name="alert-triangle" size={14} color={PALETA.yellowStrong} />
        ETAPA ANTERIOR PENDENTE
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ETAPAS_SEQ.map((step, idx) => {
          const status = statusOf(step.id);
          const meta   = metaOf(step.id);
          const isLast = idx === ETAPAS_SEQ.length - 1;

          const palette = {
            done: { bg: PALETA.greenBg,   fg: PALETA.greenStrong, bd: '#7DC09F' },
            miss: { bg: PALETA.yellow,    fg: PALETA.yellowStrong, bd: '#E5BD3E' },
            'now-blocked': { bg: '#F1F3F6', fg: T.textMuted, bd: '#D1D5DB' },
          }[status];

          const connColor = (status === 'done') ? PALETA.greenStrong
                          : (status === 'miss')   ? PALETA.yellow
                          : T.border;

          return (
            <div key={step.id} style={{
              display: 'flex', gap: 12, padding: '8px 0',
              position: 'relative',
            }}>
              {!isLast && (
                <span style={{
                  position: 'absolute', left: 13, top: 32, bottom: -8,
                  width: 2, background: connColor, zIndex: 1,
                }}/>
              )}
              <span style={{
                width: 28, height: 28, borderRadius: 99,
                background: palette.bg, color: palette.fg,
                border: `2px ${status === 'now-blocked' ? 'dashed' : 'solid'} ${palette.bd}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0, zIndex: 2,
                fontFamily: 'ui-monospace,monospace',
              }}>
                {status === 'done' ? <TI name="check" size={14} /> : (idx + 1)}
              </span>
              <div style={{ flex: 1, paddingTop: 2 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: status === 'now-blocked' ? T.textMuted : T.textPrimary,
                }}>
                  {step.label}
                  {step.id === 'oficina' && ' · você está aqui'}
                </div>
                {meta && (
                  <div style={{
                    fontSize: 11.5, marginTop: 2,
                    color: status === 'miss' ? PALETA.yellowStrong : T.textMuted,
                    fontWeight: status === 'miss' ? 600 : 500,
                  }}>
                    {status === 'miss' && <b style={{ fontWeight: 700 }}>Pendente</b>}
                    {status === 'miss' && meta.replace(/^Pendente · /, ' · ')}
                    {status !== 'miss' && meta}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BtnMobile
        variant="yellow"
        icon="arrow-back-up"
        onClick={() => onAbrirAba?.('pagamento')}
      >
        Voltar pro Orçamento
      </BtnMobile>
    </div>
  );
};

const ResumoDiagnostico = ({ os }) => {
  const { T } = useTheme();
  const causa = os?.diagnostico?.causa;
  const itensMarcados = os?.diagnostico?.componentesMarcados || [];
  if (!causa && !itensMarcados.length) return null;

  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, color: T.textMuted, fontWeight: 700,
        letterSpacing: '.06em', textTransform: 'uppercase',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <TI name="stethoscope" size={13} color={PALETA.blueStrong} />
          RESUMO DO DIAGNÓSTICO
        </span>
      </div>
      {causa && (
        <div style={{
          fontSize: 13, color: T.textPrimary,
          borderLeft: `3px solid ${PALETA.yellow}`,
          paddingLeft: 10, lineHeight: 1.4,
        }}>{causa}</div>
      )}
      {itensMarcados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {itensMarcados.map((c, i) => (
            <Pill key={i} tone="neutral" icon="package" style={{
              background: '#F1ECF8', color: '#5A3FA0', borderColor: '#E0D4F0',
              fontSize: 11.5,
            }}>{c.label || c}</Pill>
          ))}
        </div>
      )}
    </div>
  );
};

const AcaoOficina = ({ os, onUpdateOS, onAbrirAba }) => {
  const { T } = useTheme();
  const orcamentoVazio = !os?.orcamento?.itens?.length;

  if (orcamentoVazio) {
    return (
      <div style={{
        padding: 12, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <NowCard
          icon="tool"
          titulo="em oficina"
          descricao="Antes de executar, você precisa fechar o orçamento."
        />
        <StepTrail os={os} onAbrirAba={onAbrirAba} />
        <ResumoDiagnostico os={os} />
      </div>
    );
  }

  return (
    <div style={{
      padding: 12, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <NowCard
        icon="tool"
        titulo="em oficina"
        descricao="Desmontagem e montagem são compartilhadas — marcar num lado marca no outro."
      />
      <div className="idemaq-card" style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: MOBILE.radiusCard, padding: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontWeight: 600, color: T.textPrimary }}>
          Checklist da oficina
        </div>
        <div style={{ fontSize: 12.5, color: T.textMuted }}>
          Plug do checklist de desmontagem/montagem aqui.
        </div>
      </div>
    </div>
  );
};

export default AcaoOficina;
