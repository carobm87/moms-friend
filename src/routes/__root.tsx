import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">Algo salió mal</h1>
        <p className="mt-2 text-base text-muted-foreground">No te preocupes, podemos intentarlo de nuevo.</p>
        <div className="mt-6">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mom's Friend" },
      { name: "description", content: "A warm friend that listens, gives advice, and helps you organize your day. / Una amiga cálida que te escucha, te aconseja y te ayuda a organizar tu día." },
      { property: "og:title", content: "Mom's Friend" },
      { name: "twitter:title", content: "Mom's Friend" },
      { property: "og:description", content: "A warm friend that listens, gives advice, and helps you organize your day. / Una amiga cálida que te escucha, te aconseja y te ayuda a organizar tu día." },
      { name: "twitter:description", content: "A warm friend that listens, gives advice, and helps you organize your day. / Una amiga cálida que te escucha, te aconseja y te ayuda a organizar tu día." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/hcrCFFwLMXfHvdXg13PTz8MIHRl2/social-images/social-1778264846884-9ADE77DD-598A-46C9-A50E-97BB62A95294.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/hcrCFFwLMXfHvdXg13PTz8MIHRl2/social-images/social-1778264846884-9ADE77DD-598A-46C9-A50E-97BB62A95294.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Nunito:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
