-- Enable the pg_net extension to allow making HTTP requests
create extension if not exists pg_net;

-- Create the trigger function that calls the Edge Function
create or replace function public.handle_new_message()
returns trigger as $$
begin
  -- Only trigger for incoming messages that are pending
  if new.direction = 'incoming' and new.status = 'pending' then
    perform net.http_post(
      url := 'https://qxralytyrytjqizuouhz.supabase.co/functions/v1/process-new-messages',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.sub', true) || '"}',
      body := json_build_object('record', row_to_json(new))::jsonb
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create the Trigger on the table
drop trigger if exists on_new_whatsapp_message on public.whatsapp_messages;

create trigger on_new_whatsapp_message
after insert on public.whatsapp_messages
for each row
execute function public.handle_new_message();
