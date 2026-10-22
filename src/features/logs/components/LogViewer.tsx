import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";
import type { LogPageView } from "../api";

interface LogViewerProps {
  batches: readonly LogPageView[];
  isPending: boolean;
  isError: boolean;
  search: string;
  showManagement: boolean;
}

export function LogViewer({
  batches,
  isPending,
  isError,
  search,
  showManagement,
}: LogViewerProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const lines = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return batches
      .flatMap((batch) => batch.lines)
      .filter((line) => showManagement || !/\b(?:management|admin)\b/i.test(line))
      .filter((line) => !normalizedSearch || line.toLowerCase().includes(normalizedSearch));
  }, [batches, search, showManagement]);

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <p role="alert">{t("logs.loadError")}</p>;
  if (lines.length === 0) return <p className="text-muted-foreground">{t("logs.empty")}</p>;
  return (
    <pre className="max-h-[32rem] overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-5">
      {lines.map((line, index) => (
        <code className="block whitespace-pre-wrap break-words" key={`${index}-${line}`}>
          {line}
        </code>
      ))}
    </pre>
  );
}
