import { useEffect } from "react";
import { useUiStore } from "@/stores/ui";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";

export function NotificationProvider() {
  const notifications = useUiStore((state) => state.notifications);
  const language = usePreferencesStore((state) => state.language);
  useEffect(() => {
    const timers = notifications
      .filter((item) => item.type === "success")
      .map((item) =>
        window.setTimeout(() => useUiStore.getState().dismissNotification(item.id), 5000),
      );
    return () => timers.forEach(window.clearTimeout);
  }, [notifications]);
  return (
    <div
      aria-label="Notifications"
      className="fixed right-4 top-4 z-50 grid gap-2"
      aria-live="polite"
    >
      {notifications.map((item) => (
        <div
          key={item.id}
          role={item.type === "error" ? "alert" : "status"}
          className="rounded-md border bg-background p-3 shadow"
        >
          {item.message}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => useUiStore.getState().dismissNotification(item.id)}
          >
            {translate(language, "feedback.dismiss")}
          </button>
        </div>
      ))}
    </div>
  );
}
