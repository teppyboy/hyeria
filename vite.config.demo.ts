import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite-plus";
import { lazyPlugins } from "vite-plus";

const demoEntry = "/src/app/entry/demo.tsx";

export const demoConfig: UserConfig = {
  base: process.env.DEMO_BASE ?? "/",
  build: { rollupOptions: { input: "index.html" } },
  plugins: lazyPlugins(() => [
    react(),
    tailwindcss(),
    {
      name: "hyeria-demo-entry",
      transformIndexHtml(html) {
        return html.replace(/\/src\/app\/entry\/main\.tsx/g, demoEntry);
      },
    },
  ]),
};
