# Supabase - PetCuida

Este diretório concentra as migrações e seeds de dados do projeto. As instruções assumem que você já tem o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e autenticado na conta correta.

## Estrutura

- `migrations/` contém os scripts SQL versionados. Utilize a nomenclatura `AAAAMMDDTHHMMSS_descricao.sql`.
- `seed/` reúne seeds opcionais para dados iniciais (templates de tratamentos, etc).

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do repositório com as variáveis abaixo (nunca commitar):

```
SUPABASE_URL=https://wloyrmzstrhnmdbhdkxt.supabase.co
SUPABASE_ANON_KEY=<chave anon do projeto petcuida>
SUPABASE_SERVICE_ROLE_KEY=<chave service role do projeto petcuida>
```

> ⚠️ **Importante:** mantenha as chaves apenas em ambientes seguros (.env, variáveis de CI/CD). Regere se suspeitar de vazamento.

## Executando migrações

1. Faça login no Supabase CLI:
   ```
   supabase login
   ```
2. Aponte o projeto:
   ```
   supabase link --project-ref wloyrmzstrhnmdbhdkxt
   ```
3. Rode as migrações:
   ```
   supabase db push
   ```

## Aplicando seeds

Para popular os templates padrões execute:

```
supabase db remote run --file supabase/seed/initial_data.sql
```

> ✳️ A opção `remote run` requer a flag `--linked` (ou use `supabase link` previamente). Utilize `supabase db remote commit` apenas antes de gerar um dump remoto.

