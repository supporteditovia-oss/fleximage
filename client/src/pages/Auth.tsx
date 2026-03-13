import { useState } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { translateSupabaseError } from "@/lib/error-translator";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTOS, setAcceptedTOS] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isLogin = location === "/login";

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-muted" };
    if (pass.length < 6)
      return { score: 1, label: "Trop court", color: "bg-destructive" };

    let score = 1;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2)
      return { score: 2, label: "Faible", color: "bg-orange-500" };
    if (score <= 3)
      return { score: 3, label: "Moyenne", color: "bg-yellow-500" };
    if (score <= 4) return { score: 4, label: "Forte", color: "bg-green-500" };
    return { score: 5, label: "Excellente", color: "bg-emerald-600" };
  };

  const strength = getPasswordStrength(password);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && !isValidEmail(email)) {
      toast({
        variant: "destructive",
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide.",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({ title: "Bon retour !", description: "Connexion réussie." });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: {
              has_accepted_terms: true,
            },
          },
        });
        if (error) throw error;
        setLocation("/login");
      }
    } catch (error: any) {
      const translated = translateSupabaseError(error);
      toast({
        variant: "destructive",
        title: translated.title,
        description: translated.description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      const translated = translateSupabaseError(error);
      toast({
        variant: "destructive",
        title: translated.title,
        description: translated.description,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link href="/" className="mb-8 hover:opacity-80 transition-opacity">
        <img
          src="/assets/turboprank.png"
          alt="TurboPrank"
          className="h-10 md:h-14 object-contain"
        />
      </Link>

      {/* Card with glow */}
      <div className="relative w-full max-w-md">
        {/* Hero-style background glow blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-secondary/3 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[250px] h-[250px] bg-secondary/2 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="relative rounded-2xl border border-border bg-card p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {isLogin ? "Bon retour parmi nous" : "Créer un compte"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isLogin
                ? "Entrez vos identifiants pour vous connecter"
                : "Entrez votre email pour commencer"}
            </p>
          </div>

          <div className="space-y-4">
            {/* Google button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-semibold rounded-full active:scale-95 transition-transform"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              data-testid="button-google-auth"
            >
              <SiGoogle className="mr-2 h-4 w-4" />
              {isLogin ? "Se connecter avec Google" : "S'inscrire avec Google"}
            </Button>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                ou
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10 rounded-xl"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {!isLogin && password && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Robustesse:</span>
                      <span className="font-medium">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${strength.color}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {!isLogin && (
                <p className="text-[11px] text-muted-foreground/70 text-center">
                  En vous inscrivant, vous acceptez nos{" "}
                  <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CGU</a>
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-full border-0 shadow-none active:scale-95 transition-transform"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? "Se connecter" : "S'inscrire"}
              </Button>
            </form>
          </div>

          {/* Footer toggle */}
          <div className="mt-8 text-center">
            <button
              onClick={() => setLocation(isLogin ? "/register" : "/login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Pas encore de compte ? S'inscrire"
                : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
