export const routerModes = ["hash", "history", "demo"] as const;

export type RouterMode = (typeof routerModes)[number];
