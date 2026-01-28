import { Bot, MessageSquare, Settings, MoreHorizontal, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Agent } from "@/hooks/useAgents";

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onTest: (agent: Agent) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  chat: "Chat",
  api: "API",
};

const typeLabels: Record<string, string> = {
  sales: "Vendas",
  support: "Suporte",
  qualifier: "Qualificador",
  custom: "Personalizado",
};

export function AgentCard({
  agent,
  onEdit,
  onTest,
  onToggleStatus,
  onDelete,
}: AgentCardProps) {
  return (
    <div className="agent-card animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold">{agent.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {agent.description || "Sem descrição"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              <Settings className="w-4 h-4 mr-2" /> Configurar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTest(agent)}>
              <MessageSquare className="w-4 h-4 mr-2" /> Testar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(agent.id)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary">
          {channelLabels[agent.channel || "whatsapp"] || agent.channel}
        </Badge>
        <Badge variant="outline">
          {typeLabels[agent.agent_type || "custom"] || agent.agent_type}
        </Badge>
        <Badge className={agent.is_active ? "status-online" : "status-offline"}>
          {agent.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-lg bg-secondary/30">
        <div>
          <p className="text-2xl font-bold">{agent.conversations_count || 0}</p>
          <p className="text-xs text-muted-foreground">Conversas</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{agent.responses_count || 0}</p>
          <p className="text-xs text-muted-foreground">Respostas</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Switch
            checked={agent.is_active}
            onCheckedChange={(checked) => onToggleStatus(agent.id, checked)}
          />
          <span className="text-sm text-muted-foreground">
            {agent.is_active ? "Ativo" : "Pausado"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(agent)}>
            <Settings className="w-4 h-4 mr-1" /> Configurar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onTest(agent)}>
            <MessageSquare className="w-4 h-4 mr-1" /> Testar
          </Button>
        </div>
      </div>
    </div>
  );
}
