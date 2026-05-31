// src/pages/Login.jsx
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { login, registrar } = useAuth()
  const [modo, setModo]         = useState('login') // 'login' | 'cadastro'
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')
  const [sucesso, setSucesso]   = useState('')

  const [form, setForm] = useState({
    email: '', senha: '', nome: '', cnpj: '', nomeEmpresa: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(''); setSucesso(''); setLoading(true)

    if (modo === 'login') {
      const { error } = await login(form.email, form.senha)
      if (error) setErro(error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.' : error.message)
    } else {
      if (!form.nome || !form.cnpj || !form.nomeEmpresa) {
        setErro('Preencha todos os campos.'); setLoading(false); return
      }
      const { error } = await registrar(form.email, form.senha, form.nome, form.cnpj, form.nomeEmpresa)
      if (error) setErro(error.message)
      else setSucesso('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
    }
    setLoading(false)
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080C14; font-family: 'DM Sans', sans-serif; }
    .login-bg {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,212,160,0.12), transparent),
                  radial-gradient(ellipse 50% 40% at 80% 80%, rgba(0,144,255,0.08), transparent),
                  #080C14;
      padding: 20px;
    }
    .login-card {
      width: 100%; max-width: 420px;
      background: #0D1320; border: 1px solid rgba(255,255,255,0.06);
      border-radius: 24px; padding: 40px 36px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .login-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
    .login-logo-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, #00D4A0, #0090FF);
      display: flex; align-items: center; justify-content: center; font-size: 20px;
      box-shadow: 0 0 24px rgba(0,212,160,0.3);
    }
    .login-logo-text { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #E8EDF5; }
    .login-logo-text span { color: #00D4A0; }
    .login-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #E8EDF5; margin-bottom: 6px; }
    .login-sub { font-size: 13px; color: #8A97AE; margin-bottom: 28px; }
    .field { margin-bottom: 14px; }
    .field label { display: block; font-size: 12px; color: #8A97AE; font-weight: 500; margin-bottom: 6px; }
    .field input {
      width: 100%; background: #111927; border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; padding: 11px 14px; color: #E8EDF5;
      font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none;
      transition: border-color 0.2s;
    }
    .field input:focus { border-color: #00D4A0; box-shadow: 0 0 0 3px rgba(0,212,160,0.1); }
    .btn-submit {
      width: 100%; padding: 13px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #00D4A0, #0090FF);
      color: #080C14; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
      cursor: pointer; transition: all 0.2s; margin-top: 8px;
    }
    .btn-submit:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,212,160,0.3); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .login-switch { text-align: center; margin-top: 20px; font-size: 13px; color: #8A97AE; }
    .login-switch a { color: #00D4A0; cursor: pointer; font-weight: 500; }
    .login-switch a:hover { text-decoration: underline; }
    .alert-err { background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.2); border-radius: 10px; padding: 11px 14px; font-size: 13px; color: #FF4757; margin-bottom: 14px; }
    .alert-ok  { background: rgba(0,212,160,0.08); border: 1px solid rgba(0,212,160,0.2); border-radius: 10px; padding: 11px 14px; font-size: 13px; color: #00D4A0; margin-bottom: 14px; }
    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 16px 0; }
  `

  return (
    <>
      <style>{CSS}</style>
      <div className="login-bg">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">⚡</div>
            <div className="login-logo-text">Fiscal<span>AI</span></div>
          </div>

          <div className="login-title">{modo === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}</div>
          <div className="login-sub">
            {modo === 'login'
              ? 'Acesse sua plataforma tributária inteligente'
              : 'Configure sua empresa em menos de 2 minutos'}
          </div>

          {erro    && <div className="alert-err">⚠️ {erro}</div>}
          {sucesso && <div className="alert-ok">✅ {sucesso}</div>}

          <form onSubmit={handleSubmit}>
            {modo === 'cadastro' && (
              <>
                <div className="field">
                  <label>Seu nome completo</label>
                  <input placeholder="João Silva" value={form.nome} onChange={e => set('nome', e.target.value)} />
                </div>
                <div className="field">
                  <label>Nome da empresa</label>
                  <input placeholder="Acme Tecnologia Ltda." value={form.nomeEmpresa} onChange={e => set('nomeEmpresa', e.target.value)} />
                </div>
                <div className="field">
                  <label>CNPJ</label>
                  <input placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} />
                </div>
                <div className="divider" />
              </>
            )}

            <div className="field">
              <label>E-mail</label>
              <input type="email" placeholder="voce@empresa.com.br" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div className="field">
              <label>Senha</label>
              <input type="password" placeholder="••••••••" value={form.senha} onChange={e => set('senha', e.target.value)} required minLength={6} />
            </div>

            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? '⏳ Aguarde...' : modo === 'login' ? '→ Entrar' : '→ Criar conta'}
            </button>
          </form>

          <div className="login-switch">
            {modo === 'login'
              ? <>Não tem conta? <a onClick={() => { setModo('cadastro'); setErro('') }}>Criar agora</a></>
              : <>Já tem conta? <a onClick={() => { setModo('login'); setErro('') }}>Entrar</a></>}
          </div>
        </div>
      </div>
    </>
  )
}
