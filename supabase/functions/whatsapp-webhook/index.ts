/**
 * WhatsApp Webhook Handler v6.0 (Unified with Agent Chat)
 * 
 * Flow:
 * 1. Receive Event
 * 2. Validate Instance
 * 3. Secret Check
 * 4. Persist Message
 * 5. Trigger AI Agent (Unified Logic with agent-chat)
 * 6. Send Reply via WhatsApp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// ============== PROVIDER HELPERS (Unified with agent-chat) ============

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

// =========================================================================

function extractMessageContent(messageData: any): { type: string; content: string; mediaUrl?: string } {
  try {
    if (!messageData?.message) return { type: "unknown", content: "" };

    const msg = messageData.message;
    if (msg.conversation) return { type: "text", content: msg.conversation };
    if (msg.extendedTextMessage?.text) return { type: "text", content: msg.extendedTextMessage.text };
    if (msg.imageMessage) return { type: "image", content: msg.imageMessage.caption || "[Imagem]", mediaUrl: msg.imageMessage.url };
    if (msg.audioMessage) return { type: "audio", content: "[Áudio]", mediaUrl: msg.audioMessage.url };
    if (msg.documentMessage) return { type: "document", content: msg.documentMessage.fileName || "[Documento]", mediaUrl: msg.documentMessage.url };

    return { type: "unknown", content: JSON.stringify(msg).substring(0, 100) };
  } catch (e) {
    console.error("Error extracting content:", e);
    return { type: "error", content: "" };
  }
}

async function sendWhatsAppMessage(serverUrl: string, instanceToken: string, remoteJid: string, message: string) {
  try {
    // Garantir que a URL não tenha barra no final
    const cleanUrl = serverUrl.replace(/\/+$/, "");

    // Endpoint padrão para envio de texto (mesmo padrão usado na function whatsapp-send)
    const endpoint = "/message/sendText";
    const finalUrl = `${cleanUrl}${endpoint}`;

    console.log(`[Webhook] Sending reply to ${remoteJid} via ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": instanceToken
      },
      body: JSON.stringify({
        number: remoteJid.replace("@s.whatsapp.net", ""),
        text: message
      }),
    });

    if (!response.ok) {
      console.error("UAZAPI send error:", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
}

serve(async (req) => {
  // STARTUP DEBUG
  console.log(`[Webhook] v6.0 STARTUP (Unified) - Method: ${req.method} - URL: ${req.url}`);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const instanceId = url.searchParams.get("instance");

  if (!instanceId) {
    return new Response(JSON.stringify({ error: "Missing instance param" }), { status: 400, headers: corsHeaders });
  }

  try {
    // Env Vars (Custom + Standard)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("MY_SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Webhook] Missing Env Vars");
      return new Response(JSON.stringify({ error: "Server Config Error" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validate Instance
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*, ai_agents(*)")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: "Instance not found" }), { status: 404, headers: corsHeaders });
    }

    // 2. Secret Check (BYPASS FOR NOW)
    const receivedSecret = req.headers.get("x-webhook-secret");
    if (instance.webhook_secret && receivedSecret !== instance.webhook_secret) {
      console.warn(`[Webhook] Secret mismatch (BYPASSING).`);
    }

    // 3. Parse Payload
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }

    // Log event to webhook_logs
    const eventType = payload.event || "unknown";
    await supabase.from("webhook_logs").insert({
      user_id: instance.user_id,
      instance_id: instance.id,
      event_type: eventType,
      payload: payload,
      http_status: 200
    });

    const data = payload.data;
    // Filter out irrelevant events
    if (!data || !data.key || data.key.fromMe || data.wasSentByApi || eventType !== "messages.upsert") {
      console.log("[Webhook] Ignored event:", eventType, "FromMe:", data?.key?.fromMe, "Api:", data?.wasSentByApi);
      return new Response(JSON.stringify({ action: "ignored" }), { headers: corsHeaders });
    }

    if (data.key.remoteJid === "status@broadcast" || data.key.remoteJid.endsWith("@g.us")) {
      return new Response(JSON.stringify({ action: "ignored_group_or_status" }), { headers: corsHeaders });
    }

    const { type: messageType, content, mediaUrl } = extractMessageContent(data);
    if (!content) return new Response(JSON.stringify({ action: "ignored_empty" }), { headers: corsHeaders });

    // 4. Persist Incoming Message
    const { data: savedMessage, error: saveError } = await supabase
      .from("whatsapp_messages")
      .insert({
        user_id: instance.user_id,
        instance_id: instance.id,
        direction: "incoming",
        message_type: messageType,
        remote_jid: data.key.remoteJid,
        content: content,
        media_url: mediaUrl,
        status: "processing",
        external_id: data.key.id,
        metadata: { pushName: data.pushName }
      })
      .select()
      .single();

    if (saveError) console.error("DB Save Error:", saveError);

    // 5. AI Processing (UNIFIED WITH AGENT-CHAT)
    const agent = instance.ai_agents;

    // Strict checks
    if (!agent || !agent.is_active || messageType !== "text") {
      console.log("[Webhook] Agent inactive or non-text. Agent:", agent?.id);
      return new Response(JSON.stringify({ action: "no_active_agent" }), { headers: corsHeaders });
    }

    // Load AI Config using consistent logic
    const { data: aiConfig } = await supabase
      .from("ai_provider_configs")
      .select("api_key, provider, model")
      .eq("user_id", instance.user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!aiConfig?.api_key) {
      console.error("AI Config Missing for user:", instance.user_id);
      if (savedMessage) {
        await supabase.from("whatsapp_messages").update({ status: "failed", error_message: "AI Config Missing" }).eq("id", savedMessage.id);
      }
      return new Response(JSON.stringify({ error: "AI Config Missing" }), { headers: corsHeaders });
    }

    // Unified Model Selection Logic
    const apiKey = aiConfig.api_key;
    const provider = aiConfig.provider || "openai";
    const model = agent.model || aiConfig.model || "gpt-4o-mini"; // Priority: Agent > Global > Fallback

    // Unified Prompt Construction
    let systemMessage = agent.system_prompt || "Você é um assistente útil.";
    if (agent.system_rules) {
      systemMessage = `## REGRAS ABSOLUTAS (NUNCA QUEBRE ESTAS REGRAS):\n${agent.system_rules}\n\n## INSTRUÇÕES:\n${systemMessage}`;
    }

    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: `[${data.pushName || "User"}]: ${content}` }
    ];

    console.log(`[Webhook] Calling ${provider} with model ${model}`);
    const startTime = Date.now();

    // Call Provider
    let replyText = "";
    try {
      const T = agent.temperature || 0.7;
      if (provider === 'anthropic') {
        replyText = await callAnthropic(apiKey, model, messages, T, systemMessage);
      } else if (provider === 'gemini') {
        replyText = await callGemini(apiKey, model, messages, T, systemMessage);
      } else {
        replyText = await callOpenAI(apiKey, model, messages, T);
      }
    } catch (e: any) {
      console.error("AI Generation Error:", e);
      if (savedMessage) {
        await supabase.from("whatsapp_messages").update({ status: "failed", error_message: e.message }).eq("id", savedMessage.id);
      }
      return new Response(JSON.stringify({ error: "AI Failed" }), { headers: corsHeaders });
    }

    const executionTime = Date.now() - startTime;
    console.log("[Webhook] AI Reply generated:", replyText.substring(0, 50) + "...");

    // 6. Log Interaction to agent_runs (CRITICAL FOR DASHBOARD VIZ)
    if (agent.id) {
      await supabase.from("agent_runs").insert({
        agent_id: agent.id,
        user_id: instance.user_id,
        input_message: content,
        output_message: replyText,
        execution_time_ms: executionTime,
        graph_state: {
          provider: provider,
          model: model,
          temperature: agent.temperature,
          source: "whatsapp"
        },
        channel: "whatsapp",
      });

      // Update Agent Stats
      await supabase.rpc('increment_agent_responses', { agent_id: agent.id }).catch(async () => {
        await supabase
          .from("ai_agents")
          .update({
            responses_count: (agent.responses_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", agent.id);
      });
    }

    // 7. Send Reply
    const sent = await sendWhatsAppMessage(instance.server_url, instance.instance_token, data.key.remoteJid, replyText);

    // Persist Reply
    await supabase.from("whatsapp_messages").insert({
      user_id: instance.user_id,
      instance_id: instance.id,
      direction: "outgoing",
      message_type: "text",
      remote_jid: data.key.remoteJid,
      content: replyText,
      status: sent ? "sent" : "failed",
      metadata: { agent_id: agent.id, model: model }
    });

    if (savedMessage) {
      await supabase.from("whatsapp_messages").update({ status: "processed" }).eq("id", savedMessage.id);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Webhook Critical Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
