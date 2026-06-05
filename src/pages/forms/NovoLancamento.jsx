// src/pages/forms/NovoLancamento.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useCliente } from '../../lib/ClienteContext'
import { Lancamentos, Categorias, Clientes, Fornecedores } from '../../lib/db'
import { FORM_CSS, Field, Input, Select, ValorInput } from './FormComponents'

export default function NovoLancamento({ onBack, onSaved }) {
  const { empresa } = useAuth()
  const { clienteId } = useCliente()
  const [loading,    setLoading]    = useState(false)
  const [sucesso,    setSucesso]    = useState(false)
  const [erro,       setErro]       = useState('')
  const [categorias, setCategorias] = useState([])
  const [clientes,   setClientes]   = useState([])
  const [fornecedores, setFornecedores] = useState([])

  const [form, setForm] = useState({
    tipo: 'entrada', descricao: '', valor: '',
    data_lancamento: new Date().toISOString().slice(0,10),
    data_competencia: '', categoria_id: '',
    cliente_id: '', fornecedor_id: '',
    status: 'confirmado', observacao: '',
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    if (!empresa?.id) return
    Categorias.listar(empresa.id, clienteId).then(({data}) => setCategorias(data||[]))
    Clientes.listar(empresa.id, clienteId).then(({data}) => setClientes(data||[]))
    Fornecedores.listar(empresa.id, clienteId).then(({data}) => setFornecedores(data||[]))
  }, [empresa?.id, clienteId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor) { setErro('Preencha os campos obrigatórios.'); return }
    setLoading(true); setErro('')
    const { error } = await Lancamentos.criar({
      ...form,
      empresa_id: empresa.id,
      cliente_helevare_id: clienteId || null,
      valor: parseFloat(form.valor),
      categoria_id:  form.categoria_id  || null,
      cliente_id:    form.cliente_id    || null,
      fornecedor_id: form.fornecedor_id || null,
      data_competencia: form.data_competencia || null,
    })
    setLoading(false)
    if (error) { setErro(error.message); return }
    setSucesso(true)
    setTimeout(() => { onSaved?.(); onBack?.() }, 1500)
  }

  const catFiltradas = categorias.filter(c =>
    form.tipo === 'entrada' ? c.tipo === 'receita' : c.tipo === 'despesa'
  )

  return (
    <>
      <style>{FORM_CSS}</style>
      <div className="form-page fade-up">
        <div className="form-header">
          <div className="form-back" onClick={onBack}>←</div>
          <div>
            <div className="form-title">Novo Lançamento</div>
            <div className="form-sub">Registre uma entrada ou saída financeira</div>
          </div>
        </div>

        {sucesso && <div className="success-banner">✅ Lançamento registrado!</div>}
        {erro    && <div className="error-banner">⚠️ {erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-section-title">Tipo de Lançamento</div>
            <div className="tipo-toggle">
              {['entrada','saida'].map(t => (
                <div key={t} className={`tipo-btn ${t} ${form.tipo===t?'active':''}`} onClick={()=>set('tipo',t)}>
                  {t==='entrada'?'↑ Entrada':'↓ Saída'}
                </div>
              ))}
            </div>
          </div>

          <div className="form-card">
            <div className="form-section-title">Dados do Lançamento</div>
            <div className="form-grid" style={{gap:16}}>
              <Field label="Descrição" required>
                <Input placeholder="Ex: Receita de serviços, Pagamento fornecedor..."
                  value={form.descricao} onChange={e=>set('descricao',e.target.value)} required />
              </Field>
              <div className="form-grid form-grid-2">
                <Field label="Valor" required>
                  <ValorInput value={form.valor} onChange={e=>set('valor',e.target.value)} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={e=>set('status',e.target.value)}>
                    <option value="confirmado">✅ Confirmado</option>
                    <option value="pendente">⏳ Pendente</option>
                    <option value="cancelado">❌ Cancelado</option>
                  </Select>
                </Field>
              </div>
              <div className="form-grid form-grid-2">
                <Field label="Data" required>
                  <Input type="date" value={form.data_lancamento} onChange={e=>set('data_lancamento',e.target.value)} required />
                </Field>
                <Field label="Competência" hint="Opcional">
                  <Input type="date" value={form.data_competencia} onChange={e=>set('data_competencia',e.target.value)} />
                </Field>
              </div>
              <Field label="Categoria">
                <Select value={form.categoria_id} onChange={e=>set('categoria_id',e.target.value)}>
                  <option value="">— Selecione —</option>
                  {catFiltradas.map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          <div className="form-card">
            <div className="form-section-title">Vinculação</div>
            <div className="form-grid form-grid-2">
              {form.tipo==='entrada' ? (
                <Field label="Cliente" hint="Opcional">
                  <Select value={form.cliente_id} onChange={e=>set('cliente_id',e.target.value)}>
                    <option value="">— Selecione —</option>
                    {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                  </Select>
                </Field>
              ) : (
                <Field label="Fornecedor" hint="Opcional">
                  <Select value={form.fornecedor_id} onChange={e=>set('fornecedor_id',e.target.value)}>
                    <option value="">— Selecione —</option>
                    {fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Observação">
                <Input placeholder="Observações..." value={form.observacao} onChange={e=>set('observacao',e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onBack}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading?'⏳ Salvando...':'✅ Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
