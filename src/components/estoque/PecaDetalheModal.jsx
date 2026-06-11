// idemaq-src/components/estoque/PecaDetalheModal.jsx
// Detalhe de uma peça — ficha visual + histórico real + modo edição inline.
// Botão "Editar peça" alterna entre leitura e formulário; "Salvar" persiste
// via callback onSalvar (chama usePecas.atualizar em Estoque.jsx).
//
// Visibilidade: quando mostraValores=false (funcionário), custo/lucro ficam
// ocultos e não editáveis. O patch enviado não inclui campos financeiros.
//
// Histórico real: SELECT em peca_movimentacao (sql/11) — se a tabela ainda
// não existir (42P01/PGRST205), mostra empty state suave em vez de quebrar.

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, Button, Badge, Input, useToast } from '../ui'
import AjusteEstoqueModal from './AjusteEstoqueModal'

// ─── Tipos de movimentação (espelha CHECK em peca_movimentacao.tipo) ───────
const TIPOS_MOV = {
  ajuste_manual:   { label: 'Ajuste manual',     icon: 'ti-adjustments-alt', cor: 'neutro' },
  baixa_os:        { label: 'Baixa em OS',       icon: 'ti-arrow-down-right', cor: 'yellow' },
  entrada_compra:  { label: 'Entrada por compra', icon: 'ti-package-import', cor: 'green'  },
  devolucao:       { label: 'Devolução',         icon: 'ti-arrow-back-up',   cor: 'blue'   },
}

// Sub-motivo do tipo='ajuste_manual' → label legível.
const MOTIVO_LABEL = {
  contagem:  'contagem',
  perda:     'perda',
  ganho:     'ganho',
  devolucao: 'devolução',
  outro:     'outro',
}

// Formata criado_em (ISO/timestamptz) → "dd/mm/aa".
function fmtData(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

// Hook local — busca últimas 20 movimentações da peça.
// Detecta tabela inexistente (42P01) e sinaliza `schemaPendente` sem quebrar.
function useHistoricoPeca(pecaId) {
  const [movs, setMovs] = useState([])
  const [loading, setLoading] = useState(true)
  const [schemaPendente, setSchemaPendente] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!pecaId) { setMovs([]); setLoading(false); return }
    let alive = true
    setLoading(true)
    setSchemaPendente(false)
    setErro(null)

    supabase
      .from('peca_movimentacao')
      .select('id, tipo, delta, qtd_antes, qtd_depois, motivo, observacao, os_id, criado_em')
      .eq('peca_id', pecaId)
      .is('deleted_at', null)
      .order('criado_em', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (!alive) return
        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204') {
            setSchemaPendente(true)
          } else {
            setErro(error.message || String(error))
          }
          setMovs([])
          setLoading(false)
          return
        }
        setMovs(data || [])
        setLoading(false)
      })

    return () => { alive = false }
  }, [pecaId])

  return { movs, loading, schemaPendente, erro }
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
  setIf('favorito', !!form.favorito)
  return out
}

export default function PecaDetalheModal({
  T, dark, peca, onClose, onSalvar, onAjustar, mobile,
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
  const [ajustandoAberto, setAjustandoAberto] = useState(false)

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
    favorito: !!peca.favorito,
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

  // Histórico real — re-fetcha se a peça muda (e quando o ajuste/edição
  // dispara fetchPecas() em Estoque.jsx, este modal já é re-renderizado com
  // a peça atualizada → useEffect rebusca o histórico).
  const { movs, loading: loadingMovs, schemaPendente, erro: errMovs } = useHistoricoPeca(peca.id)

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
      favorito: !!peca.favorito,
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
                {!loadingMovs && !schemaPendente && !errMovs && (
                  <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                    {movs.length === 0
                      ? 'nenhuma ainda'
                      : `últimas ${movs.length}`}
                  </span>
                )}
              </div>

              <Movimentacoes
                T={T} dark={dark}
                movs={movs}
                loading={loadingMovs}
                schemaPendente={schemaPendente}
                erro={errMovs}
              />
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button T={T} dark={dark} variant="ghost"
                onClick={cancelarEdicao} disabled={salvando}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, favorito: !f.favorito }))}
                title={form.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
                disabled={salvando}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, cursor: salvando ? 'not-allowed' : 'pointer',
                  border: `1px solid ${form.favorito ? '#f59e0b' : T.border}`,
                  background: form.favorito ? '#fef3c7' : 'transparent',
                  color: form.favorito ? '#92400e' : T.text,
                  fontWeight: form.favorito ? 600 : 400,
                }}>
                <i className={form.favorito ? 'ti ti-star-filled' : 'ti ti-star'}
                   style={{ color: form.favorito ? '#f59e0b' : 'inherit' }} />
                {form.favorito ? 'Favorita' : 'Favoritar'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" iconLeft={salvando ? 'ti-loader-2 ti-spin' : 'ti-check'}
                onClick={salvar} disabled={!podeSalvar || salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button T={T} dark={dark} variant="ghost" iconLeft="ti-pencil"
                onClick={entrarEdicao}>
                Editar peça
              </Button>
              <button
                type="button"
                onClick={async () => {
                  const novoFav = !peca.favorito
                  setForm(f => ({ ...f, favorito: novoFav }))
                  await onSalvar?.({ favorito: novoFav })
                }}
                title={peca.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${peca.favorito ? '#f59e0b' : T.border}`,
                  background: peca.favorito ? '#fef3c7' : 'transparent',
                  color: peca.favorito ? '#92400e' : T.text,
                  fontWeight: peca.favorito ? 600 : 400,
                }}>
                <i className={peca.favorito ? 'ti ti-star-filled' : 'ti ti-star'}
                   style={{ color: peca.favorito ? '#f59e0b' : 'inherit' }} />
                {peca.favorito ? 'Favorita' : 'Favoritar'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button T={T} dark={dark} variant="secondary" onClick={onClose}>Fechar</Button>
              {/* Ajuste manual só pro dono — funcionário não mexe em estoque
                  fora do fluxo de OS. Defesa em UI; RLS reforça no banco. */}
              {mostraValores && (
                <Button variant="primary" iconLeft="ti-pencil"
                  onClick={() => setAjustandoAberto(true)}>
                  Editar
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {ajustandoAberto && (
        <AjusteEstoqueModal T={T} dark={dark}
          peca={peca}
          mobile={mobile}
          mostraValores={mostraValores}
          onClose={() => setAjustandoAberto(false)}
          onSalvar={async (payload) => {
            if (!onAjustar) {
              notify('erro', 'Ajuste não conectado')
              return { error: new Error('onAjustar não conectado') }
            }
            return onAjustar(payload)
          }}
        />
      )}
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

// ─── Movimentações — lista do histórico real (peca_movimentacao) ───────────
// Estados:
//   loading        → skeleton de 3 linhas
//   schemaPendente → empty state "histórico ainda não habilitado" (sql/11)
//   erro           → empty state com mensagem
//   movs.length=0  → empty state "Sem movimentações"
//   default        → lista com tipo, motivo (se ajuste), data, observação, delta, saldo
function Movimentacoes({ T, dark, movs, loading, schemaPendente, erro }) {
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center',
            padding: '10px 12px',
            background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8,
            opacity: 0.6,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.border }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ height: 10, width: '40%', borderRadius: 4, background: T.border }} />
              <div style={{ height: 9, width: '65%', borderRadius: 4, background: T.border }} />
            </div>
            <div style={{ height: 14, width: 30, borderRadius: 4, background: T.border }} />
          </div>
        ))}
      </div>
    )
  }

  if (schemaPendente) {
    return (
      <div style={{
        padding: '14px 16px',
        background: T.cardAlt, border: `1px dashed ${T.border}`, borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <i className="ti ti-database-off" style={{ fontSize: 18, color: T.textMuted }} aria-hidden="true" />
        <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.4 }}>
          Histórico ainda não habilitado.
          <br />
          <span style={{ fontSize: 10.5 }}>Rode <code style={{ fontFamily: 'inherit', color: azul }}>sql/11-peca-movimentacao.sql</code> no Supabase pra ativar.</span>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div style={{
        padding: '14px 16px',
        background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8,
        fontSize: 11.5, color: T.textMuted,
      }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: amarelo, marginRight: 6 }} aria-hidden="true" />
        Não foi possível carregar o histórico: {erro}
      </div>
    )
  }

  if (movs.length === 0) {
    return (
      <div style={{
        padding: '14px 16px',
        background: T.cardAlt, border: `1px dashed ${T.border}`, borderRadius: 8,
        fontSize: 11.5, color: T.textMuted,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-history" style={{ fontSize: 14 }} aria-hidden="true" />
        Sem movimentações registradas pra essa peça ainda.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {movs.map(m => {
        const t = TIPOS_MOV[m.tipo] || { label: m.tipo, icon: 'ti-dots', cor: 'neutro' }
        const corDelta = m.delta > 0 ? verde : m.delta < 0 ? amarelo : T.textMuted
        const corIcon = corEtapa(t.cor === 'neutro' ? 'blue' : t.cor, dark)

        // Label: "Ajuste manual (perda)" pra ajuste_manual com motivo; só "Ajuste manual" sem motivo.
        const motivoLabel = m.tipo === 'ajuste_manual' && m.motivo
          ? (MOTIVO_LABEL[m.motivo] || m.motivo)
          : null

        // Linha de baixo: observação se houver, senão saldo + delta.
        const obs = m.observacao && String(m.observacao).trim() ? m.observacao : null

        return (
          <div key={m.id} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center',
            padding: '10px 12px',
            background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: corIcon + '22',
              color: corIcon,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
            }} aria-hidden="true">
              <i className={`ti ${t.icon}`} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>
                  {t.label}{motivoLabel ? ` (${motivoLabel})` : ''}
                </span>
                <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  · {fmtData(m.criado_em)}
                </span>
                <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  · saldo {m.qtd_depois}
                </span>
              </div>
              {obs && (
                <div style={{
                  fontSize: 11, color: T.textMuted, marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {obs}
                </div>
              )}
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
