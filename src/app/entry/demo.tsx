import "../../styles/globals.css";
import { createDemoApi } from "@/features/demo/api";
import { renderApp } from "./render-app";

renderApp("hash", { demoApi: createDemoApi() });
