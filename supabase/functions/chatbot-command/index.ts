import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const chatbotSecret = Deno.env.get("CHATBOT_SERVICE_SECRET");
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
const aiModelName = Deno.env.get("AI_MODEL") ?? "gpt-4o-mini";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Edge function missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

// Usar OpenAI diretamente se tiver chave, caso contrário tentar Supabase AI
const useOpenAIDirect = !!openaiApiKey;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-petcuida-chatbot-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatbotAction =
  | {
      action: "create_pet";
      payload: {
        userId: string;
        name: string;
        species?: string;
        breed?: string;
        sex?: string;
        birthdate?: string;
        birthdateEstimated?: boolean;
        weightKg?: number;
        notes?: string;
      };
    }
  | {
      action: "log_treatment";
      payload: {
        userId: string;
        petTreatmentId: string;
        administeredAt?: string;
        status?: "scheduled" | "completed" | "missed" | "cancelled";
        dosage?: string;
        batchNumber?: string;
        administeredBy?: string;
        notes?: string;
      };
    }
  | {
      action: "create_pet_treatment";
      payload: {
        userId: string;
        petId: string;
        title: string;
        kind: "vaccine" | "deworming" | "tick_flea" | "general_medication" | "checkup";
        description?: string;
        dueDate?: string;
        frequencyDays?: number;
        notes?: string;
      };
    };

async function requireProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("Profile not found for user");
  }

  return data;
}

type NaturalLanguageRequest = {
  action?: undefined;
  payload?: undefined;
  query: string;
  userId: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

async function handleCreatePet(action: Extract<ChatbotAction, { action: "create_pet" }>) {
  const { payload } = action;
  await requireProfile(payload.userId);

  const { error, data } = await supabase
    .from("pets")
    .insert({
      owner_id: payload.userId,
      name: payload.name,
      species: payload.species ?? "dog",
      breed: payload.breed ?? null,
      sex: payload.sex ?? "unknown",
      birthdate: payload.birthdate ?? null,
      birthdate_estimated: payload.birthdateEstimated ?? false,
      weight_kg: payload.weightKg ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

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

async function handleLogTreatment(action: Extract<ChatbotAction, { action: "log_treatment" }>) {
  const { payload } = action;
  await requireProfile(payload.userId);

  const { data, error } = await supabase.rpc("log_pet_treatment", {
    p_pet_treatment_id: payload.petTreatmentId,
    p_administered_at: payload.administeredAt ?? null,
    p_status: payload.status ?? "completed",
    p_dosage: payload.dosage ?? null,
    p_batch_number: payload.batchNumber ?? null,
    p_administered_by: payload.administeredBy ?? null,
    p_notes: payload.notes ?? null,
  });

  if (error) throw error;
  return data;
}

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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

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

  const systemPrompt = `Você é um assistente para o app AuAuAuMiau. Converta a solicitação do usuário em um comando JSON.
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

