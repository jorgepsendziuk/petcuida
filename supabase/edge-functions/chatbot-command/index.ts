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
        color?: string;
        microchipId?: string;
        castrated?: boolean;
        motherId?: string;
        fatherId?: string;
        photoUrl?: string;
        notes?: string;
      };
    }
  | {
      action: "create_pets";
      payload: {
        userId: string;
        pets: Array<{
          name: string;
          species?: string;
          breed?: string;
          sex?: string;
          birthdate?: string;
          birthdateEstimated?: boolean;
          weightKg?: number;
          color?: string;
          microchipId?: string;
          castrated?: boolean;
          motherId?: string;
          fatherId?: string;
          photoUrl?: string;
          notes?: string;
        }>;
      };
    }
  | {
      action: "update_pet";
      payload: {
        userId: string;
        petId: string;
        name?: string;
        species?: string;
        breed?: string;
        sex?: string;
        birthdate?: string;
        birthdateEstimated?: boolean;
        weightKg?: number;
        color?: string;
        microchipId?: string;
        castrated?: boolean;
        motherId?: string;
        fatherId?: string;
        photoUrl?: string;
        notes?: string;
      };
    }
  | {
      action: "update_pets";
      payload: {
        userId: string;
        petIds: string[];
        updates: {
          castrated?: boolean;
          weightKg?: number;
          color?: string;
          notes?: string;
          [key: string]: unknown;
        };
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
    }
  | {
      action: "create_pet_treatments";
      payload: {
        userId: string;
        petIds: string[];
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
      color: payload.color ?? null,
      microchip_id: payload.microchipId ?? null,
      castrated: payload.castrated ?? false,
      mother_id: payload.motherId ?? null,
      father_id: payload.fatherId ?? null,
      photo_url: payload.photoUrl ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function handleCreatePets(action: Extract<ChatbotAction, { action: "create_pets" }>) {
  const { payload } = action;
  await requireProfile(payload.userId);

  if (!payload.pets || payload.pets.length === 0) {
    throw new Error("É necessário fornecer pelo menos um pet para cadastrar.");
  }

  const petsToInsert = payload.pets.map((pet) => ({
    owner_id: payload.userId,
    name: pet.name,
    species: pet.species ?? "dog",
    breed: pet.breed ?? null,
    sex: pet.sex ?? "unknown",
    birthdate: pet.birthdate ?? null,
    birthdate_estimated: pet.birthdateEstimated ?? false,
    weight_kg: pet.weightKg ?? null,
    color: pet.color ?? null,
    microchip_id: pet.microchipId ?? null,
    castrated: pet.castrated ?? false,
    mother_id: pet.motherId ?? null,
    father_id: pet.fatherId ?? null,
    photo_url: pet.photoUrl ?? null,
    notes: pet.notes ?? null,
  }));

  const { error, data } = await supabase
    .from("pets")
    .insert(petsToInsert)
    .select();

  if (error) throw error;
  return { count: data?.length ?? 0, pets: data ?? [] };
}

async function handleUpdatePet(action: Extract<ChatbotAction, { action: "update_pet" }>) {
  const { payload } = action;
  await requireProfile(payload.userId);

  // Verificar se o pet existe e pertence ao usuário
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name")
    .eq("id", payload.petId)
    .eq("owner_id", payload.userId)
    .single();

  if (petError || !pet) {
    throw new Error(`Pet não encontrado ou não pertence ao usuário.`);
  }

  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.species !== undefined) updates.species = payload.species;
  if (payload.breed !== undefined) updates.breed = payload.breed ?? null;
  if (payload.sex !== undefined) updates.sex = payload.sex;
  if (payload.birthdate !== undefined) updates.birthdate = payload.birthdate ?? null;
  if (payload.birthdateEstimated !== undefined) updates.birthdate_estimated = payload.birthdateEstimated;
  if (payload.weightKg !== undefined) updates.weight_kg = payload.weightKg ?? null;
  if (payload.color !== undefined) updates.color = payload.color ?? null;
  if (payload.microchipId !== undefined) updates.microchip_id = payload.microchipId ?? null;
  if (payload.castrated !== undefined) updates.castrated = payload.castrated;
  if (payload.motherId !== undefined) updates.mother_id = payload.motherId ?? null;
  if (payload.fatherId !== undefined) updates.father_id = payload.fatherId ?? null;
  if (payload.photoUrl !== undefined) updates.photo_url = payload.photoUrl ?? null;
  if (payload.notes !== undefined) updates.notes = payload.notes ?? null;

  const { error, data } = await supabase
    .from("pets")
    .update(updates)
    .eq("id", payload.petId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function handleUpdatePets(action: Extract<ChatbotAction, { action: "update_pets" }>) {
  const { payload } = action;
  await requireProfile(payload.userId);

  if (!payload.petIds || payload.petIds.length === 0) {
    throw new Error("É necessário fornecer pelo menos um petId para atualizar.");
  }

  // Validar formato UUID de todos os petIds
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const petId of payload.petIds) {
    if (!uuidRegex.test(petId)) {
      throw new Error(`PetId inválido: ${petId}`);
    }
  }

  // Verificar se todos os pets existem e pertencem ao usuário
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id, name")
    .in("id", payload.petIds)
    .eq("owner_id", payload.userId);

  if (petsError) throw petsError;
  if (!pets || pets.length !== payload.petIds.length) {
    throw new Error("Um ou mais pets não foram encontrados ou não pertencem ao usuário.");
  }

  const updates: Record<string, unknown> = {};
  if (payload.updates.castrated !== undefined) updates.castrated = payload.updates.castrated;
  if (payload.updates.weightKg !== undefined) updates.weight_kg = payload.updates.weightKg ?? null;
  if (payload.updates.color !== undefined) updates.color = payload.updates.color ?? null;
  if (payload.updates.notes !== undefined) updates.notes = payload.updates.notes ?? null;

  if (Object.keys(updates).length === 0) {
    throw new Error("Nenhum campo para atualizar foi fornecido.");
  }

  const { error, data } = await supabase
    .from("pets")
    .update(updates)
    .in("id", payload.petIds)
    .select();

  if (error) throw error;
  return { count: data?.length ?? 0, pets: data ?? [] };
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

  // Gerar título automaticamente se não fornecido (removido, agora title é obrigatório)
  // O título já vem do LLM baseado no tipo de tratamento

  const { error, data } = await supabase
    .from("pet_treatments")
    .insert({
      pet_id: payload.petId,
      title: payload.title,
      kind: payload.kind,
      status: "scheduled",
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

async function handleCreatePetTreatments(
  action: Extract<ChatbotAction, { action: "create_pet_treatments" }>,
) {
  const { payload } = action;
  await requireProfile(payload.userId);

  if (!payload.petIds || payload.petIds.length === 0) {
    throw new Error("É necessário fornecer pelo menos um petId para criar o tratamento.");
  }

  // Validar formato UUID de todos os petIds
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const petId of payload.petIds) {
    if (!uuidRegex.test(petId)) {
      throw new Error(`PetId inválido: ${petId}`);
    }
  }

  if (!payload.title) {
    throw new Error("É necessário especificar o título do tratamento.");
  }
  if (!payload.kind) {
    throw new Error("É necessário especificar o tipo de tratamento (vaccine, deworming, tick_flea, general_medication ou checkup).");
  }

  // Verificar se todos os pets existem e pertencem ao usuário
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id, name")
    .in("id", payload.petIds)
    .eq("owner_id", payload.userId);

  if (petsError) throw petsError;
  if (!pets || pets.length !== payload.petIds.length) {
    throw new Error("Um ou mais pets não foram encontrados ou não pertencem ao usuário.");
  }

  // Criar tratamento para todos os pets
  const treatmentsToInsert = payload.petIds.map((petId) => ({
    pet_id: petId,
    title: payload.title,
    kind: payload.kind,
    status: "scheduled" as const,
    description: payload.description ?? null,
    due_date: payload.dueDate ?? null,
    frequency_days: payload.frequencyDays ?? null,
    notes: payload.notes ?? null,
  }));

  const { error, data } = await supabase
    .from("pet_treatments")
    .insert(treatmentsToInsert)
    .select();

  if (error) throw error;
  return { count: data?.length ?? 0, treatments: data ?? [] };
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
      case "create_pets":
        return jsonResponse({
          action: command.action,
          data: await handleCreatePets(command),
        });
      case "update_pet":
        return jsonResponse({
          action: command.action,
          data: await handleUpdatePet(command),
        });
      case "update_pets":
        return jsonResponse({
          action: command.action,
          data: await handleUpdatePets(command),
        });
      case "create_pet_treatment":
        return jsonResponse({
          action: command.action,
          data: await handleCreatePetTreatment(command),
        });
      case "create_pet_treatments":
        return jsonResponse({
          action: command.action,
          data: await handleCreatePetTreatments(command),
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
    ? `\n\nPets disponíveis do usuário:\n${userPets.map((p) => `- ${p.name} (${p.species}, id: ${p.id})`).join("\n")}\n\nIDs de todos os pets (para usar quando mencionar "todos"):\n${userPets.map((p) => p.id).join(", ")}`
    : "\n\nO usuário ainda não tem pets cadastrados.";

  const systemPrompt = `Você é um assistente para o app AuAuAuMiau. Converta a solicitação do usuário em um comando JSON.

AÇÕES DISPONÍVEIS:
1. create_pet - Cadastrar um único pet
2. create_pets - Cadastrar múltiplos pets ao mesmo tempo
3. update_pet - Editar um único pet
4. update_pets - Editar múltiplos pets ao mesmo tempo (ex: "dar remédio de carrapato para todos", "atualizar peso de todos")
5. create_pet_treatment - Criar tratamento para um único pet
6. create_pet_treatments - Criar tratamento para múltiplos pets ao mesmo tempo (ex: "dar remédio de carrapato para todos os pets")
7. log_treatment - Registrar aplicação de tratamento

IMPORTANTE: O userId do usuário é: ${request.userId}
Use este valor EXATO para o campo "userId" no payload.

REGRAS IMPORTANTES:
- Sempre inclua "userId" no payload usando o valor: ${request.userId}

- Para create_pet e create_pets: campos obrigatórios: name. Campos opcionais: species (padrão "dog"), sex (padrão "unknown"), breed, color, microchipId, castrated (boolean), weightKg, birthdate (YYYY-MM-DD), birthdateEstimated (boolean), motherId (UUID), fatherId (UUID), photoUrl (base64), notes.

- Para update_pet: precisa de petId (UUID) e os campos a atualizar (name, species, breed, sex, color, microchipId, castrated, weightKg, birthdate, birthdateEstimated, motherId, fatherId, photoUrl, notes).

- Para update_pets: precisa de petIds (array de UUIDs) e updates (objeto com campos a atualizar). Use quando o usuário mencionar "todos", "todos os pets", "todos os cães", etc. 
  - IMPORTANTE: update_pets é para ATUALIZAR CAMPOS DOS PETS (ex: peso, castrado, cor, etc.), NÃO para criar tratamentos.
  - Exemplo: "atualizar peso de todos os pets para 10kg" -> update_pets com petIds de todos os pets e updates: { weightKg: 10 }.
  - Exemplo: "marcar todos como castrados" -> update_pets com petIds de todos os pets e updates: { castrated: true }.
  - Se mencionar "todos os cães", use apenas os IDs dos pets com species "dog".
  - Se mencionar "todos os gatos", use apenas os IDs dos pets com species "cat".

- Para create_pet_treatment: OBRIGATÓRIO ter petId (UUID do pet), title, kind (vaccine|deworming|tick_flea|general_medication|checkup). Campos opcionais: description, dueDate (YYYY-MM-DD), frequencyDays, notes. 
  - CRÍTICO: petId DEVE ser um UUID válido copiado EXATAMENTE da lista de pets abaixo.
  - O título é gerado automaticamente baseado no tipo de tratamento. Ex: "Vacina anual", "Vermífugo", "Tratamento contra carrapato", etc.
  - NUNCA use "userId" como petId. NUNCA use "${request.userId}" como petId. NUNCA use texto literal.

- Para create_pet_treatments: Similar a create_pet_treatment, mas aceita petIds (array de UUIDs). Use quando o usuário mencionar "todos", "todos os pets", "para todos", "todos os cães", etc. 
  - Exemplo: "dar remédio de carrapato para todos" -> create_pet_treatments com petIds de TODOS os pets (copie todos os IDs da lista abaixo) e kind "tick_flea", title "Tratamento contra carrapato".
  - Se mencionar "todos os cães", use apenas os IDs dos pets com species "dog".
  - Se mencionar "todos os gatos", use apenas os IDs dos pets com species "cat".

- Para log_treatment: precisa de petTreatmentId e administeredAt (ISO ou vazio para agora).

- IDENTIFICAÇÃO DE PETS:
  - Se o usuário mencionar um pet pelo nome (ex: "eva", "Eva", "EVA"), encontre o pet na lista abaixo e copie o petId EXATO (o UUID completo).
  - Se mencionar "todos", "todos os pets", "todos os cães", etc., use TODOS os petIds da lista abaixo (ou filtrado por species se mencionar "todos os cães").
  - Se não houver pets ou o pet mencionado não existir na lista, retorne action apropriada com payload contendo apenas userId: "${request.userId}" e notes explicando o problema.

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

  // Validação específica para ações que usam petId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (parsed.action === "create_pet_treatment" || parsed.action === "update_pet") {
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
    if (!uuidRegex.test(petId)) {
      throw new Error(
        `O petId fornecido não é um UUID válido. Por favor, mencione o nome do pet para que eu possa identificar o pet correto.`
      );
    }
  }

  // Validação para ações que usam múltiplos petIds
  if (parsed.action === "create_pet_treatments" || parsed.action === "update_pets") {
    const payload = parsed.payload as { petIds?: string[]; [key: string]: unknown };
    
    if (!("petIds" in payload) || !payload.petIds || !Array.isArray(payload.petIds) || payload.petIds.length === 0) {
      throw new Error(
        "Não foi possível identificar quais pets você mencionou. Por favor, especifique os nomes dos pets ou use 'todos' para aplicar a todos os pets."
      );
    }
    
    // Validar formato UUID de todos os petIds
    for (const petId of payload.petIds) {
      if (typeof petId !== "string" || !uuidRegex.test(petId)) {
        throw new Error(
          `Um ou mais petIds fornecidos não são UUIDs válidos. Por favor, mencione os nomes dos pets corretamente.`
        );
      }
    }
  }

  return parsed;
}

