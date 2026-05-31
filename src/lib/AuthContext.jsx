// src/lib/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [perfil,  setPerfil]  = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [loading, setLoading] = useState(true)

  // Carrega perfil + empresa do usuário logado
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
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) carregarPerfil(session.user.id)
      setLoading(false)
    })

    // Escuta mudanças de auth
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

    // 2. Cria empresa
    const { data: emp, error: empError } = await supabase
      .from('empresas')
      .insert({ nome: nomeEmpresa, cnpj })
      .select()
      .single()
    if (empError) return { error: empError }

    // 3. Cria perfil vinculado
    const { error: perfError } = await supabase
      .from('perfis')
      .insert({ id: userId, empresa_id: emp.id, nome, email, papel: 'admin' })
    if (perfError) return { error: perfError }

    // 4. Categorias padrão
    await supabase.from('categorias').insert([
      { empresa_id: emp.id, nome: 'Serviços Prestados', tipo: 'receita', cor: '#00D4A0', icone: '💼' },
      { empresa_id: emp.id, nome: 'Venda de Produtos',  tipo: 'receita', cor: '#0090FF', icone: '📦' },
      { empresa_id: emp.id, nome: 'Tributário',          tipo: 'despesa', cor: '#FF4757', icone: '⚖️' },
      { empresa_id: emp.id, nome: 'Folha de Pagamento',  tipo: 'despesa', cor: '#FF6B35', icone: '👥' },
      { empresa_id: emp.id, nome: 'Infraestrutura',      tipo: 'despesa', cor: '#A855F7', icone: '🏢' },
      { empresa_id: emp.id, nome: 'Marketing',           tipo: 'despesa', cor: '#FFB800', icone: '📣' },
    ])

    return { data: authData }
  }

  return (
    <AuthContext.Provider value={{ user, perfil, empresa, loading, login, logout, registrar }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
