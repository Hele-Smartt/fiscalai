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

    if (p) {
      setPerfil(p)
      setEmpresa(p.empresas)
    }
  }

  useEffect(() => {
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
    return { data, error }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function registrar(email, senha, nome, cnpj, nomeEmpresa) {
    // 1. Cria usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    })
    if (authError) return { error: authError }

    const userId = authData.user?.id
    if (!userId) return { error: new Error('Usuário não criado') }

    // 2. Usa a função security definer que cria empresa+perfil+categorias
    const { error: fnError } = await supabase.rpc('criar_empresa_usuario', {
      p_user_id:      userId,
      p_nome:         nome,
      p_email:        email,
      p_nome_empresa: nomeEmpresa,
      p_cnpj:         cnpj,
    })

    if (fnError) return { error: fnError }

    return { data: authData }
  }

  return (
    <AuthContext.Provider value={{ user, perfil, empresa, loading, login, logout, registrar }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
