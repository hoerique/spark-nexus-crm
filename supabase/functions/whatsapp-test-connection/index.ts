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

    // Create client with user's auth token to validate
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

    const { instanceId, serverUrl, instanceToken } = await req.json() as TestConnectionRequest;

    let testUrl = serverUrl;
    let testToken = instanceToken;

    // Se foi passado instanceId, buscar dados do banco
    if (instanceId) {
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

    // Testar conexão com UAZAPI (endpoint de status)
    const response = await fetch(`${testUrl}/instance/connectionState`, {
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
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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
