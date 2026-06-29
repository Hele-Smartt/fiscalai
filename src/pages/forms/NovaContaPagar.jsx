// src/pages/forms/NovaContaPagar.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useCliente } from '../../lib/ClienteContext'
import { ContasPagar, Categorias, Fornecedores } from '../../lib/db'
import { FORM_CSS, Field, Input, Select, Textarea, ValorInput } from './FormComponents'

export default function NovaContaPagar({ onBack, onSaved, editData = null }) {
  const { empresa } = useAuth()
  const { clienteId } = useCliente()
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

  // soma N meses a uma data ISO, ajustando o dia ao último dia do mês quando necessário
  function addMeses(iso, n) {
    const [y, m, d] = iso.split('-').map(Number)
    const base = new Date(y, m - 1 + n, 1)
    const ano = base.getFullYear(), mes = base.getMonth()
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    const dia = Math.min(d, ultimoDia)
    return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor || !form.vencimento) {
      setErro('Preencha os campos obrigatórios.'); return
    }
    setLoading(true); setErro('')

    const base = {
      empresa_id:    empresa.id,
      cliente_helevare_id: clienteId || null,
      descricao:     form.descricao,
      valor:         parseFloat(form.valor),
      vencimento:    form.vencimento,
      status:        form.status,
      fornecedor_id: form.fornecedor_id || null,
      categoria_id:  form.categoria_id  || null,
      observacao:    form.observacao || null,
      recorrente:    false,
      parcelas:      1,
    }

    // Edição: atualiza só o registro (não regenera parcelas)
    if (editData) {
      const { error } = await ContasPagar.atualizar(editData.id, { ...base, recorrente: form.recorrente, parcelas: parseInt(form.parcelas) || 1 })
      setLoading(false)
      if (error) { setErro(error.message); return }
      setSucesso(true); setTimeout(() => { onSaved?.(); onBack?.() }, 1200); return
    }

    const recorrente = form.recorrente === true || form.recorrente === 'true'
    const nParc = parseInt(form.parcelas) || 1
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    let linhas = []

    if (recorrente) {
      // um lançamento por mês, do mês do vencimento até dezembro do exercício (ano do vencimento)
      const mesV = Number(form.vencimento.slice(5, 7))   // 1-12
      const qtd = 12 - mesV + 1
      for (let i = 0; i < qtd; i++) {
        const venc = addMeses(form.vencimento, i)
        const lbl = `${meses[Number(venc.slice(5, 7)) - 1]}/${venc.slice(0, 4)}`
        linhas.push({ ...base, status: 'pendente', recorrente: true, parcelas: 1, parcela_atual: null,
          vencimento: venc, descricao: `${form.descricao} (${lbl})` })
      }
    } else if (nParc > 1) {
      // N parcelas mensais; valor total dividido (última parcela absorve o arredondamento)
      const total = parseFloat(form.valor)
      const parc = Math.floor((total / nParc) * 100) / 100
      for (let i = 0; i < nParc; i++) {
        const ultima = i === nParc - 1
        const valorParc = ultima ? Math.round((total - parc * (nParc - 1)) * 100) / 100 : parc
        linhas.push({ ...base, status: 'pendente', recorrente: false, parcelas: nParc, parcela_atual: i + 1,
          valor: valorParc, vencimento: addMeses(form.vencimento, i),
          descricao: `${form.descricao} (${i + 1}/${nParc})` })
      }
    } else {
      linhas = [base]
    }

    const { error } = linhas.length === 1
      ? await ContasPagar.criar(linhas[0])
      : await ContasPagar.criarVarios(linhas)

    setLoading(false)
    if (error) { setErro(error.message); return }
    setSucesso(true)
    setTimeout(() => { onSaved?.(); onBack?.() }, 1200)
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
            {(() => {
              const recorrente = form.recorrente === true || form.recorrente === 'true'
              const nParc = parseInt(form.parcelas) || 1
              let msg = null
              if (recorrente && form.vencimento) {
                const qtd = 12 - Number(form.vencimento.slice(5, 7)) + 1
                msg = `🔁 Serão gerados ${qtd} lançamentos mensais (do mês do vencimento até dez/${form.vencimento.slice(0, 4)}), um por mês.`
              } else if (!recorrente && nParc > 1) {
                msg = `📋 Serão geradas ${nParc} parcelas mensais a partir do vencimento. O valor informado é o TOTAL e será dividido entre as parcelas.`
              }
              return msg ? (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,144,255,0.08)', border: '1px solid rgba(0,144,255,0.25)', fontSize: 12.5, color: 'var(--text2)' }}>{msg}</div>
              ) : null
            })()}
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
