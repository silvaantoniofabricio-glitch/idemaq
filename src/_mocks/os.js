// src/_mocks/os.js
// OS_MOCK foi removido em 19/05/2026 (Módulo 00c — Lote 1): o Kanban e o
// OSMobile leem direto do Supabase via useOS. Nada mais importava OS_MOCK.
//
// OS_ITENS_MOCK continua aqui porque várias Ações do OSDetalhe ainda leem
// itens via lookup por número da OS (AcaoOrcamento/Oficina/Pagamento/Teste/
// Concluido + PagamentoTab + _legacy/desktopKanbanModals). A persistência
// real dos itens entra no Módulo 03 — quando trocar tudo pra useOSItens,
// este arquivo inteiro pode sumir.

export const OS_ITENS_MOCK = {
  // Ana Reis
  1100: [{tipo:'servico',nome:'Limpeza',qtd:1,valor:185},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185}],
  1101: [{tipo:'servico',nome:'Manutenção',qtd:1,valor:185},{tipo:'peca',nome:'Placa de controle',qtd:1,valor:395}],
  1102: [{tipo:'servico',nome:'Limpeza',qtd:1,valor:185},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185}],
  1103: [],
  1005: [{tipo:'servico',nome:'Manutenção',qtd:1,valor:185},{tipo:'servico',nome:'Taxa de diagnóstico',qtd:1,valor:30},{tipo:'peca',nome:'Mola da porta',qtd:1,valor:35},{tipo:'peca',nome:'Parafuso de fixação',qtd:4,valor:5}],
  1006: [{tipo:'servico',nome:'Limpeza',qtd:1,valor:185},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185},{tipo:'peca',nome:'Rolamento 608',qtd:2,valor:28}],
  1007: [{tipo:'servico',nome:'Limpeza',qtd:1,valor:185},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185}],
  1008: [{tipo:'servico',nome:'Limpeza',qtd:1,valor:185},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185},{tipo:'peca',nome:'Correia do tambor',qtd:1,valor:50}],
  1009: [{tipo:'servico',nome:'Limpeza',qtd:1,valor:185},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185}],
  1010: [{tipo:'servico',nome:'Limpeza',qtd:1,valor:185},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185},{tipo:'peca',nome:'Abraçadeira',qtd:2,valor:5}],
  1011: [{tipo:'servico',nome:'Taxa de diagnóstico',qtd:1,valor:30},{tipo:'peca',nome:'Motor principal',qtd:1,valor:450}],
  1020: [{tipo:'peca',nome:'Motor usado (compra)',qtd:1,valor:80},{tipo:'peca',nome:'Rolamento 6205',qtd:2,valor:25},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185},{tipo:'servico',nome:'Limpeza',qtd:1,valor:165}],
  1021: [{tipo:'peca',nome:'Motor (avaliação)',qtd:1,valor:0},{tipo:'servico',nome:'Taxa de diagnóstico',qtd:1,valor:0}],
  1022: [{tipo:'peca',nome:'Motor recondicionado',qtd:1,valor:120},{tipo:'peca',nome:'Rolamento 6205',qtd:2,valor:25},{tipo:'peca',nome:'Capa lateral',qtd:1,valor:45},{tipo:'servico',nome:'Limpeza',qtd:1,valor:165},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185}],
  1023: [{tipo:'peca',nome:'Placa de controle',qtd:1,valor:90},{tipo:'peca',nome:'Rolamento 608',qtd:1,valor:18},{tipo:'servico',nome:'Limpeza',qtd:1,valor:165},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185}],
  1030: [{tipo:'maquina',nome:'Máquina reformada (Brastemp BWK11A)',qtd:1,valor:650}],
  1031: [{tipo:'maquina',nome:'Máquina reformada (Consul CWF10)',qtd:1,valor:600}],
  1032: [{tipo:'maquina',nome:'Máquina reformada (LG WT1201CV)',qtd:1,valor:580}],
  1033: [{tipo:'maquina',nome:'Máquina reformada (Electrolux LTR12)',qtd:1,valor:550}],
  1050: [{tipo:'servico',nome:'Limpeza',qtd:1,valor:185},{tipo:'servico',nome:'Manutenção',qtd:1,valor:185},{tipo:'peca',nome:'Borracha da porta',qtd:1,valor:55}],
}
