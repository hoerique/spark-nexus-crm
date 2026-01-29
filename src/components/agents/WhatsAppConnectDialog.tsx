import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, QrCode, Smartphone, CheckCircle2, RefreshCw } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { toast } from "sonner";

interface WhatsAppConnectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WhatsAppConnectDialog({ open, onOpenChange }: WhatsAppConnectDialogProps) {
    const { agents } = useAgents();
    const [selectedAgentId, setSelectedAgentId] = useState<string>("");
    const [step, setStep] = useState<"select" | "connecting" | "qrcode" | "connected">("select");
    const [qrCode, setQrCode] = useState<string>("");

    useEffect(() => {
        if (open) {
            setStep("select");
            setSelectedAgentId("");
        }
    }, [open]);

    const handleConnect = async () => {
        if (!selectedAgentId) return;

        setStep("connecting");

        // Simulate API call to backend to start session
        setTimeout(() => {
            setStep("qrcode");
            // Mock QR Code (in real app, this would come from the API)
            setQrCode("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AgentWiseMockConnection");
            toast.success("Sessão iniciada! Leia o QR Code.");
        }, 1500);
    };

    const simulateRead = () => {
        setStep("connecting");
        setTimeout(() => {
            setStep("connected");
            toast.success("WhatsApp Conectado com Sucesso!");
        }, 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-green-500" />
                        Conectar WhatsApp
                    </DialogTitle>
                    <DialogDescription>
                        Vincule um agente ao seu WhatsApp para responder automaticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {step === "select" && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Escolha o Agente</label>
                                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um agente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                {agent.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Este agente assumirá as respostas deste número.
                                </p>
                            </div>
                            <Button
                                onClick={handleConnect}
                                disabled={!selectedAgentId}
                                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                            >
                                Gerar QR Code
                            </Button>
                        </div>
                    )}

                    {step === "connecting" && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in">
                            <Loader2 className="w-12 h-12 text-[#25D366] animate-spin" />
                            <p className="text-sm text-muted-foreground">Iniciando sessão com WhatsApp...</p>
                        </div>
                    )}

                    {step === "qrcode" && (
                        <div className="flex flex-col items-center space-y-4 animate-in zoom-in-95">
                            <div className="bg-white p-4 rounded-lg shadow-sm border">
                                {qrCode ? (
                                    <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 mix-blend-multiply" />
                                ) : (
                                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                                        <QrCode className="w-12 h-12 text-gray-300" />
                                    </div>
                                )}
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-medium text-sm">Abra o WhatsApp no seu celular</p>
                                <p className="text-xs text-muted-foreground">Menu &gt; Aparelhos Conectados &gt; Conectar</p>
                            </div>

                            {/* Dev Only: Simulate Success */}
                            <Button variant="ghost" size="sm" onClick={simulateRead} className="text-xs text-muted-foreground">
                                (Simular Leitura)
                            </Button>
                        </div>
                    )}

                    {step === "connected" && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-in zoom-in-95">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="font-semibold text-lg text-green-600">Conectado!</h3>
                                <p className="text-sm text-muted-foreground">
                                    O agente <strong>{agents.find(a => a.id === selectedAgentId)?.name}</strong> está online no WhatsApp.
                                </p>
                            </div>
                            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
                                Fechar
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
