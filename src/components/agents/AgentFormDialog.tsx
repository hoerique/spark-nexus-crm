import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Agent, AgentFormData } from "@/hooks/useAgents";
import { AI_PROVIDERS } from "@/lib/ai-models";

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
  onSave: (data: AgentFormData) => void;
  loading?: boolean;
}

const channels = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "chat", label: "Chat Interno" },
  { value: "api", label: "API / Webhook" },
];

const objectives = [
  { value: "sales", label: "Vendas" },
  { value: "support", label: "Suporte Técnico" },
  { value: "qualifier", label: "Qualificação de Leads" },
  { value: "general", label: "Atendimento Geral" },
];

export function AgentFormDialog({
  open,
  onOpenChange,
  agent,
  onSave,
  loading,
}: AgentFormDialogProps) {
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    channel: "whatsapp",
    system_prompt: "Você é um assistente útil e profissional.",
    system_rules: "",
    objective: "support",
    model: "google/gemini-3-flash-preview",
    temperature: 0.7,
    memory_enabled: true,
    webhook_in: "",
    webhook_out: "",
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || "",
        description: agent.description || "",
        channel: agent.channel || "whatsapp",
        system_prompt: agent.system_prompt || "",
        system_rules: agent.system_rules || "",
        objective: agent.objective || "support",
        model: agent.model || "google/gemini-3-flash-preview",
        temperature: agent.temperature || 0.7,
        memory_enabled: agent.memory_enabled ?? true,
        webhook_in: agent.webhook_in || "",
        webhook_out: agent.webhook_out || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        channel: "whatsapp",
        system_prompt: "Você é um assistente útil e profissional.",
        system_rules: "",
        objective: "support",
        model: "google/gemini-3-flash-preview",
        temperature: 0.7,
        memory_enabled: true,
        webhook_in: "",
        webhook_out: "",
      });
    }
  }, [agent, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agent ? "Editar Agente" : "Criar Novo Agente"}
          </DialogTitle>
          <DialogDescription>
            {agent
              ? "Edite as informações e configurações do seu agente de IA abaixo."
              : "Preencha os dados abaixo para criar um novo agente de IA e conectá-lo aos seus canais."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="identity" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="identity">Identidade</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="model">Modelo</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
            </TabsList>

            {/* Identidade */}
            <TabsContent value="identity" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Agente *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Assistente de Vendas"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descreva o que este agente faz..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="channel">Canal</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, channel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((ch) => (
                        <SelectItem key={ch.value} value={ch.value}>
                          {ch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="objective">Objetivo Principal</Label>
                <Select
                  value={formData.objective}
                  onValueChange={(value) =>
                    setFormData({ ...formData, objective: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {objectives.map((obj) => (
                      <SelectItem key={obj.value} value={obj.value}>
                        {obj.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Prompts */}
            <TabsContent value="prompts" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="system_prompt">
                  Prompt Base do Agente *
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Define a personalidade, comportamento e objetivo do agente.
                </p>
                <Textarea
                  id="system_prompt"
                  value={formData.system_prompt}
                  onChange={(e) =>
                    setFormData({ ...formData, system_prompt: e.target.value })
                  }
                  placeholder="Você é um assistente de vendas profissional da empresa X. Seu objetivo é..."
                  rows={6}
                  required
                />
              </div>

              <div>
                <Label htmlFor="system_rules">
                  Regras Absolutas (System Rules)
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Regras que NUNCA podem ser quebradas, independente da
                  mensagem do usuário.
                </p>
                <Textarea
                  id="system_rules"
                  value={formData.system_rules}
                  onChange={(e) =>
                    setFormData({ ...formData, system_rules: e.target.value })
                  }
                  placeholder="- Nunca forneça informações falsas&#10;- Nunca fale mal de concorrentes&#10;- Sempre redirecione para um humano em caso de reclamação grave"
                  rows={5}
                  className="border-destructive/50"
                />
              </div>
            </TabsContent>

            {/* Modelo */}
            <TabsContent value="model" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="model">Modelo de IA</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) =>
                    setFormData({ ...formData, model: value })
                  }
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDERS.filter(p => p.id !== 'lovable').map((provider) => (
                      <SelectGroup key={provider.id}>
                        <SelectLabel>{provider.name}</SelectLabel>
                        {provider.models.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">Criatividade (Temperatura)</Label>
                  <span className="text-sm text-muted-foreground">{formData.temperature}</span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[formData.temperature]}
                  onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
                  className="py-4"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Memória Habilitada</Label>
                  <p className="text-sm text-muted-foreground">
                    O agente lembra do contexto da conversa
                  </p>
                </div>
                <Switch
                  checked={formData.memory_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, memory_enabled: checked })
                  }
                />
              </div>
            </TabsContent>

            {/* Integrações */}
            <TabsContent value="integrations" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="webhook_in">Webhook de Entrada</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  URL para receber mensagens externas
                </p>
                <Input
                  id="webhook_in"
                  value={formData.webhook_in}
                  onChange={(e) =>
                    setFormData({ ...formData, webhook_in: e.target.value })
                  }
                  placeholder="https://seu-webhook.com/incoming"
                />
              </div>

              <div>
                <Label htmlFor="webhook_out">Webhook de Saída</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  URL para enviar respostas do agente
                </p>
                <Input
                  id="webhook_out"
                  value={formData.webhook_out}
                  onChange={(e) =>
                    setFormData({ ...formData, webhook_out: e.target.value })
                  }
                  placeholder="https://seu-webhook.com/outgoing"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 A integração com WhatsApp será configurada nas
                  configurações gerais do sistema.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gradient-primary"
            >
              {loading ? "Salvando..." : agent ? "Salvar" : "Criar Agente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
