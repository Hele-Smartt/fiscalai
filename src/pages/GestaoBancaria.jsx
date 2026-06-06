// src/pages/GestãoBancaria.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useCliente } from '../lib/ClienteContext'
import { supabase } from '../lib/supabase'

const fmt  = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)
const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

const BANCOS = [
  {cod:'001',nome:'Banco do Brasil'},{cod:'033',nome:'Santander'},{cod:'077',nome:'Inter'},
  {cod:'104',nome:'Caixa Econômica'},{cod:'237',nome:'Bradesco'},{cod:'341',nome:'Itaú'},
  {cod:'260',nome:'Nu Pagamentos (Nubank)'},{cod:'290',nome:'PagBank'},
  {cod:'336',nome:'C6 Bank'},{cod:'380',nome:'PicPay'},{cod:'422',nome:'Safra'},
  {cod:'748',nome:'Sicredi'},{cod:'756',nome:'Sicoob'},{cod:'outro',nome:'Outro'},
]

const TIPO_ICONS = { corrente:'🏦', investimento:'📈', caixa:'💵' }
const TIPO_LABEL = { corrente:'Conta Corrente', investimento:'Aplicação/Investimento', caixa:'Caixa Físico' }
const TIPO_CORES = { corrente:'var(--accent2)', investimento:'var(--accent4)', caixa:'var(--success)' }

// ── PARSER OFX ─────────────────────────────────────────────
function parseOFX(content) {
  const transacoes = []
  const getTag = (tag, str) => str.match(new RegExp(`<${tag}>([^<]+)`, 'i'))?.[1]?.trim() || ''
  const stmtRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match
  while ((match = stmtRe.exec(content)) !== null) {
    const b = match[1]
    const dtposted = getTag('DTPOSTED', b)
    const valor = parseFloat(getTag('TRNAMT', b)) || 0
    const memo  = getTag('MEMO', b) || getTag('NAME', b) || ''
    const fitid = getTag('FITID', b)
    const data  = `${dtposted.slice(0,4)}-${dtposted.slice(4,6)}-${dtposted.slice(6,8)}`
    transacoes.push({ fitid, data, descricao: memo, valor, tipo: valor >= 0 ? 'credito' : 'debito' })
  }
  return transacoes
}

// ── CATEGORIZAÇÃO IA (via Netlify Function) ─────────────────
async function categorizarIA(descricoes) {
  try {
    const prompt = `Você é especialista em categorização financeira de clínicas e empresas brasileiras.
Para cada descrição de extrato bancário abaixo, sugira:
1. A categoria financeira mais adequada
2. Se é entrada ou saída
3. Confiança de 0-100

Retorne APENAS JSON válido:
[{"descricao":"...","categoria":"...","tipo":"saida","confianca":85}]

Descrições:
${descricoes.map((d,i) => `${i+1}. ${d}`).join('\n')}`

    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt }),
    })
    const data = await res.json()
    const json = data.reply?.match(/\[[\s\S]*\]/)?.[0]
    return json ? JSON.parse(json) : []
  } catch { return [] }
}

export default function GestaoBancaria({ empresaId }) {
  const { empresa } = useAuth()
  const { clienteId, clienteAtivo } = useCliente()
  const [aba,         setAba]         = useState('contas')
  const [contas,      setContas]      = useState([])
  const [movs,        setMovs]        = useState([])
  const [contaSel,    setContaSel]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [showTransf,  setShowTransf]  = useState(false)
  const [showRend,    setShowRend]    = useState(false)
  const [showOFX,     setShowOFX]     = useState(false)
  const [ofxItems,    setOfxItems]    = useState([])
  const [ofxConta,    setOfxConta]    = useState('')
  const [erpItems,    setErpItems]    = useState([])
  const [processando, setProcessando] = useState(false)
  const [salvando,    setSalvando]    = useState(false)
  const [erro,        setErro]        = useState('')
  const fileRef = useRef()

  // Form nova conta
  const [formConta, setFormConta] = useState({
    apelido:'', tipo:'corrente', banco_codigo:'', banco_nome:'', agencia:'',
    conta:'', chave_pix:'', saldo_inicial:'', data_saldo_inicial: new Date().toISOString().slice(0,10),
  })
  // Form transferência
  const [formTransf, setFormTransf] = useState({ conta_origem:'', conta_destino:'', valor:'', data: new Date().toISOString().slice(0,10), descricao:'Transferência entre contas', tipo:'transferencia' })
  // Form rendimento
  const [formRend, setFormRend] = useState({ conta_id:'', valor:'', data: new Date().toISOString().slice(0,10), descricao:'Rendimento / Juros' })

  useEffect(() => { if (clienteId) carregar() }, [clienteId])
  useEffect(() => { if (contaSel && clienteId) carregarMovs() }, [contaSel, clienteId] )

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('cliente_helevare_id', clienteId)
      .eq('ativo', true)
      .order('tipo').order('apelido')
    setContas(data || [])
    setLoading(false)
  }

  async function carregarMovs() {
    if (!contaSel) return
    const { data } = await supabase
      .from('movimentacoes_bancarias')
      .select('*')
      .eq('conta_id', contaSel)
      .order('data_mov', { ascending: false })
      .limit(50)
    setMovs(data || [])
  }

  // Saldos
  async function calcularSaldo(contaId) {
    const conta = contas.find(c => c.id === contaId)
    if (!conta) return 0
    const { data } = await supabase
      .from('movimentacoes_bancarias')
      .select('valor')
      .eq('conta_id', contaId)
      .gte('data_mov', conta.data_saldo_inicial || '2000-01-01')
    const somaMov = data?.reduce((s,m) => s + Number(m.valor), 0) || 0
    return (Number(conta.saldo_inicial)||0) + somaMov
  }

  const [saldos, setSaldos] = useState({})
  useEffect(() => {
    if (!contas.length) return
    Promise.all(contas.map(async c => ({ id: c.id, saldo: await calcularSaldo(c.id) })))
      .then(res => {
        const s = {}
        res.forEach(r => s[r.id] = r.saldo)
        setSaldos(s)
      })
  }, [contas])

  const saldoOperacional = contas.filter(c=>c.tipo!=='investimento').reduce((s,c)=>s+(saldos[c.id]||0),0)
  const saldoPatrimonial = contas.reduce((s,c)=>s+(saldos[c.id]||0),0)

  async function salvarConta(e) {
    e.preventDefault()
    setSalvando(true); setErro('')
    const banco = BANCOS.find(b=>b.cod===formConta.banco_codigo)
    const dados = {
      ...formConta,
      banco_nome: banco?.nome || formConta.banco_nome || '',
      empresa_id: empresa.id,
      cliente_helevare_id: clienteId,
      saldo_inicial: parseFloat(formConta.saldo_inicial)||0,
      icone: TIPO_ICONS[formConta.tipo],
    }
    const { error } = await supabase.from('contas_bancarias').insert(dados)
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setShowForm(false)
    setFormConta({ apelido:'', tipo:'corrente', banco_codigo:'', banco_nome:'', agencia:'', conta:'', chave_pix:'', saldo_inicial:'', data_saldo_inicial: new Date().toISOString().slice(0,10) })
    carregar()
  }

  async function salvarTransferencia(e) {
    e.preventDefault()
    if (!formTransf.conta_origem || !formTransf.conta_destino || !formTransf.valor) return
    setSalvando(true)
    const valor = parseFloat(formTransf.valor)
    const base = { empresa_id: empresa.id, cliente_helevare_id: clienteId, data_mov: formTransf.data, descricao: formTransf.descricao, origem: 'manual' }
    await supabase.from('movimentacoes_bancarias').insert([
      { ...base, conta_id: formTransf.conta_origem,  valor: -valor, tipo: 'transferencia', conta_destino_id: formTransf.conta_destino },
      { ...base, conta_id: formTransf.conta_destino, valor: +valor, tipo: 'transferencia', conta_destino_id: formTransf.conta_origem  },
    ])
    setSalvando(false)
    setShowTransf(false)
    setFormTransf({ conta_origem:'', conta_destino:'', valor:'', data: new Date().toISOString().slice(0,10), descricao:'Transferência entre contas' })
    carregar()
  }

  async function salvarRendimento(e) {
    e.preventDefault()
    if (!formRend.conta_id || !formRend.valor) return
    setSalvando(true)
    await supabase.from('movimentacoes_bancarias').insert({
      empresa_id: empresa.id, cliente_helevare_id: clienteId,
      conta_id: formRend.conta_id, valor: parseFloat(formRend.valor),
      data_mov: formRend.data, descricao: formRend.descricao,
      tipo: 'rendimento', origem: 'manual',
    })
    setSalvando(false)
    setShowRend(false)
    setFormRend({ conta_id:'', valor:'', data: new Date().toISOString().slice(0,10), descricao:'Rendimento / Juros' })
    carregar()
  }

  // ── OFX: Upload e processamento ──────────────────────────
  async function processarOFX(file) {
    setProcessando(true); setErro('')
    try {
      const content = await new Promise((res,rej) => {
        const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsText(file,'UTF-8')
      })
      const transacoes = parseOFX(content)
      if (!transacoes.length) throw new Error('Nenhuma transação encontrada no OFX.')

      // Verifica duplicatas pelo fitid
      const { data: existentes } = await supabase
        .from('movimentacoes_bancarias')
        .select('ofx_fitid')
        .eq('conta_id', ofxConta)
        .not('ofx_fitid', 'is', null)
      const fitidsExist = new Set((existentes||[]).map(e=>e.ofx_fitid))
      const novas = transacoes.filter(t => !fitidsExist.has(t.fitid))

      if (!novas.length) throw new Error('Todas as transações já foram importadas anteriormente.')

      // Categorização IA em lote
      const descricoes = novas.map(t => t.descricao)
      const cats = await categorizarIA(descricoes.slice(0,15)) // máx 15 por vez

      const itens = novas.map((t,i) => ({
        ...t,
        ia_categoria_sugerida: cats[i]?.categoria || '',
        ia_confianca: cats[i]?.confianca || 50,
        ia_aprovado: false,
        status: 'pendente',
      }))
      // Carrega ERP e faz match automático
      const erpList = await carregarErpParaConciliacao()
      const itensComMatch = matchAutomatico(itens, erpList)
      // Atualiza erpItems com matches
      erpList.forEach((erp, erpIdx) => {
        const ofxMatch = itensComMatch.find(it => it.erpIdx === erpIdx)
        if (ofxMatch) { erp.matched = true; erp.matchIdx = itensComMatch.indexOf(ofxMatch) }
      })
      setErpItems(erpList)
      setOfxItems(itensComMatch)
      setShowOFX(true)
    } catch(e) { setErro(e.message) }
    setProcessando(false)
  }

  async function aprovarOFX(idx) {
    setOfxItems(items => items.map((it,i) => i===idx ? {...it, ia_aprovado:true} : it))
  }

  async function salvarOFX() {
    if (!ofxConta) { setErro('Selecione a conta bancária.'); return }
    setSalvando(true); setErro('')
    const toSave = ofxItems.map(it => ({
      empresa_id: empresa.id, cliente_helevare_id: clienteId,
      conta_id: ofxConta, data_mov: it.data, descricao: it.descricao,
      valor: it.valor, tipo: it.tipo, ofx_fitid: it.fitid,
      ia_categoria_sugerida: it.ia_categoria_sugerida,
      ia_confianca: it.ia_confianca, ia_aprovado: it.ia_aprovado,
      origem: 'ofx',
    }))
    await supabase.from('movimentacoes_bancarias').insert(toSave)
    setSalvando(false)
    setShowOFX(false)
    setOfxItems([])
    carregar()
    if (contaSel) carregarMovs()
  }

  // Carrega lançamentos ERP para conciliação
  async function carregarErpParaConciliacao() {
    const { data: lancs } = await supabase
      .from('lancamentos')
      .select('id, descricao, valor, tipo, data_lancamento, status')
      .eq('empresa_id', empresa.id)
      .eq('cliente_helevare_id', clienteId)
      .neq('status', 'cancelado')
      .order('data_lancamento', { ascending: false })
      .limit(200)

    const { data: cp } = await supabase
      .from('contas_pagar')
      .select('id, descricao, valor, vencimento')
      .eq('empresa_id', empresa.id)
      .eq('cliente_helevare_id', clienteId)
      .eq('status', 'pendente')

    const { data: cr } = await supabase
      .from('contas_receber')
      .select('id, descricao, valor, vencimento')
      .eq('empresa_id', empresa.id)
      .eq('cliente_helevare_id', clienteId)
      .eq('status', 'pendente')

    const items = [
      ...(lancs||[]).map(l => ({ id:l.id, descricao:l.descricao, valor:Number(l.valor), data:l.data_lancamento, tipo:l.tipo, origem:'Lançamento', matched:false, matchIdx:-1 })),
      ...(cp||[]).map(c => ({ id:c.id, descricao:c.descricao, valor:Number(c.valor), data:c.vencimento, tipo:'saida', origem:'Conta a Pagar', matched:false, matchIdx:-1 })),
      ...(cr||[]).map(c => ({ id:c.id, descricao:c.descricao, valor:Number(c.valor), data:c.vencimento, tipo:'entrada', origem:'Conta a Receber', matched:false, matchIdx:-1 })),
    ]
    return items
  }

  // Match automático: valor + data (tolerância 3 dias)
  function matchAutomatico(ofxList, erpList) {
    const erpCopy = erpList.map(e => ({...e}))
    return ofxList.map((ofx, ofxIdx) => {
      const vOfx = Math.abs(Number(ofx.valor))
      const dOfx = new Date(ofx.data)
      let bestIdx = -1
      let bestDiff = 4 // tolerância máxima 3 dias

      erpCopy.forEach((erp, erpIdx) => {
        if (erp.matched) return
        const vErp = Math.abs(Number(erp.valor))
        if (Math.abs(vOfx - vErp) > 0.01) return // valor diferente
        const dErp = new Date(erp.data)
        const diffDias = Math.abs((dOfx - dErp) / (1000*60*60*24))
        if (diffDias < bestDiff) { bestDiff = diffDias; bestIdx = erpIdx }
      })

      if (bestIdx >= 0) {
        erpCopy[bestIdx].matched = true
        erpCopy[bestIdx].matchIdx = ofxIdx
        return { ...ofx, matched: true, erpIdx: bestIdx, conciliado: false }
      }
      return { ...ofx, matched: false, erpIdx: -1, conciliado: false }
    })
  }

  function conciliarItem(ofxIdx) {
    setOfxItems(items => items.map((it,i) => i===ofxIdx ? {...it, conciliado:true, ia_aprovado:true} : it))
  }

  function conciliarTodosMatch() {
    setOfxItems(items => items.map(it => it.matched ? {...it, conciliado:true, ia_aprovado:true} : it))
  }

  async function aprovarTodos() {
    setOfxItems(items => items.map(it => ({...it, ia_aprovado:true})))
  }

  const setFC = (k,v) => setFormConta(f=>({...f,[k]:v}))

  return (
    <div className="fade-up">
      <input ref={fileRef} type="file" accept=".ofx,.ofc" style={{display:'none'}}
        onChange={e => { if(e.target.files[0] && ofxConta) { processarOFX(e.target.files[0]); e.target.value='' } }} />

      <div className="section-header mb-16">
        <div>
          <div className="section-title">Gestão Bancária</div>
          <div className="section-sub">Contas correntes, investimentos e caixas · {clienteAtivo?.nome}</div>
        </div>
        <div className="flex gap-8 flex-wrap">
          <button className="btn btn-ghost" onClick={() => { setOfxItems([]); setShowOFX(true) }} disabled={processando}>
            {processando ? '⏳ Lendo OFX...' : '📂 Importar OFX'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowTransf(true)}>⇄ Transferência</button>
          <button className="btn btn-ghost" onClick={() => setShowRend(true)}>📈 Rendimento</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nova Conta</button>
        </div>
      </div>

      {erro && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'var(--danger)',marginBottom:16}}>⚠️ {erro}</div>}

      {/* Saldos consolidados */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        {[
          { label:'💰 Saldo Operacional', sub:'Conta Corrente + Caixa', val:saldoOperacional, c:'var(--accent)', bg:'rgba(0,212,160,0.06)', bc:'rgba(0,212,160,0.2)' },
          { label:'🏛️ Saldo Patrimonial', sub:'Operacional + Investimentos', val:saldoPatrimonial, c:'var(--accent4)', bg:'rgba(168,85,247,0.06)', bc:'rgba(168,85,247,0.2)' },
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,border:`1px solid ${s.bc}`,borderRadius:16,padding:24}}>
            <div style={{fontSize:13,color:'var(--text2)',fontWeight:600,marginBottom:4}}>{s.label}</div>
            <div style={{fontFamily:'var(--font-head)',fontSize:28,fontWeight:800,color:s.c,marginBottom:4}}>{fmt(s.val)}</div>
            <div style={{fontSize:11,color:'var(--text3)'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="tabs mb-16">
        <div className={`tab ${aba==='contas'?'active':''}`} onClick={()=>setAba('contas')}>🏦 Contas ({contas.length})</div>
        <div className={`tab ${aba==='extrato'?'active':''}`} onClick={()=>setAba('extrato')}>📋 Extrato & Conciliação</div>
        <div className={`tab ${aba==='invest'?'active':''}`} onClick={()=>setAba('invest')}>📈 Investimentos</div>
      </div>

      {/* ABA: CONTAS */}
      {aba==='contas' && (
        <div>
          {loading ? <div className="empty">Carregando...</div> :
           contas.length===0 ? (
            <div className="empty">
              <div style={{fontSize:40,marginBottom:8}}>🏦</div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--text2)',marginBottom:6}}>Nenhuma conta cadastrada</div>
              <button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ Cadastrar Conta</button>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
              {contas.map(c=>(
                <div key={c.id} style={{
                  background:'var(--card)', border:`1px solid var(--border)`,
                  borderRadius:16, padding:20, cursor:'pointer', transition:'var(--transition)',
                  borderLeft:`4px solid ${TIPO_CORES[c.tipo]}`,
                }} onClick={()=>{setContaSel(c.id);setAba('extrato')}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <div style={{fontSize:24}}>{TIPO_ICONS[c.tipo]}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{c.apelido}</div>
                      <div style={{fontSize:11,color:'var(--text3)'}}>{TIPO_LABEL[c.tipo]}</div>
                    </div>
                  </div>
                  {c.banco_nome && <div style={{fontSize:11,color:'var(--text3)',marginBottom:8}}>🏛️ {c.banco_nome} {c.agencia?`· Ag ${c.agencia}`:''}</div>}
                  <div style={{fontFamily:'var(--font-head)',fontSize:22,fontWeight:800,color:TIPO_CORES[c.tipo]}}>
                    {fmt(saldos[c.id]||0)}
                  </div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Saldo atual · clique para ver extrato</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: EXTRATO */}
      {aba==='extrato' && (
        <div>
          {/* Seletor de conta */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <label style={{fontSize:13,color:'var(--text2)',fontWeight:600}}>Conta:</label>
            <select className="inp" style={{maxWidth:280}} value={contaSel||''} onChange={e=>setContaSel(e.target.value||null)}>
              <option value="">— Selecione —</option>
              {contas.map(c=><option key={c.id} value={c.id}>{TIPO_ICONS[c.tipo]} {c.apelido} — {fmt(saldos[c.id]||0)}</option>)}
            </select>
            {contaSel && (
              <button className="btn btn-ghost" onClick={() => { setOfxConta(contaSel); setOfxItems([]); setShowOFX(true) }}>
                📂 Importar OFX nesta conta
              </button>
            )}
          </div>

          {contaSel ? (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Movimentações</span>
                <span className="badge badge-info">{movs.length} lançamentos</span>
              </div>
              {movs.length===0 ? (
                <div className="empty">
                  <div style={{fontSize:32,marginBottom:8}}>📋</div>
                  <div>Nenhuma movimentação. Importe um OFX ou registre manualmente.</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria IA</th><th>Valor</th><th>Conciliado</th></tr></thead>
                    <tbody>
                      {movs.map(m=>(
                        <tr key={m.id}>
                          <td style={{fontSize:12,color:'var(--text3)'}}>{fmtD(m.data_mov)}</td>
                          <td>
                            <div style={{fontSize:13,color:'var(--text)'}}>{m.descricao}</div>
                            {m.origem==='ofx' && <div style={{fontSize:10,color:'var(--text3)'}}>OFX</div>}
                          </td>
                          <td>
                            <span className={`badge ${m.tipo==='credito'||m.tipo==='rendimento'?'badge-success':m.tipo==='transferencia'?'badge-info':'badge-danger'}`}>
                              {m.tipo}
                            </span>
                          </td>
                          <td>
                            {m.ia_categoria_sugerida ? (
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <span style={{fontSize:11,color:'var(--accent4)'}}>{m.ia_categoria_sugerida}</span>
                                {!m.ia_aprovado && (
                                  <button style={{fontSize:10,padding:'2px 8px',borderRadius:4,background:'rgba(0,212,160,0.12)',color:'var(--accent)',border:'1px solid rgba(0,212,160,0.3)',cursor:'pointer'}}
                                    onClick={async()=>{await supabase.from('movimentacoes_bancarias').update({ia_aprovado:true}).eq('id',m.id);carregarMovs()}}>
                                    ✓ Aprovar
                                  </button>
                                )}
                                {m.ia_aprovado && <span style={{color:'var(--success)',fontSize:12}}>✓</span>}
                              </div>
                            ) : <span style={{color:'var(--text3)',fontSize:12}}>—</span>}
                          </td>
                          <td style={{fontFamily:'var(--font-head)',fontWeight:700,color:Number(m.valor)>=0?'var(--success)':'var(--danger)'}}>
                            {Number(m.valor)>=0?'+':''}{fmt(m.valor)}
                          </td>
                          <td>
                            {m.conciliado
                              ? <span style={{color:'var(--success)',fontSize:18}}>✓</span>
                              : <button style={{fontSize:10,padding:'3px 8px',borderRadius:4,background:'rgba(0,212,160,0.1)',color:'var(--accent)',border:'1px solid rgba(0,212,160,0.3)',cursor:'pointer'}}
                                  onClick={async()=>{await supabase.from('movimentacoes_bancarias').update({conciliado:true}).eq('id',m.id);carregarMovs()}}>
                                  Conciliar
                                </button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="empty">Selecione uma conta para ver o extrato.</div>
          )}
        </div>
      )}

      {/* ABA: INVESTIMENTOS */}
      {aba==='invest' && (
        <div>
          {contas.filter(c=>c.tipo==='investimento').length===0 ? (
            <div className="empty">
              <div style={{fontSize:40,marginBottom:8}}>📈</div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--text2)',marginBottom:6}}>Nenhuma aplicação cadastrada</div>
              <button className="btn btn-primary" onClick={()=>{setFormConta(f=>({...f,tipo:'investimento'}));setShowForm(true)}}>
                + Cadastrar Aplicação
              </button>
            </div>
          ) : (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12,marginBottom:20}}>
                {contas.filter(c=>c.tipo==='investimento').map(c=>(
                  <div key={c.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderLeft:'4px solid var(--accent4)',borderRadius:16,padding:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{c.apelido}</div>
                        <div style={{fontSize:11,color:'var(--text3)'}}>{c.banco_nome||'Aplicação'}</div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-ghost btn-icon" style={{fontSize:12}} onClick={()=>{setFormRend(f=>({...f,conta_id:c.id}));setShowRend(true)}}>+Rend.</button>
                        <button className="btn btn-ghost btn-icon" style={{fontSize:12}} onClick={()=>{setFormTransf(f=>({...f,conta_origem:c.id}));setShowTransf(true)}}>Resgatar</button>
                      </div>
                    </div>
                    <div style={{fontFamily:'var(--font-head)',fontSize:24,fontWeight:800,color:'var(--accent4)',marginBottom:8}}>
                      {fmt(saldos[c.id]||0)}
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>
                      Saldo inicial: {fmt(c.saldo_inicial)} · desde {fmtD(c.data_saldo_inicial)}
                    </div>
                    <div style={{fontSize:11,color:'var(--success)',marginTop:4}}>
                      Rendimento: {fmt((saldos[c.id]||0) - (c.saldo_inicial||0))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{background:'rgba(168,85,247,0.06)',border:'1px solid rgba(168,85,247,0.2)',borderRadius:12,padding:16,fontSize:13,color:'var(--text2)'}}>
                ℹ️ <strong>Regra patrimonial:</strong> Aplicações e resgates são <strong>transferências entre contas</strong> — não impactam o faturamento da clínica.
                Apenas rendimentos lançados diretamente atualizam o saldo patrimonial como receita financeira.
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Nova Conta */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:800,marginBottom:20}}>🏦 Nova Conta / Caixa</div>
            {erro && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:8,padding:'10px',fontSize:13,color:'var(--danger)',marginBottom:12}}>⚠️ {erro}</div>}
            <form onSubmit={salvarConta} style={{display:'flex',flexDirection:'column',gap:12}}>
              {[
                { label:'Nome / Apelido *', key:'apelido', placeholder:'Ex: Itaú - Conta Clínica' },
              ].map(f=>(
                <div key={f.key}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>{f.label}</label>
                  <input className="inp" placeholder={f.placeholder} value={formConta[f.key]} onChange={e=>setFC(f.key,e.target.value)} required />
                </div>
              ))}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Tipo de Conta *</label>
                <select className="inp" value={formConta.tipo} onChange={e=>setFC('tipo',e.target.value)}>
                  <option value="corrente">🏦 Conta Corrente</option>
                  <option value="investimento">📈 Aplicação / Investimento</option>
                  <option value="caixa">💵 Caixa Físico (Dinheiro Vivo)</option>
                </select>
              </div>
              {formConta.tipo !== 'caixa' && (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Banco</label>
                      <select className="inp" value={formConta.banco_codigo} onChange={e=>setFC('banco_codigo',e.target.value)}>
                        <option value="">— Selecione —</option>
                        {BANCOS.map(b=><option key={b.cod} value={b.cod}>{b.cod !== 'outro' ? `${b.cod} - ` : ''}{b.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Agência</label>
                      <input className="inp" placeholder="0000" value={formConta.agencia} onChange={e=>setFC('agencia',e.target.value)} />
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Número da Conta</label>
                      <input className="inp" placeholder="00000-0" value={formConta.conta} onChange={e=>setFC('conta',e.target.value)} />
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Chave Pix</label>
                      <input className="inp" placeholder="CPF, e-mail, celular..." value={formConta.chave_pix} onChange={e=>setFC('chave_pix',e.target.value)} />
                    </div>
                  </div>
                </>
              )}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Saldo Inicial (R$)</label>
                  <input className="inp" type="number" step="0.01" placeholder="0,00" value={formConta.saldo_inicial} onChange={e=>setFC('saldo_inicial',e.target.value)} />
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Data do Saldo Inicial</label>
                  <input className="inp" type="date" value={formConta.data_saldo_inicial} onChange={e=>setFC('data_saldo_inicial',e.target.value)} />
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button type="button" style={{flex:1,padding:11,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}} onClick={()=>setShowForm(false)}>Cancelar</button>
                <button type="submit" style={{flex:2,padding:11,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700}} disabled={salvando}>
                  {salvando?'⏳':'✅ Cadastrar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Transferência */}
      {showTransf && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&setShowTransf(false)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:480}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:800,marginBottom:20}}>⇄ Transferência entre Contas</div>
            <form onSubmit={salvarTransferencia} style={{display:'flex',flexDirection:'column',gap:12}}>
              {[
                { label:'Conta Origem', key:'conta_origem' },
                { label:'Conta Destino', key:'conta_destino' },
              ].map(f=>(
                <div key={f.key}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>{f.label}</label>
                  <select className="inp" value={formTransf[f.key]} onChange={e=>setFormTransf(t=>({...t,[f.key]:e.target.value}))} required>
                    <option value="">— Selecione —</option>
                    {contas.map(c=><option key={c.id} value={c.id}>{TIPO_ICONS[c.tipo]} {c.apelido} — {fmt(saldos[c.id]||0)}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Valor (R$)</label>
                <input className="inp" type="number" step="0.01" min="0.01" placeholder="0,00" value={formTransf.valor} onChange={e=>setFormTransf(t=>({...t,valor:e.target.value}))} required />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Data</label>
                <input className="inp" type="date" value={formTransf.data} onChange={e=>setFormTransf(t=>({...t,data:e.target.value}))} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Descrição</label>
                <input className="inp" value={formTransf.descricao} onChange={e=>setFormTransf(t=>({...t,descricao:e.target.value}))} />
              </div>
              <div style={{background:'rgba(0,144,255,0.06)',border:'1px solid rgba(0,144,255,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--text2)'}}>
                ℹ️ Transferência não é receita nem despesa — apenas movimentação patrimonial.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button type="button" style={{flex:1,padding:11,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}} onClick={()=>setShowTransf(false)}>Cancelar</button>
                <button type="submit" style={{flex:2,padding:11,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700}} disabled={salvando}>
                  {salvando?'⏳':'✅ Registrar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Rendimento */}
      {showRend && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&setShowRend(false)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:440}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:800,marginBottom:20}}>📈 Lançar Rendimento</div>
            <form onSubmit={salvarRendimento} style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Conta de Investimento</label>
                <select className="inp" value={formRend.conta_id} onChange={e=>setFormRend(r=>({...r,conta_id:e.target.value}))} required>
                  <option value="">— Selecione —</option>
                  {contas.filter(c=>c.tipo==='investimento').map(c=><option key={c.id} value={c.id}>{c.apelido}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Valor do Rendimento (R$)</label>
                <input className="inp" type="number" step="0.01" min="0.01" placeholder="0,00" value={formRend.valor} onChange={e=>setFormRend(r=>({...r,valor:e.target.value}))} required />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Data</label>
                <input className="inp" type="date" value={formRend.data} onChange={e=>setFormRend(r=>({...r,data:e.target.value}))} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Descrição</label>
                <input className="inp" value={formRend.descricao} onChange={e=>setFormRend(r=>({...r,descricao:e.target.value}))} />
              </div>
              <div style={{background:'rgba(0,212,160,0.06)',border:'1px solid rgba(0,212,160,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--text2)'}}>
                ℹ️ Rendimento lançado diretamente na conta de investimento — não impacta o faturamento operacional.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button type="button" style={{flex:1,padding:11,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}} onClick={()=>setShowRend(false)}>Cancelar</button>
                <button type="submit" style={{flex:2,padding:11,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700}} disabled={salvando}>
                  {salvando?'⏳':'✅ Lançar Rendimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL STEP 1: Seleção obrigatória de conta ANTES do upload */}
      {showOFX && ofxItems.length === 0 && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&setShowOFX(false)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:460}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:800,marginBottom:6}}>📂 Importar Extrato OFX</div>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:24}}>Selecione a qual conta bancária pertence este extrato antes de fazer o upload.</div>
            <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:6}}>Conta Bancária *</label>
            <select className="inp" style={{marginBottom:20}} value={ofxConta} onChange={e=>setOfxConta(e.target.value)}>
              <option value="">— Selecione a conta —</option>
              {contas.map(c=><option key={c.id} value={c.id}>{TIPO_ICONS[c.tipo]} {c.apelido} {c.banco_nome?`— ${c.banco_nome}`:''}</option>)}
            </select>
            <div style={{display:'flex',gap:10}}>
              <button style={{flex:1,padding:11,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}} onClick={()=>setShowOFX(false)}>Cancelar</button>
              <button style={{flex:2,padding:11,borderRadius:'var(--radius)',background: ofxConta?'var(--accent)':'var(--border)',color: ofxConta?'var(--bg)':'var(--text3)',border:'none',cursor: ofxConta?'pointer':'not-allowed',fontFamily:'var(--font-head)',fontWeight:700}}
                disabled={!ofxConta}
                onClick={()=>fileRef.current?.click()}>
                📂 Selecionar Arquivo OFX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STEP 2: IA + Conciliação em duas colunas */}
      {showOFX && ofxItems.length > 0 && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',flexDirection:'column',zIndex:1000}}>
          {/* Header */}
          <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div>
              <div style={{fontFamily:'var(--font-head)',fontSize:17,fontWeight:800}}>
                🤖 IA + Conciliação Bancária — {contas.find(c=>c.id===ofxConta)?.apelido}
              </div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>
                {ofxItems.length} transações importadas · {ofxItems.filter(i=>i.ia_aprovado).length} aprovadas · {ofxItems.filter(i=>i.matched).length} conciliadas
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-ghost" onClick={aprovarTodos}>✓ Aprovar Todos</button>
              <button className="btn btn-ghost" onClick={conciliarTodosMatch}>🔗 Conciliar Matches</button>
              <button className="btn btn-primary" onClick={salvarOFX} disabled={salvando||!ofxConta}>
                {salvando?'⏳':'💾 Salvar'}
              </button>
              <button className="btn btn-ghost btn-icon" onClick={()=>{setShowOFX(false);setOfxItems([])}}>✕</button>
            </div>
          </div>

          {/* Legenda */}
          <div style={{background:'var(--bg3)',padding:'8px 24px',display:'flex',gap:20,fontSize:11,color:'var(--text3)',flexShrink:0}}>
            <span><span style={{color:'var(--success)'}}>●</span> Match automático (valor + data)</span>
            <span><span style={{color:'var(--accent4)'}}>●</span> Categoria sugerida pela IA</span>
            <span><span style={{color:'var(--warn)'}}>●</span> Pendente de aprovação</span>
          </div>

          {/* Duas colunas */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',flex:1,overflow:'hidden',gap:0}}>

            {/* COLUNA A: Extrato OFX */}
            <div style={{display:'flex',flexDirection:'column',borderRight:'2px solid var(--border)',overflow:'hidden'}}>
              <div style={{background:'rgba(0,144,255,0.08)',padding:'12px 20px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
                <div style={{fontWeight:700,fontSize:13,color:'var(--accent2)'}}>📥 Coluna A — Extrato Bancário (OFX)</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>Dados reais do banco</div>
              </div>
              <div style={{overflowY:'auto',flex:1}}>
                {ofxItems.map((it,i)=>(
                  <div key={i} style={{
                    padding:'12px 20px', borderBottom:'1px solid var(--border)',
                    background: it.matched ? 'rgba(0,212,160,0.06)' : it.ia_aprovado ? 'rgba(0,212,160,0.03)' : 'transparent',
                    borderLeft: it.matched ? '3px solid var(--success)' : it.ia_aprovado ? '3px solid rgba(0,212,160,0.3)' : '3px solid transparent',
                    transition:'all 0.2s',
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.descricao}</div>
                        <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{fmtD(it.data)} · {it.tipo}</div>
                      </div>
                      <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:14,color:Number(it.valor)>=0?'var(--success)':'var(--danger)',marginLeft:12,flexShrink:0}}>
                        {Number(it.valor)>=0?'+':''}{fmt(it.valor)}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      {it.ia_categoria_sugerida && (
                        <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'rgba(168,85,247,0.12)',color:'var(--accent4)'}}>
                          🤖 {it.ia_categoria_sugerida} {it.ia_confianca?`(${it.ia_confianca}%)`:''}</span>
                      )}
                      {it.matched && <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'rgba(0,212,160,0.15)',color:'var(--success)'}}>✓ Match encontrado</span>}
                      {!it.ia_aprovado && (
                        <button onClick={()=>aprovarOFX(i)}
                          style={{fontSize:10,padding:'2px 10px',borderRadius:10,background:'rgba(0,212,160,0.12)',color:'var(--accent)',border:'1px solid rgba(0,212,160,0.3)',cursor:'pointer',fontWeight:600}}>
                          ✓ Aprovar lançamento
                        </button>
                      )}
                      {it.ia_aprovado && !it.matched && <span style={{fontSize:10,color:'var(--success)'}}>✓ Aprovado</span>}
                      {it.matched && !it.conciliado && (
                        <button onClick={()=>conciliarItem(i)}
                          style={{fontSize:10,padding:'2px 10px',borderRadius:10,background:'rgba(0,212,160,0.2)',color:'var(--success)',border:'1px solid rgba(0,212,160,0.4)',cursor:'pointer',fontWeight:700}}>
                          🔗 Conciliar
                        </button>
                      )}
                      {it.conciliado && <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'rgba(0,212,160,0.2)',color:'var(--success)',fontWeight:700}}>✅ Conciliado</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUNA B: Operacional ERP */}
            <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
              <div style={{background:'rgba(168,85,247,0.08)',padding:'12px 20px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
                <div style={{fontWeight:700,fontSize:13,color:'var(--accent4)'}}>📊 Coluna B — Operacional da Clínica (ERP)</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>Lançamentos, contas a pagar/receber cadastrados</div>
              </div>
              <div style={{overflowY:'auto',flex:1}}>
                {erpItems.length === 0 ? (
                  <div style={{padding:32,textAlign:'center',color:'var(--text3)',fontSize:13}}>
                    Carregando lançamentos do sistema...
                  </div>
                ) : erpItems.map((erp,i)=>(
                  <div key={i} style={{
                    padding:'12px 20px', borderBottom:'1px solid var(--border)',
                    background: erp.matched ? 'rgba(0,212,160,0.06)' : 'transparent',
                    borderLeft: erp.matched ? '3px solid var(--success)' : '3px solid transparent',
                    transition:'all 0.2s',
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{erp.descricao}</div>
                        <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>
                          {fmtD(erp.data)} · <span className={`badge ${erp.tipo==='entrada'?'badge-success':'badge-danger'}`} style={{fontSize:9}}>{erp.tipo}</span>
                          {erp.origem && <span style={{color:'var(--text3)',marginLeft:6}}>{erp.origem}</span>}
                        </div>
                      </div>
                      <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:14,color:erp.tipo==='entrada'?'var(--success)':'var(--danger)',marginLeft:12,flexShrink:0}}>
                        {erp.tipo==='entrada'?'+':'-'}{fmt(erp.valor)}
                      </div>
                    </div>
                    {erp.matched && (
                      <div style={{marginTop:6,fontSize:10,color:'var(--success)'}}>
                        ✓ Match com: {ofxItems[erp.matchIdx]?.descricao?.slice(0,40)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rodapé stats */}
          <div style={{background:'var(--card)',borderTop:'1px solid var(--border)',padding:'10px 24px',display:'flex',gap:24,fontSize:12,color:'var(--text3)',flexShrink:0}}>
            <span>Total OFX: <strong style={{color:'var(--text)'}}>{ofxItems.length}</strong></span>
            <span>Matches: <strong style={{color:'var(--success)'}}>{ofxItems.filter(i=>i.matched).length}</strong></span>
            <span>Aprovados IA: <strong style={{color:'var(--accent4)'}}>{ofxItems.filter(i=>i.ia_aprovado).length}</strong></span>
            <span>Conciliados: <strong style={{color:'var(--success)'}}>{ofxItems.filter(i=>i.conciliado).length}</strong></span>
            <span style={{marginLeft:'auto'}}>
              Taxa conciliação: <strong style={{color:'var(--accent)'}}>
                {ofxItems.length > 0 ? Math.round(ofxItems.filter(i=>i.conciliado).length/ofxItems.length*100) : 0}%
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
