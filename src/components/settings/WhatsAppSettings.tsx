/**
 * Componente de configuração WhatsApp
 * 
 * Interface para gerenciar instâncias UAZAPI
 */

import { useState } from "react";
import { useWhatsAppInstances, type WhatsAppInstance, type CreateInstanceData } from "@/hooks/useWhatsAppInstances";
import { useAgents } from "@/hooks/useAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Wifi, 
  WifiOff,
  Bot,
  Link2,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

// Card de instância individual
function InstanceCard({ 
  instance, 
  onUpdate, 
  onDelete, 
  onTestConnection, 
  webhookUrl,
  agents 
}: { 
  instance: WhatsAppInstance;
  onUpdate: (id: string, data: Partial<CreateInstanceData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTestConnection: (id: string) => Promise<void>;
  webhookUrl: string;
  agents: { id: string; name: string }[];
}) {
  const [copied, setCopied] = useState<"webhook" | "secret" | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const copyToClipboard = async (text: string, type: "webhook" | "secret") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success("Copiado!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    await onTestConnection(instance.id);
    setTesting(false);
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja remover esta instância?")) return;
    setDeleting(true);
    await onDelete(instance.id);
    setDeleting(false);
  };

  const getStatusBadge = () => {
    switch (instance.status) {
      case "connected":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Wifi className="w-3 h-3 mr-1" /> Conectado</Badge>;
      case "connecting":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Conectando</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><WifiOff className="w-3 h-3 mr-1" /> Desconectado</Badge>;
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-400" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">{instance.name}</h3>
            <p className="text-sm text-muted-foreground">{instance.phone_number || "Número não configurado"}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Configurações */}
      <div className="space-y-3">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">URL do Servidor</Label>
          <div className="flex items-center gap-2">
            <Input 
              value={instance.server_url || ""} 
              readOnly 
              className="bg-secondary/30 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(instance.server_url || "", "_blank")}
              disabled={!instance.server_url}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">Token da Instância</Label>
          <div className="flex items-center gap-2">
            <Input 
              type={showToken ? "text" : "password"}
              value={instance.instance_token || ""} 
              readOnly 
              className="bg-secondary/30 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Bot className="w-3 h-3" /> Agente Padrão
          </Label>
          <Select
            value={instance.default_agent_id || "none"}
            onValueChange={(value) => onUpdate(instance.id, { 
              default_agent_id: value === "none" ? undefined : value 
            })}
          >
            <SelectTrigger className="bg-secondary/30">
              <SelectValue placeholder="Selecione um agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum (não responder automaticamente)</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
        <Label className="text-xs text-primary flex items-center gap-2">
          <Link2 className="w-3 h-3" /> URL do Webhook (copie e cole na UAZAPI)
        </Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-background/50 p-2 rounded break-all">
            {webhookUrl}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => copyToClipboard(webhookUrl, "webhook")}
          >
            {copied === "webhook" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Label className="text-xs text-muted-foreground">Header x-webhook-secret:</Label>
          <code className="text-xs bg-background/50 px-2 py-1 rounded">
            {instance.webhook_secret}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => copyToClipboard(instance.webhook_secret, "secret")}
          >
            {copied === "secret" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={testing || !instance.server_url}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Testando..." : "Testar Conexão"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleting ? "Removendo..." : "Remover"}
        </Button>
      </div>
    </div>
  );
}

// Dialog para criar nova instância
function CreateInstanceDialog({ 
  onSubmit, 
  agents 
}: { 
  onSubmit: (data: CreateInstanceData) => Promise<boolean>;
  agents: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateInstanceData>({
    name: "",
    server_url: "",
    instance_token: "",
    phone_number: "",
    default_agent_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.server_url || !formData.instance_token) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    const success = await onSubmit(formData);
    setLoading(false);

    if (success) {
      setOpen(false);
      setFormData({
        name: "",
        server_url: "",
        instance_token: "",
        phone_number: "",
        default_agent_id: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Nova Instância
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Instância WhatsApp</DialogTitle>
          <DialogDescription>
            Configure uma nova conexão com a UAZAPI para receber e enviar mensagens.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Instância *</Label>
            <Input
              id="name"
              placeholder="WhatsApp Principal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="server_url">URL do Servidor UAZAPI *</Label>
            <Input
              id="server_url"
              placeholder="https://api.uazapi.com.br"
              value={formData.server_url}
              onChange={(e) => setFormData({ ...formData, server_url: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="instance_token">Token da Instância *</Label>
            <Input
              id="instance_token"
              type="password"
              placeholder="Seu token de autenticação"
              value={formData.instance_token}
              onChange={(e) => setFormData({ ...formData, instance_token: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone_number">Número do WhatsApp</Label>
            <Input
              id="phone_number"
              placeholder="+55 11 99999-0000"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="default_agent">Agente Padrão</Label>
            <Select
              value={formData.default_agent_id}
              onValueChange={(value) => setFormData({ ...formData, default_agent_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um agente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O agente selecionado responderá automaticamente às mensagens recebidas.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">
              {loading ? "Criando..." : "Criar Instância"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente principal
export function WhatsAppSettings() {
  const { instances, loading, createInstance, updateInstance, deleteInstance, testConnection, getWebhookUrl } = useWhatsAppInstances();
  const { agents } = useAgents();

  const handleCreate = async (data: CreateInstanceData): Promise<boolean> => {
    const result = await createInstance(data);
    return result !== null;
  };

  const handleUpdate = async (id: string, data: Partial<CreateInstanceData>) => {
    await updateInstance(id, data);
  };

  const handleDelete = async (id: string) => {
    await deleteInstance(id);
  };

  const handleTestConnection = async (id: string) => {
    await testConnection(id);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Instâncias WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Configure suas conexões com a UAZAPI para automação de mensagens.
          </p>
        </div>
        <CreateInstanceDialog 
          onSubmit={handleCreate} 
          agents={agents.map(a => ({ id: a.id, name: a.name }))} 
        />
      </div>

      {/* Lista de Instâncias */}
      {instances.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-400" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <h4 className="font-semibold mb-2">Nenhuma instância configurada</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione sua primeira instância WhatsApp para começar a receber mensagens.
          </p>
          <CreateInstanceDialog 
            onSubmit={handleCreate} 
            agents={agents.map(a => ({ id: a.id, name: a.name }))} 
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onTestConnection={handleTestConnection}
              webhookUrl={getWebhookUrl(instance.id)}
              agents={agents.map(a => ({ id: a.id, name: a.name }))}
            />
          ))}
        </div>
      )}

      {/* Instruções */}
      <div className="glass-card rounded-xl p-6">
        <h4 className="font-semibold mb-3">Como configurar</h4>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Crie uma instância com os dados da sua UAZAPI</li>
          <li>Copie a <strong>URL do Webhook</strong> e configure na sua UAZAPI</li>
          <li>Adicione o header <code className="bg-secondary/50 px-1 rounded">x-webhook-secret</code> com o valor fornecido</li>
          <li>Selecione um agente padrão para responder automaticamente</li>
          <li>Teste a conexão para verificar se está tudo funcionando</li>
        </ol>
      </div>
    </div>
  );
}
