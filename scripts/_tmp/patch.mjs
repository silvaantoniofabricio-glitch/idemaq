import fs from 'fs'
const f = 'src/data/controleFinanceiroPF.js'
let t = fs.readFileSync(f, 'utf8')
const blk = fs.readFileSync('scripts/_tmp/pf-setembro.js', 'utf8')
if (t.includes('DESPESAS_PF_TONI_SETEMBRO_2026')) throw new Error('ja existe')
t = t.replace('// Marca a pessoa em cada item', blk + '\n// Marca a pessoa em cada item')
t = t.replace("const RAFA_AGOSTO = marcarPessoa(DESPESAS_PF_RAFA_AGOSTO_2026,  'rafa')\n",
  "const RAFA_AGOSTO = marcarPessoa(DESPESAS_PF_RAFA_AGOSTO_2026,  'rafa')\nconst TONI_SETEMBRO = marcarPessoa(DESPESAS_PF_TONI_SETEMBRO_2026, 'toni')\nconst RAFA_SETEMBRO = marcarPessoa(DESPESAS_PF_RAFA_SETEMBRO_2026, 'rafa')\n")
t = t.replace("    total: [...TONI_AGOSTO, ...RAFA_AGOSTO],\n  },\n}", "    total: [...TONI_AGOSTO, ...RAFA_AGOSTO],\n  },\n  '2026-09': {\n    toni:  TONI_SETEMBRO,\n    rafa:  RAFA_SETEMBRO,\n    total: [...TONI_SETEMBRO, ...RAFA_SETEMBRO],\n  },\n}")
fs.writeFileSync(f, t)
