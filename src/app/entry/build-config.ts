export const routerModes = ["hash", "history"] as const;

export type RouterMode = (typeof routerModes)[number];
