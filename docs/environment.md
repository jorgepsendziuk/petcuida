# Variáveis de ambiente

Use este guia para configurar os arquivos `.env` dos diferentes pacotes. Nunca versione arquivos `.env` com segredos reais.

## Raiz (para Supabase CLI e edge functions)

Crie um arquivo `.env` na raiz do repositório contendo:

```
SUPABASE_URL=https://wloyrmzstrhnmdbhdkxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sua-chave-service-role>
CHATBOT_SERVICE_SECRET=<token-para-proteger-a-edge-function>
OPENAI_API_KEY=<sua-chave-openai>
```

## `apps/web-next/.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://wloyrmzstrhnmdbhdkxt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
# Opcional: use se precisar apontar para outra região/domínio
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://wloyrmzstrhnmdbhdkxt.functions.supabase.co
# Mesmo segredo configurado na edge function chatbot-command
NEXT_PUBLIC_PETCUIDA_CHATBOT_SECRET=<token-compartilhado-com-edge-function>
```

## `apps/mobile/.env`

Expo utiliza o prefixo `EXPO_PUBLIC_` para expor valores no bundle:

```
EXPO_PUBLIC_SUPABASE_URL=https://wloyrmzstrhnmdbhdkxt.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
EXPO_PUBLIC_CHATBOT_ENDPOINT=<url-da-edge-function-chatbot-command>
EXPO_PUBLIC_CHATBOT_SECRET=<token-compartilhado-com-edge-function>
```

> ✳️ Anote os valores exibidos no painel do Supabase do projeto `petcuida` (Settings → API). Se as chaves vazarem, regenere imediatamente na mesma tela.

