import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import {
  clearLogs,
  consumeUsageQueue,
  downloadErrorLog,
  fetchLogPage,
  listErrorLogs,
} from "../../../src/features/logs/api";
import logsFixture from "../../fixtures/v8/logs.json";
import cursorResetFixture from "../../fixtures/v8/logs-cursor-reset.json";
import clearFixture from "../../fixtures/v8/logs-clear.json";
import errorLogsFixture from "../../fixtures/v8/request-error-logs.json";
import loggingDisabledFixture from "../../fixtures/v8/error-logging-disabled.json";
import usageQueueEmptyFixture from "../../fixtures/v8/usage-queue-empty.json";

const SECRET = "sk-live-do-not-leak-123";

function recordingClient(response: () => Response | Promise<Response>) {
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
  };
}

// jsdom's Blob has no text(); FileReader is the portable read here.
function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status });

describe("log page", () => {
  it("fetches the newest lines when only a limit is given", async () => {
    const { client, fetchImpl } = recordingClient(json(logsFixture));
    const page = await fetchLogPage(client, { limit: 100 });
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "GET",
      path: "/v8/management/observability/logs",
      search: "?limit=100",
    });
    expect(page).toEqual({
      lines: ["2026-05-05 12:00:00 info request accepted"],
      lineCount: 1,
      latestTimestamp: 1777982400,
      nextCursor: "example-opaque-cursor",
      cursorReset: false,
    });
  });

  it("sends after and cursor for incremental batches", async () => {
    const { client, fetchImpl } = recordingClient(json(logsFixture));
    await fetchLogPage(client, { after: 1777982000, cursor: "example-opaque-cursor" });
    expect(sentRequest(fetchImpl).search).toBe("?after=1777982000&cursor=example-opaque-cursor");
  });

  it("reports a cursor reset so the caller can drop its cursor state", async () => {
    const { client } = recordingClient(json(cursorResetFixture));
    const page = await fetchLogPage(client, { cursor: "stale" });
    expect(page.cursorReset).toBe(true);
    expect(page.lines).toEqual([]);
    expect(page.nextCursor).toBe("example-opaque-cursor-2");
  });

  it("returns an empty page when the log file is missing", async () => {
    const { client } = recordingClient(
      json({ lines: [], "line-count": 0, "latest-timestamp": 0, "next-cursor": "c0" }),
    );
    await expect(fetchLogPage(client, {})).resolves.toMatchObject({ lines: [], lineCount: 0 });
  });

  it("redacts credential-shaped lines before they reach the view", async () => {
    const body = {
      lines: [`token=${SECRET} ok`, `Authorization: Bearer ${SECRET}`],
      "line-count": 2,
      "latest-timestamp": 1,
      "next-cursor": "c",
    };
    const { client } = recordingClient(json(body));
    const page = await fetchLogPage(client, {});
    expect(JSON.stringify(page)).not.toContain(SECRET);
  });

  it("surfaces logging-disabled 400 with its API code", async () => {
    const { client } = recordingClient(json(loggingDisabledFixture, 400));
    await expect(fetchLogPage(client, {})).rejects.toMatchObject({
      status: 400,
      code: "bad_request",
      apiCode: "logging to file disabled",
    });
  });

  it("rejects a non-positive limit before any request", async () => {
    const { client, fetchImpl } = recordingClient(json(logsFixture));
    await expect(fetchLogPage(client, { limit: 0 })).rejects.toThrow(TypeError);
    await expect(fetchLogPage(client, { limit: 1.5 })).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("log clear", () => {
  it("sends DELETE once and returns the removed count", async () => {
    const { client, fetchImpl } = recordingClient(json(clearFixture));
    await expect(clearLogs(client)).resolves.toEqual({
      removed: 3,
      message: "Logs cleared successfully",
    });
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "DELETE",
      path: "/v8/management/observability/logs",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects a response without success:true", async () => {
    const { client } = recordingClient(json({ success: false, message: "", removed: 0 }));
    await expect(clearLogs(client)).rejects.toMatchObject({ code: "invalid_response" });
  });
});

describe("error log list", () => {
  it("lists files and marks only error-*.log names as downloadable", async () => {
    const extra = {
      files: [
        ...errorLogsFixture.files,
        { name: "../etc.log", size: 1, modified: 1 },
        { name: "notes.txt", size: 1, modified: 1 },
      ],
    };
    const { client } = recordingClient(json(extra));
    const files = await listErrorLogs(client);
    expect(files.map((file) => [file.name, file.downloadable])).toEqual([
      ["error-2026-05-05.log", true],
      ["../etc.log", false],
      ["notes.txt", false],
    ]);
  });

  it("returns an empty list when request logging is enabled", async () => {
    const { client } = recordingClient(json({ files: [] }));
    await expect(listErrorLogs(client)).resolves.toEqual([]);
  });
});

describe("error log download", () => {
  it("fetches by validated name and returns redacted text", async () => {
    const { client, fetchImpl } = recordingClient(
      () => new Response(`request failed api_key=${SECRET}`),
    );
    const { blob, filename } = await downloadErrorLog(client, "error-2026-05-05.log");
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "GET",
      path: "/v8/management/observability/logs/errors/error-2026-05-05.log",
    });
    expect(filename).toBe("error-2026-05-05.log");
    expect(blob.type).toBe("text/plain");
    expect(await readBlobText(blob)).toBe("request failed api_key=[redacted]");
  });

  it("rejects unsafe names before any request", async () => {
    const { client, fetchImpl } = recordingClient(() => new Response("x"));
    for (const name of ["../error-x.log", "error-a/b.log", "error-..x.log", "access.log", "error-.log"]) {
      await expect(downloadErrorLog(client, name)).rejects.toThrow(TypeError);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("surfaces a download failure as an ApiError", async () => {
    const { client } = recordingClient(json({ error: "not_found" }, 404));
    await expect(downloadErrorLog(client, "error-2026-05-05.log")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
  });
});

describe("usage queue", () => {
  it("issues exactly one GET with the count and never retries", async () => {
    const { client, fetchImpl } = recordingClient(json(usageQueueEmptyFixture));
    await expect(consumeUsageQueue(client, 5)).resolves.toEqual([]);
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "GET",
      path: "/v8/management/observability/usage/queue",
      search: "?count=5",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry a failed pop, because a retry would drain more records", async () => {
    const { client, fetchImpl } = recordingClient(json({ error: "read_failed" }, 500));
    await expect(consumeUsageQueue(client, 1)).rejects.toMatchObject({ status: 500 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-positive count before any request", async () => {
    const { client, fetchImpl } = recordingClient(json([]));
    await expect(consumeUsageQueue(client, 0)).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("redacts credential-shaped records", async () => {
    const { client } = recordingClient(json([{ auth: { access_token: SECRET } }]));
    const records = await consumeUsageQueue(client, 1);
    expect(JSON.stringify(records)).not.toContain(SECRET);
  });
});
