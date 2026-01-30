
import { Cpu, Brain, Zap, Sparkles } from "lucide-react";

export const AI_PROVIDERS = [
    {
        id: "chatgpt",
        name: "OpenAI",
        icon: Cpu,
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        description: "GPT-5, GPT-4.1 e mais",
        models: [
            { value: "gpt-5.2-thinking", label: "GPT-5.2 Thinking" },
            { value: "gpt-5.2-instant", label: "GPT-5.2 Instant" },
            { value: "gpt-5.2-pro", label: "GPT-5.2 Pro" },
            { value: "gpt-5", label: "GPT-5" },
            { value: "gpt-5-mini", label: "GPT-5 mini" },
            { value: "gpt-5-nano", label: "GPT-5 nano" },
            { value: "gpt-4.1", label: "GPT-4.1 (Evolução do GPT-4)" },
            { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
            { value: "gpt-4.1-nano", label: "GPT-4.1 nano" },
        ],
        requiresKey: true,
    },
    {
        id: "anthropic",
        name: "Anthropic",
        icon: Brain,
        color: "text-orange-400",
        bgColor: "bg-orange-500/20",
        description: "Claude 3.5 Sonnet, 3 Opus e Haiku",
        models: [
            { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
            { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
            { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
        ],
        requiresKey: true,
    },
    {
        id: "gemini",
        name: "Google Gemini",
        icon: Zap,
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        description: "Gemini 2.5 Pro e Flash",
        models: [
            { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
            { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
            { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
            { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
        ],
        requiresKey: true,
    },
    {
        id: "lovable",
        name: "Lovable AI (Legado)",
        icon: Sparkles,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
        description: "Gateway integrado (Descontinuado)",
        models: [
            { value: "default", label: "Padrão" }
        ],
        requiresKey: true,
    },
];
