import { AppLayout } from "@/components/layout/AppLayout";
import { 
  Users, MessageSquare, Bot, TrendingUp, ArrowUpRight, ArrowDownRight,
  Activity
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const metrics = [
  { label: "Total de Leads", value: "1,234", change: "+12%", up: true, icon: Users },
  { label: "Conversas Ativas", value: "89", change: "+5%", up: true, icon: MessageSquare },
  { label: "Agentes Ativos", value: "6", change: "0%", up: true, icon: Bot },
  { label: "Taxa de Conversão", value: "23%", change: "-2%", up: false, icon: TrendingUp },
];

const chartData = [
  { name: "Jan", leads: 65, conversions: 15 },
  { name: "Fev", leads: 85, conversions: 20 },
  { name: "Mar", leads: 120, conversions: 35 },
  { name: "Abr", leads: 95, conversions: 25 },
  { name: "Mai", leads: 150, conversions: 45 },
  { name: "Jun", leads: 180, conversions: 55 },
];

const recentActivity = [
  { type: "lead", message: "Novo lead: João Silva", time: "2 min atrás" },
  { type: "message", message: "Mensagem recebida de Maria", time: "5 min atrás" },
  { type: "agent", message: "Agente 'Vendas' respondeu cliente", time: "10 min atrás" },
  { type: "lead", message: "Lead convertido: Pedro Santos", time: "15 min atrás" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu CRM</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => (
            <div key={i} className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <metric.icon className="w-5 h-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${metric.up ? 'text-success' : 'text-destructive'}`}>
                  {metric.up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {metric.change}
                </div>
              </div>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 glass-card rounded-xl p-6">
            <h3 className="font-semibold mb-4">Leads e Conversões</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="conversions" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorConversions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Feed */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Atividade Recente</h3>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
