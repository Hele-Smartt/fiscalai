// netlify/functions/chat.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada.' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  const { message, arquivo } = body
  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ error: "Campo 'message' ausente" }) }
  }

  try {
    const isPdf   = arquivo?.mediaType === 'application/pdf'
    const isImage = arquivo?.mediaType?.startsWith('image/')

    let content

    if (arquivo?.base64 && isPdf) {
      if (arquivo.base64.length > 5_000_000) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'PDF muito grande. Reduza para menos de 4MB.' })
        }
      }
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: arquivo.base64 } },
        { type: 'text', text: message },
      ]
    } else if (arquivo?.base64 && isImage) {
      const mediaType = ['image/jpeg','image/png','image/gif','image/webp'].includes(arquivo.mediaType)
        ? arquivo.mediaType : 'image/jpeg'
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: arquivo.base64 } },
        { type: 'text', text: message },
      ]
    } else {
      content = message
    }

    const reqHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }
    if (isPdf) reqHeaders['anthropic-beta'] = 'pdfs-2024-09-25'

    const isNFe = message.includes('Extrai') || message.includes('NF-e') || message.includes('DANFE') || message.includes('JSON')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: isNFe
          ? `Você é especialista em leitura de Notas Fiscais brasileiras (NF-e, NFS-e, DANFE, CT-e).
Ao receber PDF ou imagem, extraia TODOS os dados visíveis.
Responda APENAS com JSON válido, sem markdown, sem texto extra, sem explicações.
Se um campo não estiver visível, use null.

Estrutura obrigatória:
{
  "numero": "número da nota",
  "serie": "série",
  "data_emissao": "YYYY-MM-DD",
  "operacao": "saida ou entrada",
  "natureza_operacao": "descrição",
  "emit_nome": "nome/razão social do emitente",
  "emit_cnpj": "CNPJ do emitente somente números",
  "dest_nome": "nome/razão social do destinatário/tomador",
  "dest_cnpj": "CNPJ do destinatário somente números",
  "valor_total": 0.00,
  "valor_produtos": 0.00,
  "valor_servicos": 0.00,
  "base_calculo": 0.00,
  "valor_icms": 0.00,
  "valor_pis": 0.00,
  "valor_cofins": 0.00,
  "valor_iss": 0.00,
  "valor_ipi": 0.00,
  "valor_inss": 0.00,
  "chave_acesso": "44 dígitos se visível",
  "tipo_nota": "nfe ou nfse ou cte",
  "itens": []
}`
          : `Você é especialista em tributação brasileira e finanças empresariais.
Responda em português, de forma técnica e objetiva.
Use **negrito** para destaques.`,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Erro na API Anthropic: ${response.status} — ${errText.slice(0,300)}` })
      }
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || 'Sem resposta.'

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ reply }),
    }
  } catch (err) {
    console.error('Erro na Function:', err.message)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Erro interno: ' + err.message }),
    }
  }
}
