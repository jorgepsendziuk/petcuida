# Funcionamento Técnico do Chatbot PetCuida

Este documento explica como o chatbot funciona tecnicamente, desde o frontend até a execução das ações no banco de dados.

## 🏗️ Arquitetura Geral

```
Frontend (Next.js) 
    ↓ HTTP POST
Edge Function (Supabase)
    ↓ Interpretação
OpenAI API (GPT-4o-mini)
    ↓ JSON Response
Edge Function (Validação)
    ↓ Execução
Supabase Database
    ↓ Resultado
Frontend (Exibição)
```

## 📋 Fluxo Completo Passo a Passo

### 1. **Frontend - Interface do Usuário**

**Arquivo:** `apps/web-next/src/app/(dashboard)/chatbot/page.tsx`

```typescript
// Usuário digita: "criar vacina para eva"
handleSubmit({ prompt: "criar vacina para eva" })
```

**O que acontece:**
1. Adiciona a mensagem do usuário ao estado local (`messages`)
2. Prepara o histórico de mensagens anteriores
3. Envia requisição HTTP POST para a edge function

```56:93:apps/web-next/src/app/(dashboard)/chatbot/page.tsx
    mutationFn: async ({ prompt, history }) => {
      if (!functionsUrl) {
        throw new Error("URL das edge functions não configurada.");
      }
      const token = session?.access_token;
      const userId = session?.user?.id;
      if (!token || !userId) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }

      const historyPayload =
        history.length > 0
          ? history.map((item) => ({
              role: item.author === "user" ? "user" : "assistant",
              content: item.content,
            }))
          : undefined;

      // Debug: mostrar histórico sendo enviado
      console.log("📜 Histórico sendo enviado:", {
        totalMensagens: history.length,
        historico: historyPayload,
        novaMensagem: prompt,
      });

      const response = await fetch(`${functionsUrl}/chatbot-command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-petcuida-chatbot-secret": process.env.NEXT_PUBLIC_PETCUIDA_CHATBOT_SECRET ?? "",
        },
        body: JSON.stringify({
          query: prompt,
          userId,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Falha ao chamar o assistente.");
      }

      return (await response.json()) as { action?: string; data?: unknown; error?: string };
    },
```

**Payload enviado:**
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

---

### 2. **Edge Function - Recepção e Autenticação**

**Arquivo:** `supabase/edge-functions/chatbot-command/index.ts`

**Linhas 194-272:** Função principal `serve()`

```194:272:supabase/edge-functions/chatbot-command/index.ts
serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Verificar autenticação: secret ou JWT
    const authHeader = req.headers.get("authorization");
    const secretHeader = req.headers.get("x-petcuida-chatbot-secret");
    
    let userId: string | null = null;
    let authenticated = false;
    
    // Tentar validar JWT se fornecido
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
          authenticated = true;
        }
      } catch {
        // JWT inválido, continuar com verificação de secret
      }
    }
    
    // Se não tem JWT válido, verificar secret
    if (!authenticated && chatbotSecret) {
      if (secretHeader === chatbotSecret) {
        authenticated = true;
      } else {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
    } else if (!authenticated && !chatbotSecret) {
      // Se não tem secret configurado e não tem JWT válido, permitir (modo desenvolvimento)
      authenticated = true;
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const body = (await req.json()) as ChatbotAction | NaturalLanguageRequest;
    
    // Se temos userId do JWT e o body não tem userId, usar o do JWT
    if (userId && "userId" in body && !body.userId) {
      (body as NaturalLanguageRequest).userId = userId;
    }

    const command =
      "action" in body && body.action
        ? body
        : await deriveActionFromPrompt(body as NaturalLanguageRequest);

    switch (command.action) {
      case "create_pet":
        return jsonResponse({
          action: command.action,
          data: await handleCreatePet(command),
        });
      case "create_pet_treatment":
        return jsonResponse({
          action: command.action,
          data: await handleCreatePetTreatment(command),
        });
      case "log_treatment":
        return jsonResponse({
          action: command.action,
          data: await handleLogTreatment(command),
        });
      default:
        return jsonResponse({ error: "unknown_action" }, 400);
    }
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error.message ?? "internal_error" }, 500);
  }
});
```

**O que acontece:**
1. ✅ Valida CORS (OPTIONS)
2. 🔐 Autentica via JWT ou secret
3. 📥 Recebe o body (JSON)
4. 🔍 Verifica se já é um comando estruturado ou precisa interpretar
5. 🎯 Roteia para a função handler correta

---

### 3. **Interpretação de Linguagem Natural**

**Linhas 284-442:** Função `deriveActionFromPrompt()`

```284:442:supabase/edge-functions/chatbot-command/index.ts
async function deriveActionFromPrompt(request: NaturalLanguageRequest): Promise<ChatbotAction> {
  if (!request?.query || !request?.userId) {
    throw new Error("Consulta inválida para o chatbot.");
  }

  // Buscar pets do usuário para incluir no contexto
  const { data: userPets, error: petsError } = await supabase
    .from("pets")
    .select("id, name, species")
    .eq("owner_id", request.userId)
    .order("name");

  const petsContext = userPets && userPets.length > 0
    ? `\n\nPets disponíveis do usuário:\n${userPets.map((p) => `- ${p.name} (${p.species}, id: ${p.id})`).join("\n")}`
    : "\n\nO usuário ainda não tem pets cadastrados.";

  const systemPrompt = `Você é um assistente para o app PetCuida. Converta a solicitação do usuário em um comando JSON.
Só utilize as ações: create_pet, create_pet_treatment, log_treatment.

IMPORTANTE: O userId do usuário é: ${request.userId}
Use este valor EXATO para o campo "userId" no payload.

Regras IMPORTANTES:
- Sempre inclua "userId" no payload usando o valor: ${request.userId}
- Para create_pet: campos obrigatórios: name. species padrão dog, sex unknown.
- Para create_pet_treatment: OBRIGATÓRIO ter petId (UUID do pet), title, kind (vaccine|deworming|tick_flea|general_medication|checkup). Aceite dueDate (YYYY-MM-DD) e frequencyDays.
  - CRÍTICO: petId DEVE ser um UUID válido copiado EXATAMENTE da lista de pets abaixo. 
  - NUNCA use "userId" como petId. NUNCA use "${request.userId}" como petId. NUNCA use texto literal.
  - Se o usuário mencionar um pet pelo nome (ex: "eva", "Eva", "EVA"), encontre o pet na lista abaixo e copie o petId EXATO (o UUID completo) daquele pet.
  - Se não houver pets ou o pet mencionado não existir na lista, NÃO inclua petId. Retorne action "create_pet_treatment" com payload contendo apenas userId: "${request.userId}" e notes explicando o problema.
- Para log_treatment: precisa de petTreatmentId e administeredAt (ISO ou vazio para agora).
- Se não compreender ou faltar informação obrigatória, responda com action "create_pet_treatment" mas com payload contendo apenas userId: "${request.userId}" e notes explicando o erro.
- Use valores REAIS de UUID da lista abaixo, nunca texto literal ou placeholders.

${petsContext}`;

  // Debug: mostrar histórico recebido
  console.log("📜 Histórico recebido na edge function:", {
    totalMensagens: request.history?.length ?? 0,
    historico: request.history,
    novaQuery: request.query,
  });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system" as const, content: systemPrompt },
    ...(request.history?.map((item) => ({
      role: (item.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: item.content,
    })) ?? []),
    { role: "user" as const, content: request.query },
  ];

  // Debug: mostrar mensagens completas sendo enviadas para OpenAI
  console.log("📤 Mensagens sendo enviadas para OpenAI:", {
    totalMensagens: messages.length,
    mensagens: messages.map((m) => ({ role: m.role, content: m.content.substring(0, 100) + "..." })),
  });

  let completion: string;

  if (useOpenAIDirect) {
    // Usar OpenAI diretamente
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModelName,
        messages: messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      throw new Error(`Falha ao consultar OpenAI: ${JSON.stringify(errorData)}`);
    }

    const data = await openaiResponse.json();
    completion = data.choices?.[0]?.message?.content;
    if (!completion) {
      throw new Error("OpenAI não retornou conteúdo.");
    }
  } else {
    // Tentar usar Supabase AI (pode não estar disponível)
    try {
      const aiSession = new Supabase.ai.Session(aiModelName);
      const result = await aiSession.run(messages, { stream: false, timeout: 60 });
      if (!result || typeof result !== "string") {
        throw new Error("Modelo não retornou conteúdo de texto.");
      }
      completion = result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Modelo não disponível. Configure OPENAI_API_KEY para usar OpenAI diretamente, ou habilite modelos AI no Supabase. Erro: ${errorMsg}`,
      );
    }
  }

  let parsed: ChatbotAction | undefined;
  try {
    parsed = JSON.parse(completion) as ChatbotAction;
  } catch {
    throw new Error(`Não foi possível interpretar o JSON retornado: ${completion}`);
  }

  if (!parsed.action || !parsed.payload) {
    throw new Error("Resposta do modelo sem ação ou payload.");
  }

  if ("userId" in parsed.payload === false) {
    (parsed.payload as Record<string, unknown>).userId = request.userId;
  }

  // Validação específica para create_pet_treatment: garantir que petId não seja "userId" ou texto literal
  if (parsed.action === "create_pet_treatment") {
    const payload = parsed.payload as { petId?: string; [key: string]: unknown };
    
    // Se não tem petId, já lança erro
    if (!("petId" in payload) || !payload.petId) {
      throw new Error(
        "Não foi possível identificar qual pet você mencionou. Por favor, especifique o nome completo do pet ou cadastre um pet primeiro."
      );
    }
    
    const petId = payload.petId;
    
    // Verificar se petId é texto literal inválido ou igual ao userId
    if (
      typeof petId !== "string" ||
      petId === "userId" ||
      petId === request.userId ||
      petId.includes("uuid-do") ||
      petId.includes("uuid-exato") ||
      petId.includes("placeholder") ||
      petId.toLowerCase().includes("example")
    ) {
      throw new Error(
        "Não foi possível identificar qual pet você mencionou. Por favor, especifique o nome completo do pet ou cadastre um pet primeiro."
      );
    }
    
    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(petId)) {
      throw new Error(
        `O petId fornecido não é um UUID válido. Por favor, mencione o nome do pet para que eu possa identificar o pet correto.`
      );
    }
  }

  return parsed;
}
```

**O que acontece:**

1. **Busca contexto:**
   - Busca pets do usuário no banco
   - Monta lista de pets disponíveis

2. **Monta prompt do sistema:**
   - Instruções para a OpenAI
   - Lista de pets disponíveis
   - Regras de validação

3. **Monta array de mensagens:**
   ```typescript
   [
     { role: "system", content: "Instruções..." },
     { role: "user", content: "mensagem anterior" },
     { role: "assistant", content: "resposta anterior" },
     { role: "user", content: "criar vacina para eva" }
   ]
   ```

4. **Chama OpenAI API:**
   - Endpoint: `https://api.openai.com/v1/chat/completions`
   - Modelo: `gpt-4o-mini` (configurável via `AI_MODEL`)
   - Formato: `json_object` (garante resposta em JSON)
   - Temperature: `0.7` (balanceia criatividade e consistência)

5. **Processa resposta:**
   - Parse do JSON retornado
   - Validação de campos obrigatórios
   - Validação de UUIDs
   - Garantia de `userId` no payload

**Exemplo de resposta da OpenAI:**
```json
{
  "action": "create_pet_treatment",
  "payload": {
    "userId": "uuid-do-usuario",
    "petId": "uuid-do-pet-eva",
    "title": "Vacina",
    "kind": "vaccine"
  }
}
```

---

### 4. **Execução da Ação**

Após interpretar, a edge function roteia para o handler correto:

```249:267:supabase/edge-functions/chatbot-command/index.ts
    switch (command.action) {
      case "create_pet":
        return jsonResponse({
          action: command.action,
          data: await handleCreatePet(command),
        });
      case "create_pet_treatment":
        return jsonResponse({
          action: command.action,
          data: await handleCreatePetTreatment(command),
        });
      case "log_treatment":
        return jsonResponse({
          action: command.action,
          data: await handleLogTreatment(command),
        });
      default:
        return jsonResponse({ error: "unknown_action" }, 400);
    }
```

**Exemplo: `handleCreatePetTreatment`**

```122:174:supabase/edge-functions/chatbot-command/index.ts
async function handleCreatePetTreatment(
  action: Extract<ChatbotAction, { action: "create_pet_treatment" }>,
) {
  const { payload } = action;
  await requireProfile(payload.userId);

  // Validar campos obrigatórios
  if (!payload.petId || typeof payload.petId !== "string") {
    throw new Error("É necessário especificar qual pet (petId) para criar o tratamento. Por favor, mencione o nome do pet ou cadastre um pet primeiro.");
  }
  
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(payload.petId)) {
    throw new Error(`O petId fornecido ("${payload.petId}") não é um UUID válido. Por favor, mencione o nome do pet para que eu possa identificar o pet correto.`);
  }
  
  if (!payload.title) {
    throw new Error("É necessário especificar o título do tratamento.");
  }
  if (!payload.kind) {
    throw new Error("É necessário especificar o tipo de tratamento (vaccine, deworming, tick_flea, general_medication ou checkup).");
  }

  // Verificar se o pet existe e pertence ao usuário
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name")
    .eq("id", payload.petId)
    .eq("owner_id", payload.userId)
    .single();

  if (petError || !pet) {
    throw new Error(`Pet não encontrado ou não pertence ao usuário. Verifique se o petId está correto.`);
  }

  const { error, data } = await supabase
    .from("pet_treatments")
    .insert({
      pet_id: payload.petId,
      title: payload.title,
      kind: payload.kind,
      description: payload.description ?? null,
      due_date: payload.dueDate ?? null,
      frequency_days: payload.frequencyDays ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**O que acontece:**
1. ✅ Valida perfil do usuário
2. ✅ Valida campos obrigatórios
3. ✅ Valida formato UUID
4. ✅ Verifica se pet existe e pertence ao usuário
5. 💾 Insere no banco de dados
6. 📤 Retorna dados criados

---

### 5. **Resposta ao Frontend**

A edge function retorna:

```json
{
  "action": "create_pet_treatment",
  "data": {
    "id": "uuid-do-tratamento",
    "pet_id": "uuid-do-pet",
    "title": "Vacina",
    "kind": "vaccine",
    ...
  }
}
```

O frontend processa e exibe:

```102:128:apps/web-next/src/app/(dashboard)/chatbot/page.tsx
    onSuccess: (result) => {
      let content = "Ação executada com sucesso.";
      
      if (result.error) {
        content = `Ocorreu um erro: ${result.error}`;
      } else if (result.data) {
        // Melhorar a resposta com base na ação e dados retornados
        const data = result.data as Record<string, unknown>;
        switch (result.action) {
          case "create_pet":
            content = `Pet "${data.name}" cadastrado com sucesso!`;
            break;
          case "create_pet_treatment":
            content = `Tratamento "${data.title}" criado com sucesso para o pet!`;
            break;
          case "log_treatment":
            content = `Aplicação do tratamento registrada com sucesso!`;
            break;
          default:
            content = "Ação executada com sucesso.";
        }
      }
      
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          author: "assistant",
          content,
          action: result.action,
          timestamp: new Date().toISOString(),
        },
      ]);
      form.resetFields();
    },
```

---

## 🔑 Componentes Técnicos Principais

### **1. Autenticação Dupla**
- **JWT**: Valida token do Supabase Auth
- **Secret**: Alternativa via header `x-petcuida-chatbot-secret`

### **2. Histórico de Conversa**
- Mantido no frontend durante a sessão
- Enviado para a edge function a cada requisição
- Incluído no contexto da OpenAI para manter memória

### **3. Contexto Dinâmico**
- Busca pets do usuário antes de cada interpretação
- Inclui lista de pets no prompt do sistema
- Permite identificação automática por nome

### **4. Validação em Camadas**
- **Frontend**: Valida sessão e dados básicos
- **Edge Function**: Valida autenticação e estrutura
- **Handler**: Valida campos, UUIDs e permissões
- **Database**: Constraints e foreign keys

### **5. Tratamento de Erros**
- Mensagens claras para o usuário
- Logs detalhados para debug
- Fallback para erros inesperados

---

## 🛠️ Tecnologias e Ferramentas

- **Deno Runtime**: Edge functions do Supabase
- **OpenAI API**: GPT-4o-mini para interpretação
- **Supabase**: Banco de dados, autenticação e edge functions
- **TypeScript**: Tipagem forte em todo o código
- **React Query**: Gerenciamento de estado e cache no frontend

---

## 📊 Fluxo de Dados Visual

```
┌─────────────┐
│   Usuário   │
│  "criar     │
│  vacina     │
│  para eva"  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Frontend       │
│  - Adiciona msg │
│  - Prepara hist │
│  - Envia POST   │
└──────┬──────────┘
       │ HTTP POST
       │ + JWT
       │ + History
       ▼
┌─────────────────┐
│  Edge Function  │
│  - Autentica    │
│  - Recebe body  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ deriveAction    │
│ - Busca pets    │
│ - Monta prompt  │
│ - Prepara msgs  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  OpenAI API     │
│  GPT-4o-mini    │
│  - Interpreta   │
│  - Retorna JSON │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Edge Function  │
│  - Valida JSON  │
│  - Valida UUIDs │
│  - Roteia ação  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Handler        │
│  - Valida dados │
│  - Insere DB    │
│  - Retorna data │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Frontend       │
│  - Recebe data   │
│  - Exibe msg    │
│  - Atualiza UI  │
└─────────────────┘
```

---

## 🔍 Pontos Importantes

1. **Interpretação acontece na edge function**, não no frontend
2. **Histórico é enviado a cada requisição** (não persistido no servidor)
3. **Contexto é dinâmico** (pets são buscados a cada vez)
4. **Validação em múltiplas camadas** garante segurança
5. **OpenAI retorna JSON estruturado** via `response_format: { type: "json_object" }`

