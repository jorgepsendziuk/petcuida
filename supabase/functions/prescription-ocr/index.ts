import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OCRRequest {
  imageBase64: string;
  petId: string;
  userId: string;
  ownerId?: string;
  editedData?: PrescriptionData;
}

interface Medication {
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration_days?: number;
  route?: string;
  instructions?: string;
}

interface PrescriptionData {
  prescription_date?: string;
  veterinarian_name?: string;
  veterinarian_crmv?: string;
  clinic_name?: string;
  medications: Medication[];
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, petId, userId, ownerId, editedData }: OCRRequest = await req.json();

    if (!petId || !userId) {
      return new Response(
        JSON.stringify({ error: "petId e userId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prescriptionOwnerId = ownerId ?? userId;

    // Se não há editedData, então imageBase64 é obrigatório para OCR
    if (!editedData && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 é obrigatório quando não há dados editados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar autenticação
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar pet e permissão (dono ou clínica com grant)
    const { data: pet, error: petError } = await supabase
      .from("pets")
      .select("id, owner_id")
      .eq("id", petId)
      .single();

    if (petError || !pet) {
      return new Response(
        JSON.stringify({ error: "Pet não encontrado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pet.owner_id !== prescriptionOwnerId) {
      return new Response(
        JSON.stringify({ error: "ownerId não corresponde ao tutor do pet" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isOwner = pet.owner_id === userId;
    let hasClinicGrant = false;
    if (!isOwner) {
      const { data: grant } = await supabase
        .from("pet_access_grants")
        .select("id, clinic_id")
        .eq("pet_id", petId)
        .is("revoked_at", null)
        .maybeSingle();
      if (grant) {
        const { data: member } = await supabase
          .from("clinic_members")
          .select("id")
          .eq("clinic_id", grant.clinic_id)
          .eq("user_id", userId)
          .maybeSingle();
        hasClinicGrant = !!member;
      }
    }

    if (!isOwner && !hasClinicGrant) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para este pet" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar API key do OpenAI
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prescriptionData: PrescriptionData;

    if (editedData) {
      // Usar dados editados pelo usuário
      prescriptionData = editedData;
    } else {
      // Preparar prompt para análise da receita
      const systemPrompt = `Você é um assistente especializado em interpretar receitas veterinárias em português brasileiro.

Analise a imagem da receita e extraia as seguintes informações:

1. Data da receita (formato: YYYY-MM-DD)
2. Nome do veterinário (se visível)
3. CRMV do veterinário (se visível)
4. Nome da clínica (se visível)
5. Lista de medicamentos com:
   - Nome do medicamento
   - Dosagem (ex: "50mg", "1 comprimido", "2ml")
   - Frequência (ex: "2x ao dia", "A cada 8 horas", "1x por semana")
   - Duração em dias (se mencionado)
   - Via de administração (ex: "Oral", "Tópico", "Injetável")
   - Instruções adicionais (se houver)
6. Observações gerais (se houver)

Retorne APENAS um JSON válido no seguinte formato:
{
  "prescription_date": "YYYY-MM-DD ou null",
  "veterinarian_name": "string ou null",
  "veterinarian_crmv": "string ou null",
  "clinic_name": "string ou null",
  "medications": [
    {
      "medication_name": "nome do medicamento (obrigatório)",
      "dosage": "dosagem ou null",
      "frequency": "frequência ou null",
      "duration_days": número ou null,
      "route": "via de administração ou null",
      "instructions": "instruções adicionais ou null"
    }
  ],
  "notes": "observações gerais ou null"
}

Se algum campo não estiver visível ou não puder ser determinado, use null.`;

      // Chamar OpenAI Vision API
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise esta receita veterinária e extraia todas as informações disponíveis.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI API Error:", errorText);
        return new Response(
          JSON.stringify({ error: `Erro ao processar imagem: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices[0]?.message?.content;

      if (!content) {
        return new Response(
          JSON.stringify({ error: "Resposta vazia da API do OpenAI" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extrair JSON da resposta (pode vir com markdown code blocks)
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
        prescriptionData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("Erro ao parsear JSON:", parseError, "Content:", content);
        return new Response(
          JSON.stringify({ error: `Erro ao parsear resposta da IA: ${parseError}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validar dados mínimos
    if (!prescriptionData.medications || prescriptionData.medications.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum medicamento encontrado na receita" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Salvar receita no banco de dados
    const prescriptionDate = prescriptionData.prescription_date || new Date().toISOString().split("T")[0];

    const { data: prescription, error: prescriptionError } = await supabase
      .from("pet_prescriptions")
      .insert({
        pet_id: petId,
        owner_id: prescriptionOwnerId,
        prescription_date: prescriptionDate,
        veterinarian_name: prescriptionData.veterinarian_name || null,
        veterinarian_crmv: prescriptionData.veterinarian_crmv || null,
        clinic_name: prescriptionData.clinic_name || null,
        image_url: imageBase64,
        notes: prescriptionData.notes || null,
      })
      .select()
      .single();

    if (prescriptionError) {
      console.error("Erro ao salvar receita:", prescriptionError);
      return new Response(
        JSON.stringify({ error: `Erro ao salvar receita: ${prescriptionError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Salvar medicamentos
    const medicationsToInsert = prescriptionData.medications.map((med) => ({
      prescription_id: prescription.id,
      medication_name: med.medication_name,
      dosage: med.dosage || null,
      frequency: med.frequency || null,
      duration_days: med.duration_days || null,
      route: med.route || null,
      instructions: med.instructions || null,
      start_date: prescriptionDate,
      end_date: med.duration_days
        ? new Date(new Date(prescriptionDate).getTime() + med.duration_days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : null,
    }));

    const { error: medicationsError } = await supabase
      .from("prescription_medications")
      .insert(medicationsToInsert);

    if (medicationsError) {
      console.error("Erro ao salvar medicamentos:", medicationsError);
      // Não falhar completamente, apenas logar o erro
    }

    // Criar tratamentos automáticos para cada medicamento
    const treatmentsToInsert = prescriptionData.medications
      .filter(med => med.medication_name && med.medication_name.trim().length > 0) // Filtrar medicamentos sem nome
      .map((med) => {
        // Calcular next_due_at baseado na frequência
        let nextDueAt: string | null = null;
        if (med.frequency) {
          const frequencyMatch = med.frequency.match(/(\d+)\s*x?\s*(ao dia|por dia|dia|horas?|semana)/i);
          if (frequencyMatch) {
            const amount = parseInt(frequencyMatch[1]);
            const unit = frequencyMatch[2].toLowerCase();
            const now = new Date();
            try {
              if (unit.includes("dia")) {
                // Próxima dose em 24h / quantidade de vezes ao dia
                const hoursUntilNext = 24 / amount;
                now.setHours(now.getHours() + hoursUntilNext);
                nextDueAt = now.toISOString();
              } else if (unit.includes("hora")) {
                // Próxima dose em X horas
                now.setHours(now.getHours() + amount);
                nextDueAt = now.toISOString();
              } else if (unit.includes("semana")) {
                // Próxima dose em 7 dias / quantidade de vezes por semana
                const daysUntilNext = 7 / amount;
                now.setDate(now.getDate() + daysUntilNext);
                nextDueAt = now.toISOString();
              }
            } catch (error) {
              nextDueAt = null;
            }
          }
        }

        // Calcular due_date
        let dueDate: string | null = null;
        if (med.duration_days) {
          try {
            const dueDateObj = new Date(new Date(prescriptionDate).getTime() + med.duration_days * 24 * 60 * 60 * 1000);
            dueDate = dueDateObj.toISOString().split("T")[0];
          } catch (error) {
            dueDate = null;
          }
        }

        return {
          pet_id: petId,
          kind: "general_medication" as const,
          title: med.medication_name.trim(),
          description: med.dosage
            ? `Dosagem: ${med.dosage}${med.frequency ? ` | Frequência: ${med.frequency}` : ""}${med.route ? ` | Via: ${med.route}` : ""}`
            : med.frequency || null,
          status: "scheduled" as const,
          start_date: prescriptionDate,
          due_date: dueDate,
          frequency_days: med.frequency?.match(/(\d+)\s*dia/i) ? parseInt(med.frequency.match(/(\d+)\s*dia/i)![1]) : null,
          next_due_at: nextDueAt,
          notes: med.instructions || `Receita de ${prescriptionDate}`,
        };
      });

    const { error: treatmentsError } = await supabase
      .from("pet_treatments")
      .insert(treatmentsToInsert);

    if (treatmentsError) {
      console.error("Erro ao criar tratamentos:", treatmentsError);
      // Não falhar completamente
    }

    return new Response(
      JSON.stringify({
        success: true,
        prescription: {
          id: prescription.id,
          ...prescription,
          ...prescriptionData,
        },
        medicationsCount: prescriptionData.medications.length,
        treatmentsCreated: treatmentsToInsert.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
