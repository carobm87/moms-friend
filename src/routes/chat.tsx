import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  sendChatMessage,
  fetchHistory,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { VoiceButton } from "@/components/VoiceButton";
import { Send, ListChecks, MessageCircleHeart, X, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [showList, setShowList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/" });
      else setAuthed(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const fetchHistoryFn = useServerFn(fetchHistory);
  const sendChatFn = useServerFn(sendChatMessage);
  const toggleFn = useServerFn(toggleChecklistItem);
  const deleteFn = useServerFn(deleteChecklistItem);

  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistoryFn(),
    enabled: !!authed,
  });

  const messages = data?.messages ?? [];
  const checklist = data?.checklist ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isLoading]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [authed]);

  const send = useMutation({
    mutationFn: (text: string) => sendChatFn({ data: { text } }),
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: ["history"] });
      const prev = qc.getQueryData<any>(["history"]);
      qc.setQueryData(["history"], (old: any) => ({
        ...(old ?? { messages: [], checklist: [] }),
        messages: [
          ...(old?.messages ?? []),
          { id: "tmp-" + Date.now(), role: "user", content: text, created_at: new Date().toISOString() },
        ],
      }));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["history"], ctx.prev);
      toast.error("No pude enviar tu mensaje. Intenta otra vez.");
      console.error(err);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["history"] });
      if (res.addedItems?.length) {
        toast.success(
          res.addedItems.length === 1
            ? `Te apunté: "${res.addedItems[0]}"`
            : `Te apunté ${res.addedItems.length} cosas en tu lista`
        );
      }
      setTimeout(() => textareaRef.current?.focus(), 100);
    },
  });

  const handleSend = () => {
    const t = input.trim();
    if (!t || send.isPending) return;
    setInput("");
    send.mutate(t);
  };

  const handleVoice = (text: string) => {
    if (!text.trim()) return;
    setInput("");
    send.mutate(text);
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (!authed) return <div className="min-h-screen bg-background" />;

  return (
    <main className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-full bg-warm flex items-center justify-center">
            <MessageCircleHeart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl leading-tight">Compañera</h1>
            <p className="text-xs text-muted-foreground">Aquí estoy para ti</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setShowList(true)}
            className="rounded-full h-12 px-3 gap-1.5 relative"
            aria-label="Mi lista"
          >
            <ListChecks className="h-5 w-5" />
            {checklist.filter((i) => !i.done).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {checklist.filter((i) => !i.done).length}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="lg" onClick={onLogout} className="rounded-full h-12 w-12 p-0" aria-label="Salir">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && !isLoading && (
          <div className="max-w-md mx-auto text-center pt-8">
            <div className="h-16 w-16 mx-auto rounded-full bg-warm flex items-center justify-center mb-4">
              <MessageCircleHeart className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl mb-2">Hola, qué bueno verte</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Cuéntame cómo te sientes hoy, o algo que te ronda en la cabeza.
              Puedes <strong>escribir</strong> o <strong>hablar</strong> tocando el micrófono.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-3xl rounded-br-md px-5 py-3 bg-bubble-user text-bubble-user-foreground text-[1.05rem] leading-relaxed shadow-sm whitespace-pre-wrap">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[90%] text-foreground text-[1.1rem] leading-relaxed whitespace-pre-wrap">
                {m.content}
              </div>
            )}
          </div>
        ))}

        {send.isPending && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 items-center px-2 py-3 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card/80 backdrop-blur px-3 pt-3 pb-4 safe-area">
        <div className="flex items-end gap-2">
          <VoiceButton
            onTranscript={handleVoice}
            onInterim={(t) => setInput(t)}
            disabled={send.isPending}
          />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe o toca el micrófono..."
            rows={1}
            className="min-h-14 max-h-36 text-[1.05rem] rounded-3xl px-5 py-3.5 resize-none bg-card border-border focus-visible:ring-primary"
            disabled={send.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || send.isPending}
            className="h-14 w-14 shrink-0 rounded-full bg-primary hover:opacity-90 text-primary-foreground p-0 shadow-md"
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Checklist drawer */}
      {showList && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowList(false)}>
          <div
            className="bg-card w-full sm:max-w-md max-h-[85dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <h2 className="text-xl">Mi lista</h2>
              </div>
              <Button variant="ghost" size="lg" onClick={() => setShowList(false)} className="rounded-full h-11 w-11 p-0" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {checklist.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 px-6 text-base">
                  Cuando hablemos de cosas que quieras hacer, las apunto aquí para ti.
                </p>
              ) : (
                <ul className="space-y-1">
                  {checklist.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/60 group"
                    >
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={(c) => {
                          qc.setQueryData(["history"], (old: any) => ({
                            ...old,
                            checklist: old.checklist.map((i: any) =>
                              i.id === item.id ? { ...i, done: !!c } : i
                            ),
                          }));
                          toggleFn({ data: { id: item.id, done: !!c } }).catch(() => {
                            toast.error("No pude guardar el cambio");
                            qc.invalidateQueries({ queryKey: ["history"] });
                          });
                        }}
                        className="h-6 w-6 rounded-md border-primary data-[state=checked]:bg-primary"
                      />
                      <span
                        className={cn(
                          "flex-1 text-base leading-snug",
                          item.done && "line-through text-muted-foreground"
                        )}
                      >
                        {item.title}
                      </span>
                      <button
                        onClick={() => {
                          qc.setQueryData(["history"], (old: any) => ({
                            ...old,
                            checklist: old.checklist.filter((i: any) => i.id !== item.id),
                          }));
                          deleteFn({ data: { id: item.id } }).catch(() =>
                            qc.invalidateQueries({ queryKey: ["history"] })
                          );
                        }}
                        className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
