import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import {
  deleteAllAuthFiles,
  deleteAuthFile,
  downloadAuthFile,
  listAuthFiles,
  uploadAuthFileMultipart,
  uploadAuthFileRaw,
  safeDownloadFilename,
} from "../../../src/features/auth-files/api";
import listFixture from "../../fixtures/v8/credentials-list.json";
import deleteAllFixture from "../../fixtures/v8/credentials-delete-all.json";

const SECRET = "sk-live-do-not-leak-123";

function recordingClient(response: () => Response) {
  const fetchImpl = vi.fn(async (_input: URL, _init?: RequestInit) => response());
  const client = new ManagementApiClient({
    apiBase: "http://cpa.example.invalid",
    managementKey: "mk",
    revision: 1,
    getCurrentRevision: () => 1,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, fetchImpl };
}

function sentRequest(fetchImpl: ReturnType<typeof vi.fn>, call = 0) {
  const [input, init] = fetchImpl.mock.calls[call] as unknown as [URL, RequestInit];
  return {
    path: new URL(input).pathname,
    search: new URL(input).search,
    method: init.method,
    body: init.body,
    headers: new Headers(init.headers),
  };
}

const json = (body: unknown) => () => new Response(JSON.stringify(body));

describe("auth-files list", () => {
  it("normalizes metadata rows and drops backend-specific fields", async () => {
    const withExtra = {
      files: [{ ...listFixture.files[0], access_token: SECRET, email: "x@example.invalid" }],
    };
    const { client, fetchImpl } = recordingClient(json(withExtra));
    const files = await listAuthFiles(client);
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "GET",
      path: "/v8/management/credentials",
    });
    expect(files).toEqual([
      {
        id: "user@example.invalid",
        authIndex: "a1b2c3d4e5f67890",
        name: "user@example.invalid",
        provider: "claude",
        status: "ready",
        disabled: false,
        unavailable: false,
        runtimeOnly: false,
        source: "file",
      },
    ]);
    expect(JSON.stringify(files)).not.toContain(SECRET);
  });

  it("keeps runtime-only records as read-only metadata", async () => {
    const { client } = recordingClient(json(listFixture));
    const files = await listAuthFiles(client);
    expect(files[1]).toMatchObject({
      name: "runtime-example",
      runtimeOnly: true,
      source: "memory",
    });
  });

  it("rejects a malformed list response", async () => {
    const { client } = recordingClient(json({ files: [{ name: "a.json" }] }));
    await expect(listAuthFiles(client)).rejects.toMatchObject({ code: "invalid_response" });
  });
});

describe("auth-files upload", () => {
  it("sends raw JSON with the validated name in the query", async () => {
    const { client, fetchImpl } = recordingClient(json({ status: "ok" }));
    await uploadAuthFileRaw(client, "user.json", '{"type":"claude"}');
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({
      method: "POST",
      search: "?name=user.json",
      body: '{"type":"claude"}',
    });
    expect(sent.headers.get("Content-Type")).toBe("application/json");
  });

  it("sends multipart with field file and the validated filename", async () => {
    const { client, fetchImpl } = recordingClient(json({ status: "ok" }));
    await uploadAuthFileMultipart(client, "user.json", new Blob(['{"type":"claude"}']));
    const body = sentRequest(fetchImpl).body as FormData;
    expect(body).toBeInstanceOf(FormData);
    const file = body.get("file") as File;
    expect(file.name).toBe("user.json");
  });

  it("rejects an unsafe name before any request", async () => {
    const { client, fetchImpl } = recordingClient(json({ status: "ok" }));
    await expect(uploadAuthFileRaw(client, "../x.json", "{}")).rejects.toThrow(TypeError);
    await expect(uploadAuthFileMultipart(client, "a b.json", new Blob(["{}"]))).rejects.toThrow(
      TypeError,
    );
    await expect(uploadAuthFileRaw(client, "x.txt", "{}")).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("auth-files delete", () => {
  it("deletes one file by name", async () => {
    const { client, fetchImpl } = recordingClient(() => new Response(""));
    await deleteAuthFile(client, "user.json");
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "DELETE",
      search: "?name=user.json",
    });
  });

  it("deletes all and returns the count", async () => {
    const { client, fetchImpl } = recordingClient(json(deleteAllFixture));
    await expect(deleteAllAuthFiles(client)).resolves.toBe(3);
    expect(sentRequest(fetchImpl)).toMatchObject({ method: "DELETE", search: "?all=true" });
  });

  it("rejects an unsafe delete name before any request", async () => {
    const { client, fetchImpl } = recordingClient(() => new Response(""));
    await expect(deleteAuthFile(client, "/etc/passwd.json")).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("auth-files download", () => {
  it("fetches the blob by validated name and returns a sanitized save name", async () => {
    const { client, fetchImpl } = recordingClient(() => new Response("{}"));
    const { blob, filename } = await downloadAuthFile(client, "user@example.invalid.json");
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "GET",
      path: "/v8/management/credentials/download",
      search: "?name=user%40example.invalid.json",
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toBe("user@example.invalid.json");
  });

  it("sanitizes unsafe save names to a leaf .json name", () => {
    expect(safeDownloadFilename("../../etc/passwd")).toBe("passwd.json");
    expect(safeDownloadFilename("..hidden")).toBe("hidden.json");
    expect(safeDownloadFilename("a b;c.json")).toBe("a_b_c.json");
    expect(safeDownloadFilename("...")).toBe("credential.json");
  });
});
