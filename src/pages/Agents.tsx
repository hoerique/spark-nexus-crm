import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Bot, Loader2, Search } from "lucide-react";
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
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Agentes de IA</h1>
            <p className="text-muted-foreground">
              Gerencie seus assistentes virtuais para WhatsApp e Chat
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agentes..."
                className="pl-9 w-64 bg-secondary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => handleOpenForm()}
            >
              <Plus className="w-4 h-4 mr-2" /> Criar Agente
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredAgents.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Nenhum agente encontrado" : "Nenhum agente criado"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm
                ? "Tente buscar com outros termos"
                : "Crie seu primeiro agente de IA para automatizar atendimentos"}
            </p>
            {!searchTerm && (
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={() => handleOpenForm()}
              >
                <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Agente
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
