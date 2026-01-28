import { AppLayout } from "@/components/layout/AppLayout";
import { Building2, MessageSquare, Bot, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { AIProvidersSettings } from "@/components/settings/AIProvidersSettings";

export default function Settings() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do seu CRM</p>
        </div>

        <Tabs defaultValue="whatsapp" className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="w-4 h-4" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="w-4 h-4" /> IA
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="w-4 h-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" /> Notificações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp">
            <WhatsAppSettings />
          </TabsContent>

          <TabsContent value="ai">
            <AIProvidersSettings />
          </TabsContent>

          <TabsContent value="company" className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold mb-4">Informações da Empresa</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Nome da Empresa</Label>
                  <Input defaultValue="Minha Empresa LTDA" className="bg-secondary/50" />
                </div>
                <div className="grid gap-2">
                  <Label>Email de Contato</Label>
                  <Input defaultValue="contato@empresa.com" className="bg-secondary/50" />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input defaultValue="+55 11 99999-0000" className="bg-secondary/50" />
                </div>
              </div>
              <Button className="mt-4 gradient-primary text-primary-foreground">Salvar Alterações</Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold mb-4">Preferências de Notificação</h3>
              <div className="space-y-4">
                {[
                  { label: "Novos leads", desc: "Receba notificações quando um novo lead entrar" },
                  { label: "Novas mensagens", desc: "Notifique sobre novas mensagens no WhatsApp" },
                  { label: "Agentes offline", desc: "Alerta quando um agente parar de funcionar" },
                  { label: "Relatórios semanais", desc: "Resumo semanal por email" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
