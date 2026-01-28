import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Mail, Lock, User, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  // Redirect if already logged in
  if (user) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validationData = isLogin
        ? { email, password }
        : { email, password, name };

      const result = authSchema.safeParse(validationData);

      if (!result.success) {
        const firstError = result.error.errors[0];
        toast.error(firstError.message);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(email, password);

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou senha incorretos");
          } else if (error.status === 429 || error.message.includes("Too Many Requests")) {
            toast.error("Muitas tentativas. Aguarde alguns instantes.");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success("Login realizado com sucesso!");
        navigate("/dashboard");
      } else {
        const { data, error } = await signUp(email, password, name);

        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("Este email já está cadastrado");
          } else if (error.status === 429 || error.message.includes("Too Many Requests")) {
            toast.error("Muitas tentativas. Aguarde 60 segundos e tente novamente.");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        if (data?.session) {
          toast.success("Conta criada com sucesso!");
          navigate("/dashboard");
        } else {
          toast.success("Conta criada! Verifique seu email para confirmar.");
          // Don't navigate automatically if email confirmation is required, 
          // or navigate to a "check email" page if you have one.
          // For now, staying on page or switching to login view might be better.
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast.error("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 max-w-xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-12">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">CRM AI</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isLogin ? "Entre para acessar seu painel" : "Comece gratuitamente hoje"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12 bg-secondary/50 border-border"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-secondary/50 border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-secondary/50 border-border"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              isLogin ? "Entrar" : "Criar Conta"
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? "Criar conta" : "Fazer login"}
          </button>
        </p>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-background to-accent/10 items-center justify-center p-16">
        <div className="glass-card rounded-2xl p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4">Automatize seu atendimento</h2>
          <p className="text-muted-foreground mb-6">
            Com agentes de IA personalizados, você pode responder clientes 24/7 e converter mais leads.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full bg-primary/30 border-2 border-background" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">+1000 empresas confiam em nós</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
