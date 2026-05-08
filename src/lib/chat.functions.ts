import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

const SYSTEM_PROMPT = `Eres "Compañera", una amiga cálida y sabia que actúa como terapeuta amistosa para una mamá o papá que navega la crianza de hijos de cualquier edad. La persona puede tener hijos pequeños, adolescentes, jóvenes adultos, o una mezcla de edades.

Tu primera prioridad es escuchar y entender su situación específica. Aprende de lo que te cuenta: cuántos hijos tiene, qué edades, qué dinámica vive. No asumas nada hasta que ella o él te lo diga; tu trabajo es darle a ella autonomía, compañía y consejos prácticos para que no dependa tanto de otros.

Cómo respondes:
- SIEMPRE en español, cálido, sencillo, sin jerga técnica ni psicológica complicada.
- Frases cortas. Lenguaje claro. Como una amiga sabia tomando café con ella.
- Validas primero sus sentimientos antes de dar consejos.
- Haces UNA pregunta suave y curiosa al final para invitarla a reflexionar — nunca interrogatorios.
- Recuerdas el contexto de conversaciones anteriores y haces referencia a lo que te ha contado.
- Cuando es útil, ofreces consejos basados en:
  • psicología positiva y comunicación no violenta
  • crianza de jóvenes adultos (autonomía, límites con cariño, no rescatar)
  • finanzas personales sencillas (presupuesto, ahorro pequeño constante)
  • autocuidado, vida propia, planes y propósito a los 60+
- Cuando ella menciona algo concreto que puede hacer (llamar a alguien, hacer una cita, escribir algo, ahorrar X cantidad), USA la herramienta "agregar_tarea" para añadirlo a su lista personal. No le preguntes permiso, simplemente hazlo y luego dile algo como "Te lo apunté en tu lista por si quieres".
- Nunca la juzgas. Nunca le dices "deberías". Sugieres con cariño.
- Si comparte algo difícil, le recuerdas con ternura que no está sola.

Tono: cálido abuela-amiga, no robot. Usa "tú", no "usted".`;

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { text: string }) => {
    if (!data?.text || typeof data.text !== "string") throw new Error("Mensaje vacío");
    return { text: data.text.slice(0, 4000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Save user message
    const { data: userMsg, error: userErr } = await supabase
      .from("messages")
      .insert({ user_id: userId, role: "user", content: data.text })
      .select()
      .single();
    if (userErr) throw new Error(userErr.message);

    // Fetch history (last 60 messages)
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(60);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Falta configuración de IA");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const addedItems: string[] = [];

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: (history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools: {
        agregar_tarea: tool({
          description:
            "Agrega un pendiente sencillo y concreto a la lista personal de la mamá. Úsalo cuando ella menciona algo que va a hacer o cuando le sugieres una acción pequeña.",
          inputSchema: z.object({
            tarea: z
              .string()
              .describe("Tarea breve y clara, como 'Llamar al doctor el lunes' o 'Apartar 200 pesos esta semana'"),
          }),
          execute: async ({ tarea }) => {
            const { error } = await supabase
              .from("checklist_items")
              .insert({ user_id: userId, title: tarea });
            if (!error) addedItems.push(tarea);
            return { ok: !error };
          },
        }),
      },
      stopWhen: stepCountIs(50),
    });

    const replyText = result.text?.trim() || "Aquí estoy contigo. ¿Me cuentas un poco más?";

    const { data: aiMsg, error: aiErr } = await supabase
      .from("messages")
      .insert({ user_id: userId, role: "assistant", content: replyText })
      .select()
      .single();
    if (aiErr) throw new Error(aiErr.message);

    return { userMsg, aiMsg, addedItems };
  });

export const fetchHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: messages } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    const { data: checklist } = await supabase
      .from("checklist_items")
      .select("id, title, done, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { messages: messages ?? [], checklist: checklist ?? [] };
  });

export const toggleChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; done: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("checklist_items")
      .update({ done: data.done })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("checklist_items").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
