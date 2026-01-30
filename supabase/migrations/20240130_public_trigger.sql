-- ==================================================
-- SOLUÇÃO: Gatilho SEM Autenticação (Requer Função Pública)
-- ==================================================

-- 1. Garante extensão
create extension if not exists pg_net;

-- 2. Função SIMPLIFICADA (Sem Header de Auth)
create or replace function public.call_webhook_processor()
returns trigger as $$
begin
    -- Chama a função SEM verificar senha (pois você vai deixar ela pública no painel)
    perform net.http_post(
        url := 'https://qxralytyrytjqizuouhz.supabase.co/functions/v1/process-new-messages',
        headers := '{"Content-Type": "application/json"}',
        body := json_build_object('record', row_to_json(new))::jsonb
    );
    return new;
end;
$$ language plpgsql security definer;

-- 3. Recria o Gatilho
drop trigger if exists trigger_process_ai on public.whatsapp_messages;

create trigger trigger_process_ai
after insert on public.whatsapp_messages
for each row
when (new.direction = 'incoming' and new.status = 'pending')
execute function public.call_webhook_processor();
