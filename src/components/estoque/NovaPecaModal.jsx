// idemaq-src/components/estoque/NovaPecaModal.jsx
// Formulário de cadastro de nova peça (Módulo 06 chat 1).
// Visual MVP — salva via callback onSalvar. Quando Supabase entrar, basta
// trocar o handler em Estoque.jsx pra fazer o INSERT em `peca`.

import React, { useState, useMemo } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, ModalHeader, Button, Input, Select, useToast } from '../ui'
import { CATEGORIAS_PECA, GRUPOS_CATEGORIA } from '../../utils/categoriasPeca'

const VAZIO = {
  nome: '',
  sku: '',
  categoria: '',
  fornecedor: '',
  marca: '',
  tipo: '',
  referencia: '',
  modelo: '',
  modelosCompativeis: '',
  qtdAtual: '',
  qtdMinima: '',
  favorito: false,
  qtdMaxima: '',
  custoAtual: '',
  precoVenda: '',
}

// Opções do select agrupadas por grupo (renderizadas como <optgroup>)
const OPCOES_CATEGORIA_AGRUPADAS = Object.entries(GRUPOS_CATEGORIA).map(([gid, g]) => ({
  grupo: g.label,
  opcoes: CATEGORIAS_PECA.filter(c => c.grupo === gid).map(c => ({ value: c.id, label: c.label })),
}))

function toNum(v) {
  if (v === '' || v === null || v === undefined) return 0
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function NovaPecaModal({ T, dark, onClose, onSalvar }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const [form, setForm] = useState(VAZIO)
  const set = (campo) => (v) => setForm(f => ({ ...f, [campo]: v }))

  const custo = toNum(form.custoAtual)
  const venda = toNum(form.precoVenda)
  const margemRS = venda - custo
  const margemPct = custo > 0 ? Math.round((margemRS / custo) * 100) : 0
  const margemValida = custo > 0 && venda > 0

  const erros = useMemo(() => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    // SKU e quantidades são opcionais — quando vazias, default 0 / auto na hora de salvar
    if (!form.categoria) e.categoria = 'Selecione uma categoria'
    if (!form.fornecedor.trim()) e.fornecedor = 'Obrigatório'
    if (form.qtdAtual !== '' && toNum(form.qtdAtual) < 0) e.qtdAtual = 'Inválido'
    if (form.qtdMinima !== '' && toNum(form.qtdMinima) < 0) e.qtdMinima = 'Inválido'
    if (form.qtdMaxima !== '' && form.qtdMinima !== '' && toNum(form.qtdMaxima) < toNum(form.qtdMinima)) e.qtdMaxima = 'Menor que mínimo'
    if (toNum(form.custoAtual) <= 0) e.custoAtual = 'Obrigatório'
    if (toNum(form.precoVenda) <= 0) e.precoVenda = 'Obrigatório'
    if (margemValida && venda < custo) e.precoVenda = 'Venda < custo'
    return e
  }, [form, custo, venda, margemValida])

  const podeSalvar = Object.keys(erros).length === 0
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!podeSalvar) {
      notify('erro', 'Confira os campos destacados')
      return
    }
    const nova = {
      nome: form.nome.trim(),
      sku: form.sku.trim(),
      categoria: form.categoria,
      fornecedor: form.fornecedor.trim(),
      marca: form.marca.trim(),
      tipo: form.tipo.trim(),
      referencia: form.referencia.trim(),
      modelo: form.modelo.trim(),
      // `modelos_compativeis` é text[] no banco — convertemos o input livre
      // (separado por vírgula, barra, ponto-e-vírgula ou quebra de linha) num array
      modelosCompativeis: form.modelosCompativeis
        .split(/[,/\n;]/)
        .map(s => s.trim())
        .filter(Boolean),
      qtdAtual: toNum(form.qtdAtual),
      qtdMinima: toNum(form.qtdMinima),
      qtdMaxima: form.qtdMaxima === '' ? toNum(form.qtdMinima) * 3 : toNum(form.qtdMaxima),
      custoAtual: custo,
      precoVenda: venda,
      favorito: !!form.favorito,
    }
    setSalvando(true)
    try {
      const res = await onSalvar?.(nova)
      // Se o callback retornar { error }, mantém o modal aberto
      if (res && res.error) {
        notify('erro', 'Erro ao salvar: ' + (res.error.message || res.error))
        setSalvando(false)
        return
      }
      notify('ok', `Peça "${nova.nome}" cadastrada`)
      onClose?.()
    } catch (e) {
      notify('erro', 'Erro ao salvar: ' + (e?.message || e))
      setSalvando(false)
    }
  }

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  return (
    <Modal T={T} dark={dark} onClose={onClose} maxWidth={560}>
      <ModalHeader T={T} title="Cadastro de Peças" subtitle="Cadastro manual"
        icon="ti-puzzle" onClose={onClose} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

        {/* Identificação */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-tag" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Identificação</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <CampoErro erro={erros.nome} dark={dark}>
              <Input T={T} dark={dark} label="Nome do item" required
                value={form.nome} onChange={set('nome')}
                placeholder="Ex: Capa Brastemp 12kg"
              />
            </CampoErro>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <CampoErro erro={erros.sku} dark={dark}>
                <Input T={T} dark={dark} label="SKU / Código"
                  value={form.sku} onChange={set('sku')}
                  placeholder="Ex: CAP-BRA-12 (opcional)"
                  icon="ti-barcode"
                />
              </CampoErro>
              <CampoErro erro={erros.fornecedor} dark={dark}>
                <Input T={T} dark={dark} label="Fornecedor" required
                  value={form.fornecedor} onChange={set('fornecedor')}
                  placeholder="Ex: Atacado MS"
                  icon="ti-truck"
                />
              </CampoErro>
            </div>

            {/* Categoria — agrupada por grupo (motor, água, elétrico, estrutura, externo, outros) */}
            <CampoErro erro={erros.categoria} dark={dark}>
              <label style={{ display: 'block', fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 4 }}>
                Categoria <span style={{ color: corEtapa('red', dark) }}>*</span>
              </label>
              <select
                value={form.categoria}
                onChange={(e) => set('categoria')(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px',
                  background: T.bg, color: T.textPrimary,
                  border: `1px solid ${erros.categoria ? corEtapa('red', dark) : T.border}`,
                  borderRadius: 7, fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', colorScheme: dark ? 'dark' : 'light',
                }}
              >
                <option value="">— Selecione —</option>
                {OPCOES_CATEGORIA_AGRUPADAS.map(g => (
                  <optgroup key={g.grupo} label={g.grupo}>
                    {g.opcoes.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 4 }}>
                A categoria espelha o checklist do diagnóstico — assim o técnico encontra
                peças do tipo certo (válvula, eletrobomba, trava da porta, etc.).
              </div>
            </CampoErro>
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '14px 0' }} />

        {/* Especificação técnica — opcional, mas casa com o padrão do catálogo BCM
            (marca + tipo + referência + modelo + modelos compatíveis). Ajuda o
            técnico a achar a peça certa pelo código do fabricante. */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-settings" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Especificação técnica</span>
            <span style={{ fontSize: 10.5, color: T.textDim }}>(opcional)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Input T={T} dark={dark} label="Marca"
                value={form.marca} onChange={set('marca')}
                placeholder="Ex: Brastemp, Consul, Electrolux…"
                icon="ti-building-factory"
              />
              <Input T={T} dark={dark} label="Tipo"
                value={form.tipo} onChange={set('tipo')}
                placeholder="Ex: Agitador, Capacitor…"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Input T={T} dark={dark} label="Referência"
                value={form.referencia} onChange={set('referencia')}
                placeholder="Ex: W10754807"
                icon="ti-hash"
              />
              <Input T={T} dark={dark} label="Modelo"
                value={form.modelo} onChange={set('modelo')}
                placeholder="Ex: 67493623"
              />
            </div>
            <Input T={T} dark={dark} label="Modelos compatíveis"
              value={form.modelosCompativeis} onChange={set('modelosCompativeis')}
              placeholder="Ex: BWC10BB, BWG10A, CWE13AB"
              icon="ti-device-washing-machine"
            />

            {/* Preview dos chips — atualiza enquanto o usuário digita,
                pra deixar claro que cada item separado por vírgula vira um chip */}
            {(() => {
              const lista = form.modelosCompativeis
                .split(/[,/\n;]/)
                .map(s => s.trim())
                .filter(Boolean)
              if (lista.length === 0) return null
              return (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 5,
                  marginTop: -4,
                }}>
                  {lista.map((m, i) => (
                    <span key={i} style={{
                      fontSize: 10.5, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 10,
                      background: azul + '22', color: azul,
                      border: `1px solid ${azul}44`,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{m}</span>
                  ))}
                </div>
              )
            })()}

            <div style={{ fontSize: 10.5, color: T.textDim }}>
              Lista de modelos de máquina que aceitam essa peça — separar por vírgula.
              Usada na busca quando o técnico digita o código que está na máquina do cliente.
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '14px 0' }} />

        {/* Estoque */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-stack-2" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Estoque</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <CampoErro erro={erros.qtdAtual} dark={dark}>
              <Input T={T} dark={dark} label="Qtd. atual"
                type="number" min="0" step="1"
                value={form.qtdAtual} onChange={set('qtdAtual')}
                placeholder="0"
              />
            </CampoErro>
            <CampoErro erro={erros.qtdMinima} dark={dark}>
              <Input T={T} dark={dark} label="Mínimo"
                type="number" min="0" step="1"
                value={form.qtdMinima} onChange={set('qtdMinima')}
                placeholder="0"
              />
            </CampoErro>
            <CampoErro erro={erros.qtdMaxima} dark={dark}>
              <Input T={T} dark={dark} label="Máximo"
                type="number" min="0" step="1"
                value={form.qtdMaxima} onChange={set('qtdMaxima')}
                placeholder="auto"
              />
            </CampoErro>
          </div>
          <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 6 }}>
            Campos opcionais — quando preenchidos, o item aparece com alerta no estoque ao cair até o mínimo.
          </div>
        </div>

        <div style={{ height: 1, background: T.border, margin: '14px 0' }} />

        {/* Custos & preço */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-cash" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            <span style={sectionLabel}>Custos & preço</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <CampoErro erro={erros.custoAtual} dark={dark}>
              <Input T={T} dark={dark} label="Custo (R$)" required
                type="number" min="0" step="0.01"
                value={form.custoAtual} onChange={set('custoAtual')}
                placeholder="0,00"
                icon="ti-tag"
              />
            </CampoErro>
            <CampoErro erro={erros.precoVenda} dark={dark}>
              <Input T={T} dark={dark} label="Preço de venda (R$)" required
                type="number" min="0" step="0.01"
                value={form.precoVenda} onChange={set('precoVenda')}
                placeholder="0,00"
                icon="ti-currency-real"
              />
            </CampoErro>
          </div>

          {/* Preview da margem */}
          <div style={{
            marginTop: 10,
            padding: '10px 12px',
            background: T.cardAlt,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{
              fontSize: 11, color: T.textMuted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '.04em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ti ti-chart-line" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
              Margem prevista
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: margemValida ? (venda >= custo ? azul : vermelho) : T.textDim,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {margemValida
                ? `${margemPct}% · ${fmtBRL(margemRS)}`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        background: T.cardAlt, flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, favorito: !f.favorito }))}
          disabled={salvando}
          title={form.favorito ? 'Remover dos favoritos' : 'Marcar como favorito (aparece primeiro nos seletores)'}
          style={{
            marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
            border: `1px solid ${form.favorito ? '#f59e0b' : T.border}`,
            background: form.favorito ? '#fef3c7' : 'transparent',
            color: form.favorito ? '#92400e' : T.text,
            fontWeight: form.favorito ? 600 : 400,
          }}>
          <i className={form.favorito ? 'ti ti-star-filled' : 'ti ti-star'} style={{ color: form.favorito ? '#f59e0b' : 'inherit' }} />
          {form.favorito ? 'Favorita' : 'Favoritar'}
        </button>
        <Button T={T} dark={dark} variant="secondary" onClick={onClose} disabled={salvando}>
          Cancelar
        </Button>
        <Button variant="primary" iconLeft={salvando ? 'ti-loader-2 ti-spin' : 'ti-check'}
          onClick={salvar}
          disabled={!podeSalvar || salvando}>
          {salvando ? 'Salvando…' : 'Salvar peça'}
        </Button>
      </div>
    </Modal>
  )
}

// Wrapper que mostra mensagem de erro abaixo do campo
function CampoErro({ erro, dark, children }) {
  const vermelho = corEtapa('red', dark)
  return (
    <div>
      {children}
      {erro && (
        <div style={{
          fontSize: 10.5, color: vermelho, marginTop: 4,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 12 }} aria-hidden="true" />
          {erro}
        </div>
      )}
    </div>
  )
}
