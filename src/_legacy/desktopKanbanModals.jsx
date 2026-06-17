// idemaq-src/_legacy/desktopKanbanModals.jsx
//
// Componentes herdados do App.jsx monolítico — extraídos verbatim em 14/05/2026.
// Visual e comportamento 100% idênticos ao original. Pendente de refatoração para o
// design system (idemaq-src/components/ui) — fazer em sessões futuras com o Claude Code.
//
// REDESIGN 16/05/2026 — Nova OS (Passo 1 + Passo 2 Atendimento) e cadastro de cliente.
//
// Inclui:
//   - NovaOSModal              (formulário de criação de OS — 3 tipos — REDESENHADO 16/05/2026)
//   - NovoClienteModalCompleto (cadastro completo de cliente — NOVO 16/05/2026)
//   - FormSecao                (sub-componente)
//   - ModalBase                (overlay genérico)
//   - BannerFinalizada         (banner de OS finalizada com reabertura)
//   - OSDetalhe                (modal de detalhe da OS — Resumo/Itens/Histórico/Pagamento)
//   - DetCard, Linha, DetMini, SubBox (helpers do OSDetalhe)

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../supabase'
import { criarClientePersist } from '../hooks/useClientes'
import NovoClienteModal from '../components/clientes/NovoClienteModal'
import { P } from '../theme'
import {
  TIPOS_OS, ETAPAS_TODOS, ZONAS, FUNCIONARIOS,
  CLIENTES_MOCK, ESTOQUE_MAQUINAS_MOCK,
  funcPorId,
} from '../utils/osData'
import {
  totalAPagar, estaPagaTotal, estaPagaParcial,
  calcStatusPrazo, diasPrazo,
  responsavelAtual,
  isAdmin, dentroGarantia,
} from '../utils/osHelpers'
import { fmtPrazoCurto } from '../utils/fmt'
import { corEtapa, bgEtapa } from '../utils/colors'
import Badge from '../components/ui/Badge'
import AddressInput from '../components/logistica/AddressInput'
import { OS_ITENS_MOCK } from '../_mocks/os'

// ─── Constantes do redesign da Nova OS ──────────────────────────────────────
const ORDEM_TIPOS_OS = ['atendimento', 'venda', 'fabricacao']
const TIPOS_EQUIPAMENTO = ['Máquina de Lavar', 'Lava e Seca', 'Tanquinho', 'Micro-ondas']
const MARCAS_EQUIPAMENTO = ['Brastemp', 'Electrolux', 'Consul', 'Outros']

// Adapta CLIENTES_MOCK (que tem `endereco: string`) para o formato novo (`enderecos: array`).
// Quando o Módulo 02 do roadmap entrar, isto vai para a tabela `cliente` do Supabase.
function adaptarClientesMock(lista) {
  return (lista || []).map(c => ({
    ...c,
    enderecos: c.enderecos && Array.isArray(c.enderecos) && c.enderecos.length > 0
      ? c.enderecos
      : (c.endereco ? [c.endereco] : []),
  }))
}

// Helper: texto curto do status de campos obrigatórios faltando no Passo 2.
function statusCamposFaltando(tipo, form) {
  if (tipo === 'atendimento') {
    if (!form.cliente) return 'selecione um cliente'
    return 'pronto para criar'
  }
  if (tipo === 'fabricacao') {
    if (!form.equipamentoTipo) return 'selecione o tipo da máquina'
    return 'pronto para criar'
  }
  if (tipo === 'venda') {
    if (!form.cliente) return 'selecione um cliente'
    if (!form.maquinaEstoque) return 'selecione uma máquina do estoque'
    return 'pronto para criar'
  }
  return ''
}

// ─── Modal: Novo Cliente Completo ───────────────────────────────────────────
// Cadastro completo de cliente. Usado como sub-modal a partir da Nova OS
// e também (futuramente) pela tela de Clientes.
// Props:
//   T, dark, onClose         — padrão
//   onSalvar(cliente)        — callback ao cadastrar, recebe o objeto novo
//   nomeInicial              — opcional, pré-preenche o nome (ex: vindo de busca)
//   mobile                   — bottom sheet no mobile

function NovoClienteModalCompleto({ T, dark, onClose, onSalvar, nomeInicial, mobile }) {
  const cor = (d, c) => dark ? d : c
  const [form, setForm] = useState({
    nome: nomeInicial || '',
    cpfCnpj: '',
    email: '',
    fone: '',
    foneSecundario: '',
    enderecos: [''], // sempre começa com 1
  })

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const updateEnd = (i, v) => setForm(f => {
    const novos = [...f.enderecos]
    novos[i] = v
    return { ...f, enderecos: novos }
  })
  const addEndereco = () => {
    setForm(f => f.enderecos.length >= 3 ? f : ({ ...f, enderecos: [...f.enderecos, ''] }))
  }
  const removerEndereco = (i) => {
    setForm(f => f.enderecos.length <= 1 ? f : ({ ...f, enderecos: f.enderecos.filter((_, idx) => idx !== i) }))
  }

  const podeSalvar = !!(form.nome.trim() && form.fone.trim() && form.enderecos[0]?.trim())

  function salvar() {
    if (!podeSalvar) return
    const novoCliente = {
      id: 'novo-' + Date.now(),
      nome: form.nome.trim(),
      cpfCnpj: form.cpfCnpj.trim(),
      email: form.email.trim(),
      fone: form.fone.trim(),
      foneSecundario: form.foneSecundario.trim(),
      enderecos: form.enderecos.filter(e => e.trim()),
      endereco: form.enderecos[0].trim(), // compat. com osData.js antigo
    }
    onSalvar?.(novoCliente)
    onClose()
  }

  const inputStyle = { width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${T.border}`, background:T.bg, color:T.textPrimary, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const miniLabel = { fontSize:10.5, color:T.textMuted, marginBottom:5, fontWeight:600, letterSpacing:'.3px', display:'flex', alignItems:'center', gap:6 }
  const opcionalChip = <span style={{ fontSize:10, color:T.textDim, fontWeight:400 }}>— opcional</span>
  const asterisco = <span style={{ fontSize:10, color:cor(P.red, P.redDark), fontWeight:700 }}>*</span>

  const faltando = [
    !form.nome.trim() && 'Nome',
    !form.fone.trim() && 'Telefone',
    !form.enderecos[0]?.trim() && 'Endereço 1',
  ].filter(Boolean)

  return (
    <ModalBase T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={560}>
      {/* Header */}
      <div style={{ padding:'14px 20px 12px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="ti ti-user-plus" style={{ fontSize:18, color:'#fff' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>Novo cliente</div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:1, display:'flex', alignItems:'center', gap:6 }}>
              <span>Cadastro completo</span>
              <span style={{ width:3, height:3, background:T.textMuted, borderRadius:'50%' }} />
              {faltando.length > 0 ? (
                <span style={{ color:cor(P.red, P.redDark) }}>falta: {faltando.join(', ')}</span>
              ) : (
                <span style={{ color:cor(P.blue, P.blueDark) }}>pronto para salvar</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar"
          style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:6, borderRadius:6, fontSize:0, lineHeight:0 }}>
          <i className="ti ti-x" style={{ fontSize:20 }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>

        {/* Dados pessoais */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <i className="ti ti-user" style={{ fontSize:15, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Dados pessoais</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ gridColumn:'1 / -1' }}>
              <label style={miniLabel}>NOME COMPLETO {asterisco}</label>
              <input value={form.nome} onChange={e=>update('nome', e.target.value)} placeholder="Ex: Maria Silva" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={miniLabel}>CPF / CNPJ {opcionalChip}</label>
              <input value={form.cpfCnpj} onChange={e=>update('cpfCnpj', e.target.value)} placeholder="000.000.000-00" style={inputStyle} />
            </div>
            <div>
              <label style={miniLabel}>E-MAIL {opcionalChip}</label>
              <input type="email" value={form.email} onChange={e=>update('email', e.target.value)} placeholder="maria@email.com" style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ height:1, background:T.border, margin:'18px 0' }} />

        {/* Contato */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <i className="ti ti-phone" style={{ fontSize:15, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Contato</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={miniLabel}>TELEFONE PRINCIPAL {asterisco}</label>
              <input type="tel" value={form.fone} onChange={e=>update('fone', e.target.value)} placeholder="(67) 9 0000-0000" style={inputStyle} />
              <div style={{ fontSize:10.5, color:cor(P.blue, P.blueDark), marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                <i className="ti ti-brand-whatsapp" style={{ fontSize:12 }} aria-hidden="true" />
                WhatsApp principal
              </div>
            </div>
            <div>
              <label style={miniLabel}>TELEFONE SECUNDÁRIO {opcionalChip}</label>
              <input type="tel" value={form.foneSecundario} onChange={e=>update('foneSecundario', e.target.value)} placeholder="(67) 9 0000-0000" style={inputStyle} />
              <div style={{ fontSize:10.5, color:T.textMuted, marginTop:4 }}>Esposo(a), parente, recado</div>
            </div>
          </div>
        </div>

        <div style={{ height:1, background:T.border, margin:'18px 0' }} />

        {/* Endereços */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <i className="ti ti-map-pin" style={{ fontSize:15, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Endereço 1</span>
            <span style={{ fontSize:10, color:cor(P.red, P.redDark), fontWeight:700 }}>OBRIGATÓRIO</span>
          </div>
          <AddressInput
            T={T} dark={dark}
            label=""
            placeholder="Rua, número, bairro — cidade/UF"
            value={form.enderecos[0] || ''}
            onChange={({ endereco }) => updateEnd(0, endereco)}
          />

          {/* Endereços extras */}
          {form.enderecos.slice(1).map((end, idx) => {
            const realIdx = idx + 1
            return (
              <div key={realIdx} style={{ marginTop:12, padding:12, background:T.cardAlt, border:`1px solid ${T.border}`, borderRadius:9 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <i className="ti ti-map-pin" style={{ fontSize:14, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
                    <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Endereço {realIdx + 1}</span>
                    <span style={{ fontSize:10, color:T.textDim }}>opcional</span>
                  </div>
                  <button onClick={()=>removerEndereco(realIdx)}
                    style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:4, display:'flex', alignItems:'center', gap:3, fontSize:11 }}>
                    <i className="ti ti-trash" style={{ fontSize:13 }} aria-hidden="true" /> Remover
                  </button>
                </div>
                <AddressInput
                  T={T} dark={dark}
                  label=""
                  placeholder="Rua, número, bairro — cidade/UF"
                  value={end}
                  onChange={({ endereco }) => updateEnd(realIdx, endereco)}
                />
              </div>
            )
          })}

          {form.enderecos.length < 3 && (
            <button onClick={addEndereco}
              style={{ marginTop:12, width:'100%', background:'transparent', color:cor(P.blue, P.blueDark), border:`1px dashed ${T.border}`, padding:'11px 12px', borderRadius:8, fontSize:12.5, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer' }}>
              <i className="ti ti-plus" style={{ fontSize:15 }} aria-hidden="true" />
              Adicionar outro endereço
            </button>
          )}
          <div style={{ fontSize:10.5, color:T.textMuted, textAlign:'center', marginTop:6 }}>
            até 3 endereços — útil pra clientes com casa e comércio
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ padding:'12px 20px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'flex-end', gap:8, background:T.cardAlt, flexShrink:0 }}>
        <button onClick={onClose}
          style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${T.border}`, background:'transparent', color:T.textSecondary, fontSize:12.5, cursor:'pointer', fontWeight:500 }}>
          Cancelar
        </button>
        <button onClick={salvar} disabled={!podeSalvar}
          style={{ padding:'9px 18px', borderRadius:8, border:'none', background: podeSalvar?`linear-gradient(135deg,${P.blue},#3a7bbf)`:T.cardAlt, color: podeSalvar?'#fff':T.textDim, fontSize:12.5, cursor: podeSalvar?'pointer':'not-allowed', fontWeight:600, display:'flex', alignItems:'center', gap:5, opacity: podeSalvar?1:.7 }}>
          <i className="ti ti-check" style={{ fontSize:15 }} aria-hidden="true" /> Cadastrar cliente
        </button>
      </div>
    </ModalBase>
  )
}

// ─── Modal: Nova OS (redesenhado em 16/05/2026) ─────────────────────────────

function NovaOSModal({ T, dark, onClose, tipoInicial, mobile, notify, onCriada, maquinasEstoque }) {
  const cor = (d, c) => dark ? d : c
  const [tipo, setTipo] = useState(tipoInicial || 'atendimento')
  const [tipoMenuAberto, setTipoMenuAberto] = useState(false)

  // Busca de cliente: agora vem do Supabase (com debounce). Local state guarda os
  // resultados da última query + flag de loading pro spinner do input.
  const [clientesAchados, setClientesAchados] = useState([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    cliente:'', clienteId:null, fone:'',
    enderecoSelecionado:'',   // endereço escolhido pra esta OS (string)
    enderecoIndex:0,          // índice do endereço selecionado (radio)
    enderecosDisponiveis: [], // endereços do cliente escolhido (vem da busca)
    // Pré-selecionado pro Atendimento (tipo de máquina mais comum). Pros outros tipos,
    // começa vazio e o select mantém a opção "Selecione…".
    equipamentoTipo: (tipoInicial || 'atendimento') === 'atendimento' ? 'Máquina de Lavar' : '',
    equipamentoMarca:'',      // dropdown
    equipamentoMarcaOutros:'',// campo extra quando marca = "Outros"
    equipamentoModelo:'',
    equipamentoSerie:'',
    defeito:'',
    data:'', hora:'',
    maquinaEstoque:'', valor:'',
    observacoes:'',
    // Campos antigos preservados pra compat. com salvar/Supabase futuro
    endereco:'', equipamento:'',
  })
  const [buscaCli, setBuscaCli] = useState('')
  const [modalNovoCli, setModalNovoCli] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Debounce de 250ms. Dispara com 2+ chars (evita query nas 782 linhas com 1 letra).
  // 2 queries paralelas (nome ILIKE + telefone ILIKE) + dedupe por id. Trocamos
  // .or() pra fugir de bugs de escaping do PostgREST com chars especiais no termo.
  // RLS na tabela `cliente` exige usuário logado — se vier 0 sem erro, é provável
  // policy. Log no console pra debug.
  useEffect(() => {
    const termo = buscaCli.trim()
    if (termo.length < 2) {
      setClientesAchados([])
      setLoadingClientes(false)
      return
    }
    setLoadingClientes(true)
    const safe = termo.replace(/[,()%_]/g, ' ').trim()
    const handle = setTimeout(async () => {
      try {
        const [resNome, resFone] = await Promise.all([
          supabase.from('cliente').select('id, nome, telefone, endereco, endereco2, endereco3')
            .is('deleted_at', null).ilike('nome', `%${safe}%`)
            .order('nome', { ascending: true }).limit(20),
          supabase.from('cliente').select('id, nome, telefone, endereco, endereco2, endereco3')
            .is('deleted_at', null).ilike('telefone', `%${safe}%`)
            .order('nome', { ascending: true }).limit(20),
        ])
        if (resNome.error) throw resNome.error
        if (resFone.error) throw resFone.error
        const dedupe = new Map()
        ;[...(resNome.data || []), ...(resFone.data || [])].forEach(c => dedupe.set(c.id, c))
        const adapted = Array.from(dedupe.values()).slice(0, 20).map(c => ({
          id: c.id, nome: c.nome,
          fone: c.telefone || '',
          endereco: c.endereco || '',
          enderecos: [c.endereco, c.endereco2, c.endereco3].filter(Boolean),
        }))
        console.log('[NovaOS] busca cliente', { termo, achados: adapted.length, nome: resNome.data?.length, fone: resFone.data?.length })
        setClientesAchados(adapted)
      } catch (e) {
        console.error('[NovaOS] busca cliente erro:', e)
        notify?.('erro', `Erro buscando clientes: ${e?.message || e}`)
        setClientesAchados([])
      } finally {
        setLoadingClientes(false)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [buscaCli, notify])

  const clientesFiltrados = clientesAchados
  const buscaTemTexto = buscaCli.trim().length > 0
  const mostrarDropdown = buscaTemTexto && (loadingClientes || clientesFiltrados.length > 0 || (!loadingClientes && clientesFiltrados.length === 0))

  function escolherCliente(c) {
    const enderecos = c.enderecos && c.enderecos.length > 0 ? c.enderecos : (c.endereco ? [c.endereco] : [])
    setForm(f => ({
      ...f,
      cliente: c.nome,
      clienteId: c.id,
      fone: c.fone || '',
      enderecoSelecionado: enderecos[0] || '',
      enderecoIndex: 0,
      enderecosDisponiveis: enderecos,
      endereco: enderecos[0] || '', // compat
    }))
    setBuscaCli('')
    setClientesAchados([])
  }

  function trocarCliente() {
    setForm(f => ({ ...f, cliente:'', clienteId:null, fone:'', enderecoSelecionado:'', enderecoIndex:0, enderecosDisponiveis:[], endereco:'' }))
    setBuscaCli('')
    setClientesAchados([])
  }

  // Chamado pelo NovoClienteModal após salvar no banco (data = linha real do Supabase)
  function clienteCriadoNovo(data) {
    escolherCliente({
      id:       data.id,
      nome:     data.nome,
      fone:     data.telefone || '',
      endereco: data.endereco || '',
      enderecos: [data.endereco, data.endereco2, data.endereco3].filter(Boolean),
    })
  }

  const enderecosCliente = form.enderecosDisponiveis || []

  // Fecha o dropdown de tipo ao clicar fora ou apertar Escape.
  // Escape usa capture + stopPropagation pra não fechar o modal junto.
  useEffect(() => {
    if (!tipoMenuAberto) return
    function onDocClick(e) {
      if (!e.target.closest('[data-tipo-menu]')) setTipoMenuAberto(false)
    }
    function onEscape(e) {
      if (e.key === 'Escape') { e.stopPropagation(); setTipoMenuAberto(false) }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEscape, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEscape, true)
    }
  }, [tipoMenuAberto])

  function escolherTipo(novo) {
    setTipo(novo)
    setTipoMenuAberto(false)
  }

  async function salvar() {
    if (!podeAvancar || salvando) return
    setSalvando(true)
    try {
      const marcaFinal = form.equipamentoMarca === 'Outros' ? form.equipamentoMarcaOutros : form.equipamentoMarca
      const etapaInicial = form.data ? 'agendamento' : 'aguardando_agendamento'
      // Combina data + hora em ISO, assumindo timezone local de Cuiabá (UTC-4).
      // Hora vazia → default 08:00 (turno da manhã, padrão da equipe).
      const dataAgIso = form.data
        ? new Date(`${form.data}T${form.hora || '08:00'}:00-04:00`).toISOString()
        : null

      // Schema flat da tabela `os` (sem JSONB de equipamento — colunas separadas).
      // Campos sem coluna conhecida (tipo_equipamento, maquinaEstoque) ficam de
      // fora; trigger preenche numero/criado_em/por. Colunas de equipamento
      // aplicadas via sql/10-os-equipamento.sql em 20/05/2026.
      const payload = {
        tipo,
        etapa: etapaInicial,
        cliente_id: form.clienteId || null,
        marca_equipamento: marcaFinal || null,
        modelo_equipamento: form.equipamentoModelo?.trim() || null,
        numero_serie: form.equipamentoSerie?.trim() || null,
        defeito_relatado: form.defeito?.trim() || null,
        data_agendamento: dataAgIso,
      }
      if (tipo === 'fabricacao' && form.valor) {
        const v = parseFloat(String(form.valor).replace(',', '.'))
        if (!isNaN(v)) payload.valor_total = v
      }

      const { data, error: err } = await supabase
        .from('os')
        .insert(payload)
        .select('id, numero')
        .single()

      if (err) throw err

      if (tipo === 'atendimento') {
        const itensPadrao = [
          { os_id: data.id, categoria: 'servico', nome: 'Limpeza',      quantidade: 1, valor_unitario: 165 },
          { os_id: data.id, categoria: 'servico', nome: 'Manutenção',   quantidade: 1, valor_unitario: 165 },
          { os_id: data.id, categoria: 'desloc',  nome: 'Deslocamento', quantidade: 1, valor_unitario: 20  },
        ]
        const { error: errItens } = await supabase.from('os_item').insert(itensPadrao)
        if (errItens) console.warn('[NovaOS] itens padrão falharam:', errItens)
      }

      notify?.('ok', `OS #${data.numero} criada`)
      onCriada?.()
      onClose()
    } catch (e) {
      notify?.('erro', `Erro ao criar OS: ${e?.message || 'desconhecido'}`)
      console.error('[NovaOS] erro ao salvar:', e)
    } finally {
      setSalvando(false)
    }
  }

  const corTipo = corEtapa(TIPOS_OS[tipo].cor, dark)
  const inputStyle = { width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${T.border}`, background:T.bg, color:T.textPrimary, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const labelStyle = { fontSize:10.5, color:T.textMuted, display:'block', marginBottom:5, fontWeight:600, letterSpacing:'.3px' }
  const opcionalChip = <span style={{ fontSize:10, color:T.textDim, fontWeight:400 }}>opcional</span>

  // Regras de obrigatórios POR TIPO (só Cliente é obrigatório no Atendimento)
  const podeAvancar =
    tipo === 'atendimento' ? !!form.cliente :
    tipo === 'fabricacao'  ? !!form.equipamentoTipo :
    tipo === 'venda'       ? !!(form.cliente && form.maquinaEstoque) : false

  return (
    <ModalBase T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={720}>
      {/* Header */}
      <div style={{ padding:'14px 20px 12px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, minWidth:0, flex:1 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${corTipo},${corTipo}dd)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .2s' }}>
            <i className={`ti ${TIPOS_OS[tipo].icon}`} style={{ fontSize:19, color:'#fff' }} aria-hidden="true" />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>Nova ordem de serviço</div>

            {/* Linha do tipo + status */}
            <div style={{ marginTop:5, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {/* Botão sutil de tipo + dropdown */}
              <div data-tipo-menu style={{ position:'relative' }}>
                <button onClick={()=>setTipoMenuAberto(v=>!v)}
                  style={{
                    background: tipoMenuAberto ? cor('#0d2035','#e6f1fb') : 'transparent',
                    border:`1px solid ${tipoMenuAberto ? cor(P.blue, P.blueDark) : T.border}`,
                    padding:'3px 9px 3px 7px', borderRadius:6,
                    display:'flex', alignItems:'center', gap:5,
                    cursor:'pointer', fontFamily:'inherit',
                    transition:'background .15s, border-color .15s',
                  }}>
                  <i className={`ti ${TIPOS_OS[tipo].icon}`} style={{ fontSize:12, color:corTipo }} aria-hidden="true" />
                  <span style={{ fontSize:11, fontWeight:500, color: tipoMenuAberto ? cor(P.blue, P.blueDark) : T.textSecondary }}>
                    {TIPOS_OS[tipo].label}
                  </span>
                  <i className={`ti ${tipoMenuAberto ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                     style={{ fontSize:12, color: tipoMenuAberto ? cor(P.blue, P.blueDark) : T.textMuted }} aria-hidden="true" />
                </button>

                {tipoMenuAberto && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:5,
                    background:T.cardAlt, border:`1px solid ${T.border}`, borderRadius:9,
                    padding:6, minWidth:240,
                    boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,.12)',
                  }}>
                    {ORDEM_TIPOS_OS.map(id => {
                      const cfg = TIPOS_OS[id]
                      if (!cfg) return null
                      const ativo = id === tipo
                      const c = corEtapa(cfg.cor, dark)
                      const descCurta =
                        id === 'atendimento' ? 'Máquina do cliente' :
                        id === 'venda'       ? 'Máquina do estoque' :
                        id === 'fabricacao'  ? 'Máquina nova pro estoque' : ''
                      return (
                        <button key={id} onClick={()=>escolherTipo(id)}
                          onMouseEnter={e => { if (!ativo) e.currentTarget.style.background = T.bg }}
                          onMouseLeave={e => { if (!ativo) e.currentTarget.style.background = 'transparent' }}
                          style={{
                            width:'100%',
                            padding:'9px 11px', borderRadius:6,
                            display:'flex', alignItems:'center', gap:10,
                            cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                            background: ativo ? cor('#0d2035','#e6f1fb') : 'transparent',
                            border: ativo ? `1px solid ${cor(P.blue, P.blueDark)}` : '1px solid transparent',
                            transition:'background .12s',
                          }}>
                          <div style={{ width:30, height:30, borderRadius:7, background:c+'2e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <i className={`ti ${cfg.icon}`} style={{ fontSize:16, color:c }} aria-hidden="true" />
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12.5, fontWeight:600, color:T.textPrimary }}>{cfg.label}</div>
                            <div style={{ fontSize:10.5, color:T.textMuted, marginTop:1 }}>{descCurta}</div>
                          </div>
                          {ativo && <i className="ti ti-check" style={{ fontSize:14, color:cor(P.blue, P.blueDark), flexShrink:0 }} aria-hidden="true" />}
                        </button>
                      )
                    })}
                    <div style={{ height:1, background:T.border, margin:'6px 0' }} />
                    <div style={{ padding:'6px 11px', fontSize:10.5, color:T.textMuted, display:'flex', alignItems:'center', gap:6 }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize:12, color:corEtapa('yellow', dark), flexShrink:0 }} aria-hidden="true" />
                      <span>Trocar o tipo pode pedir campos diferentes</span>
                    </div>
                  </div>
                )}
              </div>

              <span style={{ width:3, height:3, background:T.textMuted, borderRadius:'50%' }} />
              <span style={{ fontSize:11, color: podeAvancar ? cor(P.blue, P.blueDark) : T.textMuted }}>
                {statusCamposFaltando(tipo, form)}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar"
          style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:6, borderRadius:6, fontSize:0, lineHeight:0, flexShrink:0 }}>
          <i className="ti ti-x" style={{ fontSize:20 }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>

        {/* ────── Atendimento ────── */}
        {tipo === 'atendimento' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* CLIENTE */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <i className="ti ti-user" style={{ fontSize:15, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
                <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Cliente</span>
                <span style={{ fontSize:10, color:cor(P.red, P.redDark), fontWeight:700 }}>OBRIGATÓRIO</span>
              </div>

              {!form.cliente ? (
                <div style={{ position:'relative' }}>
                  <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente por nome ou telefone…" style={inputStyle} autoFocus />
                  {loadingClientes && (
                    <i className="ti ti-loader-2" aria-hidden="true"
                      style={{ position:'absolute', right:10, top:18, fontSize:14, color:T.textMuted, animation:'idemaq-spin 0.8s linear infinite' }} />
                  )}
                  {mostrarDropdown && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:T.card, border:`1px solid ${T.border}`, borderRadius:8, maxHeight:240, overflowY:'auto', zIndex:10, boxShadow:dark?'0 8px 24px rgba(0,0,0,.4)':'0 4px 16px rgba(0,0,0,.1)' }}>
                      {loadingClientes && clientesFiltrados.length === 0 && (
                        <div style={{ padding:'10px 12px', fontSize:12, color:T.textMuted, display:'flex', alignItems:'center', gap:7 }}>
                          <i className="ti ti-loader-2" style={{ fontSize:13, animation:'idemaq-spin 0.8s linear infinite' }} aria-hidden="true" />
                          Buscando…
                        </div>
                      )}
                      {!loadingClientes && clientesFiltrados.length === 0 && (
                        <div style={{ padding:'10px 12px', fontSize:12, color:T.textMuted, display:'flex', alignItems:'center', gap:7 }}>
                          <i className="ti ti-mood-empty" style={{ fontSize:14 }} aria-hidden="true" />
                          Nenhum cliente encontrado pra "{buscaCli.trim()}"
                        </div>
                      )}
                      {clientesFiltrados.map(c => (
                        <div key={c.id} onClick={()=>escolherCliente(c)}
                          style={{ padding:'9px 12px', cursor:'pointer', borderBottom:`1px solid ${T.border}`, fontSize:12.5 }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.cardAlt}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ color:T.textPrimary, fontWeight:600 }}>{c.nome}</div>
                          <div style={{ color:T.textMuted, fontSize:11, marginTop:2 }}>
                            {c.fone || '— sem telefone —'} · {(c.enderecos?.length || 0)} endereço(s)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop:10, fontSize:11.5, color:T.textMuted }}>
                    Não achou? <button onClick={()=>setModalNovoCli(true)}
                      style={{ background:'transparent', border:'none', color:cor(P.blue, P.blueDark), cursor:'pointer', fontSize:11.5, fontWeight:600, padding:0, textDecoration:'underline' }}>+ Cadastrar novo cliente</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Card do cliente selecionado */}
                  <div style={{ background:cor('#0d2035','#e6f1fb'), border:`1px solid ${cor(P.blue, P.blueDark)}`, borderRadius:9, padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:T.textPrimary }}>{form.cliente}</div>
                      <div style={{ fontSize:11.5, color:T.textSecondary, marginTop:2 }}>
                        <i className="ti ti-phone" style={{ fontSize:11, verticalAlign:-1 }} aria-hidden="true" /> {form.fone || '—'}
                        <span style={{ margin:'0 6px', opacity:.5 }}>•</span>
                        <i className="ti ti-map-pin" style={{ fontSize:11, verticalAlign:-1 }} aria-hidden="true" /> {enderecosCliente.length} endereço(s) cadastrado(s)
                      </div>
                    </div>
                    <button onClick={trocarCliente}
                      style={{ background:'transparent', color:cor(P.blue, P.blueDark), border:`1px solid ${T.border}`, padding:'5px 9px', borderRadius:6, fontSize:11, display:'flex', alignItems:'center', gap:4, cursor:'pointer', flexShrink:0 }}>
                      <i className="ti ti-pencil" style={{ fontSize:12 }} aria-hidden="true" /> Trocar
                    </button>
                  </div>

                  {/* Endereço da coleta (radio entre endereços do cliente) */}
                  {enderecosCliente.length > 0 && (
                    <div style={{ marginTop:14 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                        <i className="ti ti-map-pin" style={{ fontSize:14, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
                        <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Endereço da coleta</span>
                        <span style={{ fontSize:10, color:cor(P.red, P.redDark), fontWeight:700 }}>*</span>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {enderecosCliente.map((end, idx) => {
                          const sel = form.enderecoIndex === idx
                          return (
                            <button key={idx} onClick={()=>setForm(f=>({ ...f, enderecoIndex:idx, enderecoSelecionado:end, endereco:end }))}
                              style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
                                background: sel ? cor('#0d2035','#e6f1fb') : 'transparent',
                                border:`${sel?1.5:1}px solid ${sel ? cor(P.blue, P.blueDark) : T.border}`,
                                borderRadius:9, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                              <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${sel ? cor(P.blue, P.blueDark) : T.textDim}`, background: sel ? cor(P.blue, P.blueDark) : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                                {sel && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }} />}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
                                  <span style={{ fontSize:12, fontWeight:600, color:T.textPrimary }}>Endereço {idx+1}</span>
                                  {idx===0 && <span style={{ fontSize:9.5, padding:'2px 6px', background:cor(P.blue,P.blueDark)+'2c', color:cor(P.blue, P.blueDark), borderRadius:4, fontWeight:600, letterSpacing:'.3px' }}>PRINCIPAL</span>}
                                </div>
                                <div style={{ fontSize:12, color:T.textSecondary, lineHeight:1.4 }}>{end}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ height:1, background:T.border, margin:'2px 0' }} />

            {/* EQUIPAMENTO (opcional, 4 campos) */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                <i className="ti ti-device-washing-machine" style={{ fontSize:15, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
                <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Equipamento</span>
                <span style={{ fontSize:10, color:T.textDim }}>opcional · pode preencher quando a máquina chegar</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:10 }}>
                <div>
                  <label style={labelStyle}>TIPO</label>
                  <select value={form.equipamentoTipo} onChange={e=>update('equipamentoTipo', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}}>
                    {TIPOS_EQUIPAMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>MARCA</label>
                  <select value={form.equipamentoMarca} onChange={e=>update('equipamentoMarca', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}}>
                    <option value="">Selecione…</option>
                    {MARCAS_EQUIPAMENTO.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {form.equipamentoMarca === 'Outros' && (
                  <div style={{ gridColumn: mobile ? '1' : '1 / -1' }}>
                    <label style={labelStyle}>NOME DA MARCA</label>
                    <input value={form.equipamentoMarcaOutros} onChange={e=>update('equipamentoMarcaOutros', e.target.value.toUpperCase())} placeholder="Ex: MUELLER, SUGGAR, MONDIAL…" style={inputStyle} />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>MODELO</label>
                  <input value={form.equipamentoModelo} onChange={e=>update('equipamentoModelo', e.target.value.toUpperCase())} placeholder="Ex: BWK11" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Nº DE SÉRIE</label>
                  <input value={form.equipamentoSerie} onChange={e=>update('equipamentoSerie', e.target.value.toUpperCase())} placeholder="Ex: SN-12345" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* DEFEITO RELATADO */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <i className="ti ti-message-circle" style={{ fontSize:15, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
                <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Defeito relatado pelo cliente</span>
                {opcionalChip}
              </div>
              <textarea value={form.defeito} onChange={e=>update('defeito', e.target.value)} placeholder="Descreva o que o cliente reportou…" style={{...inputStyle, minHeight:64, resize:'vertical'}} />
            </div>

            <div style={{ height:1, background:T.border, margin:'2px 0' }} />

            {/* AGENDAMENTO */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <i className="ti ti-calendar-event" style={{ fontSize:15, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
                <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Agendamento da coleta</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={labelStyle}>DATA</label>
                  <input type="date" value={form.data} onChange={e=>update('data', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
                <div>
                  <label style={labelStyle}>HORA</label>
                  <input type="time" value={form.hora} onChange={e=>update('hora', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
              </div>

              <div style={{ marginTop:10, background:cor('#0d2035','#e6f1fb'), borderLeft:`3px solid ${cor(P.blue, P.blueDark)}`, borderRadius:4, padding:'8px 12px', fontSize:11.5, color:T.textSecondary, lineHeight:1.4, display:'flex', alignItems:'center', gap:8 }}>
                <i className="ti ti-info-circle" style={{ fontSize:14, color:cor(P.blue, P.blueDark), flexShrink:0 }} aria-hidden="true" />
                <span>Sem data marcada? A OS abre como <strong style={{color:T.textPrimary, fontWeight:600}}>Aguardando agendamento</strong>.</span>
              </div>
            </div>

            {/* OBSERVAÇÕES */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <i className="ti ti-notes" style={{ fontSize:15, color:cor(P.blue, P.blueDark) }} aria-hidden="true" />
                <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, letterSpacing:'.4px', textTransform:'uppercase' }}>Observações</span>
                {opcionalChip}
              </div>
              <textarea value={form.observacoes} onChange={e=>update('observacoes', e.target.value)} placeholder="Qualquer informação extra que ajude a equipe…" style={{...inputStyle, minHeight:50, resize:'vertical'}} />
            </div>
          </div>
        )}

        {/* ────── Fabricação (mantém estrutura antiga, só ajustado o tipo dropdown) ────── */}
        {tipo === 'fabricacao' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:bgEtapa('yellow', dark), border:`1px solid ${corEtapa('yellow', dark)}44`, borderRadius:8, padding:'10px 12px', fontSize:12, color:T.textSecondary, lineHeight:1.5 }}>
              <i className="ti ti-info-circle" style={{ fontSize:14, color:corEtapa('yellow', dark), marginRight:6, verticalAlign:'middle' }} aria-hidden="true" />
              <strong style={{color:T.textPrimary}}>Fabricação:</strong> máquina nova para o estoque. Os itens usados saem do estoque automaticamente ao concluir e a máquina entra como produto pronto, com o custo total calculado.
            </div>

            <FormSecao titulo="Máquina a fabricar" icon="ti-building-factory-2" T={T}>
              <label style={labelStyle}>TIPO</label>
              <select value={form.equipamentoTipo} onChange={e=>update('equipamentoTipo', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}}>
                <option value="">Selecione…</option>
                {TIPOS_EQUIPAMENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label style={{...labelStyle, marginTop:10}}>DESCRIÇÃO / ESTADO INICIAL</label>
              <textarea value={form.defeito} onChange={e=>update('defeito', e.target.value)} style={{...inputStyle, minHeight:64, resize:'vertical'}} placeholder="Ex: Estrutura ok, trocar rolamento, polia e colocar capa nova" />
              <label style={{...labelStyle, marginTop:10}}>CUSTO INICIAL DA MÁQUINA BASE (R$)</label>
              <input type="number" value={form.valor} onChange={e=>update('valor', e.target.value)} style={inputStyle} placeholder="150,00" />
            </FormSecao>
          </div>
        )}

        {/* ────── Venda ────── */}
        {tipo === 'venda' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:bgEtapa('green', dark), border:`1px solid ${corEtapa('green', dark)}44`, borderRadius:8, padding:'10px 12px', fontSize:12, color:T.textSecondary, lineHeight:1.5 }}>
              <i className="ti ti-info-circle" style={{ fontSize:14, color:corEtapa('green', dark), marginRight:6, verticalAlign:'middle' }} aria-hidden="true" />
              <strong style={{color:T.textPrimary}}>Venda:</strong> máquina pronta do estoque. O comprador vira cliente cadastrado automaticamente.
            </div>

            <FormSecao titulo="Cliente comprador" icon="ti-user" T={T}>
              {!form.cliente ? (
                <div style={{ position:'relative' }}>
                  <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente por nome ou telefone…" style={inputStyle} autoFocus />
                  {loadingClientes && (
                    <i className="ti ti-loader-2" aria-hidden="true"
                      style={{ position:'absolute', right:10, top:18, fontSize:14, color:T.textMuted, animation:'idemaq-spin 0.8s linear infinite' }} />
                  )}
                  {mostrarDropdown && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:T.card, border:`1px solid ${T.border}`, borderRadius:7, maxHeight:220, overflowY:'auto', zIndex:10 }}>
                      {loadingClientes && clientesFiltrados.length === 0 && (
                        <div style={{ padding:'9px 11px', fontSize:12, color:T.textMuted, display:'flex', alignItems:'center', gap:7 }}>
                          <i className="ti ti-loader-2" style={{ fontSize:13, animation:'idemaq-spin 0.8s linear infinite' }} aria-hidden="true" />
                          Buscando…
                        </div>
                      )}
                      {!loadingClientes && clientesFiltrados.length === 0 && (
                        <div style={{ padding:'9px 11px', fontSize:12, color:T.textMuted, display:'flex', alignItems:'center', gap:7 }}>
                          <i className="ti ti-mood-empty" style={{ fontSize:14 }} aria-hidden="true" />
                          Nenhum cliente encontrado pra "{buscaCli.trim()}"
                        </div>
                      )}
                      {clientesFiltrados.map(c => (
                        <div key={c.id} onClick={()=>escolherCliente(c)} style={{ padding:'8px 11px', cursor:'pointer', borderBottom:`1px solid ${T.border}`, fontSize:12.5 }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.cardAlt}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ color:T.textPrimary, fontWeight:600 }}>{c.nome}</div>
                          <div style={{ color:T.textMuted, fontSize:11 }}>{c.fone || '— sem telefone —'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop:8, fontSize:11.5, color:T.textMuted }}>
                    Cliente novo? <button onClick={()=>setModalNovoCli(true)} style={{ background:'transparent', border:'none', color:cor(P.blue,P.blueDark), cursor:'pointer', fontSize:11.5, fontWeight:600, padding:0, textDecoration:'underline' }}>+ Cadastrar agora</button>
                  </div>
                </div>
              ) : (
                <div style={{ background:cor('#0d2035','#e6f1fb'), border:`1px solid ${cor(P.blue, P.blueDark)}`, borderRadius:9, padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:T.textPrimary }}>{form.cliente}</div>
                    <div style={{ fontSize:11.5, color:T.textSecondary, marginTop:2 }}>
                      <i className="ti ti-phone" style={{ fontSize:11, verticalAlign:-1 }} aria-hidden="true" /> {form.fone || '—'}
                    </div>
                  </div>
                  <button onClick={trocarCliente}
                    style={{ background:'transparent', color:cor(P.blue, P.blueDark), border:`1px solid ${T.border}`, padding:'5px 9px', borderRadius:6, fontSize:11, display:'flex', alignItems:'center', gap:4, cursor:'pointer', flexShrink:0 }}>
                    <i className="ti ti-pencil" style={{ fontSize:12 }} aria-hidden="true" /> Trocar
                  </button>
                </div>
              )}
            </FormSecao>

            <FormSecao titulo="Máquina do estoque" icon="ti-package" T={T}>
              <label style={labelStyle}>SELECIONE A MÁQUINA</label>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {(maquinasEstoque || ESTOQUE_MAQUINAS_MOCK).map(m => {
                  const sel = form.maquinaEstoque === m.id
                  return (
                    <button key={m.id} onClick={()=>setForm(f=>({ ...f, maquinaEstoque:m.id, equipamento:m.descricao, valor:m.valor }))}
                      style={{ padding:'10px 12px', borderRadius:7, border:`1px solid ${sel?corEtapa('green',dark):T.border}`, background:sel?bgEtapa('green',dark):T.bg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left' }}>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:T.textPrimary }}>{m.descricao}</div>
                        <div style={{ fontSize:10.5, color:T.textMuted, marginTop:2 }}>#{m.id}</div>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:sel?corEtapa('green',dark):T.textSecondary, fontVariantNumeric:'tabular-nums' }}>R$ {m.valor.toLocaleString('pt-BR')}</div>
                    </button>
                  )
                })}
              </div>
            </FormSecao>

            <FormSecao titulo="Endereço e agendamento da entrega" icon="ti-truck-delivery" T={T}>
              {enderecosCliente.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                  {enderecosCliente.map((end, idx) => {
                    const sel = form.enderecoIndex === idx
                    return (
                      <button key={idx} onClick={()=>setForm(f=>({ ...f, enderecoIndex:idx, enderecoSelecionado:end, endereco:end }))}
                        style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
                          background: sel ? cor('#0d2035','#e6f1fb') : 'transparent',
                          border:`${sel?1.5:1}px solid ${sel ? cor(P.blue, P.blueDark) : T.border}`,
                          borderRadius:9, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                        <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${sel ? cor(P.blue, P.blueDark) : T.textDim}`, background: sel ? cor(P.blue, P.blueDark) : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                          {sel && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:T.textPrimary, marginBottom:2 }}>Endereço {idx+1}</div>
                          <div style={{ fontSize:12, color:T.textSecondary, lineHeight:1.4 }}>{end}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={labelStyle}>DATA</label>
                  <input type="date" value={form.data} onChange={e=>update('data', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
                <div>
                  <label style={labelStyle}>HORA</label>
                  <input type="time" value={form.hora} onChange={e=>update('hora', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
              </div>
            </FormSecao>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ padding:'12px 20px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'flex-end', gap:8, background:T.cardAlt, flexShrink:0 }}>
        <button onClick={onClose}
          style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${T.border}`, background:'transparent', color:T.textSecondary, fontSize:12.5, cursor:'pointer', fontWeight:500 }}>
          Cancelar
        </button>
        <button onClick={salvar} disabled={!podeAvancar || salvando}
          style={{ padding:'9px 18px', borderRadius:8, border:'none', background: (podeAvancar && !salvando)?`linear-gradient(135deg,${P.blue},#3a7bbf)`:T.cardAlt, color: (podeAvancar && !salvando)?'#fff':T.textDim, fontSize:12.5, cursor: (podeAvancar && !salvando)?'pointer':'not-allowed', fontWeight:600, display:'flex', alignItems:'center', gap:5, opacity: (podeAvancar && !salvando)?1:.7 }}>
          <i className={`ti ${salvando ? 'ti-loader-2' : 'ti-check'}`} style={{ fontSize:15, animation: salvando ? 'idemaq-spin 0.8s linear infinite' : undefined }} aria-hidden="true" /> {salvando ? 'Salvando…' : 'Criar OS'}
        </button>
      </div>

      {/* Sub-modal: cadastrar novo cliente — usa o NovoClienteModal padrão */}
      {modalNovoCli && (
        <NovoClienteModal
          T={T} dark={dark}
          nomeInicial={buscaCli}
          mobile={mobile}
          criar={criarClientePersist}
          onClose={() => setModalNovoCli(false)}
          onCriado={clienteCriadoNovo}
        />
      )}
    </ModalBase>
  )
}


function FormSecao({ titulo, icon, T, children, opcional }) {
  return (
    <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
      <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
        <i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />
        {titulo}
        {opcional && <span style={{ fontSize:9.5, padding:'1px 6px', borderRadius:8, background:T.bg, color:T.textDim, fontWeight:500, textTransform:'none', letterSpacing:'normal' }}>opcional</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Modal base reutilizável ───────────────────────────────────────────────

function ModalBase({ T, dark, onClose, children, maxWidth=720, mobile }) {
  const mouseDownOnBackdrop = useRef(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div
      onMouseDown={e => { mouseDownOnBackdrop.current = e.target === e.currentTarget }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(2px)', zIndex:200, display:'flex', alignItems: mobile?'flex-end':'center', justifyContent:'center', padding: mobile?0:'1rem' }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:T.card, borderRadius: mobile?'16px 16px 0 0':14, width:'100%', maxWidth: mobile?'100%':maxWidth, maxHeight: mobile?'92vh':'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.5)', border:`1px solid ${T.border}`, overflow:'hidden' }}>
        {children}
      </div>
    </div>
  )
}

// Banner "OS finalizada" — acessibilidade Deutan: ícone + texto "Finalizada" + cor verde

function BannerFinalizada({ dark, cor, admin }) {
  const [msg, setMsg] = useState(null)
  function reabrir() {
    setMsg('Funcionalidade disponível no Módulo 03')
    setTimeout(() => setMsg(null), 3000)
  }
  return (
    <div style={{ padding:'10px 18px', background:cor('#0f2a15','#e8f5ec'), borderBottom:'2px solid #28a745', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <i className="ti ti-circle-check" style={{ fontSize:18, color:cor('#4ade80','#1a7a3a') }} aria-hidden="true" />
        <span style={{ fontSize:13, fontWeight:700, color:cor('#4ade80','#1a7a3a') }}>✓ OS finalizada</span>
        <span style={{ fontSize:11, color:cor('#4ade80','#1a7a3a'), opacity:.75 }}>Somente leitura</span>
        {msg && <span style={{ fontSize:11, color:cor('#4ade80','#1a7a3a'), fontStyle:'italic' }}>— {msg}</span>}
      </div>
      {admin && (
        <button onClick={reabrir}
          style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${cor('#4ade80','#1a7a3a')}`, background:'transparent', color:cor('#4ade80','#1a7a3a'), fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-refresh" style={{ fontSize:12 }} aria-hidden="true" />
          Reabrir OS
        </button>
      )}
    </div>
  )
}

// ─── OS Detalhe (somente leitura nesta etapa) ──────────────────────────────

function OSDetalhe({ T, dark, os: osInicial, user, osBase, usuarios, onClose, onToggleAgPeca, onAbrirOS, mobile }) {
  const cor = (d, c) => dark ? d : c
  // Estado local: usado se props de callback não vierem (caso mobile não controlar)
  const [osLocal, setOsLocal] = useState(osInicial)
  const os = osInicial // sempre usa o que vem (atualizado pelo pai)
  const [aba, setAba] = useState('detalhe')
  const admin = isAdmin(user)
  const isConcluido = os.etapa === 'concluido'
  const config = TIPOS_OS[os.tipo]
  const etapaAtual = config.etapas.findIndex(e => e.id === os.etapa)
  const isRecusado = os.etapa === 'recusado'
  const tipoCor = corEtapa(config.cor, dark)
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const respId = responsavelAtual(os)
  const func = funcPorId(respId)
  const itens = OS_ITENS_MOCK[os.numero] || []
  const subtotal = itens.reduce((s,i) => s + i.valor*i.qtd, 0)
  const totalLiq = subtotal - (os.desconto || 0)
  const valorPago = os.valor_pago || 0
  const aPagar = Math.max(0, totalLiq - valorPago)
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)

  // OS de origem (se for garantia)
  const osOrigem = os.garantia && osBase ? osBase.find(o => o.numero === os.os_origem_id) : null
  // Garantia disponível para esta OS (se for original concluída)
  const garantiaValida = os.etapa === 'concluido' ? dentroGarantia(os) : false
  const diasGarantiaRest = (() => {
    if (!garantiaValida) return 0
    const dias = os.garantia_dias || 90
    const reg = (os.historico||[]).find(h => h.etapa === 'entrega' || h.etapa === 'entregue')
    if (!reg) return 0
    const limite = new Date(new Date(reg.data).getTime() + dias*86400000)
    return Math.max(0, Math.round((limite - new Date()) / 86400000))
  })()

  function toggleAgPeca() {
    if (onToggleAgPeca) onToggleAgPeca()
    else setOsLocal(o => ({ ...o, aguardando_peca: !o.aguardando_peca }))
  }

  const historico = (os.historico || []).slice()

  return (
    <ModalBase T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={780}>
      {/* Banner OS finalizada — acessibilidade Deutan: ícone + texto + cor */}
      {isConcluido && (
        <BannerFinalizada dark={dark} cor={cor} admin={admin} />
      )}
      {/* Header */}
      <div style={{ padding:'14px 18px 12px', borderBottom:`1px solid ${T.border}`, background:tipoCor+'08' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
              <span style={{ padding:'3px 9px', borderRadius:6, background:tipoCor+'22', color:tipoCor, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5, textTransform:'uppercase', letterSpacing:'.3px' }}>
                <i className={`ti ${config.icon}`} style={{ fontSize:13 }} aria-hidden="true" />
                {config.label}
              </span>
              <span style={{ fontSize:16, fontWeight:700, color:T.textPrimary }}>OS #{os.numero}</span>
              {os.garantia && (
                <Badge color={cor(P.blue,P.blueDark)} bg={cor('#0d2035','#e6f1fb')} border={cor(P.blue,P.blueDark)+'33'}>
                  <i className="ti ti-shield-check" style={{ fontSize:11, marginRight:3 }} aria-hidden="true" />Garantia
                </Badge>
              )}
              {pagoTotal && (
                <Badge color={cor(P.green,P.greenDark)} bg={cor('#0f2a15','#e8f5ec')} border={cor(P.green,P.greenDark)+'33'}>
                  <i className="ti ti-check" style={{ fontSize:11, marginRight:3 }} aria-hidden="true" />Pago
                </Badge>
              )}
              {pagoParcial && (
                <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>
                  Parcial: R$ {valorPago.toLocaleString('pt-BR')}/{totalLiq.toLocaleString('pt-BR')}
                </Badge>
              )}
              {os.aguardando_peca && (
                <Badge color={'#ff9800'} bg={cor('#3a2200','#fff4e0')} border={'#ff980044'}>
                  <i className="ti ti-package" style={{ fontSize:11, marginRight:3 }} aria-hidden="true" />Aguardando peça
                </Badge>
              )}
              {isRecusado && <Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Recusada</Badge>}
              {!isRecusado && status==='vencido' && <Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>{Math.abs(dias)}d atraso</Badge>}
              {status==='hoje'   && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Vence hoje</Badge>}
              {status==='amanha' && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Vence amanhã</Badge>}
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:T.textPrimary, marginBottom:2 }}>{os.cliente}</div>
            <div style={{ fontSize:12.5, color:T.textMuted }}>{[os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:6, borderRadius:6, fontSize:0, lineHeight:0, flexShrink:0 }}>
            <i className="ti ti-x" style={{ fontSize:22 }} aria-hidden="true" />
          </button>
        </div>

        {/* Abas Detalhe / Histórico */}
        <div style={{ display:'flex', gap:4, marginTop:11 }}>
          <button onClick={()=>setAba('detalhe')}
            style={{ padding:'6px 12px', borderRadius:6, border:'none', background:aba==='detalhe'?T.card:'transparent', color:aba==='detalhe'?T.textPrimary:T.textMuted, fontSize:12, fontWeight:aba==='detalhe'?700:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, borderBottom:`2px solid ${aba==='detalhe'?tipoCor:'transparent'}` }}>
            <i className="ti ti-info-circle" style={{ fontSize:13 }} aria-hidden="true" />
            Detalhe
          </button>
          <button onClick={()=>setAba('historico')}
            style={{ padding:'6px 12px', borderRadius:6, border:'none', background:aba==='historico'?T.card:'transparent', color:aba==='historico'?T.textPrimary:T.textMuted, fontSize:12, fontWeight:aba==='historico'?700:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, borderBottom:`2px solid ${aba==='historico'?tipoCor:'transparent'}` }}>
            <i className="ti ti-history" style={{ fontSize:13 }} aria-hidden="true" />
            Histórico ({historico.length})
          </button>
        </div>
      </div>

      {/* Conteúdo scrollável */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:12 }}>

        {aba === 'detalhe' && (
          <>
            {/* Aviso: OS em garantia → mostra OS origem */}
            {os.garantia && osOrigem && (
              <div onClick={()=>onAbrirOS?.(osOrigem.numero)}
                style={{ padding:'10px 14px', borderRadius:9, background:bgEtapa('blue', dark), border:`1px solid ${corEtapa('blue', dark)}55`, fontSize:12, color:T.textSecondary, display:'flex', alignItems:'center', gap:10, cursor: onAbrirOS?'pointer':'default' }}>
                <i className="ti ti-shield-check" style={{ fontSize:20, color:corEtapa('blue', dark), flexShrink:0 }} aria-hidden="true" />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:T.textPrimary, marginBottom:2 }}>OS em garantia</div>
                  <div style={{ lineHeight:1.4 }}>Referente à OS #<strong style={{color:corEtapa('blue', dark)}}>{osOrigem.numero}</strong> de {osOrigem.cliente} ({osOrigem.equipamento}). Mão de obra não cobrada — peças saem do estoque a preço de custo.</div>
                </div>
                {onAbrirOS && <i className="ti ti-chevron-right" style={{ fontSize:18, color:T.textDim }} aria-hidden="true" />}
              </div>
            )}

            {/* OS concluída original com garantia ainda válida */}
            {!os.garantia && os.etapa === 'concluido' && garantiaValida && (
              <div style={{ padding:'10px 14px', borderRadius:9, background:bgEtapa('green', dark), border:`1px solid ${corEtapa('green', dark)}55`, fontSize:12, color:T.textSecondary, display:'flex', alignItems:'center', gap:10 }}>
                <i className="ti ti-shield-check" style={{ fontSize:20, color:corEtapa('green', dark), flexShrink:0 }} aria-hidden="true" />
                <div>
                  <div style={{ fontWeight:700, color:T.textPrimary, marginBottom:2 }}>Garantia ativa</div>
                  <div>Faltam <strong style={{color:corEtapa('green', dark)}}>{diasGarantiaRest} dia(s)</strong> de garantia. Se houver retorno, abra uma nova OS marcando "Garantia" e referenciando esta.</div>
                </div>
              </div>
            )}            {/* Timeline do fluxo */}
            {!isRecusado && (
              <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
                  <i className="ti ti-route" style={{ fontSize:14 }} aria-hidden="true" />
                  Fluxo da OS — etapa atual: <strong style={{color:tipoCor}}>{config.etapas[etapaAtual]?.label}</strong>
                </div>
                <div style={{ display:'flex', gap:3, overflowX:'auto', paddingBottom:4 }}>
                  {config.etapas.map((e, i) => {
                    if (e.adminOnly && !admin) return null
                    const passou = i < etapaAtual
                    const atual  = i === etapaAtual
                    const corE = atual ? corEtapa(e.cor, dark) : (passou ? cor(P.green, P.greenDark) : T.textDim)
                    const bgE  = atual ? bgEtapa(e.cor, dark) : (passou ? cor('#0f2a15','#e8f5ec') : T.bg)
                    const reg = historico.find(h => h.etapa === e.id)
                    const f = reg && funcPorId(reg.funcionario)
                    return (
                      <div key={e.id} style={{ flex:'1 0 auto', minWidth:88, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', background:bgE, color:corE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, border:`1.5px solid ${atual?corE:'transparent'}` }}>
                          {passou ? <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" /> : (atual ? <div style={{width:7,height:7,borderRadius:'50%',background:corE}} /> : i+1)}
                        </div>
                        <span style={{ fontSize:10, color:corE, textAlign:'center', lineHeight:1.25, fontWeight:atual?700:500, maxWidth:88 }}>{e.curto}</span>
                        {f && (
                          <span title={`Feito por ${f.nome}`} style={{ fontSize:8.5, color:f.cor, fontWeight:700, padding:'1px 5px', borderRadius:8, background:f.cor+'22', border:`1px solid ${f.cor}33` }}>
                            {f.apelido}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Limpeza + Manutenção paralelos */}
            {os.etapa === 'oficina' && (
              <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <i className="ti ti-tool" style={{ fontSize:14 }} aria-hidden="true" />
                    Em oficina — limpeza e manutenção simultâneas
                  </div>
                  <button onClick={toggleAgPeca}
                    style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${os.aguardando_peca?'#ff9800':T.border}`, background:os.aguardando_peca?cor('#3a2200','#fff4e0'):T.bg, color:os.aguardando_peca?'#ff9800':T.textMuted, fontSize:11, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5, textTransform:'none', letterSpacing:'normal' }}>
                    <i className={`ti ${os.aguardando_peca?'ti-package':'ti-package-off'}`} style={{ fontSize:13 }} aria-hidden="true" />
                    {os.aguardando_peca ? 'Aguardando peça (clique p/ desmarcar)' : 'Marcar como aguardando peça'}
                  </button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:10 }}>
                  <SubBox label="Limpeza" status={os.limpeza} icon="ti-droplet" T={T} dark={dark} />
                  <SubBox label="Manutenção" status={os.manutencao} icon="ti-tool" T={T} dark={dark} />
                </div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:8, fontStyle:'italic' }}>
                  <i className="ti ti-info-circle" style={{ fontSize:12, marginRight:4, verticalAlign:'middle' }} aria-hidden="true" />
                  Próxima etapa (Teste final) só libera quando ambas estiverem concluídas.
                </div>
              </div>
            )}

            {/* Cliente e equipamento */}
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:10 }}>
              <DetCard icon="ti-user" titulo="Cliente" T={T}>
                <Linha label="Nome" valor={os.cliente} T={T} />
                {os.fone && <Linha label="Telefone" valor={os.fone} T={T} />}
                {os.endereco && <Linha label="Endereço" valor={os.endereco} T={T} multi />}
              </DetCard>
              <DetCard icon="ti-device-mobile-cog" titulo="Equipamento" T={T}>
                {os.marca && <Linha label="Marca" valor={os.marca} T={T} />}
                {os.modelo && <Linha label="Modelo" valor={os.modelo} T={T} />}
                {os.serie && <Linha label="Nº de série" valor={os.serie} T={T} mono />}
                <Linha label="Descrição" valor={os.equipamento} T={T} multi />
                <Linha label="Defeito relatado" valor={os.defeito} T={T} multi />
                <Linha label="Fotos" valor={`${os.fotos || 0} foto(s) anexada(s)`} T={T} />
              </DetCard>
            </div>

            {/* Responsabilidade atual */}
            {func && (
              <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'10px 14px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width:34, height:34, borderRadius:'50%', background:func.cor+'33', color:func.cor, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${func.cor}55` }}>{func.apelido}</span>
                  <div>
                    <div style={{ fontSize:10.5, color:T.textDim, fontWeight:500, textTransform:'uppercase', letterSpacing:'.3px' }}>Última ação registrada</div>
                    <div style={{ fontSize:13, color:T.textPrimary, fontWeight:600 }}>{func.nome}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right', fontSize:11, color:T.textMuted }}>
                  <div>na etapa</div>
                  <div style={{ color:T.textPrimary, fontWeight:600, marginTop:1 }}>{config.etapas[etapaAtual-1]?.label || config.etapas[0]?.label}</div>
                </div>
              </div>
            )}

            {/* Itens e financeiro */}
            {itens.length > 0 && (
              <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
                  <i className="ti ti-list-details" style={{ fontSize:14 }} aria-hidden="true" />
                  Itens da OS
                  <span style={{ fontSize:10, padding:'1px 6px', borderRadius:8, background:T.bg, color:T.textDim, fontWeight:500, textTransform:'none', letterSpacing:'normal' }}>{itens.length} {itens.length===1?'item':'itens'}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {itens.map((it, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', background:T.bg, borderRadius:6, fontSize:12.5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0, flex:1 }}>
                        <i className={`ti ${it.tipo==='servico'?'ti-tool':'ti-package'}`} style={{ fontSize:14, color:it.tipo==='servico'?cor(P.blueLight,P.blueLightDark):cor(P.blue,P.blueDark) }} aria-hidden="true" />
                        <span style={{ color:T.textPrimary, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.nome}</span>
                        <span style={{ color:T.textDim, fontSize:11 }}>×{it.qtd}</span>
                      </div>
                      <span style={{ color:T.textSecondary, fontWeight:600, whiteSpace:'nowrap' }}>R$ {(it.valor*it.qtd).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted }}>
                    <span>Subtotal</span><span>R$ {subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                  {(os.desconto || 0) > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.green,P.greenDark) }}>
                      <span>Desconto</span><span>− R$ {os.desconto.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:T.textPrimary, fontWeight:700, marginTop:2 }}>
                    <span>Total</span><span style={{ color:tipoCor }}>R$ {totalLiq.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                  {/* Pagamento */}
                  {(pagoTotal || pagoParcial) && (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.green,P.greenDark), marginTop:5, paddingTop:6, borderTop:`1px dashed ${T.border}` }}>
                        <span><i className="ti ti-cash-banknote" style={{ fontSize:13, marginRight:5, verticalAlign:'middle' }} aria-hidden="true" />Pago{os.forma_pagamento?` (${os.forma_pagamento})`:''}</span>
                        <span>R$ {valorPago.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                      </div>
                      {pagoParcial && (
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.yellow,P.yellowDark), fontWeight:600 }}>
                          <span>A receber</span><span>R$ {aPagar.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Datas */}
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr 1fr', gap:10 }}>
              <DetMini icon="ti-calendar-plus" label="Aberta em" valor={new Date(os.abertura).toLocaleDateString('pt-BR')} T={T} />
              <DetMini icon="ti-calendar-check" label="Prazo" valor={new Date(os.prazo).toLocaleDateString('pt-BR')} T={T} cor={status==='vencido'?cor(P.red,P.redDark):status==='hoje'||status==='amanha'?cor(P.yellow,P.yellowDark):cor(P.green,P.greenDark)} />
              <DetMini icon="ti-clock-hour-4" label="Dias na OS" valor={Math.max(1, Math.round((Date.now() - new Date(os.abertura))/86400000)) + ' dia(s)'} T={T} />
            </div>

            {/* Observações */}
            {os.observacoes && (
              <DetCard icon="ti-notes" titulo="Observações" T={T}>
                <div style={{ fontSize:12.5, color:T.textSecondary, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{os.observacoes}</div>
              </DetCard>
            )}

            {/* Aviso */}
            <div style={{ padding:'10px 12px', borderRadius:8, background:bgEtapa('blue', dark), border:`1px dashed ${corEtapa('blue', dark)}55`, fontSize:11.5, color:T.textSecondary, display:'flex', alignItems:'center', gap:8 }}>
              <i className="ti ti-info-circle" style={{ fontSize:15, color:corEtapa('blue', dark), flexShrink:0 }} aria-hidden="true" />
              <span>Você já pode <strong style={{color:T.textPrimary}}>arrastar o card</strong> no kanban para avançar/voltar uma etapa (com regras de bloqueio) e marcar <strong style={{color:T.textPrimary}}>"Aguardando peça"</strong>. As ações de cada etapa (check de coleta, diagnóstico, orçamento editável, baixa de pagamento) chegam na <strong style={{color:T.textPrimary}}>Entrega 2</strong>.</span>
            </div>
          </>
        )}

        {aba === 'historico' && (
          <div style={{ background:T.cardAlt, borderRadius:9, padding:'14px 16px', border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
              <i className="ti ti-history" style={{ fontSize:14 }} aria-hidden="true" />
              Histórico completo de movimentações
            </div>
            {historico.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem 1rem', color:T.textDim, fontSize:13 }}>
                <i className="ti ti-clipboard-off" style={{ fontSize:32, display:'block', marginBottom:8 }} aria-hidden="true" />
                Nenhuma movimentação registrada ainda.
              </div>
            ) : (
              <div style={{ position:'relative' }}>
                {historico.map((h, i) => {
                  const e = config.etapas.find(et => et.id === h.etapa) || { label: h.etapa, cor:'neutro' }
                  const f = funcPorId(h.funcionario)
                  const corE = corEtapa(e.cor, dark)
                  const isLast = i === historico.length - 1
                  return (
                    <div key={i} style={{ display:'flex', gap:12, position:'relative', paddingBottom: isLast ? 0 : 14 }}>
                      {/* Linha vertical conectora */}
                      {!isLast && <div style={{ position:'absolute', left:13, top:28, bottom:0, width:2, background:T.border }} />}
                      {/* Bola colorida da etapa */}
                      <div style={{ width:28, height:28, borderRadius:'50%', background:bgEtapa(e.cor, dark), color:corE, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:`1.5px solid ${corE}44`, zIndex:1 }}>
                        <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" />
                      </div>
                      <div style={{ flex:1, paddingTop:2 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{e.label}</span>
                          {f && (
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <span style={{ width:18, height:18, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{f.apelido}</span>
                              <span style={{ fontSize:11.5, color:T.textSecondary, fontWeight:600 }}>{f.nome}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:T.textMuted }}>
                          <i className="ti ti-clock" style={{ fontSize:11, marginRight:4, verticalAlign:'middle' }} aria-hidden="true" />
                          {h.data}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalBase>
  )
}


function DetCard({ icon, titulo, children, T }) {
  return (
    <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
      <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
        <i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />
        {titulo}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>{children}</div>
    </div>
  )
}
function Linha({ label, valor, T, multi, chipCor, mono }) {
  return (
    <div style={{ display:'flex', flexDirection: multi?'column':'row', justifyContent:'space-between', gap:multi?3:8, alignItems: multi?'flex-start':'flex-start' }}>
      <span style={{ fontSize:11, color:T.textDim, flexShrink:0, fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:12.5, color:T.textPrimary, textAlign: multi?'left':'right', wordBreak:'break-word', lineHeight:1.4, display:'flex', alignItems:'center', gap:6, fontFamily: mono?'ui-monospace, SFMono-Regular, monospace':'inherit' }}>
        {chipCor && <span style={{ width:8, height:8, borderRadius:'50%', background:chipCor, flexShrink:0 }} />}
        {valor || '—'}
      </span>
    </div>
  )
}
function DetMini({ icon, label, valor, T, cor }) {
  return (
    <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'11px 13px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
      <i className={`ti ${icon}`} style={{ fontSize:18, color:cor||T.textMuted }} aria-hidden="true" />
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:10, color:T.textDim, marginBottom:2, fontWeight:500, textTransform:'uppercase', letterSpacing:'.3px' }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:600, color:cor||T.textPrimary }}>{valor}</div>
      </div>
    </div>
  )
}
function SubBox({ label, status, icon, T, dark }) {
  const cor = (d, c) => dark ? d : c
  const map = {
    concluido:    { c:cor(P.green, P.greenDark),   bg:cor('#0f2a15','#e8f5ec'), txt:'Concluída' },
    em_andamento: { c:cor(P.yellow, P.yellowDark), bg:cor('#2a2000','#fdf6dc'), txt:'Em andamento' },
    aguardando:   { c:T.textMuted,                 bg:T.bg,                     txt:'Aguardando' },
  }
  const m = map[status] || map.aguardando
  return (
    <div style={{ background:m.bg, border:`1px solid ${m.c}33`, borderRadius:8, padding:'11px 13px', display:'flex', alignItems:'center', gap:10 }}>
      <i className={`ti ${icon}`} style={{ fontSize:20, color:m.c }} aria-hidden="true" />
      <div>
        <div style={{ fontSize:11, color:T.textMuted, marginBottom:1, fontWeight:500 }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:700, color:m.c }}>{m.txt}</div>
      </div>
    </div>
  )
}

// ─── Em construção ─────────────────────────────────────────────────────────

// ─── Exports ────────────────────────────────────────────────────────────
export { NovaOSModal, NovoClienteModalCompleto, OSDetalhe, ModalBase, FormSecao, BannerFinalizada }
