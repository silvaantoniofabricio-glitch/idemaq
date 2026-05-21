// src/components/logistica/AdicionarOSARotaModal.jsx
// Modal aberto quando user clica "+ Rota" em uma OS da sidebar de logística.
//
// Fluxo:
//   1. User escolhe DESTINO: rota nova OU rota existente da mesma data
//   2. User confirma TIPO da parada (default sugerido pela etapa)
//   3. Submit: cria rota (se "nova") ou faz UPDATE em paradas (se existente)
//
// Tipos de parada:
//   - coleta:   conta no limite 2C+2E (carro cabe 2 maquinas por vez)
//   - entrega:  idem
//   - cobranca: nao conta (so passa pra receber)
//   - visita:   nao conta (manutencao simples sem mover maquina)
//
// (Avulsa — sem OS — fica pra outro fluxo: botao "+ Parada Avulsa" no
//  RotaDetalheModal.)

import React, { useMemo, useState } from 'react'
import { Modal, Button, useToast } from '../ui'
import { corEtapa, corHero } from '../../utils/colors'
import { useUsuarios } from '../../hooks/useUsuarios'
import { tipoParadaPorEtapa } from '../../hooks/useOSLogistica'
import AddressInput from './AddressInput'

const TIPOS_PARADA = [
  { id: 'coleta',    label: 'Coleta',    icon: 'ti-arrow-down-circle', cor: 'blue',   contaLimite: true,  desc: 'Buscar máquina' },
  { id: 'entrega',   label: 'Entrega',   icon: 'ti-truck-delivery',    cor: 'green',  contaLimite: true,  desc: 'Devolver máquina' },
  { id: 'cobranca',  label: 'Cobrança',  icon: 'ti-cash',              cor: 'yellow', contaLimite: false, desc: 'Passar pra receber' },
  { id: 'visita',    label: 'Visita',    icon: 'ti-tool',              cor: 'blue',   contaLimite: false, desc: 'Manutenção no local' },
]

const TIPO_AVULSA = { id: 'avulsa', label: 'Avulsa', cor: 'neutro', contaLimite: false }

const hojeISO = () => new Date().toISOString().slice(0, 10)

function contarParadas(rota) {
  const c = { coleta: 0, entrega: 0 }
  for (const p of (rota?.paradas || [])) {
    if (p.tipo === 'coleta') c.coleta++
    else if (p.tipo === 'entrega') c.entrega++
  }
  return c
}

export default function AdicionarOSARotaModal({
  T, dark, mobile = false,
  os,                  // OS vinda da sidebar — null quando modo=avulsa
  modo = 'os',         // 'os' | 'avulsa'
  rotas = [],          // todas as rotas (filtra por data internamente)
  onClose,
  onCriarRota,         // async (payload) => { data, error }
  onAtualizarRota,     // async (id, patch) => { data, error }
}) {
  const modoAvulsa = modo === 'avulsa'
  if (!modoAvulsa && !os) return null
  const notify = useToast()
  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)
  const verde    = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  const { usuarios } = useUsuarios()
  const motoristas = useMemo(
    () => usuarios.filter(u => u.papel === 'logistica' || u.papel === 'dono'),
    [usuarios]
  )

  // Data sugerida: data_agendamento da OS, senão hoje
  const dataSugerida = modoAvulsa
    ? hojeISO()
    : (os?.data_agendamento || '').slice(0, 10) || hojeISO()

  // ─── Estado ───────────────────────────────────────────────────────────────
  const [data, setData]              = useState(dataSugerida)
  const [destino, setDestino]        = useState('nova') // 'nova' | rotaId
  const [tipoParada, setTipoParada]  = useState(modoAvulsa ? 'avulsa' : (os?.tipoParadaSugerido || 'coleta'))
  const [motoristaId, setMotoristaId] = useState(() => motoristas[0]?.id || '')
  const [salvando, setSalvando]      = useState(false)
  // Campos avulsa (só usados em modo=avulsa)
  const [avulsaNome,      setAvulsaNome]      = useState('')
  const [avulsaEndereco,  setAvulsaEndereco]  = useState('')
  const [avulsaLat,       setAvulsaLat]       = useState(null)
  const [avulsaLng,       setAvulsaLng]       = useState(null)

  // Quando data muda, escolhe motorista default se ainda não tem
  // (usuarios pode carregar depois do mount)
  React.useEffect(() => {
    if (!motoristaId && motoristas.length > 0) setMotoristaId(motoristas[0].id)
  }, [motoristas, motoristaId])

  // Rotas existentes pra essa data
  const rotasDaData = useMemo(
    () => rotas.filter(r => (r.data || '').slice(0, 10) === data && !r.deleted_at),
    [rotas, data]
  )

  // ─── Validação limite (2 coletas + 2 entregas por rota) ──────────────────
  const rotaAlvo = destino !== 'nova' ? rotasDaData.find(r => r.id === destino) : null
  const contagem = rotaAlvo ? contarParadas(rotaAlvo) : { coleta: 0, entrega: 0 }
  const tipoCfg = modoAvulsa
    ? TIPO_AVULSA
    : TIPOS_PARADA.find(t => t.id === tipoParada)

  const estouroLimite = tipoCfg?.contaLimite && rotaAlvo && contagem[tipoParada] >= 2
  const camposAvulsaOk = !modoAvulsa || (avulsaNome.trim() && avulsaEndereco.trim())
  const podeSalvar = !!motoristaId && !!data && !estouroLimite && camposAvulsaOk && !salvando

  // ─── Submit ──────────────────────────────────────────────────────────────
  async function salvar() {
    if (!podeSalvar) return
    setSalvando(true)

    const novaParada = modoAvulsa
      ? {
          id: crypto.randomUUID(),
          ordem: (rotaAlvo?.paradas?.length || 0) + 1,
          tipo: 'avulsa',
          os_id: null,
          os_num: null,
          cliente_nome: avulsaNome.trim(),
          cliente_fone: null,
          endereco: avulsaEndereco.trim() || null,
          lat: avulsaLat,
          lng: avulsaLng,
          horario_previsto: null,
          horario_chegada: null,
          status: 'pendente',
          foto_url: null,
          observacoes: null,
        }
      : {
          id: crypto.randomUUID(),
          ordem: (rotaAlvo?.paradas?.length || 0) + 1,
          tipo: tipoParada,
          os_id: os.id,
          os_num: os.numero,
          cliente_nome: os.cliente_nome,
          cliente_fone: os.cliente_telefone || null,
          endereco: os.endereco || null,
          lat: os.lat || null,
          lng: os.lng || null,
          horario_previsto: null,
          horario_chegada: null,
          status: 'pendente',
          foto_url: null,
          observacoes: null,
        }

    let res
    if (destino === 'nova') {
      res = await onCriarRota({
        data,
        motorista_id: motoristaId,
        paradas: [novaParada],
        status: 'planejada',
      })
    } else {
      const novasParadas = [...(rotaAlvo.paradas || []), novaParada]
      res = await onAtualizarRota(rotaAlvo.id, { paradas: novasParadas })
    }

    setSalvando(false)
    if (res?.error) {
      notify('erro', `Falha ao adicionar: ${res.error.message || 'erro desconhecido'}`)
      return
    }
    notify('ok', modoAvulsa
      ? `Parada avulsa "${avulsaNome}" adicionada à rota`
      : `OS #${os.numero} adicionada à rota`)
    onClose?.()
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={520}>
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${azul}22`, color: azul,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-route" style={{ fontSize: 17 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark) }}>
            {modoAvulsa ? 'Nova parada avulsa' : 'Adicionar a uma rota'}
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {modoAvulsa
              ? 'Parada sem OS (loja, abastecer, almoço, etc)'
              : `OS #${os.numero} · ${os.cliente_nome} · ${os.etapa_label}`}
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar"
          style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'transparent', border: 'none', color: T.textMuted,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <i className="ti ti-x" style={{ fontSize: 17 }} aria-hidden="true" />
        </button>
      </div>

      <div style={{
        padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        {/* Campos da parada avulsa */}
        {modoAvulsa && (
          <>
            <div>
              <Label T={T}>Nome da parada</Label>
              <input type="text" value={avulsaNome}
                onChange={(e) => setAvulsaNome(e.target.value)}
                placeholder="Ex: BCM Peças, Posto Shell, Almoço"
                style={inputStyle(T)} />
            </div>
            <AddressInput
              T={T} dark={dark}
              label="Endereço"
              value={avulsaEndereco}
              onChange={({ endereco, lat, lng }) => {
                setAvulsaEndereco(endereco)
                setAvulsaLat(lat)
                setAvulsaLng(lng)
              }}
              placeholder="Rua, número — bairro, cidade/UF"
              required
            />
          </>
        )}

        {/* Tipo da parada (só modo OS) */}
        {!modoAvulsa && (<>
        <div>
          <Label T={T}>Tipo da parada</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {TIPOS_PARADA.map(t => {
              const ativo = tipoParada === t.id
              const corT = corEtapa(t.cor, dark)
              return (
                <button key={t.id}
                  onClick={() => setTipoParada(t.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    border: `1.5px solid ${ativo ? corT : T.border}`,
                    background: ativo ? `${corT}15` : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                  }}>
                  <i className={`ti ${t.icon}`} style={{ fontSize: 16, color: ativo ? corT : T.textMuted }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: ativo ? corT : T.textPrimary, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {t.label}
                      {t.contaLimite && (
                        <span style={{ fontSize: 9.5, color: T.textDim, fontWeight: 500 }}>conta no limite</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>
                      {t.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        </>)}

        {/* Data */}
        <div>
          <Label T={T}>Data</Label>
          <input type="date" value={data}
            onChange={(e) => { setData(e.target.value); setDestino('nova') }}
            style={{ ...inputStyle(T), colorScheme: dark ? 'dark' : 'light' }} />
        </div>

        {/* Destino: rota nova ou existente */}
        <div>
          <Label T={T}>Em qual rota?</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Opção: rota nova */}
            <DestinoBtn
              T={T} dark={dark} cor={azul}
              ativo={destino === 'nova'}
              onClick={() => setDestino('nova')}
              icon="ti-plus"
              titulo="Criar rota nova"
              subtitulo={`Pra ${data} — você será o 1º a adicionar paradas`}
            />

            {/* Rotas existentes do dia */}
            {rotasDaData.map(r => {
              const c = contarParadas(r)
              const limite = `${c.coleta}C · ${c.entrega}E`
              const lotado = tipoCfg?.contaLimite && c[tipoParada] >= 2
              return (
                <DestinoBtn
                  key={r.id}
                  T={T} dark={dark} cor={azul}
                  ativo={destino === r.id}
                  onClick={() => !lotado && setDestino(r.id)}
                  disabled={lotado}
                  icon="ti-route"
                  titulo={`${r.motorista_nome || 'Sem motorista'} · ${r.status}`}
                  subtitulo={`${(r.paradas?.length || 0)} parada(s) — ${limite}${lotado ? ' · sem vaga pra ' + tipoCfg.label.toLowerCase() : ''}`}
                />
              )
            })}
          </div>
        </div>

        {/* Motorista (só quando rota nova) */}
        {destino === 'nova' && (
          <div>
            <Label T={T}>Motorista</Label>
            <select value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}
              style={inputStyle(T)}>
              <option value="">— escolher —</option>
              {motoristas.map(m => (
                <option key={m.id} value={m.id}>{m.apelido}</option>
              ))}
            </select>
          </div>
        )}

        {/* Aviso de limite */}
        {estouroLimite && (
          <div style={{
            padding: '8px 10px', borderRadius: 6,
            background: `${vermelho}15`, border: `1px solid ${vermelho}44`,
            fontSize: 11.5, color: T.textSecondary,
            display: 'flex', alignItems: 'flex-start', gap: 6,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 13, color: vermelho, marginTop: 1 }} aria-hidden="true" />
            <span>
              Essa rota já tem 2 <strong>{tipoCfg.label.toLowerCase()}s</strong> — limite do carro. Escolha outra rota ou crie uma nova.
            </span>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div style={{
        padding: '12px 18px', borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <Button variant="ghost" T={T} dark={dark} onClick={onClose}>Cancelar</Button>
        <Button
          variant="primary" T={T} dark={dark}
          iconLeft={salvando ? 'ti-loader-2' : 'ti-check'}
          onClick={salvar}
          disabled={!podeSalvar}
        >
          {salvando ? 'Adicionando…' : 'Adicionar à rota'}
        </Button>
      </div>
    </Modal>
  )
}

function Label({ T, children }) {
  return (
    <label style={{
      display: 'block', fontSize: 10.5, color: T.textMuted, fontWeight: 700,
      marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px',
    }}>{children}</label>
  )
}

function inputStyle(T) {
  return {
    width: '100%', padding: '9px 12px', borderRadius: 7,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }
}

function DestinoBtn({ T, dark, cor, ativo, onClick, disabled, icon, titulo, subtitulo }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '9px 12px', borderRadius: 7,
        border: `1.5px solid ${ativo ? cor : T.border}`,
        background: ativo ? `${cor}15` : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 17, color: ativo ? cor : T.textMuted }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: ativo ? cor : T.textPrimary }}>
          {titulo}
        </div>
        <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>
          {subtitulo}
        </div>
      </div>
    </button>
  )
}
