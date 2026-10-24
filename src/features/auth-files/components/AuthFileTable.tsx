import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/components/workspace/ActionGroup";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import type { AuthFileView } from "../api";

interface AuthFileTableProps {
  files: readonly AuthFileView[];
  busy: boolean;
  onDetails: (file: AuthFileView) => void;
  onToggleDisabled: (file: AuthFileView) => void;
  onDownload: (file: AuthFileView) => void;
  onDelete: (file: AuthFileView) => void;
}

/**
 * Metadata rows with per-file actions. Actions need a `fileName`, so runtime-only and non-`.json`
 * entries stay read-only; the server remains the authority for every change.
 */
export function AuthFileTable({
  files,
  busy,
  onDetails,
  onToggleDisabled,
  onDownload,
  onDelete,
}: AuthFileTableProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-2 py-1.5 font-medium">{t("authFiles.name")}</th>
            <th className="px-2 py-1.5 font-medium">{t("authFiles.provider")}</th>
            <th className="px-2 py-1.5 font-medium">{t("authFiles.status")}</th>
            <th className="px-2 py-1.5 font-medium">{t("authFiles.source")}</th>
            <th className="px-2 py-1.5 font-medium">{t("authFiles.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const editable = file.fileName !== null && !busy;
            return (
              <tr key={file.id} className="border-b align-top last:border-0">
                <td className="px-2 py-1.5 font-mono break-all">{file.name}</td>
                <td className="px-2 py-1.5 font-mono">{file.provider}</td>
                <td className="px-2 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{file.status}</Badge>
                    {file.disabled && <Badge variant="outline">{t("authFiles.disabled")}</Badge>}
                    {file.unavailable && (
                      <Badge variant="outline">{t("authFiles.unavailable")}</Badge>
                    )}
                    {file.runtimeOnly && (
                      <Badge variant="outline">{t("authFiles.runtimeOnly")}</Badge>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5">{file.source}</td>
                <td className="px-2 py-1.5">
                  <div className="flex flex-wrap gap-2">
                    <ActionGroup>
                      <Button variant="outline" size="sm" onClick={() => onDetails(file)}>
                        {t("authFiles.details")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`${file.disabled ? t("authFiles.enable") : t("authFiles.disable")}: ${file.name}`}
                        disabled={!editable}
                        onClick={() => onToggleDisabled(file)}
                      >
                        {file.disabled ? t("authFiles.enable") : t("authFiles.disable")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`${t("authFiles.download")}: ${file.name}`}
                        disabled={!editable}
                        onClick={() => onDownload(file)}
                      >
                        {t("authFiles.download")}
                      </Button>
                    </ActionGroup>
                    <ActionGroup destructive>
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`${t("authFiles.delete")}: ${file.name}`}
                        disabled={!editable}
                        onClick={() => onDelete(file)}
                      >
                        {t("authFiles.delete")}
                      </Button>
                    </ActionGroup>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
