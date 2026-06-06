// src/pages/OperadorasCartao.jsx
// Módulo 3: Controle de Taxas de Maquininha

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useCliente } from '../lib/ClienteContext'
import { supabase } from '../lib/supabase'

const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)

export default function OperadorasCartao({ empresaId }) {
  const { empresa } = useAuth()
  const { clienteId } = useCliente()
  const [operadoras, setOperadoras] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [editando,   setEditando]   = useState(null)
  const [salvando,   setSalvando]   = useState(false)
  const [simulacao,  setSimulacao]  = useState({ valor:'', operadora_id:'', modalidade:'debito' })
  const [simRes,     setSimRes]     = useState(null)

  useEffect(() => { if (clienteId) carregar() }, [clienteId])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('operadoras_cartao')
      .select('*').eq('cliente_helevare_id', clienteId).order('nome')
    setOperadoras(data || [])
    setLoading(false)
  }

  async function salvar(op) {
    setSalvando(true)
    if (op.id) {
      await supabase.from('operadoras_cartao').update(op).eq('id', op.id)
    } else {
      await supabase.from('operadoras_cartao').insert({ ...op, empresa_id: empresa.id, cliente_helevare_id: clienteId })
    }
    setSalvando(false)
    setEditando(null)
    carregar()
  }

  function simular() {
    const vb  = parseFloat(simulacao.valor) || 0
    const op  = operadoras.find(o => o.id === simulacao.operadora_id)
    if (!op || !vb) return
    const taxaPct = simulacao.modalidade === 'debito' ? op.taxa_debito_pct
                  : simulacao.modalidade === 'parcelado' ? op.taxa_credito_parc_pct
                  : op.taxa_credito_vista_pct
    const prazo = simulacao.modalidade === 'debito' ? op.prazo_debito_dias
                : simulacao.modalidade === 'parcelado' ? op.prazo_credito_parc_dias
                : op.prazo_credito_vista_dias
    const vTaxa = vb * (taxaPct / 100)
    const vLiq  = vb - vTaxa
    setSimRes({ vb, taxaPct, vTaxa, vLiq, prazo, opNome: op.nome, modalidade: simulacao.modalidade })
  }

  const novaOp = { nome:'', taxa_debito_pct:1.5, prazo_debito_dias:1, taxa_credito_vista_pct:2.5, prazo_credito_vista_dias:30, taxa_credito_parc_pct:3.5, prazo_credito_parc_dias:30 }

  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Operadoras & Taxas de Cartão</div>
          <div className="section-sub">Configure as taxas de maquininha para cálculo do valor líquido real</div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditando(novaOp)}>+ Nova Operadora</button>
      </div>

      {/* Simulador */}
      <div className="card mb-16">
        <div className="card-header"><span className="card-title">💳 Simulador de Recebimento</span></div>
        <div className="card-body">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:12,alignItems:'flex-end'}}>
            <div>
              <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:5}}>Valor (R$)</label>
              <input className="inp" type="number" step="0.01" placeholder="1000.00"
                value={simulacao.valor} onChange={e=>setSimulacao(s=>({...s,valor:e.target.value}))} />
            </div>
            <div>
              <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:5}}>Operadora</label>
              <select className="inp" value={simulacao.operadora_id} onChange={e=>setSimulacao(s=>({...s,operadora_id:e.target.value}))}>
                <option value="">— Selecione —</option>
                {operadoras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:5}}>Modalidade</label>
              <select className="inp" value={simulacao.modalidade} onChange={e=>setSimulacao(s=>({...s,modalidade:e.target.value}))}>
                <option value="debito">Débito</option>
                <option value="vista">Crédito à Vista</option>
                <option value="parcelado">Crédito Parcelado</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={simular}>Simular</button>
          </div>

          {simRes && (
            <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {[
                { label:'Valor Bruto',    val:fmt(simRes.vb),    c:'var(--accent2)', bg:'rgba(0,144,255,0.08)' },
                { label:'Taxa Operadora', val:`-${fmt(simRes.vTaxa)}`, c:'var(--danger)', bg:'rgba(255,71,87,0.08)' },
                { label:'Taxa %',         val:`${simRes.taxaPct}%`, c:'var(--warn)', bg:'rgba(255,184,0,0.08)' },
                { label:'Valor Líquido',  val:fmt(simRes.vLiq),  c:'var(--success)', bg:'rgba(0,212,160,0.08)' },
              ].map((c,i)=>(
                <div key={i} style={{background:c.bg,borderRadius:8,padding:14,textAlign:'center'}}>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:6}}>{c.label}</div>
                  <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:800,color:c.c}}>{c.val}</div>
                </div>
              ))}
              <div style={{gridColumn:'1/-1',fontSize:12,color:'var(--text3)'}}>
                Prazo para recebimento: <strong style={{color:'var(--accent)'}}>{simRes.prazo} dia(s)</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de operadoras */}
      <div className="card">
        <div className="card-header"><span className="card-title">Operadoras Cadastradas</span></div>
        {loading ? <div className="empty">Carregando...</div> :
         operadoras.length === 0 ? (
          <div className="empty">
            <div style={{fontSize:32,marginBottom:8}}>💳</div>
            <div>Nenhuma operadora cadastrada.</div>
            <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>setEditando(novaOp)}>+ Cadastrar</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Operadora</th>
                  <th>Débito</th>
                  <th>Prazo Débito</th>
                  <th>Crédito Vista</th>
                  <th>Prazo Crédito</th>
                  <th>Crédito Parc.</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {operadoras.map(op=>(
                  <tr key={op.id}>
                    <td className="primary">{op.nome}</td>
                    <td><span className="badge badge-info">{op.taxa_debito_pct}%</span></td>
                    <td style={{fontSize:12,color:'var(--text3)'}}>{op.prazo_debito_dias}d</td>
                    <td><span className="badge badge-warn">{op.taxa_credito_vista_pct}%</span></td>
                    <td style={{fontSize:12,color:'var(--text3)'}}>{op.prazo_credito_vista_dias}d</td>
                    <td><span className="badge badge-danger">{op.taxa_credito_parc_pct}%</span></td>
                    <td>
                      <button className="btn btn-ghost btn-icon" onClick={()=>setEditando({...op})}>✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal edição */}
      {editando && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&setEditando(null)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:500}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:18,fontWeight:800,marginBottom:20}}>
              {editando.id ? 'Editar' : 'Nova'} Operadora
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Nome da Operadora</label>
                <input className="inp" placeholder="Stone, Cielo, Rede..." value={editando.nome}
                  onChange={e=>setEditando(o=>({...o,nome:e.target.value}))} />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[
                  { label:'Taxa Débito (%)',         key:'taxa_debito_pct' },
                  { label:'Prazo Débito (dias)',      key:'prazo_debito_dias' },
                  { label:'Taxa Crédito Vista (%)',   key:'taxa_credito_vista_pct' },
                  { label:'Prazo Crédito Vista (d)',  key:'prazo_credito_vista_dias' },
                  { label:'Taxa Crédito Parc. (%)',   key:'taxa_credito_parc_pct' },
                  { label:'Prazo Crédito Parc. (d)',  key:'prazo_credito_parc_dias' },
                ].map(f=>(
                  <div key={f.key}>
                    <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>{f.label}</label>
                    <input className="inp" type="number" step="0.01" min="0" value={editando[f.key]}
                      onChange={e=>setEditando(o=>({...o,[f.key]:e.target.value}))} />
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button style={{flex:1,padding:10,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}} onClick={()=>setEditando(null)}>Cancelar</button>
                <button style={{flex:2,padding:10,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700}} onClick={()=>salvar(editando)} disabled={salvando}>
                  {salvando?'⏳':'✅ Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
