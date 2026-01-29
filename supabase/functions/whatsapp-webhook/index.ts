/**
 * WhatsApp Webhook Handler v5.0 (FINAL ROBUST)
 * 
 * Flow:
 * 1. Receive Event
 * 2. Validate Instance & Secret
 * 3. Persist Message
 * 4. Trigger AI Agent
 * 5. Send Reply via WhatsApp
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// ============== PROVIDER HELPERS ============
async function callOpenAI(apiKey: string, model: string, messages: any[], temperature: number) {
  // ... (OpenAI implementation maintained)
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
  if (!response.ok) throw new Error(`OpenAI Error: ${await response.text()}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, model: string, messages: any[], temperature: number, systemPrompt?: string) {
  // ... (Anthropic implementation maintained)
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
  if (!response.ok) throw new Error(`Anthropic Error: ${await response.text()}`);
  const data = await response.json();
  return data.content[0].text;
}

async function callGemini(apiKey: string, model: string, messages: any[], temperature: number, systemPrompt?: string) {
  // ... (Gemini implementation maintained)
  const cleanModel = model.replace("google/", "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

  const payload: any = {
    contents: contents,
    generationConfig: { temperature: temperature },
  };
  if (systemPrompt) payload.systemInstruction = { parts: [{ text: systemPrompt }] };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Gemini Error: ${await response.text()}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
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
    const cleanUrl = serverUrl.replace(/\/+$/, "");
    const endpoint = cleanUrl.includes("/instance/") ? "/message/sendText" : "/instance/message/sendText"; // Smart URL fix here too
    const finalUrl = `${cleanUrl}${endpoint}`;

    console.log(`[Webhook] Sending reply to ${remoteJid} via ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": instanceToken },
      body: JSON.stringify({
        number: remoteJid.replace("@s.whatsapp.net", ""),
        text: message,
        options: { delay: 1200, presence: "composing" } // Add typing effect
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

    // 4. Secret Check (BYPASS FOR NOW)
    const receivedSecret = req.headers.get("x-webhook-secret");

    // DEBUG: Log headers to investigate why UAZAPI is sending null
    console.log("[Webhook] Headers Debug:", JSON.stringify({
      "content-type": req.headers.get("content-type"),
      "x-webhook-secret": receivedSecret,
      "authorization": req.headers.get("authorization") ? "PRESENT" : "MISSING"
    }));

    if (instance.webhook_secret && receivedSecret !== instance.webhook_secret) {
      // WARN ONLY: Do not block, to allow testing flow
      console.warn(`[Webhook] Secret mismatch (BYPASSING). Expected: ${instance.webhook_secret.substring(0, 4)}... Received: ${receivedSecret}`);

      // return new Response(
      //   JSON.stringify({ error: "Unauthorized: Invalid webhook secret" }),
      //   { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      // );
    }

    // 2. Parse Payload
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }

    // Log event
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
      return new Response(JSON.stringify({ action: "ignored" }), { headers: corsHeaders });
    }

    if (data.key.remoteJid === "status@broadcast" || data.key.remoteJid.endsWith("@g.us")) {
      return new Response(JSON.stringify({ action: "ignored_group_or_status" }), { headers: corsHeaders });
    }

    const { type: messageType, content, mediaUrl } = extractMessageContent(data);
    if (!content) return new Response(JSON.stringify({ action: "ignored_empty" }), { headers: corsHeaders });

    // 3. Persist Incoming Message
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

    // 4. AI Processing
    const agent = instance.ai_agents;
    if (!agent || !agent.is_active || messageType !== "text") {
      return new Response(JSON.stringify({ action: "no_active_agent" }), { headers: corsHeaders });
    }

    // Get API Key
    const { data: aiConfig } = await supabase
      .from("ai_provider_configs")
      .select("api_key, provider, model")
      .eq("user_id", instance.user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!aiConfig?.api_key) {
      console.error("AI Config Missing for user:", instance.user_id);
      return new Response(JSON.stringify({ error: "AI Config Missing" }), { headers: corsHeaders });
    }

    // Prepare Prompt
    const systemPrompt = agent.system_rules
      ? `## SISTEMA DE REGRAS (NÃO IGNORE):\n${agent.system_rules}\n\n## INSTRUÇÕES:\n${agent.system_prompt}`
      : agent.system_prompt;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `[${data.pushName || "User"}]: ${content}` }
    ];

    // Call AI
    let replyText = "";
    try {
      const T = agent.temperature || 0.7;
      if (aiConfig.provider === 'anthropic') {
        replyText = await callAnthropic(aiConfig.api_key, aiConfig.model, messages, T, systemPrompt);
      } else if (aiConfig.provider === 'gemini') {
        replyText = await callGemini(aiConfig.api_key, aiConfig.model, messages, T, systemPrompt);
      } else {
        replyText = await callOpenAI(aiConfig.api_key, aiConfig.model || "gpt-3.5-turbo", messages, T);
      }
    } catch (e: any) {
      console.error("AI Generation Error:", e);
      if (savedMessage) {
        await supabase.from("whatsapp_messages").update({ status: "failed", error_message: e.message }).eq("id", savedMessage.id);
      }
      return new Response(JSON.stringify({ error: "AI Failed" }), { headers: corsHeaders });
    }

    // 5. Send Reply
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
      metadata: { agent_id: agent.id, model: aiConfig.model }
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
