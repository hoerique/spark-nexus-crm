-- TESTE DE VIDA OU MORTE: Desabilitar RLS temporariamente
-- Se depois de rodar isso aparecer na tela, garantimos que é problema de Permissão.
alter table conversations disable row level security;
alter table whatsapp_messages disable row level security;

-- Depois de testar, LEMBRE DE REATIVAR (rodar o fix_permissions.sql novamente)
