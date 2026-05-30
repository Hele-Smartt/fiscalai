# FiscalAI — Deploy na Netlify

## Estrutura do projeto

```
fiscalai/
├── index.html
├── vite.config.js
├── package.json
├── netlify.toml              ← configuração do deploy
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx              ← entry point React
│   └── App.jsx               ← aplicação completa
└── netlify/
    └── functions/
        └── chat.js           ← proxy seguro para a API Anthropic
```

---

## Deploy passo a passo

### 1. Subir para o GitHub

```bash
git init
git add .
git commit -m "feat: FiscalAI inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/fiscalai.git
git push -u origin main
```

### 2. Conectar na Netlify

1. Acesse https://app.netlify.com
2. Clique em **Add new site → Import an existing project**
3. Escolha **GitHub** e selecione o repositório `fiscalai`
4. Confirme as configurações (já detectadas pelo `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Clique em **Deploy site**

### 3. Configurar a chave da API Anthropic

1. No painel da Netlify, vá em **Site configuration → Environment variables**
2. Clique em **Add a variable**
3. Preencha:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-...` (sua chave em https://console.anthropic.com)
4. Clique em **Save**
5. Vá em **Deploys → Trigger deploy** para o novo deploy pegar a variável

### 4. Acessar o sistema

Após o deploy (≈ 1-2 minutos), sua URL será:
```
https://fiscalai-XXXXX.netlify.app
```
Você pode configurar um domínio próprio em **Domain settings**.

---

## Desenvolvimento local

```bash
npm install
npm run dev        # http://localhost:5173
```

Para testar a IA localmente, crie um arquivo `.env` na raiz:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

E instale o Netlify CLI:
```bash
npm install -g netlify-cli
netlify dev        # roda frontend + functions juntos em localhost:8888
```

---

## Variáveis de ambiente necessárias

| Variável            | Onde configurar          | Descrição                        |
|---------------------|--------------------------|----------------------------------|
| `ANTHROPIC_API_KEY` | Netlify → Env Variables  | Chave da API Anthropic (obrigatória para o chat IA) |
