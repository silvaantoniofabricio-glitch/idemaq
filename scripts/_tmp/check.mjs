import * as D from './data.mjs'
const r2 = n => Math.round(n * 100) / 100
const sum = a => r2(a.reduce((s, x) => s + x[1], 0))
const exp = { ELO: 4701.36, MP: 3910.86, INTER: 1872.98, NEO: 33.00, NUPF: 199.78, NUPJ: 175.57, MASTER: 1297.81 - 29.99, BRAD: 129.40 }
for (const k of Object.keys(exp)) {
  const a = D[k]
  const pj = sum(a.filter(x => x[2].startsWith('PJ:')))
  console.log(k.padEnd(7), 'itens', String(a.length).padStart(3), 'total', sum(a), 'esperado', r2(exp[k]), sum(a) === r2(exp[k]) ? 'OK' : '<<< DIFERE', '| PJ', pj, 'PF', r2(sum(a) - pj))
  const s = new Set(); for (const x of a) { if (s.has(x[0])) console.log('  DUP', x[0]); s.add(x[0]) }
}
