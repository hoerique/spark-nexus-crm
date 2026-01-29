import { Bot, MessageSquare, Settings, MoreHorizontal, Trash2, Zap } from "lucide-react";
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
  chat: "Web Chat",
  api: "API Rest",
};

const typeLabels: Record<string, string> = {
  sales: "Vendedor",
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
    <div className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group animate-in fade-in zoom-in-95">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${agent.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{agent.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {agent.description || "Sem descrição definida"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              <Settings className="w-4 h-4 mr-2" /> Configurar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTest(agent)}>
              <MessageSquare className="w-4 h-4 mr-2" /> Testar Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(agent.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Badge variant="secondary" className="bg-secondary/50 font-medium">
          {channelLabels[agent.channel || "whatsapp"] || agent.channel}
        </Badge>
        <Badge variant="outline" className="border-primary/20 text-primary/80">
          {typeLabels[agent.agent_type || "custom"] || agent.agent_type}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-secondary/20 rounded-lg p-3 text-center border border-transparent hover:border-border transition-colors">
          <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {agent.conversations_count || 0}
          </p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Conversas</p>
        </div>
        <div className="bg-secondary/20 rounded-lg p-3 text-center border border-transparent hover:border-border transition-colors">
          <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {agent.responses_count || 0}
          </p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Respostas</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-3">
          <Switch
            checked={agent.is_active}
            onCheckedChange={(checked) => onToggleStatus(agent.id, checked)}
            className="data-[state=checked]:bg-success"
          />
          <span className={`text-sm font-medium ${agent.is_active ? 'text-success' : 'text-muted-foreground'}`}>
            {agent.is_active ? "Online" : "Pausado"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(agent)} className="hover:bg-primary/5">
            <Settings className="w-4 h-4 mr-2" />
            <span className="sr-only sm:not-sr-only">Editar</span>
          </Button>
          <Button size="sm" onClick={() => onTest(agent)} className="gap-2 shadow-sm">
            <Zap className="w-3 h-3 fill-current" />
            Testar
          </Button>
        </div>
      </div>
    </div>
  );
}
