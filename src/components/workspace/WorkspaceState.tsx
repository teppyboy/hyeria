import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type WorkspaceStateKind = "loading" | "empty" | "error" | "success" | "unavailable";

export interface WorkspaceStateProps {
  kind: WorkspaceStateKind;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const defaultTitles: Record<WorkspaceStateKind, string> = {
  loading: "Loading",
  empty: "Nothing to show",
  error: "Something went wrong",
  success: "Complete",
  unavailable: "Unavailable",
};

export function WorkspaceState({
  kind,
  title,
  description,
  action,
  className,
}: WorkspaceStateProps) {
  const role = kind === "error" ? "alert" : "status";
  return (
    <section
      data-slot="workspace-state"
      data-kind={kind}
      role={role}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={cn("rounded-lg border border-border p-6", className)}
    >
      <h2 className="text-base font-medium">{title ?? defaultTitles[kind]}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex min-h-11 items-center gap-2">{action}</div>}
    </section>
  );
}
