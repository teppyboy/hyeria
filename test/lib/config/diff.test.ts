import { describe, expect, it } from "vite-plus/test";
import { buildConfigDiff } from "../../../src/lib/config/diff";

describe("buildConfigDiff", () => {
  it("reports no changes for identical documents", () => {
    const yaml = "port: 8317\nproviders:\n  - openai\n";

    expect(buildConfigDiff(yaml, yaml)).toEqual({ changes: [] });
  });

  it("ignores mapping key ordering at any depth", () => {
    const before = "a: 1\nnested:\n  x: 1\n  y: 2\nlist:\n  - {p: 1, q: 2}\n";
    const after = "nested:\n  y: 2\n  x: 1\nlist:\n  - {q: 2, p: 1}\na: 1\n";

    expect(buildConfigDiff(before, after)).toEqual({ changes: [] });
  });

  it("reports added, removed, and changed scalar paths", () => {
    const before = "port: 8317\nold-field: true\nnested:\n  mode: fast\n";
    const after = "port: 8318\nnew-field: 1\nnested:\n  mode: slow\n";

    expect(buildConfigDiff(before, after).changes).toEqual([
      { path: ["nested", "mode"], kind: "changed", before: '"fast"', after: '"slow"' },
      { path: ["new-field"], kind: "added", after: "1" },
      { path: ["old-field"], kind: "removed", before: "true" },
      { path: ["port"], kind: "changed", before: "8317", after: "8318" },
    ]);
  });

  it("treats a list as one value whose change is reported at the list path", () => {
    const before = "routing:\n  channels:\n    - a\n    - b\n";
    const after = "routing:\n  channels:\n    - a\n    - c\n";

    expect(buildConfigDiff(before, after).changes).toEqual([
      {
        path: ["routing", "channels"],
        kind: "changed",
        before: '["a","b"]',
        after: '["a","c"]',
      },
    ]);
  });

  it("treats list reordering as a change", () => {
    expect(buildConfigDiff("items:\n  - a\n  - b\n", "items:\n  - b\n  - a\n").changes).toEqual([
      { path: ["items"], kind: "changed", before: '["a","b"]', after: '["b","a"]' },
    ]);
  });

  it("reports a mapping replaced by a scalar as one changed path", () => {
    expect(buildConfigDiff("mode:\n  name: x\n", "mode: off\n").changes).toEqual([
      { path: ["mode"], kind: "changed", before: '{"name":"x"}', after: '"off"' },
    ]);
  });

  it("throws the fixed YAML rejection message without echoing the source", () => {
    const malformed = new Error("YAML is malformed.");

    expect(() => buildConfigDiff("secret: sk-live-123\nbad: [\n", "port: 1\n")).toThrow(malformed);
    expect(() => buildConfigDiff("port: 1\n", "secret: sk-live-123\nbad: [\n")).toThrow(malformed);
  });

  it("masks sensitive key values in added, removed, and changed changes", () => {
    const before = "api-keys:\n  - sk-old-111\nmanagement:\n  secret-key: hunter2\n";
    const after = "api-keys:\n  - sk-new-222\nlogin:\n  password: pa55word\n";
    const diff = buildConfigDiff(before, after);
    const rendered = JSON.stringify(diff);

    expect(diff.changes).toEqual([
      { path: ["api-keys"], kind: "changed", before: '"[redacted]"', after: '"[redacted]"' },
      { path: ["login"], kind: "added", after: '{"password":"[redacted]"}' },
      { path: ["management"], kind: "removed", before: '{"secret-key":"[redacted]"}' },
    ]);
    expect(rendered).not.toMatch(/sk-old|sk-new|hunter2|pa55word/);
  });

  it.each([
    ["access-token", "tok-123"],
    ["credential", "cred-456"],
    ["authorization", "Bearer abc"],
    ["client_secret", "shh-789"],
    ["openai-api-key", "key-000"],
  ])("masks the %s key", (key, secret) => {
    const diff = buildConfigDiff("x: 1\n", `x: 1\nauth:\n  ${key}: ${secret}\n`);

    expect(JSON.stringify(diff)).not.toContain(secret);
    expect(JSON.stringify(diff)).toContain("[redacted]");
  });

  it("masks userinfo in proxy URLs while keeping the host", () => {
    const diff = buildConfigDiff("x: 1\n", "x: 1\nproxy-url: http://user:pa55@proxy.local:8080\n");

    expect(diff.changes).toEqual([
      { path: ["proxy-url"], kind: "added", after: '"http://[redacted]@proxy.local:8080"' },
    ]);
  });

  it("masks a changed leaf under a sensitive ancestor key", () => {
    const diff = buildConfigDiff("credentials:\n  user: alice\n", "credentials:\n  user: bob\n");

    expect(JSON.stringify(diff)).not.toMatch(/alice|bob/);
    expect(diff.changes).toEqual([
      {
        path: ["credentials", "user"],
        kind: "changed",
        before: '"[redacted]"',
        after: '"[redacted]"',
      },
    ]);
  });

  it("keeps non-sensitive values readable", () => {
    expect(buildConfigDiff("port: 1\n", "port: 2\n").changes).toEqual([
      { path: ["port"], kind: "changed", before: "1", after: "2" },
    ]);
  });
});
