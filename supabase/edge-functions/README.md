# Edge Functions - Integração com API de IA

Este diretório concentra as edge functions que serão publicadas no projeto Supabase. O sistema de integração com IA permite que usuários interajam com o PetCuida através de linguagem natural, convertendo comandos em português para ações estruturadas no banco de dados.

## 🧠 Arquitetura Geral da Integração com IA

```
┌─────────────┐
│   Frontend  │ ← Interface passo-a-passo (wizard.tsx)
│  (Next.js)  │
└──────┬──────┘
       │ HTTP POST
       ▼
┌─────────────────────┐
│ Edge Function       │ ← Recepção e autenticação
│ chatbot-command     │
│ (Deno Runtime)      │
└──────┬──────────────┘
       │ Interpretação
       ▼
┌─────────────────────┐
│   OpenAI API        │ ← GPT-4o-mini
│  (Chat Completions) │
└──────┬──────────────┘
       │ JSON Response
       ▼
┌─────────────────────┐
│ Edge Function       │ ← Validação e execução
│ (Supabase Client)   │
└──────┬──────────────┘
       │ Database Ops
       ▼
┌─────────────────────┐
│   Supabase          │ ← PostgreSQL + Auth
│   Database          │
└─────────────────────┘
```

## 📋 Funcionalidades da Integração

### 1. **Interpretação de Linguagem Natural**
- Converte comandos em português para ações estruturadas
- Suporte a histórico de conversa para contexto
- Identificação automática de pets por nome
- Ações em lote ("todos", "todos os cães", etc.)

### 2. **Ações Disponíveis**
- `create_pet` / `create_pets` - Cadastro de pets
- `update_pet` / `update_pets` - Atualização de pets
- `create_pet_treatment` / `create_pet_treatments` - Cadastro de tratamentos
- `log_treatment` - Registro de aplicação de tratamento

### 3. **Interface Frontend**
- **Wizard interativo** (`wizard.tsx`) - Interface passo-a-passo para cadastros
- **Chat direto** (`chatbot/page.tsx`) - Conversa livre com assistente
- **Histórico mantido** durante sessão
- **Fallback inteligente** entre wizard e chat

## 🔧 `chatbot-command` - Edge Function Principal

### **Propósito**
Recebe comandos estruturados ou consultas em linguagem natural, interpreta via OpenAI GPT-4o-mini, valida dados e executa ações controladas no banco de dados.

### **Autenticação Dupla**
```typescript
// 1. JWT (primário - via Supabase Auth)
const authHeader = req.headers.get("authorization");
if (authHeader?.startsWith("Bearer ")) {
  const { data: { user } } = await supabase.auth.getUser(token);
  userId = user.id;
}

// 2. Secret compartilhado (fallback)
const secretHeader = req.headers.get("x-petcuida-chatbot-secret");
if (secretHeader === chatbotSecret) {
  authenticated = true;
}
```

### **Fluxos de Requisição**

#### **Fluxo 1: Comando Estruturado**
```json
{
  "action": "create_pet",
  "payload": {
    "userId": "uuid-do-usuario",
    "name": "Luna",
    "species": "cat",
    "birthdate": "2022-08-10"
  }
}
```

#### **Fluxo 2: Linguagem Natural**
```json
{
  "query": "criar vacina para eva",
  "userId": "uuid-do-usuario",
  "history": [
    { "role": "user", "content": "mensagem anterior" },
    { "role": "assistant", "content": "resposta anterior" }
  ]
}
```

### **Integração com OpenAI**

#### **Modelo Utilizado**
- **GPT-4o-mini** (configurável via `AI_MODEL`)
- **Formato**: `response_format: { type: "json_object" }`
- **Temperatura**: `0.7` (balanceia criatividade e consistência)

#### **Prompt do Sistema**
```typescript
const systemPrompt = `
Você é um assistente para o app PetCuida. Converta a solicitação do usuário em um comando JSON.

AÇÕES DISPONÍVEIS:
1. create_pet - Cadastrar um único pet
2. create_pets - Cadastrar múltiplos pets ao mesmo tempo
3. update_pet - Editar um único pet
4. update_pets - Editar múltiplos pets ao mesmo tempo
5. create_pet_treatment - Criar tratamento para um único pet
6. create_pet_treatments - Criar tratamento para múltiplos pets
7. log_treatment - Registrar aplicação de tratamento

IMPORTANTE: O userId do usuário é: ${request.userId}
Use este valor EXATO para o campo "userId" no payload.

REGRAS IMPORTANTES:
- Sempre inclua "userId" no payload usando o valor: ${request.userId}
- Para create_pet_treatment: petId DEVE ser um UUID válido copiado da lista abaixo
- IDENTIFICAÇÃO DE PETS: Use valores REAIS de UUID da lista abaixo

${petsContext}
`;
```

#### **Contexto Dinâmico**
```typescript
// Busca pets do usuário antes de cada interpretação
const { data: userPets } = await supabase
  .from("pets")
  .select("id, name, species")
  .eq("owner_id", request.userId)
  .order("name");

const petsContext = userPets && userPets.length > 0
  ? `\n\nPets disponíveis do usuário:\n${userPets.map(p => `- ${p.name} (${p.species}, id: ${p.id})`).join("\n")}`
  : "\n\nO usuário ainda não tem pets cadastrados.";
```

### **Validação e Segurança**

#### **Validação em Camadas**
1. **Frontend**: Sessão, dados básicos
2. **Edge Function**: Autenticação, estrutura JSON
3. **Handler**: Campos obrigatórios, UUIDs, permissões
4. **Database**: Constraints, foreign keys

#### **Validação de UUIDs**
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!uuidRegex.test(petId)) {
  throw new Error("O petId fornecido não é um UUID válido");
}
```

#### **Verificação de Propriedade**
```typescript
const { data: pet } = await supabase
  .from("pets")
  .select("id, name")
  .eq("id", payload.petId)
  .eq("owner_id", payload.userId)  // Verifica propriedade
  .single();

if (!pet) {
  throw new Error("Pet não encontrado ou não pertence ao usuário");
}
```

### **Tratamento de Erros**

#### **Mensagens Estruturadas**
- **UUID inválido**: "O petId fornecido não é um UUID válido"
- **Pet não encontrado**: "Pet não encontrado ou não pertence ao usuário"
- **Campos obrigatórios**: "É necessário especificar qual pet (petId)"
- **OpenAI falha**: "Falha ao consultar OpenAI: {error}"

#### **Fallbacks**
- OpenAI indisponível → Supabase AI (se disponível)
- JWT inválido → Secret header
- Dados inválidos → Mensagens claras para usuário

### **Variáveis de Ambiente**

#### **Obrigatórias**
```bash
SUPABASE_URL=https://wloyrmzstrhnmdbhdkxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Opcionais**
```bash
CHATBOT_SERVICE_SECRET=secret-petcuida-2025  # Fallback auth
OPENAI_API_KEY=sk-proj-...                  # OpenAI direto
AI_MODEL=gpt-4o-mini                        # Modelo padrão
```

### **Deploy e Desenvolvimento**

#### **Deploy para Produção**
```bash
supabase functions deploy chatbot-command --project-ref wloyrmzstrhnmdbhdkxt
```

#### **Teste Local**
```bash
# Criar .env na raiz
echo "SUPABASE_URL=..." > .env
echo "SUPABASE_SERVICE_ROLE_KEY=..." >> .env

# Servir localmente
supabase functions serve chatbot-command --env-file ../../.env
```

#### **Teste via HTTP**
```bash
curl -X POST "http://localhost:54321/functions/v1/chatbot-command" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "criar vacina para eva",
    "userId": "uuid-do-usuario"
  }'
```

## 🎨 Interface Frontend (Wizard)

### **Componente `wizard.tsx`**
Interface passo-a-passo para cadastros sem necessidade de interpretação IA.

#### **Funcionalidades**
- **Cadastro de Pet**: 12 passos interativos (nome → espécie → sexo → castrado → raça → cor → peso → idade → foto → pais → óbito → observações)
- **Cadastro de Tratamento**: 7 passos (pet → tipo → status → descrição → datas → frequência → observações)
- **Fallback para Chat**: Opção de usar assistente IA se preferir

#### **Características Técnicas**
- **Estado local** mantido durante sessão
- **Validação progressiva** em cada passo
- **Supabase mutations** via React Query
- **Interface responsiva** com Ant Design
- **Upload de imagens** com crop integrado

#### **Integração com Supabase**
```typescript
const petMutation = useMutation({
  mutationFn: async (values: PetFormValues) => {
    const payload = {
      owner_id: user.id,
      name: values.name,
      species: values.species || "dog",
      // ... mapeamento de campos
    };
    const { error } = await supabaseClient.from("pets").insert(payload);
    if (error) throw error;
  },
  onSuccess: () => {
    message.success("Pet cadastrado com sucesso!");
    // Reset forms, navegação, etc.
  }
});
```

## 📊 Tecnologias e Dependências

### **Runtime**
- **Deno 1.40+** (Edge Functions)
- **TypeScript 5.3+** (tipagem forte)
- **ES Modules** (importação moderna)

### **APIs Externas**
- **OpenAI API** (`chat/completions`)
- **Supabase Client** (PostgreSQL + Auth)

### **Frontend**
- **Next.js 14+** (React framework)
- **Ant Design** (componentes UI)
- **React Query** (estado server)
- **Day.js** (manipulação datas)

### **Banco de Dados**
- **PostgreSQL 15+** (via Supabase)
- **Row Level Security** (RLS)
- **Real-time subscriptions** (futuro)

## 🔒 Segurança

### **Autenticação**
- **JWT tokens** via Supabase Auth
- **Service role key** para operações admin
- **Secret compartilhado** como fallback

### **Validação**
- **UUID validation** para todos os IDs
- **Propriedade verification** (user ownership)
- **Input sanitization** em todos os campos

### **Rate Limiting**
- **OpenAI quotas** (monitorar uso)
- **Supabase limits** (requests/minute)
- **User session** validation

## 📈 Monitoramento e Observabilidade

### **Logs Estruturados**
```typescript
console.log("📜 Histórico recebido na edge function:", {
  totalMensagens: request.history?.length ?? 0,
  historico: request.history,
  novaQuery: request.query,
});
```

### **Métricas a Monitorar**
- **Tempo de resposta** OpenAI API
- **Taxa de sucesso** das interpretações
- **Erros comuns** (UUID inválido, pet não encontrado)
- **Uso por usuário** (rate limiting)

### **Debugging**
- **Logs detalhados** em desenvolvimento
- **Response headers** com CORS
- **Error boundaries** no frontend

## 🚀 Próximos Passos

### **Melhorias Planejadas**
1. **Streaming responses** (OpenAI streaming)
2. **Cache inteligente** de contexto
3. **Multi-modal input** (voz + texto)
4. **Batch operations** otimizadas
5. **Analytics avançado** de uso

### **Escalabilidade**
- **Edge Functions** distribuídas globalmente
- **Database optimization** (índices, queries)
- **Caching layers** (Redis futuro)
- **Load balancing** automático

---

## 📚 Referências

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.com/manual)
- [PetCuida Database Schema](./../../supabase/migrations/)

