import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export function useLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Tables<"leads">[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar leads:", error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (leadData: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    status?: string;
    value?: number;
    source?: string;
    notes?: string;
  }) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: leadData.name,
          email: leadData.email || null,
          phone: leadData.phone || null,
          company: leadData.company || null,
          status: leadData.status || "new",
          value: leadData.value || null,
          source: leadData.source || null,
          notes: leadData.notes || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setLeads((prev) => [data, ...prev]);
      toast.success("Lead criado com sucesso!");
      return data;
    } catch (error: any) {
      console.error("Erro ao criar lead:", error);
      toast.error("Erro ao criar lead");
      return null;
    }
  };

  const updateLead = async (id: string, leadData: Partial<Tables<"leads">>) => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .update(leadData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? data : lead))
      );
      toast.success("Lead atualizado!");
      return data;
    } catch (error: any) {
      console.error("Erro ao atualizar lead:", error);
      toast.error("Erro ao atualizar lead");
      return null;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
      toast.success("Lead excluído!");
    } catch (error: any) {
      console.error("Erro ao excluir lead:", error);
      toast.error("Erro ao excluir lead");
    }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    return updateLead(id, { status });
  };

  useEffect(() => {
    fetchLeads();
  }, [user]);

  return {
    leads,
    loading,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStatus,
    refetch: fetchLeads,
  };
}
