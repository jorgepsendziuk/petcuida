# Portal Clínica + Tutor — PetCuida

Documentação de acompanhamento da evolução do PetCuida de app pessoal para **plataforma dual**: tutores cuidam dos pets em casa; clínicas contribuem com informações **somente com permissão explícita**.

## Princípios

- **Gratuito e humano** — linguagem simples, sem jargão de ERP
- **LGPD-PET** — dados do pet só para quem o tutor autorizar; permissão pode **expirar** ou ser **revogada**
- **Tutor no controle** — a clínica nunca “possui” o pet; só acessa o que foi liberado
- **Inspiração, não cópia** — usamos concorrentes como referência de escopo, não de nomes ou fluxos

## Papéis (nomes na UI)

Ver [nomenclatura.md](./nomenclatura.md). Resumo:

| UI | Quem é |
|----|--------|
| **Cuidador** | Quem cuida do pet em casa |
| **Parceiro** | Clínica / equipe veterinária |
| **Admin** | Gestão da plataforma (você) |

## Documentos nesta pasta

| Arquivo | Conteúdo |
|---------|----------|
| [nomenclatura.md](./nomenclatura.md) | Cuidador, Parceiro, Admin |
| [referencia-simplesvet.md](./referencia-simplesvet.md) | Inventário do concorrente (referência) |
| [roadmap-prioridades.md](./roadmap-prioridades.md) | Fases, prioridades e status de implementação |

## Status da implementação

Atualizado conforme [roadmap-prioridades.md](./roadmap-prioridades.md).

### Fase 1 — em andamento

- [x] Documentação inicial
- [x] Schema: clínicas, membros, CPF, pedidos, grants, pendentes, auditoria
- [x] Perfil do tutor: CPF opcional
- [x] Cadastro de clínica + catálogo público
- [x] Clínica: busca por CPF + pedido de acesso
- [x] Tutor: aprovar/revogar pedidos
- [x] Fila de alterações pendentes (básico)
- [x] RLS estendida (parcial)
- [x] Clínica adicionar cuidado na ficha compartilhada (`/clinic/pets/[id]`)
- [x] Cadastro pet por foto (IA)

### Fora do escopo inicial

Estoque, PDV, financeiro completo, internamento, comissões — ver referência SimplesVet marcada como “não prioritário”.

## Modelo de dados (Fase 1)

```
profiles (+ cpf opcional)
clinics
clinic_members
pet_access_requests
pet_access_grants
pet_pending_changes
audit_log
```

Detalhes SQL em `supabase/migrations/20260618000000_clinic_portal_phase1.sql`.
