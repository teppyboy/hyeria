# Hyeria

Hyeria is a React management client for [CLI Proxy API](https://github.com/router-for-me/CLIProxyAPI) v8. It is an independent project: it is not a fork of, and is not endorsed by, CLI Proxy API or its official Management Center. It connects to a separately running backend and does not proxy model traffic.

## Toolchain

| Tool            | Version                                              |
| --------------- | ---------------------------------------------------- |
| Vite+ (`vp`)    | 1.3.0 (`vite-plus` in `pnpm-workspace.yaml` catalog) |
| Node.js         | 24.22.1                                              |
| Package manager | pnpm 12.14.0                                         |

Versions are recorded in `package.json` (`devEngines`) and `pnpm-workspace.yaml`. Use the project-local `vite-plus` installed by `vp install`, not a global legacy binary.

## Commands

```bash
vp install                 # install dependencies
vp dev                     # development server
vp check                   # format, lint, type checks
vp test                    # tests
vp build                   # normal static build -> dist/
vp run build:management    # management build -> dist-management/management.html
vp run build:demo          # interactive demo build -> dist-demo/
vp run smoke:management    # verify the management artifact is self-contained
vp run check:sensitive     # scan both build outputs for credential markers
vp run check:demo          # scan the demo artifact for credentials/config
vp preview                 # preview a build
```

## Build from source

1. Install Node.js 24.22.1 and Vite+ (`vp`).
2. `vp install`
3. `vp build` for the static site in `dist/`, `vp run build:management` for the single-file `dist-management/management.html` artifact, or `DEMO_BASE=/hyeria/ vp run build:demo` for the Pages demo.
4. Run `vp run smoke:management`, `vp run check:sensitive`, `vp run check:demo`, and `vp run check:licenses` before distribution.

## Disposable Docker deployment

Start a loopback-only dashboard and CLI Proxy API v8 instance for disposable local testing:

```bash
docker compose up --build -d
```

Open the dashboard at `http://localhost:18080`, then connect it to `http://localhost:18317` with **Management key: `1`**. The sample CPA instance uses **Client key: `1`**. These credentials are intentionally weak; this sample is for loopback-only disposable testing and must not be exposed to an untrusted network.

Stop and remove the containers with:

```bash
docker compose down
```

The sample CPA config is baked into its disposable image; there are no host mounts or named volumes, so configuration edits and runtime data are discarded with the container. Do not use `docker compose down -v`.

## Interactive demo

The demo is published at `https://<owner>.github.io/<repository>/` and uses the repository name as its project path. It is a demo-only in-memory session: dashboard data and management actions are synthetic, while configuration, log, and auth-file changes are simulated. Nothing is sent to a backend, no visitor credentials are requested, and all changes reset when the page is reloaded. The demo build is separate from the normal static and management builds.

Builds contain no credentials. Management keys are entered by the user at runtime.

## Backend and security

Hyeria requires a separately running CLI Proxy API v8 instance with its Management API enabled. It does not support the deprecated `/v0/management` API. Remote browser access must also be allowed by the backend and its CORS policy; do not expose the management API to untrusted networks.

The management key is held in browser memory by default. Opt-in remembered sessions use browser persistence, which is not encryption. Anyone who can run code in the same browser origin can potentially access an active session. Use a trusted browser/device, disconnect when finished, and never share screenshots or diagnostics that may contain private backend metadata.

Plugin installation can download executable code onto the backend. Install only plugins and sources you trust. Hyeria displays plugin metadata but does not execute plugin-provided scripts or render arbitrary plugin HTML; undocumented plugin resource pages are not enabled.

## Analytics scope

The available analytics view is a live snapshot of backend in-memory API-key usage buckets. It is not durable history, may reset when the backend restarts, and does not claim complete request coverage. Hyeria does not automatically consume the destructive usage queue.

## Source and branding

The source repository is the Corresponding Source for this release. The logo is a temporary text mark; replace it only with approved branding assets and preserve their license/attribution notices.

## License

Hyeria is licensed under AGPL-3.0-only; see [LICENSE](LICENSE) and [NOTICE](NOTICE). If you modify Hyeria and let others use it over a network, you must offer them the Corresponding Source of your modified version (AGPLv3 section 13). The final logo is not included yet.
