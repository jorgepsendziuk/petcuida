# Referência: SimplesVet (dashboard)

Fonte: view-source salvo em [`../fonte/view-source_https___app.simples.vet_principal_dashboard.php.html`](../fonte/view-source_https___app.simples.vet_principal_dashboard.php.html).

**Uso:** inspiração de escopo. Nomes na coluna “PetCuida” são sugestões — não copiar na UI.

Legenda: `✓` clínica pequena costuma usar · `○` útil depois · `—` fora de escopo inicial (ERP)

---

## Dashboard (widgets)

| Widget SimplesVet | PetCuida (humano) | Prioridade |
|-------------------|-------------------|------------|
| Animais por mês / ano | Crescimento da base de pets | ○ |
| Últimos animais cadastrados | Pets recentes | ○ |
| Últimos atendimentos (24h) | Atendidos hoje | ✓ Fase 2 |
| Consultas por mês | Consultas no mês | ○ |
| Estoque abaixo do mínimo | Alerta de estoque | — |
| Saldos / lançamentos / fluxo de caixa | Financeiro | — |

---

## Módulos do menu

### Clientes / Tutores

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Cadastro de clientes | Perfil do tutor | ✓ (já existe) |
| Lista de clientes | — | ○ |
| Ranking / saldo de clientes | — | — |

### Agenda

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Agenda | Agenda simples | ○ Fase 2 |
| Escala da equipe | Horários da equipe | — |
| Configuração de agenda | Preferências de agenda | — |

### Vendas / Comercial

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Ponto de venda | — | — |
| Consulta vendas / caixa / recebimentos | — | — |
| Pacotes / lista de preços | — | — |
| Produtos e serviços | Catálogo de serviços (só referência) | — |
| Compras / estoque / inventário / marcas / fornecedores | — | — |
| Comissões | — | — |

### Inteligência

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Produtividade / vendas | — | — |

### Consultas / Relatórios

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Animais | Busca de pets (com permissão) | ✓ Fase 1 |
| Atendimentos | Histórico de atendimentos | ✓ Fase 2 |
| Vacinas | Carteira de vacinação | ✓ (parcial: cuidados) |
| Aniversários | Aniversários dos pets | ○ |
| Logs do ambiente | Auditoria (audit_log) | ✓ Fase 1 |

### Cadastros clínicos

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Espécies / pelagens / patologias | Espécie já no pet | ✓ (básico) |
| Tipos de atendimento | Tipos de cuidado | ✓ (parcial) |
| Vacinas (catálogo) | Templates de vacina | ✓ (seed) |
| Exames | — | ○ |
| Modelos de documento | — | — |

### Internamento

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Painel / execução / internamentos | — | — |
| Parâmetros clínicos / boxes / prescrição modelo | — | — |

### Financeiro

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Lançamentos / fluxo / demonstrativo / contas | — | — |
| Conciliação / contas a pagar | — | — |
| Formas de pagamento | — | — |

### Outros

| SimplesVet | PetCuida | Prioridade |
|------------|----------|------------|
| Indicação (referral) | Indicar PetCuida | ○ |
| Treinamento | Ajuda / docs | ○ |
| Perfil / senha | Perfil | ✓ |

---

## Diferenciais PetCuida (não existem no SimplesVet)

- Compartilhamento tutor ↔ clínica por **CPF + consentimento por pet**
- **Rascunhos pendentes** até o tutor liberar
- **Catálogo gratuito** de clínicas para tutores
- **Cadastro com IA** (foto → sugestão de dados)
- **LGPD-PET** com expiração de permissão
