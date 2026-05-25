// idemaq-src/utils/categoriasPeca.js
// Categorias de peças do estoque — espelham o checklist do AcaoDiagnostico.jsx
// (assim a marcação no diagnóstico encontra peças do tipo certo no estoque).
// Pra usar no filtro do Estoque.jsx e pro autocomplete do cadastro de peças.
//
// IMPORTANTE: ao adicionar/remover categoria aqui, refletir também em
// src/components/osDetalhe/RelatorioDiagnostico.jsx (ITENS_DIAG) e em
// src/components/osDetalhe/acoes/AcaoDiagnostico.jsx (GRUPOS).

export const GRUPOS_CATEGORIA = {
  motor:     { label: 'Motor e transmissão', icon: 'ti-engine' },
  agua:      { label: 'Sistema de água',     icon: 'ti-droplet' },
  eletrico:  { label: 'Sistema elétrico',    icon: 'ti-bolt' },
  estrutura: { label: 'Estrutura',           icon: 'ti-tool' },
  externo:   { label: 'Externo / acabamento', icon: 'ti-package' },
  outros:    { label: 'Outros',              icon: 'ti-puzzle' },
}

// Lista plana de categorias — id é stable, label é o que aparece na UI.
// Algumas categorias agrupam variações do diagnóstico (ex: "polia" cobre
// polia_motor + polia_mecanismo) pra simplificar gestão de estoque.
//
// Alterações 24/05/2026 (a pedido do Toni):
//   Excluídas (itens → 'outros'): banda_freio, chave_seletora, chicote,
//     espalhador, filtro, interruptor, microchave
//   Excluídas (itens deletados): motor, motor_ventilador, recipiente, rele
//   Renomeada: molas_dobradicas → id 'dobradicas', label 'Dobradiças'
//   Unificada: painel_decorativo → painel (label 'Paineis')
export const CATEGORIAS_PECA = [
  // Motor e transmissão
  // motor removida 24/05 → itens excluídos do estoque
  { id: 'correia',            label: 'Correia',              grupo: 'motor' },
  { id: 'polia',              label: 'Polia',                grupo: 'motor' },
  { id: 'mecanismo',          label: 'Mecanismo',            grupo: 'motor' },
  { id: 'embreagem',          label: 'Embreagem',            grupo: 'motor' },
  { id: 'atuador_embreagem',  label: 'Atuador / Embreagem',  grupo: 'motor' },
  // banda_freio removida 24/05 → itens migrados para 'outros'
  { id: 'catraca',            label: 'Catraca',              grupo: 'motor' },
  { id: 'rolamento',          label: 'Rolamento',            grupo: 'motor' },
  { id: 'retentor',           label: 'Retentor',             grupo: 'motor' },

  // Sistema de água
  { id: 'eletrobomba',        label: 'Eletrobomba',          grupo: 'agua' },
  { id: 'valvula',            label: 'Válvula',              grupo: 'agua' },
  { id: 'mangueira',          label: 'Mangueira',            grupo: 'agua' },
  { id: 'pressostato',        label: 'Pressostato',          grupo: 'agua' },
  { id: 'borracha_porta',     label: 'Borracha da porta',    grupo: 'agua' },
  { id: 'braco_injetor',      label: 'Braço injetor',        grupo: 'agua' },
  // espalhador removida 24/05 → itens migrados para 'outros'

  // Sistema elétrico
  { id: 'placa',              label: 'Placa eletrônica',     grupo: 'eletrico' },
  { id: 'timer',              label: 'Timer',                grupo: 'eletrico' },
  { id: 'capacitor',          label: 'Capacitor',            grupo: 'eletrico' },
  { id: 'sensor',             label: 'Sensor',               grupo: 'eletrico' },
  { id: 'trava_porta',        label: 'Trava da porta',       grupo: 'eletrico' },
  { id: 'termostato',         label: 'Termostato',           grupo: 'eletrico' },
  { id: 'botao',              label: 'Botão',                grupo: 'eletrico' },
  // chave_seletora, interruptor, microchave, chicote removidas 24/05 → itens migrados para 'outros'
  // rele removida 24/05 → itens excluídos do estoque

  // Estrutura
  { id: 'cesto',              label: 'Cesto',                grupo: 'estrutura' },
  { id: 'agitador',           label: 'Agitador',             grupo: 'estrutura' },
  { id: 'suspensao',          label: 'Suspensão',            grupo: 'estrutura' },
  { id: 'tirantes',           label: 'Tirantes',             grupo: 'estrutura' },
  { id: 'dobradicas',         label: 'Dobradiças',           grupo: 'estrutura' },
  { id: 'pe_nivelador',       label: 'Pé nivelador',         grupo: 'estrutura' },
  { id: 'suporte',            label: 'Suporte',              grupo: 'estrutura' },
  { id: 'tanquinho',          label: 'Peças de tanquinho',   grupo: 'estrutura' },

  // Externo / acabamento
  { id: 'capa',               label: 'Capa',                 grupo: 'externo' },
  // filtro (filtro de fiapos) removida 24/05 → itens migrados para 'outros'
  { id: 'tampa',              label: 'Tampa',                grupo: 'externo' },
  { id: 'painel',             label: 'Paineis',              grupo: 'externo' },
  // painel_decorativo unificada em 'painel' 24/05
  { id: 'puxador',            label: 'Puxador',              grupo: 'externo' },

  // Outros — fallback pra peças que não se encaixam
  // recipiente removida 24/05 → itens excluídos do estoque
  { id: 'outros',             label: 'Outros',               grupo: 'outros' },
]

// Mapa rápido id → categoria (pra renderizar badge da categoria)
export const CATEGORIA_POR_ID = Object.fromEntries(CATEGORIAS_PECA.map(c => [c.id, c]))

// Conta peças por categoria (helper pra mostrar contador nos chips)
export function contarPorCategoria(pecas) {
  const mapa = {}
  for (const p of pecas) {
    const cat = p.categoria || 'outros'
    mapa[cat] = (mapa[cat] || 0) + 1
  }
  return mapa
}
