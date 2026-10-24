import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WorkspaceHeaderProps {
  title: string;
  description?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function WorkspaceHeader({
  title,
  description,
  status,
  actions,
  children,
  className,
}: WorkspaceHeaderProps) {
  return (
    <header
      data-slot="workspace-header"
      className={cn("mb-6 flex flex-wrap items-start gap-4", className)}
    >
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
        {status && (
          <div data-slot="workspace-status" className="mt-3 flex flex-wrap items-center gap-2">
            {status}
          </div>
        )}
        {children}
      </div>
      <div
        data-slot="workspace-actions"
        className="flex min-h-11 w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end"
      >
        {actions}
      </div>
    </header>
  );
}
