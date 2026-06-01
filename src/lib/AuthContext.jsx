// src/lib/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [perfil,  setPerfil]  = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [loading, setLoading] = useState(true)

  async function carregarPerfil(userId) {
    const { data: p } = await supabase
      .from('perfis')
      .select('*, empresas(*)')
      .eq('id', userId)
      .single()
    if (p) { setPerfil(p); setEmpresa(p.empresas) }
  }

  useEffect(() => {
    // Verifica convite na URL
    const params = new URLSearchParams(window.location.search)
    const tokenConvite = params.get('convite')
    if (tokenConvite) sessionStorage.setItem('convite_token', tokenConvite)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) carregarPerfil(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) carregarPerfil(session.user.id)
      else { setPerfil(null); setEmpresa(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (!error && data.user) {
      // Verifica se há convite pendente
      const token = sessionStorage.getItem('convite_token')
      if (token) await processarConvite(data.user.id, token)
    }
    return { data, error }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function registrar(email, senha, nome, cnpj, nomeEmpresa) {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: senha })
    if (authError) return { error: authError }
    const userId = authData.user?.id
    if (!userId) return { error: new Error('Usuário não criado') }

    // Verifica se há convite pendente
    const token = sessionStorage.getItem('convite_token')
    if (token) {
      const result = await processarConvite(userId, token, nome, email)
      if (result?.ok) return { data: authData }
    }

    // Registro normal — cria nova empresa
    const { error: fnError } = await supabase.rpc('criar_empresa_usuario', {
      p_user_id: userId, p_nome: nome, p_email: email,
      p_nome_empresa: nomeEmpresa, p_cnpj: cnpj,
    })
    if (fnError) return { error: fnError }
    return { data: authData }
  }

  async function processarConvite(userId, token, nome, email) {
    try {
      // Busca convite válido
      const { data: convite } = await supabase
        .from('convites')
        .select('*')
        .eq('token', token)
        .eq('usado', false)
        .single()

      if (!convite) return { ok: false }
      if (new Date(convite.expira_em) < new Date()) return { ok: false }

      // Cria perfil na empresa do convite
      const { error } = await supabase.from('perfis').upsert({
        id:         userId,
        empresa_id: convite.empresa_id,
        nome:       nome || convite.nome || email?.split('@')[0] || 'Usuário',
        email:      email || convite.email || '',
        papel:      convite.papel,
      })
      if (error) return { ok: false }

      // Marca convite como usado
      await supabase.from('convites').update({ usado: true }).eq('id', convite.id)
      sessionStorage.removeItem('convite_token')

      // Limpa URL
      window.history.replaceState({}, '', window.location.pathname)

      return { ok: true }
    } catch { return { ok: false } }
  }

  // Verifica se o usuário tem permissão para um módulo
  function temPermissao(modulo) {
    const PERMS = {
      admin:    ['dashboard','financeiro','lancamentos','contas','contatos','nfe','tributario','ia','relatorios','usuarios','config'],
      contador: ['dashboard','financeiro','lancamentos','contas','contatos','nfe','tributario','ia','relatorios'],
      gerente:  ['dashboard','financeiro','contatos','tributario','ia','relatorios'],
      viewer:   ['dashboard','relatorios'],
    }
    const papel = perfil?.papel || 'viewer'
    return (PERMS[papel] || PERMS.viewer).includes(modulo)
  }

  return (
    <AuthContext.Provider value={{ user, perfil, empresa, loading, login, logout, registrar, temPermissao }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
