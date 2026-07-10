// src/pages/MeuContador.jsx
// Página "Meu Contador" — central fiscal/contábil da empresa (Atlassian Design).
//
// Reúne tudo que o Toni e o contador precisam num lugar só:
//   1. Cartão do contador (contato editável) + botões ligar/WhatsApp/email
//   2. Dados fiscais da empresa (razão social, CNPJ, regime, CNAE...)
//   3. Faturamento acumulado 12 meses (RBT12) vs limite do regime — dado REAL
//   4. Calendário de obrigações fiscais (DAS/FGTS/DEFIS...) com "marcar pago"
//   5. Checklist mensal de documentos pra enviar ao contador
//   6. Exportar: resumo do mês (copiar) + CSV dos lançamentos
//   7. Links úteis (Portal do Empreendedor, Simples Nacional, NFS-e...)
//
// Persistência: tabela `configuracoes` (chave/valor JSONB) via useConfiguracoes.
//   - contador               → dados de contato
//   - empresa_fiscal         → dados cadastrais/fiscais
//   - fiscal_pago_<YYYY-MM>   → { [obrigacaoId]: true } status por competência
//   - docs_contador_<YYYY-MM> → { [docId]: true } checklist por mês
//
// Admin-only (rota envolvida em <AdminOnly> no App.jsx).

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useIsMobile } from '../theme'
import { fmtBRL, fmtPrazoCurto } from '../utils/fmt'
import { corEtapa } from '../utils/colors'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { useToast } from '../components/ui/Toast'

const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const ATL_RADIUS = 4

// ─── Regimes tributários + limites anuais de faturamento ────────────────────
const REGIMES = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']
const LIMITE_ANUAL = {
  'MEI': 81000,
  'Simples Nacional': 4800000,
  'Lucro Presumido': null,
  'Lucro Real': null,
}

// ─── Defaults dos cadastros ─────────────────────────────────────────────────
const CONTADOR_DEFAULT = { nome: '', escritorio: '', crc: '', telefone: '', email: '', endereco: '', observacoes: '' }
const EMPRESA_DEFAULT = {
  razao_social: 'IDEMAQ Assistência Técnica LTDA',
  cnpj: '', regime: 'MEI', cnae: '', inscricao_municipal: '',
  inscricao_estadual: '', abertura: '', tem_funcionarios: false,
}

// ─── Documentos do checklist mensal ─────────────────────────────────────────
const DOCS = [
  { id: 'extratos',    label: 'Extratos bancários',       desc: 'De todas as contas (Cresol, Bradesco PJ, MP, Nubank, Inter)', icon: 'ti-file-dollar' },
  { id: 'nf_emitidas', label: 'Notas fiscais emitidas',   desc: 'NFS-e dos serviços prestados no mês',                          icon: 'ti-file-invoice' },
  { id: 'nf_compras',  label: 'Notas de compras',         desc: 'Peças, ML, materiais — notas de entrada',                     icon: 'ti-shopping-cart' },
  { id: 'comprovantes',label: 'Comprovantes de imposto',  desc: 'DAS, FGTS e demais guias pagas',                              icon: 'ti-receipt' },
  { id: 'folha',       label: 'Folha / pró-labore',       desc: 'Recibos de salário e pró-labore do sócio',                    icon: 'ti-users' },
  { id: 'relatorio',   label: 'Relatório de faturamento', desc: 'Resumo de receitas e despesas do mês (exportar abaixo)',       icon: 'ti-chart-bar' },
]

// ─── Links úteis (governo) ──────────────────────────────────────────────────
const LINKS = [
  { label: 'Portal do Empreendedor (DAS-MEI)', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor', icon: 'ti-building-store' },
  { label: 'Simples Nacional',                 url: 'https://www8.receita.fazenda.gov.br/SimplesNacional/',       icon: 'ti-receipt-tax' },
  { label: 'Emissor NFS-e Nacional',           url: 'https://www.nfse.gov.br/EmissorNacional',                    icon: 'ti-file-invoice' },
  { label: 'Consultar CNPJ (Receita)',         url: 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp', icon: 'ti-search' },
]

// ─── Helpers de data ────────────────────────────────────────────────────────
function isMissingTable(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('not found'))
}
function inicioDoDia(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function diasNoMes(y, m) { return new Date(y, m + 1, 0).getDate() }
function ymDe(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function labelMes(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// Obrigações fiscais conforme o regime + se tem funcionário
function obrigacoesPorRegime(regime, temFunc) {
  const list = []
  if (regime === 'MEI') {
    list.push({ id: 'das_mei', label: 'DAS-MEI', desc: 'Guia mensal do MEI (valor fixo) — competência do mês anterior', dia: 20, freq: 'mensal', icon: 'ti-receipt' })
    list.push({ id: 'dasn',    label: 'DASN-SIMEI', desc: 'Declaração Anual do Faturamento do MEI (ano anterior)',      dia: 31, mes: 5, freq: 'anual', icon: 'ti-file-check' })
  } else if (regime === 'Simples Nacional') {
    list.push({ id: 'das',   label: 'DAS', desc: 'Documento de Arrecadação do Simples — competência do mês anterior', dia: 20, freq: 'mensal', icon: 'ti-receipt' })
    list.push({ id: 'defis', label: 'DEFIS', desc: 'Declaração de Informações Socioeconômicas e Fiscais (anual)',      dia: 31, mes: 3, freq: 'anual', icon: 'ti-file-check' })
  } else {
    list.push({ id: 'darf', label: 'DARF (impostos)', desc: 'Guias apuradas pelo contador conforme o regime', dia: 20, freq: 'mensal', icon: 'ti-receipt' })
  }
  if (temFunc) {
    list.push({ id: 'fgts',       label: 'FGTS',        desc: 'Fundo de Garantia dos funcionários',        dia: 20, freq: 'mensal', icon: 'ti-users' })
    list.push({ id: 'inss_folha', label: 'INSS / Folha', desc: 'Contribuição previdenciária da folha (GPS)', dia: 20, freq: 'mensal', icon: 'ti-users' })
  }
  return list
}
// Próxima ocorrência (>= hoje) da obrigação
function proximoVencimento(o, hoje) {
  const y = hoje.getFullYear(), m = hoje.getMonth()
  const ini = inicioDoDia(hoje)
  if (o.freq === 'anual') {
    let d = new Date(y, o.mes - 1, o.dia)
    if (d < ini) d = new Date(y + 1, o.mes - 1, o.dia)
    return d
  }
  let d = new Date(y, m, Math.min(o.dia, diasNoMes(y, m)))
  if (d < ini) {
    const ny = m === 11 ? y + 1 : y, nm = m === 11 ? 0 : m + 1
    d = new Date(ny, nm, Math.min(o.dia, diasNoMes(ny, nm)))
  }
  return d
}

export default function MeuContador({ T, dark }) {
  const isMobile = useIsMobile()
  const { get, set, loading: loadingCfg, tabelaAusente } = useConfiguracoes()
  const notify = useToast()

  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  const hoje = useMemo(() => new Date(), [])
  const mesRef = ymDe(hoje)

  // ─── Cadastros (contador + empresa) ───────────────────────────────────────
  const contador = { ...CONTADOR_DEFAULT, ...(get('contador', {}) || {}) }
  const empresa = { ...EMPRESA_DEFAULT, ...(get('empresa_fiscal', {}) || {}) }

  const [editContador, setEditContador] = useState(false)
  const [editEmpresa, setEditEmpresa] = useState(false)
  const [draftC, setDraftC] = useState(CONTADOR_DEFAULT)
  const [draftE, setDraftE] = useState(EMPRESA_DEFAULT)

  function abrirEditContador() { setDraftC({ ...CONTADOR_DEFAULT, ...contador }); setEditContador(true) }
  function abrirEditEmpresa() { setDraftE({ ...EMPRESA_DEFAULT, ...empresa }); setEditEmpresa(true) }

  async function salvarContador() {
    const { error } = await set('contador', draftC)
    setEditContador(false)
    if (error && error.code !== 'OFFLINE') return notify('erro', `Falha ao salvar: ${error.message || 'erro'}`)
    if (error?.code === 'OFFLINE') return notify('info', 'Modo demo: rode sql/10-configuracoes.sql pra persistir.')
    notify('ok', 'Dados do contador salvos.')
  }
  async function salvarEmpresa() {
    const { error } = await set('empresa_fiscal', draftE)
    setEditEmpresa(false)
    if (error && error.code !== 'OFFLINE') return notify('erro', `Falha ao salvar: ${error.message || 'erro'}`)
    if (error?.code === 'OFFLINE') return notify('info', 'Modo demo: rode sql/10-configuracoes.sql pra persistir.')
    notify('ok', 'Dados fiscais salvos.')
  }

  // ─── Status de obrigações pagas + checklist (por mês) ─────────────────────
  const pagoKey = `fiscal_pago_${mesRef}`
  const docsKey = `docs_contador_${mesRef}`
  const pagoMap = get(pagoKey, {}) || {}
  const docsMap = get(docsKey, {}) || {}

  async function toggleObrigacao(id) {
    const novo = { ...pagoMap, [id]: !pagoMap[id] }
    await set(pagoKey, novo)
  }
  async function toggleDoc(id) {
    const novo = { ...docsMap, [id]: !docsMap[id] }
    await set(docsKey, novo)
  }

  const obrigacoes = obrigacoesPorRegime(empresa.regime, empresa.tem_funcionarios)
  const docsFeitos = DOCS.filter(d => docsMap[d.id]).length

  // ─── Faturamento real (RBT12) + lançamentos do mês pra exportar ───────────
  const [fin, setFin] = useState({ rows: [], missing: false })
  const [loadingFin, setLoadingFin] = useState(true)

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoadingFin(true)
      const desde = new Date(); desde.setMonth(desde.getMonth() - 12)
      const desdeISO = desde.toISOString().slice(0, 10)
      const cols = 'tipo,valor,categoria,descricao,vencimento,pago_em,forma_pagamento'
      let rows = [], missing = false
      // Preferir a view de lançamentos válidos (dedup); cair pra tabela base.
      let res = await supabase.from('vw_lancamentos_validos').select(cols).gte('vencimento', desdeISO)
      if (res.error) {
        let r2 = await supabase.from('lancamento_financeiro').select(cols).is('deleted_at', null).gte('vencimento', desdeISO)
        if (r2.error) { missing = isMissingTable(r2.error); rows = [] }
        else rows = r2.data || []
      } else rows = res.data || []
      if (cancel) return
      setFin({ rows, missing })
      setLoadingFin(false)
    }
    load()
    return () => { cancel = true }
  }, [])

  const rbt12 = useMemo(
    () => fin.rows.filter(r => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor || 0), 0),
    [fin.rows]
  )
  const itensMes = useMemo(
    () => fin.rows.filter(r => (r.vencimento || '').startsWith(mesRef)),
    [fin.rows, mesRef]
  )
  const receitaMes = itensMes.filter(r => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor || 0), 0)
  const despesaMes = itensMes.filter(r => r.tipo === 'despesa').reduce((s, r) => s + Number(r.valor || 0), 0)

  const limite = LIMITE_ANUAL[empresa.regime]
  const pctLimite = limite ? Math.min(rbt12 / limite, 1) : 0
  const restaLimite = limite ? Math.max(limite - rbt12, 0) : null
  const alertaLimite = limite && pctLimite >= 0.8
  const corBarra = alertaLimite ? (pctLimite >= 1 ? vermelho : amarelo) : verde

  // ─── Exportar pro contador ────────────────────────────────────────────────
  function copiarResumo() {
    const linhas = [
      `IDEMAQ — Resumo para o contador · ${labelMes(mesRef)}`,
      `Empresa: ${empresa.razao_social || '—'}`,
      empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : null,
      `Regime: ${empresa.regime}`,
      '',
      `Receita bruta do mês: ${fmtBRL(receitaMes, { fr: true })}`,
      `Despesas do mês: ${fmtBRL(despesaMes, { fr: true })}`,
      `Resultado: ${fmtBRL(receitaMes - despesaMes, { fr: true })}`,
      `Faturamento acumulado (12 meses): ${fmtBRL(rbt12, { fr: true })}`,
      '',
      `Lançamentos no mês: ${itensMes.length}`,
    ].filter(Boolean).join('\n')
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(linhas).then(
        () => notify('ok', 'Resumo copiado — cole no WhatsApp/email do contador.'),
        () => notify('erro', 'Não consegui copiar. Tente o CSV.')
      )
    } else {
      notify('erro', 'Cópia não suportada neste navegador. Use o CSV.')
    }
  }
  function baixarCSV() {
    if (!itensMes.length) return notify('info', 'Sem lançamentos neste mês pra exportar.')
    const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
    const cab = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Forma', 'Valor']
    const corpo = itensMes.map(l => [
      l.vencimento || '', l.tipo || '', l.categoria || '',
      l.descricao || '', l.forma_pagamento || '',
      String(Number(l.valor || 0).toFixed(2)).replace('.', ','),
    ].map(esc).join(';'))
    const csv = '﻿' + [cab.join(';'), ...corpo].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `idemaq-lancamentos-${mesRef}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    notify('ok', `CSV de ${itensMes.length} lançamentos baixado.`)
  }

  const temContador = contador.nome || contador.telefone || contador.email
  const soDigitos = (s) => (s || '').replace(/\D/g, '')

  return (
    <div style={{
      padding: isMobile ? '16px 14px 32px' : '20px 24px 40px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
      fontFamily: ATL_FONT,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7,
          background: dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-calculator" style={{ fontSize: 16, color: azul }} aria-hidden="true" />
        </div>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, letterSpacing: '-0.01em' }}>
            Meu Contador
          </span>
          <p style={{ fontSize: 12, color: T.textMuted, margin: '1px 0 0', letterSpacing: '-0.005em' }}>
            Contato, obrigações fiscais e documentos da empresa num lugar só.
          </p>
        </div>
      </div>

      {tabelaAusente && (
        <Panel T={T} dark={dark} accent={amarelo}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: amarelo, flexShrink: 0 }} aria-hidden="true" />
            <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.45 }}>
              <strong>Modo demo:</strong> rode <Code dark={dark}>sql/10-configuracoes.sql</Code> no Supabase pra
              salvar os dados de forma permanente. Por enquanto ficam só nesta sessão.
            </div>
          </div>
        </Panel>
      )}

      {/* ─── Cartão do contador ─────────────────────────────────────────── */}
      <Panel T={T} dark={dark} titleIcon="user-check" title="Dados do contador"
        actions={!editContador && (
          <IconBtn T={T} dark={dark} icon="pencil" title="Editar" onClick={abrirEditContador} />
        )}>
        {editContador ? (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <Field T={T} dark={dark} label="Nome do contador" icon="user" value={draftC.nome} onChange={v => setDraftC({ ...draftC, nome: v })} />
              <Field T={T} dark={dark} label="Escritório" icon="building" value={draftC.escritorio} onChange={v => setDraftC({ ...draftC, escritorio: v })} />
              <Field T={T} dark={dark} label="CRC (registro)" icon="id-badge" value={draftC.crc} onChange={v => setDraftC({ ...draftC, crc: v })} />
              <Field T={T} dark={dark} label="Telefone / WhatsApp" icon="phone" value={draftC.telefone} onChange={v => setDraftC({ ...draftC, telefone: v })} />
              <Field T={T} dark={dark} label="E-mail" icon="mail" value={draftC.email} onChange={v => setDraftC({ ...draftC, email: v })} />
              <Field T={T} dark={dark} label="Endereço" icon="map-pin" value={draftC.endereco} onChange={v => setDraftC({ ...draftC, endereco: v })} />
            </div>
            <Field T={T} dark={dark} label="Observações" icon="note" value={draftC.observacoes} onChange={v => setDraftC({ ...draftC, observacoes: v })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn T={T} dark={dark} variant="primary" icon="device-floppy" onClick={salvarContador}>Salvar</Btn>
              <Btn T={T} dark={dark} icon="x" onClick={() => setEditContador(false)}>Cancelar</Btn>
            </div>
          </div>
        ) : !temContador ? (
          <div style={{ padding: '28px 16px', textAlign: 'center' }}>
            <i className="ti ti-user-plus" style={{ fontSize: 26, color: T.textDim }} aria-hidden="true" />
            <p style={{ fontSize: 13, color: T.textMuted, margin: '8px 0 12px' }}>
              Cadastre os dados do seu contador pra ter tudo à mão.
            </p>
            <Btn T={T} dark={dark} variant="primary" icon="plus" onClick={abrirEditContador}>Adicionar contador</Btn>
          </div>
        ) : (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px 20px' }}>
              <InfoRow T={T} icon="user" label="Contador" value={contador.nome} />
              <InfoRow T={T} icon="building" label="Escritório" value={contador.escritorio} />
              <InfoRow T={T} icon="id-badge" label="CRC" value={contador.crc} />
              <InfoRow T={T} icon="phone" label="Telefone" value={contador.telefone} />
              <InfoRow T={T} icon="mail" label="E-mail" value={contador.email} />
              <InfoRow T={T} icon="map-pin" label="Endereço" value={contador.endereco} />
            </div>
            {contador.observacoes && (
              <div style={{ fontSize: 12.5, color: T.textSecondary, background: dark ? 'rgba(255,255,255,0.03)' : '#F7F8F9', padding: '8px 10px', borderRadius: ATL_RADIUS, lineHeight: 1.45 }}>
                {contador.observacoes}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
              {contador.telefone && (
                <Btn T={T} dark={dark} icon="phone" onClick={() => window.open(`tel:${soDigitos(contador.telefone)}`)}>Ligar</Btn>
              )}
              {contador.telefone && (
                <Btn T={T} dark={dark} icon="brand-whatsapp" onClick={() => window.open(`https://wa.me/55${soDigitos(contador.telefone)}`, '_blank')}>WhatsApp</Btn>
              )}
              {contador.email && (
                <Btn T={T} dark={dark} icon="mail" onClick={() => window.open(`mailto:${contador.email}`)}>E-mail</Btn>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* ─── Faturamento acumulado (RBT12) ──────────────────────────────── */}
      <Panel T={T} dark={dark} titleIcon="chart-line"
        title="Faturamento acumulado (12 meses)"
        footer={limite
          ? `Limite do ${empresa.regime}: ${fmtBRL(limite)} por ano.${empresa.regime === 'Simples Nacional' ? ' Sublimite estadual de ICMS/ISS: R$ 3.600.000.' : ''} Passar do limite muda o regime — avise seu contador antes.`
          : 'No Lucro Presumido/Real não há limite de faturamento — os impostos são apurados pelo contador.'}>
        <div style={{ padding: 14 }}>
          {loadingFin ? (
            <div style={{ fontSize: 12.5, color: T.textMuted }}>Carregando faturamento…</div>
          ) : fin.missing ? (
            <div style={{ fontSize: 12.5, color: T.textMuted }}>Sem dados financeiros ainda. Lance receitas no Financeiro pra acompanhar o limite.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Acumulado 12 meses</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: T.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {fmtBRL(rbt12)}
                  </div>
                </div>
                {limite && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: corBarra, fontVariantNumeric: 'tabular-nums' }}>
                      {(pctLimite * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>do limite usado</div>
                  </div>
                )}
              </div>

              {limite && (
                <>
                  <div style={{ height: 10, borderRadius: 99, background: T.progBg, overflow: 'hidden' }}>
                    <div style={{ width: `${pctLimite * 100}%`, height: '100%', background: corBarra, borderRadius: 99, transition: 'width .3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                    <span>Falta pro limite: <strong style={{ color: T.textPrimary }}>{fmtBRL(restaLimite)}</strong></span>
                    <span>Média/mês: <strong style={{ color: T.textPrimary }}>{fmtBRL(rbt12 / 12)}</strong></span>
                  </div>
                  {alertaLimite && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: (pctLimite >= 1 ? vermelho : amarelo) + '18', color: pctLimite >= 1 ? vermelho : amarelo, padding: '8px 10px', borderRadius: ATL_RADIUS, fontSize: 12.5, fontWeight: 600 }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 15 }} aria-hidden="true" />
                      {pctLimite >= 1
                        ? 'Você passou do limite do regime — fale com o contador com urgência.'
                        : 'Você já usou mais de 80% do limite — acompanhe de perto com o contador.'}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* ─── Calendário de obrigações fiscais ───────────────────────────── */}
      <Panel T={T} dark={dark} titleIcon="calendar-event"
        title="Obrigações fiscais"
        footer={`Competência de ${labelMes(mesRef)}. Marque como pago conforme quitar as guias. Datas são referência — confirme os boletos com seu contador.`}>
        <div>
          {obrigacoes.map((o, i) => {
            const venc = proximoVencimento(o, hoje)
            const dias = Math.round((inicioDoDia(venc) - inicioDoDia(hoje)) / 86400000)
            const pago = !!pagoMap[o.id]
            const corDias = pago ? verde : dias < 0 ? vermelho : dias <= 3 ? amarelo : T.textMuted
            const txtDias = pago ? 'Pago' : dias < 0 ? `Venceu há ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoje' : `Em ${dias} dia${dias > 1 ? 's' : ''}`
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                opacity: pago ? 0.7 : 1,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: ATL_RADIUS, flexShrink: 0,
                  background: (pago ? verde : azul) + '18', color: pago ? verde : azul,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ${pago ? 'ti-check' : o.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, textDecoration: pago ? 'line-through' : 'none' }}>{o.label}</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>· vence {fmtPrazoCurto(venc.toISOString().slice(0, 10))}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.35, marginTop: 1 }}>{o.desc}</div>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: corDias, textAlign: 'right', flexShrink: 0, minWidth: 74 }}>{txtDias}</div>
                <button onClick={() => toggleObrigacao(o.id)}
                  title={pago ? 'Desmarcar' : 'Marcar como pago'}
                  style={{
                    width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                    border: `1.5px solid ${pago ? verde : T.border2}`,
                    background: pago ? verde : 'transparent',
                    color: '#fff', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {pago && <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true" />}
                </button>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* ─── Checklist de documentos ────────────────────────────────────── */}
      <Panel T={T} dark={dark} titleIcon="checklist"
        title="Documentos pro contador"
        actions={<span style={{ fontSize: 12, fontWeight: 700, color: docsFeitos === DOCS.length ? verde : T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{docsFeitos}/{DOCS.length}</span>}
        footer={`Checklist de ${labelMes(mesRef)}. Junte esses documentos todo mês e envie ao contador.`}>
        <div>
          {DOCS.map((d, i) => {
            const feito = !!docsMap[d.id]
            return (
              <button key={d.id} onClick={() => toggleDoc(d.id)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', background: 'transparent',
                  border: 'none', borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                  fontFamily: ATL_FONT,
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                  border: `1.5px solid ${feito ? verde : T.border2}`,
                  background: feito ? verde : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {feito && <i className="ti ti-check" style={{ fontSize: 13, color: '#fff' }} aria-hidden="true" />}
                </div>
                <i className={`ti ${d.icon}`} style={{ fontSize: 16, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.textPrimary, textDecoration: feito ? 'line-through' : 'none' }}>{d.label}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.35 }}>{d.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* ─── Exportar pro contador ──────────────────────────────────────── */}
      <Panel T={T} dark={dark} titleIcon="send"
        title="Enviar dados do mês"
        footer={`Resumo e planilha dos lançamentos de ${labelMes(mesRef)} pra mandar pro contador.`}>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
            <MiniKPI T={T} label="Receita" value={fmtBRL(receitaMes)} cor={verde} />
            <MiniKPI T={T} label="Despesa" value={fmtBRL(despesaMes)} cor={vermelho} />
            <MiniKPI T={T} label="Resultado" value={fmtBRL(receitaMes - despesaMes)} cor={azul} />
            <MiniKPI T={T} label="Lançamentos" value={String(itensMes.length)} cor={T.textPrimary} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn T={T} dark={dark} variant="primary" icon="copy" onClick={copiarResumo}>Copiar resumo</Btn>
            <Btn T={T} dark={dark} icon="file-spreadsheet" onClick={baixarCSV}>Baixar CSV do mês</Btn>
          </div>
        </div>
      </Panel>

      {/* ─── Dados fiscais da empresa ───────────────────────────────────── */}
      <Panel T={T} dark={dark} titleIcon="building-bank" title="Dados fiscais da empresa"
        actions={!editEmpresa && <IconBtn T={T} dark={dark} icon="pencil" title="Editar" onClick={abrirEditEmpresa} />}>
        {editEmpresa ? (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <Field T={T} dark={dark} label="Razão social" icon="building" value={draftE.razao_social} onChange={v => setDraftE({ ...draftE, razao_social: v })} />
              <Field T={T} dark={dark} label="CNPJ" icon="id" value={draftE.cnpj} onChange={v => setDraftE({ ...draftE, cnpj: v })} />
              <SelectField T={T} dark={dark} label="Regime tributário" icon="receipt-tax" value={draftE.regime} options={REGIMES} onChange={v => setDraftE({ ...draftE, regime: v })} />
              <Field T={T} dark={dark} label="CNAE principal" icon="category" value={draftE.cnae} onChange={v => setDraftE({ ...draftE, cnae: v })} />
              <Field T={T} dark={dark} label="Inscrição municipal" icon="building-community" value={draftE.inscricao_municipal} onChange={v => setDraftE({ ...draftE, inscricao_municipal: v })} />
              <Field T={T} dark={dark} label="Inscrição estadual" icon="map-pin" value={draftE.inscricao_estadual} onChange={v => setDraftE({ ...draftE, inscricao_estadual: v })} />
              <Field T={T} dark={dark} label="Data de abertura" icon="calendar" type="date" value={draftE.abertura} onChange={v => setDraftE({ ...draftE, abertura: v })} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.textPrimary, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!draftE.tem_funcionarios} onChange={e => setDraftE({ ...draftE, tem_funcionarios: e.target.checked })} />
              Tem funcionários registrados (mostra FGTS e INSS/folha nas obrigações)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn T={T} dark={dark} variant="primary" icon="device-floppy" onClick={salvarEmpresa}>Salvar</Btn>
              <Btn T={T} dark={dark} icon="x" onClick={() => setEditEmpresa(false)}>Cancelar</Btn>
            </div>
          </div>
        ) : (
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px 20px' }}>
            <InfoRow T={T} icon="building" label="Razão social" value={empresa.razao_social} />
            <InfoRow T={T} icon="id" label="CNPJ" value={empresa.cnpj} />
            <InfoRow T={T} icon="receipt-tax" label="Regime" value={empresa.regime} />
            <InfoRow T={T} icon="category" label="CNAE" value={empresa.cnae} />
            <InfoRow T={T} icon="building-community" label="Inscr. municipal" value={empresa.inscricao_municipal} />
            <InfoRow T={T} icon="map-pin" label="Inscr. estadual" value={empresa.inscricao_estadual} />
            <InfoRow T={T} icon="calendar" label="Abertura" value={empresa.abertura ? fmtPrazoCurto(empresa.abertura) : ''} />
            <InfoRow T={T} icon="users" label="Funcionários" value={empresa.tem_funcionarios ? 'Sim' : 'Não'} />
          </div>
        )}
      </Panel>

      {/* ─── Links úteis ────────────────────────────────────────────────── */}
      <Panel T={T} dark={dark} titleIcon="external-link" title="Links úteis">
        <div style={{ padding: 8, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 6 }}>
          {LINKS.map(l => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: ATL_RADIUS,
                textDecoration: 'none', color: T.textPrimary,
                background: dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC',
                border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 500,
              }}>
              <i className={`ti ${l.icon}`} style={{ fontSize: 16, color: azul, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ flex: 1, minWidth: 0 }}>{l.label}</span>
              <i className="ti ti-arrow-up-right" style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
            </a>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ─── Primitivos Atlassian inline ──────────────────────────────────────────
function Panel({ T, dark, title, titleIcon, accent, footer, actions, children }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS, overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
      fontFamily: ATL_FONT,
    }}>
      {(title || titleIcon) && (
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
        }}>
          {accent && <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 99, background: accent, minHeight: 14, flexShrink: 0 }} />}
          {titleIcon && <i className={`ti ti-${titleIcon}`} style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />}
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, letterSpacing: '-0.005em', flex: 1 }}>{title}</div>
          {actions}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div style={{
          padding: '8px 14px', borderTop: `1px solid ${T.border}`,
          background: dark ? 'rgba(255,255,255,0.025)' : '#F7F8F9',
          fontSize: 11.5, color: T.textMuted, lineHeight: 1.45,
        }}>{footer}</div>
      )}
    </div>
  )
}

function Btn({ T, dark, variant = 'default', icon, onClick, disabled, children }) {
  const azul = corEtapa('blue', dark)
  const styles = variant === 'primary'
    ? { background: azul, color: '#fff', border: 'none' }
    : { background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7', color: T.textPrimary, border: `1px solid ${T.border}` }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      ...styles, padding: '7px 12px', borderRadius: 3,
      fontSize: 13.5, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      fontFamily: ATL_FONT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      minHeight: 32, letterSpacing: '-0.005em', WebkitTapHighlightColor: 'transparent',
    }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

function IconBtn({ T, dark, icon, title, onClick }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} style={{
      width: 28, height: 28, borderRadius: 5,
      background: 'transparent', border: `1px solid ${T.border}`,
      color: T.textMuted, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
    </button>
  )
}

function Field({ T, dark, label, icon, value, onChange, type = 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '-0.005em' }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1px solid ${T.border}`, borderRadius: 3, height: 32,
      }}>
        {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />}
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, color: T.textPrimary, fontFamily: ATL_FONT, letterSpacing: '-0.005em',
        }} />
      </div>
    </div>
  )
}

function SelectField({ T, dark, label, icon, value, options, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '-0.005em' }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1px solid ${T.border}`, borderRadius: 3, height: 32,
      }}>
        {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />}
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, color: T.textPrimary, fontFamily: ATL_FONT, cursor: 'pointer',
        }}>
          {options.map(o => <option key={o} value={o} style={{ color: '#000' }}>{o}</option>)}
        </select>
      </div>
    </div>
  )
}

function InfoRow({ T, icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 15, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
        <div style={{ fontSize: 13, color: value ? T.textPrimary : T.textDim, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value || '—'}
        </div>
      </div>
    </div>
  )
}

function MiniKPI({ T, label, value, cor }) {
  return (
    <div style={{ background: T.cardAlt, borderRadius: ATL_RADIUS, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Code({ dark, children }) {
  return (
    <code style={{
      background: dark ? 'rgba(255,255,255,0.07)' : '#F4F5F7',
      padding: '1px 5px', borderRadius: 3,
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 11,
    }}>{children}</code>
  )
}
