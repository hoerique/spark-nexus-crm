import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LeadCard } from "./LeadCard";
import { Tables } from "@/integrations/supabase/types";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  leads: Tables<"leads">[];
  onEdit: (lead: Tables<"leads">) => void;
  onDelete: (id: string) => void;
  onDrop: (leadId: string, newStatus: string) => void;
  hideHeader?: boolean;
}

export function KanbanColumn({
  id,
  title,
  color,
  leads,
  onEdit,
  onDelete,
  onDrop,
  hideHeader = false,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      onDrop(leadId, id);
    }
  };

  return (
    <div className="w-72 flex-shrink-0">
      {!hideHeader && (
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${color}`} />
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary" className="ml-auto">
            {leads.length}
          </Badge>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`kanban-column space-y-3 min-h-[200px] transition-all duration-200 ${isDragOver
            ? "bg-primary/10 border-2 border-dashed border-primary rounded-lg"
            : ""
          }`}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {leads.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">
            {isDragOver ? "Solte aqui" : "Nenhum lead"}
          </div>
        )}
      </div>
    </div>
  );
}
