import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it } from "vite-plus/test";
import { Providers } from "@/app/providers";
import { createQueryClient, queryClient } from "@/app/query-client";
import { ApiError } from "@/lib/api/errors";
import { sessionStore } from "@/stores/session";

const apiError = (status: number | null, code: ConstructorParameters<typeof ApiError>[0]["code"]) =>
  new ApiError({ status, code, message: "x" });

describe("query retry predicate", () => {
  const retry = createQueryClient().getDefaultOptions().queries!.retry as (
    failureCount: number,
    error: Error,
  ) => boolean;

  it.each([401, 403, 404])("never retries %i (v8 ban risk)", (status) => {
    expect(retry(0, apiError(status, "http_error"))).toBe(false);
  });

  it("never retries aborted requests", () => {
    expect(retry(0, apiError(null, "aborted"))).toBe(false);
  });

  it.each([
    ["503", apiError(503, "http_error")],
    ["network", apiError(null, "network")],
    ["non-ApiError", new TypeError("boom")],
  ])("retries transient %s failures exactly once", (_name, error) => {
    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(false);
  });
});

describe("Providers connection revision wiring", () => {
  it("clears the query cache when connectionRevision changes, not otherwise", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(createElement(Providers, null, null)));

    queryClient.setQueryData(["config"], { a: 1 });
    await act(async () => sessionStore.setState({ remember: false }));
    expect(queryClient.getQueryData(["config"])).toEqual({ a: 1 });

    await act(async () =>
      sessionStore.setState({ connectionRevision: sessionStore.getState().connectionRevision + 1 }),
    );
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    await act(async () => root.unmount());
  });
});
