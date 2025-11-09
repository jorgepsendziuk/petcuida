# Guia de deploy

## Web (Next.js 15)

1. Configure as variáveis no provedor (Vercel recomendado):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL` (opcional)
   - `NEXT_PUBLIC_PETCUIDA_CHATBOT_SECRET`
2. Execute o build localmente para validar:
   ```
   npm run build:web
   ```
3. Em Vercel, defina o comando de build como `npm run build:web` e mantenha o diretório de saída padrão (`.next`).
4. Garanta que as migrations continuem versionadas em `supabase/migrations` para uso em pipelines.

## Edge function (Supabase)

1. Garanta que as variáveis estejam definidas no Supabase CLI:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `CHATBOT_SERVICE_SECRET`
2. Deploy:
   ```
   supabase functions deploy chatbot-command --project-ref wloyrmzstrhnmdbhdkxt
   ```
3. Atualize o endpoint retornado (`https://<project>.functions.supabase.co/chatbot-command`) nas variáveis do frontend e do app mobile.

## Mobile (Expo)

1. Crie o arquivo `apps/mobile/.env` com:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   EXPO_PUBLIC_CHATBOT_ENDPOINT=...
   EXPO_PUBLIC_CHATBOT_SECRET=...
   ```
2. Valide o app em desenvolvimento:
   ```
   npm run dev:mobile
   ```
3. Configure o `eas.json` (não incluso) e execute:
   ```
   eas build -p ios
   eas build -p android
   ```

## Fluxo recomendado

- Rodar `npm run lint:all` antes de commits.
- Utilizar `supabase db push` após ajustes de schema.
- Registrar novas variáveis em `docs/environment.md`.
- Testar o chatbot acessando `/chatbot` no app web após atualização da edge function.

