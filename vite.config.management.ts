import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { lazyPlugins, type UserConfig } from "vite-plus";

// Single self-contained management.html: JS and CSS inlined, no code splitting, no public assets.
export const managementConfig: UserConfig = {
  publicDir: false,
  build: {
    rollupOptions: { input: "management.html" },
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
  plugins: lazyPlugins(() => [react(), tailwindcss(), viteSingleFile()]),
};
