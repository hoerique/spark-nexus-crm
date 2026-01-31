import { useState, useRef } from "react";
import { Smile, Paperclip, Mic, Send, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChatInputProps {
    onSendMessage: (content: string, type: "text" | "image" | "document", file?: File) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
    const [message, setMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if (!message.trim()) return;
        onSendMessage(message, "text");
        setMessage("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Mock implementation for file selection
        if (e.target.files && e.target.files[0]) {
            // Detect type based on extension mock
            onSendMessage(e.target.files[0].name, "image", e.target.files[0]);
        }
    };

    return (
        <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-3 flex items-center gap-2 border-t border-border">
            {/* Emoji Button (Visual only for now) */}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-transparent">
                <Smile className="w-6 h-6" />
            </Button>

            {/* Attachment Menu */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-transparent">
                        <Paperclip className="w-6 h-6" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-auto p-2 flex flex-col gap-2 bg-popover mb-2">
                    <Button variant="ghost" className="justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="w-5 h-5 text-purple-500" />
                        Fotos e Vídeos
                    </Button>
                    <Button variant="ghost" className="justify-start gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Documento
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                </PopoverContent>
            </Popover>

            {/* Input Field */}
            <div className="flex-1 rounded-lg bg-white dark:bg-[#2a3942] overflow-hidden">
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem"
                    className="border-none focus-visible:ring-0 bg-transparent h-10 px-4 py-2"
                />
            </div>

            {/* Send/Mic Button */}
            {message.trim() ? (
                <Button onClick={handleSend} size="icon" className="bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full w-10 h-10 shadow-sm shrink-0">
                    <Send className="w-5 h-5" />
                </Button>
            ) : (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-transparent">
                    <Mic className="w-6 h-6" />
                </Button>
            )}
        </div>
    );
}
