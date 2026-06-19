# Nomenclatura — PetCuida

Linguagem humana na interface. No código usamos termos técnicos em inglês; na UI, estes nomes.

## Papéis na plataforma

| Código (`Persona`) | Nome na UI | Quem é |
|--------------------|------------|--------|
| `caregiver` | **Cuidador** | Pessoa que cuida do pet em casa (família, tutor legal) |
| `partner` | **Parceiro** | Clínica veterinária ou equipe cadastrada no PetCuida |
| `admin` | **Admin** | Você — gestão da plataforma, testes, suporte |

### Por que não “tutor” ou “veterinário”?

- **Tutor** soa jurídico/frio; **Cuidador** é quem de fato cuida do pet.
- **Veterinário** é só um cargo na clínica; **Parceiro** é a clínica inteira (recepção, vet, auxiliar) sem excluir ninguém.
- Mantemos `tutor_id` etc. no banco por compatibilidade — só a UI muda.

## Frases de exemplo (UI)

| Antes | Depois |
|-------|--------|
| Área da clínica | **Área do parceiro** |
| Clínicas parceiras | **Parceiros de saúde** |
| Tutor | **Cuidador** |
| Pedido da clínica | **Pedido do parceiro** |
| Compartilhar com clínicas | **Compartilhar com parceiros** |

## Modo admin (personificar visão)

Não é login como outra pessoa — é **pré-visualizar** o menu e fluxos como Cuidador ou Parceiro, para testar sem criar contas.

- Banner laranja quando estiver em modo teste
- Admin vê seletor no topo: **Admin · Cuidador · Parceiro**
- RLS continua com seu usuário real (para testar API da clínica, cadastre uma clínica no seu login)

## Tornar-se admin

No Supabase SQL (substitua o e-mail):

```sql
update public.profiles
set is_platform_admin = true
where id = (select id from auth.users where email = 'seu@email.com');
```

Ou defina `NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS=seu@email.com` no `.env.local` (fallback para desenvolvimento).
