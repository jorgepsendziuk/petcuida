import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AnalyzeRequest {
  imageBase64: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, userId }: AnalyzeRequest = await req.json();

    if (!imageBase64 || !userId) {
      return new Response(JSON.stringify({ error: "imageBase64 e userId são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você analisa fotos de pets. Responda APENAS JSON válido com:
{
  "species": "dog"|"cat"|"bird"|"small_pet"|"other",
  "breed": "string ou null",
  "color": "string ou null",
  "sex": "female"|"male"|"unknown",
  "estimatedAgeYears": number ou null,
  "notes": "observação curta ou null"
}
Se não tiver certeza, use null ou unknown. Português nas strings.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta foto de pet e sugira os campos." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      console.error("OpenAI error:", err);
      return new Response(JSON.stringify({ error: "Falha na análise da imagem" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await openaiResponse.json();
    const content = completion.choices?.[0]?.message?.content;
    const analysis = typeof content === "string" ? JSON.parse(content) : content;

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
