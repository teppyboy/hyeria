import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Providers } from "../../../src/app/providers";
import { ConfigDiffDialog } from "../../../src/features/config/components/ConfigDiffDialog";
import { buildConfigDiff } from "../../../src/lib/config/diff";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("config diff dialog", () => {
  it("renders a dotted key and a nested key at the same time without a duplicate-key warning", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    // `a.b` and `a` -> `b` join to the same dotted text, so the key must come from the path array.
    const diff = buildConfigDiff("a.b: 1\na:\n  b: 1\n", "a.b: 2\na:\n  b: 2\n");
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    act(() =>
      root?.render(
        <Providers>
          <ConfigDiffDialog diff={diff} pending={false} onConfirm={() => {}} onCancel={() => {}} />
        </Providers>,
      ),
    );

    expect(diff.changes).toHaveLength(2);
    const duplicateKeyWarnings = errors.mock.calls.filter((call) =>
      String(call[0]).includes("same key"),
    );
    expect(duplicateKeyWarnings).toHaveLength(0);
  });
});
