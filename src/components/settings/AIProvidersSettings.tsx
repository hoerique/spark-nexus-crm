/**
 * Componente de configuração de Provedores de IA
 * 
 * Gerencia API keys e configurações de diferentes provedores
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Sparkles, Zap, Brain, Cpu } from "lucide-react";
import { toast } from "sonner";

interface ProviderConfig {
  id?: string;
  provider: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
}

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    icon: Cpu,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    description: "GPT-4o, GPT-4 Turbo e mais",
    models: [
      { value: "gpt-4o", label: "GPT-4o (Mais inteligente)" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Mais rápido)" },
    ],
    requiresKey: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: Brain,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    description: "Claude 3.5 Sonnet, 3 Opus e Haiku",
    models: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ],
    requiresKey: true,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    description: "Gemini 1.5 Pro e Flash",
    models: [
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
    requiresKey: true,
  },
  {
    id: "lovable",
    name: "Lovable AI (Legado)",
    icon: Sparkles,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    description: "Gateway integrado (Descontinuado)",
    models: [
      { value: "default", label: "Padrão" }
    ],
    requiresKey: true,
  },
];

function ProviderCard({
  provider,
  config,
  onSave,
  onToggle,
}: {
  provider: typeof PROVIDERS[0];
  config?: ProviderConfig;
  onSave: (data: ProviderConfig) => Promise<void>;
  onToggle: (providerId: string, isActive: boolean) => Promise<void>;
}) {
  const [formData, setFormData] = useState<ProviderConfig>({
    provider: provider.id,
    api_key: config?.api_key || "",
    model: config?.model || provider.models[0].value,
    temperature: config?.temperature || 0.7,
    max_tokens: config?.max_tokens || 2048,
    is_active: config?.is_active || false,
  });
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        provider: provider.id,
        api_key: config.api_key || "",
        model: config.model || provider.models[0].value,
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 2048,
        is_active: config.is_active || false,
      });
    }
  }, [config, provider]);

  const handleSave = async () => {
    if (provider.requiresKey && !formData.api_key) {
      toast.error("API Key é obrigatória");
      return;
    }

    setSaving(true);
    await onSave({ ...formData, id: config?.id });
    setSaving(false);
  };

  const Icon = provider.icon;

  return (
    <div className={`glass-card rounded-xl p-6 ${formData.is_active ? "ring-2 ring-primary/50" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${provider.bgColor} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${provider.color}`} />
          </div>
          <div>
            <h4 className="font-semibold">{provider.name}</h4>
            <p className="text-xs text-muted-foreground">{provider.description}</p>
          </div>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => {
            setFormData({ ...formData, is_active: checked });
            onToggle(provider.id, checked);
          }}
        />
      </div>

      <div className="space-y-4">
        {provider.requiresKey && (
          <div className="grid gap-2">
            <Label className="text-xs">API Key</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="bg-secondary/30"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label className="text-xs">Modelo</Label>
          <Select
            value={formData.model}
            onValueChange={(value) => setFormData({ ...formData, model: value })}
          >
            <SelectTrigger className="bg-secondary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {provider.models.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Temperatura</Label>
            <span className="text-xs text-muted-foreground">{formData.temperature}</span>
          </div>
          <Slider
            value={[formData.temperature]}
            onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Baixo = respostas consistentes | Alto = respostas criativas
          </p>
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Max Tokens</Label>
          <Select
            value={formData.max_tokens.toString()}
            onValueChange={(value) => setFormData({ ...formData, max_tokens: parseInt(value) })}
          >
            <SelectTrigger className="bg-secondary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1024">1024 (curto)</SelectItem>
              <SelectItem value="2048">2048 (padrão)</SelectItem>
              <SelectItem value="4096">4096 (longo)</SelectItem>
              <SelectItem value="8192">8192 (muito longo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          variant={formData.is_active ? "default" : "outline"}
        >
          {saving ? "Salvando..." : config?.id ? "Atualizar" : "Salvar"}
          {!saving && <Check className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}

export function AIProvidersSettings() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from("ai_provider_configs")
          .select("*");

        if (error) throw error;
        setConfigs(data || []);
      } catch (error) {
        console.error("Erro ao buscar configs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [user]);

  const handleSave = async (data: ProviderConfig) => {
    if (!user) return;

    try {
      if (data.id) {
        // Atualizar
        const { error } = await supabase
          .from("ai_provider_configs")
          .update({
            api_key: data.api_key,
            model: data.model,
            temperature: data.temperature,
            max_tokens: data.max_tokens,
            is_active: data.is_active,
          })
          .eq("id", data.id);

        if (error) throw error;

        setConfigs((prev) =>
          prev.map((c) => (c.id === data.id ? { ...c, ...data } : c))
        );
        toast.success("Configuração atualizada!");
      } else {
        // Criar
        const { data: newConfig, error } = await supabase
          .from("ai_provider_configs")
          .insert({
            user_id: user.id,
            provider: data.provider,
            api_key: data.api_key,
            model: data.model,
            temperature: data.temperature,
            max_tokens: data.max_tokens,
            is_active: data.is_active,
          })
          .select()
          .single();

        if (error) throw error;

        setConfigs((prev) => [...prev, newConfig]);
        toast.success("Configuração salva!");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleToggle = async (providerId: string, isActive: boolean) => {
    const config = configs.find((c) => c.provider === providerId);

    if (config) {
      try {
        const { error } = await supabase
          .from("ai_provider_configs")
          .update({ is_active: isActive })
          .eq("id", config.id);

        if (error) throw error;

        setConfigs((prev) =>
          prev.map((c) => (c.provider === providerId ? { ...c, is_active: isActive } : c))
        );
      } catch (error) {
        console.error("Erro ao alternar:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Provedores de IA</h3>
        <p className="text-sm text-muted-foreground">
          Configure as APIs de IA que seus agentes podem utilizar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            config={configs.find((c) => c.provider === provider.id)}
            onSave={handleSave}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
