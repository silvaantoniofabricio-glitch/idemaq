import React, { useMemo } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, NowCard, BtnMobile, MOBILE, PALETA, Pill,
} from '../../_shared/PrimitivasMobile';

const TIPOS = [
  { id: 'servico', label: 'Serviços',     icon: 'tool',    bg: PALETA.blueBg,   fg: PALETA.blueStrong },
  { id: 'peca',    label: 'Peças',        icon: 'package', bg: '#F1ECF8',       fg: '#5A3FA0' },
  { id: 'desloc',  label: 'Deslocamento', icon: 'truck',   bg: PALETA.yellowBg, fg: PALETA.yellowStrong },
];

const fmtBRL = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const fmtBRLShort = (n) => {
  const v = Number(n || 0);
  if (v === 0) return 'R$ 0';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const GrupoBlock = ({ tipo, itens, subtotal, onAdd, onEditItem }) => {
  const { T } = useTheme();
  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radiusCard, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        background: '#F8F9FB', borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: tipo.bg, color: tipo.fg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TI name={tipo.icon} size={14} />
        </span>
        <span style={{
          flex: 1, fontSize: 12, fontWeight: 700,
          color: T.textPrimary, textTransform: 'uppercase',
          letterSpacing: '.04em',
        }}>
          {tipo.label} · {itens.length}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 600, color: T.textPrimary,
          fontFamily: 'ui-monospace,monospace',
        }}>
          {fmtBRLShort(subtotal)}
        </span>
      </div>

      {itens.map((it, idx) => (
        <button
          key={it.id || idx}
          type="button"
          onClick={() => onEditItem?.(idx)}
          style={{
            padding: '9px 14px', border: 'none', background: T.card,
            borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13.5, cursor: 'pointer', textAlign: 'left',
            width: '100%',
          }}
        >
          <span style={{
            flex: 1, color: T.textPrimary, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{it.nome || '(sem nome)'}</span>
          <span style={{
            fontSize: 11.5, color: T.textMuted,
            fontFamily: 'ui-monospace,monospace',
          }}>{it.qtd || 1}×</span>
          <span style={{
            fontWeight: 600, color: T.textPrimary,
            fontFamily: 'ui-monospace,monospace',
            minWidth: 60, textAlign: 'right',
          }}>{fmtBRLShort((it.qtd || 1) * (it.valor || 0))}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => onAdd?.(tipo.id)}
        style={{
          padding: '10px 14px', background: 'transparent', border: 'none',
          borderTop: itens.length ? `1px dashed ${T.border}` : 'none',
          color: PALETA.blueStrong, fontWeight: 600, fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 6, justifyContent: 'flex-start', width: '100%',
        }}
      >
        <TI name="plus" size={14} /> adicionar {tipo.label.toLowerCase()}
      </button>
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
          DO DIAGNÓSTICO
        </span>
        {os?.diagnostico?.por && (
          <span style={{
            color: T.textMuted, fontWeight: 500,
            textTransform: 'none', letterSpacing: 0,
          }}>por {os.diagnostico.por}</span>
        )}
      </div>

      {causa && (
        <div style={{
          fontSize: 13, color: T.textPrimary,
          borderLeft: `3px solid ${PALETA.yellow}`,
          paddingLeft: 10, lineHeight: 1.4,
        }}>{causa}</div>
      )}

      {itensMarcados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 600,
            letterSpacing: '.04em', textTransform: 'uppercase',
          }}>Componentes marcados · {itensMarcados.length}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {itensMarcados.map((c, i) => (
              <Pill key={i} tone="neutral" icon="package" style={{
                background: '#F1ECF8', color: '#5A3FA0', borderColor: '#E0D4F0',
                fontSize: 11.5,
              }}>{c.label || c}</Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AcaoOrcamento = ({ os, onUpdateOS, onAbrirAba }) => {
  const { T } = useTheme();
  const itens = os?.orcamento?.itens || [];

  const porTipo = useMemo(() => {
    const map = { servico: [], peca: [], desloc: [] };
    itens.forEach(it => {
      const k = it.tipo || 'servico';
      (map[k] || map.servico).push(it);
    });
    return map;
  }, [itens]);

  const subtotais = useMemo(() => {
    const out = { servico: 0, peca: 0, desloc: 0 };
    Object.entries(porTipo).forEach(([k, arr]) => {
      out[k] = arr.reduce(
        (s, it) => s + (Number(it.qtd) || 0) * (Number(it.valor) || 0),
        0
      );
    });
    return out;
  }, [porTipo]);

  const total = subtotais.servico + subtotais.peca + subtotais.desloc;

  const addItem = (tipoId) => onUpdateOS?.({
    action: 'orcamento_add_item',
    item: { tipo: tipoId, nome: '', qtd: 1, valor: 0 },
  });
  const editItem = (idx) => onUpdateOS?.({ action: 'orcamento_edit_item', idx });

  return (
    <div style={{
      padding: 12, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <NowCard
        icon="currency-real"
        titulo="orçamento"
        descricao="Adicione itens separados por tipo. Único lugar onde se mexe em preço."
      />

      <ResumoDiagnostico os={os} />

      {TIPOS.map(t => (
        <GrupoBlock
          key={t.id}
          tipo={t}
          itens={porTipo[t.id]}
          subtotal={subtotais[t.id]}
          onAdd={addItem}
          onEditItem={(idx) => {
            const globalIdx = itens.findIndex(it => it === porTipo[t.id][idx]);
            editItem(globalIdx);
          }}
        />
      ))}

      <div className="idemaq-card" style={{
        background: 'linear-gradient(180deg,#F4F9FE 0%,#fff 100%)',
        border: `1px solid ${PALETA.blueLight}`,
        borderRadius: MOBILE.radiusCard, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.textMuted }}>
          <span>Serviços</span>
          <b style={{ color: T.textPrimary, fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>
            {fmtBRL(subtotais.servico)}
          </b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.textMuted }}>
          <span>Peças</span>
          <b style={{ color: T.textPrimary, fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>
            {fmtBRL(subtotais.peca)}
          </b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.textMuted }}>
          <span>Deslocamento</span>
          <b style={{ color: T.textPrimary, fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>
            {fmtBRL(subtotais.desloc)}
          </b>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingTop: 10, borderTop: `1px dashed ${PALETA.blueLight}`,
        }}>
          <span style={{
            fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
            color: T.textMuted, fontWeight: 700,
          }}>Total</span>
          <span style={{
            fontSize: 24, fontWeight: 700, color: T.textPrimary,
            fontFamily: 'ui-monospace,monospace', letterSpacing: '-.02em',
          }}>{fmtBRL(total)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <BtnMobile variant="ghost" icon="file-text"
          onClick={() => onUpdateOS?.({ action: 'gerar_pdf' })}>
          Gerar PDF
        </BtnMobile>
        <BtnMobile variant="ghost" icon="receipt"
          onClick={() => onAbrirAba?.('pagamento')}>
          Aba Pagamento
        </BtnMobile>
      </div>
      <BtnMobile variant="dashed" icon="brand-whatsapp"
        onClick={() => onUpdateOS?.({ action: 'enviar_orcamento_whatsapp' })}>
        Enviar orçamento por WhatsApp
      </BtnMobile>
    </div>
  );
};

export default AcaoOrcamento;
