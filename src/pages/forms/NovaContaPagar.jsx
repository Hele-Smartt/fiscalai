// src/pages/forms/NovaContaPagar.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { ContasPagar, Categorias, Fornecedores } from '../../lib/db'
import { FORM_CSS, Field, Input, Select, Textarea, ValorInput } from './FormComponents'

export default function NovaContaPagar({ onBack, onSaved, editData = null }) {
  const { empresa } = useAuth()
  const [loading,      setLoading]      = useState(false)
  const [sucesso,      setSucesso]      = useState(false)
  const [erro,         setErro]         = useState('')
  const [categorias,   setCategorias]   = useState([])
  const [fornecedores, setFornecedores] = useState([])

  const [form, setForm] = useState({
    descricao:     editData?.descricao     || '',
    valor:         editData?.valor         || '',
    vencimento:    editData?.vencimento    || '',
    status:        editData?.status        || 'pendente',
    fornecedor_id: editData?.fornecedor_id || '',
    categoria_id:  editData?.categoria_id  || '',
    recorrente:    editData?.recorrente    || false,
    parcelas:      editData?.parcelas      || 1,
    observacao:    editData?.observacao    || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!empresa?.id) return
    Categorias.listar(empresa.id).then(({ data }) => setCategorias((data || []).filter(c => c.tipo === 'despesa')))
    Fornecedores.listar(empresa.id).then(({ data }) => setFornecedores(data || []))
  }, [empresa?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor || !form.vencimento) {
      setErro('Preencha os campos obrigatórios.'); return
    }
    setLoading(true); setErro('')

    const dados = {
      ...form,
      empresa_id:    empresa.id,
      valor:         parseFloat(form.valor),
      fornecedor_id: form.fornecedor_id || null,
      categoria_id:  form.categoria_id  || null,
      parcelas:      parseInt(form.parcelas) || 1,
    }

    const { error } = editData
      ? await ContasPagar.atualizar(editData.id, dados)
      : await ContasPagar.criar(dados)

    setLoading(false)
    if (error) { setErro(error.message); return }
    setSucesso(true)
    setTimeout(() => { onSaved?.(); onBack?.() }, 1500)
  }

  return (
    <>
      <style>{FORM_CSS}</style>
      <div className="form-page fade-up">
        <div className="form-header">
          <div className="form-back" onClick={onBack}>←</div>
          <div>
            <div className="form-title">{editData ? 'Editar' : 'Nova'} Conta a Pagar</div>
            <div className="form-sub">Registre obrigações financeiras e compromissos de pagamento</div>
          </div>
        </div>

        {sucesso && <div className="success-banner">✅ Conta a pagar salva com sucesso!</div>}
        {erro    && <div className="error-banner">⚠️ {erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-section-title">Dados da Conta</div>
            <div className="form-grid" style={{ gap: 16 }}>
              <Field label="Descrição" required>
                <Input placeholder="Ex: Aluguel, Fornecedor XYZ, DARF..." value={form.descricao} onChange={e => set('descricao', e.target.value)} required />
              </Field>

              <div className="form-grid form-grid-3">
                <Field label="Valor" required>
                  <ValorInput value={form.valor} onChange={e => set('valor', e.target.value)} />
                </Field>
                <Field label="Vencimento" required>
                  <Input type="date" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} required />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="pendente">⏳ Pendente</option>
                    <option value="pago">✅ Pago</option>
                    <option value="vencido">⚠️ Vencido</option>
                    <option value="cancelado">❌ Cancelado</option>
                    <option value="parcelado">📋 Parcelado</option>
                  </Select>
                </Field>
              </div>

              <div className="form-grid form-grid-2">
                <Field label="Fornecedor">
                  <Select value={form.fornecedor_id} onChange={e => set('fornecedor_id', e.target.value)}>
                    <option value="">— Selecione —</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </Select>
                </Field>
                <Field label="Categoria">
                  <Select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                    <option value="">— Selecione —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          </div>

          <div className="form-card">
            <div className="form-section-title">Parcelamento e Recorrência</div>
            <div className="form-grid form-grid-3">
              <Field label="Recorrente">
                <Select value={form.recorrente} onChange={e => set('recorrente', e.target.value === 'true')}>
                  <option value="false">Não — pagamento único</option>
                  <option value="true">Sim — recorrente mensal</option>
                </Select>
              </Field>
              <Field label="Número de Parcelas" hint="1 = à vista">
                <Input type="number" min="1" max="360" value={form.parcelas} onChange={e => set('parcelas', e.target.value)} />
              </Field>
              <Field label="Observação">
                <Input placeholder="Nota interna..." value={form.observacao} onChange={e => set('observacao', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onBack}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? '⏳ Salvando...' : '✅ Salvar Conta'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
