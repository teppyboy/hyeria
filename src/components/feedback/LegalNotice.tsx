import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";
import packageJson from "../../../package.json";

/** Canonical Hyeria repository linked from the About notice. */
export const SOURCE_URL = "https://github.com/teppyboy/hyeria";
export const APP_VERSION = packageJson.version;

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
      <DialogContent
        closeLabel={t("common.close")}
        className="max-h-[calc(100dvh-2rem)] overflow-hidden motion-reduce:animate-none motion-reduce:transition-none"
      >
        <DialogHeader>
          <DialogTitle>{t("legal.title")}</DialogTitle>
          <DialogDescription>{t("legal.independent")}</DialogDescription>
        </DialogHeader>
        <div
          data-legal-scroll="true"
          className="min-h-0 space-y-5 overflow-y-auto overscroll-contain pr-1 text-sm"
        >
          <section aria-labelledby="legal-identity">
            <h2 id="legal-identity" className="mb-1 text-sm font-semibold">
              {t("legal.sectionIdentity")}
            </h2>
            <p>{t("legal.copyright")}</p>
            <p className="mt-2">
              {t("legal.version")}: {APP_VERSION}
            </p>
          </section>
          <section aria-labelledby="legal-license">
            <h2 id="legal-license" className="mb-1 text-sm font-semibold">
              {t("legal.sectionLicense")}
            </h2>
            <p>{t("legal.license")}</p>
          </section>
          <section aria-labelledby="legal-repository">
            <h2 id="legal-repository" className="mb-1 text-sm font-semibold">
              {t("legal.sectionRepository")}
            </h2>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="break-words underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("legal.sourceLink")}
            </a>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
