import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircleHeart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) navigate({ to: "/chat" });
      else setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/chat" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const handleGoogle = async () => {
    setSigningIn(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No pudimos entrar. Intenta otra vez.");
      setSigningIn(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/chat" });
  };

  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-background">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-warm flex items-center justify-center mb-6 shadow-sm">
          <MessageCircleHeart className="h-10 w-10 text-primary" strokeWidth={1.8} />
        </div>
        <h1 className="text-5xl text-foreground mb-3">Compañera</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-10">
          Tu amiga cálida que te escucha, te aconseja y te ayuda a organizar tu día.
        </p>

        <Button
          size="lg"
          onClick={handleGoogle}
          disabled={signingIn}
          className="w-full h-14 text-lg rounded-full bg-primary hover:opacity-90 text-primary-foreground shadow-md"
        >
          {signingIn ? "Entrando..." : "Entrar con Google"}
        </Button>

        <p className="mt-8 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          Hecho con <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> para mamá
        </p>
      </div>
    </main>
  );
}
