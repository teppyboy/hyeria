import { describe, expect, it } from "vite-plus/test";
import { ApiError, apiErrorFromResponse, redactSensitive } from "@/lib/api/errors";
import missingKey from "../../fixtures/v8/error-missing-management-key.json";
import readOnly from "../../fixtures/v8/error-read-only-field.json";
import invalidConfig from "../../fixtures/v8/error-invalid-config.json";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("apiErrorFromResponse", () => {
  it.each([
    [400, "bad_request"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [422, "validation"],
    [502, "upstream"],
    [503, "unavailable"],
    [500, "server"],
    [418, "http_error"],
  ])("maps status %i to %s", async (status, code) => {
    const error = await apiErrorFromResponse(new Response("", { status }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
  });

  it("keeps 401 and 403 distinct", async () => {
    const a = await apiErrorFromResponse(json(401, missingKey));
    const b = await apiErrorFromResponse(json(403, { error: "remote management disabled" }));
    expect([a.code, b.code]).toEqual(["unauthorized", "forbidden"]);
    expect(b.apiCode).toBe("remote management disabled");
  });

  it("extracts allowlisted fields from fixture JSON errors", async () => {
    const ro = await apiErrorFromResponse(json(400, readOnly));
    expect(ro.apiCode).toBe("read_only_field");
    expect(ro.details).toEqual({ field: (readOnly as { field: string }).field });
    const ic = await apiErrorFromResponse(json(422, invalidConfig));
    expect(ic.apiCode).toBe("invalid_config");
    expect(ic.message).toBe((invalidConfig as { message: string }).message);
  });

  it("does not echo text bodies, HTML or unknown JSON keys", async () => {
    const text = await apiErrorFromResponse(
      new Response("<html>token=abc123 stack trace</html>", { status: 500 }),
    );
    expect(text.message).not.toContain("abc123");
    expect(text.apiCode).toBeNull();
    const extra = await apiErrorFromResponse(
      json(400, { error: "invalid_body", headers: { authorization: "x" }, trace: "t" }),
    );
    expect(extra.details).toEqual({});
  });

  it("rejects non-identifier error values and redacts credentials in messages", async () => {
    const weird = await apiErrorFromResponse(json(400, { error: "sk-abcdefghijkl\nsecret" }));
    expect(weird.apiCode).toBeNull();
    const redacted = await apiErrorFromResponse(
      json(422, {
        error: "invalid_config",
        message: "bad api-key: sk-abcdefghij1234 and mgmt-key-value Bearer abc.def",
      }),
      ["mgmt-key-value"],
    );
    expect(redacted.message).not.toMatch(/sk-abcdefghij1234|mgmt-key-value|abc\.def/);
  });
});

describe("redactSensitive", () => {
  it("redacts credential-shaped values", () => {
    expect(redactSensitive('{"api_key":"abcd1234"} ?code=zzz&x=1')).toBe(
      '{"api_key":"[redacted]"} ?code=[redacted]&x=1',
    );
    expect(redactSensitive("eyJhbGciOiJI.eyJzdWIiOiIx.sig")).toBe("[redacted]");
  });
});
