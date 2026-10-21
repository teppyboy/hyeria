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
vp run build:management    # management build -> dist-management/ (single-file output arrives in a later task)
vp preview                 # preview a build
```

## Build from source

1. Install Node.js 24.22.1 and Vite+ (`vp`).
2. `vp install`
3. `vp build`; the static site is written to `dist/`.

Builds contain no credentials. Management keys are entered by the user at runtime.

## License

Hyeria is licensed under AGPL-3.0-only; see [LICENSE](LICENSE) and [NOTICE](NOTICE). If you modify Hyeria and let others use it over a network, you must offer them the Corresponding Source of your modified version (AGPLv3 section 13). The final logo is not included yet.
