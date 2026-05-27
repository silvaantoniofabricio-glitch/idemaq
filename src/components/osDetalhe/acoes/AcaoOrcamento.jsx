import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, NowCard, BtnMobile, MOBILE, PALETA, Pill,
} from '../../_shared/PrimitivasMobile';
import { useOSItens } from '../../../hooks/useOSItens';
import FormRecebimento from '../FormRecebimento';
import { persistirLancamentosDoPagamento } from '../../../utils/osToFinanceiro';

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

const inputStyle = (T) => ({
  width: '100%', boxSizing: 'border-box',
  padding: '9px 11px', fontSize: 14,
  background: T.bg, color: T.textPrimary,
  border: `1px solid ${T.border}`, borderRadius: 8,
  outline: 'none', fontFamily: 'inherit',
});

const AddItemForm = ({ tipo, T, onSave, onCancel, saving }) => {
  const [nome, setNome]   = useState('');
  const [qtd, setQtd]     = useState('1');
  const [valor, setValor] = useState('');

  const valido = nome.trim().length > 0 && Number(qtd) > 0;

  function handleSave() {
    if (!valido) return;
    onSave({
      nome:           nome.trim(),
      qtd:            Number(qtd)   || 1,
      valor_unitario: Number(valor) || 0,
      tipo:           tipo.id,
    });
  }

  return (
    <div style={{
      background: tipo.bg, border: `1px solid ${tipo.fg}44`,
      borderRadius: 10, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 8,
      marginTop: 4,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: tipo.fg,
        textTransform: 'uppercase', letterSpacing: '.06em',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <TI name={tipo.icon} size={12} color={tipo.fg} />
        Novo {tipo.label.slice(0, -1).toLowerCase()}
      </div>

      <input
        style={inputStyle(T)}
        placeholder="Descrição (ex: Troca de correia)"
        value={nome}
        onChange={e => setNome(e.target.value)}
        autoFocus
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Qtd</div>
          <input
            style={inputStyle(T)}
            type="number" min="1" step="1"
            value={qtd}
            onChange={e => setQtd(e.target.value)}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>Valor unit. (R$)</div>
          <input
            style={inputStyle(T)}
            type="number" min="0" step="0.01"
            placeholder="0,00"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 2 }}>
        <BtnMobile variant="ghost" icon="x" onClick={onCancel} disabled={saving}>
          Cancelar
        </BtnMobile>
        <BtnMobile variant="blue" icon="check" onClick={handleSave}
          disabled={!valido || saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </BtnMobile>
      </div>
    </div>
  );
};

const GrupoBlock = ({ tipo, itens, subtotal, T, onAdd, onRemoveItem, adicionandoTipo }) => {
  const { dark } = useTheme();
  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radiusCard, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        background: dark ? 'rgba(255,255,255,0.04)' : '#F8F9FB',
        borderBottom: `1px solid ${T.border}`,
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
        <div key={it.id || idx} style={{
          padding: '9px 14px', border: 'none', background: T.card,
          borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13.5,
        }}>
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
          }}>{fmtBRLShort((it.qtd || 1) * (it.valor_unitario || 0))}</span>
          {onRemoveItem && (
            <button type="button" onClick={() => onRemoveItem(it.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#aaa', padding: 2, display: 'inline-flex',
            }}>
              <TI name="trash" size={14} />
            </button>
          )}
        </div>
      ))}

      {adicionandoTipo === tipo.id
        ? null
        : (
          <button
            type="button"
            onClick={() => onAdd(tipo.id)}
            style={{
              padding: '10px 14px', background: 'transparent', border: 'none',
              borderTop: itens.length ? `1px dashed ${T.border}` : 'none',
              color: PALETA.blueStrong, fontWeight: 600, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: 6, justifyContent: 'flex-start', width: '100%',
            }}
          >
            <TI name="plus" size={14} /> adicionar {tipo.label.toLowerCase().replace(/s$/, '')}
          </button>
        )}
    </div>
  );
};

// ─── Botão de status do orçamento ────────────────────────────────────────────
// idle → aguardando → (confirmado | recusado)
const STATUS_ORC = {
  idle:       { label: 'Enviar Orçamento',    icon: 'send',  bg: 'transparent', border: PALETA.blue,   color: PALETA.blueStrong },
  aguardando: { label: 'Aguardando resposta', icon: 'clock', bg: PALETA.yellowBg, border: PALETA.yellow, color: PALETA.yellowStrong },
  confirmado: { label: 'Confirmado',          icon: 'check', bg: '#e8f8f0',     border: '#4CAF82',     color: '#2e7d5e' },
  recusado:   { label: 'Recusado',            icon: 'x',     bg: PALETA.redBg,  border: PALETA.red,    color: PALETA.redStrong },
};

const BotaoStatusOrcamento = ({ os, onUpdateOS }) => {
  const { T } = useTheme();
  const [status, setStatus] = useState(os?.orcamento_status || 'idle');
  const [confirmando, setConfirmando] = useState(false);

  function avancar() {
    if (status === 'idle') {
      setStatus('aguardando');
      onUpdateOS?.(os.numero, { orcamento_status: 'aguardando' });
    } else if (status === 'aguardando') {
      setConfirmando(true);
    }
  }

  function resolver(novoStatus) {
    setStatus(novoStatus);
    setConfirmando(false);
    onUpdateOS?.(os.numero, { orcamento_status: novoStatus });
  }

  const meta = STATUS_ORC[status] || STATUS_ORC.idle;
  const clicavel = status === 'idle' || status === 'aguardando';

  if (confirmando) {
    return (
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center',
        }}>
          O orçamento foi aprovado?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" onClick={() => resolver('recusado')} style={{
            padding: '12px 0', borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${PALETA.red}`, fontFamily: 'inherit',
            background: PALETA.redBg, color: PALETA.redStrong,
            fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <TI name="x" size={16} /> Recusado
          </button>
          <button type="button" onClick={() => resolver('confirmado')} style={{
            padding: '12px 0', borderRadius: 10, cursor: 'pointer',
            border: '1px solid #4CAF82', fontFamily: 'inherit',
            background: '#e8f8f0', color: '#2e7d5e',
            fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <TI name="check" size={16} /> Confirmado
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={clicavel ? avancar : undefined} style={{
      width: '100%', padding: '13px 16px', borderRadius: 12,
      border: `1.5px dashed ${meta.border}`,
      background: meta.bg, color: meta.color,
      fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
      cursor: clicavel ? 'pointer' : 'default',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'background .12s, border-color .12s',
    }}>
      <TI name={meta.icon} size={16} />
      {meta.label}
    </button>
  );
};

const ResumoDiagnostico = ({ os }) => {
  const { T, dark } = useTheme();
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
                background: dark ? 'rgba(140,100,200,0.18)' : '#F1ECF8',
                color: dark ? '#c4a8f0' : '#5A3FA0',
                borderColor: dark ? 'rgba(140,100,200,0.40)' : '#E0D4F0',
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
  const { T, dark } = useTheme();
  const { itens, addItem, removeItem } = useOSItens(os?.id);
  const [adicionandoTipo, setAdicionandoTipo] = useState(null);
  const [saving, setSaving] = useState(false);

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
        (s, it) => s + (Number(it.qtd) || 0) * (Number(it.valor_unitario) || 0),
        0
      );
    });
    return out;
  }, [porTipo]);

  const total = subtotais.servico + subtotais.peca + subtotais.desloc;

  async function handleSaveItem(dados) {
    setSaving(true);
    await addItem(dados);
    setSaving(false);
    setAdicionandoTipo(null);
  }

  async function handleRemove(id) {
    await removeItem(id);
  }

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <NowCard
        icon="currency-real"
        titulo="orçamento"
        descricao="Adicione itens separados por tipo. Único lugar onde se mexe em preço."
      />

      <ResumoDiagnostico os={os} />

      {TIPOS.map(t => (
        <React.Fragment key={t.id}>
          <GrupoBlock
            tipo={t}
            itens={porTipo[t.id]}
            subtotal={subtotais[t.id]}
            T={T}
            onAdd={(tipoId) => setAdicionandoTipo(tipoId)}
            onRemoveItem={handleRemove}
            adicionandoTipo={adicionandoTipo}
          />
          {adicionandoTipo === t.id && (
            <AddItemForm
              tipo={t}
              T={T}
              saving={saving}
              onSave={handleSaveItem}
              onCancel={() => setAdicionandoTipo(null)}
            />
          )}
        </React.Fragment>
      ))}

      <div className="idemaq-card" style={{
        background: dark
          ? 'linear-gradient(180deg,rgba(91,155,213,0.08) 0%,rgba(91,155,213,0.02) 100%)'
          : 'linear-gradient(180deg,#F4F9FE 0%,#fff 100%)',
        border: `1px solid ${dark ? 'rgba(91,155,213,0.30)' : PALETA.blueLight}`,
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

      <BotaoStatusOrcamento os={os} onUpdateOS={onUpdateOS} />

      {/* FormRecebimento completo — mesma logica da aba Pagamento.
          Permite escolher forma (PIX/Cartao/Dinheiro/A prazo) com sub-leque
          do Cartao (Debito/Credito 1x-12x/Link 1x-12x) e taxas calculadas. */}
      <FormRecebimento
        T={T} dark={dark}
        saldo={Math.max(0, total - (os?.valor_pago || 0))}
        onConfirmar={({ valor, forma, modo, taxa_pct, parcelas: parcelasAPrazo }) => {
          const valorPagoAtual = Number(os?.valor_pago || 0);
          const novoValorPago = valorPagoAtual + valor;
          let novoPago = 'total';
          let novoDesconto = Number(os?.desconto || 0);
          if (modo === 'parcial') novoPago = 'parcial';
          else if (modo === 'desconto') {
            const aPagar = Math.max(0, total - valorPagoAtual);
            novoDesconto = novoDesconto + (aPagar - valor);
          }
          let novasObs = os?.observacoes;
          if (parcelasAPrazo && parcelasAPrazo.length > 0) {
            const txt = parcelasAPrazo
              .map((p, i) => `${i + 1}ª · ${p.data} · ${fmtBRL(p.valor)}`)
              .join('\n');
            novasObs = [
              os?.observacoes,
              `— A prazo (${parcelasAPrazo.length} ${parcelasAPrazo.length === 1 ? 'parcela' : 'parcelas'}) —\n${txt}`,
            ].filter(Boolean).join('\n\n');
          }
          onUpdateOS?.(os.numero, {
            valor: total,
            desconto: novoDesconto,
            valor_pago: novoValorPago,
            pago: novoPago,
            forma_pagamento: forma,
            ...(novasObs !== os?.observacoes ? { observacoes: novasObs } : {}),
          });
          persistirLancamentosDoPagamento(os, {
            valor, forma, taxa_pct,
            parcelasAPrazo: parcelasAPrazo || [],
          });
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <BtnMobile variant="ghost" icon="file-text"
          onClick={() => onUpdateOS?.(os.numero, { action: 'gerar_pdf' })}>
          Gerar PDF
        </BtnMobile>
        <BtnMobile variant="ghost" icon="receipt"
          onClick={() => onAbrirAba?.('pagamento')}>
          Aba Pagamento
        </BtnMobile>
      </div>
      <BtnMobile variant="dashed" icon="brand-whatsapp"
        onClick={() => onUpdateOS?.(os.numero, { action: 'enviar_orcamento_whatsapp' })}>
        Enviar orçamento por WhatsApp
      </BtnMobile>
    </div>
  );
};

export default AcaoOrcamento;
