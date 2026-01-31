import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Search,
  MoreVertical,
  MessageSquarePlus,
  Users,
  CircleDashed,
  ArrowLeft
} from "lucide-react";

export default function Conversations() {
  const { contacts, activeContact, setActiveContact, messages, sendMessage, isLoading } = useChat();
  const [searchTerm, setSearchTerm] = useState("");
  // State for mobile view handling
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const handleContactClick = (contact: any) => {
    setActiveContact(contact);
    setIsMobileChatOpen(true);
  };

  const handleBackToContacts = () => {
    setIsMobileChatOpen(false);
    // Optional: setActiveContact(null); if you want to clear selection
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-theme(spacing.4))] overflow-hidden bg-background">
        {/* Sidebar - Contact List */}
        <div className={cn(
          "w-full md:w-[400px] border-r border-border flex flex-col transition-all",
          isMobileChatOpen ? "hidden md:flex" : "flex"
        )}>
          {/* Sidebar Header */}
          <div className="h-16 bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-border">
            <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback>EU</AvatarFallback>
            </Avatar>
            <div className="flex gap-2 text-muted-foreground">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Users className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <CircleDashed className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MessageSquarePlus className="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-border bg-white dark:bg-[#111b21]">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <Input
                placeholder="Pesquisar ou começar uma nova conversa"
                className="pl-10 bg-[#f0f2f5] dark:bg-[#202c33] border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-9 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Carregando conversas...</div>
            ) : (
              filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-colors relative group",
                    activeContact?.id === contact.id ? "bg-[#f0f2f5] dark:bg-[#2a3942]" : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]"
                  )}
                >
                  <Avatar className="w-12 h-12">
                    {contact.avatar ? <AvatarImage src={contact.avatar} /> : <AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>}
                  </Avatar>

                  <div className="flex-1 min-w-0 border-b border-border pb-3 group-last:border-none">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-foreground truncate max-w-[70%]">
                        {contact.name}
                      </span>
                      <span className={cn(
                        "text-xs",
                        contact.unreadCount > 0 ? "text-[#00a884] font-medium" : "text-muted-foreground"
                      )}>
                        {contact.time}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground truncate max-w-[85%]">
                        {contact.status === "typing" ? <span className="text-[#00a884]">digitando...</span> : contact.lastMessage}
                      </p>
                      <div className="flex gap-1">
                        {contact.unreadCount > 0 && (
                          <Badge className="bg-[#00a884] hover:bg-[#00a884] text-white h-5 min-w-[20px] rounded-full px-1 justify-center">
                            {contact.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex-col bg-[#efeae2] dark:bg-[#0b141a] transition-all relative",
          isMobileChatOpen ? "flex w-full absolute inset-0 z-50 md:relative md:z-auto" : "hidden md:flex"
        )}>
          {/* Chat Background Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />

          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="h-16 bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-border z-10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={handleBackToContacts}>
                    <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <Avatar className="cursor-pointer">
                    <AvatarFallback>{activeContact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col cursor-pointer">
                    <span className="font-semibold text-foreground text-sm leading-tight">
                      {activeContact.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activeContact.status === "online" ? "online" :
                        activeContact.status === "typing" ? "digitando..." : "visto por último hoje às 10:00"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Button variant="ghost" size="icon"><Search className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-10 z-10 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>

              {/* Chat Input */}
              <div className="z-10">
                <ChatInput onSendMessage={sendMessage} />
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10 bg-[#f0f2f5] dark:bg-[#222e35] border-b-[6px] border-[#25d366]">
              <div className="max-w-[560px]">
                <h1 className="text-3xl font-light text-[#41525d] dark:text-[#e9edef] mb-4">
                  WhatsApp Web para CRM
                </h1>
                <p className="text-[#8696a0] mb-8">
                  Envie e receba mensagens sem precisar manter seu celular conectado.
                  <br /> Use o WhatsApp em até 4 aparelhos e 1 celular ao mesmo tempo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
