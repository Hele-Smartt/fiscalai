// src/pages/ImportarNFe.jsx
// Importação de NF-e via XML (em massa), PDF ou imagem (JPEG/PNG)
// PDF e imagem usam Claude Vision para extração automática dos dados

import { useState, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useCliente } from '../lib/ClienteContext'
import { NotasFiscais, Lancamentos } from '../lib/db'
import { supabase } from '../lib/supabase'

const CSS = `
  .nfe-page { max-width: 900px; margin: 0 auto; }
  .nfe-back { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; transition: var(--transition); flex-shrink: 0; }
  .nfe-back:hover { background: rgba(255,255,255,0.1); }

  .fmt-tabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 24px; }
  .fmt-tab {
    padding: 16px 12px; border-radius: var(--radius); border: 2px solid var(--border);
    cursor: pointer; text-align: center; transition: var(--transition);
    font-size: 13px; font-weight: 600; color: var(--text2);
  }
  .fmt-tab:hover { border-color: var(--border2); color: var(--text); }
  .fmt-tab.active { border-color: var(--accent); color: var(--accent); background: rgba(0,212,160,0.06); }
  .fmt-tab-icon { font-size: 28px; margin-bottom: 8px; }
  .fmt-tab-desc { font-size: 11px; color: var(--text3); font-weight: 400; margin-top: 4px; }

  .upload-zone {
    border: 2px dashed var(--border2); border-radius: var(--radius2);
    padding: 48px 24px; text-align: center; cursor: pointer;
    transition: var(--transition); background: var(--card);
  }
  .upload-zone:hover, .upload-zone.drag { border-color: var(--accent); background: rgba(0,212,160,0.04); }

  .fila-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 6px; transition: var(--transition); }
  .fila-item.processando { border-color: var(--accent); background: rgba(0,212,160,0.04); }
  .fila-item.ok          { border-color: var(--success); background: rgba(0,212,160,0.04); }
  .fila-item.erro        { border-color: var(--danger);  background: rgba(255,71,87,0.04); }
  .fila-item.pendente    { opacity: 0.6; }

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

  .progress-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin: 8px 0; }
  .progress-fill { height: 100%; border-radius: 3px; background: var(--accent); transition: width 0.4s ease; }

  .spinning { animation: spin 1s linear infinite; display: inline-block; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .preview-img { max-width: 100%; max-height: 300px; border-radius: var(--radius); border: 1px solid var(--border); margin: 12px 0; }

  .nfe-hist-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 6px; }

  .ia-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(168,85,247,0.12); color: #A855F7; }
`

// ── PARSER XML ───────────────────────────────────────────────────────────────
function parseNFe(xmlString) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const get = (tag, ctx = doc) => ctx.querySelector(tag)?.textContent?.trim() || ''
    const num = (tag, ctx = doc) => parseFloat(get(tag, ctx)) || 0
    const ide = doc.querySelector('ide')
    const emit = doc.querySelector('emit')
    const dest = doc.querySelector('dest')
    const tot  = doc.querySelector('ICMSTot') || doc.querySelector('total')
    const infNFe = doc.querySelector('infNFe')
    const chave = infNFe?.getAttribute('Id')?.replace('NFe','') || ''
    const tpNF  = get('tpNF', ide)
    const vNF   = num('vNF', tot)
    const vProd = num('vProd', tot)
    const vICMS = num('vICMS', tot), vPIS = num('vPIS', tot)
    const vCOFINS = num('vCOFINS', tot), vIPI = num('vIPI', tot)
    const vISS  = num('vISS', tot) || num('vISSQN', tot)
    const vINSS = num('vINSS', tot), vBC = num('vBC', tot)
    const itens = Array.from(doc.querySelectorAll('det')).map(d => ({
      codigo: get('cProd',d), descricao: get('xProd',d), ncm: get('NCM',d),
      cfop: get('CFOP',d), unidade: get('uCom',d),
      quantidade: num('qCom',d), valor_unitario: num('vUnCom',d),
      valor_total: num('vProd',d),
      valor_icms: num('vICMS', d.querySelector('ICMS')||d),
      valor_pis:  num('vPIS',  d.querySelector('PIS') ||d),
      valor_cofins: num('vCOFINS', d.querySelector('COFINS')||d),
      valor_ipi:  num('vIPI',  d.querySelector('IPI') ||d),
    }))
    return {
      ok: true, fonte: 'xml',
      numero: get('nNF',ide), serie: get('serie',ide),
      tipo: 'nfe', operacao: tpNF==='0'?'entrada':'saida',
      status: 'autorizada', chave_acesso: chave,
      data_emissao: (get('dhEmi',ide)||get('dEmi',ide)||'').slice(0,10) || new Date().toISOString().slice(0,10),
      valor_total: vNF, valor_produtos: vProd, base_calculo: vBC,
      valor_icms: vICMS, valor_pis: vPIS, valor_cofins: vCOFINS,
      valor_ipi: vIPI, valor_iss: vISS, valor_inss: vINSS,
      aliq_icms: vBC>0?vICMS/vBC:0, aliq_pis: vProd>0?vPIS/vProd:0,
      aliq_cofins: vProd>0?vCOFINS/vProd:0,
      emit_cnpj: get('CNPJ',emit)||get('CPF',emit),
      emit_nome: get('xNome',emit)||get('xFant',emit),
      dest_cnpj: get('CNPJ',dest)||get('CPF',dest),
      dest_nome: get('xNome',dest),
      observacao: get('natOp',ide),
      itens, xml_conteudo: xmlString,
    }
  } catch(e) { return { ok:false, erro:'XML inválido: '+e.message } }
}

// ── EXTRAÇÃO VIA IA (PDF/IMAGEM) ─────────────────────────────────────────────
async function extrairViaClaude(file) {
  try {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const mediaType = isPdf ? 'application/pdf' : file.type || 'image/jpeg'

    // Converte para base64
    const base64 = await new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload  = e => res(e.target.result.split(',')[1])
      reader.onerror = rej
      reader.readAsDataURL(file)
    })

    const prompt = `Você é um especialista em leitura de Notas Fiscais brasileiras (NF-e/DANFE).
Analise este documento e extraia TODOS os dados disponíveis.
Responda APENAS com um JSON válido, sem texto adicional, sem markdown.

Estrutura esperada:
{
  "numero": "número da NF",
  "serie": "série",
  "data_emissao": "YYYY-MM-DD",
  "operacao": "saida ou entrada",
  "natureza_operacao": "texto",
  "emit_nome": "razão social emitente",
  "emit_cnpj": "CNPJ emitente",
  "dest_nome": "razão social destinatário",
  "dest_cnpj": "CNPJ destinatário",
  "valor_total": 0.00,
  "valor_produtos": 0.00,
  "base_calculo": 0.00,
  "valor_icms": 0.00,
  "valor_pis": 0.00,
  "valor_cofins": 0.00,
  "valor_iss": 0.00,
  "valor_ipi": 0.00,
  "valor_inss": 0.00,
  "chave_acesso": "44 dígitos se visível",
  "itens": [{"descricao":"","quantidade":0,"valor_unitario":0,"valor_total":0}]
}`

    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        arquivo: { base64, mediaType, nome: file.name },
      }),
    })

    const data = await response.json()
    
    // Verifica erro retornado pela função
    if (data.error) throw new Error(data.error)
    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`)
    
    const texto = data.reply || ''

    // Extrai JSON da resposta
    const jsonMatch = texto.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('IA não conseguiu extrair dados do documento. Verifique se é um DANFE legível.')
    const parsed = JSON.parse(jsonMatch[0])

    return {
      ok: true, fonte: 'ia',
      tipo: 'nfe',
      status: 'autorizada',
      operacao:     parsed.operacao     || 'saida',
      numero:       parsed.numero       || '',
      serie:        parsed.serie        || '',
      data_emissao: parsed.data_emissao || new Date().toISOString().slice(0,10),
      chave_acesso: parsed.chave_acesso || null,
      valor_total:    parseFloat(parsed.valor_total)    || 0,
      valor_produtos: parseFloat(parsed.valor_produtos) || 0,
      base_calculo:   parseFloat(parsed.base_calculo)   || 0,
      valor_icms:   parseFloat(parsed.valor_icms)   || 0,
      valor_pis:    parseFloat(parsed.valor_pis)    || 0,
      valor_cofins: parseFloat(parsed.valor_cofins) || 0,
      valor_iss:    parseFloat(parsed.valor_iss)    || 0,
      valor_ipi:    parseFloat(parsed.valor_ipi)    || 0,
      valor_inss:   parseFloat(parsed.valor_inss)   || 0,
      emit_nome:    parsed.emit_nome || '',
      emit_cnpj:    parsed.emit_cnpj || '',
      dest_nome:    parsed.dest_nome || '',
      dest_cnpj:    parsed.dest_cnpj || '',
      observacao:   parsed.natureza_operacao || '',
      itens:        parsed.itens || [],
    }
  } catch(e) {
    return { ok: false, erro: 'Falha na leitura por IA: ' + e.message }
  }
}

function lerArquivoAsync(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = e => res(e.target.result)
    r.onerror = () => rej(new Error('Falha ao ler arquivo'))
    r.readAsText(file, 'UTF-8')
  })
}

const fmt = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)
const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function ImportarNFe({ onBack, onSaved }) {
  const { empresa, user } = useAuth()
  const { clienteAtivo, clienteId } = useCliente()
  const [step,      setStep]      = useState(1)
  const [formato,   setFormato]   = useState('xml')
  const [drag,      setDrag]      = useState(false)
  const [fila,      setFila]      = useState([])
  const [processando, setProcessando] = useState(false)
  const [concluido,   setConcluido]   = useState(false)
  const [erro,      setErro]      = useState('')
  const [chave,     setChave]     = useState('')
  const [preview,   setPreview]   = useState(null)
  const fileRef = useRef()

  const totalOk    = fila.filter(i => i.status === 'ok').length
  const totalErro  = fila.filter(i => i.status === 'erro').length
  const totalValor = fila.filter(i => i.status === 'ok').reduce((s,i) => s+(i.valor||0), 0)
  const totalTrib  = fila.filter(i => i.status === 'ok' && i.dados).reduce((s,i) => {
    const d = i.dados
    return s+(d.valor_icms||0)+(d.valor_pis||0)+(d.valor_cofins||0)+(d.valor_iss||0)
  }, 0)
  const progPct = fila.length > 0 ? Math.round((fila.filter(i=>i.status==='ok'||i.status==='erro').length/fila.length)*100) : 0

  const ehXml  = (f) => f.name.toLowerCase().endsWith('.xml')
  const ehPdf  = (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
  const ehImag = (f) => /\.(jpg|jpeg|png)$/i.test(f.name) || f.type?.startsWith('image/')

  function adicionarArquivos(files) {
    const lista = Array.from(files)
    const validos = lista.filter(f => ehXml(f) || ehPdf(f) || ehImag(f))
    if (validos.length === 0) { setErro('Selecione arquivos .xml, .pdf, .jpg ou .png'); return }
    setErro('')

    // Preview para imagem única
    if (validos.length === 1 && (ehPdf(validos[0]) || ehImag(validos[0]))) {
      if (ehImag(validos[0])) {
        const url = URL.createObjectURL(validos[0])
        setPreview(url)
      } else {
        setPreview(null)
      }
    } else {
      setPreview(null)
    }

    const novos = validos.map(f => ({
      id:     Math.random().toString(36).slice(2),
      file:   f,
      nome:   f.name,
      tipo:   ehXml(f) ? 'xml' : ehPdf(f) ? 'pdf' : 'imagem',
      status: 'pendente',
      dados:  null,
      erro:   null,
      valor:  0,
    }))
    setFila(q => [...q, ...novos])
    setStep(2)
  }

  async function processarFila() {
    setProcessando(true)
    for (const item of fila.filter(i => i.status === 'pendente')) {
      setFila(q => q.map(i => i.id === item.id ? {...i, status:'processando'} : i))
      try {
        let parsed
        if (item.tipo === 'xml') {
          const xml = await lerArquivoAsync(item.file)
          parsed = parseNFe(xml)
        } else {
          // PDF ou imagem — usa Claude Vision
          parsed = await extrairViaClaude(item.file)
        }

        if (!parsed.ok) throw new Error(parsed.erro)

        // ── VALIDAÇÃO DO CNPJ ─────────────────────────────
        // O CNPJ do cliente ativo deve constar na NF-e (emit ou dest)
        if (clienteAtivo?.cnpj) {
          const cnpjCliente = clienteAtivo.cnpj.replace(/\D/g, '')
          const cnpjEmit    = (parsed.emit_cnpj || '').replace(/\D/g, '')
          const cnpjDest    = (parsed.dest_cnpj || '').replace(/\D/g, '')
          if (cnpjCliente && cnpjEmit && cnpjDest) {
            if (cnpjCliente !== cnpjEmit && cnpjCliente !== cnpjDest) {
              throw new Error(
                `CNPJ do cliente ativo (${clienteAtivo.cnpj}) não encontrado na NF-e. ` +
                `Emitente: ${parsed.emit_cnpj || 'não identificado'} | ` +
                `Destinatário: ${parsed.dest_cnpj || 'não identificado'}. ` +
                `Verifique se a NF-e pertence ao cliente "${clienteAtivo.nome}".`
              )
            }
          }
        }

        // Verifica duplicata pela chave
        if (parsed.chave_acesso) {
          const { data: exist } = await NotasFiscais.buscarPorChave(parsed.chave_acesso)
          if (exist) throw new Error('NF-e já importada anteriormente')
        }

        // Salva NF-e
        const { data: nf, error: nfErr } = await NotasFiscais.criar({
          ...parsed, itens: undefined, ok: undefined, fonte: undefined,
          empresa_id: empresa.id, criado_por: user.id,
          cliente_helevare_id: clienteId || null,
        })
        if (nfErr) throw new Error(nfErr.message)

        // Salva itens
        if (parsed.itens?.length > 0 && nf?.id) {
          await supabase.from('nf_itens').insert(
            parsed.itens.map(it => ({
              descricao:      it.descricao || '',
              quantidade:     it.quantidade || 0,
              valor_unitario: it.valor_unitario || 0,
              valor_total:    it.valor_total || 0,
              valor_icms:     it.valor_icms || 0,
              valor_pis:      it.valor_pis  || 0,
              valor_cofins:   it.valor_cofins || 0,
              nota_fiscal_id: nf.id,
            }))
          )
        }

        // Cria lançamento
        const descLanc = `NF-e ${parsed.numero||'s/n'} — ${parsed.operacao==='saida'?parsed.dest_nome:parsed.emit_nome||''}`.slice(0,200)
        await Lancamentos.criar({
          empresa_id:     empresa.id,
          descricao:      descLanc,
          valor:          parsed.valor_total || 0,
          tipo:           parsed.operacao === 'saida' ? 'entrada' : 'saida',
          status:         'confirmado',
          data_lancamento: parsed.data_emissao,
          nota_fiscal_id: nf?.id || null,
          observacao:     `${item.tipo==='xml'?'XML':'IA ('+item.tipo+')'} — ICMS:${fmt(parsed.valor_icms)} PIS:${fmt(parsed.valor_pis)} COFINS:${fmt(parsed.valor_cofins)}`,
          criado_por:     user.id,
        })

        setFila(q => q.map(i => i.id === item.id ? {...i, status:'ok', dados:parsed, valor:parsed.valor_total} : i))
      } catch(e) {
        setFila(q => q.map(i => i.id === item.id ? {...i, status:'erro', erro:e.message} : i))
      }
    }
    setProcessando(false)
    setConcluido(true)
    setStep(3)
  }

  async function consultarChave() {
    if (chave.replace(/\D/g,'').length !== 44) { setErro('Chave deve ter 44 dígitos.'); return }
    setErro('')
    const chaveNum = chave.replace(/\D/g,'')
    const { data: exist } = await NotasFiscais.buscarPorChave(chaveNum)
    if (exist) { setErro('Esta NF-e já foi importada.'); return }
    setFila(q => [...q, {
      id: Math.random().toString(36).slice(2),
      file: null, nome: `Chave: ${chaveNum.slice(0,20)}...`,
      tipo: 'chave', status: 'pendente',
      dados: { chave_acesso: chaveNum, numero: chaveNum.slice(25,34), operacao: 'entrada', valor_total: 0 },
      erro: null, valor: 0,
    }])
    setChave(''); setStep(2)
  }

  const tipoIcon = t => ({ xml:'📄', pdf:'📑', imagem:'🖼️', chave:'🔑' }[t] || '📄')
  const statusIcon = s => ({ pendente:'⏳', processando:'🔄', ok:'✅', erro:'❌' }[s] || '⏳')

  return (
    <>
      <style>{CSS}</style>
      <div className="nfe-page fade-up">
        <div className="flex items-center gap-12 mb-20">
          <div className="nfe-back" onClick={step>1&&!processando?()=>{setStep(1);setConcluido(false)}:onBack}>←</div>
          <div>
            <div style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:22}}>Importar NF-e</div>
            <div style={{fontSize:12,color:'var(--text3)'}}>XML, PDF ou foto — individual ou em lote</div>
          </div>
        </div>

        {/* Steps */}
        <div className="step-indicator">
          {[{n:1,l:'Upload'},{n:2,l:'Fila'},{n:3,l:'Concluído'}].map((s,i) => (
            <>
              <div key={s.n} className={`step ${step===s.n?'active':step>s.n?'done':'pending'}`}>
                <div className="step-dot">{step>s.n?'✓':s.n}</div>
                <span>{s.l}</span>
              </div>
              {i<2 && <div className="step-line" key={`l${i}`}/>}
            </>
          ))}
        </div>

        {/* Aviso CNPJ do cliente ativo */}
        {clienteAtivo ? (
          <div style={{background:'rgba(0,212,160,0.06)',border:'1px solid rgba(0,212,160,0.2)',borderRadius:10,padding:'10px 16px',fontSize:12,marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:16}}>🏢</span>
            <div>
              <span style={{color:'var(--text2)'}}>Cliente ativo: </span>
              <strong style={{color:'var(--accent)'}}>{clienteAtivo.nome}</strong>
              {clienteAtivo.cnpj && (
                <> — <span style={{color:'var(--text2)'}}>CNPJ: </span>
                <strong style={{color:'var(--text)',fontFamily:'monospace'}}>{clienteAtivo.cnpj}</strong>
                <span style={{color:'var(--text3)',fontSize:11,marginLeft:8}}>
                  (deve constar na NF-e como emitente ou destinatário)
                </span></>
              )}
              {!clienteAtivo.cnpj && (
                <span style={{color:'var(--warn)',marginLeft:8}}>
                  ⚠️ CNPJ não cadastrado — validação desabilitada
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{background:'rgba(255,184,0,0.08)',border:'1px solid rgba(255,184,0,0.2)',borderRadius:10,padding:'10px 16px',fontSize:12,color:'var(--warn)',marginBottom:16}}>
            ⚠️ Nenhum cliente ativo selecionado. Volte à tela inicial e selecione um cliente.
          </div>
        )}

        {erro && <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.2)',borderRadius:10,padding:'12px 16px',fontSize:13,color:'var(--danger)',marginBottom:16}}>⚠️ {erro}</div>}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            {/* Tabs de formato */}
            <div className="fmt-tabs">
              {[
                { id:'xml',    icon:'📄', label:'XML (NF-e)',    desc:'Arquivo oficial — dados 100% precisos · múltiplos arquivos' },
                { id:'pdf',    icon:'📑', label:'PDF (DANFE)',   desc:'IA extrai dados automaticamente do DANFE' },
                { id:'imagem', icon:'🖼️', label:'Foto / JPEG / PNG', desc:'IA lê a foto da NF-e ou DANFE impresso' },
              ].map(f => (
                <div key={f.id} className={`fmt-tab ${formato===f.id?'active':''}`} onClick={() => setFormato(f.id)}>
                  <div className="fmt-tab-icon">{f.icon}</div>
                  <div>{f.label}</div>
                  <div className="fmt-tab-desc">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* Upload zone */}
            <div
              className={`upload-zone ${drag?'drag':''}`}
              onDragOver={e=>{e.preventDefault();setDrag(true)}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);adicionarArquivos(e.dataTransfer.files)}}
              onClick={() => fileRef.current?.click()}
            >
              <div style={{fontSize:48,marginBottom:12}}>
                {formato==='xml'?'📄':formato==='pdf'?'📑':'🖼️'}
              </div>
              <div style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:6}}>
                {formato==='xml' ? 'Arraste um ou vários arquivos XML'
                 : formato==='pdf' ? 'Arraste o PDF do DANFE'
                 : 'Arraste a foto da NF-e (JPEG ou PNG)'}
              </div>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>
                {formato==='xml' ? 'NF-e, NFS-e, CT-e · Sem limite de arquivos'
                 : formato==='pdf' ? 'A IA vai ler e extrair todos os dados automaticamente'
                 : 'Tire uma foto nítida do DANFE ou da NF-e impressa'}
              </div>
              <div style={{display:'inline-block',padding:'10px 24px',borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',fontWeight:700,fontSize:13}}>
                Selecionar {formato==='xml'?'XMLs':formato==='pdf'?'PDF':'Imagem'}
              </div>
              {(formato==='pdf'||formato==='imagem') && (
                <div style={{marginTop:12,display:'inline-flex',alignItems:'center',gap:6}}>
                  <span className="ia-badge">🤖 IA Vision</span>
                  <span style={{fontSize:11,color:'var(--text3)'}}>Powered by Claude</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef} style={{display:'none'}}
              type="file"
              accept={formato==='xml'?'.xml':formato==='pdf'?'.pdf':'.jpg,.jpeg,.png'}
              multiple={formato==='xml'}
              onChange={e=>adicionarArquivos(e.target.files)}
            />

            {/* Preview imagem */}
            {preview && (
              <div style={{textAlign:'center',marginTop:16}}>
                <img src={preview} className="preview-img" alt="Preview" />
                <div style={{fontSize:12,color:'var(--text3)'}}>A IA vai analisar esta imagem</div>
              </div>
            )}

            {/* Chave de acesso */}
            <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0'}}>
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
              <span style={{fontSize:12,color:'var(--text3)'}}>ou informe a chave de acesso</span>
              <div style={{flex:1,height:1,background:'var(--border)'}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <input
                style={{flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 14px',color:'var(--text)',fontFamily:'monospace',fontSize:13,outline:'none',letterSpacing:1}}
                placeholder="Chave de acesso com 44 dígitos"
                value={chave} maxLength={44}
                onChange={e=>setChave(e.target.value.replace(/\D/g,''))}
              />
              <button className="btn btn-primary" onClick={consultarChave} disabled={chave.length<44}>Adicionar</button>
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
                <span className="card-title">Fila — {fila.length} arquivo{fila.length!==1?'s':''}</span>
                {!processando && !concluido && (
                  <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>fileRef.current?.click()}>+ Adicionar mais</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".xml,.pdf,.jpg,.jpeg,.png" multiple style={{display:'none'}} onChange={e=>adicionarArquivos(e.target.files)} />

              {processando && (
                <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text2)',marginBottom:4}}>
                    <span>Processando... {fila.filter(i=>i.status==='ok'||i.status==='erro').length}/{fila.length}</span>
                    <span>{progPct}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${progPct}%`}}/></div>
                  {fila.some(i=>i.status==='processando'&&(i.tipo==='pdf'||i.tipo==='imagem')) && (
                    <div style={{fontSize:11,color:'var(--accent4)',marginTop:6,display:'flex',alignItems:'center',gap:6}}>
                      <span className="spinning">🤖</span> IA Vision processando — pode levar alguns segundos...
                    </div>
                  )}
                </div>
              )}

              <div style={{padding:'12px 16px'}}>
                {fila.map(item => (
                  <div key={item.id} className={`fila-item ${item.status}`}>
                    <span style={{fontSize:20,flexShrink:0}}>
                      {item.status==='processando' ? <span className="spinning">🔄</span> : tipoIcon(item.tipo)}
                    </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.nome}</div>
                      <div style={{fontSize:11,marginTop:2}}>
                        {item.status==='ok'    && <span style={{color:'var(--success)'}}>✅ Importada — {fmt(item.valor)} {item.dados?.fonte==='ia'&&<span className="ia-badge" style={{fontSize:10}}>🤖 IA</span>}</span>}
                        {item.status==='erro'  && <span style={{color:'var(--danger)'}}>❌ {item.erro}</span>}
                        {item.status==='processando' && <span style={{color:'var(--accent)'}}>Processando{item.tipo==='pdf'||item.tipo==='imagem'?' com IA Vision...':'...'}</span>}
                        {item.status==='pendente' && <span style={{color:'var(--text3)'}}>⏳ Aguardando · {item.tipo.toUpperCase()}</span>}
                      </div>
                    </div>
                    {!processando && item.status==='pendente' && (
                      <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:14}} onClick={()=>setFila(q=>q.filter(i=>i.id!==item.id))}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!processando && !concluido && fila.some(i=>i.status==='pendente') && (
              <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={()=>{setFila([]);setStep(1)}}>Cancelar</button>
                <button className="btn btn-primary" onClick={processarFila}>
                  ⚡ Importar {fila.filter(i=>i.status==='pendente').length} arquivo{fila.filter(i=>i.status==='pendente').length!==1?'s':''}
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
            </div>

            <div className="resumo-grid">
              {[
                { l:'Importadas',      v:totalOk,      c:'var(--success)', icon:'✅' },
                { l:'Com Erro',        v:totalErro,    c:'var(--danger)',  icon:'❌' },
                { l:'Valor Total',     v:fmt(totalValor), c:'var(--accent2)', icon:'💰' },
                { l:'Tributos Ident.', v:fmt(totalTrib),  c:'var(--accent4)', icon:'⚖️' },
              ].map((r,i) => (
                <div key={i} className="resumo-card">
                  <div style={{fontSize:24,marginBottom:4}}>{r.icon}</div>
                  <div className="resumo-val" style={{color:r.c}}>{r.v}</div>
                  <div className="resumo-lbl">{r.l}</div>
                </div>
              ))}
            </div>

            <div className="card mb-16">
              <div className="card-header"><span className="card-title">Detalhes</span></div>
              <div style={{padding:'12px 16px'}}>
                {fila.map(item => (
                  <div key={item.id} className={`fila-item ${item.status}`}>
                    <span style={{fontSize:20}}>{statusIcon(item.status)}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.nome}</div>
                      <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>
                        {item.status==='ok' && item.dados && (
                          <>NF-e {item.dados.numero} · {item.dados.emit_nome||item.dados.dest_nome} · {item.dados.fonte==='ia'?'🤖 Lida por IA':'📄 XML'}</>
                        )}
                        {item.status==='erro' && <span style={{color:'var(--danger)'}}>{item.erro}</span>}
                      </div>
                    </div>
                    {item.status==='ok' && <div style={{fontFamily:'var(--font-head)',fontWeight:700,color:'var(--success)',fontSize:14,flexShrink:0}}>{fmt(item.valor)}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button className="btn btn-primary" onClick={()=>{setFila([]);setStep(1);setConcluido(false);setPreview(null)}}>+ Importar Mais</button>
              <button className="btn btn-ghost" onClick={()=>{onSaved?.();onBack?.()}}>Ver Financeiro</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── HISTÓRICO ─────────────────────────────────────────────────────────────────
function NFeHistorico({ empresaId }) {
  const [notas, setNotas] = useState([])
  useState(() => {
    if (!empresaId) return
    NotasFiscais.listar(empresaId, { limite:5 }).then(({ data }) => setNotas(data||[]))
  }, [empresaId])
  if (notas.length === 0) return null
  return (
    <div style={{marginTop:28}}>
      <div style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,marginBottom:12,color:'var(--text2)'}}>Últimas NF-e Importadas</div>
      {notas.map((nf,i) => (
        <div key={i} className="nfe-hist-item">
          <span style={{fontSize:20}}>{nf.operacao==='saida'?'📤':'📥'}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              NF-e {nf.numero} — {nf.operacao==='saida'?nf.dest_nome:nf.emit_nome}
            </div>
            <div style={{fontSize:11,color:'var(--text3)'}}>{fmtD(nf.data_emissao)} · {nf.tipo?.toUpperCase()}</div>
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
