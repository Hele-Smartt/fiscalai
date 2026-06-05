// src/pages/TelaInicial.jsx
// Tela inicial do HElevare.Financeiro
// Seleção do cliente ativo — todos os dados do sistema são deste cliente

import { useState } from 'react'
import { useCliente } from '../lib/ClienteContext'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const CSS = `
  .inicio-bg {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,212,160,0.12), transparent),
                radial-gradient(ellipse 50% 40% at 80% 80%, rgba(0,144,255,0.08), transparent), #080C14;
    padding: 24px;
  }
  .inicio-logo { display:flex; align-items:center; gap:12px; margin-bottom:40px; cursor:pointer; }
  .inicio-logo-icon { width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg,#00D4A0,#0090FF); display:flex; align-items:center; justify-content:center; font-size:26px; box-shadow:0 0 32px rgba(0,212,160,0.3); }
  .inicio-logo-text { font-family:var(--font-head); font-size:26px; font-weight:800; color:var(--text); }
  .inicio-logo-text span { color:var(--accent); }
  .inicio-logo-sub { font-size:12px; color:var(--text3); margin-top:2px; }

  .inicio-card { width:100%; max-width:580px; background:var(--card); border:1px solid var(--border); border-radius:24px; padding:36px; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
  .inicio-title { font-family:var(--font-head); font-size:20px; font-weight:800; color:var(--text); margin-bottom:4px; }
  .inicio-sub { font-size:13px; color:var(--text3); margin-bottom:28px; }

  .busca-wrap { position:relative; margin-bottom:10px; }
  .busca-inp { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); padding:12px 16px 12px 44px; color:var(--text); font-size:14px; outline:none; transition:var(--transition); }
  .busca-inp:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(0,212,160,0.1); }
  .busca-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:17px; pointer-events:none; }

  .dropdown { background:var(--bg3); border:1px solid var(--border2); border-radius:var(--radius); overflow:hidden; max-height:260px; overflow-y:auto; margin-bottom:14px; box-shadow:var(--shadow2); }
  .drop-item { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; transition:var(--transition); border-bottom:1px solid var(--border); }
  .drop-item:last-child { border-bottom:none; }
  .drop-item:hover, .drop-item.ativo { background:rgba(0,212,160,0.08); }
  .drop-avatar { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#fff; flex-shrink:0; }
  .drop-nome { font-size:13px; font-weight:600; color:var(--text); }
  .drop-sub  { font-size:11px; color:var(--text3); margin-top:1px; }
  .drop-empty { padding:28px; text-align:center; color:var(--text3); font-size:13px; }

  .sel-box { background:rgba(0,212,160,0.08); border:1px solid rgba(0,212,160,0.25); border-radius:var(--radius); padding:14px 16px; margin-bottom:14px; display:flex; align-items:center; gap:12px; }
  .sel-avatar { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:var(--bg); flex-shrink:0; }
  .sel-nome { font-size:15px; font-weight:700; color:var(--text); }
  .sel-sub  { font-size:11px; color:var(--text3); margin-top:2px; }

  .btn-entrar { width:100%; padding:14px; border-radius:var(--radius); background:linear-gradient(135deg,#00D4A0,#0090FF); color:var(--bg); font-family:var(--font-head); font-size:15px; font-weight:700; border:none; cursor:pointer; transition:var(--transition); margin-bottom:12px; }
  .btn-entrar:hover { opacity:.9; transform:translateY(-1px); box-shadow:0 8px 24px rgba(0,212,160,0.3); }
  .btn-entrar:disabled { opacity:.4; cursor:not-allowed; transform:none; }
  .btn-novo { width:100%; padding:12px; border-radius:var(--radius); background:transparent; color:var(--accent); border:2px dashed rgba(0,212,160,0.3); font-size:14px; font-weight:600; cursor:pointer; transition:var(--transition); display:flex; align-items:center; justify-content:center; gap:8px; }
  .btn-novo:hover { border-color:var(--accent); background:rgba(0,212,160,0.06); }
  .divider { display:flex; align-items:center; gap:12px; margin:14px 0; }
  .divider-line { flex:1; height:1px; background:var(--border); }
  .divider-txt { font-size:11px; color:var(--text3); }

  .stats-row { display:flex; gap:10px; margin-top:20px; }
  .stat-item { flex:1; background:var(--bg3); border-radius:var(--radius); padding:12px; text-align:center; }
  .stat-val  { font-family:var(--font-head); font-size:20px; font-weight:800; color:var(--accent); }
  .stat-lbl  { font-size:10px; color:var(--text3); margin-top:2px; }

  /* Modal */
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
  .modal { background:var(--card); border:1px solid var(--border); border-radius:20px; padding:32px; width:100%; max-width:540px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.6); }
  .modal-title { font-family:var(--font-head); font-size:18px; font-weight:800; margin-bottom:20px; }
  .campo { margin-bottom:13px; }
  .campo label { display:block; font-size:12px; font-weight:600; color:var(--text2); margin-bottom:5px; }
  .campo input, .campo select, .campo textarea { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); padding:9px 12px; color:var(--text); font-size:13px; outline:none; transition:var(--transition); font-family:var(--font-body); }
  .campo input:focus, .campo select:focus, .campo textarea:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(0,212,160,0.1); }
  .campo-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .campo-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  .secao-label { font-size:11px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:.08em; margin:16px 0 10px; border-bottom:1px solid var(--border); padding-bottom:6px; }
`

const CORES = ['#0090FF','#00D4A0','#A855F7','#FF6B35','#FFB800','#FF4757','#00BCD4','#8BC34A']
const cor   = (nome) => CORES[(nome?.charCodeAt(0)||0) % CORES.length]
const ini   = (nome) => (nome||'?').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()

export default function TelaInicial({ onEntrar }) {
  const { empresa } = useAuth()
  const { clientes, clienteAtivo, selecionarCliente, carregarClientes } = useCliente()
  const [busca,      setBusca]      = useState('')
  const [selecionado, setSelecionado] = useState(clienteAtivo)
  const [showModal,  setShowModal]  = useState(false)
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')
  const [form, setForm] = useState({
    nome:'', razao_social:'', cnpj:'', segmento:'geral',
    responsavel:'', email:'', telefone:'',
    cidade:'', estado:'', regime:'Simples Nacional', observacao:'',
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const filtrados = clientes.filter(c =>
    !busca ||
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj?.includes(busca) ||
    c.responsavel?.toLowerCase().includes(busca.toLowerCase())
  )

  async function salvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro('')
    const { data, error } = await supabase
      .from('clientes_helevare')
      .insert({ ...form, empresa_id: empresa.id })
      .select().single()
    if (error) { setErro(error.message); setSalvando(false); return }

    // Inicializa dados padrão (formas de pagamento + plano de contas)
    await supabase.rpc('inicializar_cliente_helevare', {
      p_empresa_id: empresa.id,
      p_cliente_id: data.id,
      p_segmento:   form.segmento,
    })

    await carregarClientes()
    setSelecionado(data)
    setShowModal(false)
    setSalvando(false)
    setForm({ nome:'', razao_social:'', cnpj:'', segmento:'geral', responsavel:'', email:'', telefone:'', cidade:'', estado:'', regime:'Simples Nacional', observacao:'' })
  }

  function entrar() {
    if (!selecionado) return
    selecionarCliente(selecionado)
    onEntrar?.()
  }

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

  return (
    <>
      <style>{CSS}</style>
      <div className="inicio-bg">
        <div className="inicio-logo">
          <div className="inicio-logo-icon">⚡</div>
          <div>
            <div className="inicio-logo-text">HElevare<span>.Financeiro</span></div>
            <div className="inicio-logo-sub">Plataforma de Gestão Financeira</div>
          </div>
        </div>

        <div className="inicio-card">
          <div className="inicio-title">Selecione o Cliente</div>
          <div className="inicio-sub">Todos os dados do sistema serão do cliente selecionado.</div>

          {/* Cliente selecionado */}
          {selecionado && (
            <div className="sel-box">
              <div className="sel-avatar" style={{background: cor(selecionado.nome)}}>{ini(selecionado.nome)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="sel-nome">{selecionado.nome}</div>
                <div className="sel-sub">
                  {selecionado.segmento === 'saude' ? '🏥 Área da Saúde' : '🏢 Empresa Geral'}
                  {selecionado.cnpj ? ` · ${selecionado.cnpj}` : ''}
                  {selecionado.cidade ? ` · ${selecionado.cidade}/${selecionado.estado}` : ''}
                </div>
              </div>
              <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:18,flexShrink:0}} onClick={()=>setSelecionado(null)}>✕</button>
            </div>
          )}

          {/* Busca */}
          <div className="busca-wrap">
            <span className="busca-icon">🔍</span>
            <input className="busca-inp" placeholder="Buscar por nome, CNPJ ou responsável..."
              value={busca} onChange={e=>{setBusca(e.target.value); setSelecionado(null)}} />
          </div>

          {/* Dropdown */}
          {(busca || !selecionado) && (
            <div className="dropdown">
              {filtrados.length === 0 ? (
                <div className="drop-empty">
                  {busca ? `Nenhum resultado para "${busca}"` : 'Nenhum cliente cadastrado ainda.'}
                </div>
              ) : filtrados.map(c => (
                <div key={c.id} className={`drop-item ${selecionado?.id===c.id?'ativo':''}`}
                  onClick={()=>{setSelecionado(c); setBusca('')}}>
                  <div className="drop-avatar" style={{background:cor(c.nome)}}>{ini(c.nome)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="drop-nome">{c.nome}</div>
                    <div className="drop-sub">
                      {c.segmento==='saude'?'🏥 Saúde':'🏢 Geral'}
                      {c.cnpj?` · ${c.cnpj}`:''}
                      {c.responsavel?` · ${c.responsavel}`:''}
                    </div>
                  </div>
                  {selecionado?.id===c.id && <span style={{color:'var(--accent)',flexShrink:0}}>✓</span>}
                </div>
              ))}
            </div>
          )}

          {/* Select lista completa */}
          {!busca && (
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:'var(--text2)',fontWeight:500,marginBottom:5,display:'block'}}>Ou escolha da lista:</label>
              <select style={{width:'100%',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 12px',color:'var(--text)',fontSize:13,outline:'none',cursor:'pointer'}}
                value={selecionado?.id||''}
                onChange={e=>{const c=clientes.find(x=>x.id===e.target.value); setSelecionado(c||null)}}>
                <option value="">— Selecione um cliente —</option>
                {clientes.map(c=>(
                  <option key={c.id} value={c.id}>{c.nome}{c.cnpj?` — ${c.cnpj}`:''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Botão entrar */}
          <button className="btn-entrar" onClick={entrar} disabled={!selecionado}>
            {selecionado ? `→ Acessar ${selecionado.nome}` : 'Selecione um cliente para continuar'}
          </button>

          <div className="divider"><div className="divider-line"/><span className="divider-txt">ou</span><div className="divider-line"/></div>

          <button className="btn-novo" onClick={()=>setShowModal(true)}>
            <span style={{fontSize:18}}>+</span> Cadastrar Novo Cliente
          </button>

          {clientes.length > 0 && (
            <div className="stats-row">
              {[
                { v: clientes.length,                              l:'Total Clientes'  },
                { v: clientes.filter(c=>c.segmento==='saude').length, l:'Área da Saúde' },
                { v: clientes.filter(c=>c.segmento==='geral').length,  l:'Emp. Gerais'  },
              ].map((s,i)=>(
                <div key={i} className="stat-item">
                  <div className="stat-val">{s.v}</div>
                  <div className="stat-lbl">{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal cadastro cliente */}
      {showModal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">➕ Novo Cliente HElevare</div>

            {erro && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--danger)',marginBottom:14}}>⚠️ {erro}</div>}

            <div className="secao-label">Identificação</div>
            <div className="campo">
              <label>Segmento *</label>
              <select value={form.segmento} onChange={e=>set('segmento',e.target.value)}>
                <option value="geral">🏢 Empresas Gerais</option>
                <option value="saude">🏥 Área da Saúde (Clínicas, Consultórios)</option>
              </select>
            </div>
            <div className="campo-grid-2">
              <div className="campo">
                <label>Nome Fantasia / Empresa *</label>
                <input placeholder="Ex: Clínica ABC" value={form.nome} onChange={e=>set('nome',e.target.value)} />
              </div>
              <div className="campo">
                <label>Razão Social</label>
                <input placeholder="ABC Serviços Ltda." value={form.razao_social} onChange={e=>set('razao_social',e.target.value)} />
              </div>
            </div>
            <div className="campo-grid-2">
              <div className="campo">
                <label>CNPJ</label>
                <input placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e=>set('cnpj',e.target.value)} />
              </div>
              <div className="campo">
                <label>Regime Tributário</label>
                <select value={form.regime} onChange={e=>set('regime',e.target.value)}>
                  <option>Simples Nacional</option>
                  <option>Lucro Presumido</option>
                  <option>Lucro Real</option>
                  <option>MEI</option>
                </select>
              </div>
            </div>

            <div className="secao-label">Contato</div>
            <div className="campo">
              <label>Responsável / Contato</label>
              <input placeholder="Nome do responsável financeiro" value={form.responsavel} onChange={e=>set('responsavel',e.target.value)} />
            </div>
            <div className="campo-grid-2">
              <div className="campo">
                <label>E-mail</label>
                <input type="email" placeholder="financeiro@empresa.com" value={form.email} onChange={e=>set('email',e.target.value)} />
              </div>
              <div className="campo">
                <label>Telefone / WhatsApp</label>
                <input placeholder="(17) 99999-9999" value={form.telefone} onChange={e=>set('telefone',e.target.value)} />
              </div>
            </div>
            <div className="campo-grid-3">
              <div className="campo" style={{gridColumn:'1/3'}}>
                <label>Cidade</label>
                <input placeholder="Votuporanga" value={form.cidade} onChange={e=>set('cidade',e.target.value)} />
              </div>
              <div className="campo">
                <label>UF</label>
                <select value={form.estado} onChange={e=>set('estado',e.target.value)}>
                  <option value="">—</option>
                  {estados.map(uf=><option key={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
            <div className="campo">
              <label>Observação</label>
              <textarea rows={2} placeholder="Notas internas..." value={form.observacao} onChange={e=>set('observacao',e.target.value)} />
            </div>

            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button style={{flex:1,padding:11,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer',fontSize:13}}
                onClick={()=>setShowModal(false)}>Cancelar</button>
              <button style={{flex:2,padding:11,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700,fontSize:13}}
                onClick={salvar} disabled={salvando}>
                {salvando?'⏳ Salvando...':'✅ Cadastrar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
