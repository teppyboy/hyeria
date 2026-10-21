import type { RouterMode } from "./build-config";

// Only the non-secret Vite mode is read; the official artifact is built with --mode management.
export function getRouterMode(): RouterMode {
  return import.meta.env.MODE === "management" ? "hash" : "history";
}
