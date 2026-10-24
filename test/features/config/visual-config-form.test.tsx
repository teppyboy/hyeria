import { afterEach, describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Providers } from "../../../src/app/providers";
import { VisualConfigForm } from "../../../src/features/config/components/VisualConfigForm";
import configYaml from "../../fixtures/v8/config.yaml?raw";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

function render(text: string) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <Providers>
        <VisualConfigForm text={text} />
      </Providers>,
    ),
  );
  return host;
}

describe("visual config form", () => {
  it("lists only known non-secret top-level sections present in the document", () => {
    const host = render(configYaml);
    const items = [...host.querySelectorAll("li")].map((item) => item.textContent);

    expect(items).toEqual(["management", "requests", "routing", "plugins"]);
  });

  it("never renders section values or secret-bearing section names", () => {
    const host = render(configYaml);

    expect(host.textContent).not.toMatch(/example|turn\.|client-key|round-robin|access|oauth/);
  });

  it("states that visual editing is unavailable and links to the raw YAML", () => {
    const host = render(configYaml);

    expect(host.textContent).toContain(
      "Visual editing is not available yet. This is a read-only summary of non-secret sections; edit the raw YAML instead.",
    );
    const rawLink = host.querySelector("a");
    expect(rawLink?.getAttribute("href")).toBe("#config-raw-yaml");
    expect(rawLink?.className).toContain("min-h-11");
  });

  it("shows only the unavailable copy when the draft is not a parseable mapping", () => {
    const host = render("port: [");

    expect(host.querySelectorAll("li")).toHaveLength(0);
    expect(host.textContent).toContain("Visual editing is not available yet.");
  });
});
