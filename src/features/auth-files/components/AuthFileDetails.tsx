import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import type { AuthFileView } from "../api";
import { useAuthFileModelsQuery } from "../queries";

interface AuthFileDetailsProps {
  file: AuthFileView;
  onClose: () => void;
}

/** Metadata and model count only; model entries are undocumented and never rendered. */
export function AuthFileDetails({ file, onClose }: AuthFileDetailsProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const models = useAuthFileModelsQuery(file.fileName);
  const rows: [string, string][] = [
    [t("authFiles.name"), file.name],
    [t("authFiles.provider"), file.provider],
    [t("authFiles.status"), file.status],
    [t("authFiles.source"), file.source],
    [t("authFiles.disabled"), String(file.disabled)],
    [t("authFiles.unavailable"), String(file.unavailable)],
    [t("authFiles.runtimeOnly"), String(file.runtimeOnly)],
  ];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("authFiles.detailsTitle")}</DialogTitle>
          <DialogDescription>{t("authFiles.detailsDescription")}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-all font-mono">{value}</dd>
            </div>
          ))}
          <dt className="text-muted-foreground">{t("authFiles.models")}</dt>
          <dd>
            {file.fileName === null
              ? t("authFiles.modelsUnavailable")
              : models.isPending
                ? t("authFiles.modelsLoading")
                : models.isError
                  ? t("authFiles.modelsError")
                  : String(models.data.length)}
          </dd>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
