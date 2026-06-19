# Produto e UX — AuAuAuMiau

Visão extraída do [todo.md](../todo.md). Documento vivo para acompanhamento.

## Decisão: um código ou dois?

### Situação atual

| Caminho | Stack | Status |
|---------|-------|--------|
| Raiz do repo (`src/`) | Next.js | **Único frontend** — responsivo, mobile-first |

**Resumo:** um código na raiz. Interface com cara de app no celular via browser/PWA. App Store no futuro via Capacitor, se necessário.

---

## Diretrizes visuais (app nativo na web)

Interface **grande, colorida e exagerada** — como app nativo, mas na web.

| Princípio | Como aplicar |
|-----------|----------------|
| Tiles grandes | Cada seção (Pets, Cuidados, etc.) = card colorido com foto de animal de fundo |
| Fundo vivo | Blobs gradiente + emojis de animais flutuando (animação suave) |
| Dark + neon | Fundo escuro, gradientes roxo/laranja/rosa, glassmorphism |
| Tipografia | Fredoka, títulos bold, pouco texto |
| Navegação | Bottom bar flutuante + FAB central; sem sidebar |
| Interação | Hover com scale, chips selecionáveis, botões altos |

Componentes: `NavTile`, `AnimalBackground`, `StepShell` em `src/components/`.

---

## Cuidador vs parceiro — mesma conta, papéis diferentes

**Decisão:** não criar tabela separada nem campo fixo `tipo = tutor|parceiro` em `profiles`.

| Conceito | Onde grava | Observação |
|----------|------------|------------|
| **Pessoa** (representante) | `auth.users` + `profiles` | E-mail, nome, **CPF** opcional |
| **Clínica** (PJ parceira) | `clinics` | Nome, **CNPJ**, endereço, catálogo |
| **Vínculo** | `clinic_members` | Usuário ↔ clínica (owner/staff) |

**Por quê uma conta só?**

- Veterinário/dono de clínica **também pode ter pets** (como cuidador)
- **CPF** = pessoa física (quem representa / quem autoriza compartilhamento)
- **CNPJ** = pessoa jurídica (a clínica no catálogo)
- O “tipo” na UI (**Cuidador / Parceiro**) é derivado: tem `clinic_members`? → pode ver como Parceiro; sempre pode ver como Cuidador dos próprios pets

Não é necessário `profiles.user_type` enum — evita duplicar identidade e simplifica LGPD.

---

## Cadastros passo a passo (wizard)

Sempre **um passo por tela**, mínima digitação, opção de pular.

### Cuidador (`/register`)

1. **Conta** — Google ou e-mail+senha (primeiro passo sempre)
2. **Nome** (opcional) — “Como te chamamos?”
3. **Entrar** → `/dashboard` — CPF e resto no perfil depois

### Parceiro (`/register?tipo=parceiro` → `/clinic/setup`)

1. **Conta** — **mesmo fluxo**: Google ou e-mail+senha (igual cuidador)
2. **Nome** (opcional) — representante da clínica
3. **Clínica** (`/clinic/setup`):
   - Boas-vindas + por que CNPJ ajuda
   - **CNPJ** (opcional) — busca Receita ou pular
   - **Nome da clínica** — cadastrar ou “só o nome por agora”

### Pet (`/pets/create`)

1. **Foto** — tirar ou escolher (ou “sem foto por agora”)
2. **Nome** — campo grande, um só obrigatório
3. **IA** — sugere espécie, sexo, raça, cor (opcional); “deixar pra depois” cadastra só nome+foto

Edge function: `pet-photo-analyze` (requer `OPENAI_API_KEY`).

---

## Landing (público)

- Simples, **colorida**, botões grandes
- CTAs: **Sou cuidador** | **Sou parceiro**
- Rota: `/` (não logado). Logado → `/dashboard`.

---

## Área logada

| Elemento | Como |
|--------|------|
| Home | Hub com tiles + stories dos pets + feed de cuidados |
| Cadastrar pet | FAB **+** |
| Navegação | Bottom nav flutuante |

---

## Roadmap UX

| # | Item | Status |
|---|------|--------|
| U1 | Landing colorida | [x] |
| U2 | Cadastro cuidador wizard (e-mail primeiro) | [x] |
| U3 | Cadastro parceiro wizard (e-mail → CNPJ) | [x] |
| U4 | Shell mobile-first | [x] |
| U5 | Home tiles + pets + feed | [x] |
| U6 | Cadastro pet wizard + IA | [x] |
| U7 | Diretrizes visuais nativas | [x] |

Ver também [clinica/roadmap-prioridades.md](./clinica/roadmap-prioridades.md).
