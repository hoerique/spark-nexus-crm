-- Expandir tabela ai_agents com campos necessários
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS system_rules TEXT,
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'google/gemini-3-flash-preview',
ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS webhook_in TEXT,
ADD COLUMN IF NOT EXISTS webhook_out TEXT,
ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS conversations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS responses_count INTEGER DEFAULT 0;

-- Criar tabela de execuções dos agentes
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_message TEXT NOT NULL,
  output_message TEXT,
  execution_time_ms INTEGER,
  graph_state JSONB DEFAULT '{}',
  channel TEXT DEFAULT 'chat',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para agent_runs
CREATE POLICY "Users can view their own agent runs" 
ON public.agent_runs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent runs" 
ON public.agent_runs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent runs" 
ON public.agent_runs 
FOR DELETE 
USING (auth.uid() = user_id);