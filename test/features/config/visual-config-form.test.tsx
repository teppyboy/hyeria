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
        <VisualConfigForm text={text} onChange={() => undefined} />
      </Providers>,
    ),
  );
  return host;
}

describe("visual config form", () => {
  it("keeps the existing route-compatible optional callback while rendering the controlled editor", () => {
    const host = render(configYaml);

    expect(host.querySelector('[data-testid="config-visual-editor"]')).not.toBeNull();
    expect([...host.querySelectorAll("[role=tab]")].map((tab) => tab.textContent)).toEqual([
      "General",
      "Requests",
      "Routing",
      "Observability",
      "Plugins",
      "Advanced YAML",
    ]);
  });

  it("never renders secret values or secret-bearing section names", () => {
    const host = render(configYaml);

    expect(host.textContent).not.toMatch(/client-key|turn\.example|oauth|management-key/);
  });

  it("keeps the raw YAML fallback prominent", () => {
    const host = render(configYaml);
    const rawLinks = [...host.querySelectorAll("button")].filter(
      (button) => button.textContent === "Go to the raw YAML editor",
    );

    expect(rawLinks.length).toBeGreaterThan(0);
    expect(rawLinks[0]?.className).toContain("min-h-11");
  });

  it("keeps raw fallback available while YAML is invalid", () => {
    const host = render("port: [");

    expect(host.textContent).toContain("Visual editing is unavailable while the YAML is invalid.");
    expect(host.textContent).toContain("Go to the raw YAML editor");
  });
});
