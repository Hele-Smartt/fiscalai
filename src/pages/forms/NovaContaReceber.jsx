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
    recorrente:         editData?.recorrente         || false,
    parcelas:           editData?.parcelas           || 1,
    observacao:         editData?.observacao         || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!empresa?.id) return
    Categorias.listar(empresa.id).then(({ data }) => setCategorias((data || []).filter(c => c.tipo === 'receita')))
    Clientes.listar(empresa.id).then(({ data }) => setClientes(data || []))
  }, [empresa?.id])

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
      empresa_id:   empresa.id,
      cliente_helevare_id: clienteId || null,
      descricao:    form.descricao,
      valor:        parseFloat(form.valor),
      vencimento:   form.vencimento,
      status:       form.status,
      cliente_id:   form.cliente_id   || null,
      categoria_id: form.categoria_id || null,
      nota_fiscal_numero: form.nota_fiscal_numero || null,
      observacao:   form.observacao || null,
      recorrente:   false,
      parcelas:     1,
    }

    // Edição: atualiza só o registro (não regenera)
    if (editData) {
      const { error } = await ContasReceber.atualizar(editData.id, { ...base, recorrente: form.recorrente, parcelas: parseInt(form.parcelas) || 1 })
      setLoading(false)
      if (error) { setErro(error.message); return }
      setSucesso(true); setTimeout(() => { onSaved?.(); onBack?.() }, 1200); return
    }

    const recorrente = form.recorrente === true || form.recorrente === 'true'
    const nParc = parseInt(form.parcelas) || 1
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    let linhas = []

    if (recorrente) {
      // contrato/mensalidade: um lançamento por mês, do vencimento até dezembro do exercício
      const mesV = Number(form.vencimento.slice(5, 7))
      const qtd = 12 - mesV + 1
      for (let i = 0; i < qtd; i++) {
        const venc = addMeses(form.vencimento, i)
        const lbl = `${meses[Number(venc.slice(5, 7)) - 1]}/${venc.slice(0, 4)}`
        linhas.push({ ...base, status: 'pendente', recorrente: true, parcelas: 1, parcela_atual: null,
          vencimento: venc, descricao: `${form.descricao} (${lbl})` })
      }
    } else if (nParc > 1) {
      // parcelamento: valor total dividido (última parcela absorve o arredondamento)
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
      ? await ContasReceber.criar(linhas[0])
      : await ContasReceber.criarVarios(linhas)

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

          <div className="form-card">
            <div className="form-section-title">Parcelamento e Recorrência</div>
            <div className="form-grid form-grid-2">
              <Field label="Recorrente" hint="Ex.: contrato/mensalidade">
                <Select value={form.recorrente} onChange={e => set('recorrente', e.target.value === 'true')}>
                  <option value="false">Não — recebimento único</option>
                  <option value="true">Sim — recorrente mensal (contrato)</option>
                </Select>
              </Field>
              <Field label="Número de Parcelas" hint="1 = à vista">
                <Input type="number" min="1" max="360" value={form.parcelas} onChange={e => set('parcelas', e.target.value)} disabled={form.recorrente === true || form.recorrente === 'true'} />
              </Field>
            </div>
            {(() => {
              const recorrente = form.recorrente === true || form.recorrente === 'true'
              const nParc = parseInt(form.parcelas) || 1
              let msg = null
              if (recorrente && form.vencimento) {
                const qtd = 12 - Number(form.vencimento.slice(5, 7)) + 1
                msg = `🔁 Contrato: serão gerados ${qtd} recebimentos mensais (do mês do vencimento até dez/${form.vencimento.slice(0, 4)}), com o valor cheio em cada mês.`
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
              {loading ? '⏳ Salvando...' : '✅ Salvar Recebimento'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
