-- 1. Adicionar coluna contact_name na tabela de mensagens (para salvar o nome do contato junto com a mensagem)
alter table whatsapp_messages add column if not exists contact_name text;

-- 2. Atualizar o webhook para salvar o nome nessa nova coluna
-- (Isso eu farei no código TypeScript do Webhook)
