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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, message, conversationHistory = [] } = await req.json() as ChatRequest;

    if (!agentId || !message) {
      return new Response(
        JSON.stringify({ error: "agentId and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Load agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      console.error("Agent not found:", agentError);
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agent.is_active) {
      return new Response(
        JSON.stringify({ error: "Agent is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Load AI Provider Config (API KEY)
    const { data: aiConfig, error: configError } = await supabase
      .from("ai_provider_configs")
      .select("api_key, provider, model")
      .eq("user_id", agent.user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (configError) console.error("Error fetching AI config:", configError);

    // Fallback to Env if needed (optional) BUT preferring DB as requested
    const apiKey = aiConfig?.api_key;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "AI Config Missing",
          details: "No active API Key found in 'ai_provider_configs' table for this user. Please configure it in the database."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system message
    let systemMessage = agent.system_prompt || "Você é um assistente útil.";
    if (agent.system_rules) {
      systemMessage = `## REGRAS ABSOLUTAS (NUNCA QUEBRE ESTAS REGRAS):\n${agent.system_rules}\n\n## INSTRUÇÕES DO AGENTE:\n${systemMessage}`;
    }

    // Build messages array
    const messages = [
      { role: "system", content: systemMessage },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    const startTime = Date.now();

    // Call LLM Provider (Default: OpenAI)
    // Supports OpenAI standard. Can be adapted for Gemini if base URL changes.
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    console.log(`Calling AI Provider for Agent ${agent.name}...`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig?.model || agent.model || "gpt-4o-mini", // Prefer DB config model, then Agent ideal model, then fallback
        messages,
        temperature: agent.temperature || 0.7,
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Provider error:", response.status, errorText);
      throw new Error(`AI Provider Error (${response.status}): ${errorText}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "Sem resposta";

    // Log the execution
    await supabase.from("agent_runs").insert({
      agent_id: agentId,
      user_id: agent.user_id,
      input_message: message,
      output_message: assistantMessage,
      execution_time_ms: executionTime,
      graph_state: {
        model: agent.model,
        temperature: agent.temperature,
        historyLength: conversationHistory.length,
      },
      channel: "chat",
    });

    // Update agent metrics
    await supabase
      .from("ai_agents")
      .update({
        responses_count: (agent.responses_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    console.log(`Agent ${agent.name} responded in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        executionTime,
        model: agent.model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("agent-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
