// idemaq-src/components/estoque/AjusteEstoqueModal.jsx
// Ajuste manual de estoque — corrige a qtd_atual da peça sem passar por OS.
// Caso de uso: contagem mensal acha divergência, peça quebrada no manuseio,
// devolução de cliente, sobra encontrada na prateleira, etc.
//
// O modal recebe `peca` (read-only), captura nova quantidade + motivo +
// observação + fornecedor/custo opcionais, mostra preview e chama
// `onSalvar({ qtdNova, motivo, observacao, fornecedor?, custoAtual? })`. Quem persiste é o consumidor
// (Estoque.jsx → usePecas.ajustarEstoque).
//
// Por enquanto só atualiza peca.qtd_atual; o histórico real depende da tabela
// `peca_movimentacao(peca_id, delta, motivo, observacao, criado_em, criado_por)`
// que ainda não existe — quando vier, o hook passa a inserir lá também.

import React, { useMemo, useState } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Modal, ModalHeader, Button, Input, Select, Textarea, useToast } from '../ui'

const MOTIVOS = [
  { value: 'compra',    label: 'Compra',                 icon: 'ti-shopping-cart' },
  { value: 'contagem',  label: 'Contagem de inventário', icon: 'ti-clipboard-list' },
  { value: 'perda',     label: 'Perda / quebra',         icon: 'ti-alert-triangle' },
  { value: 'ganho',     label: 'Sobra encontrada',       icon: 'ti-package' },
  { value: 'devolucao', label: 'Devolução de cliente',   icon: 'ti-arrow-back-up' },
  { value: 'outro',     label: 'Outro',                  icon: 'ti-dots' },
]
const MOTIVO_POR_VALUE = Object.fromEntries(MOTIVOS.map(m => [m.value, m]))

function toInt(v) {
  if (v === '' || v === null || v === undefined) return NaN
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? Math.trunc(n) : NaN
}

export default function AjusteEstoqueModal({ T, dark, peca, onClose, onSalvar, mobile, mostraValores = true }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  const qtdAtual = Number(peca?.qtdAtual ?? 0)

  const [nomeStr, setNomeStr] = useState(peca?.nome || '')
  const [qtdNovaStr, setQtdNovaStr] = useState(String(qtdAtual))
  const [motivo, setMotivo] = useState('contagem')
  const [observacao, setObservacao] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [custoNovoStr, setCustoNovoStr] = useState('')
  const [salvando, setSalvando] = useState(false)

  const qtdNova = toInt(qtdNovaStr)
  const valido = Number.isFinite(qtdNova) && qtdNova >= 0
  const delta = valido ? qtdNova - qtdAtual : 0
  const motivoInfo = MOTIVO_POR_VALUE[motivo] || MOTIVOS[0]

  const erro = useMemo(() => {
    if (qtdNovaStr === '') return 'Informe a nova quantidade'
    if (!Number.isFinite(qtdNova)) return 'Quantidade inválida'
    if (qtdNova < 0) return 'Não pode ser negativo'
    return null
  }, [qtdNova, qtdNovaStr])

  const podeSalvar = !erro && !salvando && delta !== 0

  async function salvar() {
    if (erro) { notify('erro', erro); return }
    if (delta === 0) { notify('info', 'A quantidade não mudou'); return }
    if (!onSalvar) { notify('erro', 'Salvar não conectado'); return }

    setSalvando(true)
    try {
      const custoNovo = custoNovoStr.trim()
        ? Number(custoNovoStr.replace(',', '.'))
        : null
      const nomeAlterado = nomeStr.trim() && nomeStr.trim() !== (peca?.nome || '')
        ? nomeStr.trim()
        : null
      const res = await onSalvar({
        qtdNova,
        motivo,
        observacao: observacao.trim() || null,
        fornecedor: fornecedor.trim() || null,
        custoAtual: (mostraValores && custoNovo !== null && Number.isFinite(custoNovo)) ? custoNovo : null,
        nome: nomeAlterado,
      })
      if (res && res.error) {
        notify('erro', 'Erro ao ajustar: ' + (res.error.message || res.error))
        setSalvando(false)
        return
      }
      notify('ok', `Estoque ajustado: ${qtdAtual} → ${qtdNova}`)
      onClose?.()
    } catch (e) {
      notify('erro', 'Erro ao ajustar: ' + (e?.message || e))
      setSalvando(false)
    }
  }

  // Cor do delta — Deutan-safe (amarelo p/ negativo, azul p/ positivo, ambos
  // com sinal +/− e ícone, então nunca dependem só da cor pra significar).
  const corDelta = delta > 0 ? verde : delta < 0 ? amarelo : T.textMuted
  const iconDelta = delta > 0 ? 'ti-arrow-up-right' : delta < 0 ? 'ti-arrow-down-right' : 'ti-equal'

  const sectionLabel = {
    fontSize: 11, color: T.textMuted, fontWeight: 600,
    letterSpacing: '.4px', textTransform: 'uppercase',
  }

  return (
    <Modal T={T} dark={dark} onClose={salvando ? undefined : onClose} mobile={mobile}
      closeOnOverlay={!salvando} maxWidth={520}>

      <ModalHeader T={T} icon="ti-adjustments-alt"
        title="Ajustar estoque"
        subtitle={peca?.nome || '—'}
        onClose={salvando ? undefined : onClose}
      />

      {/* Corpo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Quantidade atual (read-only) */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center',
          padding: '12px 14px', marginBottom: 14,
          background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
        }}>
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{
              fontSize: 28, fontWeight: 800,
              color: corHero(dark),
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>{qtdAtual}</div>
            <div style={{
              fontSize: 10, color: T.textMuted, marginTop: 4,
              textTransform: 'uppercase', letterSpacing: '.04em',
            }}>
              qtd atual
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3 }}>
              <i className="ti ti-puzzle" style={{ fontSize: 12, marginRight: 4 }} aria-hidden="true" />
              {peca?.sku || '—'} · {peca?.fornecedor || '—'}
            </div>
            <div style={{
              fontSize: 12, color: T.textSecondary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              Mín {peca?.qtdMinima ?? 0} · Máx {peca?.qtdMaxima ?? 0}
            </div>
          </div>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ ...sectionLabel, marginBottom: 6 }}>Nome da peça</div>
            <Input T={T} dark={dark}
              value={nomeStr}
              onChange={setNomeStr}
              icon="ti-puzzle"
              placeholder="Nome da peça"
            />
          </div>

          <div>
            <div style={{ ...sectionLabel, marginBottom: 6 }}>Nova quantidade</div>
            <Input T={T} dark={dark}
              type="number" inputMode="numeric"
              value={qtdNovaStr}
              onChange={setQtdNovaStr}
              icon="ti-stack-2"
              placeholder="0"
              style={erro ? { borderColor: vermelho } : undefined}
            />
            {erro && (
              <div style={{ fontSize: 10.5, color: vermelho, marginTop: 4 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
                {erro}
              </div>
            )}
          </div>

          <div>
            <div style={{ ...sectionLabel, marginBottom: 6 }}>Motivo</div>
            <Select T={T} dark={dark}
              value={motivo}
              onChange={setMotivo}
              options={MOTIVOS.map(m => ({ value: m.value, label: m.label }))}
            />
          </div>

          <div>
            <div style={{ ...sectionLabel, marginBottom: 6 }}>Observação (opcional)</div>
            <Textarea T={T} dark={dark}
              value={observacao}
              onChange={setObservacao}
              placeholder="Detalhe do ajuste (ex: NF 1820, queda no manuseio, sobra no estoque…)"
              rows={3}
            />
          </div>

          {/* Fornecedor e custo — opcionais, mantém atuais se em branco */}
          <div style={{ height: 1, background: T.border }} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: (mostraValores && !mobile) ? '1fr 1fr' : '1fr',
            gap: 10,
          }}>
            <div>
              <div style={{ ...sectionLabel, marginBottom: 6 }}>
                Fornecedor
                <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: T.textMuted }}>
                  (opcional)
                </span>
              </div>
              <Input T={T} dark={dark}
                value={fornecedor}
                onChange={setFornecedor}
                icon="ti-building-store"
                placeholder={peca?.fornecedor || 'Manter atual'}
              />
            </div>
            {mostraValores && (
              <div>
                <div style={{ ...sectionLabel, marginBottom: 6 }}>
                  Custo (R$)
                  <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: T.textMuted }}>
                    (opcional)
                  </span>
                </div>
                <Input T={T} dark={dark}
                  type="number" inputMode="decimal"
                  value={custoNovoStr}
                  onChange={setCustoNovoStr}
                  icon="ti-currency-dollar"
                  placeholder={peca?.custoAtual != null ? fmtBRL(peca.custoAtual) : 'Manter atual'}
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview do delta */}
        <div style={{
          marginTop: 14, padding: '12px 14px',
          background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 700,
            color: corHero(dark),
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span>{qtdAtual}</span>
            <i className="ti ti-arrow-right" style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
            <span style={{ color: erro ? T.textMuted : corHero(dark) }}>
              {erro ? '—' : qtdNova}
            </span>
          </div>

          <div style={{ width: 1, height: 18, background: T.border }} />

          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 13, fontWeight: 700, color: corDelta,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <i className={`ti ${iconDelta}`} style={{ fontSize: 14 }} aria-hidden="true" />
            <span>{erro ? '—' : `${delta > 0 ? '+' : ''}${delta}`}</span>
          </div>

          <span style={{
            marginLeft: 'auto',
            fontSize: 11, fontWeight: 600,
            color: azul,
            padding: '3px 8px', borderRadius: 10,
            background: azul + '22', border: `1px solid ${azul}44`,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            whiteSpace: 'nowrap',
          }}>
            <i className={`ti ${motivoInfo.icon}`} style={{ fontSize: 11 }} aria-hidden="true" />
            {motivoInfo.label}
          </span>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        background: T.cardAlt, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <Button T={T} dark={dark} variant="ghost"
          onClick={onClose} disabled={salvando}>
          Cancelar
        </Button>
        <Button variant="primary"
          iconLeft={salvando ? 'ti-loader-2 ti-spin' : 'ti-check'}
          onClick={salvar}
          disabled={!podeSalvar}>
          {salvando ? 'Salvando…' : 'Salvar ajuste'}
        </Button>
      </div>
    </Modal>
  )
}

// TODO(peca_movimentacao): quando a tabela existir, o hook passa a fazer
// INSERT(peca_id, delta, motivo, observacao, criado_em, criado_por) em
// adição ao UPDATE da peca, e o histórico real substitui o mock do
// PecaDetalheModal. Schema proposto:
//   create table peca_movimentacao (
//     id uuid primary key default gen_random_uuid(),
//     peca_id uuid not null references peca(id),
//     delta int not null,                              -- ±N (assinado)
//     motivo text not null,                            -- 'contagem'|'perda'|'ganho'|'devolucao'|'outro'|'baixa_os'|'entrada_nf'…
//     observacao text,
//     os_id uuid references os(id),                   -- preenchido quando vier de OS
//     criado_em timestamptz not null default now(),
//     criado_por uuid references auth.users(id)
//   )
