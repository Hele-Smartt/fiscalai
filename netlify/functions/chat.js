// netlify/functions/chat.js
// Proxy seguro para a API Anthropic
// Suporta mensagens de texto e arquivos (PDF/imagem) via base64

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
    // Monta o conteúdo da mensagem
    let content

    if (arquivo?.base64 && arquivo?.mediaType) {
      // Mensagem com arquivo (PDF ou imagem)
      const isPdf = arquivo.mediaType === 'application/pdf'
      content = [
        {
          type: isPdf ? 'document' : 'image',
          source: {
            type: 'base64',
            media_type: arquivo.mediaType,
            data: arquivo.base64,
          },
        },
        { type: 'text', text: message },
      ]
    } else {
      // Mensagem de texto simples
      content = message
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:
          'Você é uma IA especialista em tributação brasileira, finanças empresariais e planejamento fiscal. ' +
          'Responda de forma técnica, precisa e objetiva. Use linguagem profissional. ' +
          'Formate usando **negrito** para destaques. Inclua valores estimados quando relevante. ' +
          'Quando receber uma NF-e (PDF ou imagem), extraia os dados e responda APENAS com JSON válido.',
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${err}`)
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
    console.error('Erro na Netlify Function:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno: ' + err.message }),
    }
  }
}
