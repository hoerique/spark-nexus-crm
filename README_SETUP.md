# Guia de Configuração e Instalação (Spark Nexus CRM)

Este guia cobre o processo de configuração do banco de dados (Supabase), variáveis de ambiente e deploy das funções para funcionamento do Webhook e Agente de IA.

## 1. Banco de Dados (Supabase)

O projeto utiliza Supabase para persistência de dados. Você deve executar a migração SQL para criar as tabelas necessárias.

### Passo a Passo:
1.  Acesse o Dashboard do seu projeto no Supabase.
2.  Vá em **SQL Editor**.
3.  Crie uma nova query.
4.  Copie o conteúdo do arquivo `supabase/migrations/20240128_init_schema.sql` (disponível no projeto).
5.  Execute a query (Run).

Isso criará as tabelas:
*   `ai_agents`: Configurações dos agentes de IA.
*   `whatsapp_instances`: Conexões com a API do WhatsApp (UAZAPI).
*   `whatsapp_messages`: Histórico de mensagens.
*   `webhook_logs`: Logs de depuração.

## 2. Variáveis de Ambiente (Environment Variables)

Para que as funções (Edge Functions) funcionem, você precisa configurar os segredos no Supabase.

Vá em **Project Settings > Edge Functions** e adicione:

| Variável | Descrição |
| :--- | :--- |
| `LOVABLE_API_KEY` | Chave da API do Lovable (Gateway de IA) ou sua chave OpenAI/Gemini caso altere o código. |
| `SUPABASE_URL` | URL do seu projeto Supabase (geralmente já injetado automaticamente). |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (SUDO) para acesso ao banco (geralmente já injetado). |

> **Nota:** Se você estiver rodando localmente, preencha o arquivo `.env` na raiz.

## 3. Deploy das Functions

Certifique-se de ter o Supabase CLI instalado.

```bash
# Login no Supabase
npx supabase login

# Deploy das funções
npx supabase functions deploy whatsapp-webhook
npx supabase functions deploy agent-chat
```

## 4. Configuração do Webhook no CRM (UAZAPI)

Após o deploy, você obterá uma URL para o webhook, algo como:
`https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`

No painel do seu CRM (ou app de Frontend deste projeto):
1.  Crie uma **Nova Instância**.
2.  Preencha a URL do Webhook adicionando o ID da instância gerada:
    *   `https://.../whatsapp-webhook?instance=SEU_UUID_AQUI`
3.  Defina o **Webhook Secret** (header: `x-webhook-secret`). O valor deve bater com o que está salvo no banco de dados na tabela `whatsapp_instances`.

## 5. Testando

*   Envie uma mensagem para o WhatsApp conectado.
*   Verifique a tabela `webhook_logs` no Supabase para ver se o evento chegou.
*   Se houver erro, os logs detalhados estarão lá ou no Dashboard de Functions do Supabase.

## Apêndice: LangGraph vs. Agente Simples

A implementação atual utiliza um **Agente Simples** (chamada stateless a um gateway de IA). O código foi estruturado para suportar **LangGraph** no futuro:
*   Onde hoje há a chamada `fetch("https://ai.gateway.lovable.dev/...")`, você pode substituir pela execução de um grafo local.
*   Para tal, instale `@langchain/langgraph` no Deno (usando `esm.sh`) e inicialize seu grafo passando o histórico de mensagens recuperado do Supabase.
