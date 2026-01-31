import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface Contact {
    id: string;
    name: string;
    avatar?: string;
    lastMessage: string;
    time: string;
    unreadCount: number;
    status: "online" | "offline" | "typing";
    phone: string;
}

export interface Message {
    id: string;
    content: string;
    sender: "me" | "them";
    timestamp: string;
    status: "sent" | "delivered" | "read" | "failed";
    type: "text" | "image" | "document" | "audio";
    fileUrl?: string;
}

export function useChat() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [activeContact, setActiveContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load Contacts (Conversations)
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                console.log("Fetching contacts...");

                // Debug Auth
                const { data: { user } } = await supabase.auth.getUser();
                console.log("Current Frontend User ID:", user?.id);

                const { data, error } = await supabase
                    .from('conversations')
                    .select('*')
                    //.eq('channel', 'whatsapp') // REMOVIDO TEMPORARIAMENTE PARA DEBUG
                    .order('last_message_at', { ascending: false });

                if (error) {
                    console.error("Supabase Error fetching contacts:", error);
                    throw error;
                }

                console.log("Raw Contacts Data:", data);

                // Map database conversations to frontend Contact interface
                const formattedContacts: Contact[] = (data || []).map((conv: any) => ({
                    id: conv.id,
                    name: conv.contact_name || conv.contact_phone || "Desconhecido",
                    phone: conv.contact_phone,
                    lastMessage: "Clique para ver as mensagens",
                    time: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                    unreadCount: 0,
                    status: "offline",
                    avatar: undefined
                }));

                setContacts(formattedContacts);
            } catch (error) {
                console.error("Error loading contacts:", error);
                toast.error("Erro ao carregar conversas.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchContacts();

        // Subscribe to new conversations
        const channel = supabase
            .channel('public:conversations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
                fetchContacts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Load Messages when contact is selected
    useEffect(() => {
        if (!activeContact) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            // Remove symbols from phone to match typical database format if needed
            // But assuming 'remote_jid' might be like '5511999999999@s.whatsapp.net' and contact.phone is '5511999999999'
            const cleanPhone = activeContact.phone.replace(/\D/g, '');

            try {
                const { data, error } = await supabase
                    .from('whatsapp_messages')
                    .select('*')
                    // Assuming remote_jid contains the phone number
                    .ilike('remote_jid', `%${cleanPhone}%`)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                const formattedMessages: Message[] = (data || []).map((msg: any) => ({
                    id: msg.id,
                    content: msg.content || (msg.media_url ? "Mídia" : ""),
                    sender: msg.direction === 'outgoing' ? 'me' : 'them',
                    timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: msg.status as any,
                    type: msg.media_url ? (msg.media_mimetype?.includes('image') ? 'image' : 'document') : 'text',
                    fileUrl: msg.media_url
                }));

                setMessages(formattedMessages);
            } catch (error) {
                console.error("Error loading messages:", error);
            }
        };

        fetchMessages();

        // Realtime subscription for messages
        const channel = supabase
            .channel(`chat:${activeContact.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_messages'
            }, (payload) => {
                const msg = payload.new as any;
                // Check if message belongs to current chat
                if (msg.remote_jid.includes(activeContact.phone.replace(/\D/g, ''))) {
                    setMessages(prev => [...prev, {
                        id: msg.id,
                        content: msg.content || (msg.media_url ? "Mídia" : ""),
                        sender: msg.direction === 'outgoing' ? 'me' : 'them',
                        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: msg.status as any,
                        type: msg.media_url ? (msg.media_mimetype?.includes('image') ? 'image' : 'document') : 'text',
                        fileUrl: msg.media_url
                    }]);
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'whatsapp_messages'
            }, (payload) => {
                // Handle status updates (sent -> delivered -> read)
                const updatedMsg = payload.new as any;
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, status: updatedMsg.status } : m));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeContact]);

    const sendMessage = async (content: string, type: Message["type"] = "text", file?: File) => {
        if (!activeContact) return;

        // Optimistic UI Update
        const tempId = Date.now().toString();
        const optimisticMessage: Message = {
            id: tempId,
            content,
            sender: "me",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "sent",
            type
        };

        setMessages(prev => [...prev, optimisticMessage]);

        try {
            // Call Edge Function to send message via UAZAPI
            // Note: You must implement 'send-whatsapp-message' edge function on Supabase
            const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
                body: {
                    phone: activeContact.phone,
                    message: content,
                    // You might need to pass the instance_id if you have multiple
                    // instance_id: "..." 
                }
            });

            if (error) throw error;

        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Erro ao enviar mensagem.");
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
        }
    };

    return {
        contacts,
        activeContact,
        setActiveContact,
        messages,
        isLoading,
        sendMessage
    };
}
