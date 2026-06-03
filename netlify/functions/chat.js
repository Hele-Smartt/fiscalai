// netlify/functions/chat.js
// Proxy seguro para a API Anthropic
// Suporta texto, imagens (base64) e PDFs

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
    let content
    const isPdf   = arquivo?.mediaType === 'application/pdf'
    const isImage = arquivo?.mediaType?.startsWith('image/')

    if (arquivo?.base64 && isPdf) {
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: arquivo.base64,
          },
        },
        { type: 'text', text: message },
      ]
    } else if (arquivo?.base64 && isImage) {
      const mediaType = ['image/jpeg','image/png','image/gif','image/webp'].includes(arquivo.mediaType)
        ? arquivo.mediaType : 'image/jpeg'
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: arquivo.base64,
          },
        },
        { type: 'text', text: message },
      ]
    } else {
      content = message
    }

    // Headers — adiciona beta só para PDF
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
        max_tokens: 1500,
        system:
          'Você é especialista em tributação brasileira e leitura de Notas Fiscais. ' +
          'Quando receber NF-e (PDF ou imagem), extraia os dados e responda APENAS com JSON válido, sem markdown, sem texto extra. ' +
          'Para perguntas gerais, responda em português de forma técnica e objetiva com **negrito** para destaques.',
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Anthropic API ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || 'Sem resposta.'

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ reply }),
    }
  } catch (err) {
    console.error('Erro na Function:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
