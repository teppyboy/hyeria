import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";
import { vitePlusConfig } from "./vp.config.ts";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  ...vitePlusConfig,
  build: {
    rollupOptions: {
      input: mode === "management" ? "management.html" : "index.html",
    },
  },
  plugins: lazyPlugins(() => [react()]),
}));
