/**
 * WhatsApp Webhook Handler v12.0 (All-In-One Synchronous)
 * 
 * Strategy: EMERGENCY SYNC MODE.
 * The Decoupled/Async approach was failing due to Trigger issues.
 * This script handles EVERYTHING in one go:
 * 1. Receive Hook
 * 2. DB Lookup
 * 3. AI Generation
 * 4. Reply to UAZAPI
 * 5. Save History
 * 
 * Goal: Ensure the Agent REPLIES immediately.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Config
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })

    try {
        const body = await req.json()
        console.log(">>> MSG RECEBIDA:", JSON.stringify(body));

        // 1. DADOS
        // UAZAPI v2: instanceName, token, message: { ... }
        const instanceToken = body.token || body.instance;
        const msg = body.message || body.data?.message;

        if (!msg || !instanceToken) {
            console.log("Ignorado: Payload inválido.");
            return new Response('Invalid Payload', { status: 200 });
        }

        // Campos da mensagem
        const remoteJid = msg.chatid || msg.key?.remoteJid || (msg.sender_pn ? `${msg.sender_pn}` : null);
        const messageText = msg.text || msg.conversation || msg.extendedTextMessage?.text || body.data?.message?.conversation;
        const isFromMe = msg.fromMe || body.data?.key?.fromMe;

        if (isFromMe || msg.wasSentByApi) {
            return new Response('Ignored (Self)', { status: 200 });
        }

        if (!messageText) {
            return new Response('Ignored (No Text)', { status: 200 });
        }

        console.log(`[Processando] De: ${remoteJid} | Texto: "${messageText}"`);

        // 2. BUSCAR INSTÂNCIA (Pelo TOKEN)
        const { data: instance, error: instErr } = await supabase
            .from('whatsapp_instances')
            .select('*, ai_agents(*)')
            .eq('instance_token', instanceToken)
            .single();

        if (instErr || !instance) {
            console.error(`Instância não encontrada (Token: ${instanceToken})`);
            return new Response('Instance Not Found', { status: 404 });
        }

        const agent = instance.ai_agents;
        if (!agent || !agent.is_active) {
            console.log("Agente inativo/inexistente.");
            return new Response('Agent Inactive', { status: 200 });
        }

        // 3. RECUPERAR CLIENTE IA (Chave da tabela configs)
        const { data: configs } = await supabase
            .from('ai_provider_configs')
            .select('*')
            .eq('user_id', instance.user_id)
            .eq('is_active', true);

        // Detecção Simples do Provedor
        let provider = 'openai';
        let model = agent.model || 'gpt-4o-mini';

        if (model.includes('gemini')) provider = 'gemini';
        else if (model.includes('claude')) provider = 'anthropic';
        else if (model.includes('gpt')) provider = 'chatgpt';

        const config = configs?.find(c => c.provider === provider) || configs?.[0];

        if (!config?.api_key) {
            console.error(`Sem API Key para ${provider}`);
            throw new Error(`API Key ausente para ${provider}`);
        }

        // 4. MEMÓRIA (Últimas 6 msgs)
        const { data: history } = await supabase
            .from('whatsapp_messages')
            .select('content, direction')
            .eq('remote_jid', remoteJid)
            .order('created_at', { ascending: false })
            .limit(6);

        const chatHistory = history?.reverse().map(m => ({
            role: m.direction === 'incoming' ? 'user' : 'assistant',
            content: m.content
        })) || [];

        // 5. CHAMADA IA (Sync)
        let replyText = "";
        console.log(`Chamando IA (${provider})...`);

        if (provider === 'gemini') {
            const cleanModel = model.replace("google/", "");
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${config.api_key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: (agent.system_prompt || "") + "\n\nContexto:\n" + JSON.stringify(chatHistory) + "\n\nMsg Atual: " + messageText }] }] })
            });
            const data = await res.json();
            replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else {
            // OpenAI Default
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${config.api_key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: agent.system_prompt || "Bot" },
                        ...chatHistory,
                        { role: 'user', content: messageText }
                    ]
                })
            });
            const data = await res.json();
            replyText = data.choices?.[0]?.message?.content;
        }

        if (!replyText) throw new Error("A IA não gerou resposta.");

        console.log(`Resposta Gerada: "${replyText}"`);

        // 6. ENVIAR WHATSAPP (UAZAPI)
        const uazapiUrl = `${instance.server_url.replace(/\/$/, "")}/message/sendText`;
        const sendRes = await fetch(uazapiUrl, {
            method: 'POST',
            headers: {
                'apikey': instance.instance_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                number: remoteJid.replace("@s.whatsapp.net", ""),
                text: replyText
            })
        });

        if (!sendRes.ok) console.error("Falha ao enviar UAZAPI:", await sendRes.text());
        else console.log("Enviado para WhatsApp com sucesso.");

        // 7. SALVAR TUDO (Somente após sucesso)
        await supabase.from('whatsapp_messages').insert([
            {
                user_id: instance.user_id,
                instance_id: instance.id,
                remote_jid: remoteJid,
                content: messageText,
                direction: 'incoming',
                status: 'processed'
            },
            {
                user_id: instance.user_id,
                instance_id: instance.id,
                remote_jid: remoteJid,
                content: replyText,
                direction: 'outgoing',
                status: sendRes.ok ? 'sent' : 'failed'
            }
        ]);

        // Incrementar
        await supabase.rpc('increment_agent_responses', { agent_id: agent.id }).catch(() => { });

        return new Response('Processed Sync', { status: 200 });

    } catch (err) {
        console.error("Critical Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
})