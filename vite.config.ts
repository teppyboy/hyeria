import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { managementConfig } from "./vite.config.management.ts";
import { staticConfig } from "./vite.config.static.ts";
import { vitePlusConfig } from "./vp.config.ts";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  ...vitePlusConfig,
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  ...(mode === "management" ? managementConfig : staticConfig),
}));
