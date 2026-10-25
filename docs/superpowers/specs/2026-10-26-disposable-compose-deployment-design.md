# Disposable Compose Deployment Design

## Goal

Provide a one-command, disposable local test deployment of Hyeria connected to an upstream CLI Proxy API instance, without colliding with a typical CPA already using host port 8317.

## Design

- Add a root `docker-compose.yml` with two services: a static Hyeria management dashboard built from this repository, and a CPA container based on the upstream `eceasy/cli-proxy-api` image.
- Publish dashboard port `18080` and CPA port `18317` on host loopback only; CPA listens on `8317` inside its container.
- Build a CPA image layer containing a v8 sample config with client API key `1` and management secret `1`. Set `management.allow-remote: true` because browser-to-container management requests do not originate from CPA's loopback; publishing the port only on host loopback limits network exposure.
- Do not declare Docker volumes. CPA configuration edits and auth/runtime data live only in the container and are discarded when the container is removed.
- Use the dashboard at `http://localhost:18080` and connect it to `http://localhost:18317` with management key `1`. Explain startup and teardown commands, ephemeral-data behavior, and that credential `1` is test-only.

## Validation

- Validate Compose configuration with `docker compose config` if Docker Compose is available.
- Build the dashboard image and verify its static management entry is served.
- Confirm no Compose volumes are declared and both host ports are the agreed non-default values.
