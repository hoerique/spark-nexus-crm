/**
 * WhatsApp Test Connection v5.0 (FINAL FIX)
 * 
 * Fixes applied:
 * 1. Auth: Uses supabaseClient.auth.getUser() without args to properly use the global Authorization header.
 * 2. Env Vars: Supports both standard (SUPABASE_URL) and custom (MY_SUPABASE_URL) variable names.
 * 3. URL: "Smart" URL construction to avoid 404s (doesn't duplicate /instance).
 * 4. Debug: Detailed logging for easy diagnosis.
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
    console.log("[TestConnection] v5.0 START - Request received");

    // 1. Get Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[TestConnection] Error: Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: corsHeaders });
    }

    // 2. Setup Clients & Environment Variables (Robust Check)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("MY_SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY"); // Usually standard

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[TestConnection] CRITICAL: Missing Environment Variables");
      return new Response(JSON.stringify({ error: "Server Configuration Error: Missing SUPABASE_URL or ANON_KEY" }), { status: 500, headers: corsHeaders });
    }

    // 3. Verify User (The Fix for 401)
    // We pass the auth header globally, so we don't need to pass the token to getUser()
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("[TestConnection] Auth Failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TestConnection] Auth Success. User:", user.id);

    // 4. Parse Request
    const { instanceId, serverUrl, instanceToken } = await req.json() as TestConnectionRequest;

    let testUrl = serverUrl;
    let testToken = instanceToken;

    // 4b. Fetch from DB if instanceId provided
    if (instanceId) {
      // Service Key Check
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_ROLE_KEY");

      if (!supabaseServiceKey) {
        console.error("[TestConnection] Error: Missing Service Role Key");
        return new Response(JSON.stringify({ error: "Configuration Error: Missing Service Role Key" }), { status: 500, headers: corsHeaders });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: instance, error } = await supabaseAdmin
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
        JSON.stringify({ error: "Configuration Error: serverUrl and instanceToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Connection Test (The Fix for 404)
    // Smart URL Construction: Avoid doubling "/instance"
    const cleanUrl = testUrl.replace(/\/+$/, "");
    const endpoint = cleanUrl.includes("/instance/") ? "/connectionState" : "/instance/connectionState";
    const finalUrl = `${cleanUrl}${endpoint}`;

    console.log(`[TestConnection] Testing Target URL: ${finalUrl}`);

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
          details: errorText
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const isConnected = data?.state === "open" || data?.instance?.state === "open";

    // 6. Update Status (Optional)
    if (instanceId) {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("MY_SERVICE_ROLE_KEY");
      // We know service key exists here if we passed step 4b, but TS might complain or if we skipped 4b logic
      if (supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        await supabaseAdmin
          .from("whatsapp_instances")
          .update({
            status: isConnected ? "connected" : "disconnected",
            last_connection_at: isConnected ? new Date().toISOString() : null,
          })
          .eq("id", instanceId);
      }
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
    console.error("[TestConnection] Unhandled Error:", error);
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
