# Guia Completo de Integração e Arquitetura WhatsApp

Este documento explica como o sistema funciona, onde cada arquivo vive e o passo-a-passo para tudo funcionar.

## 1. Visão Geral da Arquitetura

O sistema é dividido em três partes principais. É fundamental entender onde cada uma vive:

### A. Frontend (Seu CRM - Código React)
*   **Onde vive?**: Na pasta `src/` do seu projeto (`useChat.ts`, `Conversations.tsx`).
*   **Função**: Mostrar a tela para o usuário e buscar dados do Banco de Dados. **Não** fala diretamente com o WhatsApp.
*   **Arquivo Principal**: `src/hooks/useChat.ts`.
    *   **O que ele é?**: É o "cérebro" da tela de chat.
    *   **O que ele faz?**:
        1.  Vai no Supabase e pergunta: "Quais conversas eu tenho?" (Tabela `conversations`).
        2.  Vai no Supabase e pergunta: "Quais mensagens essa conversa tem?" (Tabela `whatsapp_messages`).
        3.  Fica "ouvindo" (Realtime) se chegar mensagem nova para atualizar a tela na hora.

### B. Banco de Dados (Supabase)
*   **Onde vive?**: Na nuvem (Supabase). Você vê as tabelas pelo painel do Supabase.
*   **Função**: Guardar o histórico.
*   **Tabelas Principais**:
    *   `conversations`: Lista de contatos que já falaram com você.
    *   `whatsapp_messages`: Todas as mensagens trocadas.

### C. Backend (Edge Functions & Webhook)
*   **Onde vive?**: Na pasta `supabase/functions/`.
*   **Função**: Fazer o "trabalho sujo" de conexão com o mundo externo (UAZAPI).
*   **Arquivos**:
    *   `whatsapp-webhook/index.ts`: **Recebe** mensagens do WhatsApp (via UAZAPI) e salva no Banco.
    *   `send-whatsapp-message` (A ser criada): **Envia** mensagens para a UAZAPI quando o frontend pede.

---

## 2. Fluxo de Dados (Passo a Passo)

### Fluxo 1: Quando seu cliente manda mensagem (Recebimento)
1.  **Cliente** manda "Oi" no WhatsApp.
2.  **UAZAPI** recebe e avisa seu sistema (Webhook).
3.  **`whatsapp-webhook/index.ts`** recebe o aviso.
    *   Salva a mensagem na tabela `whatsapp_messages`.
    *   **ATUALIZAÇÃO IMPORTANTE**: Agora ele atualiza automaticamente a tabela `conversations` para que o contato apareça na sua tela.
4.  **Supabase** avisa o Frontend (Realtime).
5.  **`useChat.ts`** (no navegador) vê o aviso e mostra a mensagem na tela automaticamente.

### Fluxo 2: Quando você responde (Envio)
1.  **Você** digita "Olá" na tela e clica em Enviar.
2.  **`useChat.ts`** chama a função `send-whatsapp-message`.
3.  **`send-whatsapp-message`**:
    *   Pega o texto.
    *   Manda para a API da UAZAPI.
    *   Salva na tabela `whatsapp_messages` como "enviada".
4.  **UAZAPI** manda a mensagem para o celular do cliente.

---

## 3. Guia de Integração (O que você precisa fazer agora)

### Passo 1: Ajustar o Webhook (`whatsapp-webhook/index.ts`)
**[FEITO]** Já atualizei o código do seu webhook para salvar a conversa na tabela `conversations`.
Certifique-se apenas de fazer o **deploy** da função atualizada:
`supabase functions deploy whatsapp-webhook`

### Passo 2: Criar a Função de Envio (`send-whatsapp-message`)
Você precisa criar essa função para que o botão "Enviar" funcione.

1.  Crie a pasta: `supabase/functions/send-whatsapp-message/`
2.  Crie o arquivo `index.ts` dentro dela com o código para chamar a UAZAPI (Exemplo abaixo).
3.  Faça o deploy: `supabase functions deploy send-whatsapp-message`.

### Passo 3: Testar
1.  Mande uma mensagem do seu celular para o bot.
2.  Veja se apareceu no Banco de Dados (`whatsapp_messages`).
3.  Veja se apareceu na tabela `conversations`.
4.  Veja se apareceu na tela do seu CRM.

---

## Exemplo: Código da Função de Envio (`send-whatsapp-message`)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // 1. Recebe dados do Frontend (useChat.ts)
  const { phone, message, instance_id } = await req.json();
  
  // 2. Setup Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 3. Busca Token da Instância
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('id', instance_id) // ou pegue a primeira ativa se não passar ID
    .single();

  if (!instance) return new Response("Instância não encontrada", { status: 404 });

  // 4. Manda para UAZAPI
  const uazapiUrl = `${instance.server_url}/send/text`;
  const res = await fetch(uazapiUrl, {
      method: 'POST',
      headers: {
        'apikey': instance.instance_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
  });

  // 5. Salva no Histórico como "Enviada"
  if (res.ok) {
      await supabase.from('whatsapp_messages').insert({
          remote_jid: `${phone}@s.whatsapp.net`,
          content: message,
          direction: 'outgoing',
          status: 'sent',
          instance_id: instance.id,
          message_type: 'text'
      });
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } else {
      return new Response(JSON.stringify({ error: "Falha na UAZAPI" }), { status: 500 });
  }
});
```
