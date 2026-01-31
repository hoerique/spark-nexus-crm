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

    // Load Contacts (Derived from Messages)
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                console.log("Fetching contacts from MESSAGES table...");

                // Debug Auth
                const { data: { user } } = await supabase.auth.getUser();
                console.log("Current Consuming User ID:", user?.id);

                // Fetch recent messages to build contact list
                // We fetch 50 most recent messages regardless of sender
                const { data, error } = await supabase
                    .from('whatsapp_messages')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) {
                    console.error("Supabase Error fetching messages for contacts:", error);
                    throw error;
                }

                console.log("Raw Messages for Contacts:", data);

                // Deduplicate by remote_jid to create "Conversations" list
                const contactsMap = new Map<string, Contact>();

                data?.forEach((msg: any) => {
                    if (!contactsMap.has(msg.remote_jid)) {
                        contactsMap.set(msg.remote_jid, {
                            id: msg.remote_jid, // Use remote_jid as ID
                            // Try to get name from msg.contact_name (new column), fallback to phone
                            name: msg.contact_name || msg.remote_jid.replace('@s.whatsapp.net', '') || "Desconhecido",
                            phone: msg.remote_jid.replace('@s.whatsapp.net', ''),
                            lastMessage: msg.content || (msg.media_url ? "Mídia" : ""),
                            time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                            unreadCount: 0,
                            status: "offline",
                            avatar: undefined
                        });
                    }
                });

                const formattedContacts = Array.from(contactsMap.values());
                setContacts(formattedContacts);

            } catch (error) {
                console.error("Error loading contacts:", error);
                toast.error("Erro ao carregar conversas.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchContacts();

        // Subscribe to new messages (to update contact list order/last message)
        const channel = supabase
            .channel('public:whatsapp_messages_contacts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, () => {
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
            const cleanPhone = activeContact.phone.replace(/\D/g, '');

            try {
                const { data, error } = await supabase
                    .from('whatsapp_messages')
                    .select('*')
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

        // Realtime subscription for messages in chat
        const channel = supabase
            .channel(`chat:${activeContact.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_messages'
            }, (payload) => {
                const msg = payload.new as any;
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
            const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
                body: {
                    phone: activeContact.phone,
                    message: content,
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
