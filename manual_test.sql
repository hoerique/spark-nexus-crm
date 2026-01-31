-- INSTRUÇÃO: Rode isso no SQL Editor do Supabase
-- Vamos criar uma conversa FALSA para ver se aparece na tela.
-- Se aparecer, o problema é 100% no Webhook.
-- Se NÃO aparecer, o problema é no frontend/RLS.

INSERT INTO conversations (
    user_id,
    contact_phone,
    contact_name,
    channel,
    status,
    last_message_at
) VALUES (
    'c70cf1de-a510-4158-9e49-caaa5e7e8c00', -- SEU ID
    '5511999999999',
    'Teste Manual',
    'whatsapp',
    'active',
    NOW()
);

-- Inserir uma mensagem falsa também
INSERT INTO whatsapp_messages (
    user_id,
    instance_id,
    remote_jid,
    content,
    direction,
    status,
    message_type
) VALUES (
    'c70cf1de-a510-4158-9e49-caaa5e7e8c00', -- SEU ID
    (SELECT id FROM whatsapp_instances LIMIT 1), -- Pega a primeira instância válida
    '5511999999999@s.whatsapp.net',
    'Mensagem de teste manual SQL',
    'incoming',
    'read',
    'text'
);
