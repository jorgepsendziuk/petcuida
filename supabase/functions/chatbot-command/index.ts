import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const chatbotSecret = Deno.env.get("CHATBOT_SERVICE_SECRET");
const openAiKey = Deno.env.get("OPENAI_API_KEY");
const openAiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

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

    if (chatbotSecret) {
      const header = req.headers.get("x-petcuida-chatbot-secret");
      if (header !== chatbotSecret) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const body = (await req.json()) as ChatbotAction | NaturalLanguageRequest;

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
  if (!openAiKey) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }
  if (!request?.query || !request?.userId) {
    throw new Error("Consulta inválida para o chatbot.");
  }

  const systemPrompt = `
Você é um assistente para o app PetCuida. Converta a solicitação do usuário em um comando JSON.
Só utilize as ações: create_pet, create_pet_treatment, log_treatment.

Regras:
- Sempre inclua "userId" recebido na carga final.
- Para create_pet: campos obrigatórios: name. species padrão dog, sex unknown.
- Para create_pet_treatment: precisa de petId, title, kind (vaccine|deworming|tick_flea|general_medication|checkup). Aceite dueDate (YYYY-MM-DD) e frequencyDays.
- Para log_treatment: precisa de petTreatmentId e administeredAt (ISO ou vazio para agora).
- Se não compreender, responda com action create_pet_treatment mas com payload vazio e campo notes explicando o erro.
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel,
      text: {
        format: {
          type: "json_schema",
          json_schema: {
            name: "petcuida_command",
            schema: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: ["create_pet", "create_pet_treatment", "log_treatment"],
                },
                payload: {
                  type: "object",
                  additionalProperties: true,
                },
              },
              required: ["action", "payload"],
              additionalProperties: false,
            },
          },
        },
      },
      input: [
        { role: "system", content: [{ type: "text", text: systemPrompt }] },
        ...(request.history?.map((item) => ({
          role: item.role,
          content: [{ type: "text", text: item.content }],
        })) ?? []),
        {
          role: "user",
          content: [{ type: "text", text: request.query }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao consultar OpenAI: ${text}`);
  }

  const completion = await response.json();
  const content =
    completion.output?.[0]?.content?.[0]?.text ?? completion.output_text ?? completion.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Resposta do modelo vazia.");
  }

  let parsed: ChatbotAction | undefined;
  try {
    parsed = JSON.parse(content) as ChatbotAction;
  } catch {
    throw new Error(`Não foi possível interpretar o JSON retornado: ${content}`);
  }

  if (!parsed.action || !parsed.payload) {
    throw new Error("Resposta do modelo sem ação ou payload.");
  }

  if ("userId" in parsed.payload === false) {
    (parsed.payload as Record<string, unknown>).userId = request.userId;
  }

  return parsed;
}

