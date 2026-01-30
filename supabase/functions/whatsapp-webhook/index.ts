/**
 * WhatsApp Webhook Handler v11.0 (Pure Ingestion)
 * 
 * Strategy: Decoupled Architecture.
 * 1. Receive UAZAPI Event.
 * 2. Save to 'whatsapp_messages' table.
 * 3. Return 200 OK immediately.
 * 
 * The Logic/AI is handled by the Database Trigger -> 'process-new-messages'.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })

    try {
        const body = await req.json()
        console.log("--- INGEST ---", JSON.stringify(body))

        // 1. Extract Data correctly (handling UAZAPI variations)
        const instanceToken = body.token || body.instance;
        const msgData = body.message || body.data?.message;

        // Safety checks
        if (!msgData || !instanceToken) return new Response('Ignored/Invalid', { status: 200 });

        const remoteJid = msgData.chatid || msgData.key?.remoteJid || body.data?.from;
        const messageText = msgData.text || msgData.conversation || msgData.extendedTextMessage?.text;
        const isFromMe = msgData.fromMe || body.data?.key?.fromMe;

        if (isFromMe || !messageText) return new Response('Ignored (Self/Empty)', { status: 200 });

        console.log(`Saving msg from ${remoteJid}`);

        // 2. Identify Instance
        const { data: instance, error: instErr } = await supabase
            .from('whatsapp_instances')
            .select('id, user_id, webhook_secret')
            .eq('instance_token', instanceToken)
            .single()

        if (instErr || !instance) {
            console.error("Instance Not Found:", instanceToken);
            // We return 200 to stop UAZAPI retries
            return new Response('Instance Not Found', { status: 200 });
        }

        // 3. Security
        const headerSecret = req.headers.get("x-webhook-secret");
        if (instance.webhook_secret && headerSecret !== instance.webhook_secret) {
            return new Response('Forbidden', { status: 403 });
        }

        // 4. INSERT into DB (This triggers the AI)
        const { error: saveErr } = await supabase.from('whatsapp_messages').insert({
            user_id: instance.user_id,
            instance_id: instance.id,
            content: messageText,
            direction: 'incoming',
            remote_jid: remoteJid,
            status: 'pending' // Ready for Trigger
        });

        if (saveErr) console.error("Save Error:", saveErr);

        return new Response('Saved', { status: 200 });

    } catch (err) {
        console.error('Ingest Error:', err.message)
        return new Response(err.message, { status: 500 })
    }
})