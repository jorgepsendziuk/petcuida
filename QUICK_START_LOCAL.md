# 🚀 Rodar Chatbot Localmente - Guia Rápido

## Passo 1: Iniciar Docker Desktop
Abra o Docker Desktop e aguarde até estar rodando.

## Passo 2: Criar arquivo .env
Crie um arquivo `.env` na raiz do projeto com:

```bash
SUPABASE_URL=https://wloyrmzstrhnmdbhdkxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<obtenha do dashboard do Supabase>
CHATBOT_SERVICE_SECRET=<qualquer-token-seguro>
OPENAI_API_KEY=<sua-chave-openai>
AI_MODEL=gpt-4o-mini
```

## Passo 3: Rodar localmente

```bash
npm run chatbot:local
```

Ou diretamente:
```bash
supabase functions serve chatbot-command --env-file .env
```

## Passo 4: Testar

A função estará disponível em:
```
http://localhost:54321/functions/v1/chatbot-command
```

## Configurar Frontend para usar local

No `apps/web-next/.env.local`, adicione:
```bash
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=http://localhost:54321/functions/v1
```

Depois reinicie o servidor Next.js.
