import { MoreHorizontal, Phone, Mail, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tables } from "@/integrations/supabase/types";

interface LeadCardProps {
  lead: Tables<"leads">;
  onEdit: (lead: Tables<"leads">) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

export function LeadCard({ lead, onEdit, onDelete, isDragging }: LeadCardProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("leadId", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`kanban-card animate-fade-in cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? "opacity-50 scale-105 shadow-xl" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium">{lead.name}</h4>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(lead)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(lead.id)}
              className="text-destructive"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="space-y-1 text-sm text-muted-foreground">
        {lead.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3" />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>
      
      {lead.company && (
        <div className="mt-2 text-sm text-muted-foreground">
          {lead.company}
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
        <span className="text-sm font-semibold text-primary">
          {formatCurrency(lead.value)}
        </span>
        {lead.source && (
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            {lead.source}
          </span>
        )}
      </div>
    </div>
  );
}
