/**
 * Process New Messages Function (Async AI Worker)
 * 
 * Triggered by Database Webhook (pg_net) on INSERT to whatsapp_messages.
 * Logic:
 * 1. Read the new message ID from payload.
 * 2. Fetch Context (Last 10 msgs).
 * 3. Identify Agent & Config.
 * 4. Call AI (OpenAI/Gemini).
 * 5. Send Reply via UAZAPI.
 * 6. Save Reply to DB.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
    try {
        const payload = await req.json();

        // Payload from Database Webhook (pg_net) usually follows { type: 'INSERT', record: { ... }, old_record: null, schema: 'public', table: 'whatsapp_messages' }
        // OR if calling directly via HTTP, custom payload.
        // Let's assume standard Supabase Webhook payload structure or direct invoke.

        const record = payload.record || payload; // Fallback

        if (!record || !record.id || record.direction !== 'incoming') {
            return new Response('Ignored (Not incoming or invalid)', { status: 200 });
        }

        // Check if already processed (idempotency)
        if (record.status === 'processed' || record.status === 'ignored_no_agent') {
            return new Response('Already Processed', { status: 200 });
        }

        const messageId = record.id;
        const remoteJid = record.remote_jid;
        const instanceId = record.instance_id;
        const userId = record.user_id;
        const content = record.content;

        console.log(`[Processor] Handling Msg ${messageId} from ${remoteJid}`);

        // 1. Fetch Instance & Agent
        const { data: instance, error: instErr } = await supabase
            .from('whatsapp_instances')
            .select('*, ai_agents(*)')
            .eq('id', instanceId)
            .single();

        if (instErr || !instance) throw new Error('Instance not found');

        const agent = instance.ai_agents;
        if (!agent || !agent.is_active) {
            console.log("Agent inactive.");
            await supabase.from('whatsapp_messages').update({ status: 'ignored_no_agent' }).eq('id', messageId);
            return new Response('Agent Inactive', { status: 200 });
        }

        // 2. Fetch AI Config
        const { data: configs } = await supabase
            .from('ai_provider_configs')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

        let provider = 'openai';
        if (agent.model) {
            if (agent.model.includes('gemini')) provider = 'gemini';
            else if (agent.model.includes('claude')) provider = 'anthropic';
            else if (agent.model.includes('gpt')) provider = 'chatgpt';
        }

        const config = configs?.find(c => c.provider === provider) || configs?.[0];
        if (!config?.api_key) throw new Error(`Missing API Key for ${provider}`);

        // 3. Context (Memory)
        const { data: history } = await supabase
            .from('whatsapp_messages')
            .select('content, direction')
            .eq('remote_jid', remoteJid)
            .neq('content', '')
            .lt('created_at', record.created_at) // Exclude current if possible, or just Limit
            .order('created_at', { ascending: false })
            .limit(6);

        const chatHistory = history?.reverse().map(m => ({
            role: m.direction === 'incoming' ? 'user' : 'assistant',
            content: m.content
        })) || [];

        // 4. Generate AI Reply
        let replyText = "";

        console.log(`[AI] Calling ${provider} with model ${agent.model || 'default'}...`);

        if (provider === 'gemini') {
            const cleanModel = (agent.model || 'gemini-1.5-flash').replace("google/", "");
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${config.api_key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: (agent.system_prompt || "") + "\n\nContexto:\n" + JSON.stringify(chatHistory) + "\n\nUsuário: " + content }] }]
                })
            });
            const data = await res.json();
            replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else if (provider === 'anthropic') {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": config.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    model: agent.model,
                    max_tokens: 1024,
                    system: agent.system_prompt,
                    messages: [...chatHistory, { role: 'user', content: content }]
                })
            });
            const data = await res.json();
            replyText = data.content?.[0]?.text;
        } else {
            // OpenAI
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${config.api_key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: agent.model || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: agent.system_prompt || 'Você é um assistente.' },
                        ...chatHistory,
                        { role: 'user', content: content }
                    ]
                })
            });
            const data = await res.json();
            replyText = data.choices?.[0]?.message?.content;
        }

        if (!replyText) throw new Error('AI returned empty response');

        console.log(`[AI] Reply generated: ${replyText.substring(0, 50)}...`);

        // 5. Send to UAZAPI
        const sendRes = await fetch(`${instance.server_url}/message/sendText`, {
            method: 'POST',
            headers: { 'apikey': instance.instance_token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: remoteJid.replace("@s.whatsapp.net", ""),
                text: replyText
            })
        });

        if (!sendRes.ok) console.error("UAZAPI Send Failed:", await sendRes.text());

        // 6. Save Outgoing
        await supabase.from('whatsapp_messages').insert({
            user_id: userId,
            instance_id: instanceId,
            content: replyText,
            direction: 'outgoing',
            remote_jid: remoteJid,
            status: sendRes.ok ? 'sent' : 'failed',
            metadata: { agent_id: agent.id, provider, model: agent.model }
        });

        // 7. Mark Incoming as Processed
        await supabase.from('whatsapp_messages').update({ status: 'processed' }).eq('id', messageId);

        // Stats
        await supabase.rpc('increment_agent_responses', { agent_id: agent.id }).catch(() => { });

        return new Response('Processed Successfully', { status: 200 });

    } catch (err) {
        console.error("Processor Error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
