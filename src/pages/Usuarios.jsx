// src/pages/Usuarios.jsx
// Gestão de usuários multi-tenant — convite por e-mail e link
// Papéis: admin, contador, gerente, viewer

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const CSS = `
  .usr-page { max-width: 900px; margin: 0 auto; }

  .papel-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
  }
  .papel-admin    { background: rgba(0,212,160,0.12);  color: #00D4A0; }
  .papel-contador { background: rgba(0,144,255,0.12);  color: #0090FF; }
  .papel-gerente  { background: rgba(168,85,247,0.12); color: #A855F7; }
  .papel-viewer   { background: rgba(255,184,0,0.12);  color: #FFB800; }

  .perm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .perm-item { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 6px 0; }
  .perm-ok  { color: var(--success); }
  .perm-no  { color: var(--text3); text-decoration: line-through; }

  .invite-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 24px; margin-bottom: 16px;
  }
  .invite-tabs { display: flex; gap: 2px; background: var(--bg3); padding: 4px; border-radius: var(--radius); margin-bottom: 20px; }
  .invite-tab { flex: 1; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 500; color: var(--text3); cursor: pointer; transition: var(--transition); text-align: center; }
  .invite-tab.active { background: var(--card); color: var(--text); box-shadow: var(--shadow); }

  .link-box {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 12px 14px;
    font-family: monospace; font-size: 12px; color: var(--text2);
    word-break: break-all; margin: 12px 0;
  }
  .usr-avatar {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #fff;
  }
  .usr-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .usr-row:last-child { border-bottom: none; }

  .roles-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
  .role-card {
    background: var(--card); border: 2px solid var(--border);
    border-radius: var(--radius); padding: 16px; cursor: pointer;
    transition: var(--transition); text-align: center;
  }
  .role-card:hover { border-color: var(--border2); }
  .role-card.selected { border-color: var(--accent); background: rgba(0,212,160,0.04); }
  .role-icon { font-size: 28px; margin-bottom: 8px; }
  .role-name { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .role-desc { font-size: 11px; color: var(--text3); line-height: 1.4; }

  .inp { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; color: var(--text); font-family: var(--font-body); font-size: 13px; outline: none; transition: var(--transition); width: 100%; }
  .inp:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,160,0.1); }
  .inp-label { font-size: 12px; font-weight: 600; color: var(--text2); margin-bottom: 6px; display: block; }
  .field { margin-bottom: 14px; }
`

const PAPEIS = {
  admin: {
    icon: '👑', label: 'Admin', cor: 'admin',
    desc: 'Acesso total — gerencia usuários, dados e configurações',
    perms: {
      'Dashboard': true, 'Financeiro': true, 'Lançamentos': true,
      'Contas': true, 'Clientes/Fornec.': true, 'NF-e': true,
      'Tributário': true, 'IA': true, 'Relatórios': true,
      'Usuários': true, 'Configurações': true, 'Excluir dados': true,
    }
  },
  contador: {
    icon: '📊', label: 'Contador', cor: 'contador',
    desc: 'Financeiro completo + relatórios — sem acesso a usuários',
    perms: {
      'Dashboard': true, 'Financeiro': true, 'Lançamentos': true,
      'Contas': true, 'Clientes/Fornec.': true, 'NF-e': true,
      'Tributário': true, 'IA': true, 'Relatórios': true,
      'Usuários': false, 'Configurações': false, 'Excluir dados': false,
    }
  },
  gerente: {
    icon: '👤', label: 'Gerente', cor: 'gerente',
    desc: 'Visualiza tudo mas não pode editar ou excluir dados',
    perms: {
      'Dashboard': true, 'Financeiro': true, 'Lançamentos': false,
      'Contas': false, 'Clientes/Fornec.': true, 'NF-e': false,
      'Tributário': true, 'IA': true, 'Relatórios': true,
      'Usuários': false, 'Configurações': false, 'Excluir dados': false,
    }
  },
  viewer: {
    icon: '👁️', label: 'Viewer', cor: 'viewer',
    desc: 'Apenas visualiza o dashboard e relatórios',
    perms: {
      'Dashboard': true, 'Financeiro': false, 'Lançamentos': false,
      'Contas': false, 'Clientes/Fornec.': false, 'NF-e': false,
      'Tributário': false, 'IA': false, 'Relatórios': true,
      'Usuários': false, 'Configurações': false, 'Excluir dados': false,
    }
  },
}

const AVATAR_COLORS = ['#0090FF','#00D4A0','#A855F7','#FF6B35','#FFB800','#FF4757']

export default function Usuarios() {
  const { user, perfil, empresa } = useAuth()
  const [usuarios,    setUsuarios]    = useState([])
  const [convites,    setConvites]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [abaConvite,  setAbaConvite]  = useState('email') // 'email' | 'link'
  const [papelSel,    setPapelSel]    = useState('contador')
  const [linkGerado,  setLinkGerado]  = useState('')
  const [copiado,     setCopiado]     = useState(false)
  const [sucesso,     setSucesso]     = useState('')
  const [erro,        setErro]        = useState('')
  const [salvando,    setSalvando]    = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [nomeConvite,  setNomeConvite]  = useState('')

  const isAdmin = perfil?.papel === 'admin'

  useEffect(() => {
    if (empresa?.id) carregarUsuarios()
  }, [empresa?.id])

  async function carregarUsuarios() {
    setLoading(true)
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('criado_em')
    setUsuarios(data || [])

    // Carrega convites pendentes
    const { data: conv } = await supabase
      .from('convites')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('usado', false)
      .order('criado_em', { ascending: false })
    setConvites(conv || [])

    setLoading(false)
  }

  async function convidarPorEmail() {
    if (!emailConvite || !nomeConvite) { setErro('Preencha nome e e-mail.'); return }
    setSalvando(true); setErro(''); setSucesso('')
    try {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('convites').insert({
        empresa_id: empresa.id,
        email:      emailConvite.toLowerCase(),
        nome:       nomeConvite,
        papel:      papelSel,
        token,
        usado:      false,
        criado_por: user.id,
        expira_em:  new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      })
      if (error) throw new Error(error.message)

      const link = `${window.location.origin}/?convite=${token}`
      setSucesso(`Convite criado! Envie este link para ${emailConvite}:\n${link}`)
      setEmailConvite(''); setNomeConvite('')
      carregarUsuarios()
    } catch(e) {
      setErro(e.message)
    }
    setSalvando(false)
  }

  async function gerarLink() {
    setSalvando(true); setErro('')
    try {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('convites').insert({
        empresa_id: empresa.id,
        email:      null,
        nome:       null,
        papel:      papelSel,
        token,
        usado:      false,
        criado_por: user.id,
        expira_em:  new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      })
      if (error) throw new Error(error.message)
      const link = `${window.location.origin}/?convite=${token}`
      setLinkGerado(link)
      carregarUsuarios()
    } catch(e) {
      setErro(e.message)
    }
    setSalvando(false)
  }

  async function copiarLink(link) {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function alterarPapel(userId, novoPapel) {
    if (userId === user.id) { setErro('Você não pode alterar seu próprio papel.'); return }
    await supabase.from('perfis').update({ papel: novoPapel }).eq('id', userId)
    carregarUsuarios()
  }

  async function removerUsuario(userId) {
    if (userId === user.id) { setErro('Você não pode remover a si mesmo.'); return }
    if (!confirm('Remover este usuário da empresa?')) return
    await supabase.from('perfis').update({ ativo: false }).eq('id', userId)
    carregarUsuarios()
  }

  async function revogarConvite(id) {
    await supabase.from('convites').update({ usado: true }).eq('id', id)
    carregarUsuarios()
  }

  const avatarColor = (nome) => AVATAR_COLORS[(nome?.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  const iniciais = (nome) => (nome || '?').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()

  return (
    <>
      <style>{CSS}</style>
      <div className="usr-page fade-up">
        <div className="section-header mb-20">
          <div>
            <div className="section-title">Usuários & Permissões</div>
            <div className="section-sub">Gerencie quem tem acesso à empresa {empresa?.nome}</div>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-ghost" onClick={carregarUsuarios}>🔄 Atualizar</button>
          </div>
        </div>

        {erro    && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'var(--danger)',marginBottom:16}}>⚠️ {erro}</div>}
        {sucesso && (
          <div style={{background:'rgba(0,212,160,0.08)',border:'1px solid rgba(0,212,160,0.2)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'var(--success)',marginBottom:16,whiteSpace:'pre-wrap'}}>
            ✅ {sucesso}
          </div>
        )}

        {/* Métricas */}
        <div className="metrics-grid mb-20">
          {[
            { label:'Usuários Ativos',    val: usuarios.filter(u=>u.ativo!==false).length, c:'var(--accent2)' },
            { label:'Admins',             val: usuarios.filter(u=>u.papel==='admin').length, c:'var(--success)' },
            { label:'Convites Pendentes', val: convites.length, c:'var(--warn)' },
            { label:'Total de Papéis',    val: 4, c:'var(--accent4)' },
          ].map((m,i) => (
            <div key={i} className="metric-card" style={{'--accent-color':m.c}}>
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{color:m.c}}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Papéis disponíveis */}
        <div className="card mb-20">
          <div className="card-header"><span className="card-title">Papéis e Permissões</span></div>
          <div className="card-body">
            <div className="roles-grid">
              {Object.entries(PAPEIS).map(([key, papel]) => (
                <div key={key} className="role-card">
                  <div className="role-icon">{papel.icon}</div>
                  <div className="role-name">
                    <span className={`papel-badge papel-${key}`}>{papel.label}</span>
                  </div>
                  <div className="role-desc" style={{marginTop:8}}>{papel.desc}</div>
                </div>
              ))}
            </div>

            {/* Tabela de permissões */}
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    <th style={{padding:'8px 12px',textAlign:'left',color:'var(--text3)',fontWeight:600}}>Módulo</th>
                    {Object.entries(PAPEIS).map(([key,p]) => (
                      <th key={key} style={{padding:'8px 12px',textAlign:'center'}}>
                        <span className={`papel-badge papel-${key}`}>{p.icon} {p.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(PAPEIS.admin.perms).map(mod => (
                    <tr key={mod} style={{borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'7px 12px',color:'var(--text2)'}}>{mod}</td>
                      {Object.entries(PAPEIS).map(([key,p]) => (
                        <td key={key} style={{padding:'7px 12px',textAlign:'center'}}>
                          {p.perms[mod]
                            ? <span style={{color:'var(--success)',fontWeight:700}}>✓</span>
                            : <span style={{color:'var(--text3)'}}>—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Usuários ativos */}
        <div className="card mb-20">
          <div className="card-header">
            <span className="card-title">Usuários da Empresa</span>
            <span className="badge badge-info">{usuarios.filter(u=>u.ativo!==false).length} ativos</span>
          </div>
          <div className="card-body">
            {loading ? <div style={{color:'var(--text3)',fontSize:13}}>Carregando...</div> :
             usuarios.filter(u=>u.ativo!==false).length === 0 ? (
              <div style={{textAlign:'center',padding:'24px',color:'var(--text3)',fontSize:13}}>Nenhum usuário cadastrado.</div>
            ) : (
              usuarios.filter(u=>u.ativo!==false).map(usr => (
                <div key={usr.id} className="usr-row">
                  <div className="usr-avatar" style={{background: avatarColor(usr.nome)}}>
                    {iniciais(usr.nome)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text)',display:'flex',alignItems:'center',gap:8}}>
                      {usr.nome}
                      {usr.id === user.id && <span style={{fontSize:10,color:'var(--text3)'}}>(você)</span>}
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>{usr.email}</div>
                  </div>
                  <span className={`papel-badge papel-${usr.papel}`}>
                    {PAPEIS[usr.papel]?.icon} {PAPEIS[usr.papel]?.label || usr.papel}
                  </span>
                  {isAdmin && usr.id !== user.id && (
                    <div className="flex gap-8">
                      <select
                        className="inp" style={{width:130,padding:'5px 8px',fontSize:12}}
                        value={usr.papel}
                        onChange={e => alterarPapel(usr.id, e.target.value)}
                      >
                        {Object.entries(PAPEIS).map(([key,p]) => (
                          <option key={key} value={key}>{p.icon} {p.label}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{color:'var(--danger)',fontSize:13}}
                        onClick={() => removerUsuario(usr.id)}
                        title="Remover usuário"
                      >🗑</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Convidar usuário — só admin */}
        {isAdmin && (
          <div className="invite-card">
            <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:15,marginBottom:16}}>
              ✉️ Convidar Novo Usuário
            </div>

            {/* Seleção de papel */}
            <div style={{marginBottom:20}}>
              <label className="inp-label">Papel do novo usuário</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {Object.entries(PAPEIS).map(([key,p]) => (
                  <div
                    key={key}
                    onClick={() => setPapelSel(key)}
                    style={{
                      padding:'8px 16px', borderRadius:20, cursor:'pointer',
                      border:`2px solid ${papelSel===key?'var(--accent)':'var(--border)'}`,
                      background: papelSel===key?'rgba(0,212,160,0.08)':'transparent',
                      fontSize:12, fontWeight:600,
                      transition:'var(--transition)',
                      display:'flex', alignItems:'center', gap:6,
                    }}
                  >
                    {p.icon} {p.label}
                  </div>
                ))}
              </div>
              {papelSel && (
                <div style={{fontSize:12,color:'var(--text3)',marginTop:8}}>
                  {PAPEIS[papelSel]?.desc}
                </div>
              )}
            </div>

            {/* Abas email/link */}
            <div className="invite-tabs">
              <div className={`invite-tab ${abaConvite==='email'?'active':''}`} onClick={() => setAbaConvite('email')}>📧 Por E-mail</div>
              <div className={`invite-tab ${abaConvite==='link'?'active':''}`}  onClick={() => setAbaConvite('link')}>🔗 Gerar Link</div>
            </div>

            {abaConvite === 'email' && (
              <div>
                <div className="field">
                  <label className="inp-label">Nome do convidado</label>
                  <input className="inp" placeholder="João Silva" value={nomeConvite} onChange={e=>setNomeConvite(e.target.value)} />
                </div>
                <div className="field">
                  <label className="inp-label">E-mail</label>
                  <input className="inp" type="email" placeholder="joao@empresa.com" value={emailConvite} onChange={e=>setEmailConvite(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={convidarPorEmail} disabled={salvando}>
                  {salvando ? '⏳ Gerando convite...' : '✉️ Gerar Convite'}
                </button>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:8}}>
                  Um link de convite será gerado — copie e envie para o usuário via WhatsApp ou e-mail.
                </div>
              </div>
            )}

            {abaConvite === 'link' && (
              <div>
                <div style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>
                  Gere um link de convite que qualquer pessoa pode usar para se cadastrar com o papel de <strong style={{color:'var(--text)'}}>{PAPEIS[papelSel]?.label}</strong>.
                  O link expira em <strong style={{color:'var(--accent)'}}>7 dias</strong>.
                </div>
                <button className="btn btn-primary" onClick={gerarLink} disabled={salvando} style={{marginBottom:12}}>
                  {salvando ? '⏳ Gerando...' : '🔗 Gerar Link de Convite'}
                </button>
                {linkGerado && (
                  <>
                    <div className="link-box">{linkGerado}</div>
                    <button className="btn btn-ghost" onClick={() => copiarLink(linkGerado)}>
                      {copiado ? '✅ Copiado!' : '📋 Copiar Link'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Convites pendentes */}
        {isAdmin && convites.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Convites Pendentes</span>
              <span className="badge badge-warn">{convites.length} aguardando</span>
            </div>
            <div className="card-body">
              {convites.map(c => (
                <div key={c.id} className="usr-row">
                  <div className="usr-avatar" style={{background:'var(--bg3)',border:'1px dashed var(--border2)'}}>
                    <span style={{fontSize:16}}>✉️</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>
                      {c.nome || 'Convite por link'} {c.email && `— ${c.email}`}
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>
                      Papel: {PAPEIS[c.papel]?.label} · Expira: {new Date(c.expira_em).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <button
                      className="btn btn-ghost" style={{fontSize:11}}
                      onClick={() => copiarLink(`${window.location.origin}/?convite=${c.token}`)}
                    >
                      📋 Copiar Link
                    </button>
                    <button
                      className="btn btn-ghost btn-icon" style={{color:'var(--danger)',fontSize:13}}
                      onClick={() => revogarConvite(c.id)}
                    >🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isAdmin && (
          <div className="alert alert-info" style={{marginTop:16}}>
            <span className="alert-icon">ℹ️</span>
            <div className="alert-content">
              <div className="alert-title">Apenas admins podem convidar usuários</div>
              <div className="alert-desc">Seu papel atual é <strong>{PAPEIS[perfil?.papel]?.label}</strong>. Contate o administrador da empresa para gerenciar acessos.</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
