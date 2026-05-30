// netlify/functions/chat.js
// Essa function roda no servidor da Netlify.
// A variável ANTHROPIC_API_KEY é configurada no painel da Netlify (nunca exposta no frontend).

exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  // Lê a chave de API do ambiente (configurada na Netlify)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada nas variáveis de ambiente da Netlify." }),
    };
  }

  let message;
  try {
    const body = JSON.parse(event.body || "{}");
    message = body.message;
    if (!message) throw new Error("Campo 'message' ausente");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Body inválido: " + e.message }) };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:
          "Você é uma IA especialista em tributação brasileira, finanças empresariais e planejamento fiscal. " +
          "Responda de forma técnica, precisa e objetiva. Use linguagem profissional. " +
          "Formate usando **negrito** para destaques. Inclua valores estimados quando relevante. " +
          "Base de conhecimento: Simples Nacional, Lucro Presumido, Lucro Real, PIS, COFINS, ICMS, " +
          "ISS, IRPJ, CSLL, INSS, jurisprudência STF/STJ, legislação tributária brasileira atualizada.",
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sem resposta da IA.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // CORS — permite chamada do próprio site
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Erro na Netlify Function:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno: " + err.message }),
    };
  }
};
