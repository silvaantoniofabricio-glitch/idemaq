// src/components/os/NovaOSMobile.jsx
// Modal de "Nova OS" — versão MOBILE-FIRST (21/05/2026).
//
// Substitui o uso do NovaOSModal do _legacy/ na página OSMobile. Desktop
// continua com o legacy intocado (CLAUDE rule).
//
// Decisões de design:
// - Bottom sheet 92vh com drag-handle visual (cue de "puxe pra baixo pra fechar")
// - Tipo como SEGMENTED CONTROL visível (3 chips) — sem dropdown escondido
// - Inputs 48-52px de altura com font-size:16px (evita zoom-on-focus no iOS)
// - Cliente: busca full-width + resultados como cards grandes (não dropdown
//   stretched embaixo, que é difícil de tocar)
// - Equipamento: acordeão colapsado (4 campos opcionais — esconde por padrão
//   pra reduzir overwhelm; toca pra expandir)
// - Footer STICKY com safe-area-inset-bottom + gradiente de fade no topo
// - Contador "1 de 2 obrigatórios" no header (substitui o textinho enterrado)
//
// Schema persistido: mesmo do NovaOSModal legacy (payload da tabela `os`).
// Reusa: criarClientePersist + NovoClienteModal (componentes/clientes/) +
// AddressInput (componentes/logistica/).

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../supabase'
import { criarClientePersist } from '../../hooks/useClientes'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { useMaquinas } from '../../hooks/useMaquinas'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { semAcento } from '../../utils/fmt'
import NovoClienteModal from '../clientes/NovoClienteModal'
import { AtlPanel, ATL_FONT, atlSurfaceSunken, atlHover, AtlButton, ATL_RADIUS } from '../osDetalhe/acoes/_AtlassianUI'
import { Input, Select, Textarea } from '../ui'

const TIPOS_EQUIPAMENTO = ['Máquina de Lavar', 'Lava e Seca', 'Tanquinho', 'Micro-ondas']
const MARCAS_EQUIPAMENTO = ['Brastemp', 'Electrolux', 'Consul', 'LG', 'Samsung', 'Outros']
const TIPOS_ORDEM = ['atendimento', 'venda', 'fabricacao']

export default function NovaOSMobile({
  T, dark,
  tipoInicial = 'atendimento',
  notify,
  onClose,
  onCriada,
}) {
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)
  const cor = (d, c) => dark ? d : c

  const { maquinas } = useMaquinas()
  const maquinasDisponiveis = useMemo(
    () => maquinas.filter(m => m.estado === 'disponivel').map(m => ({
      id: m.id, descricao: m.modelo, valor: m.precoVenda,
    })),
    [maquinas]
  )

  // ─── Estado principal ────────────────────────────────────────────────────
  const [tipo, setTipo] = useState(tipoInicial)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    cliente: '', clienteId: null, fone: '',
    enderecoSelecionado: '', enderecoIndex: 0, enderecosDisponiveis: [],
    equipamentoTipo: tipoInicial === 'atendimento' ? 'Máquina de Lavar' : '',
    equipamentoMarca: '',
    equipamentoMarcaOutros: '',
    equipamentoModelo: '',
    equipamentoSerie: '',
    defeito: '',
    data: '', hora: '',
    maquinaEstoque: '', valor: '',
    observacoes: '',
    endereco: '',
  })
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Smart default: ao marcar uma data, se a hora estiver vazia, sugere 08:00
  useEffect(() => {
    if (form.data && !form.hora) update('hora', '08:00')
  }, [form.data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Validação por tipo ──────────────────────────────────────────────────
  const obrigatorios = useMemo(() => {
    if (tipo === 'atendimento') return [
      { id: 'cliente', label: 'Cliente', ok: !!form.cliente },
    ]
    if (tipo === 'fabricacao') return [
      { id: 'tipo', label: 'Tipo de máquina', ok: !!form.equipamentoTipo },
    ]
    if (tipo === 'venda') return [
      { id: 'cliente', label: 'Cliente', ok: !!form.cliente },
      { id: 'maquina', label: 'Máquina do estoque', ok: !!form.maquinaEstoque },
    ]
    return []
  }, [tipo, form.cliente, form.equipamentoTipo, form.maquinaEstoque])

  const totalObg = obrigatorios.length
  const okObg = obrigatorios.filter(o => o.ok).length
  const podeSalvar = okObg === totalObg && !salvando

  // ─── Swipe-to-close ─────────────────────────────────────────────────────
  const sheetDragRef = useRef(null)
  const [dragY, setDragY] = useState(0)

  function onSheetDragStart(e) {
    const t = e.touches?.[0]
    if (!t) return
    sheetDragRef.current = { y0: t.clientY, active: true }
  }
  function onSheetDragMove(e) {
    if (!sheetDragRef.current?.active) return
    const t = e.touches?.[0]
    if (!t) return
    const dy = Math.max(0, t.clientY - sheetDragRef.current.y0)
    setDragY(dy)
  }
  function onSheetDragEnd() {
    if (!sheetDragRef.current?.active) return
    const dy = dragY
    sheetDragRef.current = null
    if (dy > 100) {
      // Anima a queda e fecha (sem confirmar — arrastar = intenção clara)
      setDragY(window.innerHeight)
      setMontado(false)
      setTimeout(onClose, 200)
    } else {
      setDragY(0)
    }
  }

  // ─── Animação de entrada ─────────────────────────────────────────────────
  const [montado, setMontado] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setMontado(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onEsc(e) { if (e.key === 'Escape') tryClose() }
    document.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onEsc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tryClose() {
    // Se preencheu algo relevante, confirma antes de descartar
    const sujo = form.cliente || form.defeito || form.observacoes || form.equipamentoModelo
    if (sujo && !window.confirm('Descartar esta OS sem salvar?')) return
    setMontado(false)
    setTimeout(onClose, 180)
  }

  // ─── Salvar ──────────────────────────────────────────────────────────────
  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)
    try {
      const marcaFinal = form.equipamentoMarca === 'Outros'
        ? form.equipamentoMarcaOutros
        : form.equipamentoMarca
      const etapaInicial = form.data ? 'agendamento' : 'aguardando_agendamento'
      const dataAgIso = form.data
        ? new Date(`${form.data}T${form.hora || '08:00'}:00-04:00`).toISOString()
        : null

      const payload = {
        tipo,
        etapa: etapaInicial,
        cliente_id: form.clienteId || null,
        marca_equipamento: marcaFinal || null,
        modelo_equipamento: form.equipamentoModelo?.trim() || null,
        numero_serie: form.equipamentoSerie?.trim() || null,
        defeito_relatado: form.defeito?.trim() || null,
        data_agendamento: dataAgIso,
        endereco: form.enderecoSelecionado || null,
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

      // Itens padrão pra OS de atendimento: 2 serviços (Limpeza/Manutenção,
      // R$ 165 cada) + Deslocamento (R$ 20). User pode remover/editar depois
      // na etapa Orçamento. Best-effort: se falhar não bloqueia a criação.
      if (tipo === 'atendimento') {
        // Schema real: coluna `categoria` (não `tipo`). Limpeza/Manutenção
        // viram serviço (R$ 165 cada), Deslocamento R$ 20.
        const itensPadrao = [
          { os_id: data.id, categoria: 'servico', nome: 'Limpeza',      quantidade: 1, valor_unitario: 165 },
          { os_id: data.id, categoria: 'servico', nome: 'Manutenção',   quantidade: 1, valor_unitario: 165 },
          { os_id: data.id, categoria: 'desloc',  nome: 'Deslocamento', quantidade: 1, valor_unitario: 20 },
        ]
        const { error: errItens } = await supabase.from('os_item').insert(itensPadrao)
        if (errItens) console.warn('[NovaOSMobile] itens padrão falharam:', errItens)
      }

      notify?.('ok', `OS #${data.numero} criada`)
      onCriada?.()
      setMontado(false)
      setTimeout(onClose, 180)
    } catch (e) {
      notify?.('erro', `Erro ao criar OS: ${e?.message || 'desconhecido'}`)
      console.error('[NovaOSMobile] erro ao salvar:', e)
    } finally {
      setSalvando(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      onClick={tryClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        opacity: montado ? 1 : 0,
        transition: 'opacity .18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: '100dvh', maxHeight: '100dvh', minHeight: '100dvh',
          background: T.bg,
          borderRadius: 0,
          border: 'none',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'none',
          animation: 'idemaq-novaos-slide-up .22s cubic-bezier(.2,.7,.2,1)',
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: sheetDragRef.current?.active ? 'none' : 'transform .18s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle — toca aqui pra arrastar pra baixo e fechar */}
        <div
          onTouchStart={onSheetDragStart}
          onTouchMove={onSheetDragMove}
          onTouchEnd={onSheetDragEnd}
          onTouchCancel={onSheetDragEnd}
          style={{
            display: 'flex', justifyContent: 'center', padding: '10px 0 5px',
            touchAction: 'none', cursor: 'grab',
          }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: dark ? 'rgba(255,255,255,0.18)' : '#DFE1E6',
          }} />
        </div>

        {/* Header */}
        <Header
          T={T} dark={dark}
          okObg={okObg} totalObg={totalObg}
          onClose={tryClose}
        />

        {/* Segmented control de tipo */}
        <TipoSegmented T={T} dark={dark} tipo={tipo} onChange={setTipo} />

        {/* Body scrollable */}
        <div style={{
          flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '16px 16px 96px',
          background: T.bg,
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
        }}>
          {tipo === 'atendimento' && (
            <AtendimentoForm
              T={T} dark={dark}
              form={form} setForm={setForm} update={update}
              notify={notify}
            />
          )}
          {tipo === 'venda' && (
            <VendaForm
              T={T} dark={dark}
              form={form} setForm={setForm} update={update}
              notify={notify}
            />
          )}
          {tipo === 'fabricacao' && (
            <FabricacaoForm
              T={T} dark={dark}
              form={form} setForm={setForm} update={update}
            />
          )}
        </div>

        {/* Footer sticky com CTA */}
        <StickyFooter
          T={T} dark={dark}
          podeSalvar={podeSalvar}
          salvando={salvando}
          obrigatorios={obrigatorios}
          onSalvar={salvar}
        />
      </div>

      <style>{`
        @keyframes idemaq-novaos-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes idemaq-novaos-fade-up { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes idemaq-novaos-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .idemaq-novaos-input::placeholder { color: ${T.textDim}; }
        .idemaq-novaos-input:focus { border-color: ${corEtapa('blue', dark)}; box-shadow: 0 0 0 3px ${corEtapa('blue', dark)}22; }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════════════════
function Header({ T, dark, okObg, totalObg, onClose }) {
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const completo = okObg === totalObg
  return (
    <div style={{
      padding: '4px 14px 12px',
      borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      flexShrink: 0,
      background: T.card,
      fontFamily: ATL_FONT,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 17, fontWeight: 700, color: T.textPrimary,
          letterSpacing: '-0.01em', fontFamily: ATL_FONT,
        }}>
          Nova ordem de serviço
        </div>
        <div style={{
          marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11.5, color: T.textMuted, fontWeight: 500,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 3,
            background: completo ? verde + '22' : azul + '22',
            color: completo ? verde : azul,
            fontWeight: 600, fontSize: 11,
            letterSpacing: '-0.005em',
          }}>
            <i className={`ti ${completo ? 'ti-check' : 'ti-progress'}`}
               style={{ fontSize: 12 }} aria-hidden="true" />
            {okObg} de {totalObg} obrigatório{totalObg !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="Fechar"
        style={{
          width: 36, height: 36, borderRadius: ATL_RADIUS,
          background: atlSurfaceSunken(dark),
          border: `1px solid ${T.border}`,
          color: T.textPrimary, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, WebkitTapHighlightColor: 'transparent',
          padding: 0, fontFamily: 'inherit',
        }}>
        <i className="ti ti-x" style={{ fontSize: 18 }} aria-hidden="true" />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Segmented control de tipo
// ═══════════════════════════════════════════════════════════════════════════
function TipoSegmented({ T, dark, tipo, onChange }) {
  return (
    <div style={{
      padding: '12px 12px 4px',
      background: T.card,
      flexShrink: 0,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
        background: atlSurfaceSunken(dark),
        padding: 2, borderRadius: ATL_RADIUS,
      }}>
        {TIPOS_ORDEM.map(id => {
          const cfg = TIPOS_OS[id]
          if (!cfg) return null
          const ativo = id === tipo
          const c = corEtapa(cfg.cor, dark)
          return (
            <button key={id} onClick={() => onChange(id)}
              style={{
                padding: '6px 4px', borderRadius: 3, border: 'none',
                background: ativo ? (dark ? '#22272B' : '#FFFFFF') : 'transparent',
                color: ativo ? c : T.textMuted,
                fontSize: 13, fontWeight: ativo ? 600 : 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: ativo
                  ? (dark
                      ? '0 1px 2px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,0.05)'
                      : '0 1px 2px rgba(9,30,66,0.18), 0 0 0 1px rgba(9,30,66,0.05)')
                  : 'none',
                letterSpacing: '-0.005em',
                transition: 'background .12s, color .12s, box-shadow .12s',
                minHeight: 32,
                WebkitTapHighlightColor: 'transparent',
              }}>
              <i className={`ti ${cfg.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
              <span>{cfg.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM: Atendimento
// ═══════════════════════════════════════════════════════════════════════════
function AtendimentoForm({ T, dark, form, setForm, update, notify }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ClienteBlock
        T={T} dark={dark}
        form={form} setForm={setForm}
        notify={notify}
      />

      {form.cliente && form.enderecosDisponiveis.length > 0 && (
        <EnderecoBlock
          T={T} dark={dark}
          enderecos={form.enderecosDisponiveis}
          enderecoIndex={form.enderecoIndex}
          onSelect={(idx, end) => setForm(f => ({
            ...f, enderecoIndex: idx, enderecoSelecionado: end, endereco: end,
          }))}
        />
      )}

      <EquipamentoBlock
        T={T} dark={dark}
        form={form} update={update}
      />

      <DefeitoBlock T={T} dark={dark} value={form.defeito} onChange={v => update('defeito', v)} />

      <AgendamentoBlock T={T} dark={dark} form={form} update={update} />

      <ObservacoesBlock T={T} dark={dark} value={form.observacoes} onChange={v => update('observacoes', v)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM: Venda
// ═══════════════════════════════════════════════════════════════════════════
function VendaForm({ T, dark, form, setForm, update, notify }) {
  const verde = corEtapa('green', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <AtlPanel T={T} dark={dark} title="Venda do estoque" accent={verde}>
        <div style={{ padding: '10px 14px', fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>
          Máquina pronta. O comprador vira cliente cadastrado automaticamente.
        </div>
      </AtlPanel>

      <ClienteBlock
        T={T} dark={dark}
        form={form} setForm={setForm}
        notify={notify}
        rotulo="Cliente comprador"
      />

      <MaquinaEstoqueBlock
        T={T} dark={dark}
        maquinas={maquinasDisponiveis}
        selecionada={form.maquinaEstoque}
        onSelect={(m) => setForm(f => ({
          ...f, maquinaEstoque: m.id, equipamento: m.descricao, valor: m.valor,
        }))}
      />

      {form.cliente && form.enderecosDisponiveis.length > 0 && (
        <EnderecoBlock
          T={T} dark={dark}
          rotulo="Endereço de entrega"
          enderecos={form.enderecosDisponiveis}
          enderecoIndex={form.enderecoIndex}
          onSelect={(idx, end) => setForm(f => ({
            ...f, enderecoIndex: idx, enderecoSelecionado: end, endereco: end,
          }))}
        />
      )}

      <AgendamentoBlock T={T} dark={dark} form={form} update={update} rotulo="Entrega" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM: Fabricação
// ═══════════════════════════════════════════════════════════════════════════
function FabricacaoForm({ T, dark, form, update }) {
  const amarelo = corEtapa('yellow', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <AtlPanel T={T} dark={dark} title="Fabricação pro estoque" accent={amarelo}>
        <div style={{ padding: '10px 14px', fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>
          Os itens usados saem do estoque ao concluir, e a máquina entra como produto pronto.
        </div>
      </AtlPanel>

      <AtlPanel T={T} dark={dark} title="Máquina a fabricar">
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select T={T} dark={dark}
            label="Tipo de máquina *"
            size="lg"
            value={form.equipamentoTipo}
            onChange={v => update('equipamentoTipo', v)}
            options={['', ...TIPOS_EQUIPAMENTO]}
            placeholder="Selecione…"
          />

          <Textarea T={T} dark={dark}
            label="Descrição / estado inicial (opcional)"
            value={form.defeito}
            onChange={v => update('defeito', v)}
            placeholder="Ex: estrutura ok, trocar rolamento, polia, capa nova"
            minHeight={80}
          />

          <Input T={T} dark={dark}
            label="Custo inicial da máquina base R$ (opcional)"
            size="lg"
            type="number"
            inputMode="decimal"
            value={form.valor}
            onChange={v => update('valor', v)}
            placeholder="150,00"
          />
        </div>
      </AtlPanel>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Cliente (busca + selected card)
// ═══════════════════════════════════════════════════════════════════════════
function ClienteBlock({ T, dark, form, setForm, notify, rotulo = 'Cliente' }) {
  const azul = corEtapa('blue', dark)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalNovoCli, setModalNovoCli] = useState(false)
  const todosCliRef = useRef(null) // cache de todos os clientes (busca sem acento)

  // Debounce 250ms, 2+ chars
  useEffect(() => {
    const termo = busca.trim()
    if (termo.length < 2) {
      setResultados([])
      setLoading(false)
      return
    }
    setLoading(true)
    let cancel = false
    const handle = setTimeout(async () => {
      try {
        // Carrega todos os clientes 1x (cache) e filtra no cliente ignorando
        // acentos — "joao" acha "João". ~782 clientes, leve.
        if (!todosCliRef.current) {
          const { data, error } = await supabase
            .from('cliente').select('id, nome, telefone, endereco, endereco2, endereco3')
            .is('deleted_at', null).order('nome', { ascending: true }).limit(5000)
          if (error) throw error
          todosCliRef.current = data || []
        }
        if (cancel) return
        const q = semAcento(termo)
        const matches = todosCliRef.current.filter(c =>
          semAcento(c.nome).includes(q) || semAcento(c.telefone).includes(q)
        ).slice(0, 20)
        setResultados(matches.map(c => ({
          id: c.id, nome: c.nome,
          fone: c.telefone || '',
          endereco: c.endereco || '',
          enderecos: [c.endereco, c.endereco2, c.endereco3].filter(Boolean),
        })))
      } catch (e) {
        console.error('[NovaOSMobile] busca cliente erro:', e)
        notify?.('erro', `Erro buscando clientes: ${e?.message || e}`)
        setResultados([])
      } finally {
        if (!cancel) setLoading(false)
      }
    }, 250)
    return () => { cancel = true; clearTimeout(handle) }
  }, [busca, notify])

  function escolher(c) {
    const enderecos = c.enderecos?.length ? c.enderecos : (c.endereco ? [c.endereco] : [])
    setForm(f => ({
      ...f,
      cliente: c.nome,
      clienteId: c.id,
      fone: c.fone || '',
      enderecoSelecionado: enderecos[0] || '',
      enderecoIndex: 0,
      enderecosDisponiveis: enderecos,
      endereco: enderecos[0] || '',
    }))
    setBusca('')
    setResultados([])
  }

  function trocar() {
    setForm(f => ({
      ...f, cliente: '', clienteId: null, fone: '',
      enderecoSelecionado: '', enderecoIndex: 0, enderecosDisponiveis: [], endereco: '',
    }))
    setBusca('')
    setResultados([])
  }

  function clienteCadastrado(novo) {
    // novo = linha real retornada pelo Supabase após o NovoClienteModal salvar
    escolher({
      id:       novo.id,
      nome:     novo.nome,
      fone:     novo.telefone || '',
      endereco: novo.endereco || '',
      enderecos: [novo.endereco, novo.endereco2, novo.endereco3].filter(Boolean),
    })
    setModalNovoCli(false)
  }

  // Wrapper de criar pro NovoClienteModal — não usa useClientes pra não pagar
  // o custo de listar 782 clientes só pra inserir 1.
  const criarWrapper = async (payload) => criarClientePersist(payload)

  return (
    <>
      <AtlPanel T={T} dark={dark} title={rotulo} count={form.clienteId ? 1 : undefined}>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!form.cliente ? (
            <>
              {/* Input de busca */}
              <div style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 14, color: T.textMuted, pointerEvents: 'none',
                }} aria-hidden="true" />
                <input
                  className="idemaq-novaos-input"
                  type="search"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou telefone…"
                  style={{
                    width: '100%', height: 40,
                    padding: '0 12px 0 32px',
                    borderRadius: ATL_RADIUS,
                    border: `1px solid ${T.border}`,
                    background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
                    color: T.textPrimary,
                    fontSize: 16,
                    outline: 'none', boxSizing: 'border-box',
                    fontFamily: ATL_FONT,
                    letterSpacing: '-0.005em',
                    transition: 'border-color .12s, box-shadow .12s',
                  }}
                />
                {loading && (
                  <i className="ti ti-loader-2" aria-hidden="true" style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 14, color: T.textMuted,
                    animation: 'idemaq-novaos-spin .8s linear infinite',
                  }} />
                )}
              </div>

              {/* Resultados — lista com border-top */}
              {busca.trim().length >= 2 && (
                <div style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: ATL_RADIUS,
                  overflow: 'hidden',
                  background: T.card,
                  boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
                }}>
                  {loading && resultados.length === 0 && (
                    <SkeletonResultado T={T} />
                  )}
                  {!loading && resultados.length === 0 && (
                    <div style={{
                      padding: '14px 16px',
                      color: T.textMuted, fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <i className="ti ti-mood-empty" style={{ fontSize: 18 }} aria-hidden="true" />
                      Nenhum cliente pra "{busca.trim()}"
                    </div>
                  )}
                  {resultados.map((c, idx) => (
                    <button key={c.id} onClick={() => escolher(c)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
                        background: 'transparent', color: T.textPrimary,
                        cursor: 'pointer', fontFamily: ATL_FONT, textAlign: 'left',
                        width: '100%', border: 'none',
                        animation: 'idemaq-novaos-fade-up .12s ease-out',
                        WebkitTapHighlightColor: 'transparent',
                      }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: ATL_RADIUS,
                        background: azul + '22', color: azul,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <i className="ti ti-user" style={{ fontSize: 16 }} aria-hidden="true" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
                          letterSpacing: '-0.005em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{c.nome}</div>
                        <div style={{
                          fontSize: 11.5, color: T.textMuted, marginTop: 2,
                          letterSpacing: '-0.005em',
                        }}>
                          {c.fone || '— sem telefone —'}
                          {c.enderecos.length > 0 && (
                            <> · {c.enderecos.length} end.</>
                          )}
                        </div>
                      </div>
                      <i className="ti ti-chevron-right" style={{
                        fontSize: 14, color: T.textDim, flexShrink: 0,
                      }} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {/* Atalho cadastrar novo */}
              <AtlButton T={T} dark={dark} icon="user-plus" onClick={() => setModalNovoCli(true)}>
                Cadastrar novo cliente
              </AtlButton>
            </>
          ) : (
            // Cliente selecionado
            <div style={{
              padding: 10, borderRadius: ATL_RADIUS,
              background: azul + '12',
              border: `1px solid ${azul}44`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: ATL_RADIUS,
                background: azul, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 13, fontWeight: 700,
                letterSpacing: '-0.005em', fontFamily: ATL_FONT,
              }}>
                {iniciais(form.cliente)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: T.textPrimary,
                  letterSpacing: '-0.005em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{form.cliente}</div>
                <div style={{
                  fontSize: 11.5, color: T.textMuted, marginTop: 1,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  letterSpacing: '-0.005em',
                }}>
                  <i className="ti ti-phone" style={{ fontSize: 11 }} aria-hidden="true" />
                  {form.fone || '—'}
                </div>
              </div>
              <button onClick={trocar} aria-label="Trocar cliente"
                style={{
                  width: 32, height: 32, borderRadius: ATL_RADIUS,
                  background: atlSurfaceSunken(dark),
                  border: `1px solid ${T.border}`,
                  color: T.textPrimary, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <i className="ti ti-edit" style={{ fontSize: 14 }} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </AtlPanel>

      {modalNovoCli && (
        <NovoClienteModal
          T={T} dark={dark} mobile
          nomeInicial={busca}
          onClose={() => setModalNovoCli(false)}
          onCriado={clienteCadastrado}
          criar={criarWrapper}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Endereço (radio cards)
// ═══════════════════════════════════════════════════════════════════════════
function EnderecoBlock({ T, dark, enderecos, enderecoIndex, onSelect, rotulo = 'Endereço da coleta' }) {
  const azul = corEtapa('blue', dark)
  return (
    <AtlPanel T={T} dark={dark} title={rotulo}>
      <div>
        {enderecos.map((end, idx) => {
          const sel = enderecoIndex === idx
          return (
            <button key={idx} onClick={() => onSelect(idx, end)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 14px', minHeight: 56,
                borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
                background: sel ? `${azul}10` : 'transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: ATL_FONT,
                width: '100%', border: 'none',
                borderLeft: sel ? `3px solid ${azul}` : '3px solid transparent',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <div style={{
                width: 20, height: 20, borderRadius: 10,
                border: `2px solid ${sel ? azul : T.textDim}`,
                background: sel ? azul : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 3,
              }}>
                {sel && <div style={{ width: 7, height: 7, borderRadius: 4, background: '#fff' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 3,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
                    {idx === 0 ? 'Principal' : `Endereço ${idx + 1}`}
                  </span>
                  {idx === 0 && (
                    <span style={{
                      fontSize: 9.5, padding: '2px 6px',
                      borderRadius: ATL_RADIUS, fontWeight: 800,
                      background: `${azul}22`, color: azul, letterSpacing: '.3px',
                    }}>PRINCIPAL</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.45 }}>
                  {end}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Equipamento (acordeão)
// ═══════════════════════════════════════════════════════════════════════════
function EquipamentoBlock({ T, dark, form, update }) {
  // Pre-expand se tem algo já preenchido
  const algumValor = !!(form.equipamentoMarca || form.equipamentoModelo || form.equipamentoSerie)
  const [aberto, setAberto] = useState(algumValor)

  const toggleBtn = (
    <button
      type="button"
      onClick={() => setAberto(a => !a)}
      style={{
        background: 'transparent', border: 'none',
        cursor: 'pointer', fontFamily: ATL_FONT,
        color: T.textMuted, padding: '0 4px',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 12, WebkitTapHighlightColor: 'transparent',
      }}>
      <i className={`ti ${aberto ? 'ti-chevron-up' : 'ti-chevron-down'}`}
         style={{ fontSize: 14 }} aria-hidden="true" />
      {aberto ? 'ocultar' : 'expandir'}
    </button>
  )

  return (
    <AtlPanel T={T} dark={dark} title="Equipamento (opcional)" action={toggleBtn}>
      {aberto && (
        <div style={{
          padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
          animation: 'idemaq-novaos-fade-up .15s ease-out',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Select T={T} dark={dark}
              label="Tipo"
              size="lg"
              value={form.equipamentoTipo}
              onChange={v => update('equipamentoTipo', v)}
              options={TIPOS_EQUIPAMENTO}
            />
            <Select T={T} dark={dark}
              label="Marca"
              size="lg"
              value={form.equipamentoMarca}
              onChange={v => update('equipamentoMarca', v)}
              options={['', ...MARCAS_EQUIPAMENTO]}
              placeholder="Selecione…"
            />
          </div>

          {form.equipamentoMarca === 'Outros' && (
            <Input T={T} dark={dark}
              label="Nome da marca"
              size="lg"
              value={form.equipamentoMarcaOutros}
              onChange={v => update('equipamentoMarcaOutros', v)}
              placeholder="Ex: Mueller, Suggar, Mondial…"
            />
          )}

          <Input T={T} dark={dark}
            label="Modelo"
            size="lg"
            value={form.equipamentoModelo}
            onChange={v => update('equipamentoModelo', v)}
            placeholder="Ex: BWK11"
          />

          <Input T={T} dark={dark}
            label="Nº de série"
            size="lg"
            value={form.equipamentoSerie}
            onChange={v => update('equipamentoSerie', v)}
            placeholder="Ex: SN-12345"
          />
        </div>
      )}
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Defeito
// ═══════════════════════════════════════════════════════════════════════════
function DefeitoBlock({ T, dark, value, onChange }) {
  return (
    <AtlPanel T={T} dark={dark} title="Defeito relatado (opcional)">
      <div style={{ padding: '12px 14px' }}>
        <Textarea T={T} dark={dark}
          value={value} onChange={onChange}
          placeholder="O que o cliente reportou? Ex: máquina não centrifuga, vaza água embaixo…"
          minHeight={80}
        />
      </div>
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Agendamento
// ═══════════════════════════════════════════════════════════════════════════
function AgendamentoBlock({ T, dark, form, update, rotulo = 'Agendamento da coleta' }) {
  const azul = corEtapa('blue', dark)
  return (
    <AtlPanel T={T} dark={dark} title={`${rotulo} (opcional)`}>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input T={T} dark={dark}
            label="Data"
            size="lg"
            type="date" value={form.data}
            onChange={v => update('data', v)}
          />
          <Input T={T} dark={dark}
            label="Hora"
            size="lg"
            type="time" value={form.hora}
            onChange={v => update('hora', v)}
          />
        </div>
        {!form.data && (
          <div style={{
            padding: '8px 12px',
            background: azul + '12', borderRadius: ATL_RADIUS,
            border: `1px solid ${azul}33`,
            fontSize: 12, color: T.textPrimary, lineHeight: 1.45,
            display: 'flex', alignItems: 'center', gap: 8,
            letterSpacing: '-0.005em',
          }}>
            <i className="ti ti-info-circle"
               style={{ fontSize: 13, color: azul, flexShrink: 0 }}
               aria-hidden="true" />
            <span>Sem data marcada? A OS abre como <strong style={{ color: T.textPrimary }}>Aguardando agendamento</strong>.</span>
          </div>
        )}
      </div>
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Observações
// ═══════════════════════════════════════════════════════════════════════════
function ObservacoesBlock({ T, dark, value, onChange }) {
  return (
    <AtlPanel T={T} dark={dark} title="Observações (opcional)">
      <div style={{ padding: '12px 14px' }}>
        <Textarea T={T} dark={dark}
          value={value} onChange={onChange}
          placeholder="Qualquer info extra pra equipe…"
          minHeight={64}
        />
      </div>
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Máquina do estoque (Venda)
// ═══════════════════════════════════════════════════════════════════════════
function MaquinaEstoqueBlock({ T, dark, selecionada, onSelect, maquinas = [] }) {
  const verde = corEtapa('green', dark)
  return (
    <AtlPanel T={T} dark={dark} title="Máquina do estoque">
      <div>
        {maquinas.length === 0 && (
          <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 12, color: T.textMuted }}>
            Nenhuma máquina disponível no estoque.
          </div>
        )}
        {maquinas.map((m, idx) => {
          const sel = selecionada === m.id
          return (
            <button key={m.id} onClick={() => onSelect(m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', minHeight: 56,
                borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
                background: sel ? `${verde}10` : 'transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: ATL_FONT,
                width: '100%', border: 'none',
                WebkitTapHighlightColor: 'transparent',
                borderLeft: sel ? `3px solid ${verde}` : '3px solid transparent',
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: ATL_RADIUS,
                background: sel ? verde : `${verde}1f`,
                color: sel ? '#fff' : verde,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <i className="ti ti-device-washing-machine" style={{ fontSize: 16 }} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
                  letterSpacing: '-0.005em',
                }}>{m.descricao}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>#{m.id}</div>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: sel ? verde : T.textSecondary,
                fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}>
                R$ {m.valor.toLocaleString('pt-BR')}
              </div>
            </button>
          )
        })}
      </div>
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sticky Footer
// ═══════════════════════════════════════════════════════════════════════════
function StickyFooter({ T, dark, podeSalvar, salvando, obrigatorios, onSalvar }) {
  const faltam = obrigatorios.filter(o => !o.ok)

  return (
    <div style={{
      position: 'relative',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      padding: '12px 16px 14px',
      flexShrink: 0,
      fontFamily: ATL_FONT,
    }}>
      {/* Fade gradient pra disfarçar limite com o body */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: 0, right: 0, top: -24, height: 24,
        background: `linear-gradient(to top, ${T.card}, ${T.card}00)`,
        pointerEvents: 'none',
      }} />

      {faltam.length > 0 && (
        <div style={{
          marginBottom: 10, padding: '8px 12px',
          background: atlSurfaceSunken(dark),
          border: `1px solid ${T.border}`,
          borderRadius: ATL_RADIUS,
          fontSize: 12, color: T.textMuted,
          display: 'flex', alignItems: 'center', gap: 8,
          letterSpacing: '-0.005em', fontFamily: ATL_FONT,
        }}>
          <i className="ti ti-alert-circle"
             style={{ fontSize: 13, color: T.textMuted, flexShrink: 0 }}
             aria-hidden="true" />
          Falta: {faltam.map(f => f.label).join(', ')}
        </div>
      )}

      <AtlButton
        T={T} dark={dark}
        variant="primary"
        fullWidth
        icon={salvando ? 'loader-2' : 'check'}
        onClick={onSalvar}
        disabled={!podeSalvar}
      >
        <span style={{
          fontSize: 14,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {salvando ? 'Criando OS…' : 'Criar OS'}
        </span>
      </AtlButton>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVOS (locais — sem expor pra outras telas)
// ═══════════════════════════════════════════════════════════════════════════

function SkeletonResultado({ T }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: T.card, border: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 12, minHeight: 64,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: T.cardAlt }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, width: '60%', background: T.cardAlt, borderRadius: 4 }} />
        <div style={{ height: 10, width: '40%', background: T.cardAlt, borderRadius: 4, marginTop: 6 }} />
      </div>
    </div>
  )
}

function iniciais(nome) {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
