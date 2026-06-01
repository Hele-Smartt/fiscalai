// src/pages/ConciliacaoBancaria.jsx
// Importação OFX e CSV + conciliação automática com revisão manual

import { useState, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { Lancamentos, Categorias } from '../lib/db'
import { supabase } from '../lib/supabase'

const CSS = `
  .conc-page { max-width: 1000px; margin: 0 auto; }

  .upload-zone {
    border: 2px dashed var(--border2); border-radius: var(--radius2);
    padding: 40px 24px; text-align: center; cursor: pointer;
    transition: var(--transition); background: var(--card);
  }
  .upload-zone:hover, .upload-zone.drag { border-color: var(--accent); background: rgba(0,212,160,0.04); }

  .fmt-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
  .fmt-tab {
    flex: 1; padding: 12px; border-radius: var(--radius);
    border: 2px solid var(--border); cursor: pointer;
    transition: var(--transition); text-align: center;
    font-size: 13px; font-weight: 600; color: var(--text2);
  }
  .fmt-tab.active { border-color: var(--accent); color: var(--accent); background: rgba(0,212,160,0.06); }
  .fmt-tab:hover:not(.active) { border-color: var(--border2); color: var(--text); }

  .conc-item {
    border: 1px solid var(--border); border-radius: var(--radius);
    margin-bottom: 8px; overflow: hidden; transition: var(--transition);
  }
  .conc-item:hover { border-color: var(--border2); }
  .conc-item.conciliado   { border-color: rgba(0,212,160,0.3);  background: rgba(0,212,160,0.03); }
  .conc-item.ignorado     { border-color: rgba(255,184,0,0.3);  background: rgba(255,184,0,0.03); opacity: 0.7; }
  .conc-item.pendente     { border-color: var(--border); }
  .conc-item.novo         { border-color: rgba(0,144,255,0.3);  background: rgba(0,144,255,0.03); }

  .conc-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
  }
  .conc-data  { width: 80px; flex-shrink: 0; font-size: 12px; color: var(--text3); }
  .conc-desc  { flex: 1; min-width: 0; }
  .conc-desc-title { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .conc-desc-sub   { font-size: 11px; color: var(--text3); margin-top: 1px; }
  .conc-valor { width: 110px; text-align: right; flex-shrink: 0; font-family: var(--font-head); font-weight: 700; font-size: 14px; }
  .conc-valor.pos { color: var(--success); }
  .conc-valor.neg { color: var(--danger); }
  .conc-status { width: 100px; flex-shrink: 0; }
  .conc-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .match-box {
    margin: 0 16px 12px; padding: 10px 14px;
    background: rgba(0,212,160,0.06); border: 1px solid rgba(0,212,160,0.15);
    border-radius: var(--radius); font-size: 12px;
    display: flex; align-items: center; gap: 10px;
  }
  .match-icon { font-size: 16px; flex-shrink: 0; }
  .match-info { flex: 1; }
  .match-title { color: var(--text); font-weight: 500; }
  .match-sub   { color: var(--text3); font-size: 11px; }
  .match-conf  { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
  .match-high  { background: rgba(0,212,160,0.15); color: var(--success); }
  .match-med   { background: rgba(255,184,0,0.15);  color: var(--warn); }
  .match-low   { background: rgba(255,71,87,0.15);  color: var(--danger); }

  .resumo-bar { display: flex; gap: 0; border-radius: var(--radius); overflow: hidden; height: 8px; margin: 12px 0; }
  .resumo-seg { transition: width 0.6s ease; }

  .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .stat-row:last-child { border-bottom: none; }

  .btn-conc { padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; border: none; cursor: pointer; transition: var(--transition); }
  .btn-ok   { background: rgba(0,212,160,0.15); color: var(--success); }
  .btn-ok:hover { background: rgba(0,212,160,0.25); }
  .btn-skip { background: rgba(255,184,0,0.15); color: var(--warn); }
  .btn-skip:hover { background: rgba(255,184,0,0.25); }
  .btn-new  { background: rgba(0,144,255,0.15); color: var(--accent2); }
  .btn-new:hover { background: rgba(0,144,255,0.25); }
  .btn-undo { background: rgba(255,255,255,0.06); color: var(--text3); }
  .btn-undo:hover { background: rgba(255,255,255,0.1); color: var(--text); }

  .progress-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 3px; background: var(--accent); transition: width 0.4s ease; }

  .step-indicator { display: flex; gap: 8px; margin-bottom: 24px; align-items: center; }
  .step { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text3); }
  .step.active { color: var(--accent); font-weight: 600; }
  .step.done   { color: var(--success); }
  .step-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
  .step.done .step-dot { background: var(--success); color: var(--bg); border-color: var(--success); }
  .step-line { flex: 1; height: 1px; background: var(--border); max-width: 40px; }
`

// ── PARSERS ──────────────────────────────────────────────────────────────────

function parseOFX(content) {
  const transacoes = []
  try {
    // Remove header SGML se existir
    const xmlStart = content.indexOf('<OFX>')
    const xml = xmlStart >= 0 ? content.slice(xmlStart) : content

    // Parse manual das tags OFX (não é XML puro)
    const getTag = (tag, str) => {
      const re = new RegExp(`<${tag}>([^<]+)`, 'i')
      return str.match(re)?.[1]?.trim() || ''
    }

    // Extrai todas as transações
    const stmtRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
    let match
    while ((match = stmtRe.exec(content)) !== null) {
      const bloco = match[1]
      const trntype = getTag('TRNTYPE', bloco)
      const dtposted = getTag('DTPOSTED', bloco)
      const valor = parseFloat(getTag('TRNAMT', bloco)) || 0
      const memo = getTag('MEMO', bloco) || getTag('NAME', bloco) || ''
      const fitid = getTag('FITID', bloco)

      // Formata data OFX (YYYYMMDD ou YYYYMMDDHHMMSS)
      const ano  = dtposted.slice(0,4)
      const mes  = dtposted.slice(4,6)
      const dia  = dtposted.slice(6,8)
      const data = `${ano}-${mes}-${dia}`

      transacoes.push({
        id:     fitid || `ofx-${Date.now()}-${Math.random()}`,
        data,
        descricao: memo,
        valor,
        tipo:   valor >= 0 ? 'credito' : 'debito',
        origem: 'ofx',
      })
    }

    // Saldo
    const saldo = parseFloat(content.match(/<BALAMT>([^<]+)/i)?.[1]) || null
    const banco = content.match(/<ORG>([^<]+)/i)?.[1]?.trim() || 'Banco'

    return { ok: true, transacoes, saldo, banco }
  } catch(e) {
    return { ok: false, erro: 'OFX inválido: ' + e.message }
  }
}

function parseCSV(content) {
  try {
    const linhas = content.split('\n').map(l => l.trim()).filter(Boolean)
    if (linhas.length < 2) return { ok: false, erro: 'CSV vazio ou inválido' }

    // Detecta separador
    const sep = linhas[0].includes(';') ? ';' : ','

    // Detecta colunas do header
    const header = linhas[0].split(sep).map(h => h.replace(/"/g,'').toLowerCase().trim())
    const idx = {
      data:     header.findIndex(h => h.includes('data') || h.includes('date')),
      desc:     header.findIndex(h => h.includes('hist') || h.includes('desc') || h.includes('memo') || h.includes('lançamento')),
      valor:    header.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value')),
      debito:   header.findIndex(h => h.includes('débito') || h.includes('debito') || h.includes('saída')),
      credito:  header.findIndex(h => h.includes('crédito') || h.includes('credito') || h.includes('entrada')),
    }

    const transacoes = []
    for (let i = 1; i < linhas.length; i++) {
      const cols = linhas[i].split(sep).map(c => c.replace(/"/g,'').trim())
      if (cols.length < 2) continue

      let valor = 0
      if (idx.valor >= 0) {
        valor = parseFloat(cols[idx.valor]?.replace(/\./g,'').replace(',','.')) || 0
      } else if (idx.credito >= 0 || idx.debito >= 0) {
        const cred = parseFloat(cols[idx.credito]?.replace(/\./g,'').replace(',','.')) || 0
        const deb  = parseFloat(cols[idx.debito]?.replace(/\./g,'').replace(',','.'))  || 0
        valor = cred > 0 ? cred : -deb
      }

      if (valor === 0) continue

      // Formata data dd/mm/yyyy ou yyyy-mm-dd
      let dataStr = cols[idx.data] || ''
      if (dataStr.includes('/')) {
        const p = dataStr.split('/')
        dataStr = p.length === 3 ? (p[2].length === 4 ? `${p[2]}-${p[1]}-${p[0]}` : `20${p[2]}-${p[1]}-${p[0]}`) : dataStr
      }

      transacoes.push({
        id:       `csv-${i}-${Date.now()}`,
        data:     dataStr,
        descricao: cols[idx.desc >= 0 ? idx.desc : 1] || `Transação ${i}`,
        valor,
        tipo:     valor >= 0 ? 'credito' : 'debito',
        origem:   'csv',
      })
    }

    return { ok: true, transacoes, saldo: null, banco: 'Extrato CSV' }
  } catch(e) {
    return { ok: false, erro: 'CSV inválido: ' + e.message }
  }
}

// ── MOTOR DE CONCILIAÇÃO AUTOMÁTICA ─────────────────────────────────────────
function conciliarAutomatico(extrato, lancamentos) {
  return extrato.map(tx => {
    let melhorMatch = null
    let melhorScore = 0

    for (const lanc of lancamentos) {
      let score = 0

      // Valor igual = +60
      const diffValor = Math.abs(Math.abs(tx.valor) - Math.abs(Number(lanc.valor)))
      if (diffValor === 0) score += 60
      else if (diffValor < 1) score += 40
      else if (diffValor < 10) score += 20

      // Data próxima (±3 dias) = +25
      const diffDias = Math.abs(new Date(tx.data) - new Date(lanc.data_lancamento)) / (1000*60*60*24)
      if (diffDias === 0) score += 25
      else if (diffDias <= 1) score += 20
      else if (diffDias <= 3) score += 10

      // Tipo compatível = +15
      const tipoOk = (tx.valor > 0 && lanc.tipo === 'entrada') || (tx.valor < 0 && lanc.tipo === 'saida')
      if (tipoOk) score += 15

      // Descrição similar = +0 a 20
      const descTx   = tx.descricao.toLowerCase()
      const descLanc = lanc.descricao.toLowerCase()
      const palavras = descTx.split(' ').filter(p => p.length > 3)
      const hits = palavras.filter(p => descLanc.includes(p)).length
      score += Math.min(hits * 5, 20)

      if (score > melhorScore && score >= 40) {
        melhorScore = score
        melhorMatch = lanc
      }
    }

    const confianca = melhorScore >= 80 ? 'alta' : melhorScore >= 55 ? 'media' : 'baixa'

    return {
      ...tx,
      match:     melhorMatch,
      score:     melhorScore,
      confianca: melhorMatch ? confianca : null,
      status:    melhorMatch && melhorScore >= 80 ? 'conciliado' : 'pendente',
    }
  })
}

const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)
const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

// ── COMPONENTE ───────────────────────────────────────────────────────────────
export default function ConciliacaoBancaria({ onBack }) {
  const { empresa, user } = useAuth()
  const [step,       setStep]       = useState(1)
  const [formato,    setFormato]    = useState('ofx')
  const [drag,       setDrag]       = useState(false)
  const [extrato,    setExtrato]    = useState([])
  const [banco,      setBanco]      = useState('')
  const [saldoBanco, setSaldoBanco] = useState(null)
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')
  const fileRef = useRef()

  // Contadores
  const conciliados = extrato.filter(t => t.status === 'conciliado').length
  const ignorados   = extrato.filter(t => t.status === 'ignorado').length
  const novos       = extrato.filter(t => t.status === 'novo').length
  const pendentes   = extrato.filter(t => t.status === 'pendente').length
  const pct = extrato.length > 0 ? Math.round(((conciliados+ignorados+novos)/extrato.length)*100) : 0

  async function processarArquivo(file) {
    setErro('')
    const content = await new Promise((res,rej) => {
      const r = new FileReader()
      r.onload  = e => res(e.target.result)
      r.onerror = () => rej(new Error('Falha ao ler arquivo'))
      r.readAsText(file, 'UTF-8')
    })

    const isOfx = file.name.toLowerCase().endsWith('.ofx') || file.name.toLowerCase().endsWith('.ofc')
    const parsed = isOfx ? parseOFX(content) : parseCSV(content)

    if (!parsed.ok) { setErro(parsed.erro); return }
    if (parsed.transacoes.length === 0) { setErro('Nenhuma transação encontrada no arquivo.'); return }

    setBanco(parsed.banco || 'Banco')
    setSaldoBanco(parsed.saldo)

    // Busca lançamentos do banco para conciliação
    const { data: lancs } = await Lancamentos.listar(empresa.id, { limite: 500 })

    // Roda motor automático
    const comMatch = conciliarAutomatico(parsed.transacoes, lancs || [])
    setExtrato(comMatch)
    setStep(2)
  }

  function atualizarStatus(id, status) {
    setExtrato(e => e.map(t => t.id === id ? { ...t, status } : t))
  }

  function conciliarTodos() {
    setExtrato(e => e.map(t => t.match && t.score >= 55 ? { ...t, status: 'conciliado' } : t))
  }

  function ignorarPendentes() {
    setExtrato(e => e.map(t => t.status === 'pendente' ? { ...t, status: 'ignorado' } : t))
  }

  async function salvarConciliacao() {
    setSalvando(true); setErro('')
    try {
      // Cria lançamentos para os itens marcados como "novo"
      const novosItems = extrato.filter(t => t.status === 'novo')
      for (const tx of novosItems) {
        await Lancamentos.criar({
          empresa_id:     empresa.id,
          descricao:      tx.descricao.slice(0, 200),
          valor:          Math.abs(tx.valor),
          tipo:           tx.valor >= 0 ? 'entrada' : 'saida',
          status:         'confirmado',
          data_lancamento: tx.data,
          observacao:     `Importado via conciliação bancária — ${banco}`,
          criado_por:     user.id,
        })
      }

      // Salva registro da conciliação
      await supabase.from('conciliacoes').insert({
        empresa_id:      empresa.id,
        banco,
        total_extrato:   extrato.length,
        total_conciliado: conciliados,
        total_novo:      novos,
        total_ignorado:  ignorados,
        saldo_banco:     saldoBanco,
        criado_por:      user.id,
      }).select()

      setStep(3)
    } catch(e) {
      setErro('Erro ao salvar: ' + e.message)
    }
    setSalvando(false)
  }

  const confBadge = (c) => {
    if (!c) return null
    const map = { alta: 'match-high', media: 'match-med', baixa: 'match-low' }
    const label = { alta: '95%+ confiança', media: '70% confiança', baixa: '40% confiança' }
    return <span className={`match-conf ${map[c]}`}>{label[c]}</span>
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="conc-page fade-up">
        <div className="flex items-center gap-12 mb-20">
          <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16}} onClick={step>1?()=>setStep(step-1):onBack}>←</div>
          <div>
            <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:22}}>Conciliação Bancária</div>
            <div style={{fontSize:12,color:'var(--text3)'}}>Importe OFX ou CSV e concilie com os lançamentos do sistema</div>
          </div>
        </div>

        {/* Steps */}
        <div className="step-indicator">
          {[{n:1,l:'Upload'},{n:2,l:'Conciliação'},{n:3,l:'Concluído'}].map((s,i) => (
            <>
              <div key={s.n} className={`step ${step===s.n?'active':step>s.n?'done':'pending'}`}>
                <div className="step-dot">{step>s.n?'✓':s.n}</div>
                <span>{s.l}</span>
              </div>
              {i < 2 && <div className="step-line" key={`l${i}`}/>}
            </>
          ))}
        </div>

        {erro && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'var(--danger)',marginBottom:16}}>⚠️ {erro}</div>}

        {/* ── STEP 1: Upload ── */}
        {step === 1 && (
          <div>
            {/* Formato */}
            <div className="fmt-tabs">
              {[
                { id:'ofx', icon:'🏦', label:'OFX / OFC', desc:'Formato padrão dos bancos brasileiros' },
                { id:'csv', icon:'📊', label:'CSV / Excel', desc:'Exportado do internet banking' },
              ].map(f => (
                <div key={f.id} className={`fmt-tab ${formato===f.id?'active':''}`} onClick={() => setFormato(f.id)}>
                  <div style={{fontSize:24,marginBottom:6}}>{f.icon}</div>
                  <div>{f.label}</div>
                  <div style={{fontSize:11,color:'var(--text3)',fontWeight:400,marginTop:2}}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div
              className={`upload-zone ${drag?'drag':''}`}
              onDragOver={e=>{e.preventDefault();setDrag(true)}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);processarArquivo(e.dataTransfer.files[0])}}
              onClick={() => fileRef.current?.click()}
            >
              <div style={{fontSize:48,marginBottom:12}}>🏦</div>
              <div style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:6}}>
                Arraste o extrato bancário
              </div>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>
                {formato === 'ofx' ? 'Arquivo .ofx ou .ofc exportado do seu banco' : 'Arquivo .csv exportado do internet banking'}
              </div>
              <div style={{display:'inline-block',padding:'10px 24px',borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',fontWeight:700,fontSize:13}}>
                Selecionar Arquivo
              </div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:10}}>
                Itaú · Bradesco · Santander · BB · Caixa · Nubank · Inter · Sicoob
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".ofx,.ofc,.csv,.txt" style={{display:'none'}} onChange={e=>processarArquivo(e.target.files[0])} />

            {/* Instruções */}
            <div className="card" style={{marginTop:20}}>
              <div className="card-header"><span className="card-title">Como exportar o extrato do seu banco</span></div>
              <div className="card-body">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {[
                    { banco:'Itaú', passos:'Conta Corrente → Extrato → Exportar → OFX' },
                    { banco:'Bradesco', passos:'Extrato → Opções → Baixar → formato OFX' },
                    { banco:'Santander', passos:'Extrato → Baixar → Selecionar período → OFX' },
                    { banco:'Banco do Brasil', passos:'Extrato → Salvar como → OFX/QIF' },
                    { banco:'Caixa', passos:'Extrato → Exportar dados → OFX' },
                    { banco:'Nubank', passos:'Perfil → Exportar dados → CSV' },
                  ].map((b,i) => (
                    <div key={i} style={{padding:'10px 14px',background:'var(--bg3)',borderRadius:8}}>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:3}}>🏦 {b.banco}</div>
                      <div style={{fontSize:11,color:'var(--text3)'}}>{b.passos}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Conciliação ── */}
        {step === 2 && (
          <div>
            {/* Resumo do extrato */}
            <div className="card mb-16">
              <div className="card-body">
                <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:18,fontWeight:800,fontFamily:'var(--font-head)',color:'var(--accent)'}}>{banco}</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{extrato.length} transações importadas</div>
                  </div>
                  {saldoBanco !== null && (
                    <div style={{padding:'8px 16px',background:'var(--bg3)',borderRadius:8}}>
                      <div style={{fontSize:11,color:'var(--text3)'}}>Saldo no banco</div>
                      <div style={{fontSize:16,fontWeight:800,fontFamily:'var(--font-head)',color:'var(--accent)'}}>{fmt(saldoBanco)}</div>
                    </div>
                  )}
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text2)',marginBottom:4}}>
                      <span>Progresso da conciliação</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`}}/></div>
                    <div style={{display:'flex',gap:16,marginTop:6,fontSize:11}}>
                      <span style={{color:'var(--success)'}}>✓ {conciliados} conciliados</span>
                      <span style={{color:'var(--accent2)'}}>+ {novos} novos</span>
                      <span style={{color:'var(--warn)'}}>— {ignorados} ignorados</span>
                      <span style={{color:'var(--text3)'}}>⏳ {pendentes} pendentes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações em lote */}
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={conciliarTodos}>
                ✓ Conciliar todos com match alto
              </button>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={ignorarPendentes}>
                — Ignorar todos pendentes
              </button>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={() => setExtrato(e => e.map(t => ({...t, status: t.match ? 'conciliado' : 'pendente'})))}>
                ↺ Resetar seleção
              </button>
              <div style={{marginLeft:'auto',fontSize:12,color:'var(--text3)',alignSelf:'center'}}>
                Legenda: <span style={{color:'var(--success)'}}>✓ Conciliado</span> · <span style={{color:'var(--accent2)'}}>+ Criar novo</span> · <span style={{color:'var(--warn)'}}>— Ignorar</span>
              </div>
            </div>

            {/* Lista de transações */}
            <div style={{maxHeight:'55vh',overflowY:'auto',marginBottom:16}}>
              {extrato.map(tx => (
                <div key={tx.id} className={`conc-item ${tx.status}`}>
                  <div className="conc-row">
                    <div className="conc-data">{fmtD(tx.data)}</div>
                    <div className="conc-desc">
                      <div className="conc-desc-title">{tx.descricao}</div>
                      <div className="conc-desc-sub">{tx.origem?.toUpperCase()} · {tx.tipo === 'credito' ? '↑ Crédito' : '↓ Débito'}</div>
                    </div>
                    <div className={`conc-valor ${tx.valor >= 0 ? 'pos' : 'neg'}`}>{fmt(tx.valor)}</div>
                    <div className="conc-status">
                      {tx.status === 'conciliado' && <span className="badge badge-success">✓ Conciliado</span>}
                      {tx.status === 'ignorado'   && <span className="badge badge-warn">— Ignorado</span>}
                      {tx.status === 'novo'       && <span className="badge badge-info">+ Novo lanç.</span>}
                      {tx.status === 'pendente'   && <span className="badge" style={{background:'rgba(255,255,255,0.05)',color:'var(--text3)'}}>⏳ Pendente</span>}
                    </div>
                    <div className="conc-actions">
                      {tx.status !== 'conciliado' && tx.match && (
                        <button className="btn-conc btn-ok" onClick={() => atualizarStatus(tx.id, 'conciliado')} title="Conciliar">✓</button>
                      )}
                      {tx.status !== 'novo' && (
                        <button className="btn-conc btn-new" onClick={() => atualizarStatus(tx.id, 'novo')} title="Criar novo lançamento">+</button>
                      )}
                      {tx.status !== 'ignorado' && (
                        <button className="btn-conc btn-skip" onClick={() => atualizarStatus(tx.id, 'ignorado')} title="Ignorar">—</button>
                      )}
                      {tx.status !== 'pendente' && (
                        <button className="btn-conc btn-undo" onClick={() => atualizarStatus(tx.id, 'pendente')} title="Desfazer">↺</button>
                      )}
                    </div>
                  </div>

                  {/* Sugestão de match */}
                  {tx.match && tx.status !== 'ignorado' && (
                    <div className="match-box">
                      <span className="match-icon">🔗</span>
                      <div className="match-info">
                        <div className="match-title">{tx.match.descricao} — {fmt(tx.match.valor)}</div>
                        <div className="match-sub">{fmtD(tx.match.data_lancamento)} · {tx.match.tipo} · {tx.match.categorias?.nome || 'Sem categoria'}</div>
                      </div>
                      {confBadge(tx.confianca)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" onClick={() => { setExtrato([]); setStep(1) }}>← Voltar</button>
              <button className="btn btn-primary" onClick={salvarConciliacao} disabled={salvando || (conciliados+novos+ignorados) === 0}>
                {salvando ? '⏳ Salvando...' : `✅ Finalizar Conciliação (${conciliados+novos} itens)`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Concluído ── */}
        {step === 3 && (
          <div style={{textAlign:'center',padding:'48px 24px'}}>
            <div style={{fontSize:64,marginBottom:16}}>🎉</div>
            <div style={{fontFamily:'var(--font-head)',fontSize:24,fontWeight:800,color:'var(--success)',marginBottom:8}}>
              Conciliação Concluída!
            </div>
            <div style={{fontSize:14,color:'var(--text2)',marginBottom:32}}>
              {novos} novos lançamentos criados · {conciliados} transações conciliadas · {ignorados} ignoradas
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,maxWidth:600,margin:'0 auto 32px'}}>
              {[
                { l:'Conciliados', v:conciliados, c:'var(--success)' },
                { l:'Novos criados', v:novos, c:'var(--accent2)' },
                { l:'Ignorados', v:ignorados, c:'var(--warn)' },
                { l:'Total extrato', v:extrato.length, c:'var(--text2)' },
              ].map((s,i) => (
                <div key={i} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:16,textAlign:'center'}}>
                  <div style={{fontFamily:'var(--font-head)',fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button className="btn btn-primary" onClick={() => { setExtrato([]); setStep(1) }}>+ Nova Conciliação</button>
              <button className="btn btn-ghost" onClick={onBack}>Ver Financeiro</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
