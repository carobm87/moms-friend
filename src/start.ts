import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Attach the Supabase access token to every server function call from the browser
// so requireSupabaseAuth middleware can authenticate the user.
const supabaseAuthClientMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window !== "undefined") {
      try {
        const { supabase } = await import("./integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          return next({
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (e) {
        console.error("[auth client middleware]", e);
      }
    }
    return next();
  }
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [supabaseAuthClientMiddleware],
}));
