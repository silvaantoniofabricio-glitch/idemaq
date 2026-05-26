import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../theme';
import { useOSItens } from '../../../hooks/useOSItens';
import { useToast } from '../../ui';
import {
  TI, BtnMobile, MOBILE, PALETA, Group, Input,
} from '../../_shared/PrimitivasMobile';

const TIPOS = [
  { id: 'servico', label: 'serviço', icon: 'tool',    bg: PALETA.blueBg,   fg: PALETA.blueStrong },
  { id: 'peca',    label: 'peça',    icon: 'package', bg: '#F1ECF8',       fg: '#5A3FA0' },
  { id: 'desloc',  label: 'desloc.', icon: 'truck',   bg: PALETA.yellowBg, fg: PALETA.yellowStrong },
];

const TipoBadge = ({ tipo, onChange }) => {
  const { T, dark } = useTheme();
  const [aberto, setAberto] = useState(false);
  const t = TIPOS.find(x => x.id === tipo) || TIPOS[0];
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: t.bg, color: t.fg,
          padding: '4px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 600,
          letterSpacing: '.04em', textTransform: 'uppercase',
          border: 'none', cursor: 'pointer',
        }}
      >
        <TI name={t.icon} size={12} />
        {t.label}
        <TI name="chevron-down" size={12} />
      </button>
      {aberto && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: 4, zIndex: 10,
          boxShadow: '0 8px 20px -8px rgba(0,0,0,.2)',
        }}>
          {TIPOS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onChange(opt.id); setAberto(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: 140, padding: '8px 10px', background: 'transparent',
                border: 'none', cursor: 'pointer', borderRadius: 6,
                fontSize: 13, color: T.textPrimary, textAlign: 'left',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <TI name={opt.icon} size={14} color={opt.fg} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ItemCard = ({ item, onChange, onRemove }) => {
  const { T, dark } = useTheme();
  const update = (patch) => onChange({ ...item, ...patch });
  const decQty = () => update({ qtd: Math.max(1, (item.qtd || 1) - 1) });
  const incQty = () => update({ qtd: (item.qtd || 1) + 1 });

  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radiusCard, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative',
    }}>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover item"
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 32, height: 32, borderRadius: 8,
          border: `1px solid ${T.border}`, background: T.card,
          color: T.textMuted,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      ><TI name="x" size={16} /></button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 40 }}>
        <TipoBadge tipo={item.tipo} onChange={(tp) => update({ tipo: tp })} />
        <input
          value={item.nome || ''}
          onChange={(e) => update({ nome: e.target.value })}
          placeholder="Nome do item"
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none',
            fontSize: 15, fontWeight: 600, color: T.textPrimary,
            background: 'transparent',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
        <div style={{
          background: dark ? 'rgba(255,255,255,0.04)' : '#F8F9FB', border: `1px solid ${T.border}`,
          borderRadius: 10, display: 'flex', alignItems: 'center',
          minHeight: 44, padding: '0 4px',
        }}>
          <button
            type="button" onClick={decQty}
            style={{
              width: 36, height: 36, border: 'none', background: 'transparent',
              color: T.textMuted, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><TI name="minus" size={16} /></button>
          <div style={{
            flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600,
            color: T.textPrimary,
          }}>{item.qtd || 1}</div>
          <button
            type="button" onClick={incQty}
            style={{
              width: 36, height: 36, border: 'none', background: 'transparent',
              color: T.textMuted, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><TI name="plus" size={16} /></button>
        </div>

        <div style={{
          background: dark ? 'rgba(255,255,255,0.04)' : '#F8F9FB', border: `1px solid ${T.border}`,
          borderRadius: 10, display: 'flex', alignItems: 'center',
          gap: 6, minHeight: 44, padding: '0 12px',
        }}>
          <span style={{ color: T.textMuted, fontWeight: 500, fontSize: 13 }}>R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={item.valor ?? ''}
            onChange={(e) => update({ valor: e.target.value })}
            placeholder="0,00"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none',
              background: 'transparent', textAlign: 'right',
              fontSize: 15, fontWeight: 600, color: T.textPrimary,
            }}
          />
        </div>
      </div>
    </div>
  );
};

const fmtBRL = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const TotaisCard = ({ subtotal, descontoRS, total }) => {
  const { T, dark } = useTheme();
  return (
    <div className="idemaq-card" style={{
      background: dark ? 'rgba(91,155,213,0.10)' : '#F4F9FE', border: `1px solid ${dark ? 'rgba(91,155,213,0.30)' : PALETA.blueLight}`,
      borderRadius: MOBILE.radiusCard, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 13, color: T.textMuted,
      }}>
        <span>Subtotal</span>
        <b style={{ color: T.textPrimary, fontWeight: 600 }}>{fmtBRL(subtotal)}</b>
      </div>
      {descontoRS > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 13, color: T.textMuted,
        }}>
          <span>Desconto</span>
          <b style={{ color: PALETA.redStrong, fontWeight: 600 }}>— {fmtBRL(descontoRS)}</b>
        </div>
      )}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        paddingTop: 10, borderTop: `1px dashed ${PALETA.blueLight}`,
        alignItems: 'baseline',
      }}>
        <span style={{
          fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
          color: T.textMuted, fontWeight: 700,
        }}>Total</span>
        <span style={{
          fontSize: 22, fontWeight: 700, color: T.textPrimary,
        }}>{fmtBRL(total)}</span>
      </div>
    </div>
  );
};

const PagamentoTab = ({ os, onUpdateOS }) => {
  const { T, dark } = useTheme();
  const notify = useToast();
  // Itens vem do hook real (tabela os_item) — antes lia de os.orcamento.itens
  // que era um mock que nunca conectou no banco. Schema real: nome,
  // quantidade, valor_unitario. UI usa qtd/valor — mapeio nos dois sentidos.
  const { itens: itensDb, addItem: addItemDb, updateItem: updateItemDb, removeItem: removeItemDb } = useOSItens(os?.id);
  const itens = useMemo(() => itensDb.map(it => ({
    id: it.id,
    nome: it.nome || '',
    qtd: it.quantidade || 1,
    valor: it.valor_unitario || 0,
    tipo: it.tipo || 'servico', // tipo nao existe no DB hoje — mantem em memoria
  })), [itensDb]);

  const [descontoRS, setDescontoRS] = useState(os?.orcamento?.descontoRS || 0);
  const [descontoPct, setDescontoPct] = useState(os?.orcamento?.descontoPct || 0);

  const subtotal = useMemo(
    () => itens.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valor) || 0), 0),
    [itens]
  );
  const descontoTotal = useMemo(
    () => Number(descontoRS || 0) + subtotal * (Number(descontoPct || 0) / 100),
    [descontoRS, descontoPct, subtotal]
  );
  const total = Math.max(0, subtotal - descontoTotal);

  // Helpers — convertem UI (qtd/valor) -> DB (quantidade/valor_unitario)
  const uiToDb = (ui) => ({
    nome: ui.nome ?? '',
    quantidade: Number(ui.qtd) || 1,
    valor_unitario: Number(String(ui.valor || '').replace(',', '.')) || 0,
  });

  const updateItem = async (idx, novo) => {
    const id = itensDb[idx]?.id;
    if (!id) return;
    const { error } = await updateItemDb(id, uiToDb(novo));
    if (error) notify('erro', 'Erro ao atualizar item');
  };
  const removeItem = async (idx) => {
    const id = itensDb[idx]?.id;
    if (!id) return;
    const { error } = await removeItemDb(id);
    if (error) notify('erro', 'Erro ao remover item');
  };
  const addItem = async () => {
    const { error } = await addItemDb({ nome: '', quantidade: 1, valor_unitario: 0 });
    if (error) notify('erro', 'Erro ao adicionar item');
  };

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: 11, color: T.textMuted, fontWeight: 700,
        letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <TI name="receipt" size={14} /> ITENS · ORÇAMENTO
      </div>

      {itens.length === 0 ? (
        <div className="idemaq-card" style={{
          background: T.card, border: `1px dashed ${T.border}`,
          borderRadius: MOBILE.radiusCard, padding: 16, textAlign: 'center',
          fontSize: 13, color: T.textMuted,
        }}>
          Sem itens — adicione abaixo
        </div>
      ) : (
        itens.map((it, idx) => (
          <ItemCard
            key={it.id || idx}
            item={it}
            onChange={(novo) => updateItem(idx, novo)}
            onRemove={() => removeItem(idx)}
          />
        ))
      )}

      <BtnMobile variant="dashed" icon="plus" onClick={addItem}>
        adicionar item
      </BtnMobile>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
        <Group label="R$ desconto">
          <Input
            type="text" inputMode="decimal"
            placeholder="0,00"
            value={descontoRS || ''}
            onChange={(e) => { setDescontoRS(e.target.value); onUpdateOS?.({ action: 'set_desconto_rs', valor: e.target.value }); }}
          />
        </Group>
        <Group label="% desconto">
          <Input
            type="text" inputMode="decimal"
            placeholder="0"
            value={descontoPct || ''}
            onChange={(e) => { setDescontoPct(e.target.value); onUpdateOS?.({ action: 'set_desconto_pct', valor: e.target.value }); }}
          />
        </Group>
      </div>

      <TotaisCard subtotal={subtotal} descontoRS={descontoTotal} total={total} />

      <Group label="Forma de pagamento">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { id: 'pix',      label: 'PIX',      icon: 'brand-pix' },
            { id: 'dinheiro', label: 'Dinheiro', icon: 'cash' },
            { id: 'cartao',   label: 'Cartão',   icon: 'credit-card' },
            { id: 'boleto',   label: 'Boleto',   icon: 'file-invoice' },
          ].map(m => (
            <BtnMobile
              key={m.id}
              variant="ghost"
              icon={m.icon}
              onClick={() => onUpdateOS?.({ action: 'set_metodo_pagamento', metodo: m.id })}
              style={{
                minHeight: 48,
                background: os?.pagamento?.metodo === m.id ? (dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg) : T.card,
                borderColor: os?.pagamento?.metodo === m.id ? PALETA.blueLight : T.border,
                color: os?.pagamento?.metodo === m.id ? PALETA.blueStrong : T.textPrimary,
              }}
              fullWidth
            >{m.label}</BtnMobile>
          ))}
        </div>
      </Group>
    </div>
  );
};

export default PagamentoTab;
