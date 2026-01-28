/**
 * WhatsApp Send Message
 * 
 * Endpoint para enviar mensagens via UAZAPI
 * Separado do webhook para melhor desacoplamento
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  instanceId: string;
  phone: string;
  message: string;
  messageType?: "text" | "image" | "document";
  mediaUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", claimsData.user.id);

    const { instanceId, phone, message, messageType = "text", mediaUrl } = await req.json() as SendMessageRequest;

    if (!instanceId || !phone || !message) {
      return new Response(
        JSON.stringify({ error: "instanceId, phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar instância
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!instance.server_url || !instance.instance_token) {
      return new Response(
        JSON.stringify({ error: "Instance not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar número (remover caracteres especiais)
    const formattedPhone = phone.replace(/\D/g, "");
    const remoteJid = `${formattedPhone}@s.whatsapp.net`;

    // Definir endpoint baseado no tipo de mensagem
    let endpoint = "/message/sendText";
    let body: Record<string, unknown> = {
      number: formattedPhone,
      text: message,
    };

    if (messageType === "image" && mediaUrl) {
      endpoint = "/message/sendMedia";
      body = {
        number: formattedPhone,
        mediatype: "image",
        media: mediaUrl,
        caption: message,
      };
    } else if (messageType === "document" && mediaUrl) {
      endpoint = "/message/sendMedia";
      body = {
        number: formattedPhone,
        mediatype: "document",
        media: mediaUrl,
        caption: message,
      };
    }

    // Enviar via UAZAPI
    const response = await fetch(`${instance.server_url}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": instance.instance_token,
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("UAZAPI error:", responseData);
      
      // Salvar mensagem com status de erro
      await supabase.from("whatsapp_messages").insert({
        user_id: instance.user_id,
        instance_id: instance.id,
        direction: "outgoing",
        message_type: messageType,
        remote_jid: remoteJid,
        content: message,
        media_url: mediaUrl,
        status: "failed",
        error_message: JSON.stringify(responseData),
      });

      return new Response(
        JSON.stringify({ error: "Failed to send message", details: responseData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Salvar mensagem enviada
    const { data: savedMessage } = await supabase
      .from("whatsapp_messages")
      .insert({
        user_id: instance.user_id,
        instance_id: instance.id,
        direction: "outgoing",
        message_type: messageType,
        remote_jid: remoteJid,
        content: message,
        media_url: mediaUrl,
        status: "sent",
        external_id: responseData?.key?.id,
      })
      .select()
      .single();

    console.log("Message sent successfully:", savedMessage?.id);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: savedMessage?.id,
        externalId: responseData?.key?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
