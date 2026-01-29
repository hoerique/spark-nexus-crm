/**
 * WhatsApp Test Connection
 * 
 * Testa a conexão com a UAZAPI e retorna status da instância
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestConnectionRequest {
  instanceId?: string;
  serverUrl?: string;
  instanceToken?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[TestConnection] v4.0 - Request received");

    // 1. Get Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[TestConnection] Error: Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header", step: "header_check" }), { status: 401, headers: corsHeaders });
    }

    // 2. Setup Clients & Debug Env
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[TestConnection] Error: Missing Environment Variables (SUPABASE_URL or ANON_KEY)");
      return new Response(JSON.stringify({ error: "Server Configuration Error: Missing Env Vars" }), { status: 500, headers: corsHeaders });
    }

    // 3. Verify User (Using global headers for context)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("[TestConnection] Auth failed:", JSON.stringify(userError));
      console.log("[TestConnection] Bad Auth Header:", authHeader.substring(0, 20) + "...");

      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: userError,
          hint: "Token might be expired or invalid",
          step: "auth_verification"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TestConnection] Auth Success. User:", user.id);

    const { instanceId, serverUrl, instanceToken } = await req.json() as TestConnectionRequest;

    let testUrl = serverUrl;
    let testToken = instanceToken;

    // Se foi passado instanceId, buscar dados do banco
    if (instanceId) {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", instanceId)
        .single();

      if (error || !instance) {
        return new Response(
          JSON.stringify({ error: "Instance not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      testUrl = instance.server_url;
      testToken = instance.instance_token;
    }

    if (!testUrl || !testToken) {
      return new Response(
        JSON.stringify({ error: "serverUrl and instanceToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Adjust URL construction (Smart Handling)
    const cleanUrl = testUrl.replace(/\/+$/, "");
    const endpoint = cleanUrl.includes("/instance/") ? "/connectionState" : "/instance/connectionState";
    const finalUrl = `${cleanUrl}${endpoint}`;

    // console.log(`[TestConnection] Testing URL: ${finalUrl}`);

    // Testar conexão com UAZAPI (endpoint de status)
    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "apikey": testToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("UAZAPI connection test failed:", response.status, errorText);

      return new Response(
        JSON.stringify({
          connected: false,
          status: "error",
          message: `Connection failed: ${response.status}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const isConnected = data?.state === "open" || data?.instance?.state === "open";

    // Se foi passado instanceId, atualizar status no banco
    if (instanceId) {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from("whatsapp_instances")
        .update({
          status: isConnected ? "connected" : "disconnected",
          last_connection_at: isConnected ? new Date().toISOString() : null,
        })
        .eq("id", instanceId);
    }

    return new Response(
      JSON.stringify({
        connected: isConnected,
        status: isConnected ? "connected" : "disconnected",
        details: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Test connection error:", error);
    return new Response(
      JSON.stringify({
        connected: false,
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
