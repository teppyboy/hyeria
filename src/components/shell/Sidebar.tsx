import { NavLink } from "react-router";
import { useSessionStore } from "@/stores/session";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";

const groups = [
  [
    "nav.operate",
    [
      ["nav.dashboard", "/", false],
      ["nav.quickStart", "/quick-start", false],
    ],
  ],
  [
    "nav.gateway",
    [
      ["nav.providers", "/ai-providers", false],
      ["nav.authFiles", "/auth-files", false],
      ["nav.oauth", "/oauth", false],
    ],
  ],
  [
    "nav.observe",
    [
      ["nav.quota", "/quota", false],
      ["nav.logs", "/logs", false],
    ],
  ],
  [
    "nav.control",
    [
      ["nav.config", "/config", false],
      ["nav.plugins", "/plugins", true],
      ["nav.pluginStore", "/plugin-store", true],
      ["nav.system", "/system", false],
    ],
  ],
  ["nav.analytics", [["nav.analytics", "/analytics", false]]],
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const language = usePreferencesStore((state) => state.language);
  const supportsPlugins = useSessionStore((state) => state.capabilities.supportsPlugins);
  const t = (key: string) => translate(language, key);
  return (
    <nav aria-label={t("nav.mainLabel")} className="space-y-5">
      {groups.map(([group, links]) => (
        <section key={group} aria-labelledby={`group-${group}`}>
          <h2
            id={`group-${group}`}
            className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t(group)}
          </h2>
          <ul className="space-y-1">
            {links.map(([label, to, plugin]) => (
              <li key={to}>
                {plugin && supportsPlugins === false ? (
                  <span
                    aria-disabled="true"
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground"
                  >
                    {t(label)} — {t("nav.pluginUnsupported")}
                  </span>
                ) : (
                  <NavLink
                    to={to}
                    end={to === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `block rounded-md px-2 py-1.5 text-sm hover:bg-accent ${isActive ? "bg-accent font-medium" : "text-muted-foreground"}`
                    }
                  >
                    {t(label)}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("nav.pluginPages")}
        </h2>
        <p className="px-2 py-1 text-sm text-muted-foreground">{t("nav.pluginPagesAvailable")}</p>
      </section>
    </nav>
  );
}
