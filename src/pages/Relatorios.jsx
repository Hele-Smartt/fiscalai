// src/pages/Relatorios.jsx
// Geração de relatórios em PDF via jsPDF + autoTable
// Download direto no navegador — sem servidor

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { Lancamentos, ContasPagar, ContasReceber, NotasFiscais } from '../lib/db'

const CSS = `
  .rel-page { max-width: 900px; margin: 0 auto; }
  .rel-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; margin-bottom: 24px; }
  .rel-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 24px;
    cursor: pointer; transition: var(--transition);
    position: relative; overflow: hidden;
  }
  .rel-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .rel-card.generating { border-color: var(--accent); background: rgba(0,212,160,0.04); }
  .rel-card-icon { font-size: 36px; margin-bottom: 12px; }
  .rel-card-title { font-family: var(--font-head); font-weight: 700; font-size: 15px; color: var(--text); margin-bottom: 6px; }
  .rel-card-desc { font-size: 12px; color: var(--text3); line-height: 1.5; margin-bottom: 16px; }
  .rel-card-footer { display: flex; align-items: center; justify-content: space-between; }
  .rel-card-meta { font-size: 11px; color: var(--text3); }
  .rel-btn {
    padding: 7px 16px; border-radius: var(--radius);
    font-size: 12px; font-weight: 600; border: none; cursor: pointer;
    transition: var(--transition); display: flex; align-items: center; gap: 6px;
  }
  .rel-btn-primary { background: var(--accent); color: var(--bg); }
  .rel-btn-primary:hover { background: #00edb3; }
  .rel-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .rel-card-bar {
    position: absolute; bottom: 0; left: 0; height: 3px;
    background: var(--bar-color, var(--accent)); width: 100%;
    opacity: 0.6;
  }
  .periodo-row { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; }
  .periodo-inp { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px; color: var(--text); font-size: 13px; outline: none; }
  .periodo-inp:focus { border-color: var(--accent); }
  .hist-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .hist-item:last-child { border-bottom: none; }
`

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmt  = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)
const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
const hoje = () => new Date().toLocaleDateString('pt-BR')
const mesAno = () => new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})

// ── CARREGA jsPDF DINAMICAMENTE ───────────────────────────────────────────────
async function carregarJsPDF() {
  if (window.jspdf) return window.jspdf
  await new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    s.onload = res; s.onerror = rej
    document.head.appendChild(s)
  })
  await new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
    s.onload = res; s.onerror = rej
    document.head.appendChild(s)
  })
  return window.jspdf
}

// ── ESTILOS PADRÃO DO PDF ─────────────────────────────────────────────────────
function novoPDF(titulo, empresa) {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Cabeçalho
  doc.setFillColor(8, 12, 20)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setTextColor(0, 212, 160)
  doc.setFontSize(16)
  doc.setFont('helvetica','bold')
  doc.text('FiscalAI', 14, 12)

  doc.setTextColor(200, 210, 220)
  doc.setFontSize(9)
  doc.setFont('helvetica','normal')
  doc.text(empresa?.nome || '', 14, 19)
  doc.text(`CNPJ: ${empresa?.cnpj || ''}`, 14, 24)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica','bold')
  doc.text(titulo, 105, 14, { align: 'center' })

  doc.setTextColor(150, 160, 175)
  doc.setFontSize(8)
  doc.setFont('helvetica','normal')
  doc.text(`Gerado em: ${hoje()}`, 196, 24, { align: 'right' })

  // Linha separadora
  doc.setDrawColor(0, 212, 160)
  doc.setLineWidth(0.5)
  doc.line(0, 28, 210, 28)

  return doc
}

function secao(doc, titulo, y) {
  doc.setFillColor(15, 25, 41)
  doc.rect(14, y, 182, 7, 'F')
  doc.setTextColor(0, 212, 160)
  doc.setFontSize(9)
  doc.setFont('helvetica','bold')
  doc.text(titulo.toUpperCase(), 17, y + 5)
  return y + 10
}

function rodape(doc) {
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(40, 50, 65)
    doc.setLineWidth(0.3)
    doc.line(14, 285, 196, 285)
    doc.setTextColor(100, 110, 125)
    doc.setFontSize(7)
    doc.setFont('helvetica','normal')
    doc.text('FiscalAI — Plataforma de Gestão Financeira e Inteligência Tributária', 14, 290)
    doc.text(`Página ${i} de ${pages}`, 196, 290, { align: 'right' })
  }
}

// ── GERADOR: DRE ──────────────────────────────────────────────────────────────
async function gerarDRE(empresa, periodo) {
  const mes = periodo || new Date().toISOString().slice(0,7)
  const fluxo = await (await import('../lib/db')).Lancamentos.resumoMes(empresa.id, mes)
  const lancamentos = (await (await import('../lib/db')).Lancamentos.listar(empresa.id, { mes, limite: 200 })).data || []

  await carregarJsPDF()
  const doc = novoPDF(`DRE Gerencial — ${new Date(mes+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}`, empresa)

  let y = 36

  // KPIs
  const kpis = [
    { l: 'Receita Bruta',      v: fmt(fluxo.entradas), c: [0,212,160] },
    { l: 'Total de Saídas',    v: fmt(fluxo.saidas),   c: [255,71,87] },
    { l: 'Resultado do Mês',   v: fmt(fluxo.saldo),    c: fluxo.saldo >= 0 ? [0,212,160] : [255,71,87] },
  ]
  kpis.forEach((k, i) => {
    const x = 14 + i * 62
    doc.setFillColor(15, 25, 41)
    doc.roundedRect(x, y, 58, 20, 2, 2, 'F')
    doc.setTextColor(...k.c)
    doc.setFontSize(13)
    doc.setFont('helvetica','bold')
    doc.text(k.v, x + 29, y + 9, { align: 'center' })
    doc.setTextColor(120, 130, 145)
    doc.setFontSize(7)
    doc.setFont('helvetica','normal')
    doc.text(k.l, x + 29, y + 15, { align: 'center' })
  })
  y += 28

  // DRE linhas
  y = secao(doc, 'Demonstrativo de Resultado', y)
  const receita = fluxo.entradas
  const deducoes = receita * 0.10
  const recLiq = receita - deducoes
  const custos = fluxo.saidas * 0.40
  const lucroBruto = recLiq - custos
  const despesas = fluxo.saidas * 0.60
  const ebitda = lucroBruto - despesas
  const irpj = Math.max(ebitda * 0.15, 0)
  const lucroLiq = ebitda - irpj

  const dreLinhas = [
    ['RECEITA BRUTA',                    fmt(receita),     '', true],
    ['(-) Deduções e impostos s/ receita (est. 10%)', fmt(-deducoes), '', false],
    ['RECEITA LÍQUIDA',                  fmt(recLiq),      fmt(recLiq > 0 ? 100 : 0)+'%', true],
    ['(-) Custos dos Serviços/Produtos (est. 40%)',  fmt(-custos),  '', false],
    ['LUCRO BRUTO',                      fmt(lucroBruto),  fmt(receita > 0 ? (lucroBruto/receita)*100 : 0).replace('R$','')+'%', true],
    ['(-) Despesas Operacionais (est. 60%)', fmt(-despesas), '', false],
    ['EBITDA',                           fmt(ebitda),      fmt(receita > 0 ? (ebitda/receita)*100 : 0).replace('R$','')+'%', true],
    ['(-) IRPJ/CSLL estimado (15%)',     fmt(-irpj),       '', false],
    ['LUCRO LÍQUIDO',                    fmt(lucroLiq),    fmt(receita > 0 ? (lucroLiq/receita)*100 : 0).replace('R$','')+'%', true],
  ]

  doc.autoTable({
    startY: y,
    head: [['Descrição','Valor','Margem']],
    body: dreLinhas.map(l => [l[0], l[1], l[2]]),
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 3, textColor: [180, 190, 205] },
    headStyles: { fillColor: [20, 30, 50], textColor: [0, 212, 160], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fillColor: [13, 19, 32] },
    alternateRowStyles: { fillColor: [15, 23, 38] },
    didParseCell: (data) => {
      if (dreLinhas[data.row.index]?.[3]) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = [220, 230, 240]
      }
      if (data.column.index === 1) {
        const val = dreLinhas[data.row.index]?.[1] || ''
        if (val.startsWith('-') || val.startsWith('(')) {
          data.cell.styles.textColor = [255, 100, 100]
        } else if (dreLinhas[data.row.index]?.[3]) {
          data.cell.styles.textColor = [0, 212, 160]
        }
      }
    },
  })

  y = doc.lastAutoTable.finalY + 10

  // Lançamentos detalhados
  if (lancamentos.length > 0) {
    y = secao(doc, 'Movimentações do Período', y)
    doc.autoTable({
      startY: y,
      head: [['Data','Descrição','Categoria','Tipo','Valor']],
      body: lancamentos.slice(0,50).map(l => [
        fmtD(l.data_lancamento),
        (l.descricao || '').slice(0,45),
        l.categorias?.nome || '—',
        l.tipo === 'entrada' ? 'Entrada' : 'Saída',
        fmt(l.valor),
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [180,190,205] },
      headStyles: { fillColor: [20,30,50], textColor: [0,212,160], fontStyle:'bold', fontSize:7 },
      bodyStyles: { fillColor: [13,19,32] },
      alternateRowStyles: { fillColor: [15,23,38] },
      didParseCell: (data) => {
        if (data.column.index === 4) {
          const row = lancamentos[data.row.index]
          data.cell.styles.textColor = row?.tipo === 'entrada' ? [0,212,160] : [255,100,100]
          data.cell.styles.fontStyle = 'bold'
        }
      },
      columnStyles: { 0:{cellWidth:22}, 1:{cellWidth:65}, 2:{cellWidth:35}, 3:{cellWidth:20}, 4:{cellWidth:30} },
    })
  }

  rodape(doc)
  doc.save(`DRE_${empresa.nome?.replace(/\s+/g,'_')}_${mes}.pdf`)
}

// ── GERADOR: FLUXO DE CAIXA ───────────────────────────────────────────────────
async function gerarFluxo(empresa) {
  const evolucao = await (await import('../lib/db')).Lancamentos.evolucao12Meses(empresa.id)
  await carregarJsPDF()
  const doc = novoPDF('Fluxo de Caixa — Últimos 12 Meses', empresa)
  let y = 36

  // Tabela evolução
  y = secao(doc, 'Evolução Mensal', y)
  const totalEnt = evolucao.reduce((s,e) => s+(e.entradas||0), 0)
  const totalSai = evolucao.reduce((s,e) => s+(e.saidas||0), 0)
  const totalSal = evolucao.reduce((s,e) => s+(e.saldo||0), 0)

  doc.autoTable({
    startY: y,
    head: [['Mês/Ano','Entradas','Saídas','Saldo','Variação']],
    body: [
      ...evolucao.map((e,i) => [
        `${e.mes}/${new Date().getFullYear()}`,
        fmt(e.entradas||0),
        fmt(e.saidas||0),
        fmt(e.saldo||0),
        i === 0 ? '—' : ((e.saldo||0) >= (evolucao[i-1]?.saldo||0) ? '▲' : '▼'),
      ]),
      ['TOTAL', fmt(totalEnt), fmt(totalSai), fmt(totalSal), ''],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 3, textColor: [180,190,205] },
    headStyles: { fillColor: [20,30,50], textColor: [0,212,160], fontStyle:'bold' },
    bodyStyles: { fillColor: [13,19,32] },
    alternateRowStyles: { fillColor: [15,23,38] },
    didParseCell: (data) => {
      if (data.row.index === evolucao.length) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = [220,230,240]
        data.cell.styles.fillColor = [20,30,50]
      }
      if (data.column.index === 3 && data.row.index < evolucao.length) {
        const val = evolucao[data.row.index]?.saldo || 0
        data.cell.styles.textColor = val >= 0 ? [0,212,160] : [255,100,100]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    columnStyles: { 0:{cellWidth:30}, 1:{cellWidth:42}, 2:{cellWidth:42}, 3:{cellWidth:42}, 4:{cellWidth:20} },
  })

  rodape(doc)
  doc.save(`FluxoCaixa_${empresa.nome?.replace(/\s+/g,'_')}_${new Date().getFullYear()}.pdf`)
}

// ── GERADOR: CONTAS ───────────────────────────────────────────────────────────
async function gerarContas(empresa) {
  const [pagar, receber] = await Promise.all([
    (await import('../lib/db')).ContasPagar.listar(empresa.id),
    (await import('../lib/db')).ContasReceber.listar(empresa.id),
  ])
  const cp = pagar.data || []
  const cr = receber.data || []
  await carregarJsPDF()
  const doc = novoPDF('Contas a Pagar e Receber', empresa)
  let y = 36

  // Totais
  const totPagar   = cp.filter(c=>c.status==='pendente').reduce((s,c)=>s+Number(c.valor),0)
  const totReceber = cr.filter(c=>c.status==='pendente').reduce((s,c)=>s+Number(c.valor),0)
  const saldoPrev  = totReceber - totPagar

  ;[
    { l:'A Pagar (pendente)',   v: fmt(totPagar),   c:[255,71,87] },
    { l:'A Receber (pendente)', v: fmt(totReceber), c:[0,212,160] },
    { l:'Saldo Previsto',       v: fmt(saldoPrev),  c: saldoPrev>=0?[0,212,160]:[255,71,87] },
  ].forEach((k,i) => {
    const x = 14 + i * 62
    doc.setFillColor(15,25,41)
    doc.roundedRect(x, y, 58, 20, 2, 2, 'F')
    doc.setTextColor(...k.c)
    doc.setFontSize(12); doc.setFont('helvetica','bold')
    doc.text(k.v, x+29, y+9, { align:'center' })
    doc.setTextColor(120,130,145); doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.text(k.l, x+29, y+15, { align:'center' })
  })
  y += 28

  if (cp.length > 0) {
    y = secao(doc, 'Contas a Pagar', y)
    doc.autoTable({
      startY: y,
      head: [['Descrição','Fornecedor','Vencimento','Status','Valor']],
      body: cp.map(c => [
        (c.descricao||'').slice(0,40),
        (c.fornecedores?.nome||'—').slice(0,25),
        fmtD(c.vencimento),
        c.status?.toUpperCase(),
        fmt(c.valor),
      ]),
      margin: { left:14, right:14 },
      styles: { fontSize:8, cellPadding:2.5, textColor:[180,190,205] },
      headStyles: { fillColor:[20,30,50], textColor:[0,212,160], fontStyle:'bold', fontSize:7 },
      bodyStyles: { fillColor:[13,19,32] },
      alternateRowStyles: { fillColor:[15,23,38] },
      didParseCell: (data) => {
        if (data.column.index === 3) {
          const s = cp[data.row.index]?.status
          data.cell.styles.textColor = s==='pago'?[0,212,160]:s==='vencido'?[255,71,87]:[255,184,0]
        }
        if (data.column.index === 4) data.cell.styles.textColor = [255,100,100]
      },
      columnStyles: { 0:{cellWidth:55}, 1:{cellWidth:40}, 2:{cellWidth:22}, 3:{cellWidth:22}, 4:{cellWidth:33} },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (cr.length > 0) {
    y = secao(doc, 'Contas a Receber', y)
    doc.autoTable({
      startY: y,
      head: [['Descrição','Cliente','Vencimento','Status','Valor']],
      body: cr.map(c => [
        (c.descricao||'').slice(0,40),
        (c.clientes?.nome||'—').slice(0,25),
        fmtD(c.vencimento),
        c.status?.toUpperCase(),
        fmt(c.valor),
      ]),
      margin: { left:14, right:14 },
      styles: { fontSize:8, cellPadding:2.5, textColor:[180,190,205] },
      headStyles: { fillColor:[20,30,50], textColor:[0,212,160], fontStyle:'bold', fontSize:7 },
      bodyStyles: { fillColor:[13,19,32] },
      alternateRowStyles: { fillColor:[15,23,38] },
      didParseCell: (data) => {
        if (data.column.index === 3) {
          const s = cr[data.row.index]?.status
          data.cell.styles.textColor = s==='recebido'?[0,212,160]:s==='vencido'?[255,71,87]:[255,184,0]
        }
        if (data.column.index === 4) data.cell.styles.textColor = [0,212,160]
      },
      columnStyles: { 0:{cellWidth:55}, 1:{cellWidth:40}, 2:{cellWidth:22}, 3:{cellWidth:22}, 4:{cellWidth:33} },
    })
  }

  rodape(doc)
  doc.save(`ContasPagarReceber_${empresa.nome?.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,7)}.pdf`)
}

// ── GERADOR: TRIBUTÁRIO ───────────────────────────────────────────────────────
async function gerarTributario(empresa) {
  const ano = new Date().getFullYear()
  const tributos = await (await import('../lib/db')).NotasFiscais.totaisTributarios(empresa.id, ano)
  const notas = (await (await import('../lib/db')).NotasFiscais.listar(empresa.id, { limite: 100 })).data || []
  await carregarJsPDF()
  const doc = novoPDF(`Relatório Tributário — ${ano}`, empresa)
  let y = 36

  const totalTrib = Object.values(tributos).reduce((s,v)=>s+v, 0)
  const totalNF   = notas.reduce((s,n)=>s+Number(n.valor_total||0), 0)
  const cargaTrib = totalNF > 0 ? (totalTrib/totalNF)*100 : 0

  // KPIs
  ;[
    { l:'Total Tributos', v: fmt(totalTrib), c:[255,71,87] },
    { l:'Faturamento NF-e', v: fmt(totalNF), c:[0,144,255] },
    { l:'Carga Tributária', v: cargaTrib.toFixed(1)+'%', c:[168,85,247] },
  ].forEach((k,i) => {
    const x = 14 + i * 62
    doc.setFillColor(15,25,41)
    doc.roundedRect(x, y, 58, 20, 2, 2, 'F')
    doc.setTextColor(...k.c.map(v=>v))
    doc.setFontSize(12); doc.setFont('helvetica','bold')
    doc.text(k.v, x+29, y+9, { align:'center' })
    doc.setTextColor(120,130,145); doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.text(k.l, x+29, y+15, { align:'center' })
  })
  y += 28

  // Composição tributária
  y = secao(doc, 'Composição Tributária Anual', y)
  const tribLinhas = [
    ['ICMS',   tributos.icms   || 0],
    ['PIS',    tributos.pis    || 0],
    ['COFINS', tributos.cofins || 0],
    ['ISS',    tributos.iss    || 0],
    ['IPI',    tributos.ipi    || 0],
    ['INSS',   tributos.inss   || 0],
  ].filter(t => t[1] > 0)

  doc.autoTable({
    startY: y,
    head: [['Tributo','Valor Anual','% do Total','% do Faturamento']],
    body: [
      ...tribLinhas.map(t => [
        t[0],
        fmt(t[1]),
        totalTrib > 0 ? ((t[1]/totalTrib)*100).toFixed(1)+'%' : '0%',
        totalNF   > 0 ? ((t[1]/totalNF)*100).toFixed(2)+'%'   : '0%',
      ]),
      ['TOTAL', fmt(totalTrib), '100%', cargaTrib.toFixed(2)+'%'],
    ],
    margin: { left:14, right:14 },
    styles: { fontSize:9, cellPadding:3, textColor:[180,190,205] },
    headStyles: { fillColor:[20,30,50], textColor:[0,212,160], fontStyle:'bold' },
    bodyStyles: { fillColor:[13,19,32] },
    alternateRowStyles: { fillColor:[15,23,38] },
    didParseCell: (data) => {
      const isTotal = data.row.index === tribLinhas.length
      if (isTotal) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = [255,71,87]
        data.cell.styles.fillColor = [20,30,50]
      }
    },
    columnStyles: { 0:{cellWidth:35}, 1:{cellWidth:50}, 2:{cellWidth:40}, 3:{cellWidth:50} },
  })

  y = doc.lastAutoTable.finalY + 10

  // NF-e listagem
  if (notas.length > 0) {
    y = secao(doc, 'Notas Fiscais do Período', y)
    doc.autoTable({
      startY: y,
      head: [['NF','Emitente/Destinatário','Data','Op.','Valor NF','ICMS','PIS+COFINS']],
      body: notas.slice(0,40).map(n => [
        n.numero || '—',
        (n.operacao==='saida' ? n.dest_nome : n.emit_nome || '—').slice(0,30),
        fmtD(n.data_emissao),
        n.operacao==='saida' ? 'Saída' : 'Entr.',
        fmt(n.valor_total),
        fmt(n.valor_icms),
        fmt((n.valor_pis||0)+(n.valor_cofins||0)),
      ]),
      margin: { left:14, right:14 },
      styles: { fontSize:7.5, cellPadding:2, textColor:[180,190,205] },
      headStyles: { fillColor:[20,30,50], textColor:[0,212,160], fontStyle:'bold', fontSize:7 },
      bodyStyles: { fillColor:[13,19,32] },
      alternateRowStyles: { fillColor:[15,23,38] },
      columnStyles: { 0:{cellWidth:14}, 1:{cellWidth:52}, 2:{cellWidth:18}, 3:{cellWidth:12}, 4:{cellWidth:28}, 5:{cellWidth:28}, 6:{cellWidth:24} },
    })
  }

  rodape(doc)
  doc.save(`RelatorioTributario_${empresa.nome?.replace(/\s+/g,'_')}_${ano}.pdf`)
}

// ── COMPONENTE ────────────────────────────────────────────────────────────────
export default function RelatoriosPage({ empresaId, openForm }) {
  const { empresa } = useAuth()
  const [gerando, setGerando] = useState(null)
  const [erro,    setErro]    = useState('')
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0,7))
  const [historico, setHistorico] = useState([])

  async function gerar(tipo) {
    setGerando(tipo); setErro('')
    try {
      switch(tipo) {
        case 'dre':        await gerarDRE(empresa, periodo);  break
        case 'fluxo':      await gerarFluxo(empresa);         break
        case 'contas':     await gerarContas(empresa);        break
        case 'tributario': await gerarTributario(empresa);    break
      }
      // Salva no histórico local
      setHistorico(h => [{
        tipo, titulo: relatorios.find(r=>r.id===tipo)?.titulo || tipo,
        data: new Date().toLocaleString('pt-BR'), periodo,
      }, ...h].slice(0,10))
    } catch(e) {
      setErro('Erro ao gerar PDF: ' + e.message)
      console.error(e)
    }
    setGerando(null)
  }

  const relatorios = [
    {
      id: 'dre', icon: '📊', titulo: 'DRE Gerencial',
      desc: 'Demonstrativo de Resultado — receita, custos, despesas, EBITDA e lucro líquido com margem percentual.',
      cor: '#0090FF', usaPeriodo: true,
    },
    {
      id: 'fluxo', icon: '💰', titulo: 'Fluxo de Caixa',
      desc: 'Evolução mensal de entradas e saídas dos últimos 12 meses com variação mês a mês.',
      cor: '#00D4A0', usaPeriodo: false,
    },
    {
      id: 'contas', icon: '📋', titulo: 'Contas a Pagar e Receber',
      desc: 'Listagem completa de todas as contas com status, vencimentos e saldo previsto.',
      cor: '#A855F7', usaPeriodo: false,
    },
    {
      id: 'tributario', icon: '⚖️', titulo: 'Relatório Tributário',
      desc: 'Composição tributária anual (ICMS, PIS, COFINS, ISS, IPI, INSS) com carga efetiva e listagem de NF-e.',
      cor: '#FF6B35', usaPeriodo: false,
    },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="rel-page fade-up">
        <div className="section-header mb-20">
          <div>
            <div className="section-title">Relatórios em PDF</div>
            <div className="section-sub">Geração automática com dados reais — download instantâneo</div>
          </div>
        </div>

        {erro && (
          <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'var(--danger)',marginBottom:16}}>
            ⚠️ {erro}
          </div>
        )}

        {/* Seletor de período */}
        <div className="card mb-20">
          <div className="card-body">
            <div className="periodo-row">
              <span style={{fontSize:13,color:'var(--text2)',fontWeight:500}}>📅 Período de referência:</span>
              <input
                type="month" className="periodo-inp"
                value={periodo} onChange={e => setPeriodo(e.target.value)}
              />
              <span style={{fontSize:12,color:'var(--text3)'}}>Usado no DRE Gerencial</span>
            </div>
          </div>
        </div>

        {/* Cards de relatórios */}
        <div className="rel-grid">
          {relatorios.map(r => (
            <div key={r.id} className={`rel-card ${gerando===r.id?'generating':''}`}>
              <div className="rel-card-bar" style={{'--bar-color': r.cor}} />
              <div className="rel-card-icon">{r.icon}</div>
              <div className="rel-card-title">{r.titulo}</div>
              <div className="rel-card-desc">{r.desc}</div>
              <div className="rel-card-footer">
                <span className="rel-card-meta">
                  {r.usaPeriodo ? `Ref: ${new Date(periodo+'-01').toLocaleDateString('pt-BR',{month:'short',year:'numeric'})}` : 'Dados atuais'}
                </span>
                <button
                  className="rel-btn rel-btn-primary"
                  onClick={() => gerar(r.id)}
                  disabled={gerando !== null}
                >
                  {gerando === r.id
                    ? <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</span> Gerando...</>
                    : <>📥 Baixar PDF</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Gerar todos */}
        <div className="card mb-20">
          <div className="card-body" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>📦 Gerar Todos os Relatórios</div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Baixa os 4 PDFs em sequência — DRE, Fluxo de Caixa, Contas e Tributário</div>
            </div>
            <button
              className="btn btn-primary"
              disabled={gerando !== null}
              onClick={async () => {
                for (const r of relatorios) await gerar(r.id)
              }}
            >
              {gerando ? '⏳ Gerando...' : '📥 Baixar Todos'}
            </button>
          </div>
        </div>

        {/* Histórico local */}
        {historico.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">Gerados nesta sessão</span></div>
            <div className="card-body">
              {historico.map((h,i) => (
                <div key={i} className="hist-item">
                  <span style={{fontSize:20}}>{relatorios.find(r=>r.id===h.tipo)?.icon || '📄'}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{h.titulo}</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>Gerado às {h.data}</div>
                  </div>
                  <span className="badge badge-success">✓ Baixado</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
