import { create } from "zustand";

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}
export interface Notification {
  id: number;
  message: string;
  type: "success" | "error";
}
interface UiState {
  sidebarOpen: boolean;
  confirm: ConfirmRequest | null;
  notifications: Notification[];
  legalOpen: boolean;
  toggleSidebar(): void;
  setSidebarOpen(open: boolean): void;
  requestConfirm(request: ConfirmRequest): Promise<boolean>;
  resolveConfirm(accepted: boolean): void;
  notify(message: string, type?: Notification["type"]): void;
  dismissNotification(id: number): void;
  setLegalOpen(open: boolean): void;
  reset(): void;
}
let resolvePending: ((accepted: boolean) => void) | null = null;
let nextNotificationId = 0;
const initial = { sidebarOpen: true, confirm: null, notifications: [], legalOpen: false };
export const useUiStore = create<UiState>()((set) => ({
  ...initial,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  requestConfirm(request) {
    return new Promise((resolve) => {
      resolvePending = resolve;
      set({ confirm: request });
    });
  },
  resolveConfirm(accepted) {
    set({ confirm: null });
    resolvePending?.(accepted);
    resolvePending = null;
  },
  notify(message, type = "success") {
    const id = ++nextNotificationId;
    set((state) => ({ notifications: [...state.notifications, { id, message, type }].slice(-5) }));
  },
  dismissNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id) })),
  setLegalOpen: (legalOpen) => set({ legalOpen }),
  reset() {
    resolvePending?.(false);
    resolvePending = null;
    set(initial);
  },
}));
