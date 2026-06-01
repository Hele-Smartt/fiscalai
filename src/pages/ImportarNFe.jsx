// src/pages/ImportarNFe.jsx
// Importação de NF-e via XML (upload) ou chave de acesso
// Faz parse do XML, salva no banco e cria lançamento automático

import { useState, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { NotasFiscais, Lancamentos, Categorias } from '../lib/db'
import { supabase } from '../lib/supabase'

const CSS = `
  .nfe-page { max-width: 900px; margin: 0 auto; }
  .nfe-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
  .nfe-back { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; transition: var(--transition); flex-shrink: 0; }
  .nfe-back:hover { background: rgba(255,255,255,0.1); }

  .upload-zone {
    border: 2px dashed var(--border2); border-radius: var(--radius2);
    padding: 48px 24px; text-align: center; cursor: pointer;
    transition: var(--transition); background: var(--card);
  }
  .upload-zone:hover, .upload-zone.drag { border-color: var(--accent); background: rgba(0,212,160,0.04); }
  .upload-icon { font-size: 48px; margin-bottom: 12px; }
  .upload-title { font-family: var(--font-head); font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .upload-sub { font-size: 13px; color: var(--text3); }
  .upload-btn { display: inline-block; margin-top: 16px; padding: 10px 24px; border-radius: var(--radius); background: var(--accent); color: var(--bg); font-weight: 700; font-size: 13px; cursor: pointer; transition: var(--transition); }
  .upload-btn:hover { background: #00edb3; }

  .chave-row { display: flex; gap: 10px; margin-top: 20px; }
  .chave-input { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; color: var(--text); font-family: monospace; font-size: 13px; outline: none; letter-spacing: 1px; }
  .chave-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,160,0.1); }

  .nfe-preview {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 24px; margin-top: 20px;
  }
  .nfe-preview-title { font-family: var(--font-head); font-weight: 700; font-size: 15px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
  .nfe-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .nfe-row:last-child { border-bottom: none; }
  .nfe-row-label { color: var(--text2); }
  .nfe-row-value { color: var(--text); font-weight: 500; text-align: right; max-width: 60%; }

  .trib-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 16px 0; }
  .trib-item { background: var(--bg3); border-radius: var(--radius); padding: 12px; text-align: center; }
  .trib-label { font-size: 11px; color: var(--text3); margin-bottom: 4px; }
  .trib-value { font-family: var(--font-head); font-size: 15px; font-weight: 700; }

  .nfe-list { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
  .nfe-item { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; display: flex; align-items: center; gap: 14px; transition: var(--transition); }
  .nfe-item:hover { border-color: var(--border2); }
  .nfe-item-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .nfe-item-info { flex: 1; min-width: 0; }
  .nfe-item-title { font-weight: 600; font-size: 13px; color: var(--text); }
  .nfe-item-sub { font-size: 11px; color: var(--text3); margin-top: 2px; }
  .nfe-item-val { font-family: var(--font-head); font-weight: 700; font-size: 15px; color: var(--success); }

  .progress-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin: 8px 0; }
  .progress-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s ease; }

  .step-indicator { display: flex; gap: 8px; margin-bottom: 24px; }
  .step { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text3); }
  .step.active { color: var(--accent); font-weight: 600; }
  .step.done { color: var(--success); }
  .step-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
  .step.active .step-dot { border-color: var(--accent); color: var(--accent); }
  .step.done .step-dot { border-color: var(--success); background: var(--success); color: var(--bg); }
  .step.pending .step-dot { border-color: var(--text3); }
  .step-line { flex: 1; height: 1px; background: var(--border); max-width: 40px; }
`

// ─── PARSER XML NF-e ─────────────────────────────────────────────────────────
function parseNFe(xmlString) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    const get = (tag, context = doc) => context.querySelector(tag)?.textContent?.trim() || ''
    const getNum = (tag, context = doc) => parseFloat(get(tag, context)) || 0

    // Identificação
    const ide = doc.querySelector('ide')
    const emit = doc.querySelector('emit')
    const dest = doc.querySelector('dest')
    const total = doc.querySelector('ICMSTot') || doc.querySelector('total')
    const infNFe = doc.querySelector('infNFe')

    const chave = infNFe?.getAttribute('Id')?.replace('NFe', '') || ''
    const numero = get('nNF', ide)
    const serie  = get('serie', ide)
    const dataEmissao = get('dhEmi', ide) || get('dEmi', ide)
    const natOp  = get('natOp', ide)

    // Emitente / Destinatário
    const emitCnpj = get('CNPJ', emit) || get('CPF', emit)
    const emitNome = get('xNome', emit) || get('xFant', emit)
    const destCnpj = get('CNPJ', dest) || get('CPF', dest)
    const destNome = get('xNome', dest)

    // Valores
    const vNF     = getNum('vNF',   total)
    const vProd   = getNum('vProd', total)
    const vServ   = getNum('vServ', total)
    const vICMS   = getNum('vICMS', total)
    const vPIS    = getNum('vPIS',  total)
    const vCOFINS = getNum('vCOFINS', total)
    const vIPI    = getNum('vIPI',  total)
    const vISS    = getNum('vISS',  total) || getNum('vISSQN', total)
    const vINSS   = getNum('vINSS', total)
    const vBC     = getNum('vBC',   total)

    // Alíquotas médias
    const aliqICMS   = vBC   > 0 ? vICMS   / vBC   : 0
    const aliqPIS    = vProd > 0 ? vPIS    / vProd : 0
    const aliqCOFINS = vProd > 0 ? vCOFINS / vProd : 0

    // Itens
    const itens = Array.from(doc.querySelectorAll('det')).map(det => ({
      codigo:        get('cProd', det),
      descricao:     get('xProd', det),
      ncm:           get('NCM', det),
      cfop:          get('CFOP', det),
      unidade:       get('uCom', det),
      quantidade:    getNum('qCom', det),
      valor_unitario: getNum('vUnCom', det),
      valor_total:   getNum('vProd', det),
      valor_icms:    getNum('vICMS', det.querySelector('ICMS') || det),
      valor_pis:     getNum('vPIS',  det.querySelector('PIS')  || det),
      valor_cofins:  getNum('vCOFINS', det.querySelector('COFINS') || det),
      valor_ipi:     getNum('vIPI',  det.querySelector('IPI')  || det),
    }))

    // Determina operação (entrada ou saída)
    // tpNF: 0=entrada, 1=saída
    const tpNF = get('tpNF', ide)
    const operacao = tpNF === '0' ? 'entrada' : 'saida'

    return {
      ok: true,
      numero,
      serie,
      tipo: 'nfe',
      operacao,
      status: 'autorizada',
      chave_acesso: chave,
      data_emissao: dataEmissao ? dataEmissao.slice(0, 10) : new Date().toISOString().slice(0, 10),
      valor_total:    vNF,
      valor_produtos: vProd,
      valor_servicos: vServ,
      base_calculo:   vBC,
      valor_icms:   vICMS,
      valor_pis:    vPIS,
      valor_cofins: vCOFINS,
      valor_ipi:    vIPI,
      valor_iss:    vISS,
      valor_inss:   vINSS,
      aliq_icms:    aliqICMS,
      aliq_pis:     aliqPIS,
      aliq_cofins:  aliqCOFINS,
      emit_cnpj:    emitCnpj,
      emit_nome:    emitNome,
      dest_cnpj:    destCnpj,
      dest_nome:    destNome,
      observacao:   natOp,
      itens,
      xml_conteudo: xmlString,
    }
  } catch(e) {
    return { ok: false, erro: 'XML inválido ou formato não reconhecido: ' + e.message }
  }
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function ImportarNFe({ onBack, onSaved }) {
  const { empresa, user } = useAuth()
  const [step,      setStep]      = useState(1) // 1=upload, 2=preview, 3=sucesso
  const [drag,      setDrag]      = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState('')
  const [chave,     setChave]     = useState('')
  const [nfData,    setNfData]    = useState(null)
  const [resultado, setResultado] = useState(null)
  const [progresso, setProgresso] = useState(0)
  const fileRef = useRef()

  // Lê arquivo XML
  function lerArquivo(file) {
    if (!file?.name?.endsWith('.xml')) {
      setErro('Selecione um arquivo XML de NF-e válido.'); return
    }
    const reader = new FileReader()
    reader.onload = e => processarXML(e.target.result)
    reader.readAsText(file, 'UTF-8')
  }

  function processarXML(xmlString) {
    setErro('')
    const parsed = parseNFe(xmlString)
    if (!parsed.ok) { setErro(parsed.erro); return }
    setNfData(parsed)
    setStep(2)
  }

  // Drag & Drop
  function onDrop(e) {
    e.preventDefault(); setDrag(false)
    lerArquivo(e.dataTransfer.files[0])
  }

  // Consulta por chave (simulado — integração futura com SEFAZ)
  async function consultarChave() {
    if (chave.replace(/\D/g,'').length !== 44) {
      setErro('Chave de acesso deve ter 44 dígitos.'); return
    }
    setErro('')
    // Verifica se já existe no banco
    const { data: existente } = await NotasFiscais.buscarPorChave(chave.replace(/\D/g,''))
    if (existente) {
      setErro('Esta NF-e já foi importada anteriormente.')
      return
    }
    // Cria NF simulada pela chave (sem XML disponível)
    setNfData({
      ok: true,
      numero: chave.slice(25, 34),
      serie: chave.slice(22, 25),
      tipo: 'nfe',
      operacao: 'entrada',
      status: 'autorizada',
      chave_acesso: chave.replace(/\D/g,''),
      data_emissao: new Date().toISOString().slice(0, 10),
      valor_total: 0,
      emit_nome: 'Consulta por chave — preencha o valor manualmente',
      dest_nome: empresa.nome,
      itens: [],
      valor_icms: 0, valor_pis: 0, valor_cofins: 0,
      valor_iss: 0, valor_ipi: 0, valor_inss: 0,
      _manualValor: true,
    })
    setStep(2)
  }

  // Salva NF-e e cria lançamento
  async function salvar() {
    setLoading(true); setErro(''); setProgresso(20)

    try {
      // 1. Salva NF-e
      setProgresso(40)
      const { data: nf, error: nfErr } = await NotasFiscais.criar({
        ...nfData,
        empresa_id: empresa.id,
        criado_por: user.id,
        itens: undefined,
        ok: undefined,
        _manualValor: undefined,
      })
      if (nfErr) throw new Error(nfErr.message)

      setProgresso(60)

      // 2. Salva itens se existirem
      if (nfData.itens?.length > 0 && nf?.id) {
        const { supabase: sb } = await import('../lib/supabase')
        await supabase.from('nf_itens').insert(
          nfData.itens.map(item => ({ ...item, nota_fiscal_id: nf.id }))
        )
      }

      setProgresso(80)

      // 3. Cria lançamento automático
      const descLanc = `NF-e ${nfData.numero || nfData.chave_acesso?.slice(0,8)} — ${
        nfData.operacao === 'saida' ? nfData.dest_nome : nfData.emit_nome
      }`

      await Lancamentos.criar({
        empresa_id:     empresa.id,
        descricao:      descLanc.slice(0, 200),
        valor:          nfData.valor_total || 0,
        tipo:           nfData.operacao === 'saida' ? 'entrada' : 'saida',
        status:         'confirmado',
        data_lancamento: nfData.data_emissao,
        nota_fiscal_id: nf?.id || null,
        observacao:     `Importado automaticamente via NF-e. ICMS: R$${nfData.valor_icms?.toFixed(2)} | PIS: R$${nfData.valor_pis?.toFixed(2)} | COFINS: R$${nfData.valor_cofins?.toFixed(2)}`,
        criado_por:     user.id,
      })

      setProgresso(100)
      setResultado({ nf, lancamento: descLanc })
      setStep(3)
    } catch(e) {
      setErro('Erro ao salvar: ' + e.message)
    }
    setLoading(false)
  }

  const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)
  const totalTrib = (nfData?.valor_icms||0)+(nfData?.valor_pis||0)+(nfData?.valor_cofins||0)+(nfData?.valor_iss||0)+(nfData?.valor_ipi||0)+(nfData?.valor_inss||0)

  return (
    <>
      <style>{CSS}</style>
      <div className="nfe-page fade-up">
        {/* Header */}
        <div className="nfe-header">
          <div className="nfe-back" onClick={step > 1 ? () => setStep(step-1) : onBack}>←</div>
          <div>
            <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:22}}>Importar NF-e</div>
            <div style={{fontSize:12,color:'var(--text3)'}}>Upload de XML ou consulta por chave de acesso</div>
          </div>
        </div>

        {/* Steps */}
        <div className="step-indicator">
          {[
            { n:1, label:'Upload / Chave' },
            { n:2, label:'Conferir Dados' },
            { n:3, label:'Importado'      },
          ].map((s,i) => (
            <>
              <div key={s.n} className={`step ${step===s.n?'active':step>s.n?'done':'pending'}`}>
                <div className="step-dot">{step>s.n?'✓':s.n}</div>
                <span>{s.label}</span>
              </div>
              {i < 2 && <div className="step-line" key={`l${i}`}/>}
            </>
          ))}
        </div>

        {erro && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'var(--danger)',marginBottom:16}}>⚠️ {erro}</div>}

        {/* ── STEP 1: Upload / Chave ── */}
        {step === 1 && (
          <div>
            {/* Upload XML */}
            <div
              className={`upload-zone ${drag?'drag':''}`}
              onDragOver={e=>{e.preventDefault();setDrag(true)}}
              onDragLeave={()=>setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="upload-icon">📄</div>
              <div className="upload-title">Arraste o arquivo XML da NF-e</div>
              <div className="upload-sub">ou clique para selecionar do computador</div>
              <div className="upload-btn">Selecionar XML</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:8}}>Formatos aceitos: .xml — NF-e, NFS-e, CT-e</div>
            </div>
            <input ref={fileRef} type="file" accept=".xml" style={{display:'none'}} onChange={e=>lerArquivo(e.target.files[0])} />

            {/* Divisor */}
            <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0'}}>
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
              <span style={{fontSize:12,color:'var(--text3)'}}>ou informe a chave de acesso</span>
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
            </div>

            {/* Chave de acesso */}
            <div className="chave-row">
              <input
                className="chave-input"
                placeholder="Chave de acesso com 44 dígitos (somente números)"
                value={chave}
                maxLength={44}
                onChange={e=>setChave(e.target.value.replace(/\D/g,''))}
              />
              <button
                className="btn btn-primary"
                onClick={consultarChave}
                disabled={chave.length < 44}
              >
                Consultar
              </button>
            </div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:6}}>
              {chave.length}/44 dígitos — encontrada no DANFE ou e-mail do emitente
            </div>

            {/* Histórico de importações */}
            <NFeHistorico empresaId={empresa?.id} />
          </div>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === 2 && nfData && (
          <div>
            <div className="nfe-preview">
              <div className="nfe-preview-title">
                📄 NF-e {nfData.numero} — {nfData.operacao === 'saida' ? '↑ Saída' : '↓ Entrada'}
                <span className={`badge ${nfData.operacao==='saida'?'badge-success':'badge-info'}`} style={{marginLeft:'auto'}}>
                  {nfData.operacao === 'saida' ? 'Emitida por você' : 'Recebida'}
                </span>
              </div>

              {/* Dados gerais */}
              {[
                { l:'Emitente',       v: nfData.emit_nome || '—'                          },
                { l:'Destinatário',   v: nfData.dest_nome || '—'                          },
                { l:'Data Emissão',   v: nfData.data_emissao ? new Date(nfData.data_emissao+'T12:00:00').toLocaleDateString('pt-BR') : '—' },
                { l:'Chave de Acesso',v: nfData.chave_acesso ? `${nfData.chave_acesso.slice(0,20)}...` : '—' },
                { l:'Valor Total',    v: <span style={{color:'var(--success)',fontFamily:'var(--font-head)',fontWeight:700}}>{fmt(nfData.valor_total)}</span> },
                { l:'Natureza Op.',   v: nfData.observacao || '—'                         },
              ].map((r,i) => (
                <div key={i} className="nfe-row">
                  <span className="nfe-row-label">{r.l}</span>
                  <span className="nfe-row-value">{r.v}</span>
                </div>
              ))}

              {/* Tributos */}
              <div style={{marginTop:20,marginBottom:8,fontSize:12,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                Tributos Identificados
              </div>
              <div className="trib-grid">
                {[
                  { l:'ICMS',   v: nfData.valor_icms,   c:'#FF4757' },
                  { l:'PIS',    v: nfData.valor_pis,    c:'#0090FF' },
                  { l:'COFINS', v: nfData.valor_cofins, c:'#A855F7' },
                  { l:'ISS',    v: nfData.valor_iss,    c:'#FFB800' },
                  { l:'IPI',    v: nfData.valor_ipi,    c:'#FF6B35' },
                  { l:'INSS',   v: nfData.valor_inss,   c:'#00D4A0' },
                ].map((t,i) => (
                  <div key={i} className="trib-item">
                    <div className="trib-label">{t.l}</div>
                    <div className="trib-value" style={{color: t.v > 0 ? t.c : 'var(--text3)'}}>{fmt(t.v)}</div>
                  </div>
                ))}
              </div>
              <div style={{textAlign:'right',fontSize:13,fontWeight:700,color:'var(--danger)',marginTop:8}}>
                Total de tributos: {fmt(totalTrib)} ({nfData.valor_total > 0 ? ((totalTrib/nfData.valor_total)*100).toFixed(1) : 0}% do valor)
              </div>

              {/* Itens */}
              {nfData.itens?.length > 0 && (
                <details style={{marginTop:16}}>
                  <summary style={{cursor:'pointer',fontSize:13,color:'var(--accent)',fontWeight:600}}>
                    📦 {nfData.itens.length} itens na nota
                  </summary>
                  <div style={{marginTop:12,overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <thead>
                        <tr style={{borderBottom:'1px solid var(--border)'}}>
                          {['Descrição','Qtd','Vl. Unit.','Vl. Total','ICMS','PIS','COFINS'].map(h => (
                            <th key={h} style={{padding:'6px 8px',textAlign:'left',color:'var(--text3)',fontWeight:600}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {nfData.itens.map((item,i) => (
                          <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                            <td style={{padding:'6px 8px',color:'var(--text)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.descricao}</td>
                            <td style={{padding:'6px 8px',color:'var(--text2)'}}>{item.quantidade}</td>
                            <td style={{padding:'6px 8px',color:'var(--text2)'}}>{fmt(item.valor_unitario)}</td>
                            <td style={{padding:'6px 8px',color:'var(--text)',fontWeight:600}}>{fmt(item.valor_total)}</td>
                            <td style={{padding:'6px 8px',color:'var(--danger)'}}>{fmt(item.valor_icms)}</td>
                            <td style={{padding:'6px 8px',color:'var(--accent2)'}}>{fmt(item.valor_pis)}</td>
                            <td style={{padding:'6px 8px',color:'var(--accent4)'}}>{fmt(item.valor_cofins)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>

            {/* Lançamento que será criado */}
            <div style={{background:'rgba(0,212,160,0.06)',border:'1px solid rgba(0,212,160,0.2)',borderRadius:12,padding:16,marginTop:16,fontSize:13}}>
              <div style={{fontWeight:700,color:'var(--accent)',marginBottom:6}}>✅ Lançamento que será criado automaticamente:</div>
              <div style={{color:'var(--text2)'}}>
                <strong style={{color:'var(--text)'}}>Tipo:</strong> {nfData.operacao === 'saida' ? '↑ Entrada (receita de venda)' : '↓ Saída (compra/despesa)'}<br/>
                <strong style={{color:'var(--text)'}}>Valor:</strong> {fmt(nfData.valor_total)}<br/>
                <strong style={{color:'var(--text)'}}>Data:</strong> {nfData.data_emissao ? new Date(nfData.data_emissao+'T12:00:00').toLocaleDateString('pt-BR') : '—'}
              </div>
            </div>

            {loading && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:6}}>Salvando NF-e e criando lançamento...</div>
                <div className="progress-bar"><div className="progress-bar-fill" style={{width:`${progresso}%`}}/></div>
              </div>
            )}

            <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:20}}>
              <button className="btn btn-cancel" onClick={() => setStep(1)} disabled={loading}>← Voltar</button>
              <button className="btn btn-save" onClick={salvar} disabled={loading}>
                {loading ? '⏳ Salvando...' : '✅ Confirmar Importação'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Sucesso ── */}
        {step === 3 && resultado && (
          <div style={{textAlign:'center',padding:'48px 24px'}}>
            <div style={{fontSize:64,marginBottom:16}}>🎉</div>
            <div style={{fontFamily:'var(--font-head)',fontSize:24,fontWeight:800,color:'var(--success)',marginBottom:8}}>NF-e Importada!</div>
            <div style={{fontSize:14,color:'var(--text2)',marginBottom:32}}>
              Nota fiscal salva e lançamento financeiro criado automaticamente.
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={() => { setStep(1); setNfData(null); setChave(''); setResultado(null); }}>
                + Importar Outra NF-e
              </button>
              <button className="btn btn-ghost" onClick={() => { onSaved?.(); onBack?.(); }}>
                Ver Financeiro
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── HISTÓRICO DE NF-e IMPORTADAS ────────────────────────────────────────────
function NFeHistorico({ empresaId }) {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)

  useState(() => {
    if (!empresaId) return
    NotasFiscais.listar(empresaId, { limite: 5 }).then(({ data }) => {
      setNotas(data || [])
      setLoading(false)
    })
  }, [empresaId])

  const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)

  if (loading || notas.length === 0) return null

  return (
    <div style={{marginTop:28}}>
      <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,marginBottom:12,color:'var(--text2)'}}>
        Últimas NF-e Importadas
      </div>
      <div className="nfe-list">
        {notas.map((nf,i) => (
          <div key={i} className="nfe-item">
            <div className="nfe-item-icon" style={{background:nf.operacao==='saida'?'rgba(0,212,160,0.1)':'rgba(0,144,255,0.1)'}}>
              {nf.operacao==='saida'?'📤':'📥'}
            </div>
            <div className="nfe-item-info">
              <div className="nfe-item-title">NF-e {nf.numero} — {nf.operacao==='saida'?nf.dest_nome:nf.emit_nome}</div>
              <div className="nfe-item-sub">{new Date(nf.data_emissao+'T12:00:00').toLocaleDateString('pt-BR')} · {nf.tipo?.toUpperCase()}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="nfe-item-val">{fmt(nf.valor_total)}</div>
              <span className="badge badge-success" style={{fontSize:10}}>✓ Importada</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
