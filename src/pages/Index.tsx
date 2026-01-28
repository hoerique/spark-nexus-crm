import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Bot, BarChart3, Zap, Shield, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm fixed top-0 w-full z-50 bg-background/80">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">CRM AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button className="gradient-primary text-primary-foreground">
                Começar Grátis
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-muted-foreground">Plataforma ativa com +1000 usuários</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="text-foreground">CRM Inteligente com </span>
            <span className="text-gradient">Agentes de IA</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Gerencie leads, automatize atendimentos via WhatsApp e potencialize suas vendas com agentes de IA personalizados.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-primary-foreground px-8 glow-primary">
                Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="px-8">
                Ver Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Tudo que você precisa em um só lugar</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, title: "WhatsApp Integrado", desc: "Conecte sua API do WhatsApp e gerencie todas as conversas em tempo real" },
              { icon: Bot, title: "Agentes de IA", desc: "Crie e treine agentes inteligentes para automatizar atendimentos" },
              { icon: Users, title: "Gestão de Leads", desc: "Funil visual estilo Kanban para acompanhar cada oportunidade" },
              { icon: BarChart3, title: "Relatórios Avançados", desc: "Métricas detalhadas de performance e conversão" },
              { icon: Zap, title: "Automações", desc: "Configure fluxos automáticos de mensagens e qualificação" },
              { icon: Shield, title: "Segurança Total", desc: "Dados criptografados e controle de acesso por perfil" },
            ].map((feature, i) => (
              <div key={i} className="metric-card">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="glass-card rounded-2xl p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Pronto para transformar suas vendas?</h2>
            <p className="text-muted-foreground mb-8">
              Comece gratuitamente e veja resultados em minutos.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gradient-primary text-primary-foreground px-8">
                Criar Conta Grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2026 CRM AI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
