// src/lib/db.js
// Todas as queries filtradas por empresa_id + cliente_helevare_id
import { supabase } from './supabase'

// Helper: limite exclusivo = primeiro dia do mês seguinte (evita datas inválidas tipo -31)
function proximoMes(mes) {
  const [y, m] = mes.split('-').map(Number)
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}
const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── PLANO DE CONTAS PADRÃO (árvore) ───────────────────────────
const PLANO_PADRAO_RAW = `
1|Receitas Operacionais
1.1|Venda de Produtos
1.1.1|Produtos Próprios
1.1.2|Mercadorias para Revenda
1.1.3|E-commerce
1.1.4|Marketplace
1.2|Prestação de Serviços
1.2.1|Consultoria
1.2.2|Assessoria
1.2.3|Serviços Técnicos
1.2.4|Serviços Administrativos
1.2.5|Serviços Financeiros
1.2.6|Serviços Contábeis
1.3|Contratos Recorrentes
1.3.1|Mensalidades
1.3.2|Assinaturas
1.3.3|Planos de Serviços
1.3.4|Contratos de Manutenção
2|Receitas Financeiras
2.1|Rendimentos Bancários
2.1.1|Aplicações Financeiras
2.1.2|CDB
2.1.3|Fundos de Investimentos
2.1.4|Poupança
2.2|Juros Recebidos
2.2.1|Juros por Atraso
2.2.2|Juros Contratuais
2.3|Descontos Obtidos
2.3.1|Descontos Financeiros
3|Outras Receitas
3.1|Receitas Diversas
3.1.1|Reembolsos
3.1.2|Bonificações
3.1.3|Indenizações
3.1.4|Doações Recebidas
3.2|Alienação de Ativos
3.2.1|Venda de Veículos
3.2.2|Venda de Equipamentos
3.2.3|Venda de Imóveis
4|Custos Diretos (CPV/CSP)
4.1|Mercadorias
4.1.1|Compra para Revenda
4.1.2|Fretes sobre Compras
4.1.3|Embalagens
4.2|Produção
4.2.1|Matéria-Prima
4.2.2|Insumos
4.2.3|Mão de Obra Direta
4.2.4|Terceirização de Produção
4.3|Prestação de Serviços
4.3.1|Serviços de Terceiros
4.3.2|Profissionais Autônomos
4.3.3|Subcontratações
5|Despesas com Pessoal
5.1|Folha de Pagamento
5.1.1|Salários
5.1.2|Horas Extras
5.1.3|Adicionais
5.1.4|Comissões
5.2|Encargos Trabalhistas
5.2.1|INSS
5.2.2|FGTS
5.2.3|Férias
5.2.4|13º Salário
5.3|Benefícios
5.3.1|Vale Alimentação
5.3.2|Vale Refeição
5.3.3|Vale Transporte
5.3.4|Plano de Saúde
5.3.5|Seguro de Vida
5.4|Pró-Labore
5.4.1|Pró-Labore dos Sócios
6|Despesas Administrativas
6.1|Estrutura
6.1.1|Aluguel
6.1.2|Condomínio
6.1.3|IPTU
6.1.4|Energia Elétrica
6.1.5|Água
6.1.6|Gás
6.2|Escritório
6.2.1|Material de Escritório
6.2.2|Impressões e Cópias
6.2.3|Correios
6.3|Tecnologia
6.3.1|Sistemas ERP
6.3.2|Assinaturas SaaS
6.3.3|Hospedagem de Sites
6.3.4|Domínios
6.3.5|Internet
6.3.6|Telefonia
6.4|Serviços Administrativos
6.4.1|Contabilidade
6.4.2|Consultoria
6.4.3|Jurídico
6.4.4|Auditoria
7|Despesas Comerciais
7.1|Marketing
7.1.1|Google Ads
7.1.2|Meta Ads
7.1.3|Tráfego Pago
7.1.4|Produção de Conteúdo
7.1.5|Agência de Marketing
7.2|Vendas
7.2.1|Comissões
7.2.2|Premiações
7.2.3|Representantes Comerciais
7.3|Atendimento ao Cliente
7.3.1|CRM
7.3.2|Call Center
7.3.3|Suporte ao Cliente
8|Despesas Operacionais
8.1|Logística
8.1.1|Fretes
8.1.2|Transportadoras
8.1.3|Correios
8.2|Veículos
8.2.1|Combustível
8.2.2|Manutenção
8.2.3|Seguro
8.2.4|Licenciamento
8.2.5|Pedágios
8.3|Viagens
8.3.1|Hospedagem
8.3.2|Alimentação
8.3.3|Passagens
8.3.4|Deslocamentos
9|Despesas Financeiras
9.1|Bancárias
9.1.1|Tarifas Bancárias
9.1.2|Taxas PIX
9.1.3|Taxas de Boletos
9.2|Cartões
9.2.1|Taxas de Cartão
9.2.2|Antecipação de Recebíveis
9.3|Empréstimos e Financiamentos
9.3.1|Juros de Empréstimos
9.3.2|Juros de Financiamentos
9.3.3|IOF
9.4|Inadimplência
9.4.1|Perdas com Clientes
9.4.2|Descontos Concedidos
10|Tributos
10.1|Tributos Federais
10.1.1|Simples Nacional
10.1.2|PIS
10.1.3|COFINS
10.1.4|IRPJ
10.1.5|CSLL
10.1.6|IPI
10.2|Encargos Previdenciários
10.2.1|INSS Patronal
10.2.2|RAT
10.2.3|Terceiros
10.3|Tributos Estaduais
10.3.1|ICMS
10.3.2|DIFAL
10.3.3|FECP/FCP
10.4|Tributos Municipais
10.4.1|ISS
10.4.2|Taxas Municipais
11|Investimentos
11.1|Ativo Imobilizado
11.1.1|Máquinas
11.1.2|Equipamentos
11.1.3|Computadores
11.1.4|Móveis e Utensílios
11.2|Tecnologia
11.2.1|Desenvolvimento de Sistemas
11.2.2|Aquisição de Software
11.3|Imóveis
11.3.1|Terrenos
11.3.2|Construções
11.3.3|Reformas
T|Transferências
T.1|Entre Contas
T.2|Aplicação / Resgate de Investimento
T.3|Pagamento de Fatura de Cartão
`.trim()
const PLANO_PADRAO = PLANO_PADRAO_RAW.split("\n").map(linha => {
  const [codigo, nome] = linha.split("|")
  const raiz = codigo.split(".")[0]
  const tipo = raiz === "T" ? "transferencia" : (Number(raiz) <= 3 ? "receita" : "despesa")
  return { codigo, nome, tipo }
})

// ── LANÇAMENTOS ──────────────────────────────────────────────
export const Lancamentos = {
  async listar(empresaId, filtros = {}, clienteId = null) {
    let q = supabase
      .from('lancamentos')
      .select('*, categorias(nome,cor,icone), clientes(nome), fornecedores(nome)')
      .eq('empresa_id', empresaId)
      .order('data_lancamento', { ascending: false })
    if (clienteId) q = q.eq('cliente_helevare_id', clienteId)
    if (filtros.tipo)   q = q.eq('tipo', filtros.tipo)
    if (filtros.mes)    q = q.gte('data_lancamento', `${filtros.mes}-01`).lt('data_lancamento', proximoMes(filtros.mes))
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

  // ISOLAMENTO: sem clienteId não soma nada (evita misturar clientes)
  async resumoMes(empresaId, mes, clienteId = null) {
    if (!clienteId) return { entradas: 0, saidas: 0, saldo: 0 }
    const { data } = await supabase.from('lancamentos').select('tipo, valor')
      .eq('empresa_id', empresaId)
      .eq('cliente_helevare_id', clienteId)
      .neq('status', 'cancelado')
      .gte('data_lancamento', `${mes}-01`)
      .lt('data_lancamento', proximoMes(mes))   // ← limite exclusivo (corrige fev/abr/jun/set/nov)
    const entradas = data?.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0) || 0
    const saidas   = data?.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0) || 0
    return { entradas, saidas, saldo: entradas - saidas }
  },

  // resumo por período arbitrário (filtro de datas do Dashboard/Financeiro)
  async resumoPeriodo(empresaId, inicio, fim, clienteId = null) {
    if (!clienteId) return { entradas: 0, saidas: 0, saldo: 0 }
    const { data } = await supabase.from('lancamentos').select('tipo, valor')
      .eq('empresa_id', empresaId)
      .eq('cliente_helevare_id', clienteId)
      .neq('status', 'cancelado')
      .gte('data_lancamento', inicio)
      .lte('data_lancamento', fim)
    const entradas = data?.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0) || 0
    const saidas   = data?.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0) || 0
    return { entradas, saidas, saldo: entradas - saidas }
  },

  async evolucao12Meses(empresaId, clienteId = null) {
    if (!clienteId) return []
    const meses = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
      meses.push(d.toISOString().slice(0, 7))
    }
    const resultados = await Promise.all(meses.map(m => Lancamentos.resumoMes(empresaId, m, clienteId)))
    return meses.map((m, i) => ({ mes: m.slice(5, 7), mesAno: m, ...resultados[i] }))
  },
}

// ── CONTAS A PAGAR ────────────────────────────────────────────
export const ContasPagar = {
  async listar(empresaId, filtros = {}, clienteId = null) {
    if (!clienteId) return { data: [] }
    let q = supabase.from('contas_pagar')
      .select('*, fornecedores(nome), categorias(nome,cor)')
      .eq('empresa_id', empresaId)
      .eq('cliente_helevare_id', clienteId)
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

  // "vencido" calculado: pendente + vencimento < hoje. "pendente" = a vencer (futuro/hoje).
  async totais(empresaId, clienteId = null) {
    if (!clienteId) return { pendente: 0, vencido: 0, pago: 0 }
    const { data } = await supabase.from('contas_pagar').select('status, valor, vencimento')
      .eq('empresa_id', empresaId).eq('cliente_helevare_id', clienteId)
    const hoje = hojeISO()
    const pend = data?.filter(c => c.status === 'pendente') || []
    return {
      pendente: pend.filter(c => (c.vencimento || '9999') >= hoje).reduce((s, c) => s + Number(c.valor), 0),
      vencido:  pend.filter(c => (c.vencimento || '9999') <  hoje).reduce((s, c) => s + Number(c.valor), 0),
      pago:     data?.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0) || 0,
    }
  },
}

// ── CONTAS A RECEBER ──────────────────────────────────────────
export const ContasReceber = {
  async listar(empresaId, filtros = {}, clienteId = null) {
    if (!clienteId) return { data: [] }
    let q = supabase.from('contas_receber')
      .select('*, clientes(nome), categorias(nome,cor)')
      .eq('empresa_id', empresaId)
      .eq('cliente_helevare_id', clienteId)
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

  // "vencido" = a receber em atraso (pendente + vencimento < hoje). "pendente" = previsto a receber.
  async totais(empresaId, clienteId = null) {
    if (!clienteId) return { pendente: 0, vencido: 0, recebido: 0 }
    const { data } = await supabase.from('contas_receber').select('status, valor, vencimento')
      .eq('empresa_id', empresaId).eq('cliente_helevare_id', clienteId)
    const hoje = hojeISO()
    const pend = data?.filter(c => c.status === 'pendente') || []
    return {
      pendente: pend.filter(c => (c.vencimento || '9999') >= hoje).reduce((s, c) => s + Number(c.valor), 0),
      vencido:  pend.filter(c => (c.vencimento || '9999') <  hoje).reduce((s, c) => s + Number(c.valor), 0),
      recebido: data?.filter(c => c.status === 'recebido').reduce((s, c) => s + Number(c.valor), 0) || 0,
    }
  },
}

// ── CLIENTES ──────────────────────────────────────────────────
export const Clientes = {
  async listar(empresaId, clienteId = null) {
    let q = supabase.from('clientes').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
    if (clienteId) q = q.eq('cliente_helevare_id', clienteId)
    return q
  },
  async criar(dados) { return supabase.from('clientes').insert(dados).select().single() },
  async atualizar(id, dados) { return supabase.from('clientes').update(dados).eq('id', id).select().single() },
  async deletar(id) { return supabase.from('clientes').update({ ativo: false }).eq('id', id) },
}

// ── FORNECEDORES ──────────────────────────────────────────────
export const Fornecedores = {
  async listar(empresaId, clienteId = null) {
    let q = supabase.from('fornecedores').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
    if (clienteId) q = q.eq('cliente_helevare_id', clienteId)
    return q
  },
  async criar(dados) { return supabase.from('fornecedores').insert(dados).select().single() },
  async atualizar(id, dados) { return supabase.from('fornecedores').update(dados).eq('id', id).select().single() },
  async deletar(id) { return supabase.from('fornecedores').update({ ativo: false }).eq('id', id) },
}

// ── NOTAS FISCAIS ─────────────────────────────────────────────
export const NotasFiscais = {
  async listar(empresaId, filtros = {}, clienteId = null) {
    let q = supabase.from('notas_fiscais')
      .select('*, clientes(nome), fornecedores(nome)')
      .eq('empresa_id', empresaId)
      .order('data_emissao', { ascending: false })
    if (clienteId) q = q.eq('cliente_helevare_id', clienteId)
    if (filtros.operacao) q = q.eq('operacao', filtros.operacao)
    if (filtros.limite)   q = q.limit(filtros.limite)
    return q
  },
  async criar(dados) { return supabase.from('notas_fiscais').insert(dados).select().single() },
  async buscarPorChave(chave) { return supabase.from('notas_fiscais').select('*').eq('chave_acesso', chave).single() },
  async totaisTributarios(empresaId, ano, clienteId = null) {
    if (!clienteId) return { icms: 0, pis: 0, cofins: 0, iss: 0, ipi: 0, inss: 0 }
    const { data } = await supabase.from('notas_fiscais')
      .select('valor_icms,valor_pis,valor_cofins,valor_iss,valor_ipi,valor_inss')
      .eq('empresa_id', empresaId).eq('cliente_helevare_id', clienteId).eq('status', 'autorizada')
      .gte('data_emissao', `${ano}-01-01`).lte('data_emissao', `${ano}-12-31`)
    return data?.reduce((acc, nf) => ({
      icms:   acc.icms   + Number(nf.valor_icms   || 0),
      pis:    acc.pis    + Number(nf.valor_pis    || 0),
      cofins: acc.cofins + Number(nf.valor_cofins || 0),
      iss:    acc.iss    + Number(nf.valor_iss    || 0),
      ipi:    acc.ipi    + Number(nf.valor_ipi    || 0),
      inss:   acc.inss   + Number(nf.valor_inss   || 0),
    }), { icms: 0, pis: 0, cofins: 0, iss: 0, ipi: 0, inss: 0 }) || { icms: 0, pis: 0, cofins: 0, iss: 0, ipi: 0, inss: 0 }
  },
}

// ── CATEGORIAS (árvore por cliente) ───────────────────────────
export const Categorias = {
  // somenteAtivas=true para selects; false para a tela de cadastro (mostra inativas também)
  async listar(empresaId, clienteId = null, somenteAtivas = true) {
    let q = supabase.from('categorias').select('*')
      .eq('empresa_id', empresaId)
      .order('codigo', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true })
    if (clienteId)     q = q.eq('cliente_helevare_id', clienteId)
    if (somenteAtivas) q = q.eq('ativo', true)
    return q
  },
  async criar(dados)        { return supabase.from('categorias').insert(dados).select().single() },
  async atualizar(id, dados){ return supabase.from('categorias').update(dados).eq('id', id).select().single() },
  async deletar(id)         { return supabase.from('categorias').delete().eq('id', id) },        // remove em cascata as filhas
  async desativar(id)       { return supabase.from('categorias').update({ ativo: false }).eq('id', id) },

  async contar(empresaId, clienteId) {
    if (!clienteId) return 0
    const { count } = await supabase.from('categorias')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId).eq('cliente_helevare_id', clienteId)
    return count || 0
  },

  // Semeia o plano de contas padrão para um cliente específico
  async semearPadrao(empresaId, clienteId) {
    if (!empresaId || !clienteId) return { error: { message: 'Empresa ou cliente não definidos.' } }
    const base = PLANO_PADRAO.map(n => ({
      empresa_id: empresaId, cliente_helevare_id: clienteId,
      codigo: n.codigo, nome: n.nome, tipo: n.tipo, ativo: true,
    }))
    // 1. insere todos os nós (parent_id nulo)
    const { error: errIns } = await supabase.from('categorias').insert(base)
    if (errIns) return { error: errIns }
    // 2. vincula parent_id pelo código (uma chamada via RPC no Postgres)
    const { error: errLink } = await supabase.rpc('vincular_parents_categorias', {
      p_empresa: empresaId, p_cliente: clienteId,
    })
    if (errLink) return { error: errLink }
    return { count: base.length }
  },
}

// ── FORMAS DE PAGAMENTO ───────────────────────────────────────
export const FormasPagamento = {
  async listar(empresaId, clienteId = null) {
    let q = supabase.from('formas_pagamento').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
    if (clienteId) q = q.eq('cliente_helevare_id', clienteId)
    return q
  },
  async criar(dados) { return supabase.from('formas_pagamento').insert(dados).select().single() },
  async atualizar(id, dados) { return supabase.from('formas_pagamento').update(dados).eq('id', id).select().single() },
}

// ── PLANO DE CONTAS ───────────────────────────────────────────
export const PlanoContas = {
  async listar(empresaId, clienteId = null, tipo = null) {
    let q = supabase.from('plano_contas').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('codigo')
    if (clienteId) q = q.eq('cliente_helevare_id', clienteId)
    if (tipo) q = q.eq('tipo', tipo)
    return q
  },
  async criar(dados) { return supabase.from('plano_contas').insert(dados).select().single() },
  async atualizar(id, dados) { return supabase.from('plano_contas').update(dados).eq('id', id).select().single() },
}

// ── FLUXO DE CAIXA (automático: títulos + lançamentos) ────────
// Projetado  = títulos em aberto/vencidos (por vencimento) + lançamentos pendentes
// Realizado  = títulos baixados (por data de liquidação) + lançamentos confirmados
export const Fluxo = {
  async caixa(empresaId, clienteId, inicio, fim) {
    if (!clienteId) return { projetado: [], realizado: [] }
    const [lanc, cr, cp] = await Promise.all([
      supabase.from('lancamentos')
        .select('id, descricao, valor, tipo, status, data_lancamento, clientes(nome), fornecedores(nome)')
        .eq('empresa_id', empresaId).eq('cliente_helevare_id', clienteId).neq('status', 'cancelado'),
      supabase.from('contas_receber')
        .select('id, descricao, valor, valor_recebido, status, vencimento, data_recebimento, clientes(nome)')
        .eq('empresa_id', empresaId).eq('cliente_helevare_id', clienteId).neq('status', 'cancelado'),
      supabase.from('contas_pagar')
        .select('id, descricao, valor, valor_pago, status, vencimento, data_pagamento, fornecedores(nome)')
        .eq('empresa_id', empresaId).eq('cliente_helevare_id', clienteId).neq('status', 'cancelado'),
    ])
    const hoje = hojeISO()
    const projetado = []
    const realizado = []

    ;(lanc.data || []).forEach(l => {
      const base = {
        id: 'L' + l.id, tipo: l.tipo, valor: Number(l.valor),
        descricao: l.descricao || (l.clientes?.nome || l.fornecedores?.nome || 'Lançamento'),
        origem: 'Lançamento',
      }
      if (l.status === 'confirmado') realizado.push({ ...base, data: l.data_lancamento, status: 'Realizado' })
      else projetado.push({ ...base, data: l.data_lancamento, status: (l.data_lancamento && l.data_lancamento < hoje) ? 'Vencido' : 'Em Aberto' })
    })

    ;(cr.data || []).forEach(c => {
      const nome = c.descricao || c.clientes?.nome || 'Recebimento'
      if (c.status === 'recebido') {
        realizado.push({ id: 'R' + c.id, tipo: 'entrada', origem: 'Conta a Receber', descricao: nome, valor: Number(c.valor_recebido || c.valor), data: c.data_recebimento || c.vencimento, status: 'Recebido' })
      } else {
        projetado.push({ id: 'R' + c.id, tipo: 'entrada', origem: 'Conta a Receber', descricao: nome, valor: Number(c.valor), data: c.vencimento, status: (c.vencimento && c.vencimento < hoje) ? 'Vencido' : 'Em Aberto' })
      }
    })

    ;(cp.data || []).forEach(c => {
      const nome = c.descricao || c.fornecedores?.nome || 'Pagamento'
      if (c.status === 'pago') {
        realizado.push({ id: 'P' + c.id, tipo: 'saida', origem: 'Conta a Pagar', descricao: nome, valor: Number(c.valor_pago || c.valor), data: c.data_pagamento || c.vencimento, status: 'Pago' })
      } else {
        projetado.push({ id: 'P' + c.id, tipo: 'saida', origem: 'Conta a Pagar', descricao: nome, valor: Number(c.valor), data: c.vencimento, status: (c.vencimento && c.vencimento < hoje) ? 'Vencido' : 'Em Aberto' })
      }
    })

    const noPeriodo = arr => arr.filter(x => x.data && x.data >= inicio && x.data <= fim)
    return { projetado: noPeriodo(projetado), realizado: noPeriodo(realizado) }
  },
}

// ── DASHBOARD ─────────────────────────────────────────────────
export const Dashboard = {
  // periodo = { inicio:'YYYY-MM-DD', fim:'YYYY-MM-DD' } opcional; sem ele usa mês atual
  async resumo(empresaId, clienteId = null, periodo = null) {
    if (!clienteId) {
      return {
        fluxo: { entradas: 0, saidas: 0, saldo: 0 },
        pagar: { pendente: 0, vencido: 0, pago: 0 },
        receber: { pendente: 0, vencido: 0, recebido: 0 },
        tributos: { icms: 0, pis: 0, cofins: 0, iss: 0, ipi: 0, inss: 0 },
        evolucao: [],
      }
    }
    const ano = new Date().getFullYear()
    const fluxoPromise = periodo?.inicio && periodo?.fim
      ? Lancamentos.resumoPeriodo(empresaId, periodo.inicio, periodo.fim, clienteId)
      : Lancamentos.resumoMes(empresaId, new Date().toISOString().slice(0, 7), clienteId)

    const [fluxo, pagar, receber, tributos, evolucao] = await Promise.all([
      fluxoPromise,
      ContasPagar.totais(empresaId, clienteId),
      ContasReceber.totais(empresaId, clienteId),
      NotasFiscais.totaisTributarios(empresaId, ano, clienteId),
      Lancamentos.evolucao12Meses(empresaId, clienteId),
    ])
    return { fluxo, pagar, receber, tributos, evolucao }
  },
}
