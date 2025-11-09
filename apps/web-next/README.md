## PetCuida – Web (Next.js)

Dashboard web da plataforma PetCuida, construído com Next.js 15 (App Router), Ant Design 5 e React Query.

### Pré-requisitos

- Node.js ≥ 18.18
- Variáveis definidas conforme `docs/environment.md`

Crie um arquivo `.env.local` com:

```
NEXT_PUBLIC_SUPABASE_URL=https://wloyrmzstrhnmdbhdkxt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://wloyrmzstrhnmdbhdkxt.functions.supabase.co
NEXT_PUBLIC_PETCUIDA_CHATBOT_SECRET=<token-compartilhado-com-edge-function>
```

### Desenvolvimento

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). O `npm run dev` deve ser disparado a partir da raiz do monorepo usando o script `npm run dev:web`.

### Lint e build

```bash
npm run lint      # eslint
npm run build     # build Next.js (produce .next/)
```

### Recursos principais

- Autenticação via Supabase
- CRUD completo de pets, cuidados e lembretes
- Chatbot integrado às edge functions (`chatbot-command`)
- Gestão de perfil do tutor

Para detalhes de deploy confira `../../docs/deploy.md`.
