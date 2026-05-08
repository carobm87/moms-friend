import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  disabled?: boolean;
};

// Browser SpeechRecognition (free, no API key). Spanish.
export function VoiceButton({ onTranscript, onInterim, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) as any;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "es-MX";
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = "";

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      onInterim?.((finalText + interim).trim());
    };

    rec.onerror = (e: any) => {
      console.error("speech error", e);
      if (e.error === "not-allowed") {
        toast.error("Necesito permiso para usar el micrófono.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        toast.error("No te escuché bien. Intenta de nuevo.");
      }
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (text) onTranscript(text);
      finalText = "";
    };

    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch {}
    };
  }, [onTranscript, onInterim]);

  if (!supported) return null;

  const toggle = () => {
    if (disabled) return;
    if (listening) {
      recRef.current?.stop();
    } else {
      try {
        recRef.current?.start();
        setListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? "Detener grabación" : "Hablar"}
      className={cn(
        "h-14 w-14 shrink-0 rounded-full flex items-center justify-center transition-all shadow-md",
        listening
          ? "bg-destructive text-destructive-foreground scale-110 animate-pulse"
          : "bg-warm text-primary hover:bg-warm/80"
      )}
    >
      {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
    </button>
  );
}
