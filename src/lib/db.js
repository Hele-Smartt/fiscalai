// src/lib/db.js
// Todas as operações de banco centralizadas aqui
import { supabase } from './supabase'

// ── HELPERS ──────────────────────────────────────────────────────────────────
const err = (e) => { console.error(e); return { data: null, error: e } }

// ── LANÇAMENTOS ──────────────────────────────────────────────────────────────
export const Lancamentos = {
  async listar(empresaId, filtros = {}) {
    let q = supabase
      .from('lancamentos')
      .select('*, categorias(nome,cor,icone), clientes(nome), fornecedores(nome)')
      .eq('empresa_id', empresaId)
      .order('data_lancamento', { ascending: false })

    if (filtros.tipo)   q = q.eq('tipo', filtros.tipo)
    if (filtros.mes)    q = q.gte('data_lancamento', `${filtros.mes}-01`)
                             .lte('data_lancamento', `${filtros.mes}-31`)
    if (filtros.limite) q = q.limit(filtros.limite)
    return q
  },

  async criar(dados) {
    return supabase.from('lancamentos').insert(dados).select().single()
  },

  async atualizar(id, dados) {
    return supabase.from('lancamentos').update(dados).eq('id', id).select().single()
  },

  async deletar(id) {
    return supabase.from('lancamentos').delete().eq('id', id)
  },

  async resumoMes(empresaId, mes) {
    const { data } = await supabase
      .from('lancamentos')
      .select('tipo, valor')
      .eq('empresa_id', empresaId)
      .eq('status', 'confirmado')
      .gte('data_lancamento', `${mes}-01`)
      .lte('data_lancamento', `${mes}-31`)

    const entradas = data?.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0) || 0
    const saidas   = data?.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0) || 0
    return { entradas, saidas, saldo: entradas - saidas }
  },

  async evolucao12Meses(empresaId) {
    const meses = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      meses.push(d.toISOString().slice(0, 7))
    }
    const resultados = await Promise.all(meses.map(m => Lancamentos.resumoMes(empresaId, m)))
    return meses.map((m, i) => ({ mes: m.slice(5, 7), ...resultados[i] }))
  },
}

// ── CONTAS A PAGAR ────────────────────────────────────────────────────────────
export const ContasPagar = {
  async listar(empresaId, filtros = {}) {
    let q = supabase
      .from('contas_pagar')
      .select('*, fornecedores(nome), categorias(nome,cor)')
      .eq('empresa_id', empresaId)
      .order('vencimento', { ascending: true })

    if (filtros.status) q = q.eq('status', filtros.status)
    return q
  },

  async criar(dados) {
    return supabase.from('contas_pagar').insert(dados).select().single()
  },

  async pagar(id, dataPagamento, valorPago) {
    return supabase.from('contas_pagar')
      .update({ status: 'pago', data_pagamento: dataPagamento, valor_pago: valorPago })
      .eq('id', id).select().single()
  },

  async atualizar(id, dados) {
    return supabase.from('contas_pagar').update(dados).eq('id', id).select().single()
  },

  async deletar(id) {
    return supabase.from('contas_pagar').delete().eq('id', id)
  },

  async totais(empresaId) {
    const { data } = await supabase
      .from('contas_pagar')
      .select('status, valor')
      .eq('empresa_id', empresaId)

    return {
      pendente:  data?.filter(c => c.status === 'pendente').reduce((s,c)  => s + Number(c.valor), 0) || 0,
      vencido:   data?.filter(c => c.status === 'vencido').reduce((s,c)   => s + Number(c.valor), 0) || 0,
      pago:      data?.filter(c => c.status === 'pago').reduce((s,c)      => s + Number(c.valor), 0) || 0,
    }
  },
}

// ── CONTAS A RECEBER ──────────────────────────────────────────────────────────
export const ContasReceber = {
  async listar(empresaId, filtros = {}) {
    let q = supabase
      .from('contas_receber')
      .select('*, clientes(nome), categorias(nome,cor)')
      .eq('empresa_id', empresaId)
      .order('vencimento', { ascending: true })

    if (filtros.status) q = q.eq('status', filtros.status)
    return q
  },

  async criar(dados) {
    return supabase.from('contas_receber').insert(dados).select().single()
  },

  async receber(id, dataRecebimento, valorRecebido) {
    return supabase.from('contas_receber')
      .update({ status: 'recebido', data_recebimento: dataRecebimento, valor_recebido: valorRecebido })
      .eq('id', id).select().single()
  },

  async atualizar(id, dados) {
    return supabase.from('contas_receber').update(dados).eq('id', id).select().single()
  },

  async deletar(id) {
    return supabase.from('contas_receber').delete().eq('id', id)
  },

  async totais(empresaId) {
    const { data } = await supabase
      .from('contas_receber')
      .select('status, valor')
      .eq('empresa_id', empresaId)

    return {
      pendente:   data?.filter(c => c.status === 'pendente').reduce((s,c)  => s + Number(c.valor), 0) || 0,
      vencido:    data?.filter(c => c.status === 'vencido').reduce((s,c)   => s + Number(c.valor), 0) || 0,
      recebido:   data?.filter(c => c.status === 'recebido').reduce((s,c)  => s + Number(c.valor), 0) || 0,
    }
  },
}

// ── CLIENTES ──────────────────────────────────────────────────────────────────
export const Clientes = {
  async listar(empresaId) {
    return supabase.from('clientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome')
  },

  async criar(dados) {
    return supabase.from('clientes').insert(dados).select().single()
  },

  async atualizar(id, dados) {
    return supabase.from('clientes').update(dados).eq('id', id).select().single()
  },

  async deletar(id) {
    return supabase.from('clientes').update({ ativo: false }).eq('id', id)
  },
}

// ── FORNECEDORES ──────────────────────────────────────────────────────────────
export const Fornecedores = {
  async listar(empresaId) {
    return supabase.from('fornecedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome')
  },

  async criar(dados) {
    return supabase.from('fornecedores').insert(dados).select().single()
  },

  async atualizar(id, dados) {
    return supabase.from('fornecedores').update(dados).eq('id', id).select().single()
  },

  async deletar(id) {
    return supabase.from('fornecedores').update({ ativo: false }).eq('id', id)
  },
}

// ── NOTAS FISCAIS ─────────────────────────────────────────────────────────────
export const NotasFiscais = {
  async listar(empresaId, filtros = {}) {
    let q = supabase
      .from('notas_fiscais')
      .select('*, clientes(nome), fornecedores(nome)')
      .eq('empresa_id', empresaId)
      .order('data_emissao', { ascending: false })

    if (filtros.operacao) q = q.eq('operacao', filtros.operacao)
    if (filtros.tipo)     q = q.eq('tipo', filtros.tipo)
    if (filtros.limite)   q = q.limit(filtros.limite)
    return q
  },

  async criar(dados) {
    return supabase.from('notas_fiscais').insert(dados).select().single()
  },

  async buscarPorChave(chave) {
    return supabase.from('notas_fiscais')
      .select('*').eq('chave_acesso', chave).single()
  },

  async totaisTributarios(empresaId, ano) {
    const { data } = await supabase
      .from('notas_fiscais')
      .select('valor_icms, valor_pis, valor_cofins, valor_iss, valor_ipi, valor_inss')
      .eq('empresa_id', empresaId)
      .eq('status', 'autorizada')
      .gte('data_emissao', `${ano}-01-01`)
      .lte('data_emissao', `${ano}-12-31`)

    return data?.reduce((acc, nf) => ({
      icms:   acc.icms   + Number(nf.valor_icms   || 0),
      pis:    acc.pis    + Number(nf.valor_pis    || 0),
      cofins: acc.cofins + Number(nf.valor_cofins || 0),
      iss:    acc.iss    + Number(nf.valor_iss    || 0),
      ipi:    acc.ipi    + Number(nf.valor_ipi    || 0),
      inss:   acc.inss   + Number(nf.valor_inss   || 0),
    }), { icms: 0, pis: 0, cofins: 0, iss: 0, ipi: 0, inss: 0 }) || {}
  },
}

// ── CATEGORIAS ────────────────────────────────────────────────────────────────
export const Categorias = {
  async listar(empresaId) {
    return supabase.from('categorias')
      .select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
  },
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
export const Dashboard = {
  async resumo(empresaId) {
    const mesAtual = new Date().toISOString().slice(0, 7)
    const anoAtual = new Date().getFullYear()

    const [fluxo, pagar, receber, tributos, evolucao] = await Promise.all([
      Lancamentos.resumoMes(empresaId, mesAtual),
      ContasPagar.totais(empresaId),
      ContasReceber.totais(empresaId),
      NotasFiscais.totaisTributarios(empresaId, anoAtual),
      Lancamentos.evolucao12Meses(empresaId),
    ])

    return { fluxo, pagar, receber, tributos, evolucao }
  },
}
