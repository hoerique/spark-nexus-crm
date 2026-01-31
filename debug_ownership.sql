-- CHECK 1: Ver quantas conversas existem no total (independente de dono)
select count(*) from conversations;

-- CHECK 2: Ver quem é o dono das conversas atuais
select user_id, contact_name, contact_phone from conversations;

-- SOLUÇÃO RADICAL DE TESTE:
-- Transfere TODAS as conversas existentes para o seu usuário atual
-- para garantir que você consiga vê-las agora.
update conversations
set user_id = 'c70cf1de-a510-4158-9e49-caaa5e7e8c00'
where true;

update whatsapp_messages
set user_id = 'c70cf1de-a510-4158-9e49-caaa5e7e8c00'
where true;
