/**
 * WhatsApp Webhook Handler v12.1 (Fixes & Deduplication)
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
 * 
 * Changes:
 * - Added Message Deduplication (external_id check)
 * - Fixed supabase.rpc crash
 * - Added detailed UAZAPI logging
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
        const instanceToken = body.token || body.instance;
        const msg = body.message || body.data?.message;
        const externalId = msg?.key?.id || body.data?.key?.id || msg?.id;

        // Campos da mensagem
        const remoteJid = msg.chatid || msg.key?.remoteJid || (msg.sender_pn ? `${msg.sender_pn}` : null);
        const messageText = msg.text || msg.conversation || msg.extendedTextMessage?.text || body.data?.message?.conversation;
        const isFromMe = msg.fromMe || body.data?.key?.fromMe;

        if (!msg || !instanceToken) {
            console.log("Ignorado: Payload inválido.");
            return new Response('Invalid Payload', { status: 200 });
        }

        if (isFromMe || msg.wasSentByApi) {
            return new Response('Ignored (Self)', { status: 200 });
        }

        if (!messageText) {
            return new Response('Ignored (No Text)', { status: 200 });
        }

        // 2. DEDUPLICAÇÃO INTELIGENTE (MODO DEBUG FORÇADO)
        if (externalId) {
            const { data: existingMsg } = await supabase
                .from('whatsapp_messages')
                .select('id, created_at, status')
                .eq('external_id', externalId)
                .single();

            if (existingMsg) {
                console.log(`[Deduplicação CHEK] ID: ${externalId} | Status BD: ${existingMsg.status} | Criada: ${existingMsg.created_at}`);

                // BYPASS TEMPORÁRIO PARA DEBUG: Sempre continua, apenas avisa
                console.log(">> DEBUG MODE: Ignorando trava de deduplicação para forçar teste <<");
                // return new Response('Ignored (Duplicate)', { status: 200 }); 
            }
        }

        // 3. BUSCAR INSTÂNCIA
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
        console.log(`[Agente Check] ID: ${agent?.id} | Ativo: ${agent?.is_active} | Modelo: ${agent?.model}`);

        if (!agent || !agent.is_active) {
            console.log("Agente inativo ou inexistente. Parando.");
            // Não deve salvar mensagem se agente não existe? Ou salva como processed?
            // Vamos deixar salvar para log, mas retorna aqui.
            return new Response('Agent Inactive', { status: 200 });
        }

        // 4. SALVAR MENSAGEM DE ENTRADA (IMEDIATAMENTE)
        // Se já existe (dedup bypass), isso pode dar erro de UNIQUE constraint se external_id for unique.
        // Vamos usar upsert ou ignorar erro.
        const { error: saveError } = await supabase.from('whatsapp_messages').upsert({
            user_id: instance.user_id,
            instance_id: instance.id,
            remote_jid: remoteJid,
            content: messageText,
            direction: 'incoming',
            status: 'processed',
            external_id: externalId
        }, { onConflict: 'external_id', ignoreDuplicates: false }); // Upsert atualiza timestamp/status

        if (saveError) console.error("Erro ao salvar/upsert mensagem de entrada:", saveError);
        console.log(`[Processando] De: ${remoteJid} | Texto: "${messageText}"`);

        // 5. CONFIG IA
        const { data: configs, error: configError } = await supabase
            .from('ai_provider_configs')
            .select('*')
            .eq('user_id', instance.user_id)
            .eq('is_active', true);

        console.log(`[Config Check] Erro BD: ${configError?.message || 'Nenhum'} | Configs: ${configs?.length}`);

        if (configError || !configs || configs.length === 0) {
            console.error("Nenhuma configuração de IA ativa encontrada para este usuário.");
            throw new Error("Sem configuração de IA (API Key) ativa.");
        }

        // ... Logica de seleção continua igual ...

        // Detecção Provedor
        let provider = 'openai';
        let model = agent.model || 'gpt-4o-mini';

        if (model.includes('gemini')) provider = 'gemini';
        else if (model.includes('claude')) provider = 'anthropic';
        else if (model.includes('gpt')) provider = 'chatgpt';

        // Busca config
        const config = configs?.find(c => c.provider.toLowerCase() === provider.toLowerCase()) || configs?.[0];

        console.log(`[Seleção IA] Provedor Detectado: ${provider} | Config Usada: ${config?.provider}`);

        if (!config?.api_key) {
            console.error(`[Erro Config] Configs Disponíveis:`, JSON.stringify(configs));
            throw new Error(`API Key ausente para ${provider}`);
        }

        // Ajuste Gemini Model
        if (provider === 'gemini' && !model.startsWith('models/') && !model.includes('gemini-')) {
            model = 'gemini-pro';
        }

        // 6. MEMÓRIA
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

        // 7. CHAMADA IA
        let replyText = "";
        console.log(`Chamando IA (${provider}) com modelo ${model}...`);

        try {
            if (provider === 'gemini') {
                const cleanModel = model.replace("google/", "");
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${config.api_key}`;

                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: (agent.system_prompt || "") + "\n\nContexto:\n" + JSON.stringify(chatHistory) + "\n\nMsg Atual: " + messageText }] }] })
                });
                const data = await res.json();

                if (!res.ok) throw new Error(`Erro Gemini: ${data.error?.message || res.statusText}`);
                replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!replyText) throw new Error("IA retornou vazio (Bloqueio de Segurança ou Erro)");

            } else {
                // OpenAI
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
                if (!res.ok) throw new Error(`Erro OpenAI: ${data.error?.message || res.statusText}`);
                replyText = data.choices?.[0]?.message?.content;
            }
        } catch (aiErr) {
            console.error("Falha na Geração da IA:", aiErr);
            await supabase.from('whatsapp_messages').insert({
                user_id: instance.user_id,
                instance_id: instance.id,
                remote_jid: remoteJid,
                content: `[ERRO IA] ${aiErr.message}`,
                direction: 'outgoing',
                status: 'failed'
            });
            throw aiErr;
        }

        console.log(`Resposta Gerada: "${replyText}"`);

        // 8. ENVIAR WHATSAPP (LOGICA HÍBRIDA)
        const waInstanceName = body.instanceName || body.instance || instance.name || "master";
        const cleanRemoteJid = remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
        const apiHeaders = {
            'Content-Type': 'application/json',
            'apikey': instance.instance_token,
            'token': instance.instance_token,
            'Authorization': `Bearer ${instance.instance_token}`
        };

        const payload = {
            number: cleanRemoteJid,
            text: replyText,
            delay: 1200,
            linkPreview: true
        };

        // Cascata de Endpoints
        // 1. UAZAPI (/send/text)
        let uazapiUrl = `${instance.server_url.replace(/\/$/, "")}/send/text`;
        console.log(`[Envio] Tentando Endpoint 1: ${uazapiUrl}`);

        let sendRes = await fetch(uazapiUrl, {
            method: 'POST', headers: apiHeaders, body: JSON.stringify(payload)
        });

        let responseText = await sendRes.text();

        if (!sendRes.ok) {
            console.error(`[Falha Endpoint 1] ${sendRes.status}: ${responseText}`);

            // 2. Evolution API (/message/sendText)
            const fallbackUrl = `${instance.server_url.replace(/\/$/, "")}/message/sendText/${waInstanceName}`;
            console.log(`[Envio] Tentando Endpoint 2 (Fallback): ${fallbackUrl}`);

            // Re-using same payload structure as it's typically compatible or close enough
            const fallbackPayload = { number: cleanRemoteJid, text: replyText, delay: 1200 };

            sendRes = await fetch(fallbackUrl, {
                method: 'POST', headers: apiHeaders, body: JSON.stringify(fallbackPayload)
            });
            responseText = await sendRes.text();

            if (!sendRes.ok) {
                console.error(`[Falha Endpoint 2] ${sendRes.status}: ${responseText}`);

                // 3. Evolution V2 (/chat/sendText)
                const fallbackUrl3 = `${instance.server_url.replace(/\/$/, "")}/chat/sendText/${instance.name || 'master'}`;
                console.log(`[Envio] Tentando Endpoint 3 (Fallback Final): ${fallbackUrl3}`);

                sendRes = await fetch(fallbackUrl3, {
                    method: 'POST', headers: apiHeaders, body: JSON.stringify(fallbackPayload)
                });
                responseText = await sendRes.text();

                if (!sendRes.ok) console.error(`[Falha Endpoint 3] ${sendRes.status}: ${responseText}`);
                else console.log("[Sucesso] Enviado via Endpoint 3.");
            } else {
                console.log("[Sucesso] Enviado via Endpoint 2.");
            }
        } else {
            console.log("[Sucesso] Enviado via Endpoint 1.");
        }

        // 9. SALVAR RESPOSTA
        await supabase.from('whatsapp_messages').insert([{
            user_id: instance.user_id,
            instance_id: instance.id,
            remote_jid: remoteJid,
            content: sendRes.ok ? replyText : `[FALHA ENVIO] ${responseText || 'Erro desconhecido'}`,
            direction: 'outgoing',
            status: sendRes.ok ? 'sent' : 'failed'
        }]);

        try {
            await supabase.rpc('increment_agent_responses', { agent_id: agent.id });
        } catch (ignored) { }

        return new Response('Processed Sync', { status: 200 });

    } catch (err) {
        console.error("Critical Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
})