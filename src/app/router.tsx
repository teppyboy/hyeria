import { createBrowserRouter, createHashRouter, type RouteObject } from "react-router";
import { App } from "./App";
import type { RouterMode } from "./entry/build-config";

export const appRoutes: RouteObject[] = [{ path: "*", element: <App /> }];

export function createAppRouter(mode: RouterMode) {
  return mode === "hash" ? createHashRouter(appRoutes) : createBrowserRouter(appRoutes);
}
