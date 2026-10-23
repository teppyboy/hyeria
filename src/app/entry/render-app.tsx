import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { Providers } from "@/app/providers";
import { createAppRouter } from "@/app/router";
import type { RouterMode } from "@/app/entry/build-config";
import { sessionStore, type DemoApiTransport } from "@/stores/session";

export function renderApp(routerMode: RouterMode, options?: { demoApi?: DemoApiTransport }) {
  if (options?.demoApi) sessionStore.getState().initializeDemo(options.demoApi);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={createAppRouter(routerMode)} />
      </Providers>
    </StrictMode>,
  );
}
