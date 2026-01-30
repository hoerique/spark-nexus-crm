/**
 * WhatsApp Webhook Handler v9.1 (Ingestion + Async Code Trigger)
 * 
 * Goal: Receive message, validate, save to DB, and TRIGGER Processor manually.
 * Uses EdgeRuntime.waitUntil for fire-and-forget logic.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })

  try {
    const body = await req.json()
    console.log("--- WEBHOOK INGEST ---", JSON.stringify(body))

    const msg = body.message || body.data?.message;
    if (!msg) return new Response('No Message', { status: 200 });

    if (msg.fromMe || msg.wasSentByApi) return new Response('Ignored (Self)', { status: 200 });

    const messageText = msg.text || msg.conversation || msg.extendedTextMessage?.text;
    if (!messageText) return new Response('Ignored (No Text)', { status: 200 });

    // Preferencia: chatid ou remoteJid
    const remoteJid = msg.chatid || msg.key?.remoteJid || (msg.sender_pn ? `${msg.sender_pn}` : null);
    const instanceToken = body.token || body.instance;

    if (!remoteJid || !instanceToken) {
      console.error("Missing JID/Token", { remoteJid, instanceToken });
      return new Response('Bad Request', { status: 400 });
    }

    // 1. Validate Instance
    const { data: instance, error: instErr } = await supabase
      .from('whatsapp_instances')
      .select('id, user_id, webhook_secret')
      .eq('instance_token', instanceToken)
      .single()

    if (instErr || !instance) {
      console.error("Instance Not Found:", instanceToken);
      return new Response('Instance Not Found', { status: 404 });
    }

    // 2. Secret Check
    const headerSecret = req.headers.get("x-webhook-secret");
    if (instance.webhook_secret && headerSecret !== instance.webhook_secret) {
      return new Response('Forbidden', { status: 403 });
    }

    console.log(`Persisting msg from ${remoteJid}`);

    // 3. Save to DB
    const { data: newRow, error: saveErr } = await supabase.from('whatsapp_messages').insert({
      user_id: instance.user_id,
      instance_id: instance.id,
      content: messageText,
      direction: 'incoming',
      remote_jid: remoteJid,
      status: 'pending'
    }).select().single();

    if (saveErr) {
      console.error("DB Save Error:", saveErr);
      return new Response('DB Error', { status: 500 });
    }

    // 4. ASYNC TRIGGER (Code-based)
    // We construct the URL for the PROCESSOR function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? "";
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)/)?.[1];
    const processorUrl = projectRef
      ? `https://${projectRef}.supabase.co/functions/v1/process-new-messages`
      : `${supabaseUrl}/functions/v1/process-new-messages`;

    console.log(`[Trigger] Calling Processor: ${processorUrl}`);

    // Call Processor (Fire and Forget)
    const invokeProcessor = fetch(processorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ record: newRow })
    })
      .then(res => res.text().then(t => console.log("[Trigger] Process result:", t)))
      .catch(e => console.error("[Trigger] Failed:", e));

    // EDGE RUNTIME WAITUNTIL (Critical for Async)
    // @ts-ignore
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      EdgeRuntime.waitUntil(invokeProcessor);
    } else {
      // Fallback for local dev (might block slightly or fail to wait)
      console.log("Not on EdgeRuntime, strictly waiting...");
      // In local, we might want to just let it run or await it if we don't care about blocking
      // But for production, wait until is key.
    }

    return new Response('Ingested & Triggered', { status: 200 });

  } catch (err) {
    console.error('Webhook Error:', err.message)
    return new Response(err.message, { status: 500 })
  }
})
