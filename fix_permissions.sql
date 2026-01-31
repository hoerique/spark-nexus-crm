-- 1. Habilitar RLS nas tabelas (Segurança)
alter table "public"."conversations" enable row level security;
alter table "public"."whatsapp_messages" enable row level security;

-- 2. Permitir que usuários autenticados leiam seus próprios dados na tabela 'conversations'
create policy "Allow users to select own conversations"
on "public"."conversations"
for select
to authenticated
using (auth.uid() = user_id);

-- 3. Permitir que usuários autenticados leiam suas próprias mensagens na tabela 'whatsapp_messages'
create policy "Allow users to select own messages"
on "public"."whatsapp_messages"
for select
to authenticated
using (auth.uid() = user_id);

-- Opicional: Permitir insert/update também se o frontend for escrever direto (mas o webhook já faz isso)
-- Por enquanto, LEITURA é o que falta para exibir na tela.
