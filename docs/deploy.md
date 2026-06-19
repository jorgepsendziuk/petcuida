# Guia de deploy

## Web (Next.js) — Vercel

Projeto existente: **[petcuida.vercel.app](https://petcuida.vercel.app)** (nome do projeto: `petcuida`).

### Importante: raiz do código mudou

O app Next.js está na **raiz do repo** (`src/`), não mais em `apps/web-next`.

No painel Vercel → **petcuida** → Settings → General → **Root Directory**:

- Deixe **vazio** ou `.` (raiz do repositório)
- **Não** use `apps/web-next`

### Variáveis de ambiente (Production)

Settings → Environment Variables. Use `env.example` como referência:

| Variável | Obrigatória |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim |
| `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL` | Recomendada |
| `NEXT_PUBLIC_PETCUIDA_CHATBOT_SECRET` | Sim (chatbot) |
| `NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS` | Opcional |

### Login na CLI (Device Flow — 2025+)

```bash
npm i -g vercel@latest
vercel login
```

Abra o link exibido no terminal e autorize no navegador (OAuth Device Flow).

Depois:

```bash
npm run deploy:vercel
```

O script vincula ao projeto `petcuida`, roda `npm run build` e publica em produção.

### Opção B — Git (deploy automático)

1. Commit e push para `main` no GitHub (`jorgepsendziuk/petcuida`)
2. Vercel → petcuida → Settings → Git → confirme o repo e branch `main`
3. Cada push em `main` gera deploy automático

### Validar antes

```bash
npm run build
```

## Edge function (Supabase)

1. Garanta que as variáveis estejam definidas no Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `CHATBOT_SERVICE_SECRET`
2. Deploy:
   ```
   supabase functions deploy chatbot-command --project-ref iqkppaemlaphzqcthqkt
   supabase functions deploy prescription-ocr --project-ref iqkppaemlaphzqcthqkt
   ```

## Fluxo recomendado

- Rodar `npm run lint` antes de commits.
- Utilizar `supabase db push` após ajustes de schema.
- Registrar novas variáveis em `docs/environment.md`.
