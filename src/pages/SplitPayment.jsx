// src/pages/SplitPayment.jsx
// Módulo 8-9: Reforma Tributária + Split Payment + Calculadora IBS/CBS

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useCliente } from '../lib/ClienteContext'
import { supabase } from '../lib/supabase'

const CSS = `
  .split-page { max-width: 960px; margin: 0 auto; }
  .calc-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius2); padding: 28px; margin-bottom: 16px; }
  .calc-title { font-family: var(--font-head); font-weight: 700; font-size: 15px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
  .split-result-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin: 20px 0; }
  .split-card { border-radius: var(--radius); padding: 18px; text-align: center; border: 1px solid; }
  .split-card-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
  .split-card-value { font-family: var(--font-head); font-size: 22px; font-weight: 800; }
  .split-card-sub { font-size: 11px; margin-top: 4px; opacity: .7; }
  .taxa-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .taxa-row:last-child { border-bottom: none; }
  .taxa-label { flex: 1; font-size: 13px; color: var(--text2); }
  .taxa-inp { width: 80px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 10px; color: var(--text); font-size: 13px; outline: none; text-align: right; }
  .taxa-inp:focus { border-color: var(--accent); }
  .taxa-unit { font-size: 12px; color: var(--text3); width: 20px; }
  .comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .comp-col { background: var(--bg3); border-radius: var(--radius); padding: 20px; }
  .comp-col-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 14px; }
  .comp-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .comp-row:last-child { border-bottom: none; }
  .comp-total { font-weight: 800; font-family: var(--font-head); font-size: 16px; }
  .alerta-reforma { background: rgba(255,184,0,0.08); border: 1px solid rgba(255,184,0,0.3); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 16px; }
`

const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)
const pct = n => `${Number(n||0).toFixed(2)}%`

export default function SplitPaymentPage({ empresaId }) {
  const { empresa } = useAuth()
  const { clienteAtivo, clienteId } = useCliente()
  const [config, setConfig] = useState({
    regime: 'Simples Nacional', aliq_simples: 6, aliq_presumido: 3,
    aliq_ibs: 17.7, aliq_cbs: 8.8, aliq_is: 0, split_payment_ativo: false,
  })
  const [venda, setVenda] = useState({ valor: '', taxa_op: 2.5 })
  const [resultado, setResultado] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { if (clienteId) carregarConfig() }, [clienteId])

  async function carregarConfig() {
    const { data } = await supabase.from('config_tributaria')
      .select('*').eq('cliente_helevare_id', clienteId).single()
    if (data) setConfig(data)
  }

  async function salvarConfig() {
    setSalvando(true)
    await supabase.from('config_tributaria').upsert({
      ...config, empresa_id: empresa.id, cliente_helevare_id: clienteId
    })
    setSalvando(false)
  }

  function calcular() {
    const vb = parseFloat(venda.valor) || 0
    const taxaOp = parseFloat(venda.taxa_op) || 0
    const ibs = parseFloat(config.aliq_ibs) || 0
    const cbs = parseFloat(config.aliq_cbs) || 0
    const is  = parseFloat(config.aliq_is)  || 0

    const vTaxaOp = vb * (taxaOp / 100)
    const vIbs    = vb * (ibs / 100)
    const vCbs    = vb * (cbs / 100)
    const vIs     = vb * (is  / 100)
    const vLiq    = vb - vTaxaOp - vIbs - vCbs - vIs

    // Regime atual
    const aliqAtual = config.regime === 'Simples Nacional' ? parseFloat(config.aliq_simples||6)
                    : config.regime === 'Lucro Presumido'  ? parseFloat(config.aliq_presumido||3) : 9
    const vImpostoAtual = vb * (aliqAtual / 100)
    const vLiqAtual = vb - vTaxaOp - vImpostoAtual

    setResultado({ vb, vTaxaOp, vIbs, vCbs, vIs, vLiq, vImpostoAtual, vLiqAtual, aliqAtual, ibs, cbs, is, taxaOp })
  }

  const aliqReforma = (parseFloat(config.aliq_ibs)||0) + (parseFloat(config.aliq_cbs)||0) + (parseFloat(config.aliq_is)||0)
  const diffPct = resultado ? ((resultado.vLiq - resultado.vLiqAtual) / resultado.vLiqAtual * 100) : 0

  return (
    <>
      <style>{CSS}</style>
      <div className="split-page fade-up">
        <div className="section-header mb-20">
          <div>
            <div className="section-title">Reforma Tributária & Split Payment</div>
            <div className="section-sub">Módulos 8-9 — IBS, CBS, Imposto Seletivo e Split Payment automático</div>
          </div>
          <button className="btn btn-primary" onClick={salvarConfig} disabled={salvando}>
            {salvando ? '⏳' : '💾 Salvar Configuração'}
          </button>
        </div>

        <div className="alerta-reforma">
          <div style={{fontWeight:700,color:'var(--warn)',marginBottom:4}}>⚠️ Reforma Tributária — Vigência a partir de 2026</div>
          <div style={{fontSize:12,color:'var(--text2)'}}>
            IBS (Imposto sobre Bens e Serviços) + CBS (Contribuição sobre Bens e Serviços) substituem PIS, COFINS, ICMS e ISS.
            O Split Payment retém automaticamente os tributos na origem do pagamento.
          </div>
        </div>

        <div className="grid-2 mb-16">
          {/* Configuração tributária */}
          <div className="calc-card">
            <div className="calc-title">⚙️ Configuração Tributária</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:5}}>Regime Atual</label>
                <select className="inp" value={config.regime} onChange={e=>setConfig(c=>({...c,regime:e.target.value}))}>
                  <option>Simples Nacional</option>
                  <option>Lucro Presumido</option>
                  <option>Lucro Real</option>
                  <option>MEI</option>
                </select>
              </div>
              {config.regime==='Simples Nacional' && (
                <div>
                  <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:5}}>Alíquota Simples (%)</label>
                  <input className="inp" type="number" step="0.01" value={config.aliq_simples}
                    onChange={e=>setConfig(c=>({...c,aliq_simples:e.target.value}))} />
                </div>
              )}
              {config.regime==='Lucro Presumido' && (
                <div>
                  <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:5}}>Alíquota Efetiva (%)</label>
                  <input className="inp" type="number" step="0.01" value={config.aliq_presumido}
                    onChange={e=>setConfig(c=>({...c,aliq_presumido:e.target.value}))} />
                </div>
              )}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
                <div style={{fontSize:12,color:'var(--accent)',fontWeight:700,marginBottom:10}}>🆕 Reforma Tributária</div>
                {[
                  { label:'Alíquota IBS (%)', key:'aliq_ibs', hint:'Imposto sobre Bens e Serviços' },
                  { label:'Alíquota CBS (%)', key:'aliq_cbs', hint:'Contribuição sobre Bens e Serviços' },
                  { label:'Imposto Seletivo (%)', key:'aliq_is', hint:'Para produtos específicos' },
                ].map(f=>(
                  <div key={f.key} className="taxa-row">
                    <div className="taxa-label">
                      {f.label}
                      <div style={{fontSize:10,color:'var(--text3)'}}>{f.hint}</div>
                    </div>
                    <input className="taxa-inp" type="number" step="0.1" min="0"
                      value={config[f.key]} onChange={e=>setConfig(c=>({...c,[f.key]:e.target.value}))} />
                    <span className="taxa-unit">%</span>
                  </div>
                ))}
                <div style={{marginTop:10,padding:'8px 12px',background:'rgba(0,212,160,0.06)',borderRadius:8,fontSize:12}}>
                  <span style={{color:'var(--text2)'}}>Total Reforma: </span>
                  <strong style={{color:'var(--accent)'}}>{pct(aliqReforma)}</strong>
                </div>
              </div>
              <div className="flex items-center gap-12">
                <span style={{fontSize:13,color:'var(--text2)'}}>Split Payment Ativo</span>
                <label className="toggle">
                  <input type="checkbox" checked={config.split_payment_ativo}
                    onChange={e=>setConfig(c=>({...c,split_payment_ativo:e.target.checked}))} />
                  <div className="toggle-track"/><div className="toggle-thumb"/>
                </label>
              </div>
            </div>
          </div>

          {/* Calculadora */}
          <div className="calc-card">
            <div className="calc-title">🧮 Simulador Split Payment</div>
            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:5}}>Valor da Venda (R$)</label>
                <input className="inp" type="number" step="0.01" placeholder="1000.00"
                  value={venda.valor} onChange={e=>setVenda(v=>({...v,valor:e.target.value}))} />
              </div>
              <div>
                <label style={{fontSize:12,color:'var(--text2)',fontWeight:600,display:'block',marginBottom:5}}>Taxa Operadora (%)</label>
                <input className="inp" type="number" step="0.01" value={venda.taxa_op}
                  onChange={e=>setVenda(v=>({...v,taxa_op:e.target.value}))} />
              </div>
              <button className="btn btn-primary" onClick={calcular}>⚡ Calcular</button>
            </div>

            {resultado && (
              <div>
                <div className="split-result-grid">
                  {[
                    { label:'Valor Bruto',      val:fmt(resultado.vb),      color:'var(--accent2)',  bg:'rgba(0,144,255,0.08)',   bc:'rgba(0,144,255,0.3)',   sub:'100%' },
                    { label:'Taxa Operadora',   val:fmt(resultado.vTaxaOp), color:'var(--warn)',     bg:'rgba(255,184,0,0.08)',   bc:'rgba(255,184,0,0.3)',   sub:`${pct(resultado.taxaOp)}` },
                    { label:'Split IBS+CBS',    val:fmt(resultado.vIbs+resultado.vCbs+resultado.vIs), color:'var(--danger)', bg:'rgba(255,71,87,0.08)', bc:'rgba(255,71,87,0.3)', sub:`${pct(aliqReforma)}` },
                    { label:'Valor Líquido',    val:fmt(resultado.vLiq),    color:'var(--success)',  bg:'rgba(0,212,160,0.08)',   bc:'rgba(0,212,160,0.3)',   sub:'Depositado' },
                  ].map((c,i)=>(
                    <div key={i} className="split-card" style={{background:c.bg,borderColor:c.bc}}>
                      <div className="split-card-label" style={{color:c.color}}>{c.label}</div>
                      <div className="split-card-value" style={{color:c.color}}>{c.val}</div>
                      <div className="split-card-sub" style={{color:c.color}}>{c.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Comparativo regime atual vs reforma */}
                <div className="comp-grid" style={{marginTop:16}}>
                  <div className="comp-col">
                    <div className="comp-col-title" style={{color:'var(--accent2)'}}>📊 Sistema Atual ({config.regime})</div>
                    <div className="comp-row"><span>Valor Bruto</span><span>{fmt(resultado.vb)}</span></div>
                    <div className="comp-row"><span>(-) Taxa Operadora</span><span style={{color:'var(--danger)'}}>-{fmt(resultado.vTaxaOp)}</span></div>
                    <div className="comp-row"><span>(-) Imposto ({pct(resultado.aliqAtual)})</span><span style={{color:'var(--danger)'}}>-{fmt(resultado.vImpostoAtual)}</span></div>
                    <div className="comp-row"><span className="comp-total">Líquido</span><span className="comp-total" style={{color:'var(--accent2)'}}>{fmt(resultado.vLiqAtual)}</span></div>
                  </div>
                  <div className="comp-col">
                    <div className="comp-col-title" style={{color:'var(--accent4)'}}>🆕 Com Split Payment (Reforma)</div>
                    <div className="comp-row"><span>Valor Bruto</span><span>{fmt(resultado.vb)}</span></div>
                    <div className="comp-row"><span>(-) Taxa Operadora</span><span style={{color:'var(--danger)'}}>-{fmt(resultado.vTaxaOp)}</span></div>
                    <div className="comp-row"><span>(-) IBS ({pct(resultado.ibs)})</span><span style={{color:'var(--danger)'}}>-{fmt(resultado.vIbs)}</span></div>
                    <div className="comp-row"><span>(-) CBS ({pct(resultado.cbs)})</span><span style={{color:'var(--danger)'}}>-{fmt(resultado.vCbs)}</span></div>
                    {resultado.vIs>0 && <div className="comp-row"><span>(-) IS ({pct(resultado.is)})</span><span style={{color:'var(--danger)'}}>-{fmt(resultado.vIs)}</span></div>}
                    <div className="comp-row"><span className="comp-total">Líquido</span><span className="comp-total" style={{color:'var(--accent4)'}}>{fmt(resultado.vLiq)}</span></div>
                  </div>
                </div>

                <div style={{marginTop:12,padding:'12px 16px',borderRadius:8,background: diffPct>=0?'rgba(0,212,160,0.08)':'rgba(255,71,87,0.08)',border:`1px solid ${diffPct>=0?'rgba(0,212,160,0.2)':'rgba(255,71,87,0.2)'}`}}>
                  <span style={{fontSize:13,fontWeight:700,color:diffPct>=0?'var(--success)':'var(--danger)'}}>
                    {diffPct>=0?'▲':'▼'} Diferença: {fmt(Math.abs(resultado.vLiq-resultado.vLiqAtual))} ({Math.abs(diffPct).toFixed(1)}% {diffPct>=0?'a mais':'a menos'} com a Reforma)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
