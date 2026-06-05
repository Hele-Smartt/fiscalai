// src/pages/forms/NovaContaReceber.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useCliente } from '../../lib/ClienteContext'
import { ContasReceber, Categorias, Clientes } from '../../lib/db'
import { FORM_CSS, Field, Input, Select, ValorInput } from './FormComponents'

export default function NovaContaReceber({ onBack, onSaved, editData = null }) {
  const { empresa } = useAuth()
  const { clienteId } = useCliente()
  const [loading,    setLoading]    = useState(false)
  const [sucesso,    setSucesso]    = useState(false)
  const [erro,       setErro]       = useState('')
  const [categorias, setCategorias] = useState([])
  const [clientes,   setClientes]   = useState([])

  const [form, setForm] = useState({
    descricao:          editData?.descricao          || '',
    valor:              editData?.valor              || '',
    vencimento:         editData?.vencimento         || '',
    status:             editData?.status             || 'pendente',
    cliente_id:         editData?.cliente_id         || '',
    categoria_id:       editData?.categoria_id       || '',
    nota_fiscal_numero: editData?.nota_fiscal_numero || '',
    observacao:         editData?.observacao         || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!empresa?.id) return
    Categorias.listar(empresa.id).then(({ data }) => setCategorias((data || []).filter(c => c.tipo === 'receita')))
    Clientes.listar(empresa.id).then(({ data }) => setClientes(data || []))
  }, [empresa?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor || !form.vencimento) {
      setErro('Preencha os campos obrigatórios.'); return
    }
    setLoading(true); setErro('')

    const dados = {
      ...form,
      empresa_id:   empresa.id,
      cliente_helevare_id: clienteId || null,
      valor:        parseFloat(form.valor),
      cliente_id:   form.cliente_id   || null,
      categoria_id: form.categoria_id || null,
    }

    const { error } = editData
      ? await ContasReceber.atualizar(editData.id, dados)
      : await ContasReceber.criar(dados)

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
            <div className="form-title">{editData ? 'Editar' : 'Nova'} Conta a Receber</div>
            <div className="form-sub">Registre valores a receber de clientes</div>
          </div>
        </div>

        {sucesso && <div className="success-banner">✅ Conta a receber salva com sucesso!</div>}
        {erro    && <div className="error-banner">⚠️ {erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-section-title">Dados do Recebimento</div>
            <div className="form-grid" style={{ gap: 16 }}>
              <Field label="Descrição" required>
                <Input placeholder="Ex: Serviços prestados, Venda produto X..." value={form.descricao} onChange={e => set('descricao', e.target.value)} required />
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
                    <option value="recebido">✅ Recebido</option>
                    <option value="vencido">⚠️ Vencido</option>
                    <option value="parcial">📋 Parcial</option>
                    <option value="cancelado">❌ Cancelado</option>
                  </Select>
                </Field>
              </div>

              <div className="form-grid form-grid-3">
                <Field label="Cliente">
                  <Select value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
                    <option value="">— Selecione —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </Select>
                </Field>
                <Field label="Categoria">
                  <Select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
                    <option value="">— Selecione —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                  </Select>
                </Field>
                <Field label="Nº Nota Fiscal" hint="Opcional">
                  <Input placeholder="Ex: 4801" value={form.nota_fiscal_numero} onChange={e => set('nota_fiscal_numero', e.target.value)} />
                </Field>
              </div>

              <Field label="Observação">
                <Input placeholder="Observações adicionais..." value={form.observacao} onChange={e => set('observacao', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onBack}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? '⏳ Salvando...' : '✅ Salvar Recebimento'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
