# PetCuida

Sistema de controle e cuidados para pets com dashboard web (Next.js + Ant Design), aplicativo mobile (Expo) e automações via Supabase.

## Estrutura

- `apps/web-next`: frontend web (Next.js 15 + Ant Design)
- `apps/mobile`: aplicativo Expo Router
- `supabase`: migrações, seeds e edge functions
- `docs`: documentação operacional (ambiente, deploy)

## Requisitos

- Node.js >= 18.18
- npm >= 9
- Supabase CLI (para migrações/edge)
- Expo CLI / EAS (para builds mobile)

## Primeiros passos

```bash
npm install

# web
npm run dev:web

# mobile
npm run dev:mobile
```

Defina as variáveis de ambiente consultando `docs/environment.md`.

## Qualidade e build

- `npm run lint:all` — lint web + mobile
- `npm run build:web` — build produção web

## Deploy

Consulte `docs/deploy.md` para detalhes de configuração (Vercel/Netlify, EAS, Supabase edge).

