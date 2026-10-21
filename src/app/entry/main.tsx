import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "../../styles/globals.css";
import { createAppRouter } from "../router";
import { getRouterMode } from "./router-mode";

export const routerMode = getRouterMode();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={createAppRouter(routerMode)} />
  </StrictMode>,
);
