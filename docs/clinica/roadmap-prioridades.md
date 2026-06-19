# Roadmap — Portal Clínica

Acompanhamento de fases. Marque `[x]` conforme for concluindo.

---

## Fase 1 — MVP clínica + tutor (atual)

Objetivo: veterinária da Jorge usa o sistema com tutores que compartilham pets por CPF.

| # | Funcionalidade | Status | Notas |
|---|----------------|--------|-------|
| 1.1 | Documentação `docs/clinica/` | [x] | README, referência, roadmap |
| 1.2 | Migration schema clínica | [x] | `20260618000000_clinic_portal_phase1.sql` |
| 1.3 | CPF opcional no perfil do tutor | [x] | `/profile` |
| 1.4 | Cadastro de clínica | [x] | `/clinic/setup` |
| 1.5 | Catálogo público de clínicas | [x] | `/clinicas` |
| 1.6 | Clínica: busca tutor por CPF | [x] | `/clinic/access` |
| 1.7 | Clínica: pedir acesso a pet | [x] | |
| 1.8 | Tutor: ver e aprovar pedidos | [x] | `/sharing` |
| 1.9 | Tutor: revogar / expirar acesso | [x] | `/sharing` |
| 1.10 | Alterações pendentes (staging) | [x] | básico em `/sharing` + rascunho na clínica |
| 1.11 | Clínica: ver pets com acesso | [x] | `/clinic/pets` |
| 1.12 | Clínica: adicionar cuidado (com grant) | [x] | `/clinic/pets/[id]` |
| 1.13 | RLS clínica + auditoria básica | [x] | prescriptions + reminders |
| 1.14 | Tipos TypeScript atualizados | [x] | `database.ts` |
| 1.16 | Admin + alternar visão Cuidador/Parceiro | [x] | `is_platform_admin`, seletor no header |

### Entidades (Fase 1)

```
clinics              — dados da clínica (catálogo)
clinic_members       — usuário ↔ clínica (owner, staff)
profiles.cpf         — opcional, habilita compartilhamento
pet_access_requests  — pedido pendente
pet_access_grants    — permissão ativa + expires_at
pet_pending_changes  — rascunhos até aprovação
audit_log            — quem fez o quê
```

---

## Fase 2 — Operação clínica leve

| # | Funcionalidade | Status |
|---|----------------|--------|
| 2.1 | Agenda simples (consultas do dia) | [x] | `/clinic/appointments` |
| 2.2 | Prontuário resumido por visita | [x] | `visit_notes` ao concluir |
| 2.3 | Lembretes de retorno para tutor e clínica | [x] | trigger + `return_remind_at` |
| 2.4 | Dashboard clínica: pendentes + hoje | [x] | `/clinic/dashboard` |

---

## Fase 2.5 — Polimento (atual)

| # | Funcionalidade | Status |
|---|----------------|--------|
| 2.5.1 | PartnerHub fullscreen (visual app) | [x] |
| 2.5.2 | Cuidador vê consultas da clínica | [x] |
| 2.5.3 | Notificações in-app (badges) | [x] |
| 2.5.4 | Rascunho completo sem grant | [x] |
| 2.5.5 | Editar perfil da clínica | [x] `/clinic/settings` |
| 2.5.6 | Convidar equipe (staff) | [x] |
| 2.5.7 | UI parceiro sem datagrids | [x] |
| 2.5.8 | Auditoria visível (hub) | [x] |
| 2.5.9 | OCR receita no contexto parceiro | [x] |

---

## Fase 3+ — Não prioritário

Estoque, PDV, financeiro, internamento, comissões, NF, inteligência comercial.

Ver [referencia-simplesvet.md](./referencia-simplesvet.md) (marcados como `—`).

---

## Decisões técnicas (Fase 1)

- **Web único** — Next.js na raiz (`src/`), responsivo no celular
- **Mesmo Auth Supabase** — papel inferido por `clinic_members` ou tutor padrão
- **CPF** — armazenado normalizado (só dígitos); busca por clínica via função security definer
- **Pendentes** — JSON em `pet_pending_changes.payload` com `change_type` + dados
- **Sem quebrar tutor atual** — RLS existente por `owner_id` permanece; grants adicionam políticas OR

---

## Changelog

| Data | Alteração |
|------|-----------|
| 2026-06-18 | Fase 1.12 + Fase 2: ficha clínica, agenda, dashboard, RLS prescriptions |
