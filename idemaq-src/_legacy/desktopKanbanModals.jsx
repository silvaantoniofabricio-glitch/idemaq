// idemaq-src/_legacy/desktopKanbanModals.jsx
//
// Componentes herdados do App.jsx monolítico — extraídos verbatim em 14/05/2026.
// Visual e comportamento 100% idênticos ao original. Pendente de refatoração para o
// design system (idemaq-src/components/ui) — fazer em sessões futuras com o Claude Code.
//
// Inclui:
//   - NovaOSModal     (formulário de criação de OS — 3 tipos)
//   - FormSecao       (sub-componente do NovaOSModal)
//   - ModalBase       (overlay genérico)
//   - BannerFinalizada (banner de OS finalizada com reabertura)
//   - OSDetalhe       (modal de detalhe da OS — Resumo/Itens/Histórico/Pagamento)
//   - DetCard, Linha, DetMini, SubBox (helpers do OSDetalhe)

import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { P } from '../theme'
import {
  TIPOS_OS, ETAPAS_TODOS, ZONAS, FUNCIONARIOS,
  CLIENTES_MOCK, ESTOQUE_MAQUINAS_MOCK,
} from '../utils/osData'
import {
  totalAPagar, estaPagaTotal, estaPagaParcial,
  calcStatusPrazo, diasPrazo,
  responsavelAtual, funcPorId,
} from '../utils/osHelpers'
import { fmtPrazoCurto } from '../utils/fmt'
import { corEtapa, bgEtapa } from '../utils/colors'

function NovaOSModal({ T, dark, onClose, tipoInicial, mobile }) {
  const cor = (d, c) => dark ? d : c
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState(tipoInicial || 'atendimento')
  const [form, setForm] = useState({
    cliente:'', clienteId:null, fone:'', endereco:'',
    equipamento:'', defeito:'',
    data:'', hora:'', responsavel:'func1',
    maquinaEstoque:'', valor:'',
    observacoes:''
  })
  const [buscaCli, setBuscaCli] = useState('')
  const [novoCli, setNovoCli] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const clientesFiltrados = buscaCli
    ? CLIENTES_MOCK.filter(c => c.nome.toLowerCase().includes(buscaCli.toLowerCase()) || c.fone.includes(buscaCli)).slice(0, 5)
    : []

  function escolherCliente(c) {
    update('cliente', c.nome); update('clienteId', c.id); update('fone', c.fone); update('endereco', c.endereco)
    setBuscaCli(''); setNovoCli(false)
  }

  function salvar() {
    // Mock: apenas fecha. Aqui depois entra o insert no Supabase.
    alert(`OS de ${TIPOS_OS[tipo].label} criada com sucesso!\n\nCliente: ${form.cliente || '— Estoque'}\nEquipamento: ${form.equipamento}`)
    onClose()
  }

  const corTipo = corEtapa(TIPOS_OS[tipo].cor, dark)
  const inputStyle = { width:'100%', padding:'9px 11px', borderRadius:7, border:`1px solid ${T.border}`, background:T.bg, color:T.textPrimary, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const labelStyle = { fontSize:11, color:T.textMuted, display:'block', marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }

  const podeAvancar = step === 1 ? true :
    tipo === 'atendimento' ? (form.cliente && form.equipamento && form.defeito) :
    tipo === 'fabricacao'  ? (form.equipamento) :
    tipo === 'venda'       ? (form.cliente && form.maquinaEstoque) : false

  return (
    <ModalBase T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={680}>
      <div style={{ padding:'14px 18px 12px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="ti ti-clipboard-plus" style={{ fontSize:17, color:'#fff' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>Nova ordem de serviço</div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>Passo {step} de 2 — {step===1?'Escolha o tipo':TIPOS_OS[tipo].label}</div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar"
          style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:6, borderRadius:6, fontSize:0, lineHeight:0 }}>
          <i className="ti ti-x" style={{ fontSize:20 }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>

        {step === 1 && (
          <>
            <div style={{ fontSize:12.5, color:T.textSecondary, marginBottom:14, lineHeight:1.4 }}>
              Selecione qual o tipo de OS você quer abrir. Cada tipo tem um fluxo próprio e pede informações diferentes.
            </div>
            <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:10 }}>
              {Object.entries(TIPOS_OS).map(([id, cfg]) => {
                const ativo = id === tipo
                const c = corEtapa(cfg.cor, dark)
                const bg = bgEtapa(cfg.cor, dark)
                return (
                  <button key={id} onClick={()=>setTipo(id)}
                    style={{ padding:'18px 14px', borderRadius:11, border:`2px solid ${ativo?c:T.border}`, background:ativo?bg:T.card, cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:6, transition:'border-color .15s, background .15s' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:c+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <i className={`ti ${cfg.icon}`} style={{ fontSize:19, color:c }} aria-hidden="true" />
                      </div>
                      {ativo && <i className="ti ti-circle-check-filled" style={{ fontSize:20, color:c }} aria-hidden="true" />}
                    </div>
                    <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary, marginTop:3 }}>{cfg.label}</div>
                    <div style={{ fontSize:12, color:T.textMuted, lineHeight:1.4 }}>{cfg.descricao}</div>
                    <div style={{ fontSize:10.5, color:T.textDim, marginTop:5, paddingTop:8, borderTop:`1px solid ${T.border}` }}>{cfg.etapas.length} etapas no fluxo</div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 2 && tipo === 'atendimento' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FormSecao titulo="Cliente" icon="ti-user" T={T}>
              {!form.cliente && !novoCli && (
                <div style={{ position:'relative' }}>
                  <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente por nome ou telefone…" style={inputStyle} autoFocus />
                  {clientesFiltrados.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:T.card, border:`1px solid ${T.border}`, borderRadius:7, maxHeight:220, overflowY:'auto', zIndex:10, boxShadow:dark?'0 8px 24px rgba(0,0,0,.4)':'0 4px 16px rgba(0,0,0,.1)' }}>
                      {clientesFiltrados.map(c => (
                        <div key={c.id} onClick={()=>escolherCliente(c)}
                          style={{ padding:'8px 11px', cursor:'pointer', borderBottom:`1px solid ${T.border}`, fontSize:12.5 }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.cardAlt}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ color:T.textPrimary, fontWeight:600 }}>{c.nome}</div>
                          <div style={{ color:T.textMuted, fontSize:11, marginTop:2 }}>{c.fone} · {c.endereco}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop:8, fontSize:11.5, color:T.textMuted }}>
                    Não achou? <button onClick={()=>{setNovoCli(true); setBuscaCli('')}} style={{ background:'transparent', border:'none', color:cor(P.blue,P.blueDark), cursor:'pointer', fontSize:11.5, fontWeight:600, padding:0 }}>+ Cadastrar novo cliente</button>
                  </div>
                </div>
              )}
              {(form.cliente || novoCli) && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'2fr 1fr', gap:10 }}>
                    <div>
                      <label style={labelStyle}>Nome completo</label>
                      <input value={form.cliente} onChange={e=>update('cliente', e.target.value)} style={inputStyle} placeholder="Ex: Maria da Silva" />
                    </div>
                    <div>
                      <label style={labelStyle}>Telefone</label>
                      <input value={form.fone} onChange={e=>update('fone', e.target.value)} style={inputStyle} placeholder="(67) 9 9999-9999" />
                    </div>
                  </div>
                  <div style={{ marginTop:10 }}>
                    <label style={labelStyle}>Endereço (será validado pelo Google Maps)</label>
                    <div style={{ position:'relative' }}>
                      <i className="ti ti-map-pin" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textDim }} aria-hidden="true" />
                      <input value={form.endereco} onChange={e=>update('endereco', e.target.value)} style={{...inputStyle, paddingLeft:32}} placeholder="Rua, número, bairro — Naviraí/MS" />
                    </div>
                  </div>
                  {form.clienteId && (
                    <button onClick={()=>{ update('cliente',''); update('clienteId',null); update('fone',''); update('endereco',''); setNovoCli(false) }}
                      style={{ marginTop:8, background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', fontSize:11, padding:0 }}>← Trocar cliente</button>
                  )}
                </>
              )}
            </FormSecao>

            <FormSecao titulo="Equipamento e defeito relatado" icon="ti-tool" T={T}>
              <label style={labelStyle}>Equipamento (marca + modelo)</label>
              <input value={form.equipamento} onChange={e=>update('equipamento', e.target.value)} style={inputStyle} placeholder="Ex: Lavadora Brastemp 11kg BWK11" />
              <label style={{...labelStyle, marginTop:10}}>Defeito relatado pelo cliente</label>
              <textarea value={form.defeito} onChange={e=>update('defeito', e.target.value)} style={{...inputStyle, minHeight:64, resize:'vertical'}} placeholder="Descreva o que o cliente reportou…" />
            </FormSecao>

            <FormSecao titulo="Agendamento da coleta" icon="ti-calendar-event" T={T}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={labelStyle}>Data</label>
                  <input type="date" value={form.data} onChange={e=>update('data', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={form.hora} onChange={e=>update('hora', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
              </div>
              <div style={{ marginTop:8, fontSize:11, color:T.textDim, fontStyle:'italic' }}>
                Sem data marcada? A OS abre como <strong style={{color:T.textMuted, fontStyle:'normal'}}>Aguardando agendamento</strong>.
              </div>
            </FormSecao>

            <FormSecao titulo="Responsável pela coleta" icon="ti-user-cog" T={T}>
              <div style={{ display:'flex', gap:7 }}>
                {FUNCIONARIOS.map(f => (
                  <button key={f.id} onClick={()=>update('responsavel', f.id)}
                    style={{ flex:1, padding:'9px 8px', borderRadius:7, border:`1px solid ${form.responsavel===f.id?f.cor:T.border}`, background:form.responsavel===f.id?(f.cor+'22'):T.bg, color:form.responsavel===f.id?(dark?f.cor:'#000'):T.textMuted, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontWeight:form.responsavel===f.id?600:500 }}>
                    <span style={{ width:20, height:20, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{f.apelido}</span>
                    {f.nome}
                  </button>
                ))}
              </div>
            </FormSecao>

            <FormSecao titulo="Observações" icon="ti-notes" T={T} opcional>
              <textarea value={form.observacoes} onChange={e=>update('observacoes', e.target.value)} style={{...inputStyle, minHeight:56, resize:'vertical'}} placeholder="Qualquer informação extra que ajude a equipe…" />
            </FormSecao>
          </div>
        )}

        {step === 2 && tipo === 'fabricacao' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:bgEtapa('yellow', dark), border:`1px solid ${corEtapa('yellow', dark)}44`, borderRadius:8, padding:'10px 12px', fontSize:12, color:T.textSecondary, lineHeight:1.5 }}>
              <i className="ti ti-info-circle" style={{ fontSize:14, color:corEtapa('yellow', dark), marginRight:6, verticalAlign:'middle' }} aria-hidden="true" />
              <strong style={{color:T.textPrimary}}>Fabricação:</strong> máquina nova para o estoque. Os itens usados saem do estoque automaticamente ao concluir e a máquina entra como produto pronto, com o custo total calculado.
            </div>

            <FormSecao titulo="Máquina a fabricar" icon="ti-building-factory-2" T={T}>
              <label style={labelStyle}>Descrição</label>
              <input value={form.equipamento} onChange={e=>update('equipamento', e.target.value)} style={inputStyle} placeholder="Ex: Lavadora reformada Brastemp 11kg" />
              <label style={{...labelStyle, marginTop:10}}>Estado inicial / itens a trocar</label>
              <textarea value={form.defeito} onChange={e=>update('defeito', e.target.value)} style={{...inputStyle, minHeight:64, resize:'vertical'}} placeholder="Ex: Estrutura ok, trocar rolamento, polia e colocar capa nova" />
              <label style={{...labelStyle, marginTop:10}}>Custo inicial da máquina base (R$)</label>
              <input type="number" value={form.valor} onChange={e=>update('valor', e.target.value)} style={inputStyle} placeholder="150,00" />
            </FormSecao>

            <FormSecao titulo="Responsável pela fabricação" icon="ti-user-cog" T={T}>
              <div style={{ display:'flex', gap:7 }}>
                {FUNCIONARIOS.map(f => (
                  <button key={f.id} onClick={()=>update('responsavel', f.id)}
                    style={{ flex:1, padding:'9px 8px', borderRadius:7, border:`1px solid ${form.responsavel===f.id?f.cor:T.border}`, background:form.responsavel===f.id?(f.cor+'22'):T.bg, color:form.responsavel===f.id?(dark?f.cor:'#000'):T.textMuted, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontWeight:form.responsavel===f.id?600:500 }}>
                    <span style={{ width:20, height:20, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{f.apelido}</span>
                    {f.nome}
                  </button>
                ))}
              </div>
            </FormSecao>
          </div>
        )}

        {step === 2 && tipo === 'venda' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:bgEtapa('green', dark), border:`1px solid ${corEtapa('green', dark)}44`, borderRadius:8, padding:'10px 12px', fontSize:12, color:T.textSecondary, lineHeight:1.5 }}>
              <i className="ti ti-info-circle" style={{ fontSize:14, color:corEtapa('green', dark), marginRight:6, verticalAlign:'middle' }} aria-hidden="true" />
              <strong style={{color:T.textPrimary}}>Venda:</strong> máquina pronta do estoque. O comprador vira cliente cadastrado automaticamente.
            </div>

            <FormSecao titulo="Cliente comprador" icon="ti-user" T={T}>
              {!form.cliente && !novoCli && (
                <div style={{ position:'relative' }}>
                  <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente por nome ou telefone…" style={inputStyle} autoFocus />
                  {clientesFiltrados.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:T.card, border:`1px solid ${T.border}`, borderRadius:7, maxHeight:220, overflowY:'auto', zIndex:10 }}>
                      {clientesFiltrados.map(c => (
                        <div key={c.id} onClick={()=>escolherCliente(c)} style={{ padding:'8px 11px', cursor:'pointer', borderBottom:`1px solid ${T.border}`, fontSize:12.5 }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.cardAlt}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ color:T.textPrimary, fontWeight:600 }}>{c.nome}</div>
                          <div style={{ color:T.textMuted, fontSize:11 }}>{c.fone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop:8, fontSize:11.5, color:T.textMuted }}>
                    Cliente novo? <button onClick={()=>setNovoCli(true)} style={{ background:'transparent', border:'none', color:cor(P.blue,P.blueDark), cursor:'pointer', fontSize:11.5, fontWeight:600, padding:0 }}>+ Cadastrar agora</button>
                  </div>
                </div>
              )}
              {(form.cliente || novoCli) && (
                <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'2fr 1fr', gap:10 }}>
                  <div>
                    <label style={labelStyle}>Nome</label>
                    <input value={form.cliente} onChange={e=>update('cliente', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telefone</label>
                    <input value={form.fone} onChange={e=>update('fone', e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}
            </FormSecao>

            <FormSecao titulo="Máquina do estoque" icon="ti-package" T={T}>
              <label style={labelStyle}>Selecione a máquina</label>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {ESTOQUE_MAQUINAS_MOCK.map(m => {
                  const sel = form.maquinaEstoque === m.id
                  return (
                    <button key={m.id} onClick={()=>{ update('maquinaEstoque', m.id); update('equipamento', m.descricao); update('valor', m.valor) }}
                      style={{ padding:'10px 12px', borderRadius:7, border:`1px solid ${sel?corEtapa('green',dark):T.border}`, background:sel?bgEtapa('green',dark):T.bg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left' }}>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:T.textPrimary }}>{m.descricao}</div>
                        <div style={{ fontSize:10.5, color:T.textMuted, marginTop:2 }}>#{m.id}</div>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:sel?corEtapa('green',dark):T.textSecondary }}>R$ {m.valor.toLocaleString('pt-BR')}</div>
                    </button>
                  )
                })}
              </div>
            </FormSecao>

            <FormSecao titulo="Endereço e agendamento da entrega" icon="ti-truck-delivery" T={T}>
              <label style={labelStyle}>Endereço (Google Maps)</label>
              <div style={{ position:'relative' }}>
                <i className="ti ti-map-pin" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textDim }} aria-hidden="true" />
                <input value={form.endereco} onChange={e=>update('endereco', e.target.value)} style={{...inputStyle, paddingLeft:32}} placeholder="Endereço de entrega" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
                <div>
                  <label style={labelStyle}>Data</label>
                  <input type="date" value={form.data} onChange={e=>update('data', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={form.hora} onChange={e=>update('hora', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
              </div>
            </FormSecao>
          </div>
        )}
      </div>

      <div style={{ padding:'12px 18px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', gap:10, background:T.cardAlt, flexShrink:0 }}>
        <button onClick={onClose}
          style={{ padding:'9px 16px', borderRadius:7, border:`1px solid ${T.border}`, background:'transparent', color:T.textSecondary, fontSize:13, cursor:'pointer', fontWeight:500 }}>
          Cancelar
        </button>
        <div style={{ display:'flex', gap:8 }}>
          {step > 1 && (
            <button onClick={()=>setStep(s => s-1)}
              style={{ padding:'9px 16px', borderRadius:7, border:`1px solid ${T.border}`, background:T.bg, color:T.textSecondary, fontSize:13, cursor:'pointer', fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>
              <i className="ti ti-arrow-left" style={{ fontSize:14 }} aria-hidden="true" /> Voltar
            </button>
          )}
          {step === 1 && (
            <button onClick={()=>setStep(2)}
              style={{ padding:'9px 18px', borderRadius:7, border:'none', background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, color:'#fff', fontSize:13, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
              Próximo <i className="ti ti-arrow-right" style={{ fontSize:14 }} aria-hidden="true" />
            </button>
          )}
          {step === 2 && (
            <button onClick={salvar} disabled={!podeAvancar}
              style={{ padding:'9px 18px', borderRadius:7, border:'none', background: podeAvancar?`linear-gradient(135deg,${P.blue},#3a7bbf)`:T.cardAlt, color: podeAvancar?'#fff':T.textDim, fontSize:13, cursor: podeAvancar?'pointer':'not-allowed', fontWeight:600, display:'flex', alignItems:'center', gap:6, opacity: podeAvancar?1:.7 }}>
              <i className="ti ti-check" style={{ fontSize:14 }} aria-hidden="true" /> Criar OS
            </button>
          )}
        </div>
      </div>
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
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div onClick={onClose}
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
export { NovaOSModal, OSDetalhe, ModalBase, FormSecao, BannerFinalizada }
