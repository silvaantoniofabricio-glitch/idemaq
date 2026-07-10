// src/pages/MeuContador.jsx
// Página "Meu Contador" — central fiscal/contábil da empresa (Atlassian Design).
//
// Reúne tudo que o Toni e o contador precisam num lugar só:
//   1. Cartão do contador (contato editável) + botões ligar/WhatsApp/email
//   2. Faturamento acumulado 12 meses (RBT12) vs limite do regime — dado REAL
//   3. Calendário de obrigações fiscais (DAS/FGTS/DEFIS...) com "marcar pago"
//   4. Checklist mensal de documentos pra enviar ao contador
//   5. Exportar: resumo do mês (copiar) + CSV dos lançamentos
//   6. Dados fiscais da empresa (razão social, CNPJ, regime, CNAE...)
//   7. Links úteis (Portal do Empreendedor, Simples Nacional, NFS-e...)
//
// Design: espaçado e visual (cards grandes, respiro generoso) — reescrito
// 10/07/2026 após feedback "denso e apertado demais".
//
// Persistência: tabela `configuracoes` (chave/valor JSONB) via useConfiguracoes.
//   - contador · empresa_fiscal · fiscal_pago_<YYYY-MM> · docs_contador_<YYYY-MM>
//
// Admin-only (rota envolvida em <AdminOnly> no App.jsx).

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useIsMobile } from '../theme'
import { fmtBRL, fmtPrazoCurto } from '../utils/fmt'
import { corEtapa } from '../utils/colors'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { useToast } from '../components/ui/Toast'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const R = 12 // radius dos cards — mais suave/moderno

const REGIMES = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']
const LIMITE_ANUAL = { 'MEI': 81000, 'Simples Nacional': 4800000, 'Lucro Presumido': null, 'Lucro Real': null }

const CONTADOR_DEFAULT = { nome: '', escritorio: '', crc: '', telefone: '', email: '', endereco: '', observacoes: '' }
const EMPRESA_DEFAULT = {
  razao_social: 'IDEMAQ Assistência Técnica LTDA',
  cnpj: '', regime: 'MEI', cnae: '', inscricao_municipal: '',
  inscricao_estadual: '', abertura: '', tem_funcionarios: false,
}

const DOCS = [
  { id: 'extratos',    label: 'Extratos bancários',       desc: 'De todas as contas (Cresol, Bradesco PJ, MP, Nubank, Inter)', icon: 'ti-file-dollar' },
  { id: 'nf_emitidas', label: 'Notas fiscais emitidas',   desc: 'NFS-e dos serviços prestados no mês',                          icon: 'ti-file-invoice' },
  { id: 'nf_compras',  label: 'Notas de compras',         desc: 'Peças, ML, materiais — notas de entrada',                     icon: 'ti-shopping-cart' },
  { id: 'comprovantes',label: 'Comprovantes de imposto',  desc: 'DAS, FGTS e demais guias pagas',                              icon: 'ti-receipt' },
  { id: 'folha',       label: 'Folha / pró-labore',       desc: 'Recibos de salário e pró-labore do sócio',                    icon: 'ti-users' },
  { id: 'relatorio',   label: 'Relatório de faturamento', desc: 'Resumo de receitas e despesas do mês (exportar abaixo)',       icon: 'ti-chart-bar' },
]

const LINKS = [
  { label: 'Portal do Empreendedor', sub: 'Gerar e pagar o DAS-MEI', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor', icon: 'ti-building-store' },
  { label: 'Simples Nacional',       sub: 'Portal da Receita Federal', url: 'https://www8.receita.fazenda.gov.br/SimplesNacional/',      icon: 'ti-receipt-tax' },
  { label: 'Emissor NFS-e Nacional', sub: 'Emitir nota de serviço',   url: 'https://www.nfse.gov.br/EmissorNacional',                   icon: 'ti-file-invoice' },
  { label: 'Consultar CNPJ',         sub: 'Situação cadastral',       url: 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp', icon: 'ti-search' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────
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
    list.push({ id: 'fgts',       label: 'FGTS',         desc: 'Fundo de Garantia dos funcionários',        dia: 20, freq: 'mensal', icon: 'ti-users' })
    list.push({ id: 'inss_folha', label: 'INSS / Folha', desc: 'Contribuição previdenciária da folha (GPS)', dia: 20, freq: 'mensal', icon: 'ti-users' })
  }
  return list
}
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
  const { get, set, tabelaAusente } = useConfiguracoes()
  const notify = useToast()

  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  const hoje = useMemo(() => new Date(), [])
  const mesRef = ymDe(hoje)

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

  const pagoKey = `fiscal_pago_${mesRef}`
  const docsKey = `docs_contador_${mesRef}`
  const pagoMap = get(pagoKey, {}) || {}
  const docsMap = get(docsKey, {}) || {}

  async function toggleObrigacao(id) { await set(pagoKey, { ...pagoMap, [id]: !pagoMap[id] }) }
  async function toggleDoc(id) { await set(docsKey, { ...docsMap, [id]: !docsMap[id] }) }

  const obrigacoes = obrigacoesPorRegime(empresa.regime, empresa.tem_funcionarios)
  const docsFeitos = DOCS.filter(d => docsMap[d.id]).length

  // ─── Faturamento real (RBT12) + lançamentos do mês ─────────────────────────
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
      let res = await supabase.from('vw_lancamentos_validos').select(cols).gte('vencimento', desdeISO)
      if (res.error) {
        let r2 = await supabase.from('lancamento_financeiro').select(cols).is('deleted_at', null).gte('vencimento', desdeISO)
        if (r2.error) { missing = isMissingTable(r2.error); rows = [] }
        else rows = r2.data || []
      } else rows = res.data || []
      if (cancel) return
      setFin({ rows, missing }); setLoadingFin(false)
    }
    load()
    return () => { cancel = true }
  }, [])

  const rbt12 = useMemo(() => fin.rows.filter(r => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor || 0), 0), [fin.rows])
  const itensMes = useMemo(() => fin.rows.filter(r => (r.vencimento || '').startsWith(mesRef)), [fin.rows, mesRef])
  const receitaMes = itensMes.filter(r => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor || 0), 0)
  const despesaMes = itensMes.filter(r => r.tipo === 'despesa').reduce((s, r) => s + Number(r.valor || 0), 0)

  const limite = LIMITE_ANUAL[empresa.regime]
  const pctLimite = limite ? Math.min(rbt12 / limite, 1) : 0
  const restaLimite = limite ? Math.max(limite - rbt12, 0) : null
  const alertaLimite = limite && pctLimite >= 0.8
  const corBarra = alertaLimite ? (pctLimite >= 1 ? vermelho : amarelo) : verde

  function copiarResumo() {
    const linhas = [
      `IDEMAQ — Resumo para o contador · ${labelMes(mesRef)}`,
      `Empresa: ${empresa.razao_social || '—'}`,
      empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : null,
      `Regime: ${empresa.regime}`, '',
      `Receita bruta do mês: ${fmtBRL(receitaMes, { fr: true })}`,
      `Despesas do mês: ${fmtBRL(despesaMes, { fr: true })}`,
      `Resultado: ${fmtBRL(receitaMes - despesaMes, { fr: true })}`,
      `Faturamento acumulado (12 meses): ${fmtBRL(rbt12, { fr: true })}`, '',
      `Lançamentos no mês: ${itensMes.length}`,
    ].filter(Boolean).join('\n')
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(linhas).then(
        () => notify('ok', 'Resumo copiado — cole no WhatsApp/email do contador.'),
        () => notify('erro', 'Não consegui copiar. Tente o CSV.')
      )
    } else notify('erro', 'Cópia não suportada neste navegador. Use o CSV.')
  }
  function baixarCSV() {
    if (!itensMes.length) return notify('info', 'Sem lançamentos neste mês pra exportar.')
    const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`
    const cab = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Forma', 'Valor']
    const corpo = itensMes.map(l => [
      l.vencimento || '', l.tipo || '', l.categoria || '', l.descricao || '', l.forma_pagamento || '',
      String(Number(l.valor || 0).toFixed(2)).replace('.', ','),
    ].map(esc).join(';'))
    const csv = '﻿' + [cab.join(';'), ...corpo].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `idemaq-lancamentos-${mesRef}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    notify('ok', `CSV de ${itensMes.length} lançamentos baixado.`)
  }

  const temContador = contador.nome || contador.telefone || contador.email
  const soDigitos = (s) => (s || '').replace(/\D/g, '')

  const P = { T, dark } // props comuns

  return (
    <div style={{
      padding: isMobile ? '18px 14px 40px' : '28px 32px 56px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 20,
      fontFamily: FONT,
      maxWidth: 880, width: '100%', margin: '0 auto',
    }}>
      {/* Header da página */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 2 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13,
          background: dark ? 'rgba(91,155,213,0.16)' : '#e8f0fb',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-calculator" style={{ fontSize: 24, color: azul }} aria-hidden="true" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>
            Meu Contador
          </h1>
          <p style={{ fontSize: 14.5, color: T.textMuted, margin: '3px 0 0' }}>
            Contato, obrigações fiscais e documentos da empresa num lugar só.
          </p>
        </div>
      </div>

      {tabelaAusente && (
        <Banner {...P} cor={amarelo} icon="alert-triangle">
          <strong>Modo demo:</strong> rode <Code dark={dark}>sql/10-configuracoes.sql</Code> no Supabase
          pra salvar de forma permanente. Por enquanto os dados ficam só nesta sessão.
        </Banner>
      )}

      {/* ─── Cartão do contador ─────────────────────────────────────────── */}
      <Card {...P} icon="user-check" title="Dados do contador"
        actions={!editContador && temContador && <IconBtn {...P} icon="pencil" title="Editar" onClick={abrirEditContador} />}>
        {editContador ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Grid isMobile={isMobile}>
              <Field {...P} label="Nome do contador" icon="user" value={draftC.nome} onChange={v => setDraftC({ ...draftC, nome: v })} />
              <Field {...P} label="Escritório" icon="building" value={draftC.escritorio} onChange={v => setDraftC({ ...draftC, escritorio: v })} />
              <Field {...P} label="CRC (registro)" icon="id-badge" value={draftC.crc} onChange={v => setDraftC({ ...draftC, crc: v })} />
              <Field {...P} label="Telefone / WhatsApp" icon="phone" value={draftC.telefone} onChange={v => setDraftC({ ...draftC, telefone: v })} />
              <Field {...P} label="E-mail" icon="mail" value={draftC.email} onChange={v => setDraftC({ ...draftC, email: v })} />
              <Field {...P} label="Endereço" icon="map-pin" value={draftC.endereco} onChange={v => setDraftC({ ...draftC, endereco: v })} />
            </Grid>
            <Field {...P} label="Observações" icon="note" value={draftC.observacoes} onChange={v => setDraftC({ ...draftC, observacoes: v })} />
            <Acoes>
              <Btn {...P} variant="primary" icon="device-floppy" onClick={salvarContador}>Salvar</Btn>
              <Btn {...P} icon="x" onClick={() => setEditContador(false)}>Cancelar</Btn>
            </Acoes>
          </div>
        ) : !temContador ? (
          <div style={{ padding: '20px 8px 12px', textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px',
              background: dark ? 'rgba(91,155,213,0.12)' : '#eef4fc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-user-plus" style={{ fontSize: 30, color: azul }} aria-hidden="true" />
            </div>
            <p style={{ fontSize: 15, color: T.textSecondary, margin: '0 0 18px', lineHeight: 1.5 }}>
              Cadastre os dados do seu contador pra ter tudo à mão —<br style={{ display: isMobile ? 'none' : 'block' }} /> telefone, e-mail e escritório num toque.
            </p>
            <Btn {...P} variant="primary" icon="plus" onClick={abrirEditContador}>Adicionar contador</Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Grid isMobile={isMobile} gap={18}>
              <InfoRow {...P} icon="user" label="Contador" value={contador.nome} />
              <InfoRow {...P} icon="building" label="Escritório" value={contador.escritorio} />
              <InfoRow {...P} icon="id-badge" label="CRC" value={contador.crc} />
              <InfoRow {...P} icon="phone" label="Telefone" value={contador.telefone} />
              <InfoRow {...P} icon="mail" label="E-mail" value={contador.email} />
              <InfoRow {...P} icon="map-pin" label="Endereço" value={contador.endereco} />
            </Grid>
            {contador.observacoes && (
              <div style={{ fontSize: 14, color: T.textSecondary, background: T.cardAlt, padding: '12px 14px', borderRadius: R - 2, lineHeight: 1.5 }}>
                {contador.observacoes}
              </div>
            )}
            <Acoes>
              {contador.telefone && <Btn {...P} variant="primary" icon="phone" onClick={() => window.open(`tel:${soDigitos(contador.telefone)}`)}>Ligar</Btn>}
              {contador.telefone && <Btn {...P} icon="brand-whatsapp" onClick={() => window.open(`https://wa.me/55${soDigitos(contador.telefone)}`, '_blank')}>WhatsApp</Btn>}
              {contador.email && <Btn {...P} icon="mail" onClick={() => window.open(`mailto:${contador.email}`)}>E-mail</Btn>}
            </Acoes>
          </div>
        )}
      </Card>

      {/* ─── Faturamento (RBT12) ────────────────────────────────────────── */}
      <Card {...P} icon="chart-line" title="Faturamento acumulado" subtitle="Últimos 12 meses">
        {loadingFin ? (
          <Skeleton {...P} h={90} />
        ) : fin.missing ? (
          <Vazio {...P} icon="chart-line" texto="Sem dados financeiros ainda. Lance receitas no Financeiro pra acompanhar o limite." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: T.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {fmtBRL(rbt12)}
                </div>
                <div style={{ fontSize: 13.5, color: T.textMuted, marginTop: 6 }}>acumulado no período</div>
              </div>
              {limite && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: corBarra, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {(pctLimite * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>do limite usado</div>
                </div>
              )}
            </div>

            {limite && (
              <>
                <div style={{ height: 14, borderRadius: 99, background: T.progBg, overflow: 'hidden' }}>
                  <div style={{ width: `${pctLimite * 100}%`, height: '100%', background: corBarra, borderRadius: 99, transition: 'width .4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 14, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  <span>Falta pro limite: <strong style={{ color: T.textPrimary }}>{fmtBRL(restaLimite)}</strong></span>
                  <span>Média por mês: <strong style={{ color: T.textPrimary }}>{fmtBRL(rbt12 / 12)}</strong></span>
                </div>
                {alertaLimite && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: (pctLimite >= 1 ? vermelho : amarelo) + '1e', color: pctLimite >= 1 ? vermelho : amarelo, padding: '12px 14px', borderRadius: R - 2, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
                    {pctLimite >= 1
                      ? 'Você passou do limite do regime — fale com o contador com urgência.'
                      : 'Você já usou mais de 80% do limite — acompanhe de perto com o contador.'}
                  </div>
                )}
              </>
            )}
            <Nota {...P}>
              {limite
                ? `Limite do ${empresa.regime}: ${fmtBRL(limite)} por ano.${empresa.regime === 'Simples Nacional' ? ' Sublimite estadual (ICMS/ISS): R$ 3.600.000.' : ''} Passar do limite muda o regime — avise seu contador antes.`
                : 'No Lucro Presumido/Real não há limite de faturamento — os impostos são apurados pelo contador.'}
            </Nota>
          </div>
        )}
      </Card>

      {/* ─── Obrigações fiscais ─────────────────────────────────────────── */}
      <Card {...P} icon="calendar-event" title="Obrigações fiscais" subtitle={`Competência de ${labelMes(mesRef)}`} noPad>
        <div>
          {obrigacoes.map((o, i) => {
            const venc = proximoVencimento(o, hoje)
            const dias = Math.round((inicioDoDia(venc) - inicioDoDia(hoje)) / 86400000)
            const pago = !!pagoMap[o.id]
            const corDias = pago ? verde : dias < 0 ? vermelho : dias <= 3 ? amarelo : T.textMuted
            const txtDias = pago ? 'Pago' : dias < 0 ? `Venceu há ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoje' : `Em ${dias} dia${dias > 1 ? 's' : ''}`
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: isMobile ? '16px 16px' : '18px 22px',
                borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                opacity: pago ? 0.65 : 1,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: (pago ? verde : azul) + '1c', color: pago ? verde : azul,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ${pago ? 'ti-check' : o.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, textDecoration: pago ? 'line-through' : 'none' }}>{o.label}</span>
                    <span style={{ fontSize: 13, color: T.textMuted }}>vence {fmtPrazoCurto(venc.toISOString().slice(0, 10))}</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.4, marginTop: 3 }}>{o.desc}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: corDias, textAlign: 'right', flexShrink: 0, minWidth: 82 }}>{txtDias}</div>
                <button onClick={() => toggleObrigacao(o.id)} title={pago ? 'Desmarcar' : 'Marcar como pago'}
                  style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    border: `2px solid ${pago ? verde : T.border2}`,
                    background: pago ? verde : 'transparent', color: '#fff', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {pago && <i className="ti ti-check" style={{ fontSize: 18 }} aria-hidden="true" />}
                </button>
              </div>
            )
          })}
        </div>
        <Nota {...P} pad>Datas são referência — confirme os boletos com seu contador. Marque conforme quitar as guias.</Nota>
      </Card>

      {/* ─── Checklist de documentos ────────────────────────────────────── */}
      <Card {...P} icon="checklist" title="Documentos pro contador" subtitle={labelMes(mesRef)}
        actions={<Pill cor={docsFeitos === DOCS.length ? verde : T.textMuted} bg={T.cardAlt}>{docsFeitos}/{DOCS.length}</Pill>} noPad>
        <div>
          {DOCS.map((d, i) => {
            const feito = !!docsMap[d.id]
            return (
              <button key={d.id} onClick={() => toggleDoc(d.id)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: isMobile ? '15px 16px' : '16px 22px', background: 'transparent',
                  border: 'none', borderTop: i === 0 ? 'none' : `1px solid ${T.border}`, fontFamily: FONT,
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  border: `2px solid ${feito ? verde : T.border2}`,
                  background: feito ? verde : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {feito && <i className="ti ti-check" style={{ fontSize: 17, color: '#fff' }} aria-hidden="true" />}
                </div>
                <i className={`ti ${d.icon}`} style={{ fontSize: 20, color: feito ? verde : T.textMuted, flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, textDecoration: feito ? 'line-through' : 'none' }}>{d.label}</div>
                  <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.4, marginTop: 2 }}>{d.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* ─── Exportar pro contador ──────────────────────────────────────── */}
      <Card {...P} icon="send" title="Enviar dados do mês" subtitle={labelMes(mesRef)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
            <MiniKPI {...P} label="Receita" value={fmtBRL(receitaMes)} cor={verde} />
            <MiniKPI {...P} label="Despesa" value={fmtBRL(despesaMes)} cor={vermelho} />
            <MiniKPI {...P} label="Resultado" value={fmtBRL(receitaMes - despesaMes)} cor={azul} />
            <MiniKPI {...P} label="Lançamentos" value={String(itensMes.length)} cor={T.textPrimary} />
          </div>
          <Acoes>
            <Btn {...P} variant="primary" icon="copy" onClick={copiarResumo}>Copiar resumo</Btn>
            <Btn {...P} icon="file-spreadsheet" onClick={baixarCSV}>Baixar CSV do mês</Btn>
          </Acoes>
        </div>
      </Card>

      {/* ─── Dados fiscais da empresa ───────────────────────────────────── */}
      <Card {...P} icon="building-bank" title="Dados fiscais da empresa"
        actions={!editEmpresa && <IconBtn {...P} icon="pencil" title="Editar" onClick={abrirEditEmpresa} />}>
        {editEmpresa ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Grid isMobile={isMobile}>
              <Field {...P} label="Razão social" icon="building" value={draftE.razao_social} onChange={v => setDraftE({ ...draftE, razao_social: v })} />
              <Field {...P} label="CNPJ" icon="id" value={draftE.cnpj} onChange={v => setDraftE({ ...draftE, cnpj: v })} />
              <SelectField {...P} label="Regime tributário" icon="receipt-tax" value={draftE.regime} options={REGIMES} onChange={v => setDraftE({ ...draftE, regime: v })} />
              <Field {...P} label="CNAE principal" icon="category" value={draftE.cnae} onChange={v => setDraftE({ ...draftE, cnae: v })} />
              <Field {...P} label="Inscrição municipal" icon="building-community" value={draftE.inscricao_municipal} onChange={v => setDraftE({ ...draftE, inscricao_municipal: v })} />
              <Field {...P} label="Inscrição estadual" icon="map-pin" value={draftE.inscricao_estadual} onChange={v => setDraftE({ ...draftE, inscricao_estadual: v })} />
              <Field {...P} label="Data de abertura" icon="calendar" type="date" value={draftE.abertura} onChange={v => setDraftE({ ...draftE, abertura: v })} />
            </Grid>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5, color: T.textPrimary, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 18, height: 18 }} checked={!!draftE.tem_funcionarios} onChange={e => setDraftE({ ...draftE, tem_funcionarios: e.target.checked })} />
              Tem funcionários registrados (mostra FGTS e INSS/folha nas obrigações)
            </label>
            <Acoes>
              <Btn {...P} variant="primary" icon="device-floppy" onClick={salvarEmpresa}>Salvar</Btn>
              <Btn {...P} icon="x" onClick={() => setEditEmpresa(false)}>Cancelar</Btn>
            </Acoes>
          </div>
        ) : (
          <Grid isMobile={isMobile} gap={18}>
            <InfoRow {...P} icon="building" label="Razão social" value={empresa.razao_social} />
            <InfoRow {...P} icon="id" label="CNPJ" value={empresa.cnpj} />
            <InfoRow {...P} icon="receipt-tax" label="Regime" value={empresa.regime} />
            <InfoRow {...P} icon="category" label="CNAE" value={empresa.cnae} />
            <InfoRow {...P} icon="building-community" label="Inscr. municipal" value={empresa.inscricao_municipal} />
            <InfoRow {...P} icon="map-pin" label="Inscr. estadual" value={empresa.inscricao_estadual} />
            <InfoRow {...P} icon="calendar" label="Abertura" value={empresa.abertura ? fmtPrazoCurto(empresa.abertura) : ''} />
            <InfoRow {...P} icon="users" label="Funcionários" value={empresa.tem_funcionarios ? 'Sim' : 'Não'} />
          </Grid>
        )}
      </Card>

      {/* ─── Links úteis ────────────────────────────────────────────────── */}
      <Card {...P} icon="external-link" title="Links úteis" noPad>
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          {LINKS.map(l => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: R - 2,
                textDecoration: 'none', color: T.textPrimary,
                background: T.cardAlt, border: `1px solid ${T.border}`,
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: dark ? 'rgba(91,155,213,0.14)' : '#eef4fc', color: azul,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${l.icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{l.label}</div>
                <div style={{ fontSize: 12.5, color: T.textMuted }}>{l.sub}</div>
              </div>
              <i className="ti ti-arrow-up-right" style={{ fontSize: 18, color: T.textMuted }} aria-hidden="true" />
            </a>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Primitivos (espaçados) ────────────────────────────────────────────────
function Card({ T, dark, title, subtitle, icon, actions, footer, noPad, children }) {
  const azul = corEtapa('blue', dark)
  return (
    <section style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: R,
      boxShadow: dark ? 'none' : '0 1px 2px rgba(9,30,66,0.08), 0 0 1px rgba(9,30,66,0.10)',
      fontFamily: FONT, overflow: 'hidden',
    }}>
      {(title || icon) && (
        <header style={{
          padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 13,
          borderBottom: children ? `1px solid ${T.border}` : 'none',
        }}>
          {icon && (
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: dark ? 'rgba(91,155,213,0.14)' : '#eef4fc', color: azul,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`ti ti-${icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: T.textPrimary, letterSpacing: '-0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 1, textTransform: 'capitalize' }}>{subtitle}</div>}
          </div>
          {actions}
        </header>
      )}
      {children && <div style={{ padding: noPad ? 0 : '20px 22px' }}>{children}</div>}
      {footer}
    </section>
  )
}

function Grid({ isMobile, gap = 14, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap }}>{children}</div>
}
function Acoes({ children }) {
  return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>
}

function Btn({ T, dark, variant = 'default', icon, onClick, children }) {
  const azul = corEtapa('blue', dark)
  const styles = variant === 'primary'
    ? { background: azul, color: '#fff', border: 'none' }
    : { background: dark ? 'rgba(255,255,255,0.06)' : '#F1F2F4', color: T.textPrimary, border: `1px solid ${T.border}` }
  return (
    <button type="button" onClick={onClick} style={{
      ...styles, padding: '11px 18px', borderRadius: 9,
      fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      minHeight: 44, letterSpacing: '-0.01em', WebkitTapHighlightColor: 'transparent',
    }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 17 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

function IconBtn({ T, dark, icon, title, onClick }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} style={{
      width: 38, height: 38, borderRadius: 10,
      background: dark ? 'rgba(255,255,255,0.05)' : '#F1F2F4', border: `1px solid ${T.border}`,
      color: T.textSecondary, cursor: 'pointer', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 17 }} aria-hidden="true" />
    </button>
  )
}

function Field({ T, dark, label, icon, value, onChange, type = 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: T.textSecondary }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px',
        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1.5px solid ${T.border}`, borderRadius: 9, height: 44,
      }}>
        {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 17, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />}
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 15, color: T.textPrimary, fontFamily: FONT,
        }} />
      </div>
    </div>
  )
}

function SelectField({ T, dark, label, icon, value, options, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: T.textSecondary }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px',
        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1.5px solid ${T.border}`, borderRadius: 9, height: 44,
      }}>
        {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 17, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />}
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 15, color: T.textPrimary, fontFamily: FONT, cursor: 'pointer',
        }}>
          {options.map(o => <option key={o} value={o} style={{ color: '#000' }}>{o}</option>)}
        </select>
      </div>
    </div>
  )
}

function InfoRow({ T, icon, label, value }) {
  const azul = corEtapa('blue', false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: T.cardAlt, color: T.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 18 }} aria-hidden="true" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 15, color: value ? T.textPrimary : T.textDim, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value || '—'}
        </div>
      </div>
    </div>
  )
}

function MiniKPI({ T, label, value, cor }) {
  return (
    <div style={{ background: T.cardAlt, borderRadius: R - 2, padding: '14px 16px' }}>
      <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 4 }}>{value}</div>
    </div>
  )
}

function Pill({ cor, bg, children }) {
  return (
    <span style={{
      fontSize: 14, fontWeight: 700, color: cor, background: bg,
      padding: '5px 12px', borderRadius: 99, fontVariantNumeric: 'tabular-nums',
    }}>{children}</span>
  )
}

function Banner({ T, dark, cor, icon, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: cor + '16', border: `1px solid ${cor}44`, borderRadius: R,
      padding: '14px 16px', fontSize: 14, color: T.textPrimary, lineHeight: 1.5,
    }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 20, color: cor, flexShrink: 0 }} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

function Nota({ T, dark, pad, children }) {
  return (
    <div style={{
      fontSize: 13, color: T.textMuted, lineHeight: 1.55,
      padding: pad ? '14px 22px' : 0,
      borderTop: pad ? `1px solid ${T.border}` : 'none',
      background: pad ? (dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC') : 'transparent',
    }}>{children}</div>
  )
}

function Vazio({ T, icon, texto }) {
  return (
    <div style={{ padding: '18px 8px', textAlign: 'center', color: T.textMuted }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 28, color: T.textDim }} aria-hidden="true" />
      <p style={{ fontSize: 14.5, margin: '10px 0 0', lineHeight: 1.5 }}>{texto}</p>
    </div>
  )
}

function Skeleton({ T, h }) {
  return <div style={{ height: h, borderRadius: R - 2, background: T.cardAlt, animation: 'idemaqPulse 1.2s ease-in-out infinite' }} />
}

function Code({ dark, children }) {
  return (
    <code style={{
      background: dark ? 'rgba(255,255,255,0.08)' : '#EBECF0',
      padding: '2px 6px', borderRadius: 5,
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 12.5,
    }}>{children}</code>
  )
}
