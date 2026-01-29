import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanColumn } from "@/components/leads/KanbanColumn";
import { LeadFormDialog, LeadFormData } from "@/components/leads/LeadFormDialog";
import { useLeads } from "@/hooks/useLeads";
import { Tables } from "@/integrations/supabase/types";

export default function Leads() {
  const { leads, loading, createLead, updateLead, deleteLead, updateLeadStatus } = useLeads();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Tables<"leads"> | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado para colunas personalizáveis
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("kanban_columns");
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: "new", title: "Novos", color: "bg-info" },
      { id: "contacted", title: "Contactados", color: "bg-warning" },
      { id: "qualified", title: "Qualificados", color: "bg-accent" },
      { id: "proposal", title: "Proposta", color: "bg-primary" },
      { id: "closed", title: "Fechados", color: "bg-success" },
    ];
  });

  // Persistir mudanças
  useEffect(() => {
    localStorage.setItem("kanban_columns", JSON.stringify(columns));
  }, [columns]);

  const handleTitleChange = (columnId: string, newTitle: string) => {
    setColumns(columns.map(col =>
      col.id === columnId ? { ...col, title: newTitle } : col
    ));
  };

  const filteredLeads = leads.filter((lead) =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (lead?: Tables<"leads">) => {
    setEditingLead(lead || null);
    setDialogOpen(true);
  };

  const handleSave = async (formData: LeadFormData) => {
    setSaving(true);
    try {
      if (editingLead) {
        await updateLead(editingLead.id, formData);
      } else {
        await createLead(formData);
      }
      setDialogOpen(false);
      setEditingLead(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = async (leadId: string, newStatus: string) => {
    await updateLeadStatus(leadId, newStatus);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground">Gerencie seu funil de vendas</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads..."
                className="pl-9 w-64 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Lead
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          /* Kanban Board */
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              {columns.map((column) => (
                <div key={column.id} className="flex flex-col gap-2">
                  {/* Column Header Editable */}
                  <div className="flex items-center gap-2 px-1">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <Input
                      value={column.title}
                      onChange={(e) => handleTitleChange(column.id, e.target.value)}
                      className="h-8 bg-transparent border-transparent hover:border-input focus:border-input font-semibold w-40 px-1"
                    />
                    <span className="text-xs text-muted-foreground ml-auto bg-secondary/50 px-2 py-0.5 rounded-full">
                      {filteredLeads.filter((l) => l.status === column.id).length}
                    </span>
                  </div>

                  <KanbanColumn
                    id={column.id}
                    title={column.title}
                    color={column.color}
                    leads={filteredLeads.filter((l) => l.status === column.id)}
                    onEdit={handleOpenDialog}
                    onDelete={deleteLead}
                    onDrop={handleDrop}
                    hideHeader={true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lead Form Dialog */}
        <LeadFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          lead={editingLead}
          onSave={handleSave}
          loading={saving}
        />
      </div>
    </AppLayout>
  );
}
