// src/lib/ClienteContext.jsx
// Contexto global do cliente HElevare ativo
// Todos os dados do sistema são filtrados por este cliente

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const ClienteContext = createContext({})

export function ClienteProvider({ children, empresaId }) {
  const [clienteAtivo, setClienteAtivo] = useState(null)
  const [clientes,     setClientes]     = useState([])
  const [loading,      setLoading]      = useState(true)

  const carregarClientes = useCallback(async () => {
    if (!empresaId) return
    const { data } = await supabase
      .from('clientes_helevare')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome')
    setClientes(data || [])
    setLoading(false)
  }, [empresaId])

  useEffect(() => { carregarClientes() }, [carregarClientes])

  // Restaura cliente ativo do localStorage
  useEffect(() => {
    if (!empresaId || clientes.length === 0) return
    const salvo = localStorage.getItem(`helevare_cli_${empresaId}`)
    if (salvo) {
      const c = clientes.find(x => x.id === salvo)
      if (c) setClienteAtivo(c)
    }
  }, [clientes, empresaId])

  function selecionarCliente(cliente) {
    setClienteAtivo(cliente)
    if (cliente && empresaId)
      localStorage.setItem(`helevare_cli_${empresaId}`, cliente.id)
  }

  function limparCliente() {
    setClienteAtivo(null)
    if (empresaId) localStorage.removeItem(`helevare_cli_${empresaId}`)
  }

  return (
    <ClienteContext.Provider value={{
      clienteAtivo,
      clienteId: clienteAtivo?.id || null,
      clientes,
      loading,
      selecionarCliente,
      limparCliente,
      carregarClientes,
    }}>
      {children}
    </ClienteContext.Provider>
  )
}

export const useCliente = () => useContext(ClienteContext)
