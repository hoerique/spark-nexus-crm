/**
 * WhatsApp Webhook Handler - Robust Version
 * 
 * Recebe eventos da UAZAPI, processa e aciona o agente de IA.
 * Inclui logs detalhados e tratamento de erros aprimorado.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers para requisições da UAZAPI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Tipos para eventos da UAZAPI (Simplificado para robustez)
interface UAZApiMessageEvent {
  event?: string;
  instance?: string;
  data?: any; // Usando any no nível superior para evitar quebras de schema rígido
}

// Extrai conteúdo da mensagem de forma segura
function extractMessageContent(messageData: any): { type: string; content: string; mediaUrl?: string } {
  try {
    if (!messageData?.message) {
      return { type: "unknown", content: "" };
    }

    const msg = messageData.message;

    // Texto simples
    if (msg.conversation) return { type: "text", content: msg.conversation };

    // Texto estendido
    if (msg.extendedTextMessage?.text) return { type: "text", content: msg.extendedTextMessage.text };

    // Mídia
    if (msg.imageMessage) return { type: "image", content: msg.imageMessage.caption || "[Imagem]", mediaUrl: msg.imageMessage.url };
    if (msg.audioMessage) return { type: "audio", content: "[Áudio]", mediaUrl: msg.audioMessage.url };
    if (msg.documentMessage) return { type: "document", content: msg.documentMessage.fileName || "[Documento]", mediaUrl: msg.documentMessage.url };

    return { type: "unknown", content: JSON.stringify(msg).substring(0, 100) };
  } catch (e) {
    console.error("Error extracting message content:", e);
    return { type: "error", content: "" };
  }
}

// Envia mensagem de volta via UAZAPI
async function sendWhatsAppMessage(
  serverUrl: string,
  instanceToken: string,
  remoteJid: string,
  message: string
): Promise<boolean> {
  try {
    console.log(`Sending message to ${remoteJid} via ${serverUrl}`);
    const response = await fetch(`${serverUrl}/message/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": instanceToken,
      },
      body: JSON.stringify({
        number: remoteJid.replace("@s.whatsapp.net", ""),
        text: message,
      }),
    });

    if (!response.ok) {
      const respText = await response.text();
      console.error("UAZAPI send error:", response.status, respText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);

  // LOG START
  console.log(`[Webhook] New request: ${req.method} ${url.pathname}`);

  // 1. Identificação da Instância
  const instanceId = url.searchParams.get("instance");
  if (!instanceId) {
    console.error("[Webhook] Missing 'instance' query parameter");
    return new Response(
      JSON.stringify({ error: "Missing instance parameter. Usage: /whatsapp-webhook?instance=YOUR_INSTANCE_ID" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 2. Setup Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Webhook] Internal Env Vars Missing");
      return new Response(JSON.stringify({ error: "Server Configuration Error" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Buscar e Validar Instância
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*, ai_agents(*)")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      console.error(`[Webhook] Instance not found: ${instanceId}`, instanceError);
      return new Response(
        JSON.stringify({ error: "Instance not found or database error" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validar Secret (Header)
    const receivedSecret = req.headers.get("x-webhook-secret");
    if (instance.webhook_secret && receivedSecret !== instance.webhook_secret) {
      console.warn(`[Webhook] Invalid secret. Expected: ${instance.webhook_secret.substring(0, 4)}... Received: ${receivedSecret}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Parse Payload
    let payload: any;
    try {
      const text = await req.text(); // Read text first for debugging if needed
      if (!text) throw new Error("Empty body");
      payload = JSON.parse(text);
    } catch (e) {
      console.error("[Webhook] Invalid JSON Body:", e);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }

    const eventType = payload.event || "unknown";
    console.log(`[Webhook] Event: ${eventType} from Instance: ${instance.name}`);

    // Log inicial
    await supabase.from("webhook_logs").insert({
      user_id: instance.user_id,
      instance_id: instance.id,
      event_type: eventType,
      payload: payload,
      http_status: 200,
      processing_status: "received",
    });

    // Filtros de Evento
    const data = payload.data;
    if (!data || !data.key) {
      console.log("[Webhook] Ignored: No message data found.");
      return new Response(JSON.stringify({ success: true, action: "ignored_structure" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (data.key.fromMe) {
      console.log("[Webhook] Ignored: Message from myself.");
      return new Response(JSON.stringify({ success: true, action: "ignored_self" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extração de Conteúdo
    const { type: messageType, content, mediaUrl } = extractMessageContent(data);
    const remoteJid = data.key.remoteJid;
    const pushName = data.pushName || "Usuário";

    if (!content || !remoteJid) {
      console.log("[Webhook] Ignored: Unknown content or missing remoteJid.");
      return new Response(JSON.stringify({ success: true, action: "ignored_content" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 6. Persistir Mensagem do Usuário
    console.log(`[Webhook] Processing message from ${pushName}: ${content.substring(0, 50)}...`);
    const { data: savedMessage, error: saveError } = await supabase
      .from("whatsapp_messages")
      .insert({
        user_id: instance.user_id,
        instance_id: instance.id,
        direction: "incoming",
        message_type: messageType,
        remote_jid: remoteJid,
        content: content,
        media_url: mediaUrl,
        status: "processing",
        external_id: data.key.id,
        metadata: { pushName, timestamp: data.messageTimestamp },
      })
      .select()
      .single();

    if (saveError) console.error("[Webhook] DB Save Error:", saveError);
    else {
      // 6.5 Upsert Lead (CRITICAL FEATURE REQUEST)
      try {
        const cleanPhone = remoteJid.replace("@s.whatsapp.net", "").replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length > 10 ? `+${cleanPhone}` : cleanPhone;

        // Check if lead exists
        const { data: existingLead, error: findLeadError } = await supabase
          .from("leads")
          .select("id, name")
          .eq("user_id", instance.user_id)
          .eq("phone", formattedPhone) // Assumes phone format consistency
          .maybeSingle();

        if (findLeadError) {
          console.error("[Webhook] Error finding lead:", findLeadError);
        } else if (existingLead) {
          console.log(`[Webhook] Lead already exists: ${existingLead.name} (${existingLead.id})`);
          // Optional: Update name if it was generic before and now we have a real name?
          // For now, doing nothing as requested "ir para aí" implies creation mainly.
        } else {
          console.log(`[Webhook] Creating new lead for ${pushName} - ${formattedPhone}`);
          const { error: createLeadError } = await supabase
            .from("leads")
            .insert({
              user_id: instance.user_id,
              name: pushName || formattedPhone,
              phone: formattedPhone,
              status: "new",
              source: "whatsapp",
              notes: "Criado automaticamente via WhatsApp Webhook"
            });

          if (createLeadError) console.error("[Webhook] Error creating lead:", createLeadError);
        }
      } catch (leadError) {
        console.error("[Webhook] Lead processing error:", leadError);
      }
    }

    // 7. Lógica do Agente (AI Provider Direct)
    const agent = instance.ai_agents;

    // Verificações de paragem
    if (!agent || !agent.is_active) {
      console.log("[Webhook] No active agent. Stopping.");
      return new Response(JSON.stringify({ success: true, action: "no_agent" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (messageType !== "text") {
      console.log("[Webhook] Non-text message. Stopping.");
      return new Response(JSON.stringify({ success: true, action: "skipped_media" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Buscar API KEY do Banco de Dados
    const { data: aiConfig, error: configError } = await supabase
      .from("ai_provider_configs")
      .select("api_key, provider, model")
      .eq("user_id", instance.user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (configError) console.error("[Webhook] Error fetching AI config:", configError);
    const apiKey = aiConfig?.api_key;

    if (!apiKey) {
      console.error("[Webhook] Missing AI API Key in 'ai_provider_configs'. Cannot reply.");
      // Não falhar o webhook completamente, apenas logar erro
      await supabase.from("webhook_logs").insert({
        user_id: instance.user_id,
        instance_id: instance.id,
        event_type: "error",
        payload: { error: "Missing API Key", details: "Configure 'ai_provider_configs' table" },
        processing_status: "failed"
      });
      return new Response(JSON.stringify({ error: "AI Configuration missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Preparar Prompt
    let systemMessage = agent.system_prompt || "Você é um assistente útil.";
    if (agent.system_rules) {
      systemMessage = `## HARD RULES:\n${agent.system_rules}\n\n## INSTRUCTIONS:\n${systemMessage}`;
    }

    console.log(`[Webhook] Calling AI Provider for agent: ${agent.name}`);
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    // Chamada à IA
    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig?.model || agent.model || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: `[${pushName}]: ${content}` },
        ],
        temperature: agent.temperature || 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errTxt = await aiResponse.text();
      console.error(`[Webhook] AI Error (${aiResponse.status}):`, errTxt);
      if (savedMessage) {
        await supabase.from("whatsapp_messages").update({ status: "failed", error_message: `AI Error: ${aiResponse.status}` }).eq("id", savedMessage.id);
      }
      throw new Error(`AI Gateway Error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const replyText = aiData.choices?.[0]?.message?.content || "Desculpe, não entendi.";

    // 8. Enviar Resposta
    console.log(`[Webhook] Replying with: ${replyText.substring(0, 50)}...`);
    const sent = await sendWhatsAppMessage(
      instance.server_url,
      instance.instance_token,
      remoteJid,
      replyText
    );

    // 9. Persistir Resposta
    await supabase.from("whatsapp_messages").insert({
      user_id: instance.user_id,
      instance_id: instance.id,
      direction: "outgoing",
      message_type: "text",
      remote_jid: remoteJid,
      content: replyText,
      status: sent ? "sent" : "failed",
      metadata: { agent_id: agent.id, model: agent.model },
    });

    if (savedMessage) {
      await supabase.from("whatsapp_messages").update({ status: "processed" }).eq("id", savedMessage.id);
    }

    // Logs finais
    const duration = Date.now() - startTime;
    await supabase.from("webhook_logs").update({ processing_status: "processed", processing_time_ms: duration }).eq("instance_id", instance.id).order("created_at", { ascending: false }).limit(1);

    console.log(`[Webhook] Success. Duration: ${duration}ms`);
    return new Response(
      JSON.stringify({ success: true, executionTime: duration }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[Webhook] Critical Error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
