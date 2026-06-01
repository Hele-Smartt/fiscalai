// src/pages/ImportarNFe.jsx
// Importação em massa de NF-e via XML (múltiplos arquivos) ou chave de acesso

import { useState, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { NotasFiscais, Lancamentos } from '../lib/db'
import { supabase } from '../lib/supabase'

const CSS = `
  .nfe-page { max-width: 900px; margin: 0 auto; }
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
  .upload-btn { display: inline-block; margin-top: 16px; padding: 10px 24px; border-radius: var(--radius); background: var(--accent); color: var(--bg); font-weight: 700; font-size: 13px; cursor: pointer; }

  .chave-row { display: flex; gap: 10px; margin-top: 20px; }
  .chave-input { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; color: var(--text); font-family: monospace; font-size: 13px; outline: none; letter-spacing: 1px; }
  .chave-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,160,0.1); }

  .fila-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: var(--radius);
    border: 1px solid var(--border); margin-bottom: 6px;
    transition: var(--transition);
  }
  .fila-item.processando { border-color: var(--accent); background: rgba(0,212,160,0.04); }
  .fila-item.ok         { border-color: var(--success); background: rgba(0,212,160,0.04); }
  .fila-item.erro       { border-color: var(--danger);  background: rgba(255,71,87,0.04); }
  .fila-item.pendente   { opacity: 0.6; }
  .fila-icon { font-size: 20px; flex-shrink: 0; }
  .fila-info { flex: 1; min-width: 0; }
  .fila-nome { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fila-sub  { font-size: 11px; color: var(--text3); margin-top: 2px; }
  .fila-status { font-size: 12px; font-weight: 600; flex-shrink: 0; }

  .progress-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin: 4px 0; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; background: var(--accent); }

  .resumo-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin: 20px 0; }
  .resumo-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; text-align: center; }
  .resumo-val { font-family: var(--font-head); font-size: 24px; font-weight: 800; }
  .resumo-lbl { font-size: 11px; color: var(--text3); margin-top: 4px; }

  .step-indicator { display: flex; gap: 8px; margin-bottom: 24px; align-items: center; }
  .step { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text3); }
  .step.active { color: var(--accent); font-weight: 600; }
  .step.done   { color: var(--success); }
  .step-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
  .step.done .step-dot { background: var(--success); color: var(--bg); border-color: var(--success); }
  .step-line { flex: 1; height: 1px; background: var(--border); max-width: 40px; }

  .trib-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 16px 0; }
  .trib-item { background: var(--bg3); border-radius: var(--radius); padding: 12px; text-align: center; }
  .trib-label { font-size: 11px; color: var(--text3); margin-bottom: 4px; }
  .trib-value { font-family: var(--font-head); font-size: 15px; font-weight: 700; }

  .nfe-preview { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius2); padding: 24px; margin-top: 16px; }
  .nfe-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .nfe-row:last-child { border-bottom: none; }

  .spinning { animation: spin 1s linear infinite; display: inline-block; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .nfe-hist-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 6px; }
`

// ── PARSER XML ──────────────────────────────────────────────────────────────
function parseNFe(xmlString) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const get = (tag, ctx = doc) => ctx.querySelector(tag)?.textContent?.trim() || ''
    const num = (tag, ctx = doc) => parseFloat(get(tag, ctx)) || 0

    const ide   = doc.querySelector('ide')
    const emit  = doc.querySelector('emit')
    const dest  = doc.querySelector('dest')
    const tot   = doc.querySelector('ICMSTot') || doc.querySelector('total')
    const infNFe = doc.querySelector('infNFe')

    const chave = infNFe?.getAttribute('Id')?.replace('NFe','') || ''
    const tpNF  = get('tpNF', ide)
    const vNF   = num('vNF',   tot)
    const vProd = num('vProd', tot)

    const vICMS   = num('vICMS',   tot)
    const vPIS    = num('vPIS',    tot)
    const vCOFINS = num('vCOFINS', tot)
    const vIPI    = num('vIPI',    tot)
    const vISS    = num('vISS',    tot) || num('vISSQN', tot)
    const vINSS   = num('vINSS',   tot)
    const vBC     = num('vBC',     tot)

    const itens = Array.from(doc.querySelectorAll('det')).map(d => ({
      codigo:         get('cProd', d),
      descricao:      get('xProd', d),
      ncm:            get('NCM',   d),
      cfop:           get('CFOP',  d),
      unidade:        get('uCom',  d),
      quantidade:     num('qCom',  d),
      valor_unitario: num('vUnCom',d),
      valor_total:    num('vProd', d),
      valor_icms:     num('vICMS', d.querySelector('ICMS') || d),
      valor_pis:      num('vPIS',  d.querySelector('PIS')  || d),
      valor_cofins:   num('vCOFINS', d.querySelector('COFINS') || d),
      valor_ipi:      num('vIPI',  d.querySelector('IPI')  || d),
    }))

    return {
      ok: true,
      numero:       get('nNF', ide),
      serie:        get('serie', ide),
      tipo:         'nfe',
      operacao:     tpNF === '0' ? 'entrada' : 'saida',
      status:       'autorizada',
      chave_acesso: chave,
      data_emissao: (get('dhEmi', ide) || get('dEmi', ide) || '').slice(0, 10) || new Date().toISOString().slice(0,10),
      valor_total:    vNF,
      valor_produtos: vProd,
      base_calculo:   vBC,
      valor_icms: vICMS, valor_pis: vPIS, valor_cofins: vCOFINS,
      valor_ipi:  vIPI,  valor_iss:  vISS, valor_inss:  vINSS,
      aliq_icms:    vBC   > 0 ? vICMS   / vBC   : 0,
      aliq_pis:     vProd > 0 ? vPIS    / vProd : 0,
      aliq_cofins:  vProd > 0 ? vCOFINS / vProd : 0,
      emit_cnpj: get('CNPJ', emit) || get('CPF', emit),
      emit_nome: get('xNome', emit) || get('xFant', emit),
      dest_cnpj: get('CNPJ', dest) || get('CPF', dest),
      dest_nome: get('xNome', dest),
      observacao: get('natOp', ide),
      itens,
      xml_conteudo: xmlString,
    }
  } catch(e) {
    return { ok: false, erro: 'XML inválido: ' + e.message }
  }
}

function lerArquivoAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsText(file, 'UTF-8')
  })
}

const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ImportarNFe({ onBack, onSaved }) {
  const { empresa, user } = useAuth()
  const [step,     setStep]     = useState(1)
  const [drag,     setDrag]     = useState(false)
  const [chave,    setChave]    = useState('')
  const [erro,     setErro]     = useState('')
  const [fila,     setFila]     = useState([])      // [{file, status, dados, erro}]
  const [processando, setProcessando] = useState(false)
  const [concluido,   setConcluido]   = useState(false)
  const fileRef = useRef()

  // ── Adiciona arquivos à fila ─────────────────────────────────────────────
  function adicionarArquivos(files) {
    const novos = Array.from(files)
      .filter(f => f.name.endsWith('.xml'))
      .map(f => ({ id: Math.random().toString(36).slice(2), file: f, nome: f.name, status: 'pendente', dados: null, erro: null, valor: 0 }))

    if (novos.length === 0) { setErro('Selecione arquivos .xml válidos.'); return }
    setErro('')
    setFila(q => [...q, ...novos])
    setStep(2)
  }

  function removerDaFila(id) {
    setFila(q => q.filter(i => i.id !== id))
  }

  // ── Processa fila completa ───────────────────────────────────────────────
  async function processarFila() {
    setProcessando(true)
    const ids = fila.map(i => i.id)

    for (const id of ids) {
      // Marca como processando
      setFila(q => q.map(i => i.id === id ? { ...i, status: 'processando' } : i))

      try {
        // 1. Lê XML
        const item = fila.find(i => i.id === id)
        const xml  = await lerArquivoAsync(item.file)
        const parsed = parseNFe(xml)

        if (!parsed.ok) throw new Error(parsed.erro)

        // 2. Verifica duplicata
        if (parsed.chave_acesso) {
          const { data: exist } = await NotasFiscais.buscarPorChave(parsed.chave_acesso)
          if (exist) throw new Error('NF-e já importada anteriormente')
        }

        // 3. Salva NF-e
        const { data: nf, error: nfErr } = await NotasFiscais.criar({
          ...parsed, itens: undefined, ok: undefined,
          empresa_id: empresa.id, criado_por: user.id,
        })
        if (nfErr) throw new Error(nfErr.message)

        // 4. Salva itens
        if (parsed.itens?.length > 0 && nf?.id) {
          await supabase.from('nf_itens').insert(
            parsed.itens.map(it => ({ ...it, nota_fiscal_id: nf.id }))
          )
        }

        // 5. Cria lançamento automático
        const descLanc = `NF-e ${parsed.numero || parsed.chave_acesso?.slice(0,8)} — ${
          parsed.operacao === 'saida' ? parsed.dest_nome : parsed.emit_nome
        }`.slice(0, 200)

        await Lancamentos.criar({
          empresa_id:      empresa.id,
          descricao:       descLanc,
          valor:           parsed.valor_total || 0,
          tipo:            parsed.operacao === 'saida' ? 'entrada' : 'saida',
          status:          'confirmado',
          data_lancamento: parsed.data_emissao,
          nota_fiscal_id:  nf?.id || null,
          observacao:      `NF-e importada. ICMS:${fmt(parsed.valor_icms)} PIS:${fmt(parsed.valor_pis)} COFINS:${fmt(parsed.valor_cofins)}`,
          criado_por:      user.id,
        })

        setFila(q => q.map(i => i.id === id ? { ...i, status: 'ok', dados: parsed, valor: parsed.valor_total } : i))

      } catch(e) {
        setFila(q => q.map(i => i.id === id ? { ...i, status: 'erro', erro: e.message } : i))
      }
    }

    setProcessando(false)
    setConcluido(true)
    setStep(3)
  }

  // ── Chave de acesso ──────────────────────────────────────────────────────
  async function consultarChave() {
    if (chave.replace(/\D/g,'').length !== 44) {
      setErro('Chave deve ter 44 dígitos.'); return
    }
    setErro('')
    const chaveNum = chave.replace(/\D/g,'')
    const { data: exist } = await NotasFiscais.buscarPorChave(chaveNum)
    if (exist) { setErro('Esta NF-e já foi importada.'); return }

    // Cria entrada manual pela chave
    const item = {
      id: Math.random().toString(36).slice(2),
      file: null,
      nome: `Chave: ${chaveNum.slice(0,20)}...`,
      status: 'pendente',
      dados: { chave_acesso: chaveNum, numero: chaveNum.slice(25,34), operacao: 'entrada', valor_total: 0, _manual: true },
      erro: null, valor: 0,
    }
    setFila(q => [...q, item])
    setChave('')
    setStep(2)
  }

  // ── Calcula totais ───────────────────────────────────────────────────────
  const totalOk    = fila.filter(i => i.status === 'ok').length
  const totalErro  = fila.filter(i => i.status === 'erro').length
  const totalValor = fila.filter(i => i.status === 'ok').reduce((s,i) => s + (i.valor||0), 0)
  const totalTrib  = fila.filter(i => i.status === 'ok' && i.dados).reduce((s,i) => {
    const d = i.dados
    return s + (d.valor_icms||0) + (d.valor_pis||0) + (d.valor_cofins||0) + (d.valor_iss||0)
  }, 0)
  const progPct = fila.length > 0 ? Math.round((fila.filter(i => i.status==='ok'||i.status==='erro').length / fila.length) * 100) : 0

  const statusIcon = s => ({ pendente:'⏳', processando:'🔄', ok:'✅', erro:'❌' }[s] || '⏳')
  const statusLabel = (i) => {
    if (i.status === 'ok')          return <span style={{color:'var(--success)'}}>Importada — {fmt(i.valor)}</span>
    if (i.status === 'erro')        return <span style={{color:'var(--danger)'}}>{i.erro}</span>
    if (i.status === 'processando') return <span style={{color:'var(--accent)'}}>Processando...</span>
    return <span style={{color:'var(--text3)'}}>Aguardando</span>
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="nfe-page fade-up">
        {/* Header */}
        <div className="flex items-center gap-12 mb-20">
          <div className="nfe-back" onClick={step > 1 && !processando ? () => { setStep(1); setConcluido(false) } : onBack}>←</div>
          <div>
            <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:22}}>Importar NF-e</div>
            <div style={{fontSize:12,color:'var(--text3)'}}>Upload em massa de XML ou consulta por chave de acesso</div>
          </div>
        </div>

        {/* Steps */}
        <div className="step-indicator">
          {[{n:1,l:'Upload'},{n:2,l:'Fila de Importação'},{n:3,l:'Concluído'}].map((s,i) => (
            <>
              <div key={s.n} className={`step ${step===s.n?'active':step>s.n?'done':'pending'}`}>
                <div className="step-dot">{step>s.n?'✓':s.n}</div>
                <span>{s.l}</span>
              </div>
              {i < 2 && <div className="step-line" key={`l${i}`}/>}
            </>
          ))}
        </div>

        {erro && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'var(--danger)',marginBottom:16}}>⚠️ {erro}</div>}

        {/* ── STEP 1: Upload ── */}
        {step === 1 && (
          <div>
            <div
              className={`upload-zone ${drag?'drag':''}`}
              onDragOver={e=>{e.preventDefault();setDrag(true)}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);adicionarArquivos(e.dataTransfer.files)}}
              onClick={() => fileRef.current?.click()}
            >
              <div className="upload-icon">📂</div>
              <div className="upload-title">Arraste um ou vários arquivos XML</div>
              <div className="upload-sub">Selecione múltiplas NF-e de uma só vez — processamento automático em lote</div>
              <div className="upload-btn">Selecionar XMLs</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:8}}>NF-e, NFS-e, CT-e · Sem limite de arquivos</div>
            </div>
            <input ref={fileRef} type="file" accept=".xml" multiple style={{display:'none'}} onChange={e=>adicionarArquivos(e.target.files)} />

            <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0'}}>
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
              <span style={{fontSize:12,color:'var(--text3)'}}>ou informe a chave de acesso</span>
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
            </div>

            <div className="chave-row">
              <input
                className="chave-input"
                placeholder="Chave de acesso com 44 dígitos"
                value={chave} maxLength={44}
                onChange={e=>setChave(e.target.value.replace(/\D/g,''))}
              />
              <button className="btn btn-primary" onClick={consultarChave} disabled={chave.length < 44}>
                Adicionar
              </button>
            </div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:6}}>{chave.length}/44 dígitos</div>

            <NFeHistorico empresaId={empresa?.id} />
          </div>
        )}

        {/* ── STEP 2: Fila ── */}
        {step === 2 && (
          <div>
            <div className="card mb-16">
              <div className="card-header">
                <span className="card-title">Fila de Importação — {fila.length} arquivo{fila.length!==1?'s':''}</span>
                {!processando && !concluido && (
                  <button className="btn btn-ghost" style={{fontSize:11}} onClick={() => fileRef.current?.click()}>+ Adicionar mais</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".xml" multiple style={{display:'none'}} onChange={e=>adicionarArquivos(e.target.files)} />

              {processando && (
                <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text2)',marginBottom:6}}>
                    <span>Processando... {fila.filter(i=>i.status==='ok'||i.status==='erro').length}/{fila.length}</span>
                    <span>{progPct}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${progPct}%`}}/></div>
                </div>
              )}

              <div style={{padding:'12px 16px'}}>
                {fila.map(item => (
                  <div key={item.id} className={`fila-item ${item.status}`}>
                    <span className="fila-icon">
                      {item.status === 'processando'
                        ? <span className="spinning">🔄</span>
                        : statusIcon(item.status)}
                    </span>
                    <div className="fila-info">
                      <div className="fila-nome">{item.nome}</div>
                      <div className="fila-sub">{statusLabel(item)}</div>
                    </div>
                    {!processando && item.status === 'pendente' && (
                      <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:14}} onClick={() => removerDaFila(item.id)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!processando && !concluido && fila.some(i=>i.status==='pendente') && (
              <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                <button className="btn btn-cancel" onClick={() => { setFila([]); setStep(1) }}>Cancelar</button>
                <button className="btn btn-save" onClick={processarFila}>
                  ⚡ Importar {fila.filter(i=>i.status==='pendente').length} NF-e
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Resultado ── */}
        {step === 3 && (
          <div>
            <div style={{textAlign:'center',padding:'32px 0 24px'}}>
              <div style={{fontSize:56,marginBottom:12}}>{totalErro===0?'🎉':'⚠️'}</div>
              <div style={{fontFamily:'var(--font-head)',fontSize:22,fontWeight:800,color:totalErro===0?'var(--success)':'var(--warn)',marginBottom:6}}>
                {totalErro===0 ? 'Importação Concluída!' : `${totalOk} importadas, ${totalErro} com erro`}
              </div>
              <div style={{fontSize:13,color:'var(--text3)'}}>
                Lançamentos financeiros criados automaticamente para cada NF-e importada.
              </div>
            </div>

            <div className="resumo-grid">
              {[
                { l:'Importadas',      v: totalOk,        c:'var(--success)', icon:'✅' },
                { l:'Com Erro',        v: totalErro,      c:'var(--danger)',  icon:'❌' },
                { l:'Valor Total',     v: fmt(totalValor), c:'var(--accent2)', icon:'💰' },
                { l:'Tributos Ident.', v: fmt(totalTrib),  c:'var(--accent4)', icon:'⚖️' },
              ].map((r,i) => (
                <div key={i} className="resumo-card">
                  <div style={{fontSize:24,marginBottom:4}}>{r.icon}</div>
                  <div className="resumo-val" style={{color:r.c}}>{r.v}</div>
                  <div className="resumo-lbl">{r.l}</div>
                </div>
              ))}
            </div>

            {/* Detalhes por nota */}
            <div className="card mb-16">
              <div className="card-header"><span className="card-title">Detalhes da Importação</span></div>
              <div style={{padding:'12px 16px'}}>
                {fila.map(item => (
                  <div key={item.id} className={`fila-item ${item.status}`}>
                    <span className="fila-icon">{statusIcon(item.status)}</span>
                    <div className="fila-info">
                      <div className="fila-nome">{item.nome}</div>
                      <div className="fila-sub">
                        {item.status === 'ok' && item.dados && (
                          <span>
                            NF-e {item.dados.numero} · {item.dados.emit_nome || item.dados.dest_nome} · 
                            Tributos: {fmt((item.dados.valor_icms||0)+(item.dados.valor_pis||0)+(item.dados.valor_cofins||0))}
                          </span>
                        )}
                        {item.status === 'erro' && <span style={{color:'var(--danger)'}}>{item.erro}</span>}
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      {item.status === 'ok' && <div style={{fontFamily:'var(--font-head)',fontWeight:700,color:'var(--success)',fontSize:14}}>{fmt(item.valor)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button className="btn btn-primary" onClick={() => { setFila([]); setStep(1); setConcluido(false) }}>
                + Importar Mais NF-e
              </button>
              <button className="btn btn-ghost" onClick={() => { onSaved?.(); onBack?.() }}>
                Ver Financeiro
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── HISTÓRICO ───────────────────────────────────────────────────────────────
function NFeHistorico({ empresaId }) {
  const [notas,   setNotas]   = useState([])
  const [loading, setLoading] = useState(true)

  useState(() => {
    if (!empresaId) return
    NotasFiscais.listar(empresaId, { limite: 5 }).then(({ data }) => {
      setNotas(data || []); setLoading(false)
    })
  }, [empresaId])

  if (loading || notas.length === 0) return null

  return (
    <div style={{marginTop:28}}>
      <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,marginBottom:12,color:'var(--text2)'}}>
        Últimas NF-e Importadas
      </div>
      {notas.map((nf,i) => (
        <div key={i} className="nfe-hist-item">
          <span style={{fontSize:20}}>{nf.operacao==='saida'?'📤':'📥'}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              NF-e {nf.numero} — {nf.operacao==='saida'?nf.dest_nome:nf.emit_nome}
            </div>
            <div style={{fontSize:11,color:'var(--text3)'}}>
              {new Date(nf.data_emissao+'T12:00:00').toLocaleDateString('pt-BR')} · {nf.tipo?.toUpperCase()}
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,color:'var(--success)'}}>{fmt(nf.valor_total)}</div>
            <span className="badge badge-success" style={{fontSize:10}}>✓</span>
          </div>
        </div>
      ))}
    </div>
  )
}
