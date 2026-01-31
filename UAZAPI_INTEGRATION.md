# Documentação de Integração UAZAPI GO

Esta documentação fornece um diagnóstico do estado atual e um guia passo-a-passo para integrar a interface frontend com a API UAZAPI GO.

## 1. Diagnóstico do Sistema

### Situação Atual
- **Frontend**: interface desenvolvida com React + Vite + Tailwind CSS imitando o WhatsApp Web.
- **Backend**: Funções Supabase (`whatsapp-webhook`, `agent-chat`).
- **Estado**: A interface utiliza um hook simulado (`useChat.ts`) com dados mockados (fake).

### Requisitos Identificados
1.  O sistema precisa receber mensagens em tempo real (Webhook).
2.  O sistema precisa enviar mensagens via API da UAZAPI.
3.  O histórico de mensagens deve ser persistivo (Supabase Database).

---

## 2. Passo a Passo para Integração

### Passo 1: Configuração do Webhook (Backend)
Já existe uma função `whatsapp-webhook`. Certifique-se de que ela está salvando as mensagens no banco de dados Supabase.

1.  **Tabela de Mensagens**: Verifique se existe uma tabela `messages` no Supabase com as colunas:
    -   `id` (uuid/int)
    -   `chat_id` ou `contact_phone`
    -   `content` (text)
    -   `sender_type` (user/agent/contact)
    -   `media_url` (text, nullable)
    -   `created_at` (timestamp)

2.  **Ajuste na Função Webhook**:
    -   Ao receber `POST` da UAZAPI, extraia o número e mensagem.
    -   Insira na tabela `messages`.

### Passo 2: Conectar Frontend ao Supabase (Realtime)

Edite o arquivo `src/hooks/useChat.ts` para substituir os dados mockados por observadores do Supabase.

```typescript
// Exemplo de como alterar o useChat.ts
import { supabase } from "@/integrations/supabase/client";

// ... dentro do hook useChat

useEffect(() => {
  // 1. Carregar contatos (conversas existentes)
  const fetchContacts = async () => {
    const { data } = await supabase.from('contacts').select('*');
    setContacts(data);
  }
  fetchContacts();

  // 2. Ouvir novas mensagens em tempo real
  const channel = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
       const newMessage = payload.new;
       // Atualizar estado de mensagens
       setMessages(prev => [...prev, adaptMessage(newMessage)]);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel) }
}, []);
```

### Passo 3: Envio de Mensagens

Para enviar mensagens, você deve chamar a sua Edge Function que se comunica com a UAZAPI, para não expor suas credenciais no frontend.

```typescript
// No useChat.ts, função sendMessage
const sendMessage = async (content: string) => {
  // 1. Atualizar UI otimista
  // ...

  // 2. Chamar Edge Function
  const { error } = await supabase.functions.invoke('send-whatsapp', {
    body: { phone: activeContact.phone, message: content }
  });

  if (error) {
    console.error("Erro ao enviar", error);
    // Reverter UI ou mostrar erro
  }
};
```

### Passo 4: Edge Function para Envio (`send-whatsapp`)

Crie uma nova função no Supabase para processar o envio:

```typescript
// supabase/functions/send-whatsapp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { phone, message } = await req.json();
  
  // Chamada para UAZAPI
  const response = await fetch('https://api.uazapi.com/v1/send-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'uazapi-token': 'SEU_TOKEN'
    },
    body: JSON.stringify({
      number: phone,
      message: message
    })
  });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
});
```

---

## 3. Próximos Passos Imediatos
1.  Criar as tabelas no Supabase (se não existirem).
2.  Implementar a conexão Realtime no `useChat.ts`.
3.  Testar o fluxo completo (Envio Front -> Edge Function -> UAZAPI -> Celular -> UAZAPI -> Webhook -> Supabase -> Front Realtime).
