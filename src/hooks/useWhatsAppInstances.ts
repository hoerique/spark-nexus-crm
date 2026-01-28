/**
 * Hook para gerenciar instâncias WhatsApp
 * 
 * Responsável por CRUD de instâncias e operações de conexão
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  name: string;
  server_url: string | null;
  instance_token: string | null;
  phone_number: string | null;
  webhook_secret: string;
  default_agent_id: string | null;
  status: "connected" | "disconnected" | "connecting";
  last_connection_at: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  ai_agents?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateInstanceData {
  name: string;
  server_url: string;
  instance_token: string;
  phone_number?: string;
  default_agent_id?: string;
}

export interface UpdateInstanceData {
  name?: string;
  server_url?: string;
  instance_token?: string;
  phone_number?: string;
  default_agent_id?: string | null;
}

export function useWhatsAppInstances() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar todas as instâncias do usuário
  const fetchInstances = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select(`
          *,
          ai_agents (id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInstances((data as unknown as WhatsAppInstance[]) || []);
    } catch (error) {
      console.error("Erro ao buscar instâncias:", error);
      toast.error("Erro ao carregar instâncias WhatsApp");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Criar nova instância
  const createInstance = async (data: CreateInstanceData): Promise<WhatsAppInstance | null> => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return null;
    }

    try {
      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .insert({
          user_id: user.id,
          name: data.name,
          server_url: data.server_url,
          instance_token: data.instance_token,
          phone_number: data.phone_number || null,
          default_agent_id: data.default_agent_id || null,
          status: "disconnected",
        })
        .select()
        .single();

      if (error) throw error;

      setInstances((prev) => [instance as unknown as WhatsAppInstance, ...prev]);
      toast.success("Instância criada com sucesso!");
      return instance as unknown as WhatsAppInstance;
    } catch (error) {
      console.error("Erro ao criar instância:", error);
      toast.error("Erro ao criar instância");
      return null;
    }
  };

  // Atualizar instância
  const updateInstance = async (id: string, data: UpdateInstanceData): Promise<WhatsAppInstance | null> => {
    try {
      const { data: instance, error } = await supabase
        .from("whatsapp_instances")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(`
          *,
          ai_agents (id, name)
        `)
        .single();

      if (error) throw error;

      setInstances((prev) =>
        prev.map((inst) => (inst.id === id ? (instance as unknown as WhatsAppInstance) : inst))
      );
      toast.success("Instância atualizada!");
      return instance as unknown as WhatsAppInstance;
    } catch (error) {
      console.error("Erro ao atualizar instância:", error);
      toast.error("Erro ao atualizar instância");
      return null;
    }
  };

  // Deletar instância
  const deleteInstance = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setInstances((prev) => prev.filter((inst) => inst.id !== id));
      toast.success("Instância removida!");
      return true;
    } catch (error) {
      console.error("Erro ao deletar instância:", error);
      toast.error("Erro ao remover instância");
      return false;
    }
  };

  // Testar conexão
  const testConnection = async (id: string): Promise<boolean> => {
    try {
      // Atualizar status para "connecting"
      await supabase
        .from("whatsapp_instances")
        .update({ status: "connecting" })
        .eq("id", id);

      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === id ? { ...inst, status: "connecting" as const } : inst
        )
      );

      const { data, error } = await supabase.functions.invoke("whatsapp-test-connection", {
        body: { instanceId: id },
      });

      if (error) throw error;

      const newStatus = data.connected ? "connected" : "disconnected";
      
      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === id
            ? {
                ...inst,
                status: newStatus as "connected" | "disconnected",
                last_connection_at: data.connected ? new Date().toISOString() : inst.last_connection_at,
              }
            : inst
        )
      );

      if (data.connected) {
        toast.success("Conexão estabelecida!");
      } else {
        toast.error("Não foi possível conectar");
      }

      return data.connected;
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      
      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === id ? { ...inst, status: "disconnected" as const } : inst
        )
      );
      
      toast.error("Erro ao testar conexão");
      return false;
    }
  };

  // Gerar URL do webhook
  const getWebhookUrl = (instanceId: string): string => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/whatsapp-webhook?instance=${instanceId}`;
  };

  // Carregar instâncias ao montar
  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  return {
    instances,
    loading,
    createInstance,
    updateInstance,
    deleteInstance,
    testConnection,
    getWebhookUrl,
    refetch: fetchInstances,
  };
}
