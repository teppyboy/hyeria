import "../../styles/globals.css";
import { renderApp } from "./render-app";
import { getRouterMode } from "./router-mode";

export const routerMode = getRouterMode();

renderApp(routerMode);
