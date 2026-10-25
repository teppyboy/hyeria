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
          </section>
          <section aria-labelledby="legal-license">
            <h2 id="legal-license" className="mb-1 text-sm font-semibold">
              {t("legal.sectionLicense")}
            </h2>
            <p>{t("legal.license")}</p>
            <p className="mt-2">
              {t("legal.source")}{" "}
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("legal.sourceLink")}
              </a>
            </p>
          </section>
          <section aria-labelledby="legal-network">
            <h2 id="legal-network" className="mb-1 text-sm font-semibold">
              {t("legal.sectionNetwork")}
            </h2>
            <p>{t("legal.network")}</p>
          </section>
          <section aria-labelledby="legal-build">
            <h2 id="legal-build" className="mb-1 text-sm font-semibold">
              {t("legal.sectionBuild")}
            </h2>
            <p>{t("legal.build")}</p>
          </section>
          <section aria-labelledby="legal-warranty">
            <h2 id="legal-warranty" className="mb-1 text-sm font-semibold">
              {t("legal.sectionWarranty")}
            </h2>
            <p>{t("legal.warranty")}</p>
          </section>
          <section aria-labelledby="legal-branding">
            <h2 id="legal-branding" className="mb-1 text-sm font-semibold">
              {t("legal.sectionBranding")}
            </h2>
            <p>{t("legal.logo")}</p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
