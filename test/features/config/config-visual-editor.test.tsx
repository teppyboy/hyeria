import { afterEach, describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Providers } from "../../../src/app/providers";
import { ConfigVisualEditor } from "../../../src/features/config/editor/ConfigVisualEditor";
import { SettingRow } from "../../../src/features/config/editor/SettingRow";
import { SAFE_CONFIG_FIELDS } from "../../../src/features/config/editor/registry";
import configYaml from "../../fixtures/v8/config.yaml?raw";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

function render(text: string, onChange: (yaml: string) => void) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <Providers>
        <ConfigVisualEditor text={text} onChange={onChange} />
      </Providers>,
    ),
  );
  return host;
}

function sectionButton(host: HTMLElement, label: string) {
  return [...host.querySelectorAll<HTMLButtonElement>("[role=tab]")].find(
    (button) => button.textContent === label,
  );
}

describe("config visual editor", () => {
  it("shows section navigation, unset states, and only safe controls", () => {
    const host = render(configYaml, () => undefined);

    expect(host.querySelectorAll("[role=tab]")).toHaveLength(6);
    expect(host.textContent).toContain("Allow remote management");
    act(() => sectionButton(host, "Observability")?.click());
    expect(host.textContent).toContain("Unset; no default is applied.");
    expect(host.textContent).not.toMatch(/access|oauth|client-key|turn\.example|secret/);
  });

  it("associates every visible control with its description and validation target", () => {
    const host = render(configYaml, () => undefined);
    const controls = [...host.querySelectorAll<HTMLElement>("input, select")];

    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      const describedBy = control.getAttribute("aria-describedby")?.split(" ") ?? [];
      expect(describedBy.length).toBeGreaterThan(0);
      for (const id of describedBy) expect(host.ownerDocument.getElementById(id)).not.toBeNull();
    }
  });

  it("associates validation errors with the control when present", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <Providers>
          <SettingRow
            field={SAFE_CONFIG_FIELDS[0]}
            value={false}
            error="Invalid setting"
            onChange={() => undefined}
          />
        </Providers>,
      ),
    );

    const control = host.querySelector<HTMLElement>("input");
    const describedBy = control?.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(describedBy).toHaveLength(2);
    expect(describedBy.map((id) => host.ownerDocument.getElementById(id)?.textContent)).toEqual([
      "Allow management requests from remote clients.",
      "Invalid setting",
    ]);
  });

  it("patches a safe value while preserving unknown and secret document data", () => {
    let candidate = "";
    const host = render(configYaml, (yaml) => {
      candidate = yaml;
    });
    const control = host.querySelector<HTMLInputElement>("input[type=checkbox]");
    expect(control).not.toBeNull();

    act(() => {
      if (!control) throw new Error("safe checkbox was not rendered");
      control.click();
    });

    expect(candidate).toContain("allow-remote: true");
    expect(candidate).toContain("client-key-example-1");
    expect(candidate).toContain("turn:turn.example.invalid:3478");
  });

  it("renders existing plugin rows and keeps secret values out of advanced navigation", () => {
    const host = render(configYaml, () => undefined);
    act(() => sectionButton(host, "Plugins")?.click());

    expect(host.textContent).toContain("example-plugin");
    expect(host.textContent).toContain("Plugin priority");
    expect(host.textContent).not.toContain("client-key-example-1");

    act(() => sectionButton(host, "Advanced YAML")?.click());
    expect(host.textContent).toContain("Unsupported and sensitive settings remain available");
    expect(host.textContent).not.toContain("client-key-example-1");
  });
});
