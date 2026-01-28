import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface Agent {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  agent_type: string;
  channel: string | null;
  is_active: boolean;
  system_prompt: string;
  system_rules: string | null;
  objective: string;
  model: string;
  temperature: number;
  memory_enabled: boolean;
  webhook_in: string | null;
  webhook_out: string | null;
  conversations_count: number;
  responses_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface AgentFormData {
  name: string;
  title: string;
  description: string;
  agent_type: string;
  channel: string;
  system_prompt: string;
  system_rules: string;
  objective: string;
  model: string;
  temperature: number;
  memory_enabled: boolean;
  webhook_in: string;
  webhook_out: string;
}

export function useAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgents((data as Agent[]) || []);
    } catch (error: any) {
      console.error("Erro ao buscar agentes:", error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (agentData: AgentFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("ai_agents")
        .insert({
          name: agentData.name,
          description: agentData.description || null,
          channel: agentData.channel || "whatsapp",
          system_prompt: agentData.system_prompt,
          system_rules: agentData.system_rules || null,
          objective: agentData.objective || "support",
          model: agentData.model || "google/gemini-3-flash-preview",
          temperature: agentData.temperature || 0.7,
          memory_enabled: agentData.memory_enabled ?? true,
          webhook_in: agentData.webhook_in || null,
          webhook_out: agentData.webhook_out || null,
          user_id: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setAgents((prev) => [data as Agent, ...prev]);
      toast.success("Agente criado com sucesso!");
      return data as Agent;
    } catch (error: any) {
      console.error("Erro ao criar agente:", error);
      toast.error("Erro ao criar agente");
      return null;
    }
  };

  const updateAgent = async (id: string, agentData: Partial<AgentFormData>) => {
    try {
      const { data, error } = await supabase
        .from("ai_agents")
        .update({
          ...agentData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setAgents((prev) =>
        prev.map((agent) => (agent.id === id ? (data as Agent) : agent))
      );
      toast.success("Agente atualizado!");
      return data as Agent;
    } catch (error: any) {
      console.error("Erro ao atualizar agente:", error);
      toast.error("Erro ao atualizar agente");
      return null;
    }
  };

  const toggleAgentStatus = async (id: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from("ai_agents")
        .update({ is_active: isActive })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setAgents((prev) =>
        prev.map((agent) => (agent.id === id ? (data as Agent) : agent))
      );
      toast.success(isActive ? "Agente ativado!" : "Agente pausado!");
      return data as Agent;
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do agente");
      return null;
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const { error } = await supabase.from("ai_agents").delete().eq("id", id);

      if (error) throw error;

      setAgents((prev) => prev.filter((agent) => agent.id !== id));
      toast.success("Agente excluído!");
    } catch (error: any) {
      console.error("Erro ao excluir agente:", error);
      toast.error("Erro ao excluir agente");
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [user]);

  return {
    agents,
    loading,
    createAgent,
    updateAgent,
    toggleAgentStatus,
    deleteAgent,
    refetch: fetchAgents,
  };
}
