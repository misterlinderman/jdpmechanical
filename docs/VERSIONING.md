# FPB Tracker — Versioning and release context

## Product version

The app is tracked as **1.0.0** across the workspace unless you intentionally bump:

| Location | Field | Current intent |
|----------|--------|----------------|
| Root `package.json` | `version` | Single product version for the repo |
| `client/package.json` | `version` | Keep in sync with root for releases |
| `server/package.json` | `version` | Keep in sync with root for releases |

**Policy:** For meaningful releases, bump all three `version` fields together (patch/minor/major per [semver](https://semver.org/)). Pre-release tags (`1.1.0-beta.1`) are optional.

There is no automated changelog requirement; when you tag a release, note breaking changes (API, env vars, Auth0 actions) in the tag message or a short `CHANGELOG.md` if you add one later.

---

## Runtime versions

- **Node:** root `engines` specifies `>=18`. The production **Dockerfile** uses `node:20-bookworm-slim` — use Node 20+ locally if you want parity with the container.
- **npm:** any recent npm 9/10 compatible with your Node install.

---

## Ports and environments

| Context | Default API port | Notes |
|---------|------------------|--------|
| Local dev (`server/.env`) | **3001** | `PORT` optional; matches `client/.env.example` `VITE_API_URL` |
| Docker image | **5000** | `Dockerfile` sets `ENV PORT=5000` and `EXPOSE 5000` |
| Hosted (Railway, etc.) | Platform-defined | Set `PORT` if the platform injects it; ensure `CLIENT_URL` matches the **browser origin** of the SPA (no trailing slash) for CORS |

QR codes embed URLs built from `APP_DOMAIN` (server) — in production this must be the public SPA origin (e.g. `https://app.example.com`) so scans open the correct host.

---

## Build artifacts

- **Client:** `client/dist/` — static assets; safe to delete and rebuild.
- **Server:** `server/dist/` — compiled JavaScript; `npm start` runs `node dist/index.js`.

`npm run clean` (root) removes `dist` folders and all `node_modules` — use before a clean install if needed.

---

## Dependency updates

Client and server declare their own dependencies in their `package.json` files. After upgrades, run `npm run build` and smoke-test Auth0 login, a protected API call, and (if used) QR/PDF flows.
