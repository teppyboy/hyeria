# v8 sanitized fixtures

Fake, hand-written fixtures for the CLI Proxy API v8 Management API. Nothing here was captured from a real instance.

- `*.json` / `config.yaml`: top-level fields and values follow the examples in <https://help.router-for.me/management/apiv8.html>, with all identifiers replaced by `example`/`.invalid` values.
- `*.illustrative.json`: the v8 documentation names the endpoint but does **not** document the full body shape (model entries, usage records/buckets, plugin items, store entries, quota payload, restart-required error body). Contents are placeholders; replace with a sanitized capture from a real v8 instance before relying on them (see `docs/contracts/v8-endpoints.md`).

Never add real keys, tokens, emails, hostnames, or paths here. `test/fixtures/v8-fixtures.test.ts` enforces this.
