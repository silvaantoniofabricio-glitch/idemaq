// idemaq-src/components/estoque/PecaDetalheModal.jsx
// Detalhe de uma peça — ficha visual + histórico (mock) + modo edição inline.
// Botão "Editar peça" alterna entre leitura e formulário; "Salvar" persiste
// via callback onSalvar (chama usePecas.atualizar em Estoque.jsx).
//
// Visibilidade: quando mostraValores=false (funcionário), custo/lucro ficam
// ocultos e não editáveis. O patch enviado não inclui campos financeiros.

import React, { useMemo, useState } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, Button, Badge, Input, useToast } from '../ui'

// ─── Mock de movimentações (substituir quando entrar baixa automática) ─────
const TIPOS_MOV = {
  entrada_manual: { label: 'Entrada manual', icon: 'ti-package-import',  cor: 'green'  },
  entrada_nf:     { label: 'Entrada por NF', icon: 'ti-file-invoice',    cor: 'green'  },
  baixa_os:       { label: 'Baixa em OS',    icon: 'ti-arrow-down-right',cor: 'yellow' },
  ajuste:         { label: 'Ajuste manual',  icon: 'ti-pencil',          cor: 'neutro' },
}

function movsMock(peca) {
  // Hash determinístico do id (uuid string) — mantém mock estável por peça.
  let h = 0
  const s = String(peca.id || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  const base = Math.abs(h) % 100
  return [
    { id: 1, tipo: 'entrada_nf',     delta: +12, data: '2026-04-12 09:14', responsavel: 'Toni',       obs: `NF #${1820 + base} · Atacado MS` },
    { id: 2, tipo: 'baixa_os',       delta: -2,  data: '2026-04-22 14:30', responsavel: 'Guilherme',  obs: `OS #${1090 + base}` },
    { id: 3, tipo: 'baixa_os',       delta: -1,  data: '2026-05-03 10:05', responsavel: 'Guilherme',  obs: `OS #${1102 + base}` },
    { id: 4, tipo: 'ajuste',         delta: -1,  data: '2026-05-08 17:40', responsavel: 'Toni',       obs: 'Peça quebrada no manuseio' },
    { id: 5, tipo: 'entrada_manual', delta: +5,  data: '2026-05-14 11:20', responsavel: 'Alessandro', obs: 'Compra avulsa ML' },
  ]
}

function nivel(qtd, min) {
  if (!min || min <= 0) return { variant: 'neutro', label: 'Catálogo', icon: 'ti-book-2' }
  if (qtd <= 0) return { variant: 'vermelho', label: 'Esgotado', icon: 'ti-alert-octagon' }
  if (qtd <= min) return { variant: 'amarelo', label: 'Estoque baixo', icon: 'ti-alert-triangle' }
  return { variant: 'azul', label: 'Estoque OK', icon: 'ti-check' }
}

function pctLucro(custo, venda) {
  if (!custo || !venda) return 0
  return Math.round(((venda - custo) / custo) * 100)
}

function toNum(v) {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

// Patch enxuto: só envia o que mudou (em camelCase — uiToDb traduz no hook).
function diffPatch(form, peca, mostraValores) {
  const out = {}
  const setIf = (k, v) => { if (v !== peca[k]) out[k] = v }
  setIf('nome', form.nome.trim())
  setIf('sku', form.sku.trim())
  setIf('fornecedor', form.fornecedor.trim())
  setIf('qtdAtual', toNum(form.qtdAtual))
  setIf('qtdMinima', toNum(form.qtdMinima))
  setIf('qtdMaxima', toNum(form.qtdMaxima))
  setIf('precoVenda', toNum(form.precoVenda))
  if (mostraValores) setIf('custoAtual', toNum(form.custoAtual))
  return out
}

export default function PecaDetalheModal({
  T, dark, peca, onClose, onSalvar, mobile,
  mostraValores = true,
}) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Form começa espelhando a peça. Strings vazias permitem digitar livre.
  const [form, setForm] = useState(() => ({
    nome: peca.nome || '',
    sku: peca.sku || '',
    fornecedor: peca.fornecedor || '',
    qtdAtual: String(peca.qtdAtual ?? 0),
    qtdMinima: String(peca.qtdMinima ?? 0),
    qtdMaxima: String(peca.qtdMaxima ?? 0),
    custoAtual: String(peca.custoAtual ?? 0),
    precoVenda: String(peca.precoVenda ?? 0),
  }))
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  // Em modo leitura, mostra os valores reais da peça. Em modo edição, mostra
  // o que está sendo digitado pra dar feedback ao vivo (barra, nível, margem).
  const view = editando
    ? {
        qtdAtual: toNum(form.qtdAtual),
        qtdMinima: toNum(form.qtdMinima),
        qtdMaxima: toNum(form.qtdMaxima),
        custoAtual: toNum(form.custoAtual),
        precoVenda: toNum(form.precoVenda),
      }
    : {
        qtdAtual: peca.qtdAtual,
        qtdMinima: peca.qtdMinima,
        qtdMaxima: peca.qtdMaxima,
        custoAtual: peca.custoAtual,
        precoVenda: peca.precoVenda,
      }

  const nv = nivel(view.qtdAtual, view.qtdMinima)
  const lucro = pctLucro(view.custoAtual, view.precoVenda)
  const margemRS = view.precoVenda - view.custoAtual
  const movs = movsMock(peca)

  const range = Math.max(1, view.qtdMaxima - 0)
  const pctAtual = Math.min(100, Math.max(0, (view.qtdAtual / range) * 100))
  const pctMin   = Math.min(100, Math.max(0, (view.qtdMinima / range) * 100))

  // Validações — só rodam em modo edição (não bloqueiam a visualização).
  const erros = useMemo(() => {
    if (!editando) return {}
    const e = {}
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    if (toNum(form.qtdAtual) < 0) e.qtdAtual = 'Não pode ser negativo'
    if (toNum(form.qtdMinima) < 0) e.qtdMinima = 'Não pode ser negativo'
    if (form.qtdMaxima !== '' && toNum(form.qtdMaxima) < toNum(form.qtdMinima))
      e.qtdMaxima = 'Menor que mínimo'
    if (toNum(form.precoVenda) < 0) e.precoVenda = 'Não pode ser negativo'
    if (mostraValores && toNum(form.custoAtual) < 0) e.custoAtual = 'Não pode ser negativo'
    return e
  }, [editando, form, mostraValores])

  const podeSalvar = editando && Object.keys(erros).length === 0

  function entrarEdicao() {
    setForm({
      nome: peca.nome || '',
      sku: peca.sku || '',
      fornecedor: peca.fornecedor || '',
      qtdAtual: String(peca.qtdAtual ?? 0),
      qtdMinima: String(peca.qtdMinima ?? 0),
      qtdMaxima: String(peca.qtdMaxima ?? 0),
      custoAtual: String(peca.custoAtual ?? 0),
      precoVenda: String(peca.precoVenda ?? 0),
    })
    setEditando(true)
  }

  function cancelarEdicao() {
    setEditando(false)
  }

  async function salvar() {
    if (!podeSalvar) {
      notify('erro', 'Confira os campos destacados')
      return
    }
    const patch = diffPatch(form, peca, mostraValores)
    if (Object.keys(patch).length === 0) {
      notify('info', 'Nada para salvar')
      setEditando(false)
      return
    }
    if (!onSalvar) {
      notify('erro', 'Salvar não conectado')
      return
    }
    setSalvando(true)
    try {
      const res = await onSalvar(patch)
      if (res && res.error) {
        notify('erro', 'Erro ao salvar: ' + (res.error.message || res.error))
        setSalvando(false)
        return
      }
      notify('ok', 'Peça atualizada')
      setEditando(false)
    } catch (e) {
      notify('erro', 'Erro ao salvar: ' + (e?.message || e))
    } finally {
      setSalvando(false)
    }
  }

  // TODO(baixa-automatica): quando a OS for concluída, decrementar qtd_atual
  // das peças usadas (itens da OS com tipo=item) e registrar movimentação no
  // histórico real. Depende de hook/trigger no terminal OS — ver
  // PENDENCIAS-ROTAS.md e contexto-os.md.

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  return (
    <Modal T={T} dark={dark} onClose={editando ? undefined : onClose} mobile={mobile} maxWidth={620}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: cor('#0d2035', '#e6f1fb'),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: `linear-gradient(135deg, ${azul}, ${cor('#3a7bbf', '#2860a0')})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${azul}33`,
          }} aria-hidden="true">
            <i className="ti ti-puzzle" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editando ? (
              <Input T={T} dark={dark} size="sm"
                value={form.nome} onChange={set('nome')}
                placeholder="Nome da peça"
                style={erros.nome ? { borderColor: vermelho } : undefined}
              />
            ) : (
              <div style={{
                fontSize: 16, fontWeight: 700, color: corHero(dark),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{peca.nome}</div>
            )}
            <div style={{
              fontSize: 11, color: T.textMuted, marginTop: 3,
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <i className="ti ti-barcode" style={{ fontSize: 12 }} aria-hidden="true" />
              <span>{peca.sku || '—'}</span>
              <span style={{ width: 3, height: 3, background: T.textMuted, borderRadius: '50%' }} />
              <span>{peca.fornecedor || '—'}</span>
            </div>
          </div>
        </div>
        {!editando && (
          <Badge variant={nv.variant} dark={dark} sm>
            <i className={`ti ${nv.icon}`} aria-hidden="true" /> {nv.label}
          </Badge>
        )}
        <button onClick={editando ? cancelarEdicao : onClose} aria-label="Fechar"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.textMuted, padding: 6, borderRadius: 6, flexShrink: 0,
          }}>
          <i className="ti ti-x" style={{ fontSize: 22 }} aria-hidden="true" />
        </button>
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

        {/* Identificação extra — só em edição (SKU + fornecedor editáveis) */}
        {editando && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <i className="ti ti-id" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
                <span style={sectionLabel}>Identificação</span>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10,
              }}>
                <CampoEdit label="SKU" T={T} dark={dark}>
                  <Input T={T} dark={dark} size="sm"
                    value={form.sku} onChange={set('sku')}
                    placeholder="0" />
                </CampoEdit>
                <CampoEdit label="Fornecedor" T={T} dark={dark}>
                  <Input T={T} dark={dark} size="sm"
                    value={form.fornecedor} onChange={set('fornecedor')}
                    placeholder="—" />
                </CampoEdit>
              </div>
            </div>
            <div style={{ height: 1, background: T.border, margin: '16px 0' }} />
          </>
        )}

        {/* Estoque */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-stack-2" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Estoque</span>
          </div>

          {editando ? (
            <div style={{
              display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 10,
            }}>
              <CampoEdit label="Atual" T={T} dark={dark} erro={erros.qtdAtual}>
                <Input T={T} dark={dark} size="sm" type="number" inputMode="numeric"
                  value={form.qtdAtual} onChange={set('qtdAtual')}
                  style={erros.qtdAtual ? { borderColor: vermelho } : undefined}
                />
              </CampoEdit>
              <CampoEdit label="Mínimo" T={T} dark={dark} erro={erros.qtdMinima}>
                <Input T={T} dark={dark} size="sm" type="number" inputMode="numeric"
                  value={form.qtdMinima} onChange={set('qtdMinima')}
                  style={erros.qtdMinima ? { borderColor: vermelho } : undefined}
                />
              </CampoEdit>
              <CampoEdit label="Máximo" T={T} dark={dark} erro={erros.qtdMaxima}>
                <Input T={T} dark={dark} size="sm" type="number" inputMode="numeric"
                  value={form.qtdMaxima} onChange={set('qtdMaxima')}
                  style={erros.qtdMaxima ? { borderColor: vermelho } : undefined}
                />
              </CampoEdit>
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center',
              padding: '12px 14px',
              background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
            }}>
              {/* Qtd grande */}
              <div style={{ textAlign: 'center', minWidth: 92 }}>
                <div style={{
                  fontSize: 32, fontWeight: 800,
                  color: nv.variant === 'vermelho' ? vermelho
                       : nv.variant === 'amarelo'  ? amarelo
                       : corHero(dark),
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                }}>{view.qtdAtual}</div>
                <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  em estoque
                </div>
              </div>

              {/* Barra mín/atual/máx */}
              <div>
                <div style={{
                  position: 'relative', height: 10,
                  background: cor('#1a1a1d', '#eaeaee'),
                  borderRadius: 6, overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pctAtual}%`,
                    background: nv.variant === 'vermelho' ? vermelho
                              : nv.variant === 'amarelo'  ? amarelo
                              : verde,
                    transition: 'width .25s',
                  }} />
                  <div title={`Mínimo: ${view.qtdMinima}`} style={{
                    position: 'absolute', top: -2, bottom: -2,
                    left: `calc(${pctMin}% - 1px)`,
                    width: 2, background: amarelo,
                    borderRadius: 1,
                  }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 10.5, color: T.textMuted, marginTop: 6,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <span>0</span>
                  <span><i className="ti ti-flag" style={{ fontSize: 11, color: amarelo, marginRight: 3 }} aria-hidden="true" />mín {view.qtdMinima}</span>
                  <span>máx {view.qtdMaxima}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Especificação técnica — só leitura (edição completa em outro chat) */}
        {!editando && (
          <EspecTecnica T={T} dark={dark} peca={peca} sectionLabel={sectionLabel} />
        )}

        {/* Preço de venda — funcionário vê só venda; dono vê custo + margem */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-cash" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>{mostraValores ? 'Custos & preço' : 'Preço de venda'}</span>
          </div>

          {editando ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: mostraValores ? (mobile ? '1fr' : 'repeat(3, 1fr)') : '1fr',
              gap: 10,
            }}>
              {mostraValores && (
                <CampoEdit label="Custo atual (R$)" T={T} dark={dark} erro={erros.custoAtual}>
                  <Input T={T} dark={dark} size="sm" inputMode="decimal"
                    value={form.custoAtual} onChange={set('custoAtual')}
                    style={erros.custoAtual ? { borderColor: vermelho } : undefined}
                  />
                </CampoEdit>
              )}
              <CampoEdit label="Preço venda (R$)" T={T} dark={dark} erro={erros.precoVenda}>
                <Input T={T} dark={dark} size="sm" inputMode="decimal"
                  value={form.precoVenda} onChange={set('precoVenda')}
                  style={erros.precoVenda ? { borderColor: vermelho } : undefined}
                />
              </CampoEdit>
              {mostraValores && (
                <div style={{
                  padding: '8px 12px',
                  background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 9,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <div style={{
                    fontSize: 10, color: T.textMuted, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3,
                  }}>Margem</div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: azul,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {lucro}% · {fmtBRL(margemRS)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: mostraValores ? (mobile ? '1fr' : 'repeat(3, 1fr)') : '1fr',
              gap: 10,
            }}>
              {mostraValores && (
                <BlocoValor T={T} label="Custo atual" valor={fmtBRL(view.custoAtual)}
                  corValor={T.textSecondary} dark={dark} />
              )}
              <BlocoValor T={T} label="Preço venda" valor={fmtBRL(view.precoVenda)}
                corValor={corHero(dark)} dark={dark} destaque />
              {mostraValores && (
                <BlocoValor T={T} label="Margem"
                  valor={`${lucro}% · ${fmtBRL(margemRS)}`}
                  corValor={azul} dark={dark} />
              )}
            </div>
          )}
        </div>

        {/* Movimentações — escondidas em modo edição pra não distrair */}
        {!editando && (
          <>
            <div style={{ height: 1, background: T.border, margin: '16px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <i className="ti ti-history" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
                <span style={sectionLabel}>Movimentações</span>
                <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  últimas {movs.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {movs.map(m => {
                  const t = TIPOS_MOV[m.tipo]
                  const corDelta = m.delta > 0 ? verde : m.delta < 0 ? amarelo : T.textMuted
                  return (
                    <div key={m.id} style={{
                      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center',
                      padding: '10px 12px',
                      background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8,
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: corEtapa(t.cor === 'neutro' ? 'blue' : t.cor, dark) + '22',
                        color: corEtapa(t.cor === 'neutro' ? 'blue' : t.cor, dark),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15,
                      }} aria-hidden="true">
                        <i className={`ti ${t.icon}`} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>
                            {t.label}
                          </span>
                          <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                            · {m.data.slice(0, 10).split('-').reverse().join('/')}
                          </span>
                          <span style={{ fontSize: 11, color: T.textMuted }}>
                            · {m.responsavel}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 11, color: T.textMuted, marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.obs}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: corDelta,
                        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                      }}>
                        {m.delta > 0 ? '+' : ''}{m.delta}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', gap: 8,
        background: T.cardAlt, flexShrink: 0, flexWrap: 'wrap',
      }}>
        {editando ? (
          <>
            <Button T={T} dark={dark} variant="ghost"
              onClick={cancelarEdicao} disabled={salvando}>
              Cancelar
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" iconLeft={salvando ? 'ti-loader-2 ti-spin' : 'ti-check'}
                onClick={salvar} disabled={!podeSalvar || salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button T={T} dark={dark} variant="ghost" iconLeft="ti-pencil"
              onClick={entrarEdicao}>
              Editar peça
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button T={T} dark={dark} variant="secondary" onClick={onClose}>Fechar</Button>
              <Button variant="primary" iconLeft="ti-arrows-up-down"
                onClick={() => notify('info', 'Ajuste manual de estoque — próximo chat')}>
                Ajustar estoque
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Campo de edição com label + erro inline ───────────────────────────────
function CampoEdit({ T, dark, label, erro, children }) {
  const vermelho = corEtapa('red', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>{label}</span>
      {children}
      {erro && (
        <span style={{ fontSize: 10.5, color: vermelho, marginTop: 2 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
          {erro}
        </span>
      )}
    </div>
  )
}

// ─── Especificação técnica (marca, tipo, ref, modelo, modelos compativeis) ──
function EspecTecnica({ T, dark, peca, sectionLabel }) {
  const azul = corEtapa('blue', dark)
  const campos = [
    { label: 'Marca',      icon: 'ti-building-factory',  valor: peca.marca },
    { label: 'Tipo',       icon: 'ti-shape',             valor: peca.tipo },
    { label: 'Referência', icon: 'ti-hash',              valor: peca.referencia },
    { label: 'Modelo',     icon: 'ti-cpu',               valor: peca.modelo },
  ].filter(c => c.valor && String(c.valor).trim())

  const compatList = Array.isArray(peca.modelosCompativeis)
    ? peca.modelosCompativeis.filter(Boolean)
    : (peca.modelosCompativeis || '')
        .split(/[,/\n;]/)
        .map(s => s.trim())
        .filter(Boolean)

  if (campos.length === 0 && compatList.length === 0) return null

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <i className="ti ti-settings" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
          <span style={sectionLabel}>Especificação técnica</span>
        </div>

        {campos.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
            marginBottom: compatList.length > 0 ? 10 : 0,
          }}>
            {campos.map(c => (
              <div key={c.label} style={{
                padding: '10px 12px',
                background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 9,
                minWidth: 0,
              }}>
                <div style={{
                  fontSize: 10, color: T.textMuted, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  marginBottom: 3,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
                  {c.label}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: T.textPrimary,
                  fontVariantNumeric: 'tabular-nums',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={c.valor}>
                  {c.valor}
                </div>
              </div>
            ))}
          </div>
        )}

        {compatList.length > 0 && (
          <div style={{
            padding: '10px 12px',
            background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 9,
          }}>
            <div style={{
              fontSize: 10, color: T.textMuted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <i className="ti ti-device-washing-machine" style={{ fontSize: 12 }} aria-hidden="true" />
              Modelos compatíveis
              <span style={{ marginLeft: 'auto', color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
                {compatList.length}
              </span>
            </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 5,
            }}>
              {compatList.map((m, i) => (
                <span key={i} style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 10,
                  background: azul + '22', color: azul,
                  border: `1px solid ${azul}44`,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}>{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ height: 1, background: T.border, margin: '16px 0' }} />
    </>
  )
}

// ─── Bloco de valor (label uppercase + número grande) ──────────────────────
function BlocoValor({ T, label, valor, corValor, destaque }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: T.cardAlt, border: `1px solid ${T.border}`,
      borderRadius: 9,
    }}>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontSize: destaque ? 16 : 14,
        fontWeight: destaque ? 800 : 700,
        color: corValor,
        fontVariantNumeric: 'tabular-nums',
      }}>{valor}</div>
    </div>
  )
}
