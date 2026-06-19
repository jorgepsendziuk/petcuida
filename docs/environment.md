# Variáveis de ambiente

Use este guia para configurar os arquivos `.env`. Nunca versione arquivos `.env` com segredos reais.

## Raiz (Supabase CLI, edge functions e Next.js)

Crie `.env.local` na **raiz do repositório**:

```
NEXT_PUBLIC_SUPABASE_URL=https://iqkppaemlaphzqcthqkt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://iqkppaemlaphzqcthqkt.functions.supabase.co
NEXT_PUBLIC_PETCUIDA_CHATBOT_SECRET=<token-compartilhado-com-edge-function>
```

Para deploy de edge functions, use também (`.env` na raiz ou secrets do Supabase):

```
SUPABASE_URL=https://iqkppaemlaphzqcthqkt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sua-chave-service-role>
CHATBOT_SERVICE_SECRET=<token-para-proteger-a-edge-function>
OPENAI_API_KEY=<sua-chave-openai>
```

> Anote os valores no painel do Supabase (Settings → API). Se as chaves vazarem, regenere imediatamente.

Opcional para admin local:

```
NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS=seu@email.com
```
