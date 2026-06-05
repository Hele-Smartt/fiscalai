// src/pages/forms/NovoFornecedor.jsx
// Cadastro de Fornecedor (para Contas a Pagar / Saídas)
import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useCliente } from '../../lib/ClienteContext'
import { Fornecedores } from '../../lib/db'
import { FORM_CSS, Field, Input, Select } from './FormComponents'

export default function NovoFornecedor({ onBack, onSaved, editData = null }) {
  const { empresa } = useAuth()
  const { clienteId } = useCliente()
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro,    setErro]    = useState('')

  const [form, setForm] = useState({
    nome:      editData?.nome      || '',
    cpf_cnpj:  editData?.cpf_cnpj  || '',
    email:     editData?.email     || '',
    telefone:  editData?.telefone  || '',
    endereco:  editData?.endereco  || '',
    cidade:    editData?.cidade    || '',
    estado:    editData?.estado    || '',
    cep:       editData?.cep       || '',
    tipo:      editData?.tipo      || 'pj',
    categoria: editData?.categoria || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome) { setErro('Nome é obrigatório.'); return }
    setLoading(true); setErro('')
    const dados = {
      ...form,
      empresa_id: empresa.id,
      cliente_helevare_id: clienteId || null,
    }
    const { error } = editData
      ? await Fornecedores.atualizar(editData.id, dados)
      : await Fornecedores.criar(dados)
    setLoading(false)
    if (error) { setErro(error.message); return }
    setSucesso(true)
    setTimeout(() => { onSaved?.(); onBack?.() }, 1500)
  }

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
  const categorias = ['Serviços','Produtos','Tecnologia','Infraestrutura','Marketing','RH','Jurídico','Contabilidade','Tributário','Material Médico','Insumos','Outros']

  return (
    <>
      <style>{FORM_CSS}</style>
      <div className="form-page fade-up">
        <div className="form-header">
          <div className="form-back" onClick={onBack}>←</div>
          <div>
            <div className="form-title">{editData ? 'Editar' : 'Novo'} Fornecedor</div>
            <div className="form-sub">Cadastre um fornecedor para vincular a pagamentos e saídas</div>
          </div>
        </div>

        {sucesso && <div className="success-banner">✅ Fornecedor salvo com sucesso!</div>}
        {erro    && <div className="error-banner">⚠️ {erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-section-title">Identificação</div>
            <div className="form-grid" style={{gap:16}}>
              <div className="form-grid form-grid-2">
                <Field label="Tipo de Pessoa">
                  <Select value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
                    <option value="pj">🏢 Pessoa Jurídica</option>
                    <option value="pf">👤 Pessoa Física</option>
                  </Select>
                </Field>
                <Field label={form.tipo==='pj'?'CNPJ':'CPF'}>
                  <Input placeholder={form.tipo==='pj'?'00.000.000/0001-00':'000.000.000-00'}
                    value={form.cpf_cnpj} onChange={e=>set('cpf_cnpj',e.target.value)} />
                </Field>
              </div>
              <Field label="Nome / Razão Social" required>
                <Input placeholder="Fornecedor Ltda." value={form.nome} onChange={e=>set('nome',e.target.value)} required />
              </Field>
              <div className="form-grid form-grid-2">
                <Field label="E-mail">
                  <Input type="email" placeholder="contato@fornecedor.com" value={form.email} onChange={e=>set('email',e.target.value)} />
                </Field>
                <Field label="Telefone">
                  <Input placeholder="(17) 99999-9999" value={form.telefone} onChange={e=>set('telefone',e.target.value)} />
                </Field>
              </div>
              <Field label="Categoria">
                <Select value={form.categoria} onChange={e=>set('categoria',e.target.value)}>
                  <option value="">— Selecione —</option>
                  {categorias.map(c=><option key={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          <div className="form-card">
            <div className="form-section-title">Endereço</div>
            <div className="form-grid" style={{gap:16}}>
              <div className="form-grid form-grid-2">
                <Field label="CEP"><Input placeholder="00000-000" value={form.cep} onChange={e=>set('cep',e.target.value)} /></Field>
                <Field label="Endereço"><Input placeholder="Rua, número" value={form.endereco} onChange={e=>set('endereco',e.target.value)} /></Field>
              </div>
              <div className="form-grid form-grid-2">
                <Field label="Cidade"><Input placeholder="Votuporanga" value={form.cidade} onChange={e=>set('cidade',e.target.value)} /></Field>
                <Field label="Estado">
                  <Select value={form.estado} onChange={e=>set('estado',e.target.value)}>
                    <option value="">— UF —</option>
                    {estados.map(uf=><option key={uf}>{uf}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onBack}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? '⏳ Salvando...' : '✅ Salvar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
