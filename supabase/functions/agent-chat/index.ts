import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  agentId: string;
  message: string;
  conversationHistory?: { role: string; content: string }[];
}

// ============== PROVIVDER HANDLERS ==============

async function callOpenAI(apiKey: string, model: string, messages: any[], temperature: number) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, model: string, messages: any[], temperature: number, systemPrompt?: string) {
  // Anthropic uses system prop outside messages, and doesn't support 'system' role in messages array the same way
  const anthropicMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic Error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callGemini(apiKey: string, model: string, messages: any[], temperature: number, systemPrompt?: string) {
  // Configurar modelo (remover prefixo se existir, ex: google/gemini-1.5 -> gemini-1.5)
  const cleanModel = model.replace("google/", "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  // Conversão de mensagens para formato Gemini
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

  const payload: any = {
    contents: contents,
    generationConfig: {
      temperature: temperature,
    },
  };

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini Error (${response.status}): ${error}`);
  }

  const data = await response.json();
  // Safe extraction
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response is empty or invalid format");
  return text;
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { agentId, message, conversationHistory = [] } = await req.json() as ChatRequest;

    if (!agentId || !message) {
      return new Response(
        JSON.stringify({ error: "agentId and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load agent
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: corsHeaders });
    }

    if (!agent.is_active) {
      // Allow testing even if inactive, but warn log
      console.log("Testing inactive agent:", agentId);
      // return new Response(JSON.stringify({ error: "Agent is not active" }), { status: 400, headers: corsHeaders });
    }

    // 2. Load AI Config
    const { data: aiConfig, error: configError } = await supabase
      .from("ai_provider_configs")
      .select("api_key, provider, model")
      .eq("user_id", agent.user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!aiConfig?.api_key) {
      console.error("AI Config Missing for user:", agent.user_id);
      return new Response(
        JSON.stringify({ error: "Configuração de IA não encontrada ou inativa. Vá em Configurações > IA e ative um provedor (OpenAI, Gemini, etc)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = aiConfig.api_key;
    const provider = aiConfig.provider || "openai"; // Default fallback
    // Model priority: Agent Specific > Provider Default > Hard fallback
    const model = agent.model || aiConfig.model || "gpt-4o-mini";

    // 3. Prepare System Prompt
    let systemMessage = agent.system_prompt || "Você é um assistente útil.";
    if (agent.system_rules) {
      systemMessage = `## REGRAS ABSOLUTAS (NUNCA QUEBRE ESTAS REGRAS):\n${agent.system_rules}\n\n## INSTRUÇÕES:\n${systemMessage}`;
    }

    // 4. Build Chat History
    const messages = [
      { role: "system", content: systemMessage },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    const startTime = Date.now();
    console.log(`[AgentChat] Calling ${provider} with model ${model}`);

    // 5. Call Provider
    let assistantMessage = "";
    try {
      if (provider === 'anthropic') {
        assistantMessage = await callAnthropic(apiKey, model, messages, agent.temperature || 0.7, systemMessage);
      } else if (provider === 'gemini') {
        assistantMessage = await callGemini(apiKey, model, messages, agent.temperature || 0.7, systemMessage);
      } else {
        // OpenAI and compatibles
        assistantMessage = await callOpenAI(apiKey, model, messages, agent.temperature || 0.7);
      }
    } catch (providerError: any) {
      console.error("AI Provider Exception:", providerError);
      const msg = providerError.message || JSON.stringify(providerError);
      return new Response(
        JSON.stringify({ error: `Erro no Provedor de IA (${provider}): ${msg}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const executionTime = Date.now() - startTime;

    // 6. Log interaction
    await supabase.from("agent_runs").insert({
      agent_id: agentId,
      user_id: agent.user_id,
      input_message: message,
      output_message: assistantMessage,
      execution_time_ms: executionTime,
      graph_state: {
        provider: provider,
        model: model,
        temperature: agent.temperature,
      },
      channel: "chat",
    });

    // 7. Update stats
    await supabase.rpc('increment_agent_responses', { agent_id: agentId }).catch(async () => {
      // Fallback if RPC doesn't exist
      await supabase
        .from("ai_agents")
        .update({
          responses_count: (agent.responses_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId);
    });

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        executionTime,
        model: model,
        provider: provider
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Critical Error in agent-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
