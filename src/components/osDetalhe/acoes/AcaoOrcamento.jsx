// src/components/osDetalhe/acoes/AcaoOrcamento.jsx
// Etapa Orçamento — tela completa de edição + decisão.
// Conteúdo:
//   1. Relatório do diagnóstico (causa + checklist) lido de os.diagnostico
//   2. Atalhos rápidos pros serviços comuns (1 clique adiciona; 2 cliques incrementam)
//   3. Editor de itens (linhas iguais ao PagamentoTab — mas embebido na Etapa)
//   4. Desconto bidirecional R$ ↔ %
//   5. Resumo (subtotal · desconto · total)
//   6. Ações: Gerar PDF · Enviar WhatsApp · Aprovar · Recusar
//
// Tudo é state local + onUpdateOS — integração real fica pro Módulo 03.

import React, { useState, useMemo } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { useOSItens } from '../../../hooks/useOSItens'
import { fmtBRL } from '../../../utils/fmt'
import BlocoAcao from './BlocoAcao'
import RelatorioDiagnostico, { itensMarcadosDoDiag } from '../RelatorioDiagnostico'

const ATALHOS = [
  { nome: 'Limpeza',             tipo: 'servico', valor: 185, icon: 'ti-droplet' },
  { nome: 'Manutenção',          tipo: 'servico', valor: 185, icon: 'ti-tool' },
  { nome: 'Limpeza combinada',   tipo: 'servico', valor: 165, icon: 'ti-droplet-half' },
  { nome: 'Taxa de diagnóstico', tipo: 'servico', valor:  30, icon: 'ti-stethoscope' },
  { nome: 'Capa',                tipo: 'peca',    valor:  85, icon: 'ti-package' },
]

export default function AcaoOrcamento({ T, dark, os, usuarios, onMoverOS, onUpdateOS, setAba }) {
  const cor = (d, c) => dark ? d : c
  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)
  const verde    = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  // === Diagnóstico (referência) ===
  const diag = os.diagnostico || {}
  const causa = diag.causa || ''
  const itensMarcados = itensMarcadosDoDiag(os)

  // === Estado local do orçamento ===
  // Hook usa aliases (addItemDB/updateItemDB/removeItemDB) porque já existem
  // funções locais addItem/updateItem/removeItem que manipulam o state em memória.
  const {
    itens: itensSalvos,
    loading: loadingItens,
    addItem: addItemDB,
    updateItem: updateItemDB,
    removeItem: removeItemDB,
  } = useOSItens(os.id)
  const [itens, setItens] = useState([])
  // sincroniza state local quando dados do banco chegam (só na primeira carga)
  React.useEffect(() => {
    if (!loadingItens) setItens(itensSalvos.map(i => ({ ...i })))
  }, [loadingItens])
  const [desconto, setDesconto] = useState(os.desconto || 0)

  const subtotal = useMemo(() => itens.reduce((s, i) => s + i.valor * i.qtd, 0), [itens])
  const total = Math.max(0, subtotal - desconto)
  const descontoPct = subtotal > 0 ? Math.round((desconto / subtotal) * 100) : 0

  function setDescBRL(v) {
    const n = Math.max(0, Math.min(subtotal, Number(v) || 0))
    setDesconto(n)
  }
  function setDescPct(v) {
    const p = Math.max(0, Math.min(100, Number(v) || 0))
    setDesconto(Math.round(subtotal * p / 100))
  }

  function addAtalho(a) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.nome === a.nome && i.tipo === a.tipo)
      if (idx >= 0) {
        const novo = [...prev]
        novo[idx] = { ...novo[idx], qtd: novo[idx].qtd + 1 }
        return novo
      }
      return [...prev, { nome: a.nome, tipo: a.tipo, valor: a.valor, qtd: 1 }]
    })
  }

  function addItem() {
    setItens(prev => [...prev, { tipo: 'servico', nome: '', qtd: 1, valor: 0 }])
  }
  function removeItem(i) {
    setItens(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateItem(i, patch) {
    setItens(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }

  async function salvar() {
    // persiste desconto na OS
    onUpdateOS?.(os.numero, { desconto })

    // diff: remove itens deletados localmente
    const idsSalvos = itensSalvos.map(i => i.id).filter(Boolean)
    const idsLocais = itens.map(i => i.id).filter(Boolean)
    const deletados = idsSalvos.filter(id => !idsLocais.includes(id))
    for (const id of deletados) await removeItemDB(id)

    // insere/atualiza cada item local
    // Onda 4: schema os_item perdeu `tipo` e renomeou `qtd` → `quantidade`.
    // Discriminação peça×serviço agora é só por peca_id (NULL = serviço/avulso).
    for (const item of itens) {
      const payload = {
        nome: item.nome,
        quantidade: item.qtd ?? item.quantidade ?? 1,
        valor_unitario: item.valor_unitario ?? item.valor ?? 0,
        peca_id: item.peca_id ?? null,
      }
      if (item.id) {
        await updateItemDB(item.id, payload)
      } else {
        await addItemDB(payload)
      }
    }
  }

  function aprovar() {
    if (itens.length === 0) {
      alert('Adicione pelo menos um item antes de aprovar.')
      return
    }
    if (!window.confirm(`Aprovar orçamento de ${fmtBRL(total, { fr: true })} e avançar pra "Em oficina"?`)) return
    salvar()
    const prox = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    if (prox) onMoverOS(os.numero, prox.id)
  }

  function recusar() {
    if (!window.confirm('Cliente recusou o orçamento? A OS vai pra coluna "Recusado".')) return
    salvar()
    const rec = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'recusado')
    if (rec) onMoverOS(os.numero, rec.id)
  }

  function gerarPDF() {
    if (itens.length === 0) {
      alert('Adicione pelo menos um item antes de gerar o orçamento.')
      return
    }
    salvar()
    const w = window.open('', '_blank', 'width=720,height=900')
    if (!w) {
      alert('Permita pop-ups pra gerar o orçamento.')
      return
    }
    const hoje = new Date().toLocaleDateString('pt-BR')
    const linhas = itens.map(i => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(i.nome)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;font-variant-numeric:tabular-nums">${i.qtd}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums">${fmtBRL(i.valor, { fr: true })}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums">${fmtBRL(i.valor * i.qtd, { fr: true })}</td>
      </tr>
    `).join('')
    const causaHtml = causa ? `<div class="bloco"><div class="bloco-titulo">Diagnóstico técnico</div><div style="font-size:13px;line-height:1.5">${escapeHtml(causa)}</div>${itensMarcados.length > 0 ? `<div style="margin-top:10px;font-size:12px;color:#666">Itens identificados: ${itensMarcados.map(i => escapeHtml(i.label) + (i.tipo === 'troca' ? ' (troca)' : ' (manutenção)')).join(' · ')}</div>` : ''}</div>` : ''
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Orçamento OS #${os.numero}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 32px; color: #1a1a1a; max-width: 720px; margin: 0 auto; }
        h1 { color: #1a6aaa; margin: 0 0 4px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
        .bloco { background: #f7f7f9; padding: 14px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #eaeaee; }
        .bloco-titulo { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1a6aaa; color: #fff; padding: 10px; text-align: left; font-size: 12px; }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3), th:nth-child(4) { text-align: right; }
        .total { font-size: 22px; font-weight: 800; color: #1a6aaa; text-align: right; padding: 12px 10px; }
        .footer { font-size: 11px; color: #888; margin-top: 32px; text-align: center; border-top: 1px solid #eaeaee; padding-top: 14px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>IDEMAQ — Orçamento</h1>
      <div class="sub">OS #${os.numero} · ${hoje}</div>
      <div class="bloco">
        <div class="bloco-titulo">Cliente</div>
        <div><strong>${escapeHtml(os.cliente || '—')}</strong></div>
        <div style="font-size:12px;color:#666">${escapeHtml(os.fone || '')} · ${escapeHtml(os.endereco || '')}</div>
      </div>
      <div class="bloco">
        <div class="bloco-titulo">Equipamento</div>
        <div>${escapeHtml([os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento || '—')}</div>
        <div style="font-size:12px;color:#666;margin-top:4px"><strong>Defeito relatado:</strong> ${escapeHtml(os.defeito || '—')}</div>
      </div>
      ${causaHtml}
      <table>
        <thead><tr><th>Item</th><th>Qtd</th><th>Valor unit.</th><th>Subtotal</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <table style="margin-top:16px;background:#f7f7f9;border-radius:8px;overflow:hidden">
        <tr><td style="padding:8px 12px;color:#666">Subtotal</td><td style="padding:8px 12px;text-align:right;font-variant-numeric:tabular-nums">${fmtBRL(subtotal, { fr: true })}</td></tr>
        ${desconto > 0 ? `<tr><td style="padding:8px 12px;color:#2d8d4a">Desconto (${descontoPct}%)</td><td style="padding:8px 12px;text-align:right;color:#2d8d4a;font-variant-numeric:tabular-nums">− ${fmtBRL(desconto, { fr: true })}</td></tr>` : ''}
        <tr style="background:#e6f1fb"><td style="padding:14px 12px;font-weight:700;font-size:16px">Total</td><td class="total">${fmtBRL(total, { fr: true })}</td></tr>
      </table>
      <div class="footer">
        IDEMAQ Assistência Técnica · Naviraí/MS · Pagamento via PIX, cartão ou link InfinitePay<br>
        Orçamento válido por 7 dias.
      </div>
      <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
      </body></html>`)
    w.document.close()
  }

  function enviarWhats() {
    const num = (os.fone || '').replace(/\D/g, '')
    if (!num) {
      alert('Cliente sem telefone cadastrado.')
      return
    }
    if (itens.length === 0) {
      alert('Adicione pelo menos um item antes de enviar.')
      return
    }
    salvar()
    const linhasMsg = itens.map(i =>
      `• ${i.nome}${i.qtd > 1 ? ` (${i.qtd}x)` : ''} — ${fmtBRL(i.valor * i.qtd, { fr: true })}`
    ).join('\n')
    const texto = `Olá ${os.cliente || ''}! 👋

Segue o orçamento da OS #${os.numero} (${[os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento || 'equipamento'}):

${linhasMsg}
${desconto > 0 ? `\nDesconto: ${fmtBRL(desconto, { fr: true })} (${descontoPct}%)\n` : '\n'}
*Total: ${fmtBRL(total, { fr: true })}*

Pagamento via PIX, cartão ou link InfinitePay (D+1).
Aguardo sua aprovação pra começar o serviço. Qualquer dúvida estou aqui!`
    const url = `send?phone=55${num}&text=${encodeURIComponent(texto)}`
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = `intent://${url}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.whatsapp.w4b;end`
    } else {
      window.location.href = `whatsapp://${url}`
    }
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-file-dollar"
      etapa="Orçamento"
      descricao="Único lugar onde se mexe em preço. Edite os itens, gere PDF ou envie pro cliente."
    >
      {/* === RELATÓRIO DO DIAGNÓSTICO === */}
      <RelatorioDiagnostico T={T} dark={dark} os={os} usuarios={usuarios} />

      {/* === ATALHOS RÁPIDOS === */}
      <div>
        <div style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 600, marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: '.3px',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-bolt" style={{ fontSize: 12 }} aria-hidden="true" />
          Atalhos
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ATALHOS.map(a => (
            <button key={a.nome} type="button" onClick={() => addAtalho(a)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 14,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = azul + '55'; e.currentTarget.style.color = azul }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary }}
            >
              <i className={`ti ${a.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
              {a.nome}
              <span style={{ color: T.textDim, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                {fmtBRL(a.valor, { fr: true })}
              </span>
              <i className="ti ti-plus" style={{ fontSize: 12, marginLeft: 2 }} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* === LISTA DE ITENS (editor) === */}
      <div className="idemaq-card" style={{
        background: T.cardAlt, border: `1px solid ${T.border}`,
        borderRadius: 9, padding: 0, overflow: 'hidden',
      }}>
        {itens.length === 0 ? (
          <div style={{
            padding: '18px 14px', textAlign: 'center',
            fontSize: 12, color: T.textMuted,
          }}>
            Sem itens — use os atalhos acima ou adicione manualmente.
          </div>
        ) : itens.map((it, i) => (
          <ItemLinha
            key={i} item={it} T={T} dark={dark}
            primeiro={i === 0}
            onChange={(patch) => updateItem(i, patch)}
            onRemove={() => removeItem(i)}
          />
        ))}
        <button onClick={addItem} style={{
          width: '100%', padding: '10px 12px',
          background: 'transparent', color: cor(P.blue, P.blueDark),
          border: 'none', borderTop: itens.length > 0 ? `1px dashed ${T.border}` : 'none',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
          adicionar item
        </button>
      </div>

      {/* === DESCONTO BIDIRECIONAL === */}
      {subtotal > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CampoDesc T={T} label="Desconto R$" prefix="R$" valor={desconto} onChange={setDescBRL} />
          <CampoDesc T={T} label="Desconto %" suffix="%" valor={descontoPct} onChange={setDescPct} />
        </div>
      )}

      {/* === RESUMO === */}
      <div style={{
        background: cor('#0d2035', '#e6f1fb'),
        border: `1px solid ${azul}55`,
        borderRadius: 9, padding: '12px 14px',
      }}>
        <Linha T={T} label="Subtotal" valor={fmtBRL(subtotal, { fr: true })} />
        {desconto > 0 && (
          <Linha T={T} label={`Desconto (${descontoPct}%)`}
            valor={`− ${fmtBRL(desconto, { fr: true })}`}
            cor={verde} />
        )}
        <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{
            fontSize: 11, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.3px',
          }}>
            Total
          </span>
          <span style={{
            fontSize: 22, fontWeight: 700, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtBRL(total, { fr: true })}
          </span>
        </div>
      </div>

      {/* === GERAR / ENVIAR === */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={gerarPDF} style={btnSec(T, dark)}>
          <i className="ti ti-printer" style={{ fontSize: 15 }} aria-hidden="true" />
          Gerar PDF
        </button>
        <button onClick={enviarWhats} style={btnSec(T, dark)}>
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 15 }} aria-hidden="true" />
          Enviar ao cliente
        </button>
      </div>

      {/* === APROVAR / RECUSAR === */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <button onClick={aprovar} style={{
          padding: '12px 16px', borderRadius: 8, border: 'none',
          background: verde, color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <i className="ti ti-check" style={{ fontSize: 17 }} aria-hidden="true" />
          Aprovar · começar serviço
        </button>
        <button onClick={recusar} style={{
          padding: '12px 14px', borderRadius: 8,
          border: `1px solid ${vermelho}55`,
          background: cor('#2a1515', '#fde8e8'),
          color: vermelho, fontSize: 12.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
          Recusar
        </button>
      </div>

      {/* Link discreto pra aba Pagamento (registrar adiantamento) */}
      {setAba && subtotal > 0 && (
        <div style={{ textAlign: 'center', marginTop: 2 }}>
          <button onClick={() => setAba('pagamento')} style={{
            background: 'transparent', border: 'none',
            color: T.textMuted, fontSize: 11, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            textDecoration: 'underline', textDecorationColor: T.border,
          }}>
            Cliente pagou adiantado? Registrar na aba Pagamento
            <i className="ti ti-arrow-right" style={{ fontSize: 11 }} aria-hidden="true" />
          </button>
        </div>
      )}
    </BlocoAcao>
  )
}

// ─── ItemLinha (editor) — espelha o do PagamentoTab ─────────────────────────
function ItemLinha({ item, T, dark, primeiro, onChange, onRemove }) {
  const cor = (d, c) => dark ? d : c
  const icone = item.tipo === 'peca' ? 'ti-package'
              : item.tipo === 'maquina' ? 'ti-device-washing-machine'
              : 'ti-tool'
  const corIcone = item.tipo === 'peca' ? cor(P.yellow, P.yellowDark)
                  : item.tipo === 'maquina' ? cor(P.green, P.greenDark)
                  : cor(P.blue, P.blueDark)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 90px 1fr 60px 90px auto',
      gap: 8, alignItems: 'center',
      padding: '10px 12px',
      borderTop: primeiro ? 'none' : `1px solid ${T.border}`,
    }}>
      <i className={`ti ${icone}`} style={{ fontSize: 14, color: corIcone, flexShrink: 0 }} aria-hidden="true" />
      <select
        value={item.tipo}
        onChange={(e) => onChange({ tipo: e.target.value })}
        style={{
          padding: '5px 6px', borderRadius: 5,
          border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
          fontSize: 10.5, fontFamily: 'inherit',
          colorScheme: dark ? 'dark' : 'light',
        }}>
        <option value="servico">serviço</option>
        <option value="peca">peça</option>
        <option value="maquina">máquina</option>
      </select>
      <input
        value={item.nome}
        onChange={(e) => onChange({ nome: e.target.value })}
        placeholder="Nome do item"
        style={inp(T)}
      />
      <input
        type="number" min="1" value={item.qtd}
        onChange={(e) => onChange({ qtd: Math.max(1, Number(e.target.value) || 1) })}
        style={{ ...inp(T), textAlign: 'center' }}
      />
      <input
        type="number" min="0" step="0.01" value={item.valor}
        onChange={(e) => onChange({ valor: Math.max(0, Number(e.target.value) || 0) })}
        style={{ ...inp(T), textAlign: 'right' }}
      />
      <button onClick={onRemove} aria-label="Remover" style={{
        padding: '6px 8px', borderRadius: 5,
        border: 'none', background: 'transparent',
        color: T.textMuted, cursor: 'pointer',
      }}>
        <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
    </div>
  )
}

// ─── Campo de desconto bidirecional ─────────────────────────────────────────
function CampoDesc({ T, label, prefix, suffix, valor, onChange }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px',
      }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {prefix && <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>{prefix}</span>}
        <input
          type="number" min="0" value={valor}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inp(T), flex: 1, textAlign: 'right' }}
        />
        {suffix && <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600 }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Helpers de estilo ──────────────────────────────────────────────────────
function inp(T) {
  return {
    padding: '6px 8px', borderRadius: 5,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 11.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    minWidth: 0,
  }
}

function btnSec(T, dark) {
  return {
    padding: '10px 14px', borderRadius: 8,
    background: T.cardAlt, color: T.textPrimary,
    border: `1px solid ${T.border}`,
    fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
}

function Linha({ T, label, valor, cor: c }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      fontSize: 12, color: T.textMuted, marginBottom: 4,
    }}>
      <span>{label}</span>
      <span style={{
        fontWeight: 600, color: c || T.textSecondary,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {valor}
      </span>
    </div>
  )
}


// Escape simples pra evitar HTML injection no PDF gerado.
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
