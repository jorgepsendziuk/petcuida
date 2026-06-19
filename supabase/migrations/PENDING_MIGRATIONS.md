# Migrações Pendentes

## Status
✅ **TODAS AS MIGRAÇÕES APLICADAS** - Todas as migrações foram aplicadas com sucesso no banco de dados de produção em 2025-01-09.

## Lista de Migrações Pendentes

### 1. Castrated Field
**Arquivo:** `20251127000000_add_pet_castrated.sql`

**SQL para Aplicar:**
```sql
-- Add castrated field to pets table
alter table public.pets
  add column if not exists castrated boolean default false not null;
```

### 2. Deceased Fields
**Arquivo:** `20251127000002_add_pet_deceased.sql`

**SQL para Aplicar:**
```sql
-- Add deceased fields to pets table
alter table public.pets
  add column if not exists deceased boolean default false not null,
  add column if not exists death_date date;
```

### 3. Sibling Group
**Arquivo:** `20251127000001_add_pet_sibling_group.sql`

**SQL para Aplicar:**
```sql
alter table public.pets
  add column if not exists sibling_group_id uuid references public.pets (id) on delete set null;
create index if not exists pets_sibling_group_id_idx on public.pets(sibling_group_id);
```

### 4. Pet Parents
**Arquivo:** `20251126000000_add_pet_parents.sql`

**SQL para Aplicar:**
```sql
alter table public.pets
  add column mother_id uuid references public.pets (id) on delete set null;

alter table public.pets
  add column father_id uuid references public.pets (id) on delete set null;

alter table public.pets
  add column photo_url text;

-- Optional: Add indexes for parent_id columns for faster lookups
create index if not exists pets_mother_id_idx on public.pets(mother_id);
create index if not exists pets_father_id_idx on public.pets(father_id);
```

## O Que Fazer
Estas migrações precisam ser aplicadas pelo DBA no banco de dados de produção.

## Comportamento Atual do Sistema
O código está preparado para lidar com a ausência dessas colunas:
- Se qualquer coluna não existir, o sistema tentará atualizar sem esse(s) campo(s)
- Uma mensagem de aviso será exibida ao usuário informando quais migrações precisam ser aplicadas
- Os demais campos continuam funcionando normalmente
- O sistema não falhará completamente se essas colunas estiverem ausentes

## Ordem Recomendada de Aplicação
1. `20251126000000_add_pet_parents.sql` (pais e foto)
2. `20251127000000_add_pet_castrated.sql` (castrado)
3. `20251127000001_add_pet_sibling_group.sql` (grupo de irmãos)
4. `20251127000002_add_pet_deceased.sql` (falecido)

## Após Aplicar as Migrações
Após as migrações serem aplicadas pelo DBA:
1. Todos os campos serão salvos normalmente
2. As mensagens de aviso não serão mais exibidas
3. O sistema funcionará completamente com todas as funcionalidades
