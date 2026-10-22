import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/stores/ui";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";

export function ConfirmDialog() {
  const confirm = useUiStore((state) => state.confirm);
  const language = usePreferencesStore((state) => state.language);
  const resolve = (accepted: boolean) => useUiStore.getState().resolveConfirm(accepted);
  const t = (key: string) => translate(language, key);
  if (!confirm) return null;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) resolve(false);
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById("confirm-cancel")?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{confirm.title}</DialogTitle>
          <DialogDescription>{confirm.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button id="confirm-cancel" variant="outline" onClick={() => resolve(false)}>
            {t("shell.cancel")}
          </Button>
          <Button
            variant={confirm.destructive ? "destructive" : "default"}
            onClick={() => resolve(true)}
          >
            {confirm.confirmLabel ?? t("feedback.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
