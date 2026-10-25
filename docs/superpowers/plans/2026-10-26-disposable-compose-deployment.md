# Disposable Compose Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-command disposable local Docker Compose deployment of Hyeria and a sample CPA instance on non-default ports.

**Architecture:** Build Hyeria’s existing self-contained management artifact into a small static-server image. Run upstream `eceasy/cli-proxy-api:latest` in a separate container with a v8 sample config; expose only host-loopback ports and declare no volumes.

**Tech Stack:** Docker Compose, Dockerfile, CPA v8 YAML config, Nginx Alpine static serving.

**Spec:** `docs/superpowers/specs/2026-10-26-disposable-compose-deployment-design.md`

## Global Constraints

- Dashboard host port: `18080`; CPA host port: `18317`; CPA container port: `8317`.
- CPA client API key and management secret: `1` (test-only).
- Bind published host ports to `127.0.0.1` only.
- Do not declare Docker volumes; removal of containers discards data.
- Dashboard connects to `http://localhost:18317` with management key `1`.

## Review Focus

- Host ports must not collide with the usual CPA port `8317`; assert the exact mappings in Compose validation.
- CPA management requests from the browser container-to-host address require remote-management permission; ensure CPA allows remote access while host publishing stays loopback-only.
- CPA container startup may rewrite config or create auth data; verify no host-mounted file or volume preserves these changes.
- Management HTML must be reachable at the dashboard root and runtime API URLs must stay user-entered; validate built artifact path and document connection values.
- The example key `1` is insecure for exposed deployments; warn explicitly in README and compose documentation.

---

### Task 1: Add the disposable Docker deployment and usage guide

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `docker/cpa/config.yaml`
- Modify: `README.md`

**Interfaces:**
- The dashboard image runs `vp run build:management` and serves `dist-management/management.html` as `/management.html` (also serve it as `/` so the login page loads at the root).
- Compose service `dashboard` builds this repository and binds `127.0.0.1:18080:80`.
- Compose service `cpa` uses `eceasy/cli-proxy-api:latest`, mounts only the sample config read-write at `/CLIProxyAPI/config.yaml`, and binds `127.0.0.1:18317:8317`.
- `docker/cpa/config.yaml` uses v8 keys: `server.port: 8317`, `management.allow-remote: true`, `management.secret-key: "1"`, `access.api-keys: ["1"]`.

- [ ] **Step 1: Add a small deployment smoke test**

Create `test/toolchain/compose-deployment.test.ts` to read the Dockerfile, Compose YAML, and CPA config, asserting the exact image ports, loopback-bound host mappings, absence of declared volumes, management and client keys `1`, and docs’ connect URL/key. Use only existing project test dependencies and Node built-ins.

- [ ] **Step 2: Run the test and verify it fails**

Run: `vp test test/toolchain/compose-deployment.test.ts`
Expected: FAIL because the deployment files do not yet exist.

- [ ] **Step 3: Create Dockerfile, Compose config, and CPA config**

Use Node 24 to run `vp install --frozen-lockfile` and `vp run build:management` in a build stage; copy `dist-management/management.html` to Nginx Alpine as both `index.html` and `management.html`. Configure CPA with the exact v8 values in Interfaces. Use no volume declarations in Compose; the sample config bind mount is read-write so CPA’s config updates remain container-local.

- [ ] **Step 4: Document launch, connection, and teardown**

Add a concise README section with `docker compose up --build -d`, dashboard URL `http://localhost:18080`, CPA URL `http://localhost:18317`, management key `1`, client key `1`, and `docker compose down`. Warn that credentials are intentionally weak and the sample is for loopback-only disposable testing; avoid `down -v` since there are no named volumes.

- [ ] **Step 5: Run the focused test**

Run: `vp test test/toolchain/compose-deployment.test.ts`
Expected: PASS, confirming ports, credentials, no volumes, image entrypoint paths, and docs.

- [ ] **Step 6: Validate Compose and built dashboard where available**

Run: `docker compose config` and `docker compose build dashboard`; if Docker is unavailable, report those checks as not run. Confirm Compose config resolves both services and host ports as specified.

- [ ] **Step 7: Run repository checks**

Run: `vp check && vp test && vp run build:management && vp run smoke:management`
Expected: all commands exit successfully.
