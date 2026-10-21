import { defineConfig } from "vite-plus";

// Vite+ task settings (fmt/lint/test), composed into vite.config.ts.
export const vitePlusConfig = defineConfig({
  fmt: {
    ignorePatterns: [
      "docs/**",
      ".superpowers/**",
      "dist/**",
      "dist-management/**",
      "pnpm-lock.yaml",
    ],
  },
  lint: {
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": ["warn", { allowConstantExport: true }],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
