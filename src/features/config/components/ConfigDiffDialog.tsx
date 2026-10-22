import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConfigChange, ConfigDiff } from "@/lib/config/diff";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

interface ConfigDiffDialogProps {
  diff: ConfigDiff;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Lists the redacted changes a raw YAML save would write; the caller decides when to open it. */
export function ConfigDiffDialog({ diff, pending, onConfirm, onCancel }: ConfigDiffDialogProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("config.diffTitle")}</DialogTitle>
          <DialogDescription>{t("config.diffDescription")}</DialogDescription>
        </DialogHeader>
        {diff.changes.length === 0 ? (
          <p>{t("config.diffEmpty")}</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-auto text-sm">
            {diff.changes.map((change) => (
              <li key={change.path.join(".")}>
                <ChangeLine change={change} t={t} />
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("shell.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {t("config.diffConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeLine({ change, t }: { change: ConfigChange; t: (key: string) => string }) {
  const path = <code className="font-mono">{change.path.join(".")}</code>;
  if (change.kind === "added")
    return (
      <p>
        {t("config.diffAdded")} {path}: <code className="font-mono">{change.after}</code>
      </p>
    );
  if (change.kind === "removed")
    return (
      <p>
        {t("config.diffRemoved")} {path}: <code className="font-mono">{change.before}</code>
      </p>
    );
  return (
    <p>
      {t("config.diffChanged")} {path}: <code className="font-mono">{change.before}</code>
      {" → "}
      <code className="font-mono">{change.after}</code>
    </p>
  );
}
