// Gera o arquivo mensal do contador (só aba Resumo) — padrão definido pelo Toni em 19/11/2026.
// Uso: node scripts/gerar-arquivo-contador.mjs 2026-10-01 2026-10-31 "Outubro / 2026" outubro <saida1.xlsx> [saida2.xlsx]
// Lib xlsx: cópia em tmp/xlsx-tool (não está no package.json). Ver contexto-financeiro.md §40.
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'; import { writeFileSync } from 'fs'
const XLSX = createRequire(import.meta.url)('../tmp/xlsx-tool/node_modules/xlsx')
const sb = createClient('https://yfbbruxqfzgetapbvrgd.supabase.co','sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP')
const [ini,fim,mesNome,mesMin,...outs]=process.argv.slice(2)
async function all(t,sel,f){let out=[],i=0;for(;;){let q=f(sb.from(t).select(sel).range(i,i+999));const {data,error}=await q;if(error)throw error;out=out.concat(data);if(data.length<1000)break;i+=1000}return out}
const L=await all('vw_lancamentos_validos','id,tipo,valor,categoria,forma_pagamento',q=>q.gte('pago_em',ini).lte('pago_em',fim))
const S=await all('vw_lancamento_fiscal_split','lancamento_id,valor_desloc,valor_servico',q=>q.gte('pago_em',ini).lte('pago_em',fim))
const ab=await all('vw_lancamentos_validos','valor',q=>q.is('pago_em',null).eq('tipo','receita').gte('vencimento',ini).lte('vencimento',fim))
const r2=x=>Math.round(x*100)/100, soma=a=>r2(a.reduce((x,y)=>x+ +y,0))
const rec=L.filter(l=>l.tipo==='receita'), desp=L.filter(l=>l.tipo==='despesa')
const tRec=soma(rec.map(x=>x.valor)), tDesp=soma(desp.map(x=>x.valor))
const ids=new Set(rec.map(x=>x.id)); const Sx=S.filter(s=>ids.has(s.lancamento_id))
const vDes=soma(Sx.map(s=>s.valor_desloc)), vMao=soma(Sx.map(s=>s.valor_servico))
const merc=r2(tRec*0.47), serv=r2(tRec-merc), mao=r2(serv*vMao/(vMao+vDes)), des=r2(serv-mao)
const forma=f=>f==='pix'?'PIX':f==='dinheiro'?'Dinheiro':'Cartão'
const grp=(a,k)=>{const m={};for(const x of a){const kk=k(x);m[kk]=(m[kk]||0)+ +x.valor}return Object.entries(m).map(([a,b])=>[a,r2(b)]).sort((a,b)=>b[1]-a[1])}
const emp=desp.filter(d=>d.categoria==='Emprestimo')
const hoje=new Date().toLocaleDateString('pt-BR',{timeZone:'America/Cuiaba'})
const rows=[['IDEMAQ ASSISTÊNCIA TÉCNICA LTDA'],[`Movimentação financeira — ${mesNome}`],['Regime de caixa: entradas recebidas e saídas pagas dentro do mês'],[`Gerado em ${hoje}`],[''],
['RESUMO DO MÊS'],['Total de entradas (receitas)',tRec,`${rec.length} lançamentos`],['Total de saídas (despesas)',tDesp,`${desp.length} lançamentos`],['Resultado do mês (entradas − saídas)',r2(tRec-tDesp)],[''],
['MERCADORIA E SERVIÇO'],['Mercadoria (peças)',merc],['Serviço',serv],['   Mão de obra',mao],['   Deslocamento',des],[''],
['ENTRADAS POR CATEGORIA'],...grp(rec,x=>x.categoria),[''],['SAÍDAS POR CATEGORIA'],...grp(desp,x=>x.categoria),[''],
['ENTRADAS POR FORMA DE RECEBIMENTO'],...grp(rec,x=>forma(x.forma_pagamento)),[''],
['OBSERVAÇÕES'],['Saídas incluem empréstimos/financiamentos (categoria Emprestimo)',soma(emp.map(x=>x.valor))],
[`Recebimentos com vencimento em ${mesMin} ainda em aberto (não incluídos nas entradas)`,soma(ab.map(x=>x.valor))]]
const ws=XLSX.utils.aoa_to_sheet(rows)
for(const k of Object.keys(ws))if(k[0]!=='!'&&typeof ws[k].v==='number')ws[k].z='\R\$\ #,##0.00'
ws['!merges']=[0,1,2,3].map(r=>({s:{r,c:0},e:{r,c:2}}));ws['!cols']=[{wch:66.25},{wch:16.25},{wch:20.25}]
const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Resumo')
for(const o of outs){try{writeFileSync(o,XLSX.write(wb,{type:'buffer',bookType:'xlsx'}));console.log('OK',o)}catch(e){console.log('FALHOU',e.code,o)}}
console.log(rows.map(r=>r.join(' | ')).join('\n'))
