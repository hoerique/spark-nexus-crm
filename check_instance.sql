-- Verificar quem é o dono da instância do WhatsApp que está recebendo mensagens
select id, name, user_id, instance_token from whatsapp_instances;

-- Verificar qual é o SEU user_id atual (para comparar)
-- (Você já viu no console: c70cf1de-a510-4158-9e49-caaa5e7e8c00)
