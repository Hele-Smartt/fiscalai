// src/pages/RepaseMedico.jsx
// Módulo 13: Repasse Médico — cálculo sobre valor líquido após Split Payment

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useCliente } from '../lib/ClienteContext'
import { supabase } from '../lib/supabase'

const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)
const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

export default function RepasseMedico({ empresaId }) {
  const { empresa } = useAuth()
  const { clienteId } = useCliente()
  const [medicos,   setMedicos]   = useState([])
  const [repasses,  setRepasses]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [showCalc,  setShowCalc]  = useState(false)
  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState('')

  const [medico, setMedico] = useState({ nome:'', especialidade:'', crm:'', cpf:'', email:'', telefone:'', percentual_repasse:60 })
  const [calc,   setCalc]   = useState({ medico_id:'', valor_bruto:'', taxa_op:2.5, aliq_ibs:17.7, aliq_cbs:8.8 })
  const [calcRes, setCalcRes] = useState(null)

  useEffect(() => { if (clienteId) carregar() }, [clienteId])

  async function carregar() {
    setLoading(true)
    const [m, r] = await Promise.all([
      supabase.from('medicos').select('*').eq('cliente_helevare_id', clienteId).eq('ativo', true).order('nome'),
      supabase.from('repasses_medicos').select('*, medicos(nome,especialidade)').eq('cliente_helevare_id', clienteId).order('data_repasse', {ascending:false}).limit(20),
    ])
    setMedicos(m.data || [])
    setRepasses(r.data || [])
    setLoading(false)
  }

  async function salvarMedico(e) {
    e.preventDefault()
    if (!medico.nome) { setErro('Nome obrigatório.'); return }
    setSalvando(true); setErro('')
    const { error } = await supabase.from('medicos').insert({ ...medico, empresa_id: empresa.id, cliente_helevare_id: clienteId })
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setShowForm(false)
    setMedico({ nome:'', especialidade:'', crm:'', cpf:'', email:'', telefone:'', percentual_repasse:60 })
    carregar()
  }

  async function calcularRepasse() {
    const vb  = parseFloat(calc.valor_bruto) || 0
    const txOp = parseFloat(calc.taxa_op)    || 0
    const ibs  = parseFloat(calc.aliq_ibs)   || 0
    const cbs  = parseFloat(calc.aliq_cbs)   || 0
    const med  = medicos.find(m => m.id === calc.medico_id)
    if (!med || !vb) return

    const vTaxaOp = vb * (txOp / 100)
    const vIbs    = vb * (ibs  / 100)
    const vCbs    = vb * (cbs  / 100)
    const vLiq    = vb - vTaxaOp - vIbs - vCbs
    const vRepasse = vLiq * (med.percentual_repasse / 100)
    const vClinica = vLiq - vRepasse

    setCalcRes({ vb, vTaxaOp, vIbs, vCbs, vLiq, vRepasse, vClinica, pct: med.percentual_repasse, medNome: med.nome })
  }

  async function salvarRepasse() {
    if (!calcRes || !calc.medico_id) return
    setSalvando(true)
    await supabase.from('repasses_medicos').insert({
      empresa_id: empresa.id, cliente_helevare_id: clienteId,
      medico_id: calc.medico_id,
      data_repasse: new Date().toISOString().slice(0,10),
      valor_bruto: calcRes.vb, valor_split: calcRes.vIbs + calcRes.vCbs,
      valor_liquido: calcRes.vLiq, percentual: calcRes.pct,
      valor_repasse: calcRes.vRepasse,
    })
    setSalvando(false)
    setCalcRes(null)
    setShowCalc(false)
    carregar()
  }

  const totalRepasses = repasses.reduce((s,r) => s + Number(r.valor_repasse||0), 0)
  const totalPendente = repasses.filter(r=>r.status==='pendente').reduce((s,r) => s + Number(r.valor_repasse||0), 0)

  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Repasse Médico</div>
          <div className="section-sub">Cálculo sobre valor líquido após Split Payment — nunca sobre valor bruto</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost" onClick={() => setShowCalc(true)}>🧮 Calcular Repasse</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Médico</button>
        </div>
      </div>

      <div className="metrics-grid mb-20">
        {[
          { label:'Médicos Cadastrados', val: medicos.length,       c:'var(--accent2)' },
          { label:'Total Repasses',      val: fmt(totalRepasses),   c:'var(--accent)'  },
          { label:'Pendente Pagamento',  val: fmt(totalPendente),   c:'var(--warn)'    },
          { label:'Últimos Repasses',    val: repasses.length,      c:'var(--accent4)' },
        ].map((m,i)=>(
          <div key={i} className="metric-card" style={{'--accent-color':m.c}}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{color:m.c}}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Lista de médicos */}
      <div className="card mb-16">
        <div className="card-header"><span className="card-title">👨‍⚕️ Médicos Cadastrados</span></div>
        {loading ? <div className="empty">Carregando...</div> :
         medicos.length === 0 ? (
          <div className="empty">
            <div style={{fontSize:32,marginBottom:8}}>👨‍⚕️</div>
            <div>Nenhum médico cadastrado.</div>
            <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>setShowForm(true)}>+ Cadastrar Médico</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>Especialidade</th><th>CRM</th><th>% Repasse</th><th>Contato</th></tr></thead>
              <tbody>
                {medicos.map(m=>(
                  <tr key={m.id}>
                    <td className="primary">{m.nome}</td>
                    <td>{m.especialidade||'—'}</td>
                    <td style={{color:'var(--text3)'}}>{m.crm||'—'}</td>
                    <td><span className="badge badge-success">{m.percentual_repasse}%</span></td>
                    <td style={{fontSize:12}}>{m.email||m.telefone||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histórico de repasses */}
      {repasses.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">📋 Histórico de Repasses</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Médico</th><th>Vl. Bruto</th><th>Split</th><th>Vl. Líquido</th><th>%</th><th>Repasse</th><th>Status</th></tr></thead>
              <tbody>
                {repasses.map(r=>(
                  <tr key={r.id}>
                    <td>{fmtD(r.data_repasse)}</td>
                    <td className="primary">{r.medicos?.nome||'—'}</td>
                    <td className="money">{fmt(r.valor_bruto)}</td>
                    <td style={{color:'var(--danger)',fontSize:12}}>-{fmt(r.valor_split)}</td>
                    <td className="money">{fmt(r.valor_liquido)}</td>
                    <td><span className="badge badge-info">{r.percentual}%</span></td>
                    <td className="money pos">{fmt(r.valor_repasse)}</td>
                    <td><span className={`badge ${r.status==='pago'?'badge-success':'badge-warn'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cadastro Médico */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:480}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:800,marginBottom:20}}>👨‍⚕️ Cadastrar Médico</div>
            {erro && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--danger)',marginBottom:14}}>⚠️ {erro}</div>}
            <form onSubmit={salvarMedico} style={{display:'flex',flexDirection:'column',gap:12}}>
              {[
                { label:'Nome Completo *', key:'nome',          placeholder:'Dr. João Silva' },
                { label:'Especialidade',   key:'especialidade', placeholder:'Cardiologia' },
                { label:'CRM',             key:'crm',           placeholder:'CRM-SP 12345' },
                { label:'CPF',             key:'cpf',           placeholder:'000.000.000-00' },
                { label:'E-mail',          key:'email',         placeholder:'dr@clinica.com', type:'email' },
                { label:'Telefone',        key:'telefone',      placeholder:'(11) 99999-9999' },
              ].map(f=>(
                <div key={f.key}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>{f.label}</label>
                  <input className="inp" type={f.type||'text'} placeholder={f.placeholder}
                    value={medico[f.key]} onChange={e=>setMedico(m=>({...m,[f.key]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>% de Repasse (sobre valor líquido)</label>
                <input className="inp" type="number" min="0" max="100" step="0.5"
                  value={medico.percentual_repasse} onChange={e=>setMedico(m=>({...m,percentual_repasse:e.target.value}))} />
              </div>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button type="button" style={{flex:1,padding:11,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}} onClick={()=>setShowForm(false)}>Cancelar</button>
                <button type="submit" style={{flex:2,padding:11,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700}} disabled={salvando}>
                  {salvando?'⏳ Salvando...':'✅ Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Calcular Repasse */}
      {showCalc && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&(setShowCalc(false),setCalcRes(null))}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:520}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:800,marginBottom:20}}>🧮 Calcular Repasse Médico</div>
            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Médico</label>
                <select className="inp" value={calc.medico_id} onChange={e=>setCalc(c=>({...c,medico_id:e.target.value}))}>
                  <option value="">— Selecione —</option>
                  {medicos.map(m=><option key={m.id} value={m.id}>{m.nome} ({m.percentual_repasse}%)</option>)}
                </select>
              </div>
              {[
                { label:'Valor Bruto da Consulta (R$)', key:'valor_bruto', step:'0.01', placeholder:'500.00' },
                { label:'Taxa Operadora (%)',           key:'taxa_op',     step:'0.01', placeholder:'2.5' },
                { label:'Alíquota IBS (%)',             key:'aliq_ibs',    step:'0.1',  placeholder:'17.7' },
                { label:'Alíquota CBS (%)',             key:'aliq_cbs',    step:'0.1',  placeholder:'8.8'  },
              ].map(f=>(
                <div key={f.key}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>{f.label}</label>
                  <input className="inp" type="number" step={f.step} placeholder={f.placeholder}
                    value={calc[f.key]} onChange={e=>setCalc(c=>({...c,[f.key]:e.target.value}))} />
                </div>
              ))}
              <button className="btn btn-primary" onClick={calcularRepasse}>⚡ Calcular</button>
            </div>

            {calcRes && (
              <div>
                <div style={{background:'var(--bg3)',borderRadius:8,padding:16,marginBottom:16}}>
                  {[
                    { label:`Valor Bruto`,                v:calcRes.vb,      c:'var(--text)',    sign:'' },
                    { label:`(-) Taxa Operadora`,         v:calcRes.vTaxaOp, c:'var(--danger)',  sign:'-' },
                    { label:`(-) IBS`,                    v:calcRes.vIbs,    c:'var(--danger)',  sign:'-' },
                    { label:`(-) CBS`,                    v:calcRes.vCbs,    c:'var(--danger)',  sign:'-' },
                    { label:`= Valor Líquido`,            v:calcRes.vLiq,    c:'var(--accent2)', sign:'', bold:true },
                    { label:`Repasse ${calcRes.pct}%`,    v:calcRes.vRepasse,c:'var(--accent4)', sign:'' },
                    { label:`Clínica`,                    v:calcRes.vClinica,c:'var(--success)', sign:'', bold:true },
                  ].map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)',fontWeight:r.bold?700:400}}>
                      <span style={{fontSize:13,color:'var(--text2)'}}>{r.label}</span>
                      <span style={{fontSize:13,color:r.c,fontFamily:r.bold?'var(--font-head)':'var(--font-body)'}}>{r.sign}{fmt(r.v)}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button style={{flex:1,padding:10,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}} onClick={()=>{setShowCalc(false);setCalcRes(null)}}>Fechar</button>
                  <button style={{flex:2,padding:10,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700}} onClick={salvarRepasse} disabled={salvando}>
                    {salvando?'⏳':'💾 Salvar Repasse'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
