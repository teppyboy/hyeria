import type { ReactNode } from "react";
import { translate, type MessageKey } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import { cn } from "@/lib/utils";

export type WorkspaceStateKind = "loading" | "empty" | "error" | "success" | "unavailable";

export interface WorkspaceStateProps {
  kind: WorkspaceStateKind;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const defaultTitleKeys: Record<WorkspaceStateKind, MessageKey> = {
  loading: "dashboard.channelLoading",
  empty: "dashboard.noChannels",
  error: "feedback.error",
  success: "config.saved",
  unavailable: "dashboard.unavailable",
};

export function WorkspaceState({
  kind,
  title,
  description,
  action,
  className,
}: WorkspaceStateProps) {
  const language = usePreferencesStore((state) => state.language);
  const role = kind === "error" ? "alert" : "status";
  return (
    <section
      data-slot="workspace-state"
      data-kind={kind}
      role={role}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={cn("rounded-lg border border-border p-6", className)}
    >
      <h2 className="text-base font-medium">
        {title ?? translate(language, defaultTitleKeys[kind])}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex min-h-11 items-center gap-2">{action}</div>}
    </section>
  );
}
