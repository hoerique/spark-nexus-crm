import { AppLayout } from "@/components/layout/AppLayout";
import {
  Users, MessageSquare, Bot, TrendingUp, ArrowUpRight, ArrowDownRight,
  Activity, DollarSign
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const metrics = [
  { label: "Total de Leads", value: "1,234", change: "+12%", up: true, icon: Users },
  { label: "Vendas do Mês", value: "R$ 45.2k", change: "+8.2%", up: true, icon: DollarSign },
  { label: "Conversas Ativas", value: "89", change: "+5%", up: true, icon: MessageSquare },
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
  { type: "sale", message: "Venda fechada: Empresa Tech", time: "10 min atrás" },
  { type: "agent", message: "Agente 'Vendas' agendou reunião", time: "25 min atrás" },
  { type: "lead", message: "Lead converteu: Maria Santos", time: "1h atrás" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Visão geral da sua performance hoje.</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, i) => (
            <div key={i} className="metric-card group hover:scale-[1.02] transition-transform duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                  <metric.icon className="w-6 h-6 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${metric.up ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {metric.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {metric.change}
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight">{metric.value}</p>
              <p className="text-sm text-muted-foreground font-medium mt-1">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-7 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-4 glass-card rounded-xl p-6 border border-border/50 shadow-sm">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Crescimento de Leads
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                  <Area type="monotone" dataKey="conversions" name="Conversões" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorConversions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-3 glass-card rounded-xl p-6 border border-border/50 shadow-sm flex flex-col">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Atividade em Tempo Real
            </h3>
            <div className="space-y-6 flex-1 pr-2 custom-scrollbar overflow-y-auto max-h-[300px]">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="relative mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all" />
                    {i !== recentActivity.length - 1 && (
                      <div className="absolute top-3 left-[3px] w-[2px] h-12 bg-border group-hover:bg-primary/20 transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <p className="text-sm font-medium leading-none mb-1">{activity.message}</p>
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
