// idemaq-src/utils/categoriasPeca.js
// Categorias de peças do estoque — espelham o checklist do AcaoDiagnostico.jsx
// (assim a marcação no diagnóstico encontra peças do tipo certo no estoque).
// Pra usar no filtro do Estoque.jsx e pro autocomplete do cadastro de peças.
//
// IMPORTANTE: ao adicionar/remover categoria aqui, refletir também em
// src/components/osDetalhe/RelatorioDiagnostico.jsx (ITENS_DIAG) e em
// src/components/osDetalhe/acoes/AcaoDiagnostico.jsx (GRUPOS).

export const GRUPOS_CATEGORIA = {
  motor:     { label: 'Motor e transmissão',  icon: 'ti-engine' },
  agua:      { label: 'Sistema de água',      icon: 'ti-droplet' },
  eletrico:  { label: 'Sistema elétrico',     icon: 'ti-bolt' },
  estrutura: { label: 'Estrutura interna',    icon: 'ti-tool' },
  acabamento:{ label: 'Acabamento',           icon: 'ti-package' },
  outros:    { label: 'Outros',               icon: 'ti-puzzle' },
}

export const CATEGORIAS_PECA = [
  // Motor e transmissão
  { id: 'correia',           label: 'Correia',              grupo: 'motor' },
  { id: 'polia',             label: 'Polia',                grupo: 'motor' },
  { id: 'mecanismo',         label: 'Mecanismo',            grupo: 'motor' },
  { id: 'embreagem',         label: 'Embreagem',            grupo: 'motor' },
  { id: 'atuador_embreagem', label: 'Atuador / Embreagem',  grupo: 'motor' },
  { id: 'catraca',           label: 'Catraca',              grupo: 'motor' },
  { id: 'rolamento_motor',     label: 'Rolamento do Motor',     grupo: 'motor' },
  { id: 'rolamento_mecanismo', label: 'Rolamento do Mecanismo', grupo: 'motor' },
  { id: 'rolamento_eixo',      label: 'Rolamento do Eixo',      grupo: 'motor' },
  { id: 'retentor',          label: 'Retentor',             grupo: 'motor' },
  { id: 'braco_coinjetado',  label: 'Braço co-injetado',    grupo: 'motor' },

  // Sistema de água
  { id: 'eletrobomba',       label: 'Eletrobomba',          grupo: 'agua' },
  { id: 'valvula',           label: 'Válvula',              grupo: 'agua' },
  { id: 'mangueira_entrada',  label: 'Mangueira de entrada',  grupo: 'agua' },
  { id: 'mangueira_saida',    label: 'Mangueira de saída',    grupo: 'agua' },
  { id: 'pressostato',       label: 'Pressostato',          grupo: 'agua' },
  { id: 'braco_injetor',     label: 'Braço injetor',        grupo: 'agua' },

  // Sistema elétrico
  { id: 'placa',             label: 'Placa eletrônica',     grupo: 'eletrico' },
  { id: 'timer',             label: 'Timer',                grupo: 'eletrico' },
  { id: 'capacitor',         label: 'Capacitor',            grupo: 'eletrico' },
  { id: 'sensor',            label: 'Sensor',               grupo: 'eletrico' },
  { id: 'termostato',        label: 'Termostato',           grupo: 'eletrico' },

  // Estrutura interna
  { id: 'cesto',             label: 'Cesto',                grupo: 'estrutura' },
  { id: 'agitador',          label: 'Agitador',             grupo: 'estrutura' },
  { id: 'suspensao',         label: 'Suspensão',            grupo: 'estrutura' },
  { id: 'tirantes',          label: 'Tirantes',             grupo: 'estrutura' },
  { id: 'suporte_tampa',     label: 'Suporte da Tampa',     grupo: 'estrutura' },
  { id: 'suporte_cesto',    label: 'Suporte do Cesto',     grupo: 'estrutura' },

  // Acabamento
  { id: 'dobradicas',        label: 'Dobradiças',           grupo: 'acabamento' },
  { id: 'pe_nivelador',      label: 'Pé nivelador',         grupo: 'acabamento' },
  { id: 'trava_porta',       label: 'Trava da porta',       grupo: 'acabamento' },
  { id: 'borracha_porta',    label: 'Borracha da porta',    grupo: 'acabamento' },
  { id: 'capa',              label: 'Capa',                 grupo: 'acabamento' },
  { id: 'tampa',             label: 'Tampa',                grupo: 'acabamento' },
  { id: 'painel',            label: 'Paineis',              grupo: 'acabamento' },
  { id: 'puxador',           label: 'Puxador',              grupo: 'acabamento' },
  { id: 'botao',             label: 'Botão',                grupo: 'acabamento' },

  // Outros — fallback pra peças que não se encaixam
  { id: 'tanquinho',         label: 'Peças de tanquinho',   grupo: 'outros' },
  { id: 'outros',            label: 'Outros',               grupo: 'outros' },
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
