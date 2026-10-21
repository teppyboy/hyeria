import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../styles/globals.css";
import { App } from "../App";
import type { RouterMode } from "./build-config";

export const routerMode: RouterMode = "hash";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
