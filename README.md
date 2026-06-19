# AuAuAuMiau

Plataforma de cuidados para pets — **auauaumiau.com.br** — web mobile-first (Next.js) e backend Supabase.

## Estrutura

```
petcuida/
  src/           # App Next.js (único frontend)
  public/
  supabase/      # Migrações, seeds e edge functions
  docs/          # Documentação
```

## Requisitos

- Node.js >= 18.18
- npm >= 9
- Supabase CLI (migrações e edge functions)

## Primeiros passos

```bash
npm install
cp docs/environment.md .env.local   # ver variáveis em docs/environment.md
npm run dev
```

Acesse [http://localhost:3002](http://localhost:3002).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 3002) |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |

## Deploy

Consulte `docs/deploy.md` (Vercel + Supabase).
