import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";

/** Canonical source for AGPLv3 section 13; shown in the notice so deployed users can reach it. */
export const SOURCE_URL = "https://github.com/teppyboy/hyeria";

export function LegalNotice({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("legal.title")}</DialogTitle>
          <DialogDescription>{t("legal.independent")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>{t("legal.copyright")}</p>
          <p>{t("legal.license")}</p>
          <p>{t("legal.network")}</p>
          <p>{t("legal.warranty")}</p>
          <p>
            {t("legal.source")}{" "}
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline"
            >
              {SOURCE_URL}
            </a>
          </p>
          <p>{t("legal.build")}</p>
          <p>{t("legal.logo")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
