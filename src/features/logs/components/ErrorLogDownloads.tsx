import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";
import type { ErrorLogFileView } from "../api";

interface ErrorLogDownloadsProps {
  files: readonly ErrorLogFileView[] | undefined;
  isPending: boolean;
  isError: boolean;
  busy: boolean;
  onDownload: (name: string) => void;
}

export function ErrorLogDownloads({
  files,
  isPending,
  isError,
  busy,
  onDownload,
}: ErrorLogDownloadsProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  return (
    <div className="space-y-2">
      {isPending && <Skeleton className="h-10 w-full" />}
      {isError && <p role="alert">{t("logs.errorFilesError")}</p>}
      {!isPending && !isError && files?.length === 0 && (
        <p className="text-muted-foreground">{t("logs.errorFilesEmpty")}</p>
      )}
      {files?.map((file) => (
        <div
          key={file.name}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
        >
          <span className="font-mono break-all">{file.name}</span>
          {file.downloadable && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onDownload(file.name)}
            >
              {t("logs.download")}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
