import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "default" | "success" | "warning" | "destructive" | "info";

export interface StatusCellProps {
  label: ReactNode;
  value: ReactNode;
  tone?: StatusTone;
  detail?: ReactNode;
  className?: string;
}

const toneClasses: Record<StatusTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

export function StatusCell({ label, value, tone = "default", detail, className }: StatusCellProps) {
  return (
    <dl
      data-slot="status-cell"
      data-tone={tone}
      className={cn("min-w-0 space-y-1", toneClasses[tone], className)}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono text-sm font-medium", toneClasses[tone])}>{value}</dd>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </dl>
  );
}
