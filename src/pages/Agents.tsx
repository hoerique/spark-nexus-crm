import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Bot, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgents, Agent, AgentFormData } from "@/hooks/useAgents";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentFormDialog } from "@/components/agents/AgentFormDialog";
import { AgentTestDialog } from "@/components/agents/AgentTestDialog";
import { DeleteAgentDialog } from "@/components/agents/DeleteAgentDialog";

export default function Agents() {
  const { agents, loading, createAgent, updateAgent, toggleAgentStatus, deleteAgent } = useAgents();
  const [searchTerm, setSearchTerm] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenForm = (agent?: Agent) => {
    setSelectedAgent(agent || null);
    setFormDialogOpen(true);
  };

  const handleOpenTest = (agent: Agent) => {
    setSelectedAgent(agent);
    setTestDialogOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (agent) {
      setSelectedAgent(agent);
      setDeleteDialogOpen(true);
    }
  };

  const handleSave = async (formData: AgentFormData) => {
    setSaving(true);
    try {
      if (selectedAgent) {
        await updateAgent(selectedAgent.id, formData);
      } else {
        await createAgent(formData);
      }
      setFormDialogOpen(false);
      setSelectedAgent(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedAgent) {
      await deleteAgent(selectedAgent.id);
      setDeleteDialogOpen(false);
      setSelectedAgent(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agentes de IA</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus assistentes virtuais inteligentes
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agentes..."
                className="pl-9 bg-secondary/30 border-border/50 focus:bg-background transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => handleOpenForm()}
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Agente
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Carregando seus agentes...</p>
            </div>
          </div>
        ) : filteredAgents.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-primary opacity-80" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? "Nenhum agente encontrado" : "Comece sua jornada com IA"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md">
              {searchTerm
                ? "Tente buscar com outros termos ou limpe o filtro."
                : "Crie agentes inteligentes para automatizar seu atendimento e qualificar leads 24/7."}
            </p>
            {!searchTerm && (
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground shadow-xl hover:scale-105 transition-all duration-300"
                onClick={() => handleOpenForm()}
              >
                <Sparkles className="w-4 h-4 mr-2" /> Criar Primeiro Agente
              </Button>
            )}
          </div>
        ) : (
          /* Agents Grid */
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={handleOpenForm}
                onTest={handleOpenTest}
                onToggleStatus={toggleAgentStatus}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <AgentFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          agent={selectedAgent}
          onSave={handleSave}
          loading={saving}
        />

        <AgentTestDialog
          open={testDialogOpen}
          onOpenChange={setTestDialogOpen}
          agent={selectedAgent}
        />

        <DeleteAgentDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          agentName={selectedAgent?.name || ""}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </AppLayout>
  );
}
