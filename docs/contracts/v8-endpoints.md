# CLI Proxy API v8 Management API — contract baseline (M0)

**Primary source:** <https://help.router-for.me/management/apiv8.html> ("API doc"), read 2026-10-21.
**Header source:** the official Management Center client reads `x-cpa-version`, `x-cpa-build-date`, `x-cpa-support-plugin` (fallbacks `x-server-version`, `x-server-build-date`) — see [`src/utils/constants.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/utils/constants.ts) and [`src/services/api/client.ts`](https://github.com/router-for-me/Cli-Proxy-API-Management-Center/blob/main/src/services/api/client.ts). The API doc does **not** document these response headers; treat their exact values/format as **unknown** until captured from a v8 instance.

**Base path:** `<origin>/v8/management` (API doc, top). `/v0/management` is near deprecation and is out of scope.

**Status of this baseline:** derived from the API doc only. No running v8 instance was available, so nothing here was captured live. Items marked **UNKNOWN** are not specified by the API doc and must not be implemented as facts until confirmed against a real instance (M0 exit item). Fixtures live in `test/fixtures/v8/`; files named `*.illustrative.json` have placeholder bodies for UNKNOWN shapes.

## 1. Authentication and headers

| Item | Contract | Source |
| --- | --- | --- |
| Management key | Every request **except** `GET/POST /oauth/callback` must carry it, including from localhost. | API doc, Authentication |
| Header forms | `Authorization: Bearer <key>` **or** `X-Management-Key: <key>`. Hyeria uses `Authorization: Bearer` (spec §3.3). | API doc, Authentication |
| JSON bodies | `Content-Type: application/json` unless the endpoint says otherwise. | API doc, Request and response conventions |
| YAML body/response | `Content-Type: application/yaml` (response `application/yaml; charset=utf-8`). Request `Accept: application/yaml` is shown in the example. | API doc, Read/Replace configuration |
| Config reads | Responses send `Cache-Control: no-store`. | API doc, Read configuration |
| Remote access | Requires `management.allow-remote: true` (legacy `remote-management.allow-remote` accepted until migrated). | API doc, Authentication |
| Disabled management | **404** on all routes when `management.secret-key` is empty, `MANAGEMENT_PASSWORD` unset and no local password; also 404 in Home mode. Indistinguishable from "route missing". | API doc, Authentication / Errors |
| Brute-force ban | 5 consecutive auth failures per client IP (incl. localhost) → ~30 min temporary ban. Ban response status/body: **UNKNOWN**. | API doc, Authentication |
| Version/build/plugin response headers | `x-cpa-version`, `x-cpa-build-date`, `x-cpa-support-plugin` (boolean). Casing/format **UNKNOWN**; parse case-insensitively. | Official client source (not API doc) |
| CORS headers | **UNKNOWN** (not documented). Direct browser access from another origin must be verified on a real instance. | — |

## 2. Config body semantics

- A v8 config body **is the value itself**; no `{ "value": … }`, `{ "items": … }` or legacy envelope (API doc, conventions).
- Path segments are YAML mapping keys, not array indexes; lists are replaced whole (`api-keys/codex/0` is invalid).
- `PUT` replaces the node; `PATCH` deep-merges objects and replaces everything else; `null` is stored, not a delete; `DELETE` removes a field and prunes empty mapping ancestors.
- Successful mutation returns `{ "status": "ok", "config-version": 8 }` and hot-reloads.
- `GET` returns a v8 view without rewriting the file; first successful write migrates a legacy file.
- Read-only (Home-owned) paths → 400 `read_only_field`: `credentials/concurrency/lifecycle-config-revision`, `credentials/concurrency/observation-barrier-revision`, `plugins/auth-revision`.
- JSON reads redact `username`/`credential` of `oauth.providers.codex.live-media-relay.ice-servers`; YAML reads do not. Writing the redacted JSON list back preserves secrets for entries with the same `urls`; `""`/`null` clears; **YAML replacement does not preserve omitted secrets**.

## 3. Endpoint matrix

All paths are relative to `/v8/management`. "Auth" = management key required. Request/response shapes marked **UNKNOWN** are not specified in the API doc.

### 3.1 Configuration

| Method & path | Auth | Request | Success response | Documented errors | Fixture |
| --- | --- | --- | --- | --- | --- |
| `GET /config` | yes | — | JSON full document | 500 `read_failed` / `invalid_config` | `config.json` |
| `GET /config/<path>` | yes | — | JSON node (e.g. `"round-robin"`) | 404 `not_found`; 500 as above | `config.json` |
| `GET /config.yaml` | yes | optional `Accept: application/yaml` | YAML document | 500 as above | `config.yaml` |
| `PUT /config` | yes | JSON **object** | `{status:"ok","config-version":8}` | 400 `config_must_be_object`/`invalid_json`/`invalid_body`; 400 `read_only_field`; 422 `invalid_config`; 500 `write_failed` | `config-write-ok.json` |
| `PATCH /config` | yes | JSON object (deep merge) | same | same | `config-write-ok.json` |
| `PUT /config/<path>` | yes | raw JSON value | same | + 400 `invalid_path` | `config-write-ok.json` |
| `PATCH /config/<path>` | yes | raw JSON value (merge if both objects) | same | same | `config-write-ok.json` |
| `PUT /config.yaml` | yes | v8 YAML (`Content-Type: application/yaml`) | same (shape implied by "Response" in doc) | 422 `invalid_config`; others as PUT | `config-write-ok.json` |
| `PATCH /config.yaml` | — | **does not exist** | — | — | — |
| `DELETE /config/<path>` | yes | — | same success shape (implied) | 400 `cannot_delete_config`/`invalid_path`; 404 `not_found` | `config-write-ok.json` |
| `DELETE /config` | yes | — | rejected | 400 `cannot_delete_config` | — |

Writes to `management.secret-key` / `management.allow-remote` are possible and can lock the client out (empty secret, no fallback → 404).

### 3.2 Server

| Method & path | Auth | Response | Notes | Fixture |
| --- | --- | --- | --- | --- |
| `GET /server/latest-version` | yes | `{ "latest-version": "v1.2.3" }` | Backend queries GitHub releases/latest (honors `requests.proxy-url`); no asset download. Failure status/body **UNKNOWN**. | `server-latest-version.json` |

### 3.3 Upstream request

| Method & path | Auth | Request | Response | Fixture |
| --- | --- | --- | --- | --- |
| `POST /requests/api-call` | yes | `method` (req), absolute `url` (req), optional `header` (string map), `data` (raw string), `proxy_url`, `auth_index` (aliases `authIndex`, `AuthIndex`) | `{ status_code, header: {name: string[]}, body: string }`; upstream status is preserved in `status_code`, not the HTTP status | `api-call-response.json` |

`$TOKEN$` in a header value is replaced with the selected credential's access token/API key. Credential proxy beats `proxy_url` beats global proxy. This can call arbitrary URLs with stored credentials — privileged operation. HTTP error statuses for invalid input: **UNKNOWN**.

### 3.4 Routing

| Method & path | Auth | Request | Response | Errors | Fixture |
| --- | --- | --- | --- | --- | --- |
| `POST /routing/cooldown/reset` | yes | `{ "auth_index": "…" }` | `{ status:"ok", auth_index, models: string[] }` | 404 `{error:"auth not found"}` | `cooldown-reset.json` |
| `GET /routing/model-definitions/:channel` | yes | — | `{ channel, models: [...] }`; model entry shape **UNKNOWN** | 400 `{error:"unknown channel", channel}`; valid channel list **UNKNOWN** | `model-definitions.illustrative.json`, `error-unknown-channel.json` |

### 3.5 Observability

| Method & path | Auth | Request | Response | Errors | Fixture |
| --- | --- | --- | --- | --- | --- |
| `GET /observability/logs` | yes | query `after` (unix ts), `limit`, `cursor` (opaque). `limit` without `after` → newest lines. | `{ lines: string[], line-count, latest-timestamp, next-cursor }`; `cursor-reset: true` when the cursor was reset. Missing log file → empty lines, `line-count: 0`. | 400 `{error:"logging to file disabled"}` (needs `observability.logs.logging-to-file`) | `logs.json`, `logs-cursor-reset.json`, `error-logging-disabled.json` |
| `DELETE /observability/logs` | yes | — | `{ success:true, message, removed }` | — | `logs-clear.json` |
| `GET /observability/logs/errors` | yes | — | `{ files: [{name,size,modified}] }`; empty when request logging is enabled | — | `request-error-logs.json` |
| `GET /observability/logs/errors/:name` | yes | `:name` an existing `error-*.log`, no path separators | file download; Content-Type/disposition **UNKNOWN**; error statuses **UNKNOWN** | — | — |
| `GET /observability/logs/requests/:id` | yes | `:id` without path separators; matches filename ending `-<id>.log` | file download; headers **UNKNOWN** | — | — |
| `GET /observability/usage/queue?count=N` | yes | `count` positive integer, default 1 | JSON array of usage records; `[]` when empty. Record shape **UNKNOWN**. | invalid `count` status **UNKNOWN** | `usage-queue.illustrative.json`, `usage-queue-empty.json` |
| `GET /observability/usage/api-keys` | yes | — | in-memory success/failure buckets per provider keyed `base_url\|api_key`; exact shape **UNKNOWN** | — | `usage-api-keys.illustrative.json` |

**Destructive usage-queue semantics:** `GET /observability/usage/queue` **pops** up to `count` records from the in-memory queue — a read that removes data. Consequences for Hyeria:

- Never call it on mount, focus, retry, prefetch, or as a query that TanStack Query may refetch/retry automatically; no `staleTime`-driven refetch and no automatic retry.
- Treat it as an explicit user/poller-driven consume; the consumer owns persistence of what it pops (session memory only unless a collector exists), and records lost to a failed/aborted response are unrecoverable.
- Another consumer (including the official UI) draining the same queue splits the data; coverage is partial and must be labeled so.
- Records exist only if `observability.usage.usage-statistics-enabled` is on; the local Redis RESP usage output is disabled.
- `usage/api-keys` is a separate in-memory aggregate; reading it is documented as a plain read (non-destructive is implied, not stated).

### 3.6 Credentials (auth files)

Manages files/runtime state under `oauth.auth-dir`; does not edit `api-keys` groups.

| Method & path | Auth | Request | Response | Errors | Fixture |
| --- | --- | --- | --- | --- | --- |
| `GET /credentials` | yes | — | `{ files: [{id, auth_index, name, provider, status, disabled, unavailable, runtime_only, source}] }` sorted by name; further per-provider fields **UNKNOWN** | — | `credentials-list.json` |
| `POST /credentials` | yes | multipart field `file` (`.json`) **or** raw JSON body with `?name=<file.json>` | `{ "status": "ok" }` | 503 `core auth manager unavailable`; non-`.json` name rejected (status/body **UNKNOWN**) | `error-core-auth-unavailable.json` |
| `DELETE /credentials?name=<file.json>` | yes | — | success body **UNKNOWN** | `runtime_only` entries cannot be deleted (status **UNKNOWN**) | — |
| `DELETE /credentials?all=true` | yes | — | `{ status:"ok", deleted: n }` | — | `credentials-delete-all.json` |
| `GET /credentials/download?name=<file.json>` | yes | — | file download; `runtime_only` entries not downloadable | — | — |
| `GET /credentials/models?name=<file-or-id>` | yes | — | `{ models: [...] }`; entry shape **UNKNOWN** | — | `credential-models.illustrative.json` |
| `PATCH /credentials/status` | yes | `{ name, disabled }` | body **UNKNOWN** | plugin virtual child cannot be changed alone (status **UNKNOWN**) | — |
| `PATCH /credentials/fields` | yes | `{ name, ...fields }`; dot paths for nested metadata; `headers` object merges, empty value removes a header | body **UNKNOWN** | — | — |
| `POST /credentials/refresh` | yes | body **UNKNOWN** | body **UNKNOWN**; refreshes file-backed OAuth credentials | — | — |

`auth_index` is the stable opaque identifier used by `requests/api-call`, cooldown reset and plugin quota; treat as opaque string.

### 3.7 OAuth

| Method & path | Auth | Request | Response | Errors | Fixture |
| --- | --- | --- | --- | --- | --- |
| `GET /oauth/auth-url?provider=P[&is_webui=true]` | yes | `P` ∈ `claude, codex, antigravity, kimi, kimi-ai, xai, devin, meta`, or a plugin-registered provider | `{ status:"ok", url, state }`; device-code providers may add `flow`, `user_code`, `expires_in` | 400 `provider is required`; 404 `provider_not_found` (unless a plugin handles it) | `oauth-auth-url.json`, `oauth-auth-url-device.json` |
| `GET /oauth/status?state=S` | yes | — | `status` is `wait` while pending, `ok` on success, `error` with `error` string. Completed states persist only briefly. | missing/unknown state **UNKNOWN** | `oauth-status-wait.json`, `oauth-status-ok.json`, `oauth-status-error.json` |
| `DELETE /oauth/session?state=S` | yes | — | `{ status:"ok", cancelled:true }`; no credentials stored | — | `oauth-cancel.json` |
| `POST /oauth/import?provider=vertex` | yes | multipart `file` (service-account JSON), optional `location` (default `us-central1`); only `vertex` supported | `{ status, auth-file, project_id, email, location }` | other errors **UNKNOWN** | `oauth-import-vertex.json` |
| `GET /oauth/callback` | **no** | query `provider`, `state`, `code`, `error` / `error_description` | `{ status:"ok" }` | accepted only for a pending state whose provider matches; rejection status/body **UNKNOWN** | `oauth-callback-ok.json` |
| `POST /oauth/callback` | **no** | `{ provider, redirect_url, code, state, error }`; `redirect_url` may carry the callback query | `{ status:"ok" }` | as above | `oauth-callback-ok.json` |

The doc says "wait while pending" for `/oauth/status`; the literal string `wait` is inferred from that sentence and must be confirmed on a real instance. The callback is unauthenticated by design: do not send the management key to it, and never log `code`/`state` values.

### 3.8 Plugins

| Method & path | Auth | Request | Response | Errors | Fixture |
| --- | --- | --- | --- | --- | --- |
| `GET /config/plugins` | yes | — | plugin config section | — | `config.json` (`plugins`) |
| `PUT`/`PATCH /config/plugins/configs/<id>` | yes | raw object | config write success | as config | `config-write-ok.json` |
| `PUT /config/plugins/configs/<id>/enabled` | yes | raw `true`/`false` | config write success; does not change `plugins.enabled` | as config | `config-write-ok.json` |
| `GET /plugins` | yes | — | includes `plugins_enabled`, `plugins_dir`, per-plugin `id`, `path`, enabled state, metadata, config fields, menus; exact keys/nesting **UNKNOWN** | — | `plugins-list.illustrative.json` |
| `DELETE /plugins/:id` | yes | — | success body **UNKNOWN** | 409 when it cannot be unloaded, may set `restart_required: true` (body shape **UNKNOWN**) | `error-plugin-restart-required.illustrative.json` |
| `GET /plugins/store` | yes | — | catalog, source errors, install state, update availability; shape **UNKNOWN** | — | `plugins-store.illustrative.json` |
| `POST /plugins/store/:id/install` | yes | `?source=<source-id>` when IDs collide; `version` as query or `{ "version": "1.2.3" }` | `{ status:"installed", source_id, id, version, path, restart_required }` | failure statuses **UNKNOWN** | `plugin-install.json` |
| `GET /plugins/:id/quota?auth_index=I` | yes | `authIndex` alias accepted | body **UNKNOWN** | 404 missing quota provider; 502 provider failure | `plugin-quota.illustrative.json` |
| `POST /plugins/:id/quota` | yes | `{ auth_index }` | body **UNKNOWN** | same | — |
| `DELETE /plugins/:id/quota?auth_index=I` | yes | — | body **UNKNOWN** | same | — |

Store installs can download executable artifacts (privileged). v8 does not register the legacy `/quota/reset` alias. Plugin resource/menu page endpoints (`/plugin-pages/:pluginId/:menuIndex` in the spec) are **UNKNOWN** in the API doc; resolve in M0 against a real instance or the official client before Task 10.

## 4. Common statuses

From the API doc "Error responses". Bodies are `{ "error": "<code>", … }`.

| Status | Bodies / meaning | Fixture |
| --- | --- | --- |
| 400 | `invalid_json`, `invalid_body`, `invalid_path`, `config_must_be_object`, `cannot_delete_config`, `invalid_config` (+`message`), `read_only_field` (+`field`), `provider is required`, `unknown channel`, `logging to file disabled` | `error-read-only-field.json`, `error-unknown-channel.json`, `error-logging-disabled.json` |
| 401 | `missing management key`, `invalid management key` | `error-missing-management-key.json`, `error-invalid-management-key.json` |
| 403 | `remote management disabled` | `error-remote-management-disabled.json` |
| 404 | `not_found`, `provider_not_found`, `auth not found`; **also** management disabled/empty secret/Home mode (empty or unspecified body) | `error-not-found.json` |
| 409 | plugin unload failed / restart required | `error-plugin-restart-required.illustrative.json` |
| 422 | `invalid_config` + `message` — parses but fails validation | `error-invalid-config.json` |
| 500 | `write_failed` (+`message`), `read_failed`, `invalid_config` on read | `error-write-failed.json` |
| 502 | quota provider failure (body **UNKNOWN**) | — |
| 503 | `core auth manager unavailable` | `error-core-auth-unavailable.json` |

Note `invalid_config` appears as 400, 422 (write validation) and 500 (read) in the API doc; clients must key on status **and** `error`. Errors from `requests/api-call` upstream are carried in the 200 body's `status_code`, not as management errors.

## 5. Open items for M0 closure (need a real v8 instance)

1. Capture sanitized bodies for every **UNKNOWN** shape above and replace `*.illustrative.json`.
2. Confirm response header names/casing/format and CORS behavior.
3. Confirm `wait` literal, unknown-state behavior and callback rejection responses.
4. Confirm plugin menu/resource page endpoints and resource types.
5. Confirm ban response (status/body/headers) after repeated auth failures.
6. Confirm statuses for non-`.json` uploads, invalid `count`, missing download names.
