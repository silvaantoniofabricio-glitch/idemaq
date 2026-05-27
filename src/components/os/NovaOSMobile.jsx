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
import {
  TIPOS_OS, ESTOQUE_MAQUINAS_MOCK,
} from '../../utils/osData'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import NovoClienteModal from '../clientes/NovoClienteModal'

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
        const itensPadrao = [
          { os_id: data.id, tipo: 'servico', nome: 'Limpeza',     quantidade: 1, valor_unitario: 165 },
          { os_id: data.id, tipo: 'servico', nome: 'Manutenção',  quantidade: 1, valor_unitario: 165 },
          { os_id: data.id, tipo: 'desloc',  nome: 'Deslocamento', quantidade: 1, valor_unitario: 20 },
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
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        opacity: montado ? 1 : 0,
        transition: 'opacity .18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '94vh',
          background: T.card,
          borderRadius: '20px 20px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          transform: montado ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .24s cubic-bezier(.2,.8,.2,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle visual */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: T.border,
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
      padding: '4px 16px 14px',
      borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      flexShrink: 0,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 18, fontWeight: 700, color: corHero(dark),
          letterSpacing: '-.2px',
        }}>
          Nova ordem de serviço
        </div>
        <div style={{
          marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11.5, color: T.textMuted, fontWeight: 500,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 10,
            background: completo ? `${verde}1f` : `${azul}1f`,
            color: completo ? verde : azul,
            fontWeight: 700, fontSize: 11,
          }}>
            <i className={`ti ${completo ? 'ti-check' : 'ti-progress'}`}
               style={{ fontSize: 12 }} aria-hidden="true" />
            {okObg} de {totalObg} obrigatório{totalObg !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <button onClick={onClose} aria-label="Fechar"
        style={{
          width: 40, height: 40, borderRadius: 12,
          background: T.cardAlt, border: `1px solid ${T.border}`,
          color: T.textPrimary, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
        <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
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
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
        background: T.bg, padding: 4, borderRadius: 12,
        border: `1px solid ${T.border}`,
      }}>
        {TIPOS_ORDEM.map(id => {
          const cfg = TIPOS_OS[id]
          if (!cfg) return null
          const ativo = id === tipo
          const c = corEtapa(cfg.cor, dark)
          return (
            <button key={id} onClick={() => onChange(id)}
              style={{
                padding: '10px 4px', borderRadius: 9, border: 'none',
                background: ativo ? T.card : 'transparent',
                color: ativo ? c : T.textMuted,
                fontSize: 13, fontWeight: ativo ? 700 : 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: ativo ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'background .15s, color .15s, box-shadow .15s',
                minHeight: 40,
              }}>
              <i className={`ti ${cfg.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <InfoBanner T={T} dark={dark} cor={verde}
        titulo="Venda do estoque"
        texto="Máquina pronta. O comprador vira cliente cadastrado automaticamente."
      />

      <ClienteBlock
        T={T} dark={dark}
        form={form} setForm={setForm}
        notify={notify}
        rotulo="Cliente comprador"
      />

      <MaquinaEstoqueBlock
        T={T} dark={dark}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <InfoBanner T={T} dark={dark} cor={amarelo}
        titulo="Fabricação pro estoque"
        texto="Os itens usados saem do estoque ao concluir, e a máquina entra como produto pronto."
      />

      <BlocoSecao T={T} dark={dark} icon="ti-building-factory-2" titulo="Máquina a fabricar" obrigatorio>
        <Field T={T} label="Tipo de máquina">
          <NativeSelect T={T} dark={dark}
            value={form.equipamentoTipo}
            onChange={v => update('equipamentoTipo', v)}
            options={['', ...TIPOS_EQUIPAMENTO]}
            placeholder="Selecione…"
          />
        </Field>

        <Field T={T} label="Descrição / estado inicial" opcional>
          <NativeTextarea T={T} dark={dark}
            value={form.defeito}
            onChange={v => update('defeito', v)}
            placeholder="Ex: estrutura ok, trocar rolamento, polia, capa nova"
            minHeight={80}
          />
        </Field>

        <Field T={T} label="Custo inicial da máquina base (R$)" opcional>
          <NativeInput T={T} dark={dark}
            type="number" inputMode="decimal"
            value={form.valor}
            onChange={v => update('valor', v)}
            placeholder="150,00"
          />
        </Field>
      </BlocoSecao>
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

  // Debounce 250ms, 2+ chars
  useEffect(() => {
    const termo = busca.trim()
    if (termo.length < 2) {
      setResultados([])
      setLoading(false)
      return
    }
    setLoading(true)
    const safe = termo.replace(/[,()%_]/g, ' ').trim()
    const handle = setTimeout(async () => {
      try {
        const [rn, rf] = await Promise.all([
          supabase.from('cliente').select('id, nome, telefone, endereco')
            .is('deleted_at', null).ilike('nome', `%${safe}%`)
            .order('nome', { ascending: true }).limit(20),
          supabase.from('cliente').select('id, nome, telefone, endereco')
            .is('deleted_at', null).ilike('telefone', `%${safe}%`)
            .order('nome', { ascending: true }).limit(20),
        ])
        if (rn.error) throw rn.error
        if (rf.error) throw rf.error
        const dedupe = new Map()
        ;[...(rn.data || []), ...(rf.data || [])].forEach(c => dedupe.set(c.id, c))
        setResultados(Array.from(dedupe.values()).slice(0, 20).map(c => ({
          id: c.id, nome: c.nome,
          fone: c.telefone || '',
          endereco: c.endereco || '',
          enderecos: c.endereco ? [c.endereco] : [],
        })))
      } catch (e) {
        console.error('[NovaOSMobile] busca cliente erro:', e)
        notify?.('erro', `Erro buscando clientes: ${e?.message || e}`)
        setResultados([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(handle)
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

  async function clienteCadastrado(novo) {
    // Mesmo fluxo do legacy: novo vem do NovoClienteModal já persistido
    escolher({
      id: novo.id,
      nome: novo.nome,
      fone: novo.telefone || '',
      endereco: novo.endereco || '',
      enderecos: novo.endereco ? [novo.endereco] : [],
    })
    setModalNovoCli(false)
  }

  // Wrapper de criar pro NovoClienteModal — não usa useClientes pra não pagar
  // o custo de listar 782 clientes só pra inserir 1.
  const criarWrapper = async (payload) => criarClientePersist(payload)

  return (
    <>
      <SectionHeader T={T} dark={dark} icon="ti-user" titulo={rotulo} obrigatorio />

      {!form.cliente ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Input de busca */}
          <div style={{ position: 'relative' }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 18, color: T.textMuted,
            }} aria-hidden="true" />
            <input
              className="idemaq-novaos-input"
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou telefone…"
              style={{
                width: '100%', minHeight: 52,
                padding: '12px 14px 12px 44px',
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.card, color: T.textPrimary,
                fontSize: 16, // não <16px → evita zoom iOS
                outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color .15s, box-shadow .15s',
              }}
            />
            {loading && (
              <i className="ti ti-loader-2" aria-hidden="true" style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 18, color: T.textMuted,
                animation: 'idemaq-novaos-spin .8s linear infinite',
              }} />
            )}
          </div>

          {/* Resultados como cards */}
          {busca.trim().length >= 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loading && resultados.length === 0 && (
                <SkeletonResultado T={T} />
              )}
              {!loading && resultados.length === 0 && (
                <div style={{
                  padding: '14px 16px', borderRadius: 12,
                  border: `1px dashed ${T.border}`,
                  color: T.textMuted, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <i className="ti ti-mood-empty" style={{ fontSize: 18 }} aria-hidden="true" />
                  Nenhum cliente pra "{busca.trim()}"
                </div>
              )}
              {resultados.map(c => (
                <button key={c.id} onClick={() => escolher(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12,
                    border: `1px solid ${T.border}`,
                    background: T.card, color: T.textPrimary,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    width: '100%', minHeight: 64,
                    animation: 'idemaq-novaos-fade-up .12s ease-out',
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 20,
                    background: `${azul}1f`, color: azul,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <i className="ti ti-user" style={{ fontSize: 18 }} aria-hidden="true" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: corHero(dark),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                      {c.fone || '— sem telefone —'}
                      {c.enderecos.length > 0 && (
                        <> · {c.enderecos.length} end.</>
                      )}
                    </div>
                  </div>
                  <i className="ti ti-chevron-right" style={{
                    fontSize: 16, color: T.textMuted, flexShrink: 0,
                  }} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {/* Atalho cadastrar novo */}
          <button onClick={() => setModalNovoCli(true)}
            style={{
              padding: '12px 14px', borderRadius: 12, minHeight: 48,
              border: `1.5px dashed ${azul}55`,
              background: `${azul}0d`,
              color: azul, fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <i className="ti ti-user-plus" style={{ fontSize: 16 }} aria-hidden="true" />
            Cadastrar novo cliente
          </button>
        </div>
      ) : (
        // Cliente selecionado
        <div style={{
          padding: 14, borderRadius: 14,
          background: `${azul}10`,
          border: `1px solid ${azul}55`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: azul, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: 15, fontWeight: 700,
          }}>
            {iniciais(form.cliente)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: corHero(dark),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{form.cliente}</div>
            <div style={{
              fontSize: 12, color: T.textMuted, marginTop: 2,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <i className="ti ti-phone" style={{ fontSize: 11 }} aria-hidden="true" />
              {form.fone || '—'}
            </div>
          </div>
          <button onClick={trocar} aria-label="Trocar cliente"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: T.card, border: `1px solid ${T.border}`,
              color: T.textSecondary, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
            <i className="ti ti-edit" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
        </div>
      )}

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
    <div>
      <SectionHeader T={T} dark={dark} icon="ti-map-pin" titulo={rotulo} obrigatorio />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {enderecos.map((end, idx) => {
          const sel = enderecoIndex === idx
          return (
            <button key={idx} onClick={() => onSelect(idx, end)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px', minHeight: 64,
                borderRadius: 12,
                border: `${sel ? 1.5 : 1}px solid ${sel ? azul : T.border}`,
                background: sel ? `${azul}10` : T.card,
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                width: '100%',
              }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11,
                border: `2px solid ${sel ? azul : T.textDim}`,
                background: sel ? azul : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                {sel && <div style={{ width: 8, height: 8, borderRadius: 4, background: '#fff' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: corHero(dark) }}>
                    Endereço {idx + 1}
                  </span>
                  {idx === 0 && (
                    <span style={{
                      fontSize: 9.5, padding: '2px 6px',
                      borderRadius: 4, fontWeight: 800,
                      background: `${azul}22`, color: azul, letterSpacing: '.3px',
                    }}>PRINCIPAL</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.45 }}>
                  {end}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Equipamento (acordeão)
// ═══════════════════════════════════════════════════════════════════════════
function EquipamentoBlock({ T, dark, form, update }) {
  // Pre-expand se tem algo já preenchido
  const algumValor = !!(form.equipamentoMarca || form.equipamentoModelo || form.equipamentoSerie)
  const [aberto, setAberto] = useState(algumValor)

  return (
    <div>
      <button onClick={() => setAberto(a => !a)}
        style={{
          width: '100%', padding: 0,
          background: 'transparent', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: aberto ? 10 : 0,
        }}>
        <SectionHeader T={T} dark={dark} icon="ti-device-washing-machine" titulo="Equipamento" opcional noBottom />
        <i className={`ti ${aberto ? 'ti-chevron-up' : 'ti-chevron-down'}`}
           style={{ fontSize: 18, color: T.textMuted }} aria-hidden="true" />
      </button>

      {aberto && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          animation: 'idemaq-novaos-fade-up .15s ease-out',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field T={T} label="Tipo">
              <NativeSelect T={T} dark={dark}
                value={form.equipamentoTipo}
                onChange={v => update('equipamentoTipo', v)}
                options={TIPOS_EQUIPAMENTO}
              />
            </Field>
            <Field T={T} label="Marca">
              <NativeSelect T={T} dark={dark}
                value={form.equipamentoMarca}
                onChange={v => update('equipamentoMarca', v)}
                options={['', ...MARCAS_EQUIPAMENTO]}
                placeholder="Selecione…"
              />
            </Field>
          </div>

          {form.equipamentoMarca === 'Outros' && (
            <Field T={T} label="Nome da marca">
              <NativeInput T={T} dark={dark}
                value={form.equipamentoMarcaOutros}
                onChange={v => update('equipamentoMarcaOutros', v)}
                placeholder="Ex: Mueller, Suggar, Mondial…"
              />
            </Field>
          )}

          <Field T={T} label="Modelo">
            <NativeInput T={T} dark={dark}
              value={form.equipamentoModelo}
              onChange={v => update('equipamentoModelo', v)}
              placeholder="Ex: BWK11"
            />
          </Field>

          <Field T={T} label="Nº de série">
            <NativeInput T={T} dark={dark}
              value={form.equipamentoSerie}
              onChange={v => update('equipamentoSerie', v)}
              placeholder="Ex: SN-12345"
            />
          </Field>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Defeito
// ═══════════════════════════════════════════════════════════════════════════
function DefeitoBlock({ T, dark, value, onChange }) {
  return (
    <div>
      <SectionHeader T={T} dark={dark} icon="ti-message-circle" titulo="Defeito relatado" opcional />
      <NativeTextarea T={T} dark={dark}
        value={value} onChange={onChange}
        placeholder="O que o cliente reportou? Ex: máquina não centrifuga, vaza água embaixo…"
        minHeight={80}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Agendamento
// ═══════════════════════════════════════════════════════════════════════════
function AgendamentoBlock({ T, dark, form, update, rotulo = 'Agendamento da coleta' }) {
  const azul = corEtapa('blue', dark)
  return (
    <div>
      <SectionHeader T={T} dark={dark} icon="ti-calendar-event" titulo={rotulo} opcional />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field T={T} label="Data">
          <NativeInput T={T} dark={dark}
            type="date" value={form.data}
            onChange={v => update('data', v)}
          />
        </Field>
        <Field T={T} label="Hora">
          <NativeInput T={T} dark={dark}
            type="time" value={form.hora}
            onChange={v => update('hora', v)}
          />
        </Field>
      </div>
      {!form.data && (
        <div style={{
          marginTop: 10, padding: '10px 12px',
          background: `${azul}10`, borderRadius: 10,
          border: `1px solid ${azul}33`,
          fontSize: 12, color: T.textSecondary, lineHeight: 1.45,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14, color: azul, flexShrink: 0 }} aria-hidden="true" />
          <span>Sem data marcada? A OS abre como <strong style={{ color: corHero(dark) }}>Aguardando agendamento</strong>.</span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Observações
// ═══════════════════════════════════════════════════════════════════════════
function ObservacoesBlock({ T, dark, value, onChange }) {
  return (
    <div>
      <SectionHeader T={T} dark={dark} icon="ti-notes" titulo="Observações" opcional />
      <NativeTextarea T={T} dark={dark}
        value={value} onChange={onChange}
        placeholder="Qualquer info extra pra equipe…"
        minHeight={64}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCO: Máquina do estoque (Venda)
// ═══════════════════════════════════════════════════════════════════════════
function MaquinaEstoqueBlock({ T, dark, selecionada, onSelect }) {
  const verde = corEtapa('green', dark)
  return (
    <div>
      <SectionHeader T={T} dark={dark} icon="ti-package" titulo="Máquina do estoque" obrigatorio />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ESTOQUE_MAQUINAS_MOCK.map(m => {
          const sel = selecionada === m.id
          return (
            <button key={m.id} onClick={() => onSelect(m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', minHeight: 64,
                borderRadius: 12,
                border: `${sel ? 1.5 : 1}px solid ${sel ? verde : T.border}`,
                background: sel ? `${verde}10` : T.card,
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                width: '100%',
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: sel ? verde : `${verde}1f`,
                color: sel ? '#fff' : verde,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <i className="ti ti-device-washing-machine" style={{ fontSize: 18 }} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: corHero(dark),
                }}>{m.descricao}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>#{m.id}</div>
              </div>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: sel ? verde : T.textSecondary,
                fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}>
                R$ {m.valor.toLocaleString('pt-BR')}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sticky Footer
// ═══════════════════════════════════════════════════════════════════════════
function StickyFooter({ T, dark, podeSalvar, salvando, obrigatorios, onSalvar }) {
  const azul = corEtapa('blue', dark)
  const faltam = obrigatorios.filter(o => !o.ok)

  return (
    <div style={{
      position: 'relative',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      padding: '12px 16px 14px',
      flexShrink: 0,
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
          background: T.cardAlt, borderRadius: 10,
          fontSize: 12, color: T.textMuted,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
          Falta: {faltam.map(f => f.label).join(', ')}
        </div>
      )}

      <button onClick={onSalvar} disabled={!podeSalvar}
        style={{
          width: '100%', minHeight: 54,
          padding: '14px 16px', borderRadius: 14, border: 'none',
          background: podeSalvar
            ? `linear-gradient(135deg, ${P.blue}, #3a7bbf)`
            : T.cardAlt,
          color: podeSalvar ? '#fff' : T.textDim,
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          cursor: podeSalvar ? 'pointer' : 'not-allowed',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: podeSalvar ? '0 4px 14px rgba(91,155,213,0.35)' : 'none',
          transition: 'background .15s, box-shadow .15s, color .15s',
        }}>
        <i className={`ti ${salvando ? 'ti-loader-2' : 'ti-check'}`}
           style={{
             fontSize: 18,
             animation: salvando ? 'idemaq-novaos-spin .8s linear infinite' : undefined,
           }} aria-hidden="true" />
        {salvando ? 'Criando OS…' : 'Criar OS'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVOS (locais — sem expor pra outras telas)
// ═══════════════════════════════════════════════════════════════════════════
function SectionHeader({ T, dark, icon, titulo, obrigatorio, opcional, noBottom }) {
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: noBottom ? 0 : 10,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 17, color: azul }} aria-hidden="true" />
      <span style={{
        fontSize: 13, fontWeight: 700, color: corHero(dark),
        letterSpacing: '-.1px',
      }}>{titulo}</span>
      {obrigatorio && (
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: '.4px',
          padding: '2px 6px', borderRadius: 4,
          background: `${vermelho}1c`, color: vermelho,
        }}>OBRIGATÓRIO</span>
      )}
      {opcional && (
        <span style={{
          fontSize: 10.5, fontWeight: 500, color: T.textDim,
        }}>· opcional</span>
      )}
    </div>
  )
}

function Field({ T, label, opcional, children }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 600, color: T.textMuted,
        letterSpacing: '.3px', textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        {label}
        {opcional && (
          <span style={{ fontSize: 10, fontWeight: 500, color: T.textDim, letterSpacing: 'normal', textTransform: 'none' }}>
            · opcional
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function NativeInput({ T, dark, type = 'text', inputMode, value, onChange, placeholder }) {
  return (
    <input
      className="idemaq-novaos-input"
      type={type}
      inputMode={inputMode}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputBaseStyle(T, dark)}
    />
  )
}

function NativeSelect({ T, dark, value, onChange, options, placeholder }) {
  return (
    <select
      className="idemaq-novaos-input"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...inputBaseStyle(T, dark),
        colorScheme: dark ? 'dark' : 'light',
        appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(T.textMuted)}' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        paddingRight: 36,
      }}>
      {options.map((opt, i) => (
        <option key={i} value={opt}>{opt || (placeholder || 'Selecione…')}</option>
      ))}
    </select>
  )
}

function NativeTextarea({ T, dark, value, onChange, placeholder, minHeight = 80 }) {
  return (
    <textarea
      className="idemaq-novaos-input"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...inputBaseStyle(T, dark),
        minHeight,
        resize: 'vertical',
        lineHeight: 1.45,
      }}
    />
  )
}

function inputBaseStyle(T, dark) {
  return {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    borderRadius: 12,
    border: `1px solid ${T.border}`,
    background: T.card,
    color: T.textPrimary,
    fontSize: 16, // não <16 — evita zoom iOS
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    colorScheme: dark ? 'dark' : 'light',
    transition: 'border-color .15s, box-shadow .15s',
  }
}

function InfoBanner({ T, dark, cor, titulo, texto }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: `${cor}10`,
      border: `1px solid ${cor}33`,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <i className="ti ti-info-circle" style={{ fontSize: 18, color: cor, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: corHero(dark), marginBottom: 2 }}>{titulo}</div>
        <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.45 }}>{texto}</div>
      </div>
    </div>
  )
}

function BlocoSecao({ T, dark, icon, titulo, obrigatorio, children }) {
  return (
    <div>
      <SectionHeader T={T} dark={dark} icon={icon} titulo={titulo} obrigatorio={obrigatorio} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

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
