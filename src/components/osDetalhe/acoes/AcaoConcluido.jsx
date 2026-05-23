import React, { useMemo } from 'react';
import { useTheme } from '../../../theme';
import { TI, MOBILE, PALETA } from '../../_shared/PrimitivasMobile';

const fmtBRL = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const METODOS_LABEL = {
  pix:      { label: 'PIX',      icon: 'brand-pix' },
  dinheiro: { label: 'Dinheiro', icon: 'cash' },
  cartao:   { label: 'Cartão',   icon: 'credit-card' },
  boleto:   { label: 'Boleto',   icon: 'file-invoice' },
};

const diasEntre = (iniIso, fimIso) => {
  if (!iniIso || !fimIso) return null;
  const ini = new Date(iniIso);
  const fim = new Date(fimIso);
  return Math.max(1, Math.round((fim - ini) / 86_400_000));
};

const JORNADA_PADRAO = [
  { id: 'aberta',      label: 'OS aberta' },
  { id: 'recebida',    label: 'Máquina recebida' },
  { id: 'preDiag',     label: 'Pré-diagnóstico' },
  { id: 'diag',        label: 'Diagnóstico técnico' },
  { id: 'orcamento',   label: 'Orçamento aprovado' },
  { id: 'oficina',     label: 'Execução em oficina' },
  { id: 'concluida',   label: 'Teste final · entregue' },
];

const AcaoConcluido = ({ os }) => {
  const { T } = useTheme();
  const jornada = os?.jornada?.length ? os.jornada : JORNADA_PADRAO;

  const diasTotal = useMemo(
    () => diasEntre(os?.abertaEm, os?.concluidaEm) || jornada.length,
    [os?.abertaEm, os?.concluidaEm, jornada.length]
  );

  const totais = os?.totais || {};
  const subServ = totais.servicos || 0;
  const subPeca = totais.pecas    || 0;
  const subDesl = totais.deslocamento || 0;
  const desconto = totais.desconto || 0;
  const totalPago = totais.totalPago ?? (subServ + subPeca + subDesl - desconto);

  const pag = os?.pagamento || {};
  const metodoMeta = METODOS_LABEL[pag.metodo] || null;

  return (
    <div style={{
      padding: 12, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div className="idemaq-card" style={{
        background: 'linear-gradient(180deg,' + PALETA.greenBg + ' 0%,#fff 100%)',
        border: `1px solid #7DC09F`,
        borderRadius: MOBILE.radiusCard, padding: 14,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{
          width: 48, height: 48, borderRadius: 14,
          background: PALETA.greenStrong, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}><TI name="trophy" size={24} /></span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: PALETA.greenStrong, letterSpacing: '-.01em',
          }}>
            OS concluída em {diasTotal} {diasTotal === 1 ? 'dia' : 'dias'}
          </div>
          <div style={{
            fontSize: 12.5, color: T.textPrimary, marginTop: 2,
            fontFamily: 'ui-monospace,monospace',
          }}>
            {os?.abertaEmLabel || '—'}
            {os?.concluidaEmLabel && ` → ${os.concluidaEmLabel}`}
            {' '}· {jornada.length} etapas
          </div>
        </div>
      </div>

      <div className="idemaq-card" style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: MOBILE.radiusCard, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {subServ > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 13, color: T.textMuted,
          }}>
            <span>Serviços</span>
            <b style={{ color: T.textPrimary, fontWeight: 600,
                       fontFamily: 'ui-monospace,monospace' }}>
              {fmtBRL(subServ)}
            </b>
          </div>
        )}
        {subPeca > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 13, color: T.textMuted,
          }}>
            <span>Peças</span>
            <b style={{ color: T.textPrimary, fontWeight: 600,
                       fontFamily: 'ui-monospace,monospace' }}>
              {fmtBRL(subPeca)}
            </b>
          </div>
        )}
        {subDesl > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 13, color: T.textMuted,
          }}>
            <span>Deslocamento</span>
            <b style={{ color: T.textPrimary, fontWeight: 600,
                       fontFamily: 'ui-monospace,monospace' }}>
              {fmtBRL(subDesl)}
            </b>
          </div>
        )}
        {desconto > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 13, color: PALETA.redStrong,
          }}>
            <span>Desconto</span>
            <b style={{ fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>
              — {fmtBRL(desconto)}
            </b>
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingTop: 10, borderTop: `1px dashed ${T.border}`,
        }}>
          <span style={{
            fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
            color: T.textMuted, fontWeight: 700,
          }}>Total pago</span>
          <span style={{
            fontSize: 22, fontWeight: 700, color: T.textPrimary,
            fontFamily: 'ui-monospace,monospace', letterSpacing: '-.02em',
          }}>{fmtBRL(totalPago)}</span>
        </div>

        {metodoMeta && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: 10, marginTop: 6,
            background: PALETA.greenBg,
            border: `1px solid #7DC09F`,
            borderRadius: 10, fontSize: 13,
            color: PALETA.greenStrong, fontWeight: 600,
          }}>
            <TI name={metodoMeta.icon} size={16} />
            <span>{metodoMeta.label}{pag.quandoLabel ? ` · ${pag.quandoLabel}` : ''}</span>
            <TI name="check" size={16} style={{ marginLeft: 'auto' }} />
          </div>
        )}
      </div>

      <div className="idemaq-card" style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: MOBILE.radiusCard, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: T.textMuted, fontWeight: 700,
          letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10,
        }}>
          <TI name="route" size={14} color={PALETA.blueStrong} />
          JORNADA DA OS
        </div>

        {jornada.map((step, idx) => {
          const isLast = idx === jornada.length - 1;
          return (
            <div key={step.id || idx} style={{
              display: 'flex', gap: 12, padding: '10px 0',
              position: 'relative',
            }}>
              {!isLast && (
                <span style={{
                  position: 'absolute', left: 13, top: 32, bottom: -10,
                  width: 2, background: PALETA.greenStrong, zIndex: 1,
                }}/>
              )}
              <span style={{
                width: 28, height: 28, borderRadius: 99,
                background: PALETA.greenBg, color: PALETA.greenStrong,
                border: `2px solid #7DC09F`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, zIndex: 2,
              }}>
                <TI name="check" size={14} />
              </span>
              <div style={{ flex: 1, paddingTop: 2, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
                }}>{step.label}</div>
                {step.meta && (
                  <div style={{
                    fontSize: 11.5, color: T.textMuted, marginTop: 2,
                    fontFamily: 'ui-monospace,monospace',
                  }}>{step.meta}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AcaoConcluido;
