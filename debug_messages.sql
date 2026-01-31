-- Inspect the structure and recent data of whatsapp_messages
SELECT 
    id, 
    remote_jid, 
    content, 
    direction, 
    status, 
    created_at, 
    media_url, 
    contact_name 
FROM whatsapp_messages 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for any RLS policies (system catalog query)
SELECT * FROM pg_policies WHERE tablename = 'whatsapp_messages';
