import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { lazyPlugins, type UserConfig } from "vite-plus";

export const staticConfig: UserConfig = {
  build: { rollupOptions: { input: "index.html" } },
  plugins: lazyPlugins(() => [react(), tailwindcss()]),
};
