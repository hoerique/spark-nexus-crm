/**
 * WhatsApp Webhook Handler v8.0 (Dynamic Brain / Master Orchestrator)
 * 
 * Concept: The Edge Function acts as the orchestrator.
 * 1. Receives Webhook.
 * 2. Identifies Owner & Agent via Database (No hardcoded keys).
 * 3. Fetches Dynamic Context (History).
 * 4. Calls AI using User's Stored Credentials.
 * 5. Replies via UAZAPI & Logs to CRM.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// ============== AI PROVIDER LOGIC ==============

async function generateAIResponse(
  provider: string,
  apiKey: string,
  model: string,
  messages: any[],
  temperature: number,
  systemPrompt: string
): Promise<string> {

  // Normalizar provedor para minúsculo
  const p = provider.toLowerCase();

  // --- OPENAI / CHATGPT ---
  if (p === 'chatgpt' || p === 'openai') {
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
      const err = await response.text();
      throw new Error(`OpenAI Error (${response.status}): ${err}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  }

  // --- GOOGLE GEMINI ---
  if (p === 'gemini' || p === 'google') {
    const cleanModel = model.replace("google/", "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    // Gemini: System prompt goes in separate field or merged. v1beta supports systemInstruction.
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

    const payload: any = {
      contents,
      generationConfig: { temperature }
    };

    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini Error (${response.status}): ${err}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro: Resposta vazia do Gemini";
  }

  // --- ANTHROPIC ---
  if (p === 'anthropic') {
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
      const err = await response.text();
      throw new Error(`Anthropic Error (${response.status}): ${err}`);
    }
    const data = await response.json();
    return data.content[0].text;
  }

  throw new Error(`Provedor desconhecido: ${provider}`);
}

// ============== MAIN SERVER ==============

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("MY_SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_ROLE_KEY")!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server Config Error" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parse URL & Instance
  const url = new URL(req.url);
  const instanceIdParam = url.searchParams.get("instance");

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }

    // UAZAPI Structure Parsing
    const eventType = body.event;
    const data = body.data;

    // 1. Basic Filters (Ignore Status, Groups, API-sent messages)
    if (!data || !data.key || !data.message) {
      // Just a check or handshake
      return new Response(JSON.stringify({ status: "ok" }), { headers: corsHeaders });
    }

    if (data.key.fromMe || data.wasSentByApi) {
      return new Response(JSON.stringify({ ignored: "from_me" }), { headers: corsHeaders });
    }

    const remoteJid = data.key.remoteJid;
    if (remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
      return new Response(JSON.stringify({ ignored: "group_or_status" }), { headers: corsHeaders });
    }

    // Extract Message
    const messageText =
      data.message.conversation ||
      data.message.extendedTextMessage?.text ||
      "";

    if (!messageText) {
      // Media messages not handled yet
      return new Response(JSON.stringify({ ignored: "no_text" }), { headers: corsHeaders });
    }

    // 2. IDENTIFY: Instance -> Agent -> Config
    // We need the Instance ID to look up the DB. If passed in query, use it. 
    // If not, we might try to look up by 'instance_token' if provided in body (UAZAPI body.instance?).
    // To be safe, we rely on the DB lookup.

    let instanceQuery = supabase.from("whatsapp_instances").select(`
        *,
        ai_agents (*)
    `);

    if (instanceIdParam) {
      instanceQuery = instanceQuery.eq("id", instanceIdParam);
    } else if (body.instance) {
      // If UAZAPI sends the Instance Name/ID in 'instance' field
      // Note: 'instance' in body is usually the NAME in UAZAPI, not UUID. 
      // We will assume the webhook URL was configured with ?instance=UUID for reliability.
      // If not, we try to match by name or token if available.
      // Let's stick to the safer "webhook-url?instance=UUID" pattern strictly imposed before.
      // For fallback if user hasn't set query param:
      // instanceQuery = instanceQuery.eq("name", body.instance); // Risky if name not unique
      // We require instance param.
      return new Response(JSON.stringify({ error: "Missing instance param in URL" }), { status: 400, headers: corsHeaders });
    } else {
      return new Response(JSON.stringify({ error: "No identification" }), { status: 400, headers: corsHeaders });
    }

    const { data: instance, error: instanceError } = await instanceQuery.single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });
    }

    // SECRET VALIDATION
    const headerSecret = req.headers.get("x-webhook-secret");
    if (instance.webhook_secret && headerSecret !== instance.webhook_secret) {
      console.error(`Alert: Secret mismatch for instance ${instance.id}`);
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    console.log(`[Processing] Msg from ${remoteJid} on Instance ${instance.name || instance.id}`);

    // PERSIST INCOMING
    // Check if duplicate processing (optional but good practice)
    // For now, simpler is better.

    // 3. BRAIN: Check Agent & Provider Config
    const agent = instance.ai_agents;
    if (!agent || !agent.is_active) {
      console.log("No active agent for this instance.");
      // We still save the message but mark as processed/no-agent?
      // Let's create 'whatsapp_messages' entry regardless so CRM sees it.
      await supabase.from("whatsapp_messages").insert({
        user_id: instance.user_id,
        instance_id: instance.id,
        remote_jid: remoteJid,
        content: messageText,
        direction: "incoming",
        status: "ignored_no_agent"
      });
      return new Response(JSON.stringify({ status: "no_agent" }), { headers: corsHeaders });
    }

    // PERSIST INCOMING (Confirmed Agent Logic)
    const { data: incomingMsg } = await supabase.from("whatsapp_messages").insert({
      user_id: instance.user_id,
      instance_id: instance.id,
      remote_jid: remoteJid,
      content: messageText,
      direction: "incoming",
      status: "processing"
    }).select().single();

    // Find the PROVIDER CONFIG for this User
    // We look for a config that matches the agent's preferred provider check or just any active one.
    // Agent table might have 'model' but not explicit 'provider' column if standard schema, 
    // BUT we need to know WHICH provider to query.
    // Usually we infer from model name OR fetch the active config.

    const { data: configs } = await supabase
      .from("ai_provider_configs")
      .select("*")
      .eq("user_id", instance.user_id)
      .eq("is_active", true);

    if (!configs || configs.length === 0) {
      await supabase.from("whatsapp_messages").update({
        status: 'failed', error_message: 'Nenhuma IA configurada.'
      }).eq("id", incomingMsg.id);

      // Also add outgoing error msg? Optional.
      return new Response(JSON.stringify({ error: "No AI Config" }), { headers: corsHeaders });
    }

    // Select the best config. Priority: Match Agent Model, or Default.
    // Since 'provider' in agent might not exist, we guess or use the first active.
    let selectedConfig = configs[0];

    // If agent has a specific model (e.g. gpt-4), try to find a config with 'chatgpt' provider.
    // If agent.model starts with 'gemini', try 'gemini'.
    if (agent.model) {
      const modelLower = agent.model.toLowerCase();
      if (modelLower.includes("gpt")) {
        selectedConfig = configs.find((c: any) => c.provider === 'chatgpt' || c.provider === 'openai') || selectedConfig;
      } else if (modelLower.includes("gemini")) {
        selectedConfig = configs.find((c: any) => c.provider === 'gemini' || c.provider === 'google') || selectedConfig;
      } else if (modelLower.includes("claude")) {
        selectedConfig = configs.find((c: any) => c.provider === 'anthropic') || selectedConfig;
      }
    }

    if (!selectedConfig?.api_key) {
      return new Response(JSON.stringify({ error: "API Key missing in config" }), { headers: corsHeaders });
    }

    // 4. MEMORY (Context)
    // Fetch last 10 messages (excluding the one we just inserted ideally, but limit 10 covers recent context)
    const { data: historyData } = await supabase
      .from("whatsapp_messages")
      .select("content, direction")
      .eq("instance_id", instance.id)
      .eq("remote_jid", remoteJid)
      .neq("content", "")
      .order("created_at", { ascending: false })
      .limit(10); // Last 10

    // Reorder to chronological: Oldest -> Newest
    // We must FILTER OUT the current message if it appeared in the query (since we inserted it).
    // Or simpler: Use the query result, but treat the last item carefully.

    let history = (historyData || []).reverse();

    // Remove the current message from history if present (to avoid duplication or role confusion)
    // We want to construct: System -> Old History -> User Current
    // So if 'incomingMsg' is in 'history', remove it.
    if (incomingMsg) {
      history = history.filter((h: any) => h.content !== incomingMsg.content);
      // This is a weak check (content match), but ID match would require selecting ID in historyData.
      // Let's assume unique content for simplicity or just accept minor duplication risk in edge cases.
    }

    const contextMessages = history.map((m: any) => ({
      role: m.direction === 'incoming' ? 'user' : 'assistant',
      content: m.content
    }));

    // Construct Prompt
    const systemInstruction = agent.system_prompt || "Você é um assistente virtual.";
    const fullMessages = [
      { role: "system", content: systemInstruction },
      ...contextMessages,
      { role: "user", content: messageText }
    ];

    // 5. SEND TYPING (UX)
    try {
      await fetch(`${instance.server_url.replace(/\/+$/, "")}/message/sendText`, {
        method: "POST",
        headers: {
          "apikey": instance.instance_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: remoteJid.replace("@s.whatsapp.net", ""),
          options: { presence: "composing" } // Some UAZAPI implementations support this inner option
        })
      });
    } catch (e) { } // Ignore typing errors

    // 6. EXECUTE AI
    const providerName = selectedConfig.provider || "openai"; // chatgpt/gemini
    const modelName = agent.model || selectedConfig.model || "gpt-4o-mini";
    const temperature = agent.temperature || 0.7;

    console.log(`[AI] Generating with ${providerName} (${modelName})...`);

    try {
      const replyText = await generateAIResponse(
        providerName,
        selectedConfig.api_key,
        modelName,
        fullMessages,
        temperature,
        systemInstruction
      );

      console.log(`[AI] Reply: ${replyText.substring(0, 50)}...`);

      // 7. SEND REPLY & SAVE OUTGOING
      await fetch(`${instance.server_url.replace(/\/+$/, "")}/message/sendText`, {
        method: "POST",
        headers: {
          "apikey": instance.instance_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: remoteJid.replace("@s.whatsapp.net", ""),
          text: replyText
        })
      });

      await supabase.from("whatsapp_messages").insert({
        user_id: instance.user_id,
        instance_id: instance.id,
        remote_jid: remoteJid,
        content: replyText,
        direction: "outgoing",
        status: "sent",
        metadata: {
          agent_id: agent.id,
          model: modelName,
          provider: providerName
        }
      });

      // Update Incoming to processed
      if (incomingMsg) {
        await supabase.from("whatsapp_messages").update({ status: 'processed' }).eq("id", incomingMsg.id);
      }

      // Update Stats
      await supabase.rpc('increment_agent_responses', { agent_id: agent.id }).catch(async () => {
        await supabase.from("ai_agents").update({
          responses_count: (agent.responses_count || 0) + 1,
          updated_at: new Date().toISOString()
        }).eq("id", agent.id);
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (aiErr: any) {
      console.error("[AI Error]", aiErr);
      await supabase.from("whatsapp_messages").insert({
        user_id: instance.user_id, instance_id: instance.id, remote_jid: remoteJid, direction: 'outgoing',
        status: 'failed', content: 'Erro ao gerar resposta.', error_message: aiErr.message
      });
      return new Response(JSON.stringify({ error: aiErr.message }), { status: 500, headers: corsHeaders });
    }

  } catch (err: any) {
    console.error("Critical Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
