import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ActionGroupProps {
  children: ReactNode;
  destructive?: boolean;
  className?: string;
}

export function ActionGroup({ children, destructive = false, className }: ActionGroupProps) {
  return (
    <div
      data-slot="action-group"
      data-destructive={destructive ? "true" : "false"}
      role="group"
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-2",
        destructive && "border-l-2 border-destructive pl-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
