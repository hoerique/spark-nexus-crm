-- ==========================================
-- GATILHO PARA ACIONAR O AGENTE DE IA
-- Rode este código no SQL Editor do Supabase
-- ==========================================

-- 1. Habilitar a extensão que permite fazer chamadas HTTP
create extension if not exists pg_net;

-- 2. Define a função que o gatilho vai chamar
create or replace function public.call_webhook_processor()
returns trigger as $$
begin
    -- Faz a chamada para a sua Edge Function 'process-new-messages'
    -- Substitua <SUA_SERVICE_ROLE_KEY> se necessário, mas o header padrão costuma funcionar internamente
    perform net.http_post(
        url := 'https://qxralytyrytjqizuouhz.supabase.co/functions/v1/process-new-messages',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.sub', true) || '"}',
        body := json_build_object('record', row_to_json(new))::jsonb
    );
    return new;
end;
$$ language plpgsql security definer;

-- 3. Cria o Gatilho na tabela 'whatsapp_messages'
-- Sempre que entrar uma mensagem 'incoming' e status 'pending', dispara o agente.
drop trigger if exists trigger_process_ai on public.whatsapp_messages;

create trigger trigger_process_ai
after insert on public.whatsapp_messages
for each row
when (new.direction = 'incoming' and new.status = 'pending')
execute function public.call_webhook_processor();

-- Confirmação
SELECT 'Gatilho criado com sucesso! O Agente agora está ativo.' as status;
