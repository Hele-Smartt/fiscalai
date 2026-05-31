// src/pages/forms/NovoCliente.jsx
import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { Clientes, Fornecedores } from '../../lib/db'
import { FORM_CSS, Field, Input, Select } from './FormComponents'

export default function NovoCliente({ onBack, onSaved, tipo = 'cliente', editData = null }) {
  const { empresa } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro,    setErro]    = useState('')
  const isCliente = tipo === 'cliente'

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
    // cliente
    limite_credito: editData?.limite_credito || '',
    // fornecedor
    categoria: editData?.categoria || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome) { setErro('Nome é obrigatório.'); return }
    setLoading(true); setErro('')

    const dados = { ...form, empresa_id: empresa.id }
    const service = isCliente ? Clientes : Fornecedores

    const { error } = editData
      ? await service.atualizar(editData.id, dados)
      : await service.criar(dados)

    setLoading(false)
    if (error) { setErro(error.message); return }
    setSucesso(true)
    setTimeout(() => { onSaved?.(); onBack?.() }, 1500)
  }

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

  return (
    <>
      <style>{FORM_CSS}</style>
      <div className="form-page fade-up">
        <div className="form-header">
          <div className="form-back" onClick={onBack}>←</div>
          <div>
            <div className="form-title">{editData ? 'Editar' : 'Novo'} {isCliente ? 'Cliente' : 'Fornecedor'}</div>
            <div className="form-sub">{isCliente ? 'Cadastre um cliente para vincular a recebimentos e notas fiscais' : 'Cadastre um fornecedor para vincular a pagamentos e despesas'}</div>
          </div>
        </div>

        {sucesso && <div className="success-banner">✅ {isCliente ? 'Cliente' : 'Fornecedor'} salvo com sucesso!</div>}
        {erro    && <div className="error-banner">⚠️ {erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* Dados principais */}
          <div className="form-card">
            <div className="form-section-title">Identificação</div>
            <div className="form-grid" style={{ gap: 16 }}>
              <div className="form-grid form-grid-2">
                <Field label="Tipo de Pessoa">
                  <Select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    <option value="pj">🏢 Pessoa Jurídica</option>
                    <option value="pf">👤 Pessoa Física</option>
                  </Select>
                </Field>
                <Field label={form.tipo === 'pj' ? 'CNPJ' : 'CPF'}>
                  <Input
                    placeholder={form.tipo === 'pj' ? '00.000.000/0001-00' : '000.000.000-00'}
                    value={form.cpf_cnpj}
                    onChange={e => set('cpf_cnpj', e.target.value)}
                  />
                </Field>
              </div>

              <Field label={form.tipo === 'pj' ? 'Razão Social / Nome Fantasia' : 'Nome Completo'} required>
                <Input
                  placeholder={form.tipo === 'pj' ? 'Ex: Acme Tecnologia Ltda.' : 'Ex: João Silva'}
                  value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  required
                />
              </Field>

              <div className="form-grid form-grid-2">
                <Field label="E-mail">
                  <Input type="email" placeholder="contato@empresa.com.br" value={form.email} onChange={e => set('email', e.target.value)} />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <Input placeholder="(17) 99999-9999" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
                </Field>
              </div>

              {isCliente && (
                <Field label="Limite de Crédito" hint="Opcional">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>R$</span>
                    <Input style={{ paddingLeft: 36 }} type="number" min="0" step="0.01" placeholder="0,00" value={form.limite_credito} onChange={e => set('limite_credito', e.target.value)} />
                  </div>
                </Field>
              )}

              {!isCliente && (
                <Field label="Categoria do Fornecedor">
                  <Select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                    <option value="">— Selecione —</option>
                    {['Serviços', 'Produtos', 'Tecnologia', 'Infraestrutura', 'Marketing', 'RH', 'Jurídico', 'Contabilidade', 'Tributário', 'Outros'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </div>

          {/* Endereço */}
          <div className="form-card">
            <div className="form-section-title">Endereço</div>
            <div className="form-grid" style={{ gap: 16 }}>
              <div className="form-grid form-grid-2">
                <Field label="CEP">
                  <Input placeholder="00000-000" value={form.cep} onChange={e => set('cep', e.target.value)} />
                </Field>
                <Field label="Endereço">
                  <Input placeholder="Rua, número, complemento" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
                </Field>
              </div>
              <div className="form-grid form-grid-2">
                <Field label="Cidade">
                  <Input placeholder="São Paulo" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
                </Field>
                <Field label="Estado">
                  <Select value={form.estado} onChange={e => set('estado', e.target.value)}>
                    <option value="">— UF —</option>
                    {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onBack}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? '⏳ Salvando...' : `✅ Salvar ${isCliente ? 'Cliente' : 'Fornecedor'}`}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
