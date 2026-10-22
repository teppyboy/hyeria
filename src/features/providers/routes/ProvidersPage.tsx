import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderTable } from "@/features/providers/components/ProviderTable";
import { useProviderGroupsQuery } from "@/features/providers/queries";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

export function ProvidersPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const groups = useProviderGroupsQuery();

  return (
    <section className="mx-auto grid max-w-5xl gap-4">
      <h1 className="text-2xl font-semibold">{t("nav.providers")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("providers.groups")}</CardTitle>
          <CardDescription>{t("providers.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {groups.isPending && (
            <div className="space-y-2">
              <p className="text-muted-foreground">{t("providers.loading")}</p>
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {groups.isError && <p role="alert">{t("providers.loadError")}</p>}
          {groups.isSuccess && groups.data.length === 0 && (
            <p className="text-muted-foreground">{t("providers.empty")}</p>
          )}
          {groups.isSuccess && groups.data.length > 0 && <ProviderTable groups={groups.data} />}
          {groups.isSuccess && (
            <div className="space-y-2 text-sm">
              <p>{t("providers.deferred")}</p>
              <Link className="underline" to="/config">
                {t("providers.rawLink")}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
