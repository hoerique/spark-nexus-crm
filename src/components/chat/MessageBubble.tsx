import { cn } from "@/lib/utils";
import { Message } from "@/hooks/useChat";
import { Check, CheckCheck, FileText, Image as ImageIcon } from "lucide-react";

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isMe = message.sender === "me";

    return (
        <div className={cn("flex w-full mb-4", isMe ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[70%] rounded-lg p-3 shadow-sm relative group",
                    isMe
                        ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none"
                        : "bg-white dark:bg-[#202c33] rounded-tl-none"
                )}
            >
                {/* Render Content Based on Type */}
                {message.type === "image" && message.fileUrl && (
                    <div className="mb-2 rounded overflow-hidden">
                        <img src={message.fileUrl} alt="Sent image" className="max-w-full h-auto object-cover" />
                    </div>
                )}

                {message.type === "document" && (
                    <div className="flex items-center gap-3 bg-black/5 p-3 rounded mb-2">
                        <FileText className="w-8 h-8 text-red-500" />
                        <span className="text-sm truncate max-w-[200px]">{message.content || "Documento"}</span>
                    </div>
                )}

                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {message.content}
                </p>

                <div className="flex items-center justify-end gap-1 mt-1 select-none">
                    <span className="text-[10px] text-muted-foreground/80">
                        {message.timestamp}
                    </span>
                    {isMe && (
                        <span className={cn(
                            "ml-1",
                            message.status === "read" ? "text-blue-500" : "text-gray-400"
                        )}>
                            {message.status === "read" ? <CheckCheck size={14} /> : <Check size={14} />}
                        </span>
                    )}
                </div>

                {/* Triangle Tail (Optional - CSS managed via pseudo-elements usually, but simpler here) */}
            </div>
        </div>
    );
}
