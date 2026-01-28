import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { Search, Send, Phone, MoreVertical, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const conversations = [
  { id: 1, name: "João Silva", lastMessage: "Olá, gostaria de saber mais sobre o produto", time: "2 min", unread: 2, online: true },
  { id: 2, name: "Maria Santos", lastMessage: "Perfeito, vou analisar a proposta", time: "15 min", unread: 0, online: false },
  { id: 3, name: "Pedro Oliveira", lastMessage: "Quando podemos agendar uma reunião?", time: "1h", unread: 1, online: true },
  { id: 4, name: "Ana Costa", lastMessage: "Obrigada pelo atendimento!", time: "3h", unread: 0, online: false },
];

const messages = [
  { id: 1, content: "Olá! Vi o anúncio de vocês e gostaria de saber mais sobre os planos.", sent: false, time: "14:30", status: "read" },
  { id: 2, content: "Olá João! Claro, ficamos felizes com seu interesse. Temos 3 planos disponíveis: Starter, Pro e Enterprise.", sent: true, time: "14:32", status: "read" },
  { id: 3, content: "Qual seria o mais indicado para uma empresa pequena com 5 funcionários?", sent: false, time: "14:35", status: "read" },
  { id: 4, content: "Para o seu caso, recomendo o plano Starter. Ele inclui até 10 usuários e todas as funcionalidades essenciais por R$199/mês.", sent: true, time: "14:38", status: "delivered" },
  { id: 5, content: "Interessante! Vocês têm período de teste?", sent: false, time: "14:40", status: "read" },
];

export default function Conversations() {
  const [selectedChat, setSelectedChat] = useState(conversations[0]);
  const [newMessage, setNewMessage] = useState("");

  return (
    <AppLayout>
      <div className="h-[calc(100vh-2rem)] flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-bold mb-3">Conversas</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar conversas..." className="pl-9 bg-secondary/50" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedChat(conv)}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/50",
                  selectedChat.id === conv.id && "bg-secondary"
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">{conv.name.charAt(0)}</span>
                  </div>
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{conv.name}</span>
                    <span className="text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <Badge className="bg-primary text-primary-foreground">{conv.unread}</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-semibold text-primary">{selectedChat.name.charAt(0)}</span>
                </div>
                {selectedChat.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
                )}
              </div>
              <div>
                <h2 className="font-semibold">{selectedChat.name}</h2>
                <span className="text-xs text-muted-foreground">{selectedChat.online ? "Online" : "Offline"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon"><Phone className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.sent && "justify-end")}>
                <div className={msg.sent ? "chat-bubble-sent" : "chat-bubble-received"}>
                  <p>{msg.content}</p>
                  <div className={cn("flex items-center gap-1 mt-1", msg.sent ? "justify-end" : "justify-start")}>
                    <span className="text-xs opacity-70">{msg.time}</span>
                    {msg.sent && (
                      msg.status === "read" ? <CheckCheck className="w-3 h-3 text-accent" /> : <Check className="w-3 h-3 opacity-70" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-3">
              <Input 
                placeholder="Digite sua mensagem..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-secondary/50"
              />
              <Button className="gradient-primary text-primary-foreground px-6">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
