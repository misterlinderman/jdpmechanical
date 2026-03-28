# FPB Tracker

**JDP Mechanical — Fan Pipe Box Assembly Tracking System**

A purpose-built web application tracking ~700 FPB assemblies through three stages: **Fabrication → Delivery → Installation**. Workers scan QR code stickers on their phone. Project managers watch a live dashboard.

---

## Quick Start

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install

# Configure environment
cp client/.env.example client/.env
cp server/.env.example server/.env
# → Fill in Auth0, MongoDB, AWS credentials

# Run development servers
cd client && npm run dev      # → localhost:5173
cd server && npm run dev      # → localhost:5000
```

---

## Project Structure

```
/
├── client/                   ← Vite + React 18 + TypeScript (deployed to Vercel)
│   └── src/
│       ├── pages/            ← Dashboard, ScanHandler, AdminImport, QRManager, etc.
│       ├── components/       ← Reusable UI components
│       ├── hooks/            ← useRealtimeUnits and other custom hooks
│       └── types/            ← Shared TypeScript interfaces (unit.ts)
├── server/                   ← Express.js + TypeScript (deployed to Railway)
│   └── src/
│       ├── models/           ← Mongoose: Unit, ScanEvent, Project
│       ├── routes/           ← units, scan, qr, export
│       ├── middleware/       ← Auth0 JWT validation + role enforcement
│       └── services/         ← qrService, pdfService, importService
├── docs/                     ← Project documentation
│   ├── BUILD_PLAN.md         ← ⭐ Phased build guide with step-by-step prompts
│   ├── ARCHITECTURE.md       ← System architecture quick reference
│   ├── PROJECT_OVERVIEW.md   ← Client context, goals, user roles
│   ├── TECHNICAL_SPEC.md     ← Full stack spec, data models, API routes
│   └── DISCOVERY_SUMMARY.md  ← Discovery summary for onboarding
├── context/                  ← AI context scaffolding
│   └── screenshots/
│       ├── mockups/          ← Approved design mockups (add before building)
│       ├── bugs/             ← Bug screenshots for troubleshooting
│       └── reference/        ← Working app reference screenshots
├── .cursorrules              ← Cursor AI rules (read this before prompting)
├── .gitignore
├── .dockerignore
├── Dockerfile                ← Railway deploy (includes Chromium for Puppeteer)
└── fpb-tracker-mockups.html  ← Interactive design walkthrough (open in browser)
```

---

## Build Phases

See `docs/BUILD_PLAN.md` for the full step-by-step build guide with exact prompts.

| Phase | Scope | Est. |
|-------|-------|------|
| 1 — Foundation | Auth, roles, Unit model, CRUD, CSV import, data table | 2–3 wks |
| 2 — QR & Scan | QR generation, S3, scan handler, role enforcement, audit log | 1–2 wks |
| 3 — PDF & Dashboard | Puppeteer PDF, Avery layout, live dashboard, PM view, CSV export | 1–2 wks |
| 4 — Polish | Brand styling, PWA, activity log, notifications | 1 wk |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS |
| Backend | Express.js + TypeScript |
| Database | MongoDB Atlas + Mongoose |
| Auth | Auth0 (RBAC — 5 roles) |
| QR Generation | `qrcode` npm + AWS S3 |
| PDF | Puppeteer (Avery 5160) |
| Import | `multer` + `xlsx` |
| Frontend hosting | Vercel |
| API hosting | Railway (Dockerized for Chromium) |

---

## Roles

| Role | Can Do |
|------|--------|
| admin | Everything — import, QR, manage, export |
| fabricator | Scan → mark fabricated |
| driver | Scan → mark delivered |
| installer | Scan → mark installed |
| pm | Read-only dashboard + CSV export |

---

## Design Reference

Open `fpb-tracker-mockups.html` in a browser for an interactive walkthrough of all five approved screens. Use arrow keys or the nav pills to move between screens.

---

*Built for JDP Mechanical — March 2026*
