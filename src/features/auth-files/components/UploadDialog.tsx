import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import { useUiStore } from "@/stores/ui";
import { useUploadAuthFileMutation } from "../queries";
import { authFileNameSchema } from "../schemas";

interface UploadDialogProps {
  onClose: () => void;
}

/** Uploads one `.json` file as multipart; the name is validated before the request is sent. */
export function UploadDialog({ onClose }: UploadDialogProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const upload = useUploadAuthFileMutation();
  const [file, setFile] = useState<File | null>(null);
  const [invalidName, setInvalidName] = useState(false);

  function submit() {
    if (!file) return;
    if (!authFileNameSchema.safeParse(file.name).success) {
      setInvalidName(true);
      return;
    }
    upload.mutate(file, {
      onSuccess: () => {
        useUiStore.getState().notify(t("authFiles.uploaded"));
        onClose();
      },
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("authFiles.uploadTitle")}</DialogTitle>
          <DialogDescription>{t("authFiles.uploadDescription")}</DialogDescription>
        </DialogHeader>
        <Input
          type="file"
          accept=".json,application/json"
          aria-label={t("authFiles.uploadFile")}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setInvalidName(false);
            upload.reset();
          }}
        />
        {invalidName && <p role="alert">{t("authFiles.invalidName")}</p>}
        {upload.isError && <p role="alert">{t("authFiles.actionError")}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("shell.cancel")}
          </Button>
          <Button onClick={submit} disabled={!file || upload.isPending}>
            {t("authFiles.upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
