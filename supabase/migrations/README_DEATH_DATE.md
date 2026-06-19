# Migração Pendente: Campos de Falecimento

## Status
⚠️ **MIGRAÇÃO PENDENTE** - Esta migração ainda não foi aplicada ao banco de dados.

## Arquivo de Migração
`20251127000002_add_pet_deceased.sql`

## SQL para Aplicar
```sql
-- Add deceased fields to pets table
alter table public.pets
  add column if not exists deceased boolean default false not null,
  add column if not exists death_date date;
```

## O Que Fazer
Esta migração precisa ser aplicada pelo DBA no banco de dados de produção.

## Comportamento Atual
O código está preparado para lidar com a ausência dessas colunas:
- Se a coluna `death_date` não existir, o sistema tentará atualizar sem esse campo
- Uma mensagem de aviso será exibida ao usuário informando que a migração precisa ser aplicada
- Os demais campos continuam funcionando normalmente

## Após Aplicar a Migração
Após a migração ser aplicada pelo DBA:
1. O campo `death_date` será salvo normalmente
2. As mensagens de aviso não serão mais exibidas
3. O sistema funcionará completamente com os campos de falecimento
