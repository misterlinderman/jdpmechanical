# FPB Tracker

**JDP Mechanical — Fan Pipe Box assembly tracking**

Web app for tracking ~700 FPB assemblies through **Fabrication → Delivery → Installation**. Field staff scan QR stickers on their phone; admins import data, generate QRs, and download Avery sticker PDFs; PMs use a live dashboard. Built on a MERN stack (Vite + React, Express, MongoDB, Auth0).

**Build status (verified):** `npm run build` runs clean — client outputs to `client/dist`, server to `server/dist`.

---

## Documentation map

| Document | Purpose |
|----------|---------|
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Client context, goals, roles, workflows |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, flows, collections, real-time |
| [docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md) | Data models, API tables, infrastructure |
| [docs/CURSOR_CONTEXT.md](docs/CURSOR_CONTEXT.md) | Short context for AI assistants |
| [docs/VERSIONING.md](docs/VERSIONING.md) | Version policy, ports, release notes |
| [docs/AUTH0_ROLES_SETUP.md](docs/AUTH0_ROLES_SETUP.md) | Auth0 RBAC and roles in tokens |
| [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | Phased build guide |
| [docs/SHOPIFY_AUTH.md](docs/SHOPIFY_AUTH.md) | Optional Shopify auth swap (template) |
| [SETUP.md](SETUP.md) | Step-by-step local setup |
| [context/README.md](context/README.md) | Screenshots and visual context for builds |

Root [`.cursorrules`](.cursorrules) encodes stack conventions for Cursor.

---

## Quick start

**Prerequisites:** Node.js 18+ (Dockerfile uses Node 20 for production API), MongoDB (Atlas or local), Auth0 tenant.

```bash
cd "JDP Mechanical"   # your clone path

# Install root + client + server
npm run install:all

cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
# Fill MongoDB, Auth0, and (for QR in non-dev) AWS — see Environment variables

npm run dev
```

- **Frontend:** http://localhost:5173  
- **API:** http://localhost:3001 (`PORT` in `server/.env`; default **3001** locally)

The [Dockerfile](Dockerfile) used for Railway sets `PORT=5000` inside the container; configure `VITE_API_URL` and Auth0 URLs to match your deployed API URL.

---

## Scripts (root `package.json`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Client + server (concurrently) |
| `npm run dev:client` / `npm run dev:server` | One side only |
| `npm run build` | Production build: client then server |
| `npm start` | Run compiled server (`server/dist`) |
| `npm run lint` | ESLint in client and server |
| `npm run format` | Prettier |
| `npm run seed:demo` / `npm run seed:purge-demo` | Demo data (see server scripts; requires env) |

---

## Project layout

```
.
├── client/                 # Vite + React 18 + TypeScript + Tailwind
│   └── src/
│       ├── pages/          # Home, Admin*, QRManager, LiveDashboard, ScanHandler, ActivityLog, Profile
│       ├── components/     # Layout, ProtectedRoute, RoleRoute, …
│       ├── hooks/          # useApiAuth, useRealtimeUnits, useSessionRoles, …
│       └── services/       # api.ts (axios + Auth0 token)
├── server/                 # Express + TypeScript
│   └── src/
│       ├── routes/         # health, users, items (template), units, scan, qr, export, events
│       ├── models/         # Mongoose schemas
│       ├── middleware/     # Auth0 JWT + roles
│       └── services/       # qr, pdf, import, …
├── docs/                   # Architecture and product docs
├── context/                # AI / screenshot context
├── Dockerfile              # API image (Chromium for Puppeteer PDFs)
└── fpb-tracker-mockups.html
```

---

## API surface (summary)

All JSON routes are under `/api`. Protected routes expect an Auth0 bearer token (see `server/src/middleware/auth.ts`).

- **Health:** `GET /api/health`
- **Users (template):** `GET|PUT /api/users/me`
- **Items (template):** CRUD `/api/items`
- **Units:** list/create/update/delete, import, `GET /api/units/:id` — see [TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md)
- **Scan:** `POST /api/scan/:unitId` (fabricator / driver / installer)
- **QR:** `POST /api/qr/generate`, `GET /api/qr/sheet` (admin)
- **Export:** `GET /api/export/csv` (admin, pm)
- **Events / activity:** `GET /api/events/recent` (admin, pm); `GET /api/events` (admin, paginated log)

---

## Environment variables

**Client (`client/.env`):** `VITE_API_URL`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`

**Server (`server/.env`):** `PORT`, `MONGODB_URI`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `CLIENT_URL` (production CORS), optional **AWS** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `S3_PUBLIC_URL_BASE`), `APP_DOMAIN` (QR link base in production). See `server/.env.example`.

---

## Roles (Auth0 RBAC)

`admin` | `fabricator` | `driver` | `installer` | `pm` — enforced in JWT and `RoleRoute` / `requireRole`. Setup: [docs/AUTH0_ROLES_SETUP.md](docs/AUTH0_ROLES_SETUP.md).

---

## Deployment

- **Frontend:** build `client` (`npm run build` in `client/`), deploy static `dist/` (e.g. Vercel). Set all `VITE_*` to production values.
- **API:** build server, run `node dist/index.js`. Prefer the repo **Dockerfile** on Railway (or similar) so Puppeteer has Chromium.

---

## License

MIT
