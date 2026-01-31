import { useState, useEffect } from "react";
import { toast } from "sonner";

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
    status: "sent" | "delivered" | "read";
    type: "text" | "image" | "document" | "audio";
    fileUrl?: string; // For media
}

// Mock Data
const MOCK_CONTACTS: Contact[] = [
    { id: "1", name: "João Silva", lastMessage: "Olá, gostaria de saber mais sobre...", time: "10:30", unreadCount: 2, status: "online", phone: "5511999999999" },
    { id: "2", name: "Maria Santos", lastMessage: "Obrigada!", time: "Ontem", unreadCount: 0, status: "offline", phone: "5511988888888" },
    { id: "3", name: "Suporte Técnico", lastMessage: "Seu ticket foi resolvido.", time: "Terça", unreadCount: 1, status: "typing", phone: "5511977777777" },
];

const MOCK_MESSAGES: Message[] = [
    { id: "1", content: "Olá! Como posso ajudar?", sender: "me", timestamp: "10:00", status: "read", type: "text" },
    { id: "2", content: "Gostaria de saber sobre os planos.", sender: "them", timestamp: "10:05", status: "read", type: "text" },
    { id: "3", content: "Claro! Temos planos a partir de R$97.", sender: "me", timestamp: "10:06", status: "read", type: "text" },
    { id: "4", content: "Segue nosso catálogo:", sender: "me", timestamp: "10:06", status: "read", type: "text" },
    // Image mock would go here
];

export function useChat() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [activeContact, setActiveContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load Contacts (Simulated API)
    useEffect(() => {
        const loadContacts = async () => {
            // Simulate API delay
            setTimeout(() => {
                setContacts(MOCK_CONTACTS);
                setIsLoading(false);
            }, 500);
        };
        loadContacts();
    }, []);

    // Load Messages when chat is selected (Simulated)
    useEffect(() => {
        if (!activeContact) return;

        // In a real app, fetch messages for this contact
        // For now, just reset/load mock messages varying slightly by contact
        setMessages(activeContact.id === "1" ? MOCK_MESSAGES : []);
    }, [activeContact]);

    const sendMessage = (content: string, type: Message["type"] = "text", file?: File) => {
        if (!content && !file) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            content,
            sender: "me",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "sent",
            type,
            fileUrl: file ? URL.createObjectURL(file) : undefined
        };

        setMessages((prev) => [...prev, newMessage]);

        // Simulate "Delivered" -> "Read" status updates
        setTimeout(() => {
            setMessages((prev) =>
                prev.map(m => m.id === newMessage.id ? { ...m, status: "delivered" } : m)
            );
        }, 1000);

        setTimeout(() => {
            setMessages((prev) =>
                prev.map(m => m.id === newMessage.id ? { ...m, status: "read" } : m)
            );
        }, 2500);

        // Simulate auto-reply for demo
        setTimeout(() => {
            const reply: Message = {
                id: (Date.now() + 1).toString(),
                content: "Esta é uma resposta automática simulada.",
                sender: "them",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: "read", // Incoming messages don't have this status usually, but for type consistency
                type: "text"
            };
            setMessages((prev) => [...prev, reply]);
            toast.info("Nova mensagem recebida!");
        }, 4000);
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
