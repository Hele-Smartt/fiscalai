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
      // PDF — verifica tamanho (base64 de 4MB PDF = ~5.3MB string)
      if (arquivo.base64.length > 5_000_000) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'PDF muito grande. Reduza o arquivo para menos de 4MB.' })
        }
      }
      content = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: arquivo.base64 },
        },
        { type: 'text', text: message },
      ]
    } else if (arquivo?.base64 && isImage) {
      const mediaType = ['image/jpeg','image/png','image/gif','image/webp'].includes(arquivo.mediaType)
        ? arquivo.mediaType : 'image/jpeg'
      content = [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: arquivo.base64 },
        },
        { type: 'text', text: message },
      ]
    } else {
      content = message
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }
    if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system:
          'Você é especialista em tributação brasileira e leitura de Notas Fiscais (NF-e/DANFE). ' +
          'Quando receber um PDF ou imagem de NF-e/DANFE, extraia TODOS os dados disponíveis. ' +
          'Responda APENAS com JSON válido e nada mais. Sem markdown, sem texto extra, sem explicações. ' +
          'Se não conseguir ler algum campo, use null.',
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Erro na API: ${response.status} — ${errText.slice(0,200)}` })
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
