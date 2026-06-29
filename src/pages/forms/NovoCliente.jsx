// src/pages/forms/NovoCliente.jsx
// Cadastro de Cliente (para Contas a Receber / Entradas)
import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useCliente } from '../../lib/ClienteContext'
import { Clientes } from '../../lib/db'
import { FORM_CSS, Field, Input, Select } from './FormComponents'

export default function NovoCliente({ onBack, onSaved, editData = null }) {
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
    numero:    editData?.numero    || '',
    bairro:    editData?.bairro    || '',
    cidade:    editData?.cidade    || '',
    estado:    editData?.estado    || '',
    cep:       editData?.cep       || '',
    codigo_ibge: editData?.codigo_ibge || '',
    tipo:      editData?.tipo      || 'pj',
    limite_credito: editData?.limite_credito || '',
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
      limite_credito: form.limite_credito !== '' ? parseFloat(form.limite_credito) : null,
    }
    const { error } = editData
      ? await Clientes.atualizar(editData.id, dados)
      : await Clientes.criar(dados)
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
            <div className="form-title">{editData ? 'Editar' : 'Novo'} Cliente</div>
            <div className="form-sub">Cadastre um cliente para vincular a recebimentos e entradas</div>
          </div>
        </div>

        {sucesso && <div className="success-banner">✅ Cliente salvo com sucesso!</div>}
        {erro    && <div className="error-banner">⚠️ {erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-section-title">Identificação</div>
            <div className="form-grid" style={{gap:16}}>
              <div className="form-grid form-grid-2">
                <Field label="Tipo de Pessoa">
                  <Select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    <option value="pj">🏢 Pessoa Jurídica</option>
                    <option value="pf">👤 Pessoa Física</option>
                  </Select>
                </Field>
                <Field label={form.tipo==='pj'?'CNPJ':'CPF'}>
                  <Input placeholder={form.tipo==='pj'?'00.000.000/0001-00':'000.000.000-00'}
                    value={form.cpf_cnpj} onChange={e=>set('cpf_cnpj',e.target.value)} />
                </Field>
              </div>
              <Field label={form.tipo==='pj'?'Razão Social / Nome Fantasia':'Nome Completo'} required>
                <Input placeholder={form.tipo==='pj'?'Empresa Ltda.':'João Silva'}
                  value={form.nome} onChange={e=>set('nome',e.target.value)} required />
              </Field>
              <div className="form-grid form-grid-2">
                <Field label="E-mail">
                  <Input type="email" placeholder="contato@empresa.com" value={form.email} onChange={e=>set('email',e.target.value)} />
                </Field>
                <Field label="Telefone">
                  <Input placeholder="(17) 99999-9999" value={form.telefone} onChange={e=>set('telefone',e.target.value)} />
                </Field>
              </div>
              <Field label="Limite de Crédito">
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'var(--text3)',fontWeight:600}}>R$</span>
                  <Input style={{paddingLeft:36}} type="number" min="0" step="0.01" placeholder="0,00"
                    value={form.limite_credito} onChange={e=>set('limite_credito',e.target.value)} />
                </div>
              </Field>
            </div>
          </div>

          <div className="form-card">
            <div className="form-section-title">Endereço</div>
            <div className="form-grid" style={{gap:16}}>
              <div className="form-grid form-grid-2">
                <Field label="CEP"><Input placeholder="00000-000" value={form.cep} onChange={e=>set('cep',e.target.value)} /></Field>
                <Field label="Número"><Input placeholder="123" value={form.numero} onChange={e=>set('numero',e.target.value)} /></Field>
              </div>
              <Field label="Endereço (logradouro)"><Input placeholder="Rua / Avenida" value={form.endereco} onChange={e=>set('endereco',e.target.value)} /></Field>
              <div className="form-grid form-grid-2">
                <Field label="Bairro"><Input placeholder="Centro" value={form.bairro} onChange={e=>set('bairro',e.target.value)} /></Field>
                <Field label="Cidade"><Input placeholder="Votuporanga" value={form.cidade} onChange={e=>set('cidade',e.target.value)} /></Field>
              </div>
              <div className="form-grid form-grid-2">
                <Field label="Estado">
                  <Select value={form.estado} onChange={e=>set('estado',e.target.value)}>
                    <option value="">— UF —</option>
                    {estados.map(uf=><option key={uf}>{uf}</option>)}
                  </Select>
                </Field>
                <Field label="Código IBGE" hint="Código do município (7 dígitos)"><Input placeholder="3557105" value={form.codigo_ibge} onChange={e=>set('codigo_ibge',e.target.value)} /></Field>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onBack}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? '⏳ Salvando...' : '✅ Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
