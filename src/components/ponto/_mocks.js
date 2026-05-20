// src/components/ponto/_mocks.js
// Mocks visuais do Módulo Ponto.
//
// Alinhado com o schema real (sql/09-ponto-schema.sql):
//   campos: bateu_em · lat · lng · endereco_aproximado
//   tipos:  entrada | saida_almoco | volta_almoco | saida
//
// Datas relativas pra ficar coerente independente do dia em que abrir.

const HOJE = new Date()
const isoData = (dPlus = 0, h = 0, m = 0) => {
  const x = new Date(HOJE)
  x.setDate(x.getDate() + dPlus)
  x.setHours(h, m, 0, 0)
  return x.toISOString()
}

export const FUNCIONARIOS_PONTO = [
  { id: 'func1', nome: 'Alessandro', papel: 'Logística', cor: '#FFD966', email: 'func1@idemaq.com', avatar: 'AL' },
  { id: 'func2', nome: 'Guilherme',  papel: 'Oficina',   cor: '#B8CCE4', email: 'func2@idemaq.com', avatar: 'GU' },
]

export const JORNADA_MOCK = {
  func1: {
    entrada_padrao: '07:30', saida_padrao: '17:30',
    almoco_inicio_padrao: '12:00', almoco_fim_padrao: '13:30',
    carga_diaria_horas: 8.0,
    tolerancia_min: 10,
    banco_horas_saldo: 3.5,
    banco_horas_ativo: true,
    raio_batida_km: 50,
    dias_trabalho: ['seg', 'ter', 'qua', 'qui', 'sex'],
  },
  func2: {
    entrada_padrao: '07:30', saida_padrao: '17:30',
    almoco_inicio_padrao: '12:00', almoco_fim_padrao: '13:30',
    carga_diaria_horas: 8.0,
    tolerancia_min: 10,
    banco_horas_saldo: -1.25,
    banco_horas_ativo: true,
    raio_batida_km: 50,
    dias_trabalho: ['seg', 'ter', 'qua', 'qui', 'sex'],
  },
}

// Batidas do mês corrente — mistura de dias completos, com atrasos, extras
export const BATIDAS_MOCK = {
  func1: [
    // Hoje — em andamento (só entrada)
    { id: 1, tipo: 'entrada',      bateu_em: isoData(0, 7, 58), lat: -23.0653, lng: -54.1903, endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    // Ontem — dia completo com leve atraso
    { id: 2, tipo: 'entrada',      bateu_em: isoData(-1, 7, 42), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    { id: 3, tipo: 'saida_almoco', bateu_em: isoData(-1, 12, 5), endereco_aproximado: 'Restaurante Maria · Naviraí' },
    { id: 4, tipo: 'volta_almoco', bateu_em: isoData(-1, 13, 28), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    { id: 5, tipo: 'saida',        bateu_em: isoData(-1, 17, 35), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    // 2 dias atrás
    { id: 6, tipo: 'entrada',      bateu_em: isoData(-2, 7, 28), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    { id: 7, tipo: 'saida_almoco', bateu_em: isoData(-2, 12, 0), endereco_aproximado: 'Self-service Centro' },
    { id: 8, tipo: 'volta_almoco', bateu_em: isoData(-2, 13, 32), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    { id: 9, tipo: 'saida',        bateu_em: isoData(-2, 18, 45), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
  ],
  func2: [
    // Hoje — em almoço
    { id: 10, tipo: 'entrada',      bateu_em: isoData(0, 7, 30), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    { id: 11, tipo: 'saida_almoco', bateu_em: isoData(0, 12, 0), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    // Ontem
    { id: 12, tipo: 'entrada',      bateu_em: isoData(-1, 7, 25), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    { id: 13, tipo: 'saida_almoco', bateu_em: isoData(-1, 12, 0), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    { id: 14, tipo: 'volta_almoco', bateu_em: isoData(-1, 13, 30), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
    { id: 15, tipo: 'saida',        bateu_em: isoData(-1, 17, 30), endereco_aproximado: 'Oficina Idemaq · Naviraí/MS' },
  ],
}

// Configurações estruturais dos tipos de batida (alinhado ao enum do banco)
export const TIPOS_BATIDA = {
  entrada:      { label: 'Entrada',       labelBatida: 'Bater entrada',     icon: 'ti-clock-play', cor: 'blue'   },
  saida_almoco: { label: 'Saída almoço',  labelBatida: 'Iniciar almoço',    icon: 'ti-coffee',     cor: 'yellow' },
  volta_almoco: { label: 'Volta almoço',  labelBatida: 'Voltar do almoço',  icon: 'ti-clock-play', cor: 'blue'   },
  saida:        { label: 'Saída',         labelBatida: 'Bater saída',       icon: 'ti-clock-stop', cor: 'red'    },
}

// Próximo tipo baseado na última batida
export function proximoTipo(ultimaBatida) {
  if (!ultimaBatida) return 'entrada'
  const mapa = {
    entrada:      'saida_almoco',
    saida_almoco: 'volta_almoco',
    volta_almoco: 'saida',
    saida:        null,
  }
  return mapa[ultimaBatida.tipo] ?? null
}

// Última batida de HOJE pra um funcionário
export function ultimaBatidaHoje(funcId, batidas = BATIDAS_MOCK) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const lista = (batidas[funcId] || [])
    .filter(b => new Date(b.bateu_em) >= hoje)
    .sort((a, b) => new Date(b.bateu_em) - new Date(a.bateu_em))
  return lista[0] || null
}

// Todas as batidas de hoje agrupadas por funcionário (pra dashboard do dono)
export function batidasDeHoje(funcId, batidas = BATIDAS_MOCK) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return (batidas[funcId] || [])
    .filter(b => new Date(b.bateu_em) >= hoje)
    .sort((a, b) => new Date(a.bateu_em) - new Date(b.bateu_em))
}

// Tempo trabalhado HOJE até agora (em minutos) — descontando almoço
export function minutosTrabalhadosHoje(funcId, batidas = BATIDAS_MOCK) {
  const lista = batidasDeHoje(funcId, batidas)
  if (lista.length === 0) return 0
  let totalMin = 0
  let entrada = null
  for (const b of lista) {
    const t = new Date(b.bateu_em)
    if (b.tipo === 'entrada' || b.tipo === 'volta_almoco') {
      entrada = t
    } else if ((b.tipo === 'saida_almoco' || b.tipo === 'saida') && entrada) {
      totalMin += Math.round((t - entrada) / 60000)
      entrada = null
    }
  }
  // Se a última batida foi entrada/volta e ainda está trabalhando, conta até agora
  if (entrada) {
    totalMin += Math.round((Date.now() - entrada) / 60000)
  }
  return totalMin
}

// Formatadores
export function fmtHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDuracao(minutos) {
  if (minutos == null || isNaN(minutos)) return '0h00'
  const h = Math.floor(Math.abs(minutos) / 60)
  const m = Math.abs(minutos) % 60
  const sign = minutos < 0 ? '-' : ''
  return `${sign}${h}h${String(m).padStart(2, '0')}`
}

export function fmtBancoHoras(saldoHoras) {
  if (saldoHoras == null) return '0h00'
  const totalMin = Math.round(saldoHoras * 60)
  const f = fmtDuracao(Math.abs(totalMin))
  return saldoHoras >= 0 ? `+${f}` : `-${f}`
}

// Status atual do funcionário (pra dashboard do dono)
export function statusFuncionario(funcId, batidas = BATIDAS_MOCK) {
  const ultima = ultimaBatidaHoje(funcId, batidas)
  if (!ultima) return { codigo: 'ausente', label: 'Sem batida hoje', cor: 'neutro' }
  if (ultima.tipo === 'saida') return { codigo: 'encerrado', label: 'Expediente encerrado', cor: 'neutro' }
  if (ultima.tipo === 'saida_almoco') return { codigo: 'almoco', label: 'Em almoço', cor: 'yellow' }
  // entrada ou volta_almoco → trabalhando
  return { codigo: 'trabalhando', label: 'Trabalhando', cor: 'blue' }
}
