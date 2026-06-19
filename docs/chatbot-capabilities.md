# Capacidades do Assistente PetCuida

O assistente do PetCuida é um chatbot inteligente que utiliza a API da OpenAI (GPT-4o-mini) para interpretar comandos em linguagem natural e executar ações no sistema.

## 🎯 Ações Disponíveis

### 1. **Cadastrar Pet** (`create_pet`)

Cria um novo pet no sistema.

**Campos obrigatórios:**
- `name` - Nome do pet

**Campos opcionais:**
- `species` - Espécie (padrão: "dog")
- `breed` - Raça
- `sex` - Sexo (padrão: "unknown")
- `castrated` - Castrado (boolean, padrão: false)
- `birthdate` - Data de nascimento (formato: YYYY-MM-DD)
- `birthdateEstimated` - Se a data é estimada (boolean)
- `weightKg` - Peso em quilogramas
- `color` - Cor
- `microchipId` - Número do microchip
- `motherId` - ID da mãe (UUID de outro pet)
- `fatherId` - ID do pai (UUID de outro pet)
- `photoUrl` - Foto em base64
- `notes` - Observações adicionais

**Exemplos de uso:**
- "Cadastre um pet chamado Bolt, cachorro macho nascido em 2020"
- "Criar pet chamado Luna, gata fêmea castrada"
- "Registrar um cachorro chamado Max, raça Golden Retriever, nascido em 15/03/2019, cor preto"

---

### 2. **Cadastrar Múltiplos Pets** (`create_pets`)

Cadastra vários pets ao mesmo tempo.

**Campos obrigatórios:**
- `pets` - Array de objetos com os campos de cada pet (mesmos campos de `create_pet`)

**Exemplos de uso:**
- "Cadastrar três pets: Bolt (cachorro), Luna (gata) e Max (cachorro)"

---

### 3. **Editar Pet** (`update_pet`)

Edita um pet existente.

**Campos obrigatórios:**
- `petId` - ID do pet (identificado automaticamente pelo nome)

**Campos opcionais (todos os campos de `create_pet`):**
- `name`, `species`, `breed`, `sex`, `castrated`, `birthdate`, `birthdateEstimated`, `weightKg`, `color`, `microchipId`, `motherId`, `fatherId`, `photoUrl`, `notes`

**Exemplos de uso:**
- "Atualizar peso do Bolt para 15kg"
- "Marcar Luna como castrada"
- "Atualizar cor do Max para branco"

---

### 4. **Editar Múltiplos Pets** (`update_pets`)

Edita vários pets ao mesmo tempo.

**Campos obrigatórios:**
- `petIds` - Array de IDs dos pets (ou "todos" para aplicar a todos os pets)
- `updates` - Objeto com os campos a atualizar (castrated, weightKg, color, notes)

**Exemplos de uso:**
- "Atualizar peso de todos os pets para 10kg"
- "Marcar todos como castrados"
- "Atualizar peso de todos os cães para 12kg"
- "Adicionar nota 'Castrado em 2025' para todos os pets"

---

### 5. **Criar Tratamento/Cuidado** (`create_pet_treatment`)

Cria um novo tratamento ou cuidado para um pet.

**Campos obrigatórios:**
- `petId` - ID do pet (identificado automaticamente pelo nome)
- `title` - Título do tratamento
- `kind` - Tipo de tratamento (veja tipos abaixo)

**Campos opcionais:**
- `description` - Descrição do tratamento
- `dueDate` - Data de vencimento (formato: YYYY-MM-DD)
- `frequencyDays` - Frequência em dias (para tratamentos recorrentes)
- `notes` - Observações adicionais

**Tipos de tratamento disponíveis:**
- `vaccine` - Vacina
- `deworming` - Vermifugação
- `tick_flea` - Carrapato e pulga
- `general_medication` - Medicação geral
- `checkup` - Consulta/Check-up

**Exemplos de uso:**
- "Criar vacina para eva"
- "Cadastrar vermífugo para o Bolt, vencimento em 30 dias"
- "Registrar tratamento contra carrapato para Luna, repetir a cada 60 dias"
- "Criar consulta veterinária para Max no dia 15/12/2025"

---

### 6. **Criar Tratamento para Múltiplos Pets** (`create_pet_treatments`)

Cria o mesmo tratamento para vários pets ao mesmo tempo.

**Campos obrigatórios:**
- `petIds` - Array de IDs dos pets (ou "todos" para aplicar a todos os pets)
- `title` - Título do tratamento (gerado automaticamente baseado no tipo)
- `kind` - Tipo de tratamento (vaccine|deworming|tick_flea|general_medication|checkup)

**Campos opcionais:**
- `description` - Descrição do tratamento
- `dueDate` - Data de vencimento (formato: YYYY-MM-DD)
- `frequencyDays` - Frequência em dias (para tratamentos recorrentes)
- `notes` - Observações adicionais

**Exemplos de uso:**
- "Dar remédio de carrapato para todos os pets"
- "Criar vacina para todos os cães"
- "Registrar vermífugo para todos os gatos"
- "Aplicar tratamento contra carrapato para todos, repetir a cada 60 dias"

---

### 7. **Registrar Aplicação de Tratamento** (`log_treatment`)

Registra que um tratamento foi aplicado/administrado.

**Campos obrigatórios:**
- `petTreatmentId` - ID do tratamento

**Campos opcionais:**
- `administeredAt` - Data/hora da aplicação (formato ISO ou vazio para agora)
- `status` - Status (scheduled, completed, missed, cancelled)
- `dosage` - Dosagem aplicada
- `batchNumber` - Número do lote
- `administeredBy` - Quem aplicou
- `notes` - Observações

**Exemplos de uso:**
- "Registrar que apliquei a vacina da eva hoje"
- "Marcar vermífugo do Bolt como aplicado"
- "Registrar aplicação do tratamento contra carrapato para Luna, lote ABC123"

---

## 🧠 Funcionalidades Inteligentes

### **Reconhecimento de Contexto**
- O assistente mantém histórico da conversa
- Lembra de pets mencionados anteriormente
- Entende referências como "o mesmo pet", "para ele", etc.

### **Identificação Automática de Pets**
- Identifica pets pelo nome mencionado
- Busca automaticamente o pet correto na lista do usuário
- Valida que o pet pertence ao usuário
- Entende "todos", "todos os pets", "todos os cães", "todos os gatos" para aplicar ações em lote

### **Interpretação de Linguagem Natural**
- Entende comandos em português
- Aceita variações de frases
- Extrai informações de descrições livres

### **Validação e Segurança**
- Valida todos os dados antes de executar
- Verifica permissões do usuário
- Retorna mensagens de erro claras quando algo está faltando

---

## 📋 Exemplos Completos de Conversas

### Exemplo 1: Cadastro completo
```
Usuário: "Cadastre um pet chamado Bolt, cachorro macho, raça Golden Retriever, nascido em 2020"
Assistente: ✅ Pet "Bolt" cadastrado com sucesso!

Usuário: "Criar vacina anual para ele"
Assistente: ✅ Tratamento "Vacina anual" criado com sucesso para o pet!
```

### Exemplo 2: Múltiplos pets
```
Usuário: "Cadastrar gata chamada Luna"
Assistente: ✅ Pet "Luna" cadastrado com sucesso!

Usuário: "Criar vacina para eva"
Assistente: ✅ Tratamento "Vacina" criado com sucesso para o pet!

Usuário: "Criar vermífugo para Luna também"
Assistente: ✅ Tratamento "Vermífugo" criado com sucesso para o pet!
```

### Exemplo 3: Tratamentos recorrentes
```
Usuário: "Criar tratamento contra carrapato para Bolt, repetir a cada 60 dias"
Assistente: ✅ Tratamento "Tratamento contra carrapato" criado com sucesso para o pet!

Usuário: "Registrar que apliquei hoje"
Assistente: ✅ Aplicação do tratamento registrada com sucesso!
```

### Exemplo 4: Ações em lote
```
Usuário: "Dar remédio de carrapato para todos os pets"
Assistente: ✅ Tratamento "Tratamento contra carrapato" criado para 3 pets com sucesso!

Usuário: "Atualizar peso de todos os cães para 10kg"
Assistente: ✅ 2 pets atualizados com sucesso!

Usuário: "Marcar todos como castrados"
Assistente: ✅ 3 pets atualizados com sucesso!
```

### Exemplo 5: Cadastro de múltiplos pets
```
Usuário: "Cadastrar três pets: Bolt (cachorro macho), Luna (gata fêmea) e Max (cachorro macho)"
Assistente: ✅ 3 pets cadastrados com sucesso!
```

---

## ⚙️ Tecnologias Utilizadas

- **OpenAI GPT-4o-mini**: Modelo de linguagem para interpretação
- **Supabase**: Banco de dados e autenticação
- **Edge Functions**: Processamento serverless
- **Histórico de Conversa**: Mantém contexto entre mensagens

---

## 🔒 Segurança

- Autenticação via JWT ou secret compartilhado
- Validação de permissões por usuário
- Verificação de propriedade dos pets
- Validação de tipos e formatos de dados

---

## 📝 Notas Importantes

1. O assistente precisa que você mencione o nome do pet para criar tratamentos individuais
2. Se você não tiver pets cadastrados, o assistente informará que é necessário cadastrar primeiro
3. O histórico é mantido durante a sessão atual (não persiste entre recarregamentos)
4. O assistente entende variações de nomes (ex: "eva", "Eva", "EVA" são tratados como o mesmo pet)
5. Para aplicar ações em lote, use expressões como "todos", "todos os pets", "todos os cães", "todos os gatos"
6. Novos campos disponíveis: `castrated`, `color`, `microchipId`, `motherId`, `fatherId`, `photoUrl`
7. O assistente pode cadastrar múltiplos pets de uma vez
8. O assistente pode editar múltiplos pets ao mesmo tempo (ex: atualizar peso, marcar como castrado)
9. O assistente pode criar o mesmo tratamento para múltiplos pets simultaneamente

